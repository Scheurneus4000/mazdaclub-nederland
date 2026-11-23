"use client";

import * as React from "react";
import { CheckCircle2, ImagePlus, Loader2, RotateCcw, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { saveContent } from "@/app/admin/actions/content";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/form-controls";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { ContentFieldType } from "@/lib/content";
import { cn } from "@/lib/utils";
import { uploadFile } from "./upload-client";
import { useFormAction } from "./use-form-action";

export type ContentFormField = {
  key: string;
  label: string;
  type: ContentFieldType;
  group: string;
  help?: string;
  maxLength?: number;
  required: boolean;
  value: string;
  defaultValue: string;
};

const IMAGE_TYPES: ContentFieldType[] = ["image", "logo", "favicon"];

/** Formulier voor één tabblad van Teksten & afbeeldingen (of Instellingen). */
export function ContentForm({ fields, submitLabel = "Wijzigingen opslaan" }: { fields: ContentFormField[]; submitLabel?: string }) {
  const { onSubmit, pending, errors, state } = useFormAction(saveContent);
  const [values, setValues] = React.useState<Record<string, string>>(() => Object.fromEntries(fields.map((f) => [f.key, f.value])));
  const [dirty, setDirty] = React.useState(false);

  React.useEffect(() => {
    if (state.ok) setDirty(false);
  }, [state]);

  React.useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const set = (key: string, value: string) => {
    setValues((v) => ({ ...v, [key]: value }));
    setDirty(true);
  };

  const groups = React.useMemo(() => {
    const map = new Map<string, ContentFormField[]>();
    for (const f of fields) map.set(f.group, [...(map.get(f.group) ?? []), f]);
    return [...map.entries()];
  }, [fields]);

  return (
    <form onSubmit={onSubmit} className="space-y-6" noValidate>
      {fields.map((f) => (
        <input key={`k-${f.key}`} type="hidden" name="__keys" value={f.key} />
      ))}

      {groups.map(([group, list]) => {
        const imageGroup = list.every((f) => IMAGE_TYPES.includes(f.type));
        return (
          <section key={group} className="rounded-xl border border-border bg-white">
            <h2 className="border-b border-border px-5 py-4 text-base font-semibold sm:px-6">{group}</h2>
            <div className={cn("grid gap-6 p-5 sm:p-6", imageGroup ? "sm:grid-cols-2 xl:grid-cols-3" : "md:grid-cols-2")}>
              {list.map((f) => {
                const value = values[f.key] ?? "";
                const isDefault = value === f.defaultValue;
                const canReset = !isDefault && f.defaultValue !== "";
                const wide = f.type === "textarea";
                return (
                  <Field
                    key={f.key}
                    label={f.label}
                    htmlFor={`content-${f.key}`}
                    error={errors[f.key]}
                    required={f.required}
                    className={wide ? "md:col-span-2" : undefined}
                  >
                    {IMAGE_TYPES.includes(f.type) ? (
                      <ContentImageInput field={f} value={value} onChange={(v) => set(f.key, v)} />
                    ) : f.type === "textarea" ? (
                      <Textarea
                        id={`content-${f.key}`}
                        name={f.key}
                        value={value}
                        onChange={(e) => set(f.key, e.target.value)}
                        rows={Math.min(8, Math.max(3, Math.ceil((f.maxLength ?? 400) / 160)))}
                        maxLength={f.maxLength}
                        aria-invalid={!!errors[f.key]}
                      />
                    ) : (
                      <Input
                        id={`content-${f.key}`}
                        name={f.key}
                        type={f.type === "email" ? "email" : f.type === "url" ? "url" : "text"}
                        value={value}
                        onChange={(e) => set(f.key, e.target.value)}
                        maxLength={f.maxLength}
                        aria-invalid={!!errors[f.key]}
                      />
                    )}
                    <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span className="min-w-0 flex-1">{f.help}</span>
                      <span className="flex shrink-0 items-center gap-3">
                        {!IMAGE_TYPES.includes(f.type) && f.maxLength ? (
                          <span className="tabular-nums">
                            {value.length}/{f.maxLength}
                          </span>
                        ) : null}
                        {canReset && (
                          <button
                            type="button"
                            onClick={() => set(f.key, f.defaultValue)}
                            className="inline-flex cursor-pointer items-center gap-1 font-medium text-primary hover:underline"
                          >
                            <RotateCcw className="size-3" /> Standaard terugzetten
                          </button>
                        )}
                      </span>
                    </div>
                  </Field>
                );
              })}
            </div>
          </section>
        );
      })}

      <div className="sticky bottom-4 z-10 flex flex-col gap-3 rounded-xl border border-border bg-white/95 p-4 shadow-lg backdrop-blur sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          {dirty ? (
            <span className="font-medium text-amber-700">Je hebt wijzigingen die nog niet zijn opgeslagen.</span>
          ) : state.ok ? (
            <>
              <CheckCircle2 className="size-4 text-emerald-600" /> Opgeslagen en direct zichtbaar op de website.
            </>
          ) : (
            "Wijzigingen worden na opslaan direct op de website getoond."
          )}
        </p>
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : <Save />}
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}

