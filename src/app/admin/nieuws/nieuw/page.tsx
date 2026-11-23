import type { Metadata } from "next";
import { NewsForm } from "@/components/admin/news-form";
import { AdminPageHeader } from "@/components/admin/page-title";
import { requireAdmin } from "@/lib/session";

export const metadata: Metadata = { title: "Nieuw bericht" };
export const dynamic = "force-dynamic";

export default async function NewNewsPage() {
  const admin = await requireAdmin();
  return (
    <>
      <AdminPageHeader
        title="Nieuw bericht"
        description="Schrijf je bericht en kies of het direct, later of nog niet op de website komt."
        back={{ href: "/admin/nieuws", label: "Nieuws" }}
      />
      <NewsForm defaultAuthor={`${admin.firstName} ${admin.lastName}`.trim()} />
    </>
  );
}
