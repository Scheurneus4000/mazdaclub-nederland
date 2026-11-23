"use client";

import * as React from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { uploadFile, type UploadFolder } from "./upload-client";

/** Eén afbeelding kiezen: uploaden (wordt automatisch geoptimaliseerd) of een URL plakken. */
export function ImageUploadField({ name, defaultValue = "", folder }: { name: string; defaultValue?: string; folder: UploadFolder }) {
  const [url, setUrl] = React.useState(defaultValue);
  const [progress, setProgress] = React.useState<number | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setProgress(0);
    try {
      const uploaded = await uploadFile(file, { folder }, setProgress);
      setUrl(uploaded.url);
      toast.success("Afbeelding geüpload");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Uploaden mislukt");
    } finally {
      setProgress(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-3">
      <input type="hidden" name={name} value={url} />
      <div className="relative flex aspect-[16/9] w-full items-center justify-center overflow-hidden rounded-lg border border-dashed border-border bg-surface">
        {url ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="Voorbeeld" className="absolute inset-0 size-full object-cover" />
            <button
              type="button"
              onClick={() => setUrl("")}
              className="absolute top-2 right-2 flex size-8 cursor-pointer items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
              aria-label="Afbeelding verwijderen"
            >
              <X className="size-4" />
            </button>
          </>
        ) : (
          <div className="text-center text-sm text-muted-foreground">
            <ImagePlus className="mx-auto mb-2 size-7" />
            Nog geen afbeelding
          </div>
        )}
        {progress !== null && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-white/80 text-sm font-medium">
            <Loader2 className="size-5 animate-spin text-primary" /> Uploaden… {progress}%
          </div>
        )}
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://… of upload een bestand" className="h-10" aria-label="Afbeeldings-URL" />
        <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/avif" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
        <Button type="button" variant="outline" className="h-10" onClick={() => inputRef.current?.click()} disabled={progress !== null}>
          <ImagePlus /> Uploaden
        </Button>
      </div>
    </div>
  );
}
