"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { KeyRound, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, Field } from "@/components/ui/form-controls";
import { Input } from "@/components/ui/input";
import { postJson } from "@/lib/client-fetch";

export function ResetPasswordForm({ token, welcome = false }: { token: string; welcome?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [fields, setFields] = React.useState<Record<string, string>>({});

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setFields({});
    const form = new FormData(e.currentTarget);
    const password = String(form.get("password") ?? "");
    const confirm = String(form.get("confirm") ?? "");
    if (password !== confirm) {
      setFields({ confirm: "De wachtwoorden komen niet overeen." });
      return;
    }
    setBusy(true);
    const res = await postJson("/api/password/reset", { token, password });
    if (!res.ok) {
      setError(res.error);
      setFields(res.fields ?? {});
      setBusy(false);
      return;
    }
    router.push("/inloggen?reset=1");
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      {error && (
        <Alert variant="error">
          {error}{" "}
          <Link href="/wachtwoord-vergeten" className="font-semibold underline underline-offset-2">
            Nieuwe link aanvragen
          </Link>
        </Alert>
      )}
      <Field
        label={welcome ? "Kies een wachtwoord" : "Nieuw wachtwoord"}
        htmlFor="password"
        error={fields.password}
        hint="Minimaal 10 tekens, met minstens één letter en één cijfer."
        required
      >
        <Input id="password" name="password" type="password" autoComplete="new-password" minLength={10} aria-invalid={!!fields.password} required />
      </Field>
      <Field label={welcome ? "Herhaal je wachtwoord" : "Herhaal nieuw wachtwoord"} htmlFor="confirm" error={fields.confirm} required>
        <Input id="confirm" name="confirm" type="password" autoComplete="new-password" aria-invalid={!!fields.confirm} required />
      </Field>
      <Button type="submit" size="lg" className="w-full" disabled={busy}>
        {busy ? <Loader2 className="animate-spin" /> : <KeyRound />} {welcome ? "Wachtwoord instellen" : "Wachtwoord opslaan"}
      </Button>
    </form>
  );
}
