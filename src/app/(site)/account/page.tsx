import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import type { OrderStatus, RegistrationStatus } from "@prisma/client";
import {
  ArrowRight,
  CalendarCheck,
  CalendarDays,
  Camera,
  Download,
  ExternalLink,
  Gift,
  Handshake,
  Lock,
  MapPin,
  Package,
  Percent,
  ShoppingBag,
  Sparkles,
  Truck,
  UserRound,
} from "lucide-react";
import { AccountTabs, TabLink } from "@/components/account/account-tabs";
import { CancelRenewalButton } from "@/components/account/cancel-renewal-button";
import { DeleteAccountDialog } from "@/components/account/delete-account-dialog";
import { MemberCard, membershipStatusBadge } from "@/components/account/member-card";
import { PasswordForm } from "@/components/account/password-form";
import { ProfileForm } from "@/components/account/profile-form";
import { isAccountTab } from "@/components/account/tabs-config";
import { AddToCalendar } from "@/components/events/add-to-calendar";
import { CookieSettingsButton } from "@/components/layout/cookie-banner";
import { EmptyState, PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/form-controls";
import { TabsContent } from "@/components/ui/tabs";
import { calendarLinks, type CalendarLinks } from "@/lib/calendar";
import { prisma } from "@/lib/db";
import { EmailVerificationBanner } from "@/components/account/email-verification-banner";
import { getContent } from "@/lib/content";
import { membershipView } from "@/lib/membership";
import { isOwnerEmail } from "@/lib/owner";
import { orderStatusLabels } from "@/lib/orders";
import { paymentStatusLabels } from "@/lib/payments";
import { getPricing } from "@/lib/settings";
import { requireUser } from "@/lib/session";
import { dateBadge, formatDate, formatDateTime, formatPrice } from "@/lib/utils";

export const metadata: Metadata = { title: "Mijn Account", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const orderBadge: Record<OrderStatus, "warning" | "info" | "success" | "secondary" | "danger"> = {
  PENDING: "warning",
  PAID: "info",
  PROCESSING: "info",
  SHIPPED: "success",
  COMPLETED: "success",
  CANCELLED: "secondary",
  REFUNDED: "secondary",
};

const registrationBadge: Record<RegistrationStatus, { label: string; variant: "success" | "warning" | "secondary" }> = {
  CONFIRMED: { label: "Bevestigd", variant: "success" },
  PENDING: { label: "Wacht op betaling", variant: "warning" },
  CANCELLED: { label: "Geannuleerd", variant: "secondary" },
};

const paymentMethodLabels: Record<string, string> = {
  ideal: "iDEAL",
  bancontact: "Bancontact",
  creditcard: "Creditcard",
  card: "Creditcard",
  applepay: "Apple Pay",
  googlepay: "Google Pay",
  paypal: "PayPal",
  directdebit: "Automatische incasso",
};

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const user = await requireUser("/account");
  const { tab } = await searchParams;
  const initialTab = isAccountTab(tab) ? tab : "overzicht";
  const now = new Date();
  const view = membershipView(user.membership);
  const [{ ctaImage, logoInvertedUrl, logoUrl }, pricing] = await Promise.all([getContent(), getPricing()]);
  const cardLogo = logoInvertedUrl || logoUrl || undefined;
  const membershipPrice = formatPrice(pricing.membershipPriceCents);
  const discount = `${pricing.memberDiscountPercent}%`;

  const [orders, registrations, membershipPayments, offers] = await Promise.all([
    prisma.order.findMany({ where: { userId: user.id }, include: { items: true }, orderBy: { createdAt: "desc" }, take: 100 }),
    prisma.eventRegistration.findMany({
      where: { userId: user.id },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            slug: true,
            summary: true,
            startsAt: true,
            endsAt: true,
            locationName: true,
            address: true,
            city: true,
            imageUrl: true,
            status: true,
          },
        },
      },
      orderBy: { event: { startsAt: "asc" } },
      take: 200,
    }),
    user.membership
      ? prisma.payment.findMany({ where: { membershipId: user.membership.id }, orderBy: { createdAt: "desc" }, take: 20 })
      : Promise.resolve([]),
    prisma.partnerOffer.findMany({
      where: { active: true, OR: [{ validUntil: null }, { validUntil: { gte: now } }] },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const upcoming = registrations.filter((r) => r.event.startsAt >= now && r.status !== "CANCELLED");
  const past = registrations.filter((r) => r.event.startsAt < now || r.status === "CANCELLED").reverse();
  const nextEvent = upcoming.find((r) => r.status === "CONFIRMED");
  const fullName = `${user.firstName} ${user.lastName}`;
  const validUntil = view.currentPeriodEnd ? formatDate(view.currentPeriodEnd) : "";

  return (
    <>
      <PageHeader
        eyebrow="Mijn Account"
        title={`Hoi ${user.firstName}!`}
        description={
          view.active
            ? `Fijn dat je lid bent van MazdaClub Nederland. Je lidmaatschap is geldig tot en met ${validUntil}.`
            : `Beheer hier je gegevens, bestellingen en inschrijvingen. Word lid om gratis mee te rijden en ${discount} korting te krijgen.`
        }
        breadcrumbs={[{ label: "Mijn Account" }]}
      />

      {!user.emailVerifiedAt && (
        <div className="container-site pt-8">
          <EmailVerificationBanner email={user.email} isOwner={isOwnerEmail(user.email)} />
        </div>
      )}

      <section className="container-site py-10 sm:py-14">
        <AccountTabs initialTab={initialTab}>
          {/* ─── Overzicht ─── */}
          <TabsContent value="overzicht" className="grid gap-6 lg:grid-cols-3">
            <div className="space-y-4">
              <MemberCard name={fullName} view={view} logoSrc={cardLogo} />
              {!view.active && (
                <div className="rounded-2xl border border-primary/25 bg-accent/50 p-5">
                  <p className="text-sm font-semibold">{view.status === "NONE" ? "Je hebt een gratis account" : "Je lidmaatschap is niet actief"}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {view.status === "NONE"
                      ? `Upgrade op ieder moment naar betaald lid, op dit account. Je rijdt dan gratis mee en krijgt ${discount} korting in de webshop.`
                      : "Verleng je lidmaatschap en geniet direct weer van al je voordelen."}
                  </p>
                  <Button asChild className="mt-4 w-full" size="lg">
                    <Link href="/lid-worden#aanmelden">
                      {view.status === "NONE" ? `Word betaald lid – ${membershipPrice} per jaar` : "Lidmaatschap verlengen"} <ArrowRight />
                    </Link>
                  </Button>
                </div>
              )}
            </div>

            <div className="space-y-6 lg:col-span-2">
              <div className="grid gap-4 sm:grid-cols-3">
                <StatTile icon={<Package />} label="Bestellingen" value={String(orders.length)} tab="bestellingen" />
                <StatTile icon={<CalendarDays />} label="Komende ritten" value={String(upcoming.length)} tab="inschrijvingen" />
                <StatTile
                  icon={<Sparkles />}
                  label="Lidmaatschap"
                  value={view.active ? `${view.daysLeft} dagen` : view.status === "NONE" ? "Geen" : "Inactief"}
                  tab="lidmaatschap"
                />
              </div>

              <Card>
                <CardHeader className="pb-4">
                  <CardTitle>Je volgende rit</CardTitle>
                </CardHeader>
                <CardContent>
                  {nextEvent ? (
                    <Link href={`/evenementen/${nextEvent.event.slug}`} className="group flex items-center gap-4 rounded-xl border border-border p-3 transition-colors hover:border-primary/40 hover:bg-accent/40">
                      <div className="relative size-20 shrink-0 overflow-hidden rounded-lg bg-muted sm:size-24">
                        {nextEvent.event.imageUrl && <Image src={nextEvent.event.imageUrl} alt="" fill sizes="96px" className="object-cover" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold uppercase tracking-wider text-primary">{formatDateTime(nextEvent.event.startsAt)}</p>
                        <p className="mt-1 truncate font-display text-lg font-bold uppercase tracking-tight">{nextEvent.event.title}</p>
                        <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                          <MapPin className="size-3.5" /> {nextEvent.event.locationName}, {nextEvent.event.city}
                        </p>
                      </div>
                      <ArrowRight className="hidden size-5 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary sm:block" />
                    </Link>
                  ) : (
                    <div className="flex flex-col items-start justify-between gap-4 rounded-xl bg-surface p-5 sm:flex-row sm:items-center">
                      <p className="text-sm text-muted-foreground">Je hebt je nog niet ingeschreven voor een komend evenement.</p>
                      <Button asChild size="sm">
                        <Link href="/evenementen">Bekijk agenda</Link>
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="grid gap-3 sm:grid-cols-2">
                <QuickLink href="/evenementen" icon={<CalendarCheck />} title="Evenementen" text="Schrijf je in voor de volgende rit" />
                <QuickLink href="/webshop" icon={<ShoppingBag />} title="Webshop" text={view.active ? `Met ${discount} ledenkorting` : "Clubartikelen en accessoires"} />
                <QuickLink href="/fotogalerij" icon={<Camera />} title="Fotogalerij" text="Bekijk en download clubfoto's" />
                <QuickLink href="/account?tab=profiel" icon={<UserRound />} title="Profiel" text="Adres, kenteken en voorkeuren" />
              </div>
            </div>
          </TabsContent>

          {/* ─── Profiel ─── */}
          <TabsContent value="profiel" className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Mijn gegevens</CardTitle>
                <CardDescription>Deze gegevens gebruiken we voor bestellingen, inschrijvingen en je lidmaatschap.</CardDescription>
              </CardHeader>
              <CardContent>
                <ProfileForm
                  defaults={{
                    firstName: user.firstName,
                    lastName: user.lastName,
                    email: user.email,
                    phone: user.phone,
                    street: user.street,
                    houseNumber: user.houseNumber,
                    postalCode: user.postalCode,
                    city: user.city,
                    country: user.country,
                    licensePlate: user.licensePlate,
                    carModel: user.carModel,
                    marketingConsent: user.marketingConsent,
                  }}
                />
              </CardContent>
            </Card>
            <Card className="h-fit">
              <CardHeader>
                <CardTitle>Wachtwoord wijzigen</CardTitle>
                <CardDescription>Gebruik een uniek wachtwoord dat je nergens anders gebruikt.</CardDescription>
              </CardHeader>
              <CardContent>
                <PasswordForm />
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── Lidmaatschap ─── */}
          <TabsContent value="lidmaatschap" className="space-y-6">
            {view.status === "NONE" ? (
              <div className="relative isolate overflow-hidden rounded-3xl bg-ink p-8 text-white sm:p-12">
                {ctaImage && <Image src={ctaImage} alt="" fill sizes="100vw" className="-z-10 object-cover opacity-30" />}
                <p className="eyebrow">Lidmaatschap</p>
                <h2 className="heading-md mt-4 max-w-xl">Word lid en rijd gratis mee met alle evenementen</h2>
                <ul className="mt-6 grid max-w-2xl gap-3 text-sm text-white/80 sm:grid-cols-2">
                  <li className="flex items-center gap-2"><CalendarCheck className="size-4 text-primary" /> Gratis deelname aan evenementen</li>
                  <li className="flex items-center gap-2"><Percent className="size-4 text-primary" /> {discount} korting in de webshop</li>
                  <li className="flex items-center gap-2"><Gift className="size-4 text-primary" /> Exclusieve ledenvoordelen</li>
                  <li className="flex items-center gap-2"><Handshake className="size-4 text-primary" /> Aanbiedingen van partners</li>
                </ul>
                <Button asChild size="lg" className="mt-8">
                  <Link href="/lid-worden">Word lid voor {membershipPrice} per jaar <ArrowRight /></Link>
                </Button>
              </div>
            ) : (
              <div className="grid gap-6 lg:grid-cols-3">
                <MemberCard name={fullName} view={view} logoSrc={cardLogo} />
                <Card className="lg:col-span-2">
                  <CardHeader className="flex-row items-start justify-between gap-4">
                    <div className="space-y-1.5">
                      <CardTitle>Status van je lidmaatschap</CardTitle>
                      <CardDescription>{membershipPrice} per jaar · jaarlijks abonnement</CardDescription>
                    </div>
                    {membershipStatusBadge(view)}
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {view.status === "PENDING" && (
                      <Alert variant="warning">
                        De eerste betaling van je lidmaatschap is nog niet afgerond. Rond de betaling af om je ledenvoordelen te activeren.
                      </Alert>
                    )}
                    {(view.status === "EXPIRED" || view.status === "CANCELLED") && (
                      <Alert variant="error">Je lidmaatschap is niet meer actief. Verleng het om weer van alle voordelen te genieten.</Alert>
                    )}

                    <dl className="grid gap-x-8 gap-y-4 text-sm sm:grid-cols-2">
                      <DetailRow label="Lid sinds" value={user.membership?.startedAt ? formatDate(user.membership.startedAt) : "—"} />
                      <DetailRow
                        label="Huidige periode"
                        value={
                          user.membership?.currentPeriodStart && user.membership.currentPeriodEnd
                            ? `${formatDate(user.membership.currentPeriodStart)} – ${formatDate(user.membership.currentPeriodEnd)}`
                            : "—"
                        }
                      />
                      <DetailRow label="Resterend" value={view.active && view.daysLeft !== null ? `${view.daysLeft} dagen` : "—"} />
                      <DetailRow
                        label="Automatische verlenging"
                        value={
                          view.autoRenew
                            ? view.active
                              ? `Aan – wordt op ${validUntil} verlengd`
                              : "Aan"
                            : "Uit – je verlengt zelf"
                        }
                      />
                    </dl>

                    <div className="flex flex-wrap gap-3 border-t border-border pt-6">
                      {view.status === "PENDING" && (
                        <Button asChild>
                          <Link href="/lid-worden">Betaling afronden</Link>
                        </Button>
                      )}
                      {(view.status === "EXPIRED" || view.status === "CANCELLED") && (
                        <Button asChild>
                          <Link href="/lid-worden">Lidmaatschap verlengen</Link>
                        </Button>
                      )}
                      {view.active && !view.autoRenew && (
                        <Button asChild>
                          <Link href="/lid-worden">Nu verlengen</Link>
                        </Button>
                      )}
                      {view.active && view.autoRenew && <CancelRenewalButton validUntil={validUntil} />}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {membershipPayments.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Betalingen lidmaatschap</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="divide-y divide-border text-sm">
                    {membershipPayments.map((p) => (
                      <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                        <div>
                          <p className="font-medium">{p.isRecurring ? "Automatische verlenging" : p.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(p.paidAt ?? p.createdAt)}
                            {p.method ? ` · ${paymentMethodLabels[p.method] ?? p.method}` : ""}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant={p.status === "PAID" ? "success" : p.status === "OPEN" || p.status === "PENDING" ? "warning" : "secondary"}>
                            {paymentStatusLabels[p.status]}
                          </Badge>
                          <span className="font-semibold">{formatPrice(p.amount)}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ─── Bestellingen ─── */}
          <TabsContent value="bestellingen" className="space-y-5">
            {orders.length === 0 ? (
              <EmptyState
                icon={<Package />}
                title="Nog geen bestellingen"
                description={view.active ? `Als lid krijg je automatisch ${discount} korting op alle artikelen.` : "Bekijk onze clubartikelen, van stickers tot kleding."}
                action={
                  <Button asChild>
                    <Link href="/webshop">Naar de webshop</Link>
                  </Button>
                }
              />
            ) : (
              orders.map((order) => (
                <Card key={order.id}>
                  <CardHeader className="flex-row flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
                    <div>
                      <CardTitle className="font-mono text-base tracking-wide">{order.orderNumber}</CardTitle>
                      <CardDescription>Geplaatst op {formatDateTime(order.createdAt)}</CardDescription>
                    </div>
                    <Badge variant={orderBadge[order.status]}>{orderStatusLabels[order.status]}</Badge>
                  </CardHeader>
                  <CardContent className="grid gap-6 pt-5 md:grid-cols-[1fr_280px]">
                    <ul className="space-y-3 text-sm">
                      {order.items.map((item) => (
                        <li key={item.id} className="flex items-start justify-between gap-4">
                          <div>
                            <p className="font-medium">{item.productName}</p>
                            <p className="text-xs text-muted-foreground">
                              {item.variantName} · {item.quantity} × {formatPrice(item.unitPrice)}
                            </p>
                          </div>
                          <span className="font-medium whitespace-nowrap">{formatPrice(item.lineTotal)}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="space-y-2 rounded-xl bg-surface p-4 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Subtotaal</span>
                        <span>{formatPrice(order.subtotal)}</span>
                      </div>
                      {order.discount > 0 && (
                        <div className="flex justify-between text-primary">
                          <span>Ledenkorting</span>
                          <span>− {formatPrice(order.discount)}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Verzending</span>
                        <span>{order.shippingCost === 0 ? "Gratis" : formatPrice(order.shippingCost)}</span>
                      </div>
                      <div className="flex justify-between border-t border-border pt-2 font-bold">
                        <span>Totaal</span>
                        <span>{formatPrice(order.total)}</span>
                      </div>
                      <p className="flex items-center gap-2 pt-2 text-xs text-muted-foreground">
                        <Truck className="size-3.5" /> {pricing.shipping[order.shippingMethod].label}
                      </p>
                      {order.trackingCode && (
                        <p className="text-xs">
                          Track &amp; trace: <span className="font-mono font-semibold">{order.trackingCode}</span>
                        </p>
                      )}
                      {order.status === "PENDING" && (
                        <p className="text-xs text-amber-700">Deze bestelling wacht op betaling en vervalt automatisch als die niet wordt afgerond.</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
            {orders.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Vragen over een bestelling of een retour? Bekijk{" "}
                <Link href="/verzending" className="font-medium text-primary underline underline-offset-2">
                  verzending &amp; retour
                </Link>{" "}
                of{" "}
                <Link href="/contact" className="font-medium text-primary underline underline-offset-2">
                  neem contact op
                </Link>
                .
              </p>
            )}
          </TabsContent>

          {/* ─── Inschrijvingen ─── */}
          <TabsContent value="inschrijvingen" className="space-y-10">
            <div>
              <h2 className="heading-md mb-5 text-xl sm:text-2xl">Komende evenementen</h2>
              {upcoming.length === 0 ? (
                <EmptyState
                  icon={<CalendarDays />}
                  title="Geen komende inschrijvingen"
                  description={view.active ? "Als lid rijd je gratis mee. Bekijk de agenda en schrijf je in." : `Leden rijden gratis mee, niet-leden betalen ${formatPrice(pricing.eventPriceNonMemberCents)} per evenement.`}
                  action={
                    <Button asChild>
                      <Link href="/evenementen">Bekijk evenementen</Link>
                    </Button>
                  }
                />
              ) : (
                <ul className="space-y-3">
                  {upcoming.map((r) => (
                    <RegistrationRow
                      key={r.id}
                      registration={r}
                      calendar={r.status === "CONFIRMED" && r.event.status === "PUBLISHED" ? calendarLinks(r.event) : undefined}
                    />
                  ))}
                </ul>
              )}
            </div>
            {past.length > 0 && (
              <div>
                <h2 className="heading-md mb-5 text-xl sm:text-2xl">Eerdere inschrijvingen</h2>
                <ul className="space-y-3 opacity-90">
                  {past.map((r) => (
                    <RegistrationRow key={r.id} registration={r} />
                  ))}
                </ul>
              </div>
            )}
          </TabsContent>

          {/* ─── Voordelen ─── */}
          <TabsContent value="voordelen" className="space-y-10">
            <div className="grid gap-4 sm:grid-cols-3">
              <PerkCard icon={<CalendarCheck />} title="Gratis evenementen" text="Gratis deelname aan alle clubritten en evenementen." unlocked={view.active} />
              <PerkCard icon={<Percent />} title={`${discount} webshopkorting`} text="Automatisch verrekend in je winkelwagen." unlocked={view.active} />
              <PerkCard icon={<Gift />} title="Exclusieve voordelen" text="Ledenavonden, primeurs en speciale acties." unlocked={view.active} />
            </div>

            <div>
              <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="eyebrow">Partners</p>
                  <h2 className="heading-md mt-3 text-xl sm:text-2xl">Aanbiedingen van onze partners</h2>
                </div>
                {!view.active && (
                  <Button asChild size="sm">
                    <Link href="/lid-worden">Word lid om alles te ontgrendelen</Link>
                  </Button>
                )}
              </div>
              {offers.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {offers.map((offer) => {
                    const locked = offer.membersOnly && !view.active;
                    return (
                      <Card key={offer.id} className="relative flex flex-col overflow-hidden">
                        <CardHeader>
                          <div className="flex items-center gap-3">
                            {offer.logoUrl ? (
                              <div className="relative size-11 shrink-0 overflow-hidden rounded-lg border bg-white">
                                <Image src={offer.logoUrl} alt={offer.partnerName} fill sizes="44px" className="object-contain p-1" />
                              </div>
                            ) : (
                              <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-accent text-primary">
                                <Handshake className="size-5" />
                              </span>
                            )}
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{offer.partnerName}</p>
                              <CardTitle className="text-base">{offer.title}</CardTitle>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="flex flex-1 flex-col gap-4">
                          <p className="text-sm text-muted-foreground">{offer.description}</p>
                          {locked ? (
                            <p className="mt-auto flex items-center gap-2 rounded-lg bg-surface px-3 py-2.5 text-sm font-medium">
                              <Lock className="size-4 text-primary" /> Alleen voor leden
                            </p>
                          ) : (
                            <div className="mt-auto space-y-3">
                              {offer.discountCode && (
                                <p className="rounded-lg border border-dashed border-primary/40 bg-accent/50 px-3 py-2 text-center font-mono text-sm font-bold tracking-widest text-primary">
                                  {offer.discountCode}
                                </p>
                              )}
                              {offer.url && (
                                <Button asChild variant="outline" size="sm" className="w-full">
                                  <a href={offer.url} target="_blank" rel="noopener noreferrer">
                                    Naar {offer.partnerName} <ExternalLink />
                                  </a>
                                </Button>
                              )}
                              {offer.validUntil && <p className="text-xs text-muted-foreground">Geldig t/m {formatDate(offer.validUntil)}</p>}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <EmptyState
                  icon={<Handshake />}
                  title="Binnenkort meer partners"
                  description="We werken aan aanbiedingen bij garages, specialisten en andere partners. Zodra ze beschikbaar zijn, vind je ze hier."
                />
              )}
            </div>
          </TabsContent>

          {/* ─── Privacy ─── */}
          <TabsContent value="privacy" className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Mijn gegevens downloaden</CardTitle>
                <CardDescription>
                  Je hebt recht op inzage in je gegevens (AVG). Download een overzicht van je profiel, lidmaatschap, bestellingen,
                  inschrijvingen en betalingen als JSON-bestand.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild variant="outline">
                  <a href="/api/account/export" download>
                    <Download /> Download mijn gegevens
                  </a>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Toestemmingen</CardTitle>
                <CardDescription>
                  Nieuwsbrief: <strong className="text-foreground">{user.marketingConsent ? "aan" : "uit"}</strong>. Je wijzigt dit bij{" "}
                  <TabLink tab="profiel" className="font-medium text-primary underline underline-offset-2">
                    Profiel
                  </TabLink>
                  . Cookievoorkeuren pas je hieronder aan.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-3">
                <CookieSettingsButton className={buttonVariants({ variant: "outline" })} />
                <Button asChild variant="ghost">
                  <Link href="/privacy">Lees de privacyverklaring</Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="border-red-200 lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-red-700">Account verwijderen</CardTitle>
                <CardDescription>
                  Je kunt je account op elk moment laten verwijderen (recht op vergetelheid). Je profiel en lidmaatschap worden direct
                  gewist. Bestellingen en betalingen moeten we wettelijk 7 jaar bewaren voor de belastingdienst; die worden losgekoppeld van
                  je account.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DeleteAccountDialog hasActiveMembership={view.active} />
              </CardContent>
            </Card>
          </TabsContent>
        </AccountTabs>
      </section>
    </>
  );
}

function StatTile({ icon, label, value, tab }: { icon: React.ReactNode; label: string; value: string; tab: "bestellingen" | "inschrijvingen" | "lidmaatschap" }) {
  return (
    <TabLink tab={tab} className="group rounded-2xl border border-border bg-white p-5 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md">
      <span className="flex size-10 items-center justify-center rounded-lg bg-accent text-primary [&_svg]:size-5">{icon}</span>
      <p className="mt-4 font-display text-2xl font-bold">{value}</p>
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
    </TabLink>
  );
}

function QuickLink({ href, icon, title, text }: { href: string; icon: React.ReactNode; title: string; text: string }) {
  return (
    <Link href={href} className="group flex items-center gap-4 rounded-xl border border-border p-4 transition-colors hover:border-primary/40 hover:bg-accent/40">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-ink text-white [&_svg]:size-5">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold">{title}</span>
        <span className="block truncate text-sm text-muted-foreground">{text}</span>
      </span>
      <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
    </Link>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-medium">{value}</dd>
    </div>
  );
}

function PerkCard({ icon, title, text, unlocked }: { icon: React.ReactNode; title: string; text: string; unlocked: boolean }) {
  return (
    <div className="relative rounded-2xl border border-border bg-white p-6">
      <span className={`flex size-11 items-center justify-center rounded-xl [&_svg]:size-5 ${unlocked ? "bg-primary text-white" : "bg-muted text-muted-foreground"}`}>
        {icon}
      </span>
      <h3 className="mt-4 font-display text-lg font-bold uppercase tracking-tight">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{text}</p>
      <div className="mt-4">
        {unlocked ? (
          <Badge variant="success">Actief</Badge>
        ) : (
          <Badge variant="outline">
            <Lock /> Voor leden
          </Badge>
        )}
      </div>
    </div>
  );
}

type RegistrationWithEvent = {
  id: string;
  status: RegistrationStatus;
  amount: number;
  licensePlate: string;
  event: { title: string; slug: string; startsAt: Date; locationName: string; city: string };
};

function RegistrationRow({ registration: r, calendar }: { registration: RegistrationWithEvent; calendar?: CalendarLinks }) {
  const badge = dateBadge(r.event.startsAt);
  const status = registrationBadge[r.status];
  return (
    <li className="flex flex-col gap-4 rounded-2xl border border-border bg-white p-4 sm:flex-row sm:items-center">
      <div className="flex w-16 shrink-0 flex-col items-center rounded-lg bg-ink py-2 text-white">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-white/60">{badge.weekday}</span>
        <span className="font-display text-2xl font-bold leading-none">{badge.day}</span>
        <span className="text-[11px] font-bold uppercase tracking-wider text-primary">{badge.month}</span>
      </div>
      <div className="min-w-0 flex-1">
        <Link href={`/evenementen/${r.event.slug}`} className="font-display text-lg font-bold uppercase tracking-tight hover:text-primary">
          {r.event.title}
        </Link>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="size-3.5" /> {r.event.locationName}, {r.event.city}
          </span>
          <span>Kenteken {r.licensePlate}</span>
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3 sm:flex-col sm:items-end">
        <div className="flex items-center gap-3">
          <Badge variant={status.variant}>{status.label}</Badge>
          <span className="text-sm font-semibold">{r.amount === 0 ? "Gratis" : formatPrice(r.amount)}</span>
        </div>
        {calendar && <AddToCalendar links={calendar} variant="compact" align="end" />}
      </div>
    </li>
  );
}
