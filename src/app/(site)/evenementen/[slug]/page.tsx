import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, Camera, CheckCircle2, Clock, ExternalLink, MapPin, Timer, Users } from "lucide-react";
import { auth } from "@/auth";
import { AddToCalendar } from "@/components/events/add-to-calendar";
import { RegistrationForm } from "@/components/events/registration-form";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/form-controls";
import { RichText } from "@/components/ui/rich-text";
import { calendarLinks } from "@/lib/calendar";
import { prisma } from "@/lib/db";
import { getAvailableSeats, isRegistrationOpen } from "@/lib/events";
import { getContent } from "@/lib/content";
import { isMembershipActive } from "@/lib/membership";
import { eventPriceFor } from "@/lib/pricing";
import { formatDate, formatDateTime, formatPrice, formatTime, siteUrl } from "@/lib/utils";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string }>; searchParams: Promise<{ ingeschreven?: string; extra?: string }> };

export async function generateMetadata({ params }: Pick<Params, "params">): Promise<Metadata> {
  const { slug } = await params;
  const event = await prisma.event.findUnique({
    where: { slug },
    select: { title: true, summary: true, imageUrl: true, status: true, startsAt: true, city: true },
  });
  if (!event || event.status === "DRAFT") return { title: "Evenement niet gevonden", robots: { index: false } };
  const description = `${formatDate(event.startsAt)} in ${event.city}. ${event.summary}`;
  return {
    title: event.title,
    description,
    alternates: { canonical: `/evenementen/${slug}` },
    openGraph: {
      type: "article",
      title: event.title,
      description,
      images: event.imageUrl ? [{ url: event.imageUrl, alt: event.title }] : undefined,
    },
  };
}

function sameDay(a: Date, b: Date) {
  return formatDate(a) === formatDate(b);
}

