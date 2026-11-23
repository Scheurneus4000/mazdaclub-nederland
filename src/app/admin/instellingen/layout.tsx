import { AdminPageHeader } from "@/components/admin/page-title";
import { SettingsNav } from "@/components/admin/settings-nav";
import { requireAdmin } from "@/lib/session";

/** Alle instellingen van de website, verdeeld over tabbladen. */
export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <>
      <AdminPageHeader
        title="Instellingen"
        description="Betalingen, lidmaatschap, verzending, e-mail en meldingen. Wijzigingen gelden direct; je hoeft niets aan de code of de hosting te veranderen."
      />
      <SettingsNav />
      <div className="mt-6">{children}</div>
    </>
  );
}
