"use client";

import * as React from "react";
import { Loader2, Save } from "lucide-react";
import type { Event } from "@prisma/client";
import { saveEvent } from "@/app/admin/actions/events";
import { Button } from "@/components/ui/button";
import { Field, NativeSelect } from "@/components/ui/form-controls";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { slugify } from "@/lib/utils";
import { toAmsterdamInput } from "./datetime";
import { ImageUploadField } from "./image-upload-field";
import { RichTextEditor } from "./rich-text-editor";
import { useFormAction } from "./use-form-action";

const euro = (cents: number | undefined) => (cents === undefined ? "" : (cents / 100).toFixed(2).replace(".", ","));

export function EventForm({ event, defaultPrices = { nonMember: 500, member: 0 } }: { event?: Event; defaultPrices?: { nonMember: number; member: number } }) {
  const { onSubmit, pending, errors } = useFormAction(saveEvent);
  const [title, setTitle] = React.useState(event?.title ?? "");
  const [slug, setSlug] = React.useState(event?.slug ?? "");
  const [slugTouched, setSlugTouched] = React.useState(!!event);

  return (
    <form onSubmit={onSubmit} className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]" noValidate>
      {event && <input type="hidden" name="id" value={event.id} />}

      <div className="space-y-6">
        <div className="space-y-5 rounded-xl border border-border bg-white p-5 sm:p-6">
          <h2 className="text-base font-semibold">Algemeen</h2>
          <Field label="Titel" htmlFor="title" required error={errors.title}>
            <Input
              id="title"
              name="title"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (!slugTouched) setSlug(slugify(e.target.value));
              }}
              aria-invalid={!!errors.title}
              placeholder="Bijv. Voorjaarsrit 2027"
            />
          </Field>
          <Field label="URL-naam (slug)" htmlFor="slug" error={errors.slug} hint={`/evenementen/${slug || "…"}`}>
            <Input
              id="slug"
              name="slug"
              value={slug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(slugify(e.target.value));
              }}
              aria-invalid={!!errors.slug}
            />
          </Field>
          <Field label="Korte samenvatting" htmlFor="summary" required error={errors.summary} hint="Wordt getoond op overzichtskaarten (max. 300 tekens).">
            <Textarea id="summary" name="summary" defaultValue={event?.summary} rows={2} maxLength={300} className="min-h-20" aria-invalid={!!errors.summary} />
          </Field>
          <Field label="Beschrijving" htmlFor="description" required error={errors.description} hint="Programma, route en praktische info. Gebruik de knoppen voor kopjes, opsommingen en links.">
            <RichTextEditor id="description" name="description" defaultValue={event?.description ?? ""} invalid={!!errors.description} minHeight={280} />
          </Field>
        </div>

        <div className="space-y-5 rounded-xl border border-border bg-white p-5 sm:p-6">
          <h2 className="text-base font-semibold">Datum en locatie</h2>
          <div className="grid gap-5 sm:grid-cols-3">
            <Field label="Start" htmlFor="startsAt" required error={errors.startsAt}>
              <Input id="startsAt" name="startsAt" type="datetime-local" defaultValue={toAmsterdamInput(event?.startsAt)} aria-invalid={!!errors.startsAt} />
            </Field>
            <Field label="Einde" htmlFor="endsAt" error={errors.endsAt}>
              <Input id="endsAt" name="endsAt" type="datetime-local" defaultValue={toAmsterdamInput(event?.endsAt)} aria-invalid={!!errors.endsAt} />
            </Field>
            <Field label="Inschrijving sluit" htmlFor="registrationDeadline" error={errors.registrationDeadline} hint="Leeg = bij de start">
              <Input
                id="registrationDeadline"
                name="registrationDeadline"
                type="datetime-local"
                defaultValue={toAmsterdamInput(event?.registrationDeadline)}
                aria-invalid={!!errors.registrationDeadline}
              />
            </Field>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Locatienaam" htmlFor="locationName" required error={errors.locationName}>
              <Input id="locationName" name="locationName" defaultValue={event?.locationName} placeholder="Bijv. Carpoolplaats Harmelen" aria-invalid={!!errors.locationName} />
            </Field>
            <Field label="Plaats" htmlFor="city" required error={errors.city}>
              <Input id="city" name="city" defaultValue={event?.city} aria-invalid={!!errors.city} />
            </Field>
          </div>
          <Field label="Adres (verzamelpunt)" htmlFor="address" error={errors.address}>
            <Input id="address" name="address" defaultValue={event?.address ?? ""} placeholder="Straat en huisnummer, postcode" />
          </Field>
        </div>
      </div>

      <div className="space-y-6">
        <div className="space-y-5 rounded-xl border border-border bg-white p-5 sm:p-6">
          <h2 className="text-base font-semibold">Publicatie</h2>
          <Field label="Status" htmlFor="status" error={errors.status}>
            <NativeSelect id="status" name="status" defaultValue={event?.status ?? "DRAFT"}>
              <option value="DRAFT">Concept (niet zichtbaar)</option>
              <option value="PUBLISHED">Gepubliceerd</option>
              <option value="CANCELLED">Geannuleerd</option>
            </NativeSelect>
          </Field>
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? <Loader2 className="animate-spin" /> : <Save />}
            {event ? "Wijzigingen opslaan" : "Evenement aanmaken"}
          </Button>
        </div>

        <div className="space-y-5 rounded-xl border border-border bg-white p-5 sm:p-6">
          <h2 className="text-base font-semibold">Plaatsen en prijzen</h2>
          <Field label="Capaciteit (aantal auto's)" htmlFor="capacity" required error={errors.capacity}>
            <Input id="capacity" name="capacity" type="number" min={1} max={10000} defaultValue={event?.capacity ?? 40} aria-invalid={!!errors.capacity} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Niet-leden (€)" htmlFor="priceNonMember" error={errors.priceNonMember}>
              <Input id="priceNonMember" name="priceNonMember" inputMode="decimal" defaultValue={euro(event?.priceNonMember ?? defaultPrices.nonMember)} />
            </Field>
            <Field label="Leden (€)" htmlFor="priceMember" error={errors.priceMember}>
              <Input id="priceMember" name="priceMember" inputMode="decimal" defaultValue={euro(event?.priceMember ?? defaultPrices.member)} />
            </Field>
          </div>
          <p className="text-xs text-muted-foreground">De standaardprijzen stel je in bij Instellingen → Lidmaatschap &amp; prijzen. Per evenement kun je ze hier aanpassen.</p>
        </div>

        <div className="space-y-3 rounded-xl border border-border bg-white p-5 sm:p-6">
          <h2 className="text-base font-semibold">Afbeelding</h2>
          <ImageUploadField name="imageUrl" defaultValue={event?.imageUrl ?? ""} folder="events" />
          {errors.imageUrl && <p className="text-xs font-medium text-destructive">{errors.imageUrl}</p>}
        </div>
      </div>
    </form>
  );
}
