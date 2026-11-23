"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, CloudUpload, Loader2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { uploadFile } from "./upload-client";

type QueueItem = { id: string; file: File; progress: number; status: "wachten" | "bezig" | "klaar" | "fout"; error?: string };

const ACCEPT = ["image/jpeg", "image/png", "image/webp", "image/avif"];
const MAX_BYTES = 15 * 1024 * 1024;
const CONCURRENCY = 3;

/** Meerdere foto's tegelijk uploaden naar een album, met voortgang per bestand (drag & drop). */
export function PhotoUploader({ albumId }: { albumId: string }) {
  const router = useRouter();
  const [queue, setQueue] = React.useState<QueueItem[]>([]);
  const [dragging, setDragging] = React.useState(false);
  const [running, setRunning] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const update = (id: string, patch: Partial<QueueItem>) => setQueue((q) => q.map((item) => (item.id === id ? { ...item, ...patch } : item)));

  async function start(files: File[]) {
    const items: QueueItem[] = files.map((file, i) => {
      const invalid = !ACCEPT.includes(file.type) ? "Bestandstype niet ondersteund" : file.size > MAX_BYTES ? "Groter dan 15 MB" : undefined;
      return { id: `${Date.now()}-${i}-${file.name}`, file, progress: 0, status: invalid ? "fout" : "wachten", error: invalid };
    });
    setQueue((q) => [...q.filter((i) => i.status === "bezig" || i.status === "wachten"), ...items]);
    const todo = items.filter((i) => i.status === "wachten");
    if (todo.length === 0) return;

    setRunning(true);
    let done = 0;
    let failed = 0;
    let cursor = 0;
    async function worker() {
      while (cursor < todo.length) {
        const item = todo[cursor++];
        update(item.id, { status: "bezig" });
        try {
          await uploadFile(item.file, { folder: "albums", albumId }, (progress) => update(item.id, { progress }));
          update(item.id, { status: "klaar", progress: 100 });
          done++;
        } catch (err) {
          update(item.id, { status: "fout", error: err instanceof Error ? err.message : "Uploaden mislukt" });
          failed++;
        }
      }
    }
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, todo.length) }, worker));
    setRunning(false);
    if (done > 0) toast.success(`${done} foto${done === 1 ? "" : "'s"} geüpload en geoptimaliseerd.`);
    if (failed > 0) toast.error(`${failed} foto${failed === 1 ? "" : "'s"} mislukt.`);
    router.refresh();
    if (inputRef.current) inputRef.current.value = "";
  }

  const total = queue.length;
  const finished = queue.filter((q) => q.status === "klaar").length;

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (!running) start(Array.from(e.dataTransfer.files));
        }}
        className={cn(
          "flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors",
          dragging ? "border-primary bg-accent" : "border-border bg-surface",
        )}
      >
        <CloudUpload className="size-9 text-primary" />
        <p className="mt-3 font-semibold">Sleep foto's hierheen</p>
        <p className="mt-1 text-sm text-muted-foreground">
          JPG, PNG, WebP of AVIF · max. 15 MB per foto · je kunt er veel tegelijk kiezen · ze worden automatisch verkleind en geoptimaliseerd
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPT.join(",")}
          className="hidden"
          onChange={(e) => e.target.files && start(Array.from(e.target.files))}
        />
        <Button type="button" className="mt-5" onClick={() => inputRef.current?.click()} disabled={running}>
          {running ? <Loader2 className="animate-spin" /> : <CloudUpload />}
          {running ? `Uploaden… ${finished}/${total}` : "Foto's kiezen"}
        </Button>
      </div>

      {queue.length > 0 && (
        <ul className="max-h-72 space-y-2 overflow-y-auto rounded-lg border border-border p-3">
          {queue.map((item) => (
            <li key={item.id} className="text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="truncate">{item.file.name}</span>
                <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground tabular-nums">
                  {item.status === "klaar" && <CheckCircle2 className="size-4 text-emerald-600" />}
                  {item.status === "fout" && <XCircle className="size-4 text-destructive" />}
                  {item.status === "bezig" && `${item.progress}%`}
                  {item.status === "wachten" && "in wachtrij"}
                  {item.status === "fout" && <span className="text-destructive">{item.error}</span>}
                </span>
              </div>
              {(item.status === "bezig" || item.status === "wachten") && (
                <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${item.progress}%` }} />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
