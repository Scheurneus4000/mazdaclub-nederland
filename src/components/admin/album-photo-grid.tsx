"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, CheckSquare, ImageIcon, Loader2, RefreshCw, Square, Star, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { deletePhoto, deletePhotos, movePhoto, setAlbumCover } from "@/app/admin/actions/albums";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ActionButton } from "./action-button";
import { PhotoCaptionForm } from "./album-forms";
import { ConfirmActionDialog } from "./confirm-action-dialog";
import { uploadFile } from "./upload-client";

export type AdminPhoto = {
  id: string;
  url: string;
  thumbUrl: string;
  caption: string | null;
  width: number;
  height: number;
  sizeBytes: number;
};

const ACCEPT = "image/jpeg,image/png,image/webp,image/avif";

/**
 * Fotobeheer binnen een album: bijschrift, volgorde, omslagfoto, vervangen en (meerdere) verwijderen.
 */
export function AlbumPhotoGrid({ albumId, coverUrl, photos }: { albumId: string; coverUrl: string | null; photos: AdminPhoto[] }) {
  const router = useRouter();
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [replacing, setReplacing] = React.useState<{ id: string; progress: number } | null>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const targetRef = React.useRef<string | null>(null);

  // Selectie opschonen als foto's verdwijnen (na verwijderen of verversen).
  React.useEffect(() => {
    setSelected((prev) => {
      const ids = new Set(photos.map((p) => p.id));
      const next = new Set([...prev].filter((id) => ids.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [photos]);

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  function chooseReplacement(photoId: string) {
    targetRef.current = photoId;
    fileRef.current?.click();
  }

  async function onReplaceFile(file: File | undefined) {
    const photoId = targetRef.current;
    if (fileRef.current) fileRef.current.value = "";
    if (!file || !photoId) return;
    setReplacing({ id: photoId, progress: 0 });
    try {
      await uploadFile(file, { folder: "albums", albumId, replacePhotoId: photoId }, (progress) => setReplacing({ id: photoId, progress }));
      toast.success("Foto vervangen. Bijschrift en volgorde zijn behouden.");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Vervangen mislukt");
    } finally {
      setReplacing(null);
      targetRef.current = null;
    }
  }

  if (photos.length === 0) {
    return (
      <div className="flex flex-col items-center py-10 text-center text-sm text-muted-foreground">
        <ImageIcon className="mb-2 size-7" /> Nog geen foto&apos;s in dit album. Upload ze hierboven.
      </div>
    );
  }

  const allSelected = selected.size === photos.length;
  const selectedIds = [...selected];

  return (
    <div className="space-y-4">
      <input ref={fileRef} type="file" accept={ACCEPT} className="hidden" onChange={(e) => onReplaceFile(e.target.files?.[0])} />

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface px-3 py-2">
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={() => setSelected(allSelected ? new Set() : new Set(photos.map((p) => p.id)))}>
            {allSelected ? <CheckSquare /> : <Square />}
            {allSelected ? "Selectie opheffen" : "Alles selecteren"}
          </Button>
          {selected.size > 0 && (
            <span className="text-sm text-muted-foreground">
              {selected.size} van {photos.length} geselecteerd
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {selected.size > 0 && (
            <Button type="button" variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
              <X /> Wissen
            </Button>
          )}
          <ConfirmActionDialog
            action={deletePhotos}
            fields={{ albumId, ids: selectedIds }}
            size="sm"
            disabled={selected.size === 0}
            title={`${selected.size} foto${selected.size === 1 ? "" : "'s"} verwijderen?`}
            description={<p>De geselecteerde foto&apos;s worden definitief uit het album en uit de opslag verwijderd. Dit kun je niet ongedaan maken.</p>}
            confirmLabel={`Ja, ${selected.size} verwijderen`}
            onSuccess={() => setSelected(new Set())}
          >
            <Trash2 /> Verwijder selectie
          </ConfirmActionDialog>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Tip: met <RefreshCw className="inline size-3.5" /> vervang je een foto door een nieuwe versie, met <Star className="inline size-3.5" /> kies je de omslagfoto van het album.
      </p>

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        {photos.map((photo, i) => {
          const isCover = coverUrl === photo.thumbUrl || coverUrl === photo.url;
          const isSelected = selected.has(photo.id);
          const busy = replacing?.id === photo.id;
          return (
            <li
              key={photo.id}
              className={cn("overflow-hidden rounded-lg border bg-white transition-shadow", isSelected ? "border-primary ring-2 ring-primary/30" : "border-border")}
            >
              <div className="relative aspect-[4/3] bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo.thumbUrl} alt={photo.caption ?? `Foto ${i + 1}`} loading="lazy" className="size-full object-cover" />
                <label className="absolute top-2 left-2 flex cursor-pointer items-center gap-1.5 rounded-md bg-white/90 px-2 py-1 text-xs font-medium shadow-sm">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggle(photo.id)}
                    className="size-4 cursor-pointer accent-primary"
                    aria-label={`Foto ${i + 1} selecteren`}
                  />
                  {i + 1}
                </label>
                {isCover && (
                  <Badge className="absolute top-2 right-2">
                    <Star className="fill-current" /> Omslag
                  </Badge>
                )}
                <span className="absolute right-2 bottom-2 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white tabular-nums">
                  {photo.width}×{photo.height} · {Math.round(photo.sizeBytes / 1024)} kB
                </span>
                {busy && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-white/85 text-sm font-medium">
                    <Loader2 className="size-5 animate-spin text-primary" /> Vervangen… {replacing.progress}%
                  </div>
                )}
              </div>
              <div className="space-y-2 p-2.5">
                <PhotoCaptionForm photoId={photo.id} caption={photo.caption} />
                <div className="flex items-center justify-between gap-1">
                  <div className="flex gap-1">
                    <ActionButton action={movePhoto} fields={{ id: photo.id, direction: "up" }} variant="ghost" title="Naar voren">
                      <ArrowUp />
                    </ActionButton>
                    <ActionButton action={movePhoto} fields={{ id: photo.id, direction: "down" }} variant="ghost" title="Naar achteren">
                      <ArrowDown />
                    </ActionButton>
                    {!isCover && (
                      <ActionButton action={setAlbumCover} fields={{ id: photo.id }} variant="ghost" title="Als omslagfoto instellen">
                        <Star />
                      </ActionButton>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      title="Foto vervangen door een nieuwe versie"
                      aria-label="Foto vervangen"
                      disabled={!!replacing}
                      onClick={() => chooseReplacement(photo.id)}
                    >
                      <RefreshCw /> <span className="hidden sm:inline">Vervangen</span>
                    </Button>
                  </div>
                  <ConfirmActionDialog
                    action={deletePhoto}
                    fields={{ id: photo.id }}
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    triggerTitle="Foto verwijderen"
                    title="Deze foto verwijderen?"
                    description={<p>Foto {i + 1} wordt definitief uit het album en uit de opslag verwijderd. Dit kun je niet ongedaan maken.</p>}
                    confirmLabel="Ja, verwijderen"
                  >
                    <Trash2 />
                  </ConfirmActionDialog>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
