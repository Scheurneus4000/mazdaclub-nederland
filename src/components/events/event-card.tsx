import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Clock, MapPin, Users } from "lucide-react";
import type { Event } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { cn, dateBadge, formatPrice, formatTime } from "@/lib/utils";

export type EventCardData = Pick<
  Event,
  "slug" | "title" | "summary" | "startsAt" | "locationName" | "city" | "capacity" | "priceNonMember" | "priceMember" | "imageUrl" | "status"
> & { availableSeats: number };

export function EventCard({ event, className }: { event: EventCardData; className?: string }) {
  const badge = dateBadge(event.startsAt);
  const full = event.availableSeats <= 0;
  const almostFull = !full && event.availableSeats <= Math.max(5, Math.round(event.capacity * 0.15));

  return (
    <article className={cn("group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-white transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_18px_40px_-18px_rgba(0,0,0,0.25)]", className)}>
      <div className="relative aspect-[16/10] overflow-hidden bg-muted">
        {event.imageUrl && (
          <Image
            src={event.imageUrl}
            alt={event.title}
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition-transform duration-700 group-hover:scale-105"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
        <div className="absolute top-4 left-4 flex flex-col items-center rounded-lg bg-white px-3 py-2 text-center shadow-md">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{badge.weekday}</span>
          <span className="font-display text-2xl font-bold leading-none text-ink">{badge.day}</span>
          <span className="text-[11px] font-bold uppercase tracking-wider text-primary">{badge.month}</span>
        </div>
        <div className="absolute top-4 right-4">
          {event.status === "CANCELLED" ? (
            <Badge variant="dark">Geannuleerd</Badge>
          ) : full ? (
            <Badge variant="dark">Volgeboekt</Badge>
          ) : almostFull ? (
            <Badge>Nog {event.availableSeats} plaatsen</Badge>
          ) : null}
        </div>
      </div>

      <div className="flex flex-1 flex-col p-6">
        <h3 className="font-display text-xl font-bold uppercase leading-tight tracking-tight">
          <Link href={`/evenementen/${event.slug}`} className="after:absolute after:inset-0">
            {event.title}
          </Link>
        </h3>
        <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{event.summary}</p>

        <ul className="mt-5 space-y-2 text-sm text-foreground/80">
          <li className="flex items-center gap-2">
            <MapPin className="size-4 text-primary" /> {event.locationName}, {event.city}
          </li>
          <li className="flex items-center gap-2">
            <Clock className="size-4 text-primary" /> Start {formatTime(event.startsAt)} uur
          </li>
          <li className="flex items-center gap-2">
            <Users className="size-4 text-primary" /> {full ? "Geen plaatsen meer" : `${event.availableSeats} van ${event.capacity} plaatsen beschikbaar`}
          </li>
        </ul>

        <div className="mt-6 flex items-end justify-between border-t border-border pt-4">
          <div className="text-sm">
            <p className="font-semibold text-ink">{event.priceMember === 0 ? "Leden gratis" : `Leden ${formatPrice(event.priceMember)}`}</p>
            <p className="text-muted-foreground">Niet-leden {formatPrice(event.priceNonMember)}</p>
          </div>
          <span className="flex items-center gap-1 text-sm font-semibold text-primary">
            Inschrijven <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
          </span>
        </div>
      </div>
    </article>
  );
}
