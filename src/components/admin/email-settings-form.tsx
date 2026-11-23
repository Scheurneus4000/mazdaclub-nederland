"use client";

import * as React from "react";
import { Loader2, Save, Send, Server, Sparkles, Ban, Cloud } from "lucide-react";
import { saveEmailSettings, sendTestEmailAction } from "@/app/admin/actions/email-settings";
import { Button } from "@/components/ui/button";
import { Checkbox, Field } from "@/components/ui/form-controls";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { SecretField, type SecretState } from "./secret-field";
import { useFormAction } from "./use-form-action";

type Provider = "auto" | "resend" | "smtp" | "off";

export type EmailSettingsFormValues = {
  provider: Provider;
  fromName: string;
  fromAddress: string;
  replyTo: string;
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpUser: string;
  signature: string;
  resendApiKey: SecretState;
  smtpPassword: SecretState;
};

const providerOptions: Array<{ value: Provider; label: string; description: string; icon: typeof Cloud }> = [
  { value: "resend", label: "Resend (aanbevolen)", description: "Betrouwbare e-maildienst. Gratis tot 3.000 mails per maand, verstuurt vanaf je eigen domein.", icon: Sparkles },
  { value: "smtp", label: "Eigen mailserver (SMTP)", description: "Verstuur via de mailbox van je domeinprovider of Microsoft 365 / Google Workspace.", icon: Server },
  { value: "auto", label: "Automatisch (hosting)", description: "Gebruik de instellingen die bij de hosting zijn ingesteld (RESEND_API_KEY en EMAIL_FROM).", icon: Cloud },
  { value: "off", label: "Uit", description: "Er worden geen e-mails verstuurd (alleen in de serverlog). Alleen voor testen.", icon: Ban },
];

const smtpPresets: Array<{ label: string; host: string; port: number; secure: boolean }> = [
  { label: "Microsoft 365", host: "smtp.office365.com", port: 587, secure: false },
  { label: "Google Workspace / Gmail", host: "smtp.gmail.com", port: 465, secure: true },
  { label: "TransIP", host: "smtp.transip.email", port: 465, secure: true },
];

