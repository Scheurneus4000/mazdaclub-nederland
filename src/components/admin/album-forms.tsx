"use client";

import * as React from "react";
import { Check, Loader2, Save } from "lucide-react";
import type { Album } from "@prisma/client";
import { saveAlbum, updatePhotoCaption } from "@/app/admin/actions/albums";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, NativeSelect } from "@/components/ui/form-controls";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toAmsterdamDateInput } from "./datetime";
import { useFormAction } from "./use-form-action";

export function AlbumForm({ album, events }: { album?: Album; events: Array<{ id: string; title: string; startsAt: Date }> }) {
  const { onSubmit, pending, errors } = useFormAction(saveAlbum);
  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {album && <input type="hidden" name="id" value={album.id} />}
      <Field label="Titel" htmlFor="album-title" required error={errors.title}>
        <Input id="album-title" name="title" defaultValue={album?.title} placeholder="Bijv. Voorjaarsrit 2027" aria-invalid={!!errors.title} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Datum" htmlFor="album-date" required error={errors.date}>
          <Input id="album-date" name="date" type="date" defaultValue={toAmsterdamDateInput(album?.date ?? new Date())} aria-invalid={!!errors.date} />
        </Field>
        <Field label="URL-naam (optioneel)" htmlFor="album-slug" error={errors.slug}>
          <Input id="album-slug" name="slug" defaultValue={album?.slug} placeholder="automatisch" />
        </Field>
      </div>
      <Field label="Gekoppeld evenement" htmlFor="album-event" error={errors.eventId}>
        <NativeSelect id="album-event" name="eventId" defaultValue={album?.eventId ?? ""}>
          <option value="">Geen</option>
          {events.map((e) => (
            <option key={e.id} value={e.id}>
              {e.title} ({new Date(e.startsAt).toLocaleDateString("nl-NL")})
            </option>
          ))}
        </NativeSelect>
      </Field>
      <Field label="Omschrijving" htmlFor="album-description" error={errors.description}>
        <Textarea id="album-description" name="description" defaultValue={album?.description ?? ""} rows={3} className="min-h-20" />
      </Field>
      <label className="flex cursor-pointer items-start gap-3 text-sm">
        <Checkbox name="published" defaultChecked={album?.published ?? true} className="mt-0.5" />
        <span>
          <span className="font-medium">Zichtbaar in de fotogalerij</span>
          <span className="block text-xs text-muted-foreground">Zet dit uit om eerst rustig foto&apos;s te uploaden en het album later te tonen.</span>
        </span>
      </label>
      <Button type="submit" disabled={pending} className="w-full sm:w-auto">
        {pending ? <Loader2 className="animate-spin" /> : <Save />}
        {album ? "Album opslaan" : "Album aanmaken"}
      </Button>
    </form>
  );
}

export function PhotoCaptionForm({ photoId, caption }: { photoId: string; caption: string | null }) {
  const { onSubmit, pending, state } = useFormAction(updatePhotoCaption, { toastSuccess: false });
  const [value, setValue] = React.useState(caption ?? "");
  const dirty = value !== (caption ?? "");
  return (
    <form onSubmit={onSubmit} className="flex gap-1.5">
      <input type="hidden" name="id" value={photoId} />
      <Input name="caption" value={value} onChange={(e) => setValue(e.target.value)} placeholder="Bijschrift" className="h-8 text-xs" maxLength={300} aria-label="Bijschrift" />
      <Button type="submit" variant={dirty ? "default" : "outline"} size="icon-sm" disabled={pending || !dirty} aria-label="Bijschrift opslaan">
        {pending ? <Loader2 className="animate-spin" /> : <Check className={state.ok && !dirty ? "text-emerald-600" : undefined} />}
      </Button>
    </form>
  );
}
