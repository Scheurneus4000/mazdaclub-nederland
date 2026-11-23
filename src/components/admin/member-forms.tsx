"use client";

import * as React from "react";
import { BadgeCheck, Loader2, Save, UserPlus } from "lucide-react";
import type { MembershipStatus, User } from "@prisma/client";
import { activatePaidMembership, createMember, setMembershipStatus, updateMemberProfile } from "@/app/admin/actions/members";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, NativeSelect } from "@/components/ui/form-controls";
import { Input } from "@/components/ui/input";
import { useFormAction } from "./use-form-action";

type MemberDetails = Pick<
  User,
  "firstName" | "lastName" | "email" | "phone" | "street" | "houseNumber" | "postalCode" | "city" | "country" | "licensePlate" | "carModel" | "marketingConsent"
>;

/** Gedeelde velden voor persoonsgegevens (toevoegen en bewerken). */
function MemberDetailsFields({ user, errors, prefix }: { user?: Partial<MemberDetails>; errors: Record<string, string>; prefix: string }) {
  const id = (name: string) => `${prefix}-${name}`;
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Voornaam" htmlFor={id("firstName")} required error={errors.firstName}>
          <Input id={id("firstName")} name="firstName" defaultValue={user?.firstName ?? ""} autoComplete="off" aria-invalid={!!errors.firstName} />
        </Field>
        <Field label="Achternaam" htmlFor={id("lastName")} required error={errors.lastName}>
          <Input id={id("lastName")} name="lastName" defaultValue={user?.lastName ?? ""} autoComplete="off" aria-invalid={!!errors.lastName} />
        </Field>
        <Field label="E-mailadres" htmlFor={id("email")} required error={errors.email} hint="Hiermee logt het lid in en ontvangt het bevestigingen.">
          <Input id={id("email")} name="email" type="email" defaultValue={user?.email ?? ""} autoComplete="off" aria-invalid={!!errors.email} />
        </Field>
        <Field label="Telefoon" htmlFor={id("phone")} error={errors.phone}>
          <Input id={id("phone")} name="phone" type="tel" defaultValue={user?.phone ?? ""} autoComplete="off" aria-invalid={!!errors.phone} />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_120px]">
        <Field label="Straat" htmlFor={id("street")} error={errors.street}>
          <Input id={id("street")} name="street" defaultValue={user?.street ?? ""} autoComplete="off" />
        </Field>
        <Field label="Huisnummer" htmlFor={id("houseNumber")} error={errors.houseNumber}>
          <Input id={id("houseNumber")} name="houseNumber" defaultValue={user?.houseNumber ?? ""} autoComplete="off" />
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-[140px_minmax(0,1fr)_140px]">
        <Field label="Postcode" htmlFor={id("postalCode")} error={errors.postalCode}>
          <Input id={id("postalCode")} name="postalCode" defaultValue={user?.postalCode ?? ""} autoComplete="off" />
        </Field>
        <Field label="Plaats" htmlFor={id("city")} error={errors.city}>
          <Input id={id("city")} name="city" defaultValue={user?.city ?? ""} autoComplete="off" />
        </Field>
        <Field label="Land" htmlFor={id("country")} error={errors.country}>
          <NativeSelect id={id("country")} name="country" defaultValue={user?.country ?? "NL"}>
            <option value="NL">Nederland</option>
            <option value="BE">België</option>
          </NativeSelect>
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Kenteken" htmlFor={id("licensePlate")} error={errors.licensePlate}>
          <Input id={id("licensePlate")} name="licensePlate" defaultValue={user?.licensePlate ?? ""} placeholder="Bijv. 12-ABC-3" autoComplete="off" className="uppercase" />
        </Field>
        <Field label="Auto (merk/model)" htmlFor={id("carModel")} error={errors.carModel}>
          <Input id={id("carModel")} name="carModel" defaultValue={user?.carModel ?? ""} placeholder="Bijv. Mazda MX-5 NB" autoComplete="off" />
        </Field>
      </div>

      <label className="flex cursor-pointer items-start gap-3 text-sm">
        <Checkbox name="marketingConsent" defaultChecked={user?.marketingConsent ?? false} className="mt-0.5" />
        <span>
          <span className="font-medium">Wil de clubnieuwsbrief ontvangen</span>
          <span className="block text-xs text-muted-foreground">Alleen aanvinken als het lid hier zelf toestemming voor heeft gegeven (AVG).</span>
        </span>
      </label>
    </div>
  );
}