function ContentImageInput({ field, value, onChange }: { field: ContentFormField; value: string; onChange: (v: string) => void }) {
  const [progress, setProgress] = React.useState<number | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const isLogo = field.type === "logo" || field.type === "favicon";
  const usingDefault = value === field.defaultValue && field.defaultValue !== "";

  async function onFile(file: File | undefined) {
    if (!file) return;
    setProgress(0);
    try {
      const uploaded = await uploadFile(file, { folder: "site", ...(field.type === "favicon" ? { variant: "favicon" as const } : {}) }, setProgress);
      onChange(uploaded.url);
      toast.success("Afbeelding geüpload. Vergeet niet op 'Wijzigingen opslaan' te klikken.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Uploaden mislukt");
    } finally {
      setProgress(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-3">
      <input type="hidden" name={field.key} value={value} />
      <div
        className={cn(
          "relative flex w-full items-center justify-center overflow-hidden rounded-lg border border-border",
          field.type === "favicon" ? "aspect-square max-w-40" : isLogo ? "aspect-[3/1]" : "aspect-[16/10]",
          field.key === "logoInvertedUrl" ? "bg-ink" : isLogo ? "bg-[repeating-conic-gradient(#f4f4f5_0_25%,#fff_0_50%)] bg-[length:16px_16px]" : "bg-surface",
        )}
      >
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="" className={cn("absolute inset-0 size-full", isLogo ? "object-contain p-4" : "object-cover")} />
        ) : (
          <div className={cn("px-4 text-center text-xs", field.key === "logoInvertedUrl" ? "text-white/60" : "text-muted-foreground")}>
            <ImagePlus className="mx-auto mb-2 size-6" />
            {field.defaultValue ? "Geen afbeelding" : isLogo ? "Nog niet geüpload" : "Geen afbeelding"}
          </div>
        )}
        {usingDefault && !isLogo && (
          <span className="absolute top-2 left-2 rounded-full bg-black/65 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">Tijdelijke foto</span>
        )}
        {progress !== null && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-white/85 text-sm font-medium">
            <Loader2 className="size-5 animate-spin text-primary" /> Uploaden… {progress}%
          </div>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <input
          ref={inputRef}
          type="file"
          accept={isLogo ? "image/png,image/svg+xml,image/webp,image/jpeg" : "image/jpeg,image/png,image/webp,image/avif,image/heic,image/heif"}
          className="hidden"
          id={`content-${field.key}`}
          onChange={(e) => onFile(e.target.files?.[0])}
        />
        <Button type="button" size="sm" variant="outline" onClick={() => inputRef.current?.click()} disabled={progress !== null}>
          <ImagePlus /> {value ? "Vervangen" : "Uploaden"}
        </Button>
        {value && !field.required && (
          <Button type="button" size="sm" variant="ghost" onClick={() => onChange("")} className="text-muted-foreground">
            <Trash2 /> {field.defaultValue && !isLogo ? "Geen foto" : "Verwijderen"}
          </Button>
        )}
      </div>
    </div>
  );
}
