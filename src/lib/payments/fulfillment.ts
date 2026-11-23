import type { Payment, PaymentStatus } from "@prisma/client";
import { buildEventIcs } from "@/lib/calendar";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import * as templates from "@/lib/email/templates";
import { activateOrExtendMembership } from "@/lib/membership";
import { restoreStockForOrder } from "@/lib/orders";
import { getContent } from "@/lib/content";
import { notifyAdmins } from "@/lib/notifications";
import { shippingOptions } from "@/lib/pricing";
import { getPricing, getSettings } from "@/lib/settings";
import { formatDate, formatDateTime, formatMemberNumber, formatPrice, isLocalUrl, siteUrl } from "@/lib/utils";
import { createYearlySubscription } from "./mollie";
import type { ProviderPaymentState } from "./types";

const FAILED_STATES: PaymentStatus[] = ["FAILED", "CANCELED", "EXPIRED"];

/**
 * Verwerkt een statuswijziging van een betaling. Idempotent: webhooks, de resultaatpagina
 * en de mock-checkout mogen dit allemaal (ook tegelijk) aanroepen.
 */
export async function applyPaymentState(paymentId: string, state: ProviderPaymentState): Promise<PaymentStatus | null> {
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment) return null;
  if (payment.status === state.status) return payment.status;
  // Eindtoestanden niet terugdraaien: PAID kan alleen nog naar REFUNDED.
  if (payment.status === "REFUNDED") return payment.status;
  if (payment.status === "PAID" && state.status !== "REFUNDED") return payment.status;

  const updated = await prisma.payment.updateMany({
    where: { id: payment.id, status: payment.status },
    data: {
      status: state.status,
      method: state.method ?? payment.method,
      paidAt: state.status === "PAID" ? (state.paidAt ?? new Date()) : payment.paidAt,
    },
  });
  if (updated.count === 0) {
    // Een ander proces was ons voor; huidige status teruggeven.
    return (await prisma.payment.findUnique({ where: { id: payment.id }, select: { status: true } }))?.status ?? null;
  }

  try {
    if (state.status === "PAID") await onPaid(payment, state);
    else if (FAILED_STATES.includes(state.status)) await onFailed(payment, state.status);
    else if (state.status === "REFUNDED") await onRefunded(payment);
  } catch (err) {
    console.error(`[betaling ${payment.id}] verwerking van status ${state.status} mislukt`, err);
  }
  return state.status;
}

