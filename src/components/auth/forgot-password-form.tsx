"use client";

import * as React from "react";
import { Loader2, MailCheck, Send } from "lucide-react";
import { useAntiSpam } from "@/components/forms/anti-spam";
import { Button } from "@/components/ui/button";
import { Alert, Field } from "@/components/ui/form-controls";
import { Input } from "@/components/ui/input";
import { postJson } from "@/lib/client-fetch";

export function ForgotPasswordForm() {
  const spam = useAntiSpam();
  const [busy, setBusy] = React.useState(false);
  const [sentTo, setSentTo] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [fieldError, setFieldError] = React.useState<string | undefined>();

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setFieldError(undefined);
    const email = String(new FormData(e.currentTarget).get("email") ?? "");
    setBusy(true);
    const res = await postJson("/api/password/forgot", { email, ...spam.values() });
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      setFieldError(res.fields?.email);
      spam.reset();
      return;
    }
    setSentTo(email);
  }

  if (sentTo) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-sm text-emerald-900">
        <MailCheck className="size-8 text-emerald-600" />
        <p className="mt-3 font-semibold">Controleer je inbox</p>
        <p className="mt-1.5 leading-relaxed">
          Als er een account bestaat voor <strong>{sentTo}</strong>, ontvang je binnen enkele minuten een e-mail met een link om je
          wachtwoord opnieuw in te stellen. De link is één uur geldig. Kijk ook even in je spammap.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="relative space-y-5" noValidate>
      {spam.fields}
      {error && <Alert variant="error">{error}</Alert>}
      <Field label="E-mailadres" htmlFor="email" error={fieldError} required>
        <Input id="email" name="email" type="email" autoComplete="email" inputMode="email" aria-invalid={!!fieldError} required />
      </Field>
      <Button type="submit" size="lg" className="w-full" disabled={busy}>
        {busy ? <Loader2 className="animate-spin" /> : <Send />} Stuur herstellink
      </Button>
    </form>
  );
}
