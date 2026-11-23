import Image from "next/image";
import Link from "next/link";
import { Camera, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

export type PastEventCardData = {
  slug: string;
  title: string;
  startsAt: Date;
  locationName: string;
  city: string;
  imageUrl: string | null;
  status: string;
  albumSlug: string | null;
};

/** Compacte kaart voor afgelopen evenementen (zonder inschrijfinformatie). */
export function PastEventCard({ event }: { event: PastEventCardData }) {
  return (
    <article className="group relative flex gap-4 overflow-hidden rounded-2xl border border-border bg-white p-3 transition-shadow hover:shadow-md sm:gap-5">
      <div className="relative aspect-[4/3] w-28 shrink-0 overflow-hidden rounded-xl bg-muted sm:w-40">
        {event.imageUrl && (
          <Image
            src={event.imageUrl}
            alt=""
            fill
            sizes="160px"
            className="object-cover grayscale-[35%] transition duration-500 group-hover:scale-105 group-hover:grayscale-0"
          />
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-center py-1">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{formatDate(event.startsAt)}</p>
        <h3 className="mt-1 truncate font-display text-lg font-bold uppercase leading-tight tracking-tight">
          <Link href={`/evenementen/${event.slug}`} className="hover:text-primary">
            {event.title}
          </Link>
        </h3>
        <p className="mt-1 flex items-center gap-1.5 truncate text-sm text-muted-foreground">
          <MapPin className="size-3.5 shrink-0 text-primary" /> {event.locationName}, {event.city}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {event.status === "CANCELLED" && <Badge variant="secondary">Geannuleerd</Badge>}
          {event.albumSlug && (
            <Link
              href={`/fotogalerij/${event.albumSlug}`}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
            >
              <Camera className="size-4" /> Bekijk de foto's
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}
