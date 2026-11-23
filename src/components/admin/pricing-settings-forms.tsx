"use client";

import Link from "next/link";
import { Loader2, Save } from "lucide-react";
import { saveMembershipSettings, saveShippingSettings } from "@/app/admin/actions/pricing-settings";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, NativeSelect } from "@/components/ui/form-controls";
import { Input } from "@/components/ui/input";
import { SecretField, type SecretState } from "./secret-field";
import { useFormAction } from "./use-form-action";

const euro = (cents: number | null | undefined) => (cents === null || cents === undefined ? "" : (cents / 100).toFixed(2).replace(".", ","));

function Section({ title, description, children }: { title: string; description?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-white">
      <div className="border-b border-border px-5 py-4 sm:px-6">
        <h2 className="text-base font-semibold">{title}</h2>
        {description && <div className="mt-0.5 text-sm text-muted-foreground">{description}</div>}
      </div>
      <div className="space-y-5 p-5 sm:p-6">{children}</div>
    </section>
  );
}

function SaveBar({ pending, label }: { pending: boolean; label: string }) {
  return (
    <div className="sticky bottom-4 z-10 flex items-center justify-between gap-4 rounded-xl border border-border bg-white/95 p-4 shadow-lg backdrop-blur">
      <p className="text-sm text-muted-foreground">Wijzigingen gelden direct na opslaan.</p>
      <Button type="submit" disabled={pending}>
        {pending ? <Loader2 className="animate-spin" /> : <Save />} {label}
      </Button>
    </div>
  );
}

function EuroInput({ id, name, defaultValue, invalid, placeholder }: { id: string; name: string; defaultValue: string; invalid?: boolean; placeholder?: string }) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted-foreground">€</span>
      <Input id={id} name={name} inputMode="decimal" defaultValue={defaultValue} placeholder={placeholder} className="pl-7" aria-invalid={invalid} />
    </div>
  );
}

export type MembershipSettingsValues = {
  priceCents: number;
  memberDiscountPercent: number;
  eventPriceNonMemberCents: number;
  eventPriceMemberCents: number;
  autoRenewAvailable: boolean;
  reminderDaysBefore: number;
};

export function MembershipSettingsForm({ values, activeSubscriptions }: { values: MembershipSettingsValues; activeSubscriptions: number }) {
  const { onSubmit, pending, errors } = useFormAction(saveMembershipSettings);
  return (
    <form onSubmit={onSubmit} className="space-y-6" noValidate>
      <Section title="Lidmaatschap" description="Wat een jaar lidmaatschap kost en hoe verlengen werkt.">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Prijs per jaar" htmlFor="priceCents" required error={errors.priceCents} hint="Incl. btw. Geldt voor nieuwe aanmeldingen en verlengingen.">
            <EuroInput id="priceCents" name="priceCents" defaultValue={euro(values.priceCents)} invalid={!!errors.priceCents} />
          </Field>
          <Field
            label="Herinneringsmail vóór het einde (dagen)"
            htmlFor="reminderDaysBefore"
            error={errors.reminderDaysBefore}
            hint="Voor leden zonder automatische verlenging. 0 = geen herinnering."
          >
            <Input id="reminderDaysBefore" name="reminderDaysBefore" inputMode="numeric" defaultValue={values.reminderDaysBefore} aria-invalid={!!errors.reminderDaysBefore} />
          </Field>
        </div>
        <label className="flex items-start gap-3 rounded-lg border border-border p-4">
          <Checkbox name="autoRenewAvailable" defaultChecked={values.autoRenewAvailable} className="mt-0.5" />
          <span>
            <span className="block text-sm font-medium">Automatische jaarlijkse verlenging aanbieden</span>
            <span className="block text-xs text-muted-foreground">
              Leden kunnen kiezen voor een automatische incasso via Mollie (niet beschikbaar met Stripe). Ze kunnen dit zelf altijd uitzetten.
            </span>
          </span>
        </label>
        {activeSubscriptions > 0 && (
          <p className="rounded-md bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-900">
            Let op: {activeSubscriptions} lid{activeSubscriptions === 1 ? "" : "en"} heeft al een automatische verlenging. Die houden het bedrag waarmee ze
            zijn gestart; een nieuwe prijs geldt voor nieuwe aanmeldingen en handmatige verlengingen.
          </p>
        )}
      </Section>

      <Section title="Ledenvoordelen" description="De korting wordt automatisch toegepast voor ingelogde leden met een actief lidmaatschap.">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Ledenkorting in de webshop (%)" htmlFor="memberDiscountPercent" required error={errors.memberDiscountPercent} hint="Bijv. 25. Gebruik 0 voor geen korting.">
            <div className="relative">
              <Input
                id="memberDiscountPercent"
                name="memberDiscountPercent"
                inputMode="numeric"
                defaultValue={values.memberDiscountPercent}
                className="pr-8"
                aria-invalid={!!errors.memberDiscountPercent}
              />
              <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-muted-foreground">%</span>
            </div>
          </Field>
        </div>
      </Section>

      <Section
        title="Standaardprijzen evenementen"
        description="Worden ingevuld bij een nieuw evenement. Per evenement kun je de prijs nog aanpassen; bestaande evenementen veranderen niet."
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Niet-leden" htmlFor="eventPriceNonMemberCents" required error={errors.eventPriceNonMemberCents}>
            <EuroInput id="eventPriceNonMemberCents" name="eventPriceNonMemberCents" defaultValue={euro(values.eventPriceNonMemberCents)} invalid={!!errors.eventPriceNonMemberCents} />
          </Field>
          <Field label="Leden" htmlFor="eventPriceMemberCents" error={errors.eventPriceMemberCents} hint="0 = gratis voor leden.">
            <EuroInput id="eventPriceMemberCents" name="eventPriceMemberCents" defaultValue={euro(values.eventPriceMemberCents)} invalid={!!errors.eventPriceMemberCents} />
          </Field>
        </div>
      </Section>

      <SaveBar pending={pending} label="Prijzen opslaan" />
    </form>
  );
}

