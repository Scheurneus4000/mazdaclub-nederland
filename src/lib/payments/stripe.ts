import Stripe from "stripe";
import { getPaymentConfig } from "@/lib/settings";
import type { PaymentProviderAdapter, ProviderPaymentState } from "./types";

const clients = new Map<string, Stripe>();

/** Stripe-client met de sleutel uit Beheer → Instellingen → Betalingen (of STRIPE_SECRET_KEY). */
export async function stripe(): Promise<Stripe> {
  const { stripeSecretKey } = await getPaymentConfig();
  if (!stripeSecretKey) throw new Error("Er is nog geen Stripe-sleutel ingesteld (Beheer → Instellingen → Betalingen).");
  return stripeClientFor(stripeSecretKey);
}

export function stripeClientFor(secretKey: string): Stripe {
  let c = clients.get(secretKey);
  if (!c) {
    c = new Stripe(secretKey);
    clients.set(secretKey, c);
  }
  return c;
}

/**
 * Optionele Stripe-adapter via Stripe Checkout. Betaalmethodes (iDEAL, Bancontact, kaart,
 * Apple Pay, Google Pay, PayPal) worden in het Stripe-dashboard aangezet ("dynamic payment methods").
 * Let op: automatische jaarlijkse verlenging is alleen geïmplementeerd voor Mollie.
 */
export const stripeAdapter: PaymentProviderAdapter = {
  name: "STRIPE",

  async createPayment({ payment, description, redirectUrl, customerEmail }) {
    const session = await (await stripe()).checkout.sessions.create({
      mode: "payment",
      locale: "nl",
      customer_email: customerEmail,
      line_items: [
        {
          quantity: 1,
          price_data: { currency: "eur", unit_amount: payment.amount, product_data: { name: description.slice(0, 250) } },
        },
      ],
      success_url: redirectUrl,
      cancel_url: redirectUrl,
      metadata: { paymentId: payment.id, type: payment.type },
      payment_intent_data: { metadata: { paymentId: payment.id, type: payment.type } },
      expires_at: Math.floor(Date.now() / 1000) + 60 * 60, // 1 uur
    });
    if (!session.url) throw new Error("Stripe gaf geen checkout-URL terug");
    return { providerPaymentId: session.id, checkoutUrl: session.url };
  },

  async getPaymentState(sessionId): Promise<ProviderPaymentState> {
    const session = await (await stripe()).checkout.sessions.retrieve(sessionId, { expand: ["payment_intent.latest_charge"] });
    const intent = typeof session.payment_intent === "object" ? session.payment_intent : null;
    const charge = intent && typeof intent.latest_charge === "object" ? intent.latest_charge : null;
    const refunded = !!charge?.refunded;
    const status =
      refunded
        ? "REFUNDED"
        : session.payment_status === "paid"
          ? "PAID"
          : session.status === "expired"
            ? "EXPIRED"
            : intent?.status === "canceled"
              ? "CANCELED"
              : intent?.status === "processing"
                ? "PENDING"
                : "OPEN";
    return {
      status,
      method: charge?.payment_method_details?.type ?? null,
      paidAt: status === "PAID" ? new Date() : null,
      amountCents: session.amount_total ?? undefined,
      localPaymentId: session.metadata?.paymentId ?? null,
    };
  },

  async refund({ providerPaymentId, amountCents }) {
    const client = await stripe();
    const session = await client.checkout.sessions.retrieve(providerPaymentId);
    const intentId = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;
    if (!intentId) throw new Error("Deze Stripe-betaling heeft geen betaling om terug te storten.");
    const refund = await client.refunds.create({ payment_intent: intentId, ...(amountCents ? { amount: amountCents } : {}) });
    return { refundId: refund.id };
  },
};
