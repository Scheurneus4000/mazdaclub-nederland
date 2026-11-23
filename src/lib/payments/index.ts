import type { PaymentProvider, PaymentStatus, PaymentType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getPaymentConfig, getSettings } from "@/lib/settings";
import { isLocalUrl, siteUrl } from "@/lib/utils";
import { applyPaymentState } from "./fulfillment";
import { isMockAllowed, mockAdapter } from "./mock";
import { mollieAdapter } from "./mollie";
import { stripeAdapter } from "./stripe";
import type { PaymentProviderAdapter } from "./types";

export { applyPaymentState, sendRegistrationConfirmation } from "./fulfillment";

export function adapterFor(provider: PaymentProvider): PaymentProviderAdapter {
  switch (provider) {
    case "MOLLIE":
      return mollieAdapter;
    case "STRIPE":
      return stripeAdapter;
    case "MOCK":
      return mockAdapter;
    case "MANUAL":
      throw new Error("Handmatig geregistreerde betalingen hebben geen betaalprovider");
  }
}

/**
 * De actieve betaalprovider: Beheer → Instellingen → Betalingen, anders PAYMENT_PROVIDER
 * (mollie | stripe | mock). Mock-betalingen zijn in productie altijd uitgeschakeld.
 */
export async function activeProvider(): Promise<PaymentProviderAdapter> {
  const { provider } = await getPaymentConfig();
  if (provider === "STRIPE") return stripeAdapter;
  if (provider === "MOCK") {
    if (!isMockAllowed()) throw new Error("Testbetalingen zijn uitgeschakeld in productie");
    return mockAdapter;
  }
  return mollieAdapter;
}

/** Automatische jaarlijkse verlenging kan alleen met Mollie én als die in het beheer aan staat. */
export async function supportsRecurring(): Promise<boolean> {
  const [adapter, membership] = await Promise.all([activeProvider(), getSettings("membership")]);
  return adapter.name === "MOLLIE" && membership.autoRenewAvailable;
}

export type StartPaymentInput = {
  type: PaymentType;
  amount: number; // centen
  description: string;
  customerEmail: string;
  customerName: string;
  userId?: string | null;
  orderId?: string;
  registrationId?: string;
  membershipId?: string;
  recurringFirst?: { customerId: string };
};

/**
 * Maakt een betaling aan bij de actieve provider en geeft de checkout-URL terug.
 * Mislukt het aanmaken, dan wordt de betaling als FAILED verwerkt (voorraad/plaatsen komen vrij).
 */
export async function startPayment(input: StartPaymentInput): Promise<{ paymentId: string; checkoutUrl: string }> {
  const adapter = await activeProvider();
  const payment = await prisma.payment.create({
    data: {
      provider: adapter.name,
      type: input.type,
      amount: input.amount,
      description: input.description,
      userId: input.userId ?? null,
      orderId: input.orderId,
      registrationId: input.registrationId,
      membershipId: input.membershipId,
    },
  });

  const webhookPath = adapter.name === "STRIPE" ? "/api/webhooks/stripe" : "/api/webhooks/mollie";
  // Mollie weigert webhooks naar localhost; lokaal synchroniseert de resultaatpagina de status.
  const webhookUrl = adapter.name !== "MOCK" && !isLocalUrl(siteUrl()) ? siteUrl(webhookPath) : undefined;

  try {
    const result = await adapter.createPayment({
      payment,
      description: input.description,
      redirectUrl: siteUrl(`/betaling/resultaat?id=${payment.id}`),
      webhookUrl,
      customerEmail: input.customerEmail,
      customerName: input.customerName,
      recurringFirst: input.recurringFirst,
    });
    await prisma.payment.update({
      where: { id: payment.id },
      data: { providerPaymentId: result.providerPaymentId, checkoutUrl: result.checkoutUrl },
    });
    return { paymentId: payment.id, checkoutUrl: result.checkoutUrl };
  } catch (err) {
    console.error("[betaling] aanmaken bij provider mislukt", err);
    await applyPaymentState(payment.id, { status: "FAILED" });
    throw new Error("De betaling kon niet worden gestart. Probeer het later opnieuw.");
  }
}

export type RefundResult = { ok: true; full: boolean; status: PaymentStatus } | { ok: false; error: string };

function explainRefundError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  const lower = msg.toLowerCase();
  if (lower.includes("balance") || lower.includes("saldo")) {
    return "Er staat onvoldoende saldo op je betaalaccount om terug te betalen. Wacht tot er nieuwe betalingen binnen zijn of vul het saldo aan in het dashboard van je betaalprovider.";
  }
  if (lower.includes("not refundable") || lower.includes("cannot be refunded")) return "Deze betaling kan (nog) niet worden terugbetaald via de betaalprovider.";
  if (lower.includes("api key") || lower.includes("unauthorized") || lower.includes("401")) return "De API-sleutel van de betaalprovider is ongeldig. Controleer Instellingen → Betalingen.";
  return msg.startsWith("Er kan nog") || msg.startsWith("Deze") ? msg : `Terugbetalen mislukt: ${msg}`;
}

