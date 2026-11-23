"use client";

import * as React from "react";
import Image from "next/image";
import { ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";

export function ProductGallery({ images, name }: { images: string[]; name: string }) {
  const [active, setActive] = React.useState(0);
  const current = images[active];

  return (
    <div className="flex flex-col-reverse gap-4 lg:flex-row">
      {images.length > 1 && (
        <ul className="flex gap-3 overflow-x-auto [scrollbar-width:none] lg:w-20 lg:flex-col lg:overflow-visible" aria-label="Productafbeeldingen">
          {images.map((src, i) => (
            <li key={src} className="shrink-0">
              <button
                type="button"
                onClick={() => setActive(i)}
                aria-label={`Afbeelding ${i + 1} van ${images.length} tonen`}
                aria-current={i === active}
                className={cn(
                  "relative block size-20 cursor-pointer overflow-hidden rounded-xl border-2 bg-surface transition-colors",
                  i === active ? "border-primary" : "border-transparent hover:border-border",
                )}
              >
                <Image src={src} alt="" fill sizes="80px" className="object-contain p-2" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="relative aspect-square flex-1 overflow-hidden rounded-3xl border border-border bg-surface">
        {current ? (
          <Image key={current} src={current} alt={name} fill priority sizes="(min-width: 1024px) 50vw, 100vw" className="animate-in fade-in object-contain p-8 duration-300" />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <ImageOff className="size-10" />
          </div>
        )}
      </div>
    </div>
  );
}
