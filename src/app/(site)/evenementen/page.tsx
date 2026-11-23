import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CalendarCheck, CalendarX, History } from "lucide-react";
import { EventCard } from "@/components/events/event-card";
import { PastEventCard } from "@/components/events/past-event-card";
import { EmptyState, PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { getContent } from "@/lib/content";
import { getPricing } from "@/lib/settings";
import { prisma } from "@/lib/db";
import { getAvailabilityMap } from "@/lib/events";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Evenementen",
  description:
    "Bekijk alle aankomende toerritten, Mazda Meetings en clubevenementen van MazdaClub Nederland. Leden rijden gratis mee; niet-leden betalen een kleine bijdrage per evenement.",
  alternates: { canonical: "/evenementen" },
};

const monthFormatter = new Intl.DateTimeFormat("nl-NL", { month: "long", year: "numeric", timeZone: "Europe/Amsterdam" });

export default async function EventsPage({ searchParams }: { searchParams: Promise<{ periode?: string }> }) {
  const { periode } = await searchParams;
  const past = periode === "afgelopen";
  const now = new Date();

  const [content, pricing] = await Promise.all([getContent(), getPricing()]);
  const events = await prisma.event.findMany({
    where: {
      status: { in: ["PUBLISHED", "CANCELLED"] },
      startsAt: past ? { lt: now } : { gte: now },
    },
    orderBy: { startsAt: past ? "desc" : "asc" },
    take: past ? 30 : 100,
    include: past ? { albums: { where: { published: true }, select: { slug: true }, take: 1 } } : undefined,
  });

  const availability = past ? {} : await getAvailabilityMap(events);

  // Komende evenementen groeperen per maand
  const groups = new Map<string, typeof events>();
  if (!past) {
    for (const e of events) {
      const key = monthFormatter.format(e.startsAt);
      groups.set(key, [...(groups.get(key) ?? []), e]);
    }
  }

  const tabClass = (active: boolean) =>
    cn(
      "inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-colors",
      active ? "bg-white text-ink" : "text-white/70 hover:bg-white/10 hover:text-white",
    );

  return (
    <>
      <PageHeader
        eyebrow="Agenda"
        title={content.pageEventsTitle}
        description={content.pageEventsText}
        image={content.pageEventsImage || undefined}
        breadcrumbs={[{ label: "Evenementen" }]}
      >
        <nav aria-label="Periode" className="inline-flex rounded-full border border-white/15 bg-white/5 p-1 backdrop-blur-sm">
          <Link href="/evenementen" className={tabClass(!past)} aria-current={!past ? "page" : undefined}>
            <CalendarCheck className="size-4" /> Komend
          </Link>
          <Link href="/evenementen?periode=afgelopen" className={tabClass(past)} aria-current={past ? "page" : undefined}>
            <History className="size-4" /> Afgelopen
          </Link>
        </nav>
      </PageHeader>

      <section className="container-site py-14 sm:py-20">
        {events.length === 0 ? (
          <EmptyState
            icon={<CalendarX />}
            title={past ? "Nog geen afgelopen evenementen" : "Er staan nog geen nieuwe evenementen gepland"}
            description={
              past
                ? "Zodra er evenementen hebben plaatsgevonden, vind je ze hier terug, inclusief de foto's."
                : "De nieuwe agenda wordt binnenkort bekendgemaakt. Volg ons op social media of word lid om als eerste op de hoogte te zijn."
            }
            action={
              <Button asChild>
                <Link href={past ? "/evenementen" : "/lid-worden"}>{past ? "Bekijk komende evenementen" : "Word lid"}</Link>
              </Button>
            }
          />
        ) : past ? (
          <div className="grid gap-4 md:grid-cols-2">
            {events.map((e) => (
              <PastEventCard
                key={e.id}
                event={{
                  slug: e.slug,
                  title: e.title,
                  startsAt: e.startsAt,
                  locationName: e.locationName,
                  city: e.city,
                  imageUrl: e.imageUrl,
                  status: e.status,
                  albumSlug: "albums" in e && Array.isArray(e.albums) ? (e.albums[0]?.slug ?? null) : null,
                }}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-16">
            {[...groups.entries()].map(([month, list]) => (
              <div key={month}>
                <div className="mb-6 flex items-center gap-4">
                  <h2 className="font-display text-2xl font-bold uppercase tracking-tight first-letter:uppercase">{month}</h2>
                  <span className="h-px flex-1 bg-border" />
                  <span className="text-sm text-muted-foreground">
                    {list.length} {list.length === 1 ? "evenement" : "evenementen"}
                  </span>
                </div>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {list.map((e) => (
                    <EventCard key={e.id} event={{ ...e, availableSeats: availability[e.id] ?? e.capacity }} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="container-site">
        <div className="flex flex-col items-start justify-between gap-6 rounded-3xl border border-border bg-surface p-8 sm:p-10 md:flex-row md:items-center">
          <div>
            <h2 className="heading-md">Gratis meerijden met al onze evenementen?</h2>
            <p className="mt-2 max-w-2xl text-muted-foreground">
              Als lid van MazdaClub Nederland neem je gratis deel aan alle ritten en evenementen en krijg je {pricing.memberDiscountPercent}% korting in de webshop.
            </p>
          </div>
          <Button asChild size="lg">
            <Link href="/lid-worden">
              Word lid <ArrowRight />
            </Link>
          </Button>
        </div>
      </section>
    </>
  );
}
