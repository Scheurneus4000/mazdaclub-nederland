"use client";

import { KeyRound, Loader2 } from "lucide-react";
import { useFormAction } from "@/components/admin/use-form-action";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/form-controls";
import { Input } from "@/components/ui/input";
import { createFirstAdmin } from "./actions";

export function SetupForm({ codeRequired }: { codeRequired: boolean }) {
  const { onSubmit, pending, errors } = useFormAction(createFirstAdmin, { toastSuccess: false });

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      {codeRequired && (
        <Field label="Installatiecode" htmlFor="code" required error={errors.code} hint="Staat bij de hosting als SETUP_CODE. Vraag het aan degene die de website online heeft gezet.">
          <Input id="code" name="code" type="password" autoComplete="off" aria-invalid={!!errors.code} />
        </Field>
      )}
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Voornaam" htmlFor="firstName" required error={errors.firstName}>
          <Input id="firstName" name="firstName" autoComplete="given-name" aria-invalid={!!errors.firstName} />
        </Field>
        <Field label="Achternaam" htmlFor="lastName" required error={errors.lastName}>
          <Input id="lastName" name="lastName" autoComplete="family-name" aria-invalid={!!errors.lastName} />
        </Field>
      </div>
      <Field label="E-mailadres" htmlFor="email" required error={errors.email}>
        <Input id="email" name="email" type="email" autoComplete="email" aria-invalid={!!errors.email} />
      </Field>
      <Field label="Wachtwoord" htmlFor="password" required error={errors.password} hint="Minimaal 10 tekens, met een letter en een cijfer.">
        <Input id="password" name="password" type="password" autoComplete="new-password" aria-invalid={!!errors.password} />
      </Field>
      <Field label="Herhaal wachtwoord" htmlFor="passwordConfirm" required error={errors.passwordConfirm}>
        <Input id="passwordConfirm" name="passwordConfirm" type="password" autoComplete="new-password" aria-invalid={!!errors.passwordConfirm} />
      </Field>
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? <Loader2 className="animate-spin" /> : <KeyRound />}
        Beheerdersaccount aanmaken
      </Button>
    </form>
  );
}