type MethodValues = { enabled: boolean; label: string; description: string; costCents: number; freeFromCents: number | null };

export type ShippingSettingsValues = {
  sender: { name: string; contactPerson: string; street: string; houseNumber: string; postalCode: string; city: string; country: string; phone: string; email: string };
  methods: Record<"POSTNL_NL" | "POSTNL_BE" | "PICKUP_EVENT", MethodValues>;
  processingTime: string;
  carrier: { provider: "none" | "sendcloud" | "myparcel"; apiKey: SecretState; apiSecret: SecretState };
};

const methodTitles = { POSTNL_NL: "Verzenden binnen Nederland", POSTNL_BE: "Verzenden naar België", PICKUP_EVENT: "Ophalen bij een clubevenement" } as const;

export function ShippingSettingsForm({ values, toShipCount }: { values: ShippingSettingsValues; toShipCount: number }) {
  const { onSubmit, pending, errors } = useFormAction(saveShippingSettings);
  const s = values.sender;
  return (
    <form onSubmit={onSubmit} className="space-y-6" noValidate>
      <Section title="Afzendgegevens" description="Staan op de pakbon en worden later gebruikt voor verzendlabels.">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Naam afzender" htmlFor="sender.name">
            <Input id="sender.name" name="sender.name" defaultValue={s.name} />
          </Field>
          <Field label="Contactpersoon" htmlFor="sender.contactPerson">
            <Input id="sender.contactPerson" name="sender.contactPerson" defaultValue={s.contactPerson} />
          </Field>
          <div className="grid grid-cols-[1fr_110px] gap-3 sm:col-span-2 md:col-span-1">
            <Field label="Straat" htmlFor="sender.street">
              <Input id="sender.street" name="sender.street" autoComplete="address-line1" defaultValue={s.street} />
            </Field>
            <Field label="Huisnr." htmlFor="sender.houseNumber">
              <Input id="sender.houseNumber" name="sender.houseNumber" defaultValue={s.houseNumber} />
            </Field>
          </div>
          <div className="grid grid-cols-[130px_1fr] gap-3 sm:col-span-2 md:col-span-1">
            <Field label="Postcode" htmlFor="sender.postalCode">
              <Input id="sender.postalCode" name="sender.postalCode" autoComplete="postal-code" defaultValue={s.postalCode} />
            </Field>
            <Field label="Plaats" htmlFor="sender.city">
              <Input id="sender.city" name="sender.city" defaultValue={s.city} />
            </Field>
          </div>
          <Field label="Land" htmlFor="sender.country" error={errors["sender.country"]}>
            <NativeSelect id="sender.country" name="sender.country" defaultValue={s.country}>
              <option value="NL">Nederland</option>
              <option value="BE">België</option>
              <option value="DE">Duitsland</option>
            </NativeSelect>
          </Field>
          <Field label="Telefoon" htmlFor="sender.phone">
            <Input id="sender.phone" name="sender.phone" type="tel" defaultValue={s.phone} />
          </Field>
          <Field label="E-mailadres" htmlFor="sender.email" error={errors["sender.email"]}>
            <Input id="sender.email" name="sender.email" type="email" defaultValue={s.email} aria-invalid={!!errors["sender.email"]} />
          </Field>
        </div>
      </Section>

      <Section title="Verzendmethoden en kosten" description="Wat klanten kunnen kiezen bij het afrekenen. Bedragen zijn inclusief btw.">
        {(Object.keys(methodTitles) as Array<keyof typeof methodTitles>).map((key) => {
          const m = values.methods[key];
          const pickup = key === "PICKUP_EVENT";
          return (
            <fieldset key={key} className="rounded-lg border border-border p-4">
              <legend className="px-1 text-sm font-semibold">{methodTitles[key]}</legend>
              <label className="mb-4 flex items-center gap-2.5 text-sm">
                <Checkbox name={`${key}.enabled`} defaultChecked={m.enabled} /> Beschikbaar in de webshop
              </label>
              {errors[`${key}.enabled`] && <p className="mb-3 text-xs font-medium text-destructive">{errors[`${key}.enabled`]}</p>}
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Naam" htmlFor={`${key}.label`} required error={errors[`${key}.label`]}>
                  <Input id={`${key}.label`} name={`${key}.label`} defaultValue={m.label} aria-invalid={!!errors[`${key}.label`]} />
                </Field>
                <Field label="Omschrijving" htmlFor={`${key}.description`} hint="Bijv. de levertijd.">
                  <Input id={`${key}.description`} name={`${key}.description`} defaultValue={m.description} />
                </Field>
                {!pickup && (
                  <>
                    <Field label="Verzendkosten" htmlFor={`${key}.costCents`} required error={errors[`${key}.costCents`]}>
                      <EuroInput id={`${key}.costCents`} name={`${key}.costCents`} defaultValue={euro(m.costCents)} invalid={!!errors[`${key}.costCents`]} />
                    </Field>
                    <Field label="Gratis vanaf" htmlFor={`${key}.freeFromCents`} error={errors[`${key}.freeFromCents`]} hint="Leeg = nooit gratis. Berekend ná ledenkorting.">
                      <EuroInput id={`${key}.freeFromCents`} name={`${key}.freeFromCents`} defaultValue={euro(m.freeFromCents)} placeholder="Nooit gratis" invalid={!!errors[`${key}.freeFromCents`]} />
                    </Field>
                  </>
                )}
              </div>
            </fieldset>
          );
        })}
        <Field label="Verwerkingstijd (getoond op de verzendpagina)" htmlFor="processingTime">
          <Input id="processingTime" name="processingTime" defaultValue={values.processingTime} maxLength={160} />
        </Field>
      </Section>

      <Section
        title="Koppeling met een verzendplatform"
        description={
          <>
            Voorbereid voor Sendcloud of MyParcel (verzendlabels en track &amp; trace). Tot de koppeling actief is, exporteer je de te verzenden
            bestellingen als{" "}
            <Link href="/api/admin/export/shipments?format=csv" className="font-medium text-primary hover:underline">
              verzendlijst (CSV{toShipCount ? `, ${toShipCount} bestelling${toShipCount === 1 ? "" : "en"}` : ""})
            </Link>{" "}
            en importeer je die in het platform.
          </>
        }
      >
        <Field label="Verzendplatform" htmlFor="carrier.provider" error={errors["carrier.provider"]}>
          <NativeSelect id="carrier.provider" name="carrier.provider" defaultValue={values.carrier.provider}>
            <option value="none">Geen (zelf verzenden of CSV-import)</option>
            <option value="sendcloud">Sendcloud</option>
            <option value="myparcel">MyParcel</option>
          </NativeSelect>
        </Field>
        <div className="grid gap-5 md:grid-cols-2">
          <Field label="API-sleutel (public key)" htmlFor="carrier.apiKey">
            <SecretField name="carrier.apiKey" state={values.carrier.apiKey} placeholder="Uit het dashboard van het verzendplatform" />
          </Field>
          <Field label="API-geheim (secret key)" htmlFor="carrier.apiSecret" hint="Alleen bij Sendcloud nodig.">
            <SecretField name="carrier.apiSecret" state={values.carrier.apiSecret} />
          </Field>
        </div>
        <p className="text-xs text-muted-foreground">Sleutels worden versleuteld opgeslagen en nooit getoond. Laat een veld leeg om de huidige waarde te behouden.</p>
      </Section>

      <SaveBar pending={pending} label="Verzending opslaan" />
    </form>
  );
}
