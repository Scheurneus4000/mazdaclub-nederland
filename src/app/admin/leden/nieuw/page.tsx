import type { Metadata } from "next";
import { toAmsterdamDateInput } from "@/components/admin/datetime";
import { MemberCreateForm } from "@/components/admin/member-forms";
import { AdminPageHeader } from "@/components/admin/page-title";
import { Alert } from "@/components/ui/form-controls";
import { requireAdmin } from "@/lib/session";
import { addYears } from "@/lib/utils";

export const metadata: Metadata = { title: "Lid toevoegen" };
export const dynamic = "force-dynamic";

export default async function AdminNewMemberPage() {
  await requireAdmin();
  const now = new Date();

  return (
    <>
      <AdminPageHeader
        title="Lid toevoegen"
        description="Voor leden die buiten de website om lid zijn geworden, bijvoorbeeld contant of per overboeking."
        back={{ href: "/admin/leden", label: "Ledenbeheer" }}
      />
      <Alert variant="info" className="mb-6">
        Leden die zich via de website aanmelden en online betalen, verschijnen automatisch in de ledenlijst. Dit formulier heb je alleen nodig voor
        uitzonderingen.
      </Alert>
      <MemberCreateForm defaultStart={toAmsterdamDateInput(now)} defaultEnd={toAmsterdamDateInput(addYears(now, 1))} />
    </>
  );
}