async function onPaid(payment: Payment, state: ProviderPaymentState) {
  const paidAt = state.paidAt ?? new Date();

  if (payment.type === "ORDER" && payment.orderId) {
    const order = await prisma.order.findUnique({ where: { id: payment.orderId } });
    if (!order) return;
    await prisma.$transaction(async (tx) => {
      // Laat betaald na annulering (verlopen reservering): voorraad opnieuw afboeken.
      if (order.status === "CANCELLED") {
        const items = await tx.orderItem.findMany({ where: { orderId: order.id } });
        for (const item of items) {
          if (item.variantId) await tx.productVariant.update({ where: { id: item.variantId }, data: { stock: { decrement: item.quantity } } });
        }
      }
      if (order.status === "PENDING" || order.status === "CANCELLED") {
        await tx.order.update({ where: { id: order.id }, data: { status: "PAID", paidAt } });
      }
    });
    const claimed = await prisma.order.updateMany({ where: { id: order.id, confirmationSentAt: null }, data: { confirmationSentAt: new Date() } });
    if (claimed.count > 0) {
      const full = await prisma.order.findUniqueOrThrow({ where: { id: order.id }, include: { items: true } });
      await sendEmail({ to: full.email, ...templates.orderConfirmation(full) });
      const pricing = await getPricing().catch(() => null);
      const itemCount = full.items.reduce((s, i) => s + i.quantity, 0);
      await notifyAdmins({
        type: "orderPaid",
        title: `Nieuwe bestelling ${full.orderNumber} (${formatPrice(full.total)})`,
        message: `${full.firstName} ${full.lastName} heeft ${itemCount} artikel${itemCount === 1 ? "" : "en"} besteld en betaald. Pak de bestelling in en verstuur hem.`,
        link: `/admin/bestellingen/${full.id}`,
        details: [
          ["Ordernummer", full.orderNumber],
          ["Klant", `${full.firstName} ${full.lastName} (${full.email})`],
          ["Totaal", formatPrice(full.total)],
          ["Verzending", (pricing?.shipping[full.shippingMethod] ?? shippingOptions[full.shippingMethod]).label],
          ["Artikelen", full.items.map((i) => `${i.quantity}× ${i.productName} (${i.variantName})`).join(", ")],
        ],
      });
    }
    return;
  }

  if (payment.type === "EVENT" && payment.registrationId) {
    await prisma.eventRegistration.update({ where: { id: payment.registrationId }, data: { status: "CONFIRMED" } });
    await sendRegistrationConfirmation(payment.registrationId);
    return;
  }

  if (payment.type === "MEMBERSHIP" && payment.membershipId) {
    const before = await prisma.membership.findUniqueOrThrow({ where: { id: payment.membershipId } });
    const isRenewal = !!before.startedAt;
    const membership = await activateOrExtendMembership(before.id, paidAt);
    const user = await prisma.user.findUniqueOrThrow({ where: { id: membership.userId } });

    // Eerste Mollie-betaling met mandaat → jaarlijks abonnement aanmaken.
    if (
      payment.provider === "MOLLIE" &&
      membership.autoRenew &&
      !membership.mollieSubscriptionId &&
      !payment.isRecurring &&
      state.customerId &&
      membership.currentPeriodEnd
    ) {
      try {
        const subscriptionId = await createYearlySubscription({
          customerId: state.customerId,
          amountCents: (await getSettings("membership")).priceCents,
          startDate: membership.currentPeriodEnd,
          description: `Lidmaatschap MazdaClub Nederland – ${user.firstName} ${user.lastName}`,
          webhookUrl: isLocalUrl(siteUrl()) ? undefined : siteUrl("/api/webhooks/mollie"),
          membershipId: membership.id,
        });
        await prisma.membership.update({ where: { id: membership.id }, data: { mollieSubscriptionId: subscriptionId } });
      } catch (err) {
        console.error("[lidmaatschap] Mollie-abonnement aanmaken mislukt", err);
      }
    }

    const fresh = await prisma.membership.findUniqueOrThrow({ where: { id: membership.id } });
    const pricing = await getPricing().catch(() => null);
    await sendEmail({ to: user.email, ...templates.membershipConfirmation(user, fresh, isRenewal, { discountPercent: pricing?.memberDiscountPercent }) });
    const name = `${user.firstName} ${user.lastName}`;
    await notifyAdmins({
      type: isRenewal ? "membershipRenewed" : "membershipStarted",
      title: isRenewal ? `Lidmaatschap verlengd: ${name}` : `Nieuw betaald lid: ${name}`,
      message: isRenewal
        ? `${name} heeft het lidmaatschap ${payment.isRecurring ? "automatisch " : ""}verlengd tot en met ${fresh.currentPeriodEnd ? formatDate(fresh.currentPeriodEnd) : "-"}.`
        : `${name} is betaald lid geworden van MazdaClub Nederland.`,
      link: `/admin/leden/${user.id}`,
      details: [
        ["Lid", `${name} (${user.email})`],
        ["Lidnummer", formatMemberNumber(fresh.memberNumber)],
        ["Geldig tot en met", fresh.currentPeriodEnd ? formatDate(fresh.currentPeriodEnd) : "-"],
        ["Betaald", formatPrice(payment.amount)],
        ["Automatische verlenging", fresh.mollieSubscriptionId || fresh.autoRenew ? "Aan" : "Uit"],
      ],
    });
  }
}

const paymentTypeLabels: Record<Payment["type"], string> = { ORDER: "Bestelling", EVENT: "Inschrijving evenement", MEMBERSHIP: "Lidmaatschap" };
const failedLabels: Partial<Record<PaymentStatus, string>> = { FAILED: "mislukt", CANCELED: "geannuleerd", EXPIRED: "verlopen" };

