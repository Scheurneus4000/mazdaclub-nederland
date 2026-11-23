"use client";

import * as React from "react";
import Link from "next/link";
import { Loader2, Lock } from "lucide-react";
import { toast } from "sonner";
import { useAntiSpam } from "@/components/forms/anti-spam";
import { Button } from "@/components/ui/button";
import { Alert, Checkbox, Field, FieldError, NativeSelect } from "@/components/ui/form-controls";
import { Input } from "@/components/ui/input";
import { postJson } from "@/lib/client-fetch";

type Mode = "guest" | "join" | "renew";

type Props = {
  mode: Mode;
  /** Alleen bij Mollie kan het lidmaatschap automatisch jaarlijks worden verlengd. */
  supportsRecurring: boolean;
  priceLabel: string;
};

const ACCOUNT_FIELDS = [
  "firstName",
  "lastName",
  "email",
  "phone",
  "password",
  "street",
  "houseNumber",
  "postalCode",
  "city",
  "country",
  "licensePlate",
  "carModel",
] as const;

export function MembershipForm({ mode, supportsRecurring, priceLabel }: Props) {
  const spam = useAntiSpam();
  const [busy, setBusy] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [formError, setFormError] = React.useState<string | null>(null);
  const [emailExists, setEmailExists] = React.useState(false);

  const err = (name: string) => errors[`account.${name}`];

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);

    let account: Record<string, unknown> | undefined;
    if (mode === "guest") {
      // Lege optionele velden weglaten, zodat de validatie ze als "niet ingevuld" ziet.
      account = Object.fromEntries(
        ACCOUNT_FIELDS.map((k) => [k, String(fd.get(k) ?? "").trim()] as const).filter(([, v]) => v !== ""),
      );
      account.marketingConsent = fd.get("marketingConsent") === "on";
    }

    setBusy(true);
    setErrors({});
    setFormError(null);
    setEmailExists(false);

    const res = await postJson<{ checkoutUrl: string }>("/api/membership/checkout", {
      autoRenew: supportsRecurring ? fd.get("autoRenew") === "on" : false,
      acceptTerms: fd.get("acceptTerms") === "on",
      account,
      ...spam.values(),
    });

    if (!res.ok) {
      setErrors(res.fields ?? {});
      if (res.status === 409 && res.fields?.["account.email"]) setEmailExists(true);
      setFormError(res.error);
      toast.error(res.error);
      spam.reset();
      setBusy(false);
      return;
    }

    toast.success("Je wordt doorgestuurd naar de beveiligde betaalpagina…");
    window.location.href = res.data.checkoutUrl;
  }

  return (
    <form onSubmit={onSubmit} noValidate className="relative space-y-5">
      {spam.fields}

      {emailExists ? (
        <Alert variant="warning">
          Er bestaat al een account met dit e-mailadres.{" "}
          <Link href="/inloggen?callbackUrl=/lid-worden" className="font-semibold underline underline-offset-2">
            Log in
          </Link>{" "}
          om lid te worden, of{" "}
          <Link href="/wachtwoord-vergeten" className="font-semibold underline underline-offset-2">
            stel een nieuw wachtwoord in
          </Link>
          .
        </Alert>
      ) : (
        formError && <Alert variant="error">{formError}</Alert>
      )}

      <fieldset disabled={busy} className="space-y-5">
        {mode === "guest" && (
          <>
            <div>
              <p className="mb-3 text-sm font-semibold">Je gegevens</p>
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Voornaam" htmlFor="m-firstName" required error={err("firstName")}>
                    <Input id="m-firstName" name="firstName" autoComplete="given-name" aria-invalid={!!err("firstName")} required />
                  </Field>
                  <Field label="Achternaam" htmlFor="m-lastName" required error={err("lastName")}>
                    <Input id="m-lastName" name="lastName" autoComplete="family-name" aria-invalid={!!err("lastName")} required />
                  </Field>
                </div>
                <Field label="E-mailadres" htmlFor="m-email" required error={err("email")}>
                  <Input id="m-email" name="email" type="email" autoComplete="email" aria-invalid={!!err("email")} required />
                </Field>
                <Field label="Telefoonnummer" htmlFor="m-phone" error={err("phone")}>
                  <Input id="m-phone" name="phone" type="tel" autoComplete="tel" aria-invalid={!!err("phone")} />
                </Field>
                <Field
                  label="Wachtwoord"
                  htmlFor="m-password"
                  required
                  error={err("password")}
                  hint="Minimaal 10 tekens, met minstens één letter en één cijfer."
                >
                  <Input id="m-password" name="password" type="password" autoComplete="new-password" aria-invalid={!!err("password")} required />
                </Field>
              </div>
            </div>

            <div>
              <p className="mb-3 text-sm font-semibold">
                Adres <span className="font-normal text-muted-foreground">(optioneel, handig voor de ledenpas en bestellingen)</span>
              </p>
              <div className="space-y-4">
                <div className="grid grid-cols-[1fr_110px] gap-4">
                  <Field label="Straat" htmlFor="m-street" error={err("street")}>
                    <Input id="m-street" name="street" autoComplete="address-line1" aria-invalid={!!err("street")} />
                  </Field>
                  <Field label="Huisnr." htmlFor="m-houseNumber" error={err("houseNumber")}>
                    <Input id="m-houseNumber" name="houseNumber" aria-invalid={!!err("houseNumber")} />
                  </Field>
                </div>
                <div className="grid grid-cols-[130px_1fr] gap-4">
                  <Field label="Postcode" htmlFor="m-postalCode" error={err("postalCode")}>
                    <Input id="m-postalCode" name="postalCode" autoComplete="postal-code" aria-invalid={!!err("postalCode")} className="uppercase" />
                  </Field>
                  <Field label="Plaats" htmlFor="m-city" error={err("city")}>
                    <Input id="m-city" name="city" autoComplete="address-level2" aria-invalid={!!err("city")} />
                  </Field>
                </div>
                <Field label="Land" htmlFor="m-country" error={err("country")}>
                  <NativeSelect id="m-country" name="country" defaultValue="NL">
                    <option value="NL">Nederland</option>
                    <option value="BE">België</option>
                  </NativeSelect>
                </Field>
              </div>
            </div>

            <div>
              <p className="mb-3 text-sm font-semibold">
                Je Mazda <span className="font-normal text-muted-foreground">(optioneel)</span>
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Kenteken" htmlFor="m-licensePlate" error={err("licensePlate")}>
                  <Input id="m-licensePlate" name="licensePlate" placeholder="AB-123-C" className="font-mono uppercase tracking-wider" aria-invalid={!!err("licensePlate")} />
                </Field>
                <Field label="Model" htmlFor="m-carModel" error={err("carModel")}>
                  <Input id="m-carModel" name="carModel" placeholder="Bijv. MX-5 ND" aria-invalid={!!err("carModel")} />
                </Field>
              </div>
            </div>

            <label className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed">
              <Checkbox name="marketingConsent" className="mt-0.5" />
              <span>Houd me op de hoogte van clubnieuws en nieuwe evenementen (je kunt je altijd afmelden).</span>
            </label>
          </>
        )}

        {supportsRecurring && (
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-surface p-4 text-sm leading-relaxed has-[:checked]:border-primary/40 has-[:checked]:bg-accent/50">
            <Checkbox name="autoRenew" defaultChecked className="mt-0.5" />
            <span>
              <strong className="font-semibold">Verleng mijn lidmaatschap automatisch</strong>
              <span className="block text-muted-foreground">
                Elk jaar {priceLabel} via automatische incasso. Op elk moment uit te zetten in Mijn Account.
              </span>
            </span>
          </label>
        )}

        <div>
          <label className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed">
            <Checkbox name="acceptTerms" className="mt-0.5" aria-invalid={!!errors.acceptTerms} />
            <span>
              Ik ga akkoord met de{" "}
              <Link href="/algemene-voorwaarden" target="_blank" className="font-medium text-primary underline underline-offset-2">
                algemene voorwaarden
              </Link>{" "}
              en de{" "}
              <Link href="/privacy" target="_blank" className="font-medium text-primary underline underline-offset-2">
                privacyverklaring
              </Link>
              .
            </span>
          </label>
          <FieldError message={errors.acceptTerms} />
        </div>

        <Button type="submit" size="lg" className="w-full">
          {busy ? <Loader2 className="animate-spin" /> : <Lock />}
          {busy ? "Even geduld…" : mode === "renew" ? `Verleng met een jaar – ${priceLabel}` : `Word lid – ${priceLabel} per jaar`}
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          Veilig betalen met iDEAL, Bancontact, creditcard, Apple Pay, Google Pay of PayPal. Je voordelen gaan direct na betaling in.
        </p>
        {mode === "guest" && (
          <p className="text-center text-sm text-muted-foreground">
            Heb je al een account?{" "}
            <Link href="/inloggen?callbackUrl=/lid-worden" className="font-semibold text-primary hover:underline">
              Log in
            </Link>
          </p>
        )}
      </fieldset>
    </form>
  );
}
