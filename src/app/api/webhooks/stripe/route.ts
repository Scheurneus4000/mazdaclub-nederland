import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { prisma } from "@/lib/db";
import { handleProviderWebhook } from "@/lib/payments";
import { stripe } from "@/lib/payments/stripe";
import { getPaymentConfig } from "@/lib/settings";

/** Stripe-webhook (optioneel). Handtekening wordt geverifieerd met het webhookgeheim (beheer of STRIPE_WEBHOOK_SECRET). */
export async function POST(req: Request) {
  const { stripeWebhookSecret: secret } = await getPaymentConfig();
  const signature = req.headers.get("stripe-signature");
  if (!secret || !signature) return NextResponse.json({ error: "Niet geconfigureerd" }, { status: 400 });

  let event: Stripe.Event;
  try {
    const body = await req.text();
    event = (await stripe()).webhooks.constructEvent(body, signature, secret);
  } catch {
    return NextResponse.json({ error: "Ongeldige handtekening" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded":
      case "checkout.session.async_payment_failed":
      case "checkout.session.expired":
        await handleProviderWebhook("STRIPE", event.data.object.id);
        break;
      case "charge.refunded": {
        const charge = event.data.object;
        const intentId = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
        if (intentId) {
          const intent = await (await stripe()).paymentIntents.retrieve(intentId);
          const localId = intent.metadata?.paymentId;
          const payment = localId ? await prisma.payment.findUnique({ where: { id: localId } }) : null;
          if (payment?.providerPaymentId) await handleProviderWebhook("STRIPE", payment.providerPaymentId);
        }
        break;
      }
      default:
        break;
    }
    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[webhook stripe]", err);
    return NextResponse.json({ error: "Fout bij verwerken" }, { status: 500 });
  }
}
