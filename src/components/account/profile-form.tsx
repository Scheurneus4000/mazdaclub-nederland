"use client";

import * as React from "react";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { updateProfile, type AccountActionState } from "@/app/(site)/account/actions";
import { Button } from "@/components/ui/button";
import { Alert, Checkbox, Field, NativeSelect } from "@/components/ui/form-controls";
import { Input } from "@/components/ui/input";

export type ProfileDefaults = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  street: string | null;
  houseNumber: string | null;
  postalCode: string | null;
  city: string | null;
  country: string;
  licensePlate: string | null;
  carModel: string | null;
  marketingConsent: boolean;
};

export function ProfileForm({ defaults }: { defaults: ProfileDefaults }) {
  const [state, action, pending] = React.useActionState<AccountActionState, FormData>(updateProfile, null);
  const f = state?.fields ?? {};

  React.useEffect(() => {
    if (state?.ok && state.message) toast.success(state.message);
  }, [state]);

  // Handmatig in een transition aanroepen: zo reset React de velden niet bij een validatiefout.
  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    React.startTransition(() => action(data));
  }

  return (
    <form onSubmit={onSubmit} className="space-y-8" noValidate>
      {state && !state.ok && state.error && <Alert variant="error">{state.error}</Alert>}

      <fieldset className="space-y-5">
        <legend className="mb-4 font-display text-lg font-bold uppercase tracking-tight">Persoonlijke gegevens</legend>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Voornaam" htmlFor="firstName" error={f.firstName} required>
            <Input id="firstName" name="firstName" defaultValue={defaults.firstName} autoComplete="given-name" aria-invalid={!!f.firstName} />
          </Field>
          <Field label="Achternaam" htmlFor="lastName" error={f.lastName} required>
            <Input id="lastName" name="lastName" defaultValue={defaults.lastName} autoComplete="family-name" aria-invalid={!!f.lastName} />
          </Field>
          <Field label="E-mailadres" htmlFor="email" hint="Wil je je e-mailadres wijzigen? Neem contact met ons op.">
            <Input id="email" value={defaults.email} disabled readOnly />
          </Field>
          <Field label="Telefoonnummer" htmlFor="phone" error={f.phone}>
            <Input id="phone" name="phone" type="tel" defaultValue={defaults.phone ?? ""} autoComplete="tel" aria-invalid={!!f.phone} />
          </Field>
        </div>
      </fieldset>

      <fieldset className="space-y-5">
        <legend className="mb-4 font-display text-lg font-bold uppercase tracking-tight">Adres</legend>
        <div className="grid gap-5 sm:grid-cols-[1fr_140px]">
          <Field label="Straat" htmlFor="street" error={f.street}>
            <Input id="street" name="street" defaultValue={defaults.street ?? ""} autoComplete="address-line1" />
          </Field>
          <Field label="Huisnummer" htmlFor="houseNumber" error={f.houseNumber}>
            <Input id="houseNumber" name="houseNumber" defaultValue={defaults.houseNumber ?? ""} />
          </Field>
        </div>
        <div className="grid gap-5 sm:grid-cols-[160px_1fr_160px]">
          <Field label="Postcode" htmlFor="postalCode" error={f.postalCode}>
            <Input id="postalCode" name="postalCode" defaultValue={defaults.postalCode ?? ""} autoComplete="postal-code" />
          </Field>
          <Field label="Woonplaats" htmlFor="city" error={f.city}>
            <Input id="city" name="city" defaultValue={defaults.city ?? ""} autoComplete="address-level2" />
          </Field>
          <Field label="Land" htmlFor="country" error={f.country}>
            <NativeSelect id="country" name="country" defaultValue={defaults.country === "BE" ? "BE" : "NL"}>
              <option value="NL">Nederland</option>
              <option value="BE">België</option>
            </NativeSelect>
          </Field>
        </div>
      </fieldset>

      <fieldset className="space-y-5">
        <legend className="mb-4 font-display text-lg font-bold uppercase tracking-tight">Mijn Mazda</legend>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Kenteken" htmlFor="licensePlate" error={f.licensePlate} hint="Wordt vooraf ingevuld bij inschrijvingen.">
            <Input id="licensePlate" name="licensePlate" defaultValue={defaults.licensePlate ?? ""} className="uppercase" placeholder="AB-123-C" />
          </Field>
          <Field label="Model" htmlFor="carModel" error={f.carModel}>
            <Input id="carModel" name="carModel" defaultValue={defaults.carModel ?? ""} placeholder="Bijv. MX-5 ND RF 2.0" />
          </Field>
        </div>
      </fieldset>

      <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-surface p-4 text-sm">
        <Checkbox name="marketingConsent" defaultChecked={defaults.marketingConsent} className="mt-0.5" />
        <span>
          <strong className="font-semibold">Clubnieuwsbrief ontvangen</strong>
          <span className="block text-muted-foreground">Nieuwe ritten, evenementen en webshopacties. Je kunt dit altijd weer uitzetten.</span>
        </span>
      </label>

      <Button type="submit" disabled={pending}>
        {pending ? <Loader2 className="animate-spin" /> : <Save />} Gegevens opslaan
      </Button>
    </form>
  );
}
