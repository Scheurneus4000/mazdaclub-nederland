import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CalendarCheck, CalendarDays, Camera, Gift, Handshake, MapPin, MessagesSquare, Percent, Route, Tent } from "lucide-react";
import { auth } from "@/auth";
import { EventCard } from "@/components/events/event-card";
import { LightboxGallery, type GalleryPhoto } from "@/components/gallery/lightbox-gallery";
import { Hero } from "@/components/home/hero";
import { EmptyState } from "@/components/layout/page-header";
import { LatestNews } from "@/components/news/latest-news";
import { ProductCard } from "@/components/shop/product-card";
import { Button } from "@/components/ui/button";
import { getContent, heroImagesFrom } from "@/lib/content";
import { prisma } from "@/lib/db";
import { getAvailabilityMap, getUpcomingEvents } from "@/lib/events";
import { isActiveMember } from "@/lib/membership";
import { getLatestNews } from "@/lib/news";
import type { Pricing } from "@/lib/pricing";
import { getPricing } from "@/lib/settings";
import { productCardInclude, toProductCard } from "@/lib/shop";
import { formatDate, formatPrice, formatTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

const numberFormat = new Intl.NumberFormat("nl-NL");

async function loadHomeData() {
  const now = new Date();
  try {
    const [events, photos, products, memberCount, eventCount, nextMeeting, news] = await Promise.all([
      getUpcomingEvents(3),
      prisma.photo.findMany({
        where: { album: { published: true } },
        orderBy: [{ album: { date: "desc" } }, { sortOrder: "asc" }],
        take: 8,
        include: { album: { select: { title: true } } },
      }),
      prisma.product.findMany({ where: { active: true, featured: true }, include: productCardInclude, take: 4, orderBy: { updatedAt: "desc" } }),
      // Kerncijfers groeien automatisch mee met echte gegevens
      prisma.membership.count({ where: { status: "ACTIVE", currentPeriodEnd: { gt: now } } }),
      prisma.event.count({ where: { status: "PUBLISHED" } }),
      prisma.event.findFirst({
        where: { status: "PUBLISHED", startsAt: { gte: now }, title: { contains: "meeting", mode: "insensitive" } },
        orderBy: { startsAt: "asc" },
        select: { slug: true, title: true, startsAt: true, locationName: true, city: true },
      }),
      getLatestNews(3),
    ]);
    const availability = await getAvailabilityMap(events);
    return {
      events: events.map((e) => ({ ...e, availableSeats: availability[e.id] ?? 0 })),
      photos,
      products,
      memberCount,
      eventCount,
      nextMeeting,
      news,
    };
  } catch (err) {
    console.error("[home] database niet bereikbaar", err);
    return { events: [], photos: [], products: [], memberCount: 0, eventCount: 0, nextMeeting: null, news: [] };
  }
}

function benefitsFor(pricing: Pricing) {
  const discount = `${pricing.memberDiscountPercent}%`;
  return [
    {
      icon: CalendarCheck,
      title: "Gratis evenementen",
      text: `Als lid rijd je gratis mee met alle clubritten en evenementen. Niet-leden betalen ${formatPrice(pricing.eventPriceNonMemberCents)} per evenement.`,
    },
    { icon: Percent, title: `${discount} webshopkorting`, text: `Automatisch ${discount} korting op alle MazdaClub-artikelen in onze webshop.` },
    { icon: Gift, title: "Exclusieve ledenvoordelen", text: "Toegang tot toekomstige exclusieve acties, ledenavonden en primeurs." },
    { icon: Handshake, title: "Partneraanbiedingen", text: "Speciale aanbiedingen bij garages, specialisten en partners van de club." },
  ];
}

export default async function HomePage() {
  const [content, session, data, pricing] = await Promise.all([getContent(), auth(), loadHomeData(), getPricing()]);
  const benefits = benefitsFor(pricing);
  const membershipPrice = formatPrice(pricing.membershipPriceCents);
  const isMember = await isActiveMember(session?.user?.id).catch(() => false);

  const galleryPhotos: GalleryPhoto[] = data.photos.map((p) => ({
    id: p.id,
    url: p.url,
    thumbUrl: p.thumbUrl,
    width: p.width,
    height: p.height,
    caption: p.caption ?? p.album.title,
  }));

  const activities = [
    { icon: Route, title: content.activity1Title, text: content.activity1Text },
    { icon: MessagesSquare, title: content.activity2Title, text: content.activity2Text },
    { icon: Tent, title: content.activity3Title, text: content.activity3Text },
    { icon: Camera, title: content.activity4Title, text: content.activity4Text },
  ].filter((a) => a.title);

  const stats = [
    { value: numberFormat.format(data.memberCount), label: content.statMembersLabel },
    { value: numberFormat.format(data.eventCount), label: content.statEventsLabel },
    { value: content.statFounded, label: content.statFoundedLabel },
    { value: content.statRides, label: content.statRidesLabel },
  ].filter((s) => s.value && s.label);

  return (
    <>
      <Hero images={heroImagesFrom(content)} eyebrow={content.heroEyebrow} title={content.heroTitle} subtitle={content.heroSubtitle} stats={stats} />

      {/* ─── Over de club ─── */}
      <section id="over-de-club" className="scroll-mt-20 py-20 sm:py-28">
        <div className="container-site grid items-center gap-14 lg:grid-cols-2 lg:gap-20">
          <div className="relative">
            <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-ink">
              {content.aboutImage && (
                <Image src={content.aboutImage} alt="Leden van MazdaClub Nederland met hun Mazda" fill sizes="(min-width: 1024px) 45vw, 100vw" className="object-cover" />
              )}
            </div>
            {content.aboutImageSmall && (
              <div className="absolute -right-4 -bottom-8 hidden w-1/2 overflow-hidden rounded-2xl border-8 border-white shadow-xl sm:block lg:-right-10">
                <div className="relative aspect-square">
                  <Image src={content.aboutImageSmall} alt="" fill sizes="25vw" className="object-cover" />
                </div>
              </div>
            )}
            {content.statFounded && (
              <div className="absolute top-6 -left-3 rounded-xl bg-primary px-5 py-4 text-white shadow-lg sm:-left-6">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/80">Opgericht in</p>
                <p className="mt-1 font-display text-3xl font-bold leading-none">{content.statFounded}</p>
              </div>
            )}
          </div>

          <div>
            <p className="eyebrow">Over de club</p>
            <h2 className="heading-lg mt-4">{content.aboutTitle}</h2>
            <p className="mt-6 whitespace-pre-line text-base leading-relaxed text-muted-foreground sm:text-lg">{content.aboutText}</p>
            {content.mission && (
              <blockquote className="mt-8 border-l-4 border-primary bg-accent/60 py-4 pr-4 pl-5 text-[15px] italic leading-relaxed text-ink/80">
                {content.mission}
              </blockquote>
            )}
            <ul className="mt-10 grid gap-6 sm:grid-cols-2">
              {activities.map(({ icon: Icon, title, text }) => (
                <li key={title} className="flex gap-4">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-ink text-white">
                    <Icon className="size-5" />
                  </span>
                  <div>
                    <h3 className="font-semibold">{title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{text}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ─── Maandelijkse Mazda Meetings ─── */}
      <section id="mazda-meetings" className="scroll-mt-20 pb-20 sm:pb-28">
        <div className="container-site">
          <div className="relative isolate overflow-hidden rounded-3xl bg-ink text-white">
            <div className={content.meetingsImage ? "grid lg:grid-cols-[1.1fr_1fr]" : ""}>
              <div className="relative z-10 p-8 sm:p-12 lg:p-16">
                {!content.meetingsImage && <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_right,rgba(192,0,0,0.4),transparent_60%)]" />}
                <p className="eyebrow">{content.meetingsEyebrow}</p>
                <h2 className="heading-lg mt-4">{content.meetingsTitle}</h2>
                <p className="mt-6 max-w-2xl whitespace-pre-line text-base leading-relaxed text-white/75 sm:text-lg">{content.meetingsText}</p>

                {data.nextMeeting ? (
                  <Link
                    href={`/evenementen/${data.nextMeeting.slug}`}
                    className="group mt-8 flex max-w-xl items-center gap-4 rounded-2xl border border-white/15 bg-white/5 p-4 transition-colors hover:border-primary hover:bg-white/10"
                  >
                    <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary">
                      <CalendarDays className="size-6" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs font-semibold uppercase tracking-[0.16em] text-white/60">Eerstvolgende meeting</span>
                      <span className="mt-0.5 block font-semibold">
                        {formatDate(data.nextMeeting.startsAt)} · {formatTime(data.nextMeeting.startsAt)} uur
                      </span>
                      <span className="mt-0.5 flex items-center gap-1 text-sm text-white/70">
                        <MapPin className="size-3.5 shrink-0" /> {data.nextMeeting.locationName}, {data.nextMeeting.city}
                      </span>
                    </span>
                    <ArrowRight className="size-5 shrink-0 transition-transform group-hover:translate-x-1" />
                  </Link>
                ) : null}

                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Button asChild size="lg">
                    <Link href="/evenementen">
                      Bekijk de agenda <ArrowRight />
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="outline-light">
                    <Link href="/lid-worden">Word lid</Link>
                  </Button>
                </div>
              </div>
              {content.meetingsImage && (
                <div className="relative min-h-72 lg:min-h-full">
                  <Image src={content.meetingsImage} alt="Mazda Meeting van MazdaClub Nederland" fill sizes="(min-width: 1024px) 45vw, 100vw" className="object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-ink/60 to-transparent lg:bg-gradient-to-r lg:from-ink lg:via-ink/20 lg:to-transparent" />
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ─── Ledenvoordelen ─── */}
      <section className="bg-surface py-20 sm:py-28">
        <div className="container-site">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div className="max-w-2xl">
              <p className="eyebrow">Lidmaatschap</p>
              <h2 className="heading-lg mt-4">{content.benefitsTitle}</h2>
              {content.benefitsIntro && <p className="mt-4 text-muted-foreground">{content.benefitsIntro}</p>}
            </div>
            <Button asChild size="lg">
              <Link href="/lid-worden">
                Word lid voor {membershipPrice} <ArrowRight />
              </Link>
            </Button>
          </div>
          <ul className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {benefits.map(({ icon: Icon, title, text }) => (
              <li key={title} className="group rounded-2xl border border-border bg-white p-7 transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-lg">
                <span className="flex size-12 items-center justify-center rounded-xl bg-accent text-primary transition-colors group-hover:bg-primary group-hover:text-white">
                  <Icon className="size-6" />
                </span>
                <h3 className="mt-6 font-display text-lg font-bold uppercase tracking-tight">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ─── Foto's van ritten ─── */}
      <section className="py-20 sm:py-28">
        <div className="container-site">
          <div className="mb-10 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="eyebrow">Fotogalerij</p>
              <h2 className="heading-lg mt-4">{content.photosTitle}</h2>
            </div>
            <Link href="/fotogalerij" className="group inline-flex items-center gap-2 text-sm font-semibold text-primary">
              Alle albums bekijken <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
          {galleryPhotos.length > 0 ? (
            <LightboxGallery photos={galleryPhotos} variant="mosaic" />
          ) : (
            <EmptyState
              icon={<Camera />}
              title="Binnenkort de eerste foto's"
              description="Na de eerstvolgende rit of meeting vind je hier de mooiste foto's van onze leden en hun Mazda's."
              action={
                content.instagramUrl ? (
                  <Button asChild variant="outline">
                    <a href={content.instagramUrl} target="_blank" rel="noopener noreferrer">
                      Volg ons op Instagram
                    </a>
                  </Button>
                ) : undefined
              }
            />
          )}
        </div>
      </section>

      {/* ─── Komende evenementen ─── */}
      <section className="bg-ink py-20 text-white sm:py-28">
        <div className="container-site">
          <div className="mb-12 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="eyebrow">Agenda</p>
              <h2 className="heading-lg mt-4">{content.eventsTitle}</h2>
              {content.eventsIntro && <p className="mt-4 max-w-xl text-white/60">{content.eventsIntro}</p>}
            </div>
            <Button asChild variant="outline-light">
              <Link href="/evenementen">
                Alle evenementen <ArrowRight />
              </Link>
            </Button>
          </div>
          {data.events.length > 0 ? (
            <div className="grid gap-6 text-foreground md:grid-cols-2 lg:grid-cols-3">
              {data.events.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          ) : (
            <p className="rounded-2xl border border-white/10 p-10 text-center text-white/60">
              De nieuwe agenda wordt binnenkort bekendgemaakt. Volg ons op social media om niets te missen.
            </p>
          )}
        </div>
      </section>

      {/* ─── Nieuws (alleen zichtbaar als er gepubliceerd nieuws is) ─── */}
      <LatestNews posts={data.news} />

      {/* ─── Webshop (alleen zichtbaar met uitgelichte producten) ─── */}
      {data.products.length > 0 && (
        <section className={data.news.length > 0 ? "bg-surface py-20 sm:py-28" : "py-20 sm:py-28"}>
          <div className="container-site">
            <div className="mb-10 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <p className="eyebrow">Webshop</p>
                <h2 className="heading-lg mt-4">{content.shopTitle}</h2>
                {!isMember && <p className="mt-4 text-muted-foreground">Leden krijgen automatisch {pricing.memberDiscountPercent}% korting op alle artikelen.</p>}
              </div>
              <Link href="/webshop" className="group inline-flex items-center gap-2 text-sm font-semibold text-primary">
                Bezoek de webshop <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-x-5 gap-y-10 lg:grid-cols-4">
              {data.products.map((p) => (
                <ProductCard key={p.id} product={toProductCard(p)} isMember={isMember} discountPercent={pricing.memberDiscountPercent} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── CTA ─── */}
      <section className="container-site pt-4">
        <div className="relative isolate overflow-hidden rounded-3xl bg-primary px-6 py-16 text-white sm:px-14 sm:py-20">
          {content.ctaImage && <Image src={content.ctaImage} alt="" fill sizes="100vw" className="-z-10 object-cover opacity-20 mix-blend-multiply" />}
          <div className="grid items-center gap-8 lg:grid-cols-[1fr_auto]">
            <div>
              <h2 className="heading-lg">{content.ctaTitle}</h2>
              {content.ctaText && <p className="mt-4 max-w-2xl text-white/85">{content.ctaText}</p>}
            </div>
            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
              <Button asChild size="lg" variant="dark">
                <Link href="/lid-worden">Word lid – {membershipPrice} per jaar</Link>
              </Button>
              <Button asChild size="lg" variant="outline-light">
                <Link href="/contact">Stel een vraag</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
