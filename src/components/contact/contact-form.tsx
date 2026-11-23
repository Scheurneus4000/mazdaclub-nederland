"use client";

import * as React from "react";
import { CheckCircle2, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { useAntiSpam } from "@/components/forms/anti-spam";
import { Button } from "@/components/ui/button";
import { Alert, Field, NativeSelect } from "@/components/ui/form-controls";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { postJson } from "@/lib/client-fetch";

const subjects = ["Algemene vraag", "Lidmaatschap", "Evenementen", "Bestelling of webshop", "Samenwerking of partnerschap", "Privacy (AVG)", "Anders"];

export function ContactForm({ defaults }: { defaults?: { name?: string; email?: string } }) {
  const spam = useAntiSpam();
  const [busy, setBusy] = React.useState(false);
  const [sent, setSent] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [formError, setFormError] = React.useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const get = (k: string) => String(fd.get(k) ?? "");

    setBusy(true);
    setErrors({});
    setFormError(null);
    const res = await postJson<{ ok: true }>("/api/contact", {
      name: get("name"),
      email: get("email"),
      subject: get("subject"),
      message: get("message"),
      ...spam.values(),
    });
    setBusy(false);

    if (!res.ok) {
      setErrors(res.fields ?? {});
      setFormError(res.error);
      toast.error(res.error);
      spam.reset();
      return;
    }
    form.reset();
    setSent(true);
    toast.success("Bedankt! We hebben je bericht ontvangen.");
  }

  if (sent) {
    return (
      <div className="flex flex-col items-center py-10 text-center">
        <span className="flex size-16 items-center justify-center rounded-full bg-emerald-50">
          <CheckCircle2 className="size-9 text-emerald-600" />
        </span>
        <h3 className="mt-5 text-xl font-semibold">Bericht verzonden</h3>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          Bedankt voor je bericht. We reageren meestal binnen twee werkdagen per e-mail.
        </p>
        <Button variant="outline" className="mt-6" onClick={() => setSent(false)}>
          Nog een bericht sturen
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="relative space-y-4">
      {spam.fields}
      {formError && <Alert variant="error">{formError}</Alert>}
      <fieldset disabled={busy} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Naam" htmlFor="c-name" required error={errors.name}>
            <Input id="c-name" name="name" autoComplete="name" defaultValue={defaults?.name} aria-invalid={!!errors.name} required />
          </Field>
          <Field label="E-mailadres" htmlFor="c-email" required error={errors.email}>
            <Input id="c-email" name="email" type="email" autoComplete="email" defaultValue={defaults?.email} aria-invalid={!!errors.email} required />
          </Field>
        </div>
        <Field label="Onderwerp" htmlFor="c-subject" required error={errors.subject}>
          <NativeSelect id="c-subject" name="subject" defaultValue={subjects[0]} aria-invalid={!!errors.subject}>
            {subjects.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Bericht" htmlFor="c-message" required error={errors.message}>
          <Textarea id="c-message" name="message" rows={6} maxLength={5000} aria-invalid={!!errors.message} required />
        </Field>
        <p className="text-xs text-muted-foreground">
          We gebruiken je gegevens alleen om je vraag te beantwoorden. Zie onze privacyverklaring.
        </p>
        <Button type="submit" size="lg" className="w-full sm:w-auto">
          {busy ? <Loader2 className="animate-spin" /> : <Send />}
          {busy ? "Versturen…" : "Verstuur bericht"}
        </Button>
      </fieldset>
    </form>
  );
}
