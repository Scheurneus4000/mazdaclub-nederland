"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { useAntiSpam } from "@/components/forms/anti-spam";
import { Button } from "@/components/ui/button";
import { Alert, Checkbox, Field, FieldError } from "@/components/ui/form-controls";
import { Input } from "@/components/ui/input";
import { postJson } from "@/lib/client-fetch";
import { safeCallbackUrl } from "./safe-callback";

export function RegisterForm({ callbackUrl }: { callbackUrl?: string }) {
  const router = useRouter();
  const spam = useAntiSpam();
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [fields, setFields] = React.useState<Record<string, string>>({});

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setFields({});
    const form = new FormData(e.currentTarget);
    const payload = {
      firstName: String(form.get("firstName") ?? ""),
      lastName: String(form.get("lastName") ?? ""),
      email: String(form.get("email") ?? ""),
      phone: String(form.get("phone") ?? ""),
      password: String(form.get("password") ?? ""),
      acceptTerms: form.get("acceptTerms") === "on",
      marketingConsent: form.get("marketingConsent") === "on",
      ...spam.values(),
    };

    setBusy(true);
    const res = await postJson<{ ok: true }>("/api/register", payload);
    if (!res.ok) {
      setError(res.error);
      setFields(res.fields ?? {});
      spam.reset();
      setBusy(false);
      return;
    }

    const login = await signIn("credentials", { email: payload.email.trim().toLowerCase(), password: payload.password, redirect: false });
    if (!login || login.error) {
      toast.success("Je account is aangemaakt. Log nu in en bevestig je e-mailadres via de link in je inbox.");
      router.push("/inloggen");
      return;
    }
    toast.success("Welkom bij MazdaClub Nederland! We hebben je een e-mail gestuurd om je e-mailadres te bevestigen.", { duration: 8000 });
    router.push(safeCallbackUrl(callbackUrl));
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="relative space-y-5" noValidate>
      {spam.fields}
      {error && <Alert variant="error">{error}</Alert>}

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Voornaam" htmlFor="firstName" error={fields.firstName} required>
          <Input id="firstName" name="firstName" autoComplete="given-name" aria-invalid={!!fields.firstName} required />
        </Field>
        <Field label="Achternaam" htmlFor="lastName" error={fields.lastName} required>
          <Input id="lastName" name="lastName" autoComplete="family-name" aria-invalid={!!fields.lastName} required />
        </Field>
      </div>

      <Field label="E-mailadres" htmlFor="email" error={fields.email} required>
        <Input id="email" name="email" type="email" autoComplete="email" inputMode="email" aria-invalid={!!fields.email} required />
      </Field>

      <Field label="Telefoonnummer" htmlFor="phone" error={fields.phone} hint="Optioneel, handig bij evenementen.">
        <Input id="phone" name="phone" type="tel" autoComplete="tel" aria-invalid={!!fields.phone} />
      </Field>

      <Field label="Wachtwoord" htmlFor="password" error={fields.password} hint="Minimaal 10 tekens, met minstens één letter en één cijfer." required>
        <Input id="password" name="password" type="password" autoComplete="new-password" minLength={10} aria-invalid={!!fields.password} required />
      </Field>

      <div className="space-y-3 rounded-xl bg-surface p-4 text-sm">
        <label className="flex cursor-pointer items-start gap-3">
          <Checkbox name="acceptTerms" className="mt-0.5" required />
          <span>
            Ik ga akkoord met de{" "}
            <Link href="/algemene-voorwaarden" target="_blank" className="font-medium text-primary underline underline-offset-2">
              algemene voorwaarden
            </Link>{" "}
            en de{" "}
            <Link href="/privacy" target="_blank" className="font-medium text-primary underline underline-offset-2">
              privacyverklaring
            </Link>
            .<span className="ml-0.5 text-primary">*</span>
          </span>
        </label>
        <FieldError message={fields.acceptTerms} />
        <label className="flex cursor-pointer items-start gap-3 text-muted-foreground">
          <Checkbox name="marketingConsent" className="mt-0.5" />
          <span>Ja, ik ontvang graag de clubnieuwsbrief met nieuwe ritten en acties (altijd af te melden).</span>
        </label>
      </div>

      <Button type="submit" size="lg" className="w-full" disabled={busy}>
        {busy ? <Loader2 className="animate-spin" /> : <UserPlus />} Account aanmaken
      </Button>
    </form>
  );
}
