"use client";

import * as React from "react";
import { usePricing } from "@/components/pricing-provider";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Lock } from "lucide-react";
import { toast } from "sonner";
import { useAntiSpam } from "@/components/forms/anti-spam";
import { Button } from "@/components/ui/button";
import { Alert, Checkbox, Field, FieldError } from "@/components/ui/form-controls";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { postJson } from "@/lib/client-fetch";
import { formatPrice } from "@/lib/utils";

export type RegistrationDefaults = {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  licensePlate?: string;
};

type Props = {
  slug: string;
  /** Wat deze bezoeker betaalt (centen): 0 voor actieve leden bij gratis evenementen. */
  price: number;
  nonMemberPrice: number;
  isMember: boolean;
  isLoggedIn: boolean;
  defaults?: RegistrationDefaults;
  disabledReason?: string;
};

type RegisterResponse = { checkoutUrl?: string; redirectUrl?: string };

export function RegistrationForm({ slug, price, nonMemberPrice, isMember, isLoggedIn, defaults, disabledReason }: Props) {
  const pricing = usePricing();
  const router = useRouter();
  const spam = useAntiSpam();
  const [busy, setBusy] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [formError, setFormError] = React.useState<string | null>(null);
  const disabled = !!disabledReason || busy;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (disabled) return;
    const fd = new FormData(e.currentTarget);
    const get = (k: string) => String(fd.get(k) ?? "");

    setBusy(true);
    setErrors({});
    setFormError(null);

    const res = await postJson<RegisterResponse>(`/api/events/${slug}/register`, {
      firstName: get("firstName"),
      lastName: get("lastName"),
      email: get("email"),
      phone: get("phone"),
      licensePlate: get("licensePlate"),
      remarks: get("remarks"),
      acceptTerms: fd.get("acceptTerms") === "on",
      ...spam.values(),
    });

    if (!res.ok) {
      setErrors(res.fields ?? {});
      setFormError(res.error);
      toast.error(res.error);
      spam.reset();
      setBusy(false);
      return;
    }

    if (res.data.checkoutUrl) {
      toast.success("Je wordt doorgestuurd naar de beveiligde betaalpagina…");
      window.location.href = res.data.checkoutUrl;
      return;
    }
    toast.success("Je inschrijving is bevestigd!");
    router.push(res.data.redirectUrl ?? `/evenementen/${slug}?ingeschreven=1`);
    router.refresh();
  }

  const free = price === 0;

  return (
    <form onSubmit={onSubmit} noValidate className="relative space-y-4">
      {spam.fields}

      <div className="flex items-end justify-between gap-4 rounded-xl bg-surface p-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Jouw deelnameprijs</p>
          <p className="mt-1 font-display text-3xl font-bold text-ink">{free ? "Gratis" : formatPrice(price)}</p>
        </div>
        {isMember ? (
          <span className="rounded-full bg-primary px-3 py-1 text-xs font-bold text-white">Ledenprijs</span>
        ) : (
          <span className="text-right text-xs text-muted-foreground">
            Leden gratis
            <br />
            Niet-leden {formatPrice(nonMemberPrice)}
          </span>
        )}
      </div>

      {!isMember && !isLoggedIn && (
        <p className="text-sm text-muted-foreground">
          Ben je lid?{" "}
          <Link href={`/inloggen?callbackUrl=${encodeURIComponent(`/evenementen/${slug}`)}`} className="font-semibold text-primary underline-offset-4 hover:underline">
            Log in om gratis in te schrijven
          </Link>
          .
        </p>
      )}
      {!isMember && isLoggedIn && (
        <p className="text-sm text-muted-foreground">
          Rijd voortaan gratis mee?{" "}
          <Link href="/lid-worden" className="font-semibold text-primary underline-offset-4 hover:underline">
            Word lid voor {formatPrice(pricing.membershipPriceCents)} per jaar
          </Link>
          .
        </p>
      )}

      {disabledReason && <Alert variant="warning">{disabledReason}</Alert>}
      {formError && !disabledReason && <Alert variant="error">{formError}</Alert>}

      <fieldset disabled={disabled} className="space-y-4 disabled:opacity-60">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Voornaam" htmlFor="reg-firstName" required error={errors.firstName}>
            <Input id="reg-firstName" name="firstName" autoComplete="given-name" defaultValue={defaults?.firstName} aria-invalid={!!errors.firstName} required />
          </Field>
          <Field label="Achternaam" htmlFor="reg-lastName" required error={errors.lastName}>
            <Input id="reg-lastName" name="lastName" autoComplete="family-name" defaultValue={defaults?.lastName} aria-invalid={!!errors.lastName} required />
          </Field>
        </div>
        <Field label="E-mailadres" htmlFor="reg-email" required error={errors.email} hint="Hier sturen we je bevestiging naartoe.">
          <Input id="reg-email" name="email" type="email" autoComplete="email" defaultValue={defaults?.email} aria-invalid={!!errors.email} required />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Telefoonnummer" htmlFor="reg-phone" required error={errors.phone}>
            <Input id="reg-phone" name="phone" type="tel" autoComplete="tel" defaultValue={defaults?.phone} aria-invalid={!!errors.phone} required />
          </Field>
          <Field label="Kenteken" htmlFor="reg-licensePlate" required error={errors.licensePlate}>
            <Input
              id="reg-licensePlate"
              name="licensePlate"
              placeholder="AB-123-C"
              defaultValue={defaults?.licensePlate}
              aria-invalid={!!errors.licensePlate}
              className="font-mono uppercase tracking-wider"
              required
            />
          </Field>
        </div>
        <Field label="Opmerkingen" htmlFor="reg-remarks" error={errors.remarks} hint="Bijvoorbeeld dieetwensen, een bijrijder of je Mazda-model.">
          <Textarea id="reg-remarks" name="remarks" rows={3} maxLength={1000} aria-invalid={!!errors.remarks} />
        </Field>

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
              . Deelname is op eigen risico.
            </span>
          </label>
          <FieldError message={errors.acceptTerms} />
        </div>

        <Button type="submit" size="lg" className="w-full">
          {busy ? <Loader2 className="animate-spin" /> : !free ? <Lock /> : null}
          {busy ? "Even geduld…" : free ? "Gratis inschrijven" : `Inschrijven en betalen (${formatPrice(price)})`}
        </Button>
        {!free && (
          <p className="text-center text-xs text-muted-foreground">
            Veilig betalen met iDEAL, Bancontact, creditcard, Apple Pay, Google Pay of PayPal. Je plek wordt 30 minuten voor je vastgehouden.
          </p>
        )}
      </fieldset>
    </form>
  );
}
