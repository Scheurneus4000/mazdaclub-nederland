"use client";

import * as React from "react";
import { KeyRound, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { changePassword, type AccountActionState } from "@/app/(site)/account/actions";
import { Button } from "@/components/ui/button";
import { Alert, Field } from "@/components/ui/form-controls";
import { Input } from "@/components/ui/input";

export function PasswordForm() {
  const formRef = React.useRef<HTMLFormElement>(null);
  const [state, action, pending] = React.useActionState<AccountActionState, FormData>(changePassword, null);
  const f = state?.fields ?? {};

  React.useEffect(() => {
    if (state?.ok) {
      toast.success(state.message ?? "Je wachtwoord is gewijzigd.");
      formRef.current?.reset();
    }
  }, [state]);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    React.startTransition(() => action(data));
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} className="space-y-5" noValidate>
      {state && !state.ok && state.error && <Alert variant="error">{state.error}</Alert>}
      <Field label="Huidig wachtwoord" htmlFor="currentPassword" error={f.currentPassword} required>
        <Input id="currentPassword" name="currentPassword" type="password" autoComplete="current-password" aria-invalid={!!f.currentPassword} />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Nieuw wachtwoord" htmlFor="newPassword" error={f.newPassword} hint="Minimaal 10 tekens, met een letter en een cijfer." required>
          <Input id="newPassword" name="newPassword" type="password" autoComplete="new-password" aria-invalid={!!f.newPassword} />
        </Field>
        <Field label="Herhaal nieuw wachtwoord" htmlFor="confirmPassword" error={f.confirmPassword} required>
          <Input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" aria-invalid={!!f.confirmPassword} />
        </Field>
      </div>
      <Button type="submit" variant="dark" disabled={pending}>
        {pending ? <Loader2 className="animate-spin" /> : <KeyRound />} Wachtwoord wijzigen
      </Button>
    </form>
  );
}