/** Nieuw lid toevoegen (bijv. contant of per overboeking betaald). */
export function MemberCreateForm({ defaultStart, defaultEnd }: { defaultStart: string; defaultEnd: string }) {
  const { onSubmit, pending, errors } = useFormAction(createMember);
  const [withMembership, setWithMembership] = React.useState(true);

  return (
    <form onSubmit={onSubmit} className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]" noValidate>
      <section className="rounded-xl border border-border bg-white p-5 shadow-xs sm:p-6">
        <h2 className="mb-1 text-base font-semibold">Persoonsgegevens</h2>
        <p className="mb-5 text-sm text-muted-foreground">Alleen naam en e-mailadres zijn verplicht. De rest kan het lid later ook zelf aanvullen.</p>
        <MemberDetailsFields errors={errors} prefix="new" />
      </section>

      <div className="space-y-6">
        <section className="space-y-4 rounded-xl border border-border bg-white p-5 shadow-xs sm:p-6">
          <h2 className="text-base font-semibold">Lidmaatschap</h2>
          <label className="flex cursor-pointer items-start gap-3 text-sm">
            <Checkbox name="createMembership" checked={withMembership} onChange={(e) => setWithMembership(e.target.checked)} className="mt-0.5" />
            <span>
              <span className="font-medium">Direct een actief lidmaatschap aanmaken</span>
              <span className="block text-xs text-muted-foreground">Bijvoorbeeld als de contributie contant of per overboeking is betaald. Er wordt niets automatisch afgeschreven.</span>
            </span>
          </label>
          {withMembership && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Startdatum" htmlFor="periodStart" error={errors.periodStart}>
                <Input id="periodStart" name="periodStart" type="date" defaultValue={defaultStart} aria-invalid={!!errors.periodStart} />
              </Field>
              <Field label="Geldig tot" htmlFor="periodEnd" error={errors.periodEnd}>
                <Input id="periodEnd" name="periodEnd" type="date" defaultValue={defaultEnd} aria-invalid={!!errors.periodEnd} />
              </Field>
            </div>
          )}
        </section>

        <section className="space-y-4 rounded-xl border border-border bg-white p-5 shadow-xs sm:p-6">
          <h2 className="text-base font-semibold">Account</h2>
          <label className="flex cursor-pointer items-start gap-3 text-sm">
            <Checkbox name="sendInvite" defaultChecked className="mt-0.5" />
            <span>
              <span className="font-medium">Uitnodiging per e-mail sturen</span>
              <span className="block text-xs text-muted-foreground">
                Het lid krijgt een link (7 dagen geldig) om zelf een wachtwoord te kiezen. Zonder uitnodiging kan het lid later via &quot;Wachtwoord vergeten&quot;
                inloggen.
              </span>
            </span>
          </label>
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? <Loader2 className="animate-spin" /> : <UserPlus />}
            Lid toevoegen
          </Button>
        </section>
      </div>
    </form>
  );
}

/** Persoonsgegevens van een bestaand lid bewerken. */
export function MemberProfileForm({ userId, user }: { userId: string; user: MemberDetails }) {
  const { onSubmit, pending, errors } = useFormAction(updateMemberProfile);
  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <input type="hidden" name="userId" value={userId} />
      <MemberDetailsFields user={user} errors={errors} prefix="edit" />
      <Button type="submit" disabled={pending}>
        {pending ? <Loader2 className="animate-spin" /> : <Save />}
        Gegevens opslaan
      </Button>
    </form>
  );
}