/**
 * Betaalt een betaalde Mollie-, Stripe- of testbetaling (gedeeltelijk) terug en verwerkt daarna de
 * nieuwe status. Volledig terugbetaald → status REFUNDED (bestelling terugbetaald / inschrijving geannuleerd).
 * Handmatige betalingen (contant/overboeking) betaal je zelf terug.
 */
export async function refundPayment(paymentId: string, amountCents?: number): Promise<RefundResult> {
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment) return { ok: false, error: "Betaling niet gevonden." };
  if (payment.status !== "PAID") return { ok: false, error: "Alleen betaalde betalingen kunnen worden terugbetaald." };
  if (payment.provider === "MANUAL") {
    return { ok: false, error: "Dit is een handmatige betaling (contant of overboeking). Betaal het bedrag zelf terug en pas daarna het lidmaatschap aan." };
  }
  if (!payment.providerPaymentId) return { ok: false, error: "Deze betaling is niet bij een betaalprovider bekend." };
  if (amountCents !== undefined && (!Number.isInteger(amountCents) || amountCents <= 0 || amountCents > payment.amount)) {
    return { ok: false, error: "Vul een bedrag in tussen € 0,01 en het betaalde bedrag." };
  }

  const adapter = adapterFor(payment.provider);
  if (!adapter.refund) return { ok: false, error: "Terugbetalen wordt voor deze betaalprovider niet ondersteund." };

  try {
    await adapter.refund({ providerPaymentId: payment.providerPaymentId, amountCents, totalCents: payment.amount, description: payment.description });
  } catch (err) {
    console.error(`[betaling ${payment.id}] terugbetalen mislukt`, err);
    return { ok: false, error: explainRefundError(err) };
  }

  const full = amountCents === undefined || amountCents >= payment.amount;
  if (payment.provider === "MOCK") {
    const status = full ? ((await applyPaymentState(payment.id, { status: "REFUNDED" })) ?? payment.status) : payment.status;
    return { ok: true, full, status };
  }
  // Status opnieuw ophalen; verwerkt de provider de terugbetaling later, dan volgt de webhook.
  try {
    const state = await adapter.getPaymentState(payment.providerPaymentId);
    const status = (await applyPaymentState(payment.id, state)) ?? payment.status;
    return { ok: true, full, status };
  } catch (err) {
    console.warn(`[betaling ${payment.id}] status na terugbetaling ophalen mislukt`, err);
    return { ok: true, full, status: payment.status };
  }
}

/** Haalt de actuele status op bij de provider en verwerkt die (gebruikt door resultaatpagina en webhooks). */
export async function syncPayment(paymentId: string): Promise<PaymentStatus | null> {
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment) return null;
  if (!payment.providerPaymentId || payment.provider === "MOCK" || payment.provider === "MANUAL") return payment.status;
  if (payment.status === "PAID" || payment.status === "REFUNDED") return payment.status;
  try {
    const state = await adapterFor(payment.provider).getPaymentState(payment.providerPaymentId);
    return await applyPaymentState(payment.id, state);
  } catch (err) {
    console.error(`[betaling ${payment.id}] status ophalen mislukt`, err);
    return payment.status;
  }
}

/**
 * Webhook-verwerking. Mollie stuurt alleen een id; we halen de status altijd zelf op
 * (de webhook-inhoud wordt dus nooit vertrouwd). Onbekende betalingen van een
 * Mollie-abonnement (automatische verlenging) worden hier aangemaakt.
 */
export async function handleProviderWebhook(provider: PaymentProvider, providerPaymentId: string): Promise<void> {
  const adapter = adapterFor(provider);
  const state = await adapter.getPaymentState(providerPaymentId);

  let payment = await prisma.payment.findUnique({ where: { providerPaymentId } });
  if (!payment && state.localPaymentId) {
    payment = await prisma.payment.findUnique({ where: { id: state.localPaymentId } });
  }

  if (!payment && provider === "MOLLIE" && state.subscriptionId) {
    const membership = await prisma.membership.findUnique({ where: { mollieSubscriptionId: state.subscriptionId } });
    if (!membership) {
      console.warn(`[webhook] onbekend abonnement ${state.subscriptionId}`);
      return;
    }
    payment = await prisma.payment.create({
      data: {
        provider: "MOLLIE",
        providerPaymentId,
        type: "MEMBERSHIP",
        status: "OPEN",
        amount: state.amountCents ?? (await getSettings("membership")).priceCents,
        description: "Automatische verlenging lidmaatschap",
        userId: membership.userId,
        membershipId: membership.id,
        isRecurring: true,
      },
    });
  }

  if (!payment) {
    console.warn(`[webhook] onbekende betaling ${providerPaymentId}`);
    return;
  }
  await applyPaymentState(payment.id, state);
}

export const paymentStatusLabels: Record<PaymentStatus, string> = {
  OPEN: "Open",
  PENDING: "In behandeling",
  PAID: "Betaald",
  FAILED: "Mislukt",
  CANCELED: "Geannuleerd",
  EXPIRED: "Verlopen",
  REFUNDED: "Terugbetaald",
};
