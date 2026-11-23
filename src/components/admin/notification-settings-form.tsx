"use client";

import { BellRing, Loader2, Save } from "lucide-react";
import { saveNotificationSettings, sendTestNotificationAction } from "@/app/admin/actions/notification-settings";
import { Button } from "@/components/ui/button";
import { Checkbox, Field } from "@/components/ui/form-controls";
import { Textarea } from "@/components/ui/textarea";
import { useFormAction } from "./use-form-action";

export type NotificationEventOption = { key: string; label: string; description: string; enabled: boolean };

export function NotificationSettingsForm({
  recipients,
  fallbackRecipients,
  events,
}: {
  recipients: string[];
  fallbackRecipients: string[];
  events: NotificationEventOption[];
}) {
  const { onSubmit, pending, errors } = useFormAction(saveNotificationSettings);

  return (
    <form onSubmit={onSubmit} className="space-y-6" noValidate>
      <section className="rounded-xl border border-border bg-white">
        <h2 className="border-b border-border px-5 py-4 text-base font-semibold sm:px-6">Wie ontvangt meldingen per e-mail?</h2>
        <div className="p-5 sm:p-6">
          <Field
            label="E-mailadressen"
            htmlFor="recipients"
            error={errors.recipients}
            hint={
              fallbackRecipients.length
                ? `Eén adres per regel, maximaal 10. Leeg = de eigenaar (${fallbackRecipients.join(", ")}).`
                : "Eén adres per regel, maximaal 10."
            }
          >
            <Textarea
              id="recipients"
              name="recipients"
              rows={4}
              defaultValue={recipients.join("\n")}
              placeholder={fallbackRecipients.join("\n") || "bestuur@mazdaclubnederland.nl"}
              aria-invalid={!!errors.recipients}
            />
          </Field>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-white">
        <h2 className="border-b border-border px-5 py-4 text-base font-semibold sm:px-6">Waarover wil je een e-mail ontvangen?</h2>
        <ul className="divide-y divide-border">
          {events.map((e) => (
            <li key={e.key}>
              <label className="flex cursor-pointer items-start gap-3 px-5 py-4 hover:bg-muted/40 sm:px-6">
                <Checkbox name={`event.${e.key}`} defaultChecked={e.enabled} className="mt-0.5" />
                <span>
                  <span className="block text-sm font-semibold">{e.label}</span>
                  <span className="block text-sm text-muted-foreground">{e.description}</span>
                </span>
              </label>
            </li>
          ))}
        </ul>
      </section>

      <div className="sticky bottom-4 z-10 flex flex-col gap-3 rounded-xl border border-border bg-white/95 p-4 shadow-lg backdrop-blur sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">Alle meldingen verschijnen ook altijd in het meldingencentrum van het beheer.</p>
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : <Save />}
          Meldingen opslaan
        </Button>
      </div>
    </form>
  );
}

export function TestNotificationButton() {
  const { onSubmit, pending } = useFormAction(sendTestNotificationAction);
  return (
    <form onSubmit={onSubmit}>
      <Button type="submit" variant="outline" disabled={pending} className="w-full">
        {pending ? <Loader2 className="animate-spin" /> : <BellRing />}
        Stuur testmelding
      </Button>
    </form>
  );
}
