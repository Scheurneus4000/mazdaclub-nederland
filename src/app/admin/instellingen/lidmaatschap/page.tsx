import type { Metadata } from "next";
import { MembershipSettingsForm } from "@/components/admin/pricing-settings-forms";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "Lidmaatschap & prijzen" };
export const dynamic = "force-dynamic";

export default async function MembershipSettingsPage() {
  await requireAdmin();
  const [s, activeSubscriptions] = await Promise.all([
    getSettings("membership"),
    prisma.membership.count({ where: { status: "ACTIVE", mollieSubscriptionId: { not: null } } }),
  ]);
  return <MembershipSettingsForm values={s} activeSubscriptions={activeSubscriptions} />;
}
