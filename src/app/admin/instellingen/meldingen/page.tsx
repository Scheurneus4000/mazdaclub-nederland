import type { Metadata } from "next";
import Link from "next/link";
import { Bell } from "lucide-react";
import { NotificationSettingsForm, TestNotificationButton } from "@/components/admin/notification-settings-form";
import { AdminSection } from "@/components/admin/page-title";
import { notificationEventLabels, type NotificationEvent } from "@/lib/notifications";
import { ownerEmails } from "@/lib/owner";
import { requireAdmin } from "@/lib/session";
import { getNotificationRecipients, getSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "Meldingen" };
export const dynamic = "force-dynamic";

export default async function NotificationSettingsPage() {
  await requireAdmin();
  const [settings, effective] = await Promise.all([getSettings("notifications"), getNotificationRecipients()]);
  const fallback = ownerEmails().length ? ownerEmails() : process.env.ADMIN_EMAIL ? [process.env.ADMIN_EMAIL] : [];

  return (
    <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="min-w-0">
        <NotificationSettingsForm
          recipients={settings.recipients}
          fallbackRecipients={fallback}
          events={(Object.keys(notificationEventLabels) as NotificationEvent[]).map((key) => ({
            key,
            ...notificationEventLabels[key],
            enabled: settings.events[key],
          }))}
        />
      </div>

      <div className="space-y-6">
        <AdminSection title="Zo werken meldingen">
          <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
            <p>
              Bij belangrijke gebeurtenissen, zoals een nieuwe aanmelding voor een rit, een nieuw lid of een betaalde bestelling, maakt de website een
              melding.
            </p>
            <p>
              Elke melding verschijnt in het{" "}
              <Link href="/admin/meldingen" className="font-medium text-primary hover:underline">
                meldingencentrum
              </Link>{" "}
              (het belletje bovenin het beheer). Welke meldingen je ook per e-mail krijgt, kies je hiernaast.
            </p>
            <p className="flex items-start gap-2 rounded-md bg-surface px-3 py-2 text-xs">
              <Bell className="mt-0.5 size-4 shrink-0 text-primary" />
              {effective.length
                ? `E-mailmeldingen gaan nu naar: ${effective.join(", ")}.`
                : "Er is nog geen ontvanger: vul hiernaast een e-mailadres in of stel OWNER_EMAIL in bij de hosting."}
            </p>
          </div>
          <div className="mt-5 border-t border-border pt-5">
            <TestNotificationButton />
            <p className="mt-2 text-xs text-muted-foreground">
              Komt de testmelding niet aan? Controleer dan{" "}
              <Link href="/admin/instellingen/e-mail" className="font-medium text-primary hover:underline">
                de e-mailinstellingen
              </Link>
              .
            </p>
          </div>
        </AdminSection>
      </div>
    </div>
  );
}