export function EmailSettingsForm({ values, envHasResend }: { values: EmailSettingsFormValues; envHasResend: boolean }) {
  const { onSubmit, pending, errors } = useFormAction(saveEmailSettings);
  const [provider, setProvider] = React.useState<Provider>(values.provider);
  const [host, setHost] = React.useState(values.smtpHost);
  const [port, setPort] = React.useState(String(values.smtpPort));
  const [secure, setSecure] = React.useState(values.smtpSecure);

  return (
    <form onSubmit={onSubmit} className="space-y-6" noValidate>
      <section className="rounded-xl border border-border bg-white">
        <h2 className="border-b border-border px-5 py-4 text-base font-semibold sm:px-6">Hoe worden e-mails verstuurd?</h2>
        <div className="grid gap-3 p-5 sm:p-6 md:grid-cols-2">
          {providerOptions.map(({ value, label, description, icon: Icon }) => (
            <label
              key={value}
              className={cn(
                "flex cursor-pointer gap-3 rounded-lg border p-4 transition-colors",
                provider === value ? "border-primary bg-accent/60 ring-1 ring-primary/30" : "border-border hover:bg-muted/50",
              )}
            >
              <input type="radio" name="provider" value={value} checked={provider === value} onChange={() => setProvider(value)} className="mt-1 accent-primary" />
              <span>
                <span className="flex items-center gap-2 font-semibold">
                  <Icon className="size-4 text-primary" /> {label}
                </span>
                <span className="mt-1 block text-sm text-muted-foreground">{description}</span>
              </span>
            </label>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-border bg-white">
        <h2 className="border-b border-border px-5 py-4 text-base font-semibold sm:px-6">Afzender</h2>
        <div className="grid gap-5 p-5 sm:p-6 md:grid-cols-2">
          <Field label="Naam van de afzender" htmlFor="fromName" error={errors.fromName} hint="Zo zien ontvangers de afzender, bijv. MazdaClub Nederland.">
            <Input id="fromName" name="fromName" defaultValue={values.fromName} maxLength={80} aria-invalid={!!errors.fromName} />
          </Field>
          <Field
            label="E-mailadres van de afzender"
            htmlFor="fromAddress"
            error={errors.fromAddress}
            required={provider === "resend" || provider === "smtp"}
            hint="Bijv. noreply@mazdaclubnederland.nl of info@mazdaclubnederland.nl. Bij Resend moet het domein geverifieerd zijn."
          >
            <Input id="fromAddress" name="fromAddress" type="email" defaultValue={values.fromAddress} aria-invalid={!!errors.fromAddress} placeholder="noreply@mazdaclubnederland.nl" />
          </Field>
          <Field
            label="Antwoorden komen binnen op"
            htmlFor="replyTo"
            error={errors.replyTo}
            hint="Als iemand op een automatische mail antwoordt. Leeg = het e-mailadres op de website."
          >
            <Input id="replyTo" name="replyTo" type="email" defaultValue={values.replyTo} aria-invalid={!!errors.replyTo} placeholder="info@mazdaclubnederland.nl" />
          </Field>
          <Field label="Ondertekening (optioneel)" htmlFor="signature" error={errors.signature} hint="Komt onder elke e-mail, bijv. 'Met sportieve groet, het bestuur van MazdaClub Nederland'." className="md:col-span-2">
            <Textarea id="signature" name="signature" defaultValue={values.signature} rows={3} maxLength={500} aria-invalid={!!errors.signature} />
          </Field>
        </div>
      </section>

      <section className={cn("rounded-xl border border-border bg-white", provider !== "resend" && provider !== "auto" && "hidden")}>
        <h2 className="border-b border-border px-5 py-4 text-base font-semibold sm:px-6">Resend</h2>
        <div className="grid gap-5 p-5 sm:p-6">
          <Field
            label="API-sleutel van Resend"
            htmlFor="resendApiKey"
            error={errors.resendApiKey}
            hint={provider === "auto" && envHasResend ? "Leeg laten = de sleutel uit de hosting gebruiken." : "Te vinden in Resend → API Keys. Begint met re_."}
          >
            <SecretField name="resendApiKey" state={{ ...values.resendApiKey, source: envHasResend ? "hosting" : null }} placeholder="re_…" invalid={!!errors.resendApiKey} />
          </Field>
        </div>
      </section>

      <section className={cn("rounded-xl border border-border bg-white", provider !== "smtp" && "hidden")}>
        <h2 className="border-b border-border px-5 py-4 text-base font-semibold sm:px-6">Eigen mailserver (SMTP)</h2>
        <div className="space-y-5 p-5 sm:p-6">
          <div>
            <p className="text-sm font-medium">Snel invullen</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {smtpPresets.map((p) => (
                <Button
                  key={p.label}
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setHost(p.host);
                    setPort(String(p.port));
                    setSecure(p.secure);
                  }}
                >
                  {p.label}
                </Button>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Controleer de gegevens altijd bij je provider; ze kunnen per pakket verschillen.</p>
          </div>
          <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_140px]">
            <Field label="Server (host)" htmlFor="smtpHost" error={errors.smtpHost} required>
              <Input id="smtpHost" name="smtpHost" value={host} onChange={(e) => setHost(e.target.value)} placeholder="smtp.office365.com" aria-invalid={!!errors.smtpHost} />
            </Field>
            <Field label="Poort" htmlFor="smtpPort" error={errors.smtpPort} required>
              <Input id="smtpPort" name="smtpPort" inputMode="numeric" value={port} onChange={(e) => setPort(e.target.value)} aria-invalid={!!errors.smtpPort} />
            </Field>
          </div>
          <label className="flex items-start gap-3 text-sm">
            <Checkbox name="smtpSecure" checked={secure} onChange={(e) => setSecure(e.target.checked)} className="mt-0.5" />
            <span>
              <span className="font-medium">Versleutelde verbinding vanaf het begin (SSL/TLS)</span>
              <span className="block text-xs text-muted-foreground">Aanvinken bij poort 465. Bij poort 587 uit laten (dan wordt STARTTLS gebruikt).</span>
            </span>
          </label>
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="Gebruikersnaam" htmlFor="smtpUser" error={errors.smtpUser} required hint="Meestal je volledige e-mailadres.">
              <Input id="smtpUser" name="smtpUser" defaultValue={values.smtpUser} autoComplete="off" aria-invalid={!!errors.smtpUser} />
            </Field>
            <Field label="Wachtwoord" htmlFor="smtpPassword" error={errors.smtpPassword} required hint="Bij Microsoft 365, Gmail en Outlook vaak een app-wachtwoord.">
              <SecretField name="smtpPassword" state={values.smtpPassword} invalid={!!errors.smtpPassword} />
            </Field>
          </div>
        </div>
      </section>

      <div className="sticky bottom-4 z-10 flex flex-col gap-3 rounded-xl border border-border bg-white/95 p-4 shadow-lg backdrop-blur sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">Geheime waarden worden versleuteld opgeslagen en nooit getoond.</p>
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : <Save />}
          E-mailinstellingen opslaan
        </Button>
      </div>
    </form>
  );
}

export function TestEmailForm({ defaultTo }: { defaultTo: string }) {
  const { onSubmit, pending, errors } = useFormAction(sendTestEmailAction);
  return (
    <form onSubmit={onSubmit} className="space-y-3" noValidate>
      <Field label="Stuur een testmail naar" htmlFor="testTo" error={errors.to}>
        <Input id="testTo" name="to" type="email" defaultValue={defaultTo} aria-invalid={!!errors.to} />
      </Field>
      <Button type="submit" variant="outline" disabled={pending} className="w-full">
        {pending ? <Loader2 className="animate-spin" /> : <Send />}
        Stuur testmail
      </Button>
      <p className="text-xs text-muted-foreground">Gebruikt de opgeslagen instellingen. Sla wijzigingen dus eerst op.</p>
    </form>
  );
}
