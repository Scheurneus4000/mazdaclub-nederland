import createMollieClient, { Locale, SequenceType, type MollieClient } from "@mollie/api-client";
import type { PaymentStatus } from "@prisma/client";
import { getPaymentConfig } from "@/lib/settings";
import { centsToDecimalString } from "@/lib/utils";
import type { PaymentProviderAdapter, ProviderPaymentState } from "./types";

const clients = new Map<string, MollieClient>();

/** Mollie-client met de API-sleutel uit Beheer → Instellingen → Betalingen (of MOLLIE_API_KEY). */
export async function mollie(): Promise<MollieClient> {
  const { mollieApiKey } = await getPaymentConfig();
  if (!mollieApiKey) throw new Error("Er is nog geen Mollie API-sleutel ingesteld (Beheer → Instellingen → Betalingen).");
  return mollieClientFor(mollieApiKey);
}

export function mollieClientFor(apiKey: string): MollieClient {
  let c = clients.get(apiKey);
  if (!c) {
    c = createMollieClient({ apiKey });
    clients.set(apiKey, c);
  }
  return c;
}

function mapStatus(status: string, refunded: boolean): PaymentStatus {
  if (refunded) return "REFUNDED";
  switch (status) {
    case "paid":
      return "PAID";
    case "authorized":
    case "pending":
      return "PENDING";
    case "failed":
      return "FAILED";
    case "canceled":
      return "CANCELED";
    case "expired":
      return "EXPIRED";
    default:
      return "OPEN";
  }
}

/**
 * Mollie-adapter. De Mollie hosted checkout toont automatisch alle methodes die in het
 * Mollie-dashboard actief zijn: iDEAL | Wero, Bancontact, creditcard, Apple Pay, Google Pay en
 * PayPal (PayPal-zakelijk account koppelen in het Mollie-dashboard). Er hoeft dus niets in de code te
 * veranderen om een methode aan of uit te zetten. Bij het lidmaatschap met automatische verlenging
 * (sequenceType "first") toont Mollie alleen methodes die herhaalbetalingen ondersteunen.
 * Uitbetalingen gaan automatisch naar de bankrekening die in Mollie is ingesteld.
 */
export const mollieAdapter: PaymentProviderAdapter = {
  name: "MOLLIE",

  async createPayment({ payment, description, redirectUrl, webhookUrl, recurringFirst }) {
    const created = await (await mollie()).payments.create({
      amount: { currency: "EUR", value: centsToDecimalString(payment.amount) },
      description: description.slice(0, 255),
      redirectUrl,
      ...(webhookUrl ? { webhookUrl } : {}),
      locale: Locale.nl_NL,
      metadata: { paymentId: payment.id, type: payment.type },
      ...(recurringFirst ? { customerId: recurringFirst.customerId, sequenceType: SequenceType.first } : {}),
    });
    const checkoutUrl = created.getCheckoutUrl();
    if (!checkoutUrl) throw new Error("Mollie gaf geen checkout-URL terug");
    return { providerPaymentId: created.id, checkoutUrl };
  },

  async getPaymentState(providerPaymentId): Promise<ProviderPaymentState> {
    const p = await (await mollie()).payments.get(providerPaymentId);
    const refundedCents = p.amountRefunded ? Math.round(Number(p.amountRefunded.value) * 100) : 0;
    const amountCents = Math.round(Number(p.amount.value) * 100);
    const metadata = (p.metadata ?? {}) as { paymentId?: string };
    return {
      status: mapStatus(p.status, refundedCents > 0 && refundedCents >= amountCents),
      method: p.method ?? null,
      paidAt: p.paidAt ? new Date(p.paidAt) : null,
      customerId: p.customerId ?? null,
      subscriptionId: p.subscriptionId ?? null,
      amountCents,
      localPaymentId: metadata.paymentId ?? null,
    };
  },

  async refund({ providerPaymentId, amountCents, description }) {
    const client = await mollie();
    const p = await client.payments.get(providerPaymentId);
    const remaining = p.amountRemaining ? Math.round(Number(p.amountRemaining.value) * 100) : Math.round(Number(p.amount.value) * 100);
    const cents = amountCents ?? remaining;
    if (cents <= 0) throw new Error("Deze betaling is al volledig terugbetaald.");
    if (cents > remaining) throw new Error(`Er kan nog maximaal € ${centsToDecimalString(remaining).replace(".", ",")} worden terugbetaald.`);
    const refund = await client.paymentRefunds.create({
      paymentId: providerPaymentId,
      amount: { currency: "EUR", value: centsToDecimalString(cents) },
      ...(description ? { description: description.slice(0, 140) } : {}),
    });
    return { refundId: refund.id };
  },
};

export async function createMollieCustomer(name: string, email: string): Promise<string> {
  const customer = await (await mollie()).customers.create({ name, email, locale: Locale.nl_NL });
  return customer.id;
}

/** Jaarlijkse automatische incasso na een geslaagde eerste betaling. */
export async function createYearlySubscription(args: {
  customerId: string;
  amountCents: number;
  startDate: Date;
  description: string;
  webhookUrl?: string;
  membershipId: string;
}): Promise<string> {
  const start = args.startDate.toISOString().slice(0, 10);
  const subscription = await (await mollie()).customerSubscriptions.create({
    customerId: args.customerId,
    amount: { currency: "EUR", value: centsToDecimalString(args.amountCents) },
    interval: "12 months",
    startDate: start,
    description: args.description,
    ...(args.webhookUrl ? { webhookUrl: args.webhookUrl } : {}),
    metadata: { membershipId: args.membershipId },
  });
  return subscription.id;
}

export async function cancelSubscription(customerId: string, subscriptionId: string): Promise<void> {
  await (await mollie()).customerSubscriptions.cancel(subscriptionId, { customerId });
}