/**
 * Betaald lid maken of verlengen zonder online betaling (contant, overboeking of gratis/erelid).
 * De periode sluit aan op een nog lopend lidmaatschap.
 */
export function ManualMembershipForm({
  userId,
  defaultAmount,
  currentEnd,
  isRenewal,
}: {
  userId: string;
  /** Bijv. "50,00" */
  defaultAmount: string;
  /** Huidige einddatum als het lidmaatschap nog loopt (geformatteerd). */
  currentEnd: string | null;
  isRenewal: boolean;
}) {
  const { onSubmit, pending, errors } = useFormAction(activatePaidMembership);
  const [method, setMethod] = React.useState<"transfer" | "cash" | "free">("transfer");

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <input type="hidden" name="userId" value={userId} />
      <p className="text-sm text-muted-foreground">
        Voor contributie die buiten de website om is betaald.{" "}
        {currentEnd ? `De nieuwe periode sluit aan op de huidige einddatum (${currentEnd}).` : "De periode start vandaag."}
      </p>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Periode" htmlFor="mm-years" error={errors.years}>
          <NativeSelect id="mm-years" name="years" defaultValue="1" className="h-10">
            <option value="1">1 jaar</option>
            <option value="2">2 jaar</option>
            <option value="3">3 jaar</option>
          </NativeSelect>
        </Field>
        <Field label="Betaalwijze" htmlFor="mm-method" error={errors.method}>
          <NativeSelect id="mm-method" name="method" value={method} onChange={(e) => setMethod(e.target.value as typeof method)} className="h-10">
            <option value="transfer">Overboeking</option>
            <option value="cash">Contant</option>
            <option value="free">Gratis / erelid</option>
          </NativeSelect>
        </Field>
      </div>
      {method !== "free" && (
        <Field label="Ontvangen bedrag (€)" htmlFor="mm-amount" error={errors.amount} hint="Wordt geregistreerd als handmatige betaling (telt mee in de omzet).">
          <Input id="mm-amount" name="amount" inputMode="decimal" defaultValue={defaultAmount} className="h-10" aria-invalid={!!errors.amount} />
        </Field>
      )}
      <Field label="Notitie (optioneel)" htmlFor="mm-note" error={errors.note}>
        <Input id="mm-note" name="note" maxLength={200} placeholder="Bijv. betaald op de Nieuwjaarsrit" className="h-10" />
      </Field>
      <label className="flex cursor-pointer items-start gap-3 text-sm">
        <Checkbox name="sendConfirmation" defaultChecked className="mt-0.5" />
        <span>Bevestigingsmail naar het lid sturen</span>
      </label>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? <Loader2 className="animate-spin" /> : <BadgeCheck />}
        {isRenewal ? "Lidmaatschap verlengen" : "Betaald lid maken"}
      </Button>
    </form>
  );
}

const options: Array<{ value: MembershipStatus; label: string }> = [
  { value: "ACTIVE", label: "Actief" },
  { value: "PENDING", label: "In afwachting" },
  { value: "EXPIRED", label: "Verlopen" },
  { value: "CANCELLED", label: "Opgezegd" },
];

export function MembershipStatusForm({ userId, status }: { userId: string; status: MembershipStatus }) {
  const { onSubmit, pending } = useFormAction(setMembershipStatus);
  return (
    <form
      onSubmit={(e) => {
        const next = new FormData(e.currentTarget).get("status");
        if (next === "CANCELLED" && !window.confirm("Lidmaatschap opzeggen? Een automatische verlenging via Mollie wordt ook stopgezet.")) {
          e.preventDefault();
          return;
        }
        onSubmit(e);
      }}
      className="flex gap-2"
    >
      <input type="hidden" name="userId" value={userId} />
      <div className="flex-1">
        <NativeSelect name="status" defaultValue={status} aria-label="Status lidmaatschap" className="h-9">
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </NativeSelect>
      </div>
      <Button type="submit" variant="outline" size="sm" className="h-9" disabled={pending}>
        {pending && <Loader2 className="animate-spin" />}
        Wijzigen
      </Button>
    </form>
  );
}