export default async function EventDetailPage({ params, searchParams }: Params) {
  const [{ slug }, { ingeschreven, extra }, session] = await Promise.all([params, searchParams, auth()]);
  const isAdmin = session?.user?.role === "ADMIN";

  const event = await prisma.event.findUnique({
    where: { slug },
    include: {
      albums: {
        where: { published: true },
        select: { slug: true, title: true, _count: { select: { photos: true } } },
        orderBy: { date: "desc" },
      },
    },
  });
  if (!event || (event.status === "DRAFT" && !isAdmin)) notFound();

  const user = session?.user?.id
    ? await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { firstName: true, lastName: true, email: true, phone: true, licensePlate: true, membership: { select: { status: true, currentPeriodEnd: true } } },
      })
    : null;
  const isMember = isMembershipActive(user?.membership);
  const price = eventPriceFor(event, isMember);

  const now = new Date();
  const [availableSeats, myRegistration] = await Promise.all([
    getAvailableSeats(event),
    session?.user?.id && user
      ? prisma.eventRegistration.findFirst({
          where: { eventId: event.id, status: "CONFIRMED", OR: [{ userId: session.user.id }, { email: user.email }] },
          select: { id: true },
        })
      : Promise.resolve(null),
  ]);
  const isPast = event.startsAt < now;
  const open = isRegistrationOpen(event, now);
  const full = availableSeats <= 0;
  const justRegistered = ingeschreven === "1";
  const isUpcomingPublished = event.status === "PUBLISHED" && !isPast;
  const links = isUpcomingPublished ? calendarLinks(event) : null;
  const registeringSomeoneElse = extra === "1";
  const showRegistered = !justRegistered && !!myRegistration && isUpcomingPublished && !registeringSomeoneElse;
  const image = event.imageUrl || (await getContent()).pageEventsImage || undefined;

  const timeLabel = event.endsAt
    ? sameDay(event.startsAt, event.endsAt)
      ? `${formatTime(event.startsAt)} – ${formatTime(event.endsAt)} uur`
      : `${formatTime(event.startsAt)} uur t/m ${formatDateTime(event.endsAt)}`
    : `Vanaf ${formatTime(event.startsAt)} uur`;
  const fullAddress = [event.locationName, event.address, event.city].filter(Boolean).join(", ");
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.title,
    description: event.summary,
    startDate: event.startsAt.toISOString(),
    ...(event.endsAt ? { endDate: event.endsAt.toISOString() } : {}),
    eventStatus: event.status === "CANCELLED" ? "https://schema.org/EventCancelled" : "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    image: [image],
    location: {
      "@type": "Place",
      name: event.locationName,
      address: { "@type": "PostalAddress", streetAddress: event.address ?? undefined, addressLocality: event.city, addressCountry: "NL" },
    },
    organizer: { "@type": "Organization", name: "MazdaClub Nederland", url: siteUrl() },
    offers: [
      {
        "@type": "Offer",
        name: "Deelname niet-leden",
        price: (event.priceNonMember / 100).toFixed(2),
        priceCurrency: "EUR",
        availability: full ? "https://schema.org/SoldOut" : "https://schema.org/InStock",
        url: siteUrl(`/evenementen/${event.slug}`),
        validFrom: event.createdAt.toISOString(),
      },
    ],
  };

  const facts = [
    { icon: CalendarDays, label: "Datum", value: formatDate(event.startsAt, { weekday: "long" }) },
    { icon: Clock, label: "Tijd", value: timeLabel },
    { icon: MapPin, label: "Locatie", value: `${event.locationName}, ${event.city}` },
    { icon: Users, label: "Plaatsen", value: isPast ? `${event.capacity} deelnemers` : full ? "Volgeboekt" : `${availableSeats} van ${event.capacity} beschikbaar` },
  ];

  let disabledReason: string | undefined;
  if (!open && !isPast) disabledReason = "De inschrijving voor dit evenement is gesloten.";
  else if (full) disabledReason = "Dit evenement is volgeboekt. Neem contact met ons op om op de wachtlijst te komen.";

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />

      <PageHeader
        eyebrow={formatDateTime(event.startsAt)}
        title={event.title}
        description={event.summary}
        image={image}
        breadcrumbs={[{ label: "Evenementen", href: "/evenementen" }, { label: event.title }]}
      >
        <div className="flex flex-wrap items-center gap-2">
          {event.status === "DRAFT" && <Badge variant="warning">Concept – alleen zichtbaar voor beheerders</Badge>}
          {event.status === "CANCELLED" && <Badge variant="dark">Geannuleerd</Badge>}
          {event.status === "PUBLISHED" && !isPast && full && <Badge variant="dark">Volgeboekt</Badge>}
          {event.status === "PUBLISHED" && !isPast && !full && <Badge>Nog {availableSeats} plaatsen</Badge>}
          {isPast && <Badge variant="secondary">Afgelopen</Badge>}
          <Badge variant="outline" className="border-white/30 text-white">
            Leden {event.priceMember === 0 ? "gratis" : formatPrice(event.priceMember)} · Niet-leden {formatPrice(event.priceNonMember)}
          </Badge>
        </div>
      </PageHeader>

      <div className="container-site grid gap-10 py-12 lg:grid-cols-[minmax(0,1fr)_420px] lg:gap-14 lg:py-16">
        <div className="min-w-0">
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {facts.map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-start gap-3 rounded-xl border border-border p-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent text-primary">
                  <Icon className="size-5" />
                </span>
                <div className="min-w-0">
                  <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</dt>
                  <dd className="mt-0.5 font-semibold first-letter:uppercase">{value}</dd>
                </div>
              </div>
            ))}
          </dl>

          {links && (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <AddToCalendar links={links} variant="compact" />
              <Button asChild variant="ghost" size="sm" className="h-9">
                <a href={mapsUrl} target="_blank" rel="noopener noreferrer">
                  <MapPin /> Route plannen
                </a>
              </Button>
            </div>
          )}

          <h2 className="heading-md mt-12">Over dit evenement</h2>
          <RichText value={event.description} className="mt-2" />

          <div className="mt-10 rounded-2xl bg-surface p-6">
            <h2 className="font-display text-lg font-bold uppercase tracking-tight">Praktische informatie</h2>
            <ul className="mt-4 space-y-3 text-sm">
              <li className="flex gap-3">
                <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>
                  {fullAddress}
                  <br />
                  <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
                    Route plannen <ExternalLink className="size-3.5" />
                  </a>
                </span>
              </li>
              {event.registrationDeadline && (
                <li className="flex gap-3">
                  <Timer className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span>Inschrijven kan tot {formatDateTime(event.registrationDeadline)}.</span>
                </li>
              )}
              <li className="flex gap-3">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                <span>
                  Leden nemen {event.priceMember === 0 ? "gratis" : `voor ${formatPrice(event.priceMember)}`} deel; niet-leden betalen{" "}
                  {formatPrice(event.priceNonMember)}. Na inschrijving ontvang je direct een bevestiging per e-mail.
                </span>
              </li>
            </ul>
          </div>

          {event.albums.length > 0 && (
            <div className="mt-10 space-y-3">
              {event.albums.map((album) => (
                <Link
                  key={album.slug}
                  href={`/fotogalerij/${album.slug}`}
                  className="group flex items-center justify-between gap-4 rounded-2xl border border-border p-5 transition-colors hover:border-primary/40 hover:bg-accent/40"
                >
                  <span className="flex items-center gap-4">
                    <span className="flex size-11 items-center justify-center rounded-full bg-ink text-white">
                      <Camera className="size-5" />
                    </span>
                    <span>
                      <span className="block font-semibold">{album.title}</span>
                      <span className="text-sm text-muted-foreground">{album._count.photos} foto's</span>
                    </span>
                  </span>
                  <span className="text-sm font-semibold text-primary group-hover:underline">Bekijk album →</span>
                </Link>
              ))}
            </div>
          )}

          <Link href="/evenementen" className="mt-10 inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-ink">
            <ArrowLeft className="size-4" /> Terug naar alle evenementen
          </Link>
        </div>

        <aside id="inschrijven" className="h-fit scroll-mt-28 lg:sticky lg:top-28">
          <div className="rounded-2xl border border-border bg-white p-6 shadow-[0_20px_50px_-25px_rgba(0,0,0,0.25)] sm:p-7">
            <h2 className="font-display text-xl font-bold uppercase tracking-tight">
              {justRegistered
                ? "Inschrijving gelukt"
                : showRegistered
                  ? "Je bent aangemeld"
                  : isPast
                    ? "Afgelopen evenement"
                    : registeringSomeoneElse
                      ? "Iemand anders inschrijven"
                      : "Inschrijven"}
            </h2>
            <div className="mt-5">
              {justRegistered || showRegistered ? (
                <div className="space-y-4">
                  <Alert variant="success">
                    {justRegistered ? (
                      <>
                        <strong className="font-semibold">Je bent ingeschreven!</strong> We hebben een bevestiging naar je e-mailadres gestuurd.
                        Tot {formatDate(event.startsAt)}!
                      </>
                    ) : (
                      <>
                        <strong className="font-semibold">Je inschrijving is bevestigd.</strong> We zien je graag op {formatDate(event.startsAt)}!
                      </>
                    )}
                  </Alert>
                  {links && <AddToCalendar links={links} className="p-4 sm:p-5" />}
                  {isUpcomingPublished && open && !full && (
                    <Button asChild variant="outline" className="w-full">
                      <Link href={`/evenementen/${event.slug}?extra=1#inschrijven`}>Nog iemand inschrijven</Link>
                    </Button>
                  )}
                  {session?.user && (
                    <Button asChild variant="ghost" className="w-full">
                      <Link href="/account?tab=inschrijvingen">Mijn inschrijvingen</Link>
                    </Button>
                  )}
                </div>
              ) : event.status === "CANCELLED" ? (
                <Alert variant="warning">Dit evenement is helaas geannuleerd. Ingeschreven deelnemers zijn per e-mail geïnformeerd.</Alert>
              ) : isPast ? (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">Dit evenement heeft op {formatDate(event.startsAt)} plaatsgevonden.</p>
                  {event.albums[0] ? (
                    <Button asChild className="w-full">
                      <Link href={`/fotogalerij/${event.albums[0].slug}`}>
                        <Camera /> Bekijk de foto's
                      </Link>
                    </Button>
                  ) : (
                    <Button asChild variant="outline" className="w-full">
                      <Link href="/evenementen">Bekijk komende evenementen</Link>
                    </Button>
                  )}
                </div>
              ) : (
                <RegistrationForm
                  slug={event.slug}
                  price={price}
                  nonMemberPrice={event.priceNonMember}
                  isMember={isMember}
                  isLoggedIn={!!user}
                  disabledReason={disabledReason}
                  defaults={
                    user && !registeringSomeoneElse
                      ? {
                          firstName: user.firstName,
                          lastName: user.lastName,
                          email: user.email,
                          phone: user.phone ?? undefined,
                          licensePlate: user.licensePlate ?? undefined,
                        }
                      : undefined
                  }
                />
              )}
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}