async function onFailed(payment: Payment, status: PaymentStatus) {
  await notifyAdmins({
    type: "paymentFailed",
    title: `Betaling ${failedLabels[status] ?? "mislukt"}: ${formatPrice(payment.amount)}`,
    message: payment.isRecurring
      ? `De automatische incasso voor een lidmaatschap is ${failedLabels[status] ?? "mislukt"}. Het lidmaatschap verloopt aan het einde van de periode als er niet alsnog wordt betaald.`
      : `${payment.description} is ${failedLabels[status] ?? "mislukt"}. Gereserveerde voorraad of plaatsen zijn weer vrijgegeven.`,
    link: "/admin/betalingen",
    details: [
      ["Soort", paymentTypeLabels[payment.type]],
      ["Omschrijving", payment.description],
      ["Bedrag", formatPrice(payment.amount)],
    ],
  });
  if (payment.type === "ORDER" && payment.orderId) {
    const orderId = payment.orderId;
    await prisma.$transaction(async (tx) => {
      const cancelled = await tx.order.updateMany({ where: { id: orderId, status: "PENDING" }, data: { status: "CANCELLED" } });
      if (cancelled.count > 0) await restoreStockForOrder(tx, orderId);
    });
    return;
  }
  if (payment.type === "EVENT" && payment.registrationId) {
    await prisma.eventRegistration.updateMany({ where: { id: payment.registrationId, status: "PENDING" }, data: { status: "CANCELLED" } });
  }
  // Lidmaatschap: blijft in de huidige staat; een mislukte automatische incasso laat het
  // lidmaatschap aan het einde van de periode vanzelf verlopen.
}

async function onRefunded(payment: Payment) {
  await notifyAdmins({
    type: "paymentRefunded",
    title: `Terugbetaald: ${formatPrice(payment.amount)}`,
    message: `${payment.description} is terugbetaald.`,
    link: payment.orderId ? `/admin/bestellingen/${payment.orderId}` : "/admin/betalingen",
    details: [
      ["Soort", paymentTypeLabels[payment.type]],
      ["Omschrijving", payment.description],
      ["Bedrag", formatPrice(payment.amount)],
    ],
  });
  if (payment.type === "ORDER" && payment.orderId) {
    await prisma.order.update({ where: { id: payment.orderId }, data: { status: "REFUNDED" } });
  }
  if (payment.type === "EVENT" && payment.registrationId) {
    await prisma.eventRegistration.update({ where: { id: payment.registrationId }, data: { status: "CANCELLED" } });
  }
}

/** Verstuurt de bevestigingsmail van een inschrijving precies één keer. */
export async function sendRegistrationConfirmation(registrationId: string) {
  const claimed = await prisma.eventRegistration.updateMany({
    where: { id: registrationId, confirmationSentAt: null, status: "CONFIRMED" },
    data: { confirmationSentAt: new Date() },
  });
  if (claimed.count === 0) return;
  const reg = await prisma.eventRegistration.findUniqueOrThrow({ where: { id: registrationId }, include: { event: true } });
  const attach = reg.event.status === "PUBLISHED";
  const content = await getContent().catch(() => null);
  await sendEmail({
    to: reg.email,
    ...templates.eventRegistrationConfirmation(reg, reg.event, {
      hasCalendarAttachment: attach,
      contact: { email: content?.contactEmail, phone: content?.contactPhone },
    }),
    attachments: attach
      ? [{ filename: `${reg.event.slug}.ics`, content: Buffer.from(buildEventIcs(reg.event), "utf8"), contentType: "text/calendar; charset=utf-8; method=PUBLISH" }]
      : undefined,
  });

  const confirmed = await prisma.eventRegistration.count({ where: { eventId: reg.eventId, status: "CONFIRMED" } });
  await notifyAdmins({
    type: "eventRegistration",
    title: `Aanmelding ${reg.event.title}: ${reg.firstName} ${reg.lastName}`,
    message: `${reg.firstName} ${reg.lastName} heeft zich aangemeld voor ${reg.event.title} (${formatDateTime(reg.event.startsAt)}). Er zijn nu ${confirmed} van de ${reg.event.capacity} plaatsen bezet.`,
    link: `/admin/evenementen/${reg.eventId}`,
    details: [
      ["Deelnemer", `${reg.firstName} ${reg.lastName} (${reg.email})`],
      ["Telefoon", reg.phone],
      ["Kenteken", reg.licensePlate],
      ["Soort", reg.isMember ? "Lid" : "Niet-lid"],
      ["Bedrag", reg.amount === 0 ? "Gratis" : `${formatPrice(reg.amount)} betaald`],
      ["Bezetting", `${confirmed}/${reg.event.capacity}`],
      ...(reg.remarks ? ([["Opmerking", reg.remarks]] as Array<[string, string]>) : []),
    ],
  });
}
