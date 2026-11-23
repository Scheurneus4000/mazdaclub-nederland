import type { Metadata } from "next";
import { EventForm } from "@/components/admin/event-form";
import { AdminPageHeader } from "@/components/admin/page-title";
import { requireAdmin } from "@/lib/session";
import { getPricing } from "@/lib/settings";

export const metadata: Metadata = { title: "Nieuw evenement" };
export const dynamic = "force-dynamic";

export default async function NewEventPage() {
  await requireAdmin();
  const pricing = await getPricing();
  return (
    <>
      <AdminPageHeader
        title="Nieuw evenement"
        description="Sla het evenement eerst op als concept en publiceer het zodra alles klopt."
        back={{ href: "/admin/evenementen", label: "Evenementbeheer" }}
      />
      <EventForm defaultPrices={{ nonMember: pricing.eventPriceNonMemberCents, member: pricing.eventPriceMemberCents }} />
    </>
  );
}
