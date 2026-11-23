"use client";

import * as React from "react";
import Image from "next/image";
import Lightbox from "yet-another-react-lightbox";
import Captions from "yet-another-react-lightbox/plugins/captions";
import Counter from "yet-another-react-lightbox/plugins/counter";
import Download from "yet-another-react-lightbox/plugins/download";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import "yet-another-react-lightbox/styles.css";
import "yet-another-react-lightbox/plugins/captions.css";
import "yet-another-react-lightbox/plugins/counter.css";
import { cn } from "@/lib/utils";

export type GalleryPhoto = {
  id: string;
  url: string;
  thumbUrl: string;
  width: number;
  height: number;
  caption?: string | null;
  downloadName?: string;
};

/**
 * Fotogrid met lichtbox (zoom, downloaden, bijschriften, toetsenbord/swipe-navigatie).
 * variant "mosaic": eerste foto groot (homepagina); "grid": gelijkmatig raster (albums).
 */
export function LightboxGallery({ photos, variant = "grid", className }: { photos: GalleryPhoto[]; variant?: "grid" | "mosaic"; className?: string }) {
  const [index, setIndex] = React.useState(-1);

  const slides = photos.map((p) => ({
    src: p.url,
    width: p.width,
    height: p.height,
    description: p.caption ?? undefined,
    download: { url: p.url, filename: p.downloadName ?? `mazdaclub-${p.id}.webp` },
  }));

  return (
    <>
      <ul
        className={cn(
          variant === "mosaic"
            ? "grid auto-rows-[160px] grid-cols-2 gap-3 sm:auto-rows-[190px] md:grid-cols-4"
            : "grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4",
          className,
        )}
      >
        {photos.map((photo, i) => (
          <li
            key={photo.id}
            className={cn(
              "relative overflow-hidden rounded-xl bg-muted",
              variant === "grid" && "aspect-[4/3]",
              variant === "mosaic" && i === 0 && "col-span-2 row-span-2",
              variant === "mosaic" && i === 3 && "md:row-span-2",
            )}
          >
            <button
              type="button"
              onClick={() => setIndex(i)}
              className="group absolute inset-0 cursor-zoom-in focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/40"
              aria-label={`Foto ${i + 1} vergroten${photo.caption ? `: ${photo.caption}` : ""}`}
            >
              <Image
                src={photo.thumbUrl}
                alt={photo.caption ?? `Clubfoto ${i + 1}`}
                fill
                sizes={variant === "mosaic" && i === 0 ? "(min-width: 768px) 50vw, 100vw" : "(min-width: 1024px) 25vw, 50vw"}
                className="object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <span className="absolute inset-0 bg-black/0 transition-colors duration-300 group-hover:bg-black/20" />
            </button>
          </li>
        ))}
      </ul>

      <Lightbox
        open={index >= 0}
        index={index}
        close={() => setIndex(-1)}
        slides={slides}
        plugins={[Captions, Counter, Download, Zoom]}
        captions={{ descriptionTextAlign: "center" }}
        labels={{ Previous: "Vorige", Next: "Volgende", Close: "Sluiten", Download: "Downloaden", "Zoom in": "Inzoomen", "Zoom out": "Uitzoomen" }}
      />
    </>
  );
}
