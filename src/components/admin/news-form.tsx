"use client";

import * as React from "react";
import { CalendarClock, Eye, EyeOff, Loader2, Save } from "lucide-react";
import type { NewsPost } from "@prisma/client";
import { saveNews } from "@/app/admin/actions/news";
import { Button } from "@/components/ui/button";
import { Checkbox, Field } from "@/components/ui/form-controls";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { slugify } from "@/lib/utils";
import { fromAmsterdamInput, toAmsterdamInput } from "./datetime";
import { ImageUploadField } from "./image-upload-field";
import { RichTextEditor } from "./rich-text-editor";
import { useFormAction } from "./use-form-action";

const EXCERPT_MAX = 300;

function formatWhen(date: Date) {
  return new Intl.DateTimeFormat("nl-NL", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Amsterdam" }).format(date);
}

/** Formulier voor een nieuwsbericht: schrijven, opmaken, foto kiezen en publiceren of inplannen. */
export function NewsForm({ post, defaultAuthor }: { post?: NewsPost; defaultAuthor: string }) {
  const { onSubmit, pending, errors } = useFormAction(saveNews);
  const [title, setTitle] = React.useState(post?.title ?? "");
  const [slug, setSlug] = React.useState(post?.slug ?? "");
  const [slugTouched, setSlugTouched] = React.useState(!!post);
  const [excerpt, setExcerpt] = React.useState(post?.excerpt ?? "");
  const [published, setPublished] = React.useState(post?.published ?? false);
  const [publishedAt, setPublishedAt] = React.useState(toAmsterdamInput(post?.publishedAt));

  const plannedDate = fromAmsterdamInput(publishedAt);
  const isScheduled = published && !!plannedDate && plannedDate > new Date();

  let statusText: React.ReactNode;
  if (!published) statusText = "Concept: alleen beheerders kunnen het bericht zien.";
  else if (isScheduled && plannedDate) statusText = `Ingepland: verschijnt automatisch op ${formatWhen(plannedDate)}.`;
  else statusText = "Gepubliceerd: het bericht staat na opslaan direct op de website.";

  return (
    <form onSubmit={onSubmit} className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]" noValidate>
      {post && <input type="hidden" name="id" value={post.id} />}

      <div className="space-y-6">
        <div className="space-y-5 rounded-xl border border-border bg-white p-5 sm:p-6">
          <h2 className="text-base font-semibold">Bericht</h2>
          <Field label="Titel" htmlFor="title" required error={errors.title}>
            <Input
              id="title"
              name="title"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (!slugTouched) setSlug(slugify(e.target.value));
              }}
              maxLength={160}
              aria-invalid={!!errors.title}
              placeholder="Bijv. Terugblik op de Voorjaarsrit"
            />
          </Field>
          <Field label="Webadres (wordt automatisch ingevuld)" htmlFor="slug" error={errors.slug} hint={`/nieuws/${slug || "…"}`}>
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
          <Field
            label="Korte samenvatting"
            htmlFor="excerpt"
            required
            error={errors.excerpt}
            hint={`Eén of twee zinnen. Zichtbaar in het nieuwsoverzicht, op de homepagina en in Google. ${excerpt.length}/${EXCERPT_MAX} tekens.`}
          >
            <Textarea
              id="excerpt"
              name="excerpt"
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              rows={3}
              maxLength={EXCERPT_MAX}
              className="min-h-20"
              aria-invalid={!!errors.excerpt}
            />
          </Field>
          <Field
            label="Tekst"
            htmlFor="content"
            required
            error={errors.content}
            hint="Schrijf zoals in Word. Met de knoppen maak je kopjes, vetgedrukte tekst, opsommingen en links."
          >
            <RichTextEditor id="content" name="content" defaultValue={post?.content ?? ""} invalid={!!errors.content} minHeight={360} />
          </Field>
        </div>
      </div>

      <div className="space-y-6">
        <div className="space-y-5 rounded-xl border border-border bg-white p-5 sm:p-6">
          <h2 className="text-base font-semibold">Publicatie</h2>
          <label htmlFor="published" className="flex cursor-pointer items-start gap-3 rounded-lg border border-border p-3.5 hover:bg-surface">
            <Checkbox id="published" name="published" value="1" checked={published} onChange={(e) => setPublished(e.target.checked)} className="mt-0.5" />
            <span>
              <span className="block text-sm font-medium">Publiceren op de website</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">Uitgevinkt blijft het bericht een concept.</span>
            </span>
          </label>

          <div className="flex items-start gap-2.5 rounded-lg bg-surface px-3.5 py-3 text-sm">
            {!published ? (
              <EyeOff className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            ) : isScheduled ? (
              <CalendarClock className="mt-0.5 size-4 shrink-0 text-sky-600" />
            ) : (
              <Eye className="mt-0.5 size-4 shrink-0 text-emerald-600" />
            )}
            <p>{statusText}</p>
          </div>

          <Field
            label="Publicatiedatum"
            htmlFor="publishedAt"
            error={errors.publishedAt}
            hint="Leeg = direct bij publiceren. Kies een moment in de toekomst om het bericht in te plannen."
          >
            <Input
              id="publishedAt"
              name="publishedAt"
              type="datetime-local"
              value={publishedAt}
              onChange={(e) => setPublishedAt(e.target.value)}
              aria-invalid={!!errors.publishedAt}
            />
          </Field>

          <Field label="Auteur" htmlFor="authorName" error={errors.authorName} hint="Naam die bij het bericht wordt getoond.">
            <Input id="authorName" name="authorName" defaultValue={post?.authorName ?? defaultAuthor} maxLength={120} />
          </Field>

          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? <Loader2 className="animate-spin" /> : <Save />}
            {post ? "Wijzigingen opslaan" : published ? (isScheduled ? "Opslaan en inplannen" : "Opslaan en publiceren") : "Opslaan als concept"}
          </Button>
        </div>

        <div className="space-y-3 rounded-xl border border-border bg-white p-5 sm:p-6">
          <h2 className="text-base font-semibold">Coverfoto</h2>
          <p className="text-xs text-muted-foreground">
            Optioneel. Een liggende foto werkt het mooist (bijv. 1600 × 900 pixels). Wordt ook getoond als het bericht op social media wordt gedeeld.
          </p>
          <ImageUploadField name="coverUrl" defaultValue={post?.coverUrl ?? ""} folder="news" />
          {errors.coverUrl && <p className="text-xs font-medium text-destructive">{errors.coverUrl}</p>}
        </div>
      </div>
    </form>
  );
}
