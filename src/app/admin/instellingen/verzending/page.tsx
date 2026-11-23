import type { Metadata } from "next";
import { ShippingSettingsForm } from "@/components/admin/pricing-settings-forms";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { getSettings, secretInfo } from "@/lib/settings";

export const metadata: Metadata = { title: "Verzending" };
export const dynamic = "force-dynamic";

export default async function ShippingSettingsPage() {
  await requireAdmin();
  const [s, toShipCount] = await Promise.all([
    getSettings("shipping"),
    prisma.order.count({ where: { status: { in: ["PAID", "PROCESSING"] }, shippingMethod: { not: "PICKUP_EVENT" } } }),
  ]);
  return (
    <ShippingSettingsForm
      toShipCount={toShipCount}
      values={{
        sender: s.sender,
        methods: s.methods,
        processingTime: s.processingTime,
        // Geheime waarden nooit naar de browser: alleen of ze zijn ingesteld (gemaskeerd).
        carrier: { provider: s.carrier.provider, apiKey: secretInfo(s.carrier.apiKey), apiSecret: secretInfo(s.carrier.apiSecret) },
      }}
    />
  );
}
