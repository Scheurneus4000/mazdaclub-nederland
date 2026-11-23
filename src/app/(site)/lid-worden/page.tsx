import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, CalendarCheck, Check, ClipboardList, CreditCard, Gift, Handshake, Percent, RefreshCw, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { MembershipForm } from "@/components/membership/membership-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/form-controls";
import { getContent } from "@/lib/content";
import { membershipView } from "@/lib/membership";
import { supportsRecurring } from "@/lib/payments";
import type { Pricing } from "@/lib/pricing";
import { getCurrentUser } from "@/lib/session";
import { getPricing } from "@/lib/settings";
import { addYears, formatDate, formatMemberNumber, formatPrice } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const pricing = await getPricing();
  return {
    title: "Lid worden",
    description: `Word lid van MazdaClub Nederland voor ${formatPrice(pricing.membershipPriceCents)} per jaar: gratis deelname aan alle evenementen, ${pricing.memberDiscountPercent}% korting in de webshop en exclusieve ledenvoordelen.`,
    alternates: { canonical: "/lid-worden" },
  };
}

async function recurringSupported(): Promise<boolean> {
  try {
    return await supportsRecurring();
  } catch {
    return false;
  }
}

function pageTexts(pricing: Pricing) {
  const price = formatPrice(pricing.membershipPriceCents);
  const discount = `${pricing.memberDiscountPercent}%`;
  const benefits = [
    {
      icon: CalendarCheck,
      title: "Gratis deelname aan evenementen",
      text: `Rijd gratis mee met alle clubritten, treffens en evenementen. Niet-leden betalen ${formatPrice(pricing.eventPriceNonMemberCents)} per evenement.`,
      soon: false,
    },
    { icon: Percent, title: `${discount} korting in de webshop`, text: `Automatisch ${discount} korting op alle MazdaClub-artikelen, van kentekenplaathouders tot kleding.`, soon: false },
    { icon: Gift, title: "Exclusieve ledenvoordelen", text: "Toegang tot toekomstige ledenacties, besloten ledenavonden en primeurs.", soon: false },
    { icon: Handshake, title: "Aanbiedingen van partners", text: "Speciale kortingen bij garages, specialisten en partners van de club.", soon: true },
  ];

  const steps = [
    { icon: ClipboardList, title: "Meld je aan", text: "Heb je al een (gratis) account? Log in en word lid op hetzelfde account. Nog geen account? Dan maken we die direct voor je aan." },
    { icon: CreditCard, title: "Betaal veilig online", text: "Rond je betaling af met iDEAL | Wero, Bancontact, creditcard, Apple Pay, Google Pay of PayPal." },
    { icon: BadgeCheck, title: "Direct lid", text: "Je ontvangt je lidnummer per e-mail en kunt meteen gratis inschrijven voor evenementen." },
  ];

  const faqs = [
    {
      q: "Wat kost het lidmaatschap?",
      a: `Het lidmaatschap kost ${price} per jaar. Daarvoor rijd je gratis mee met alle evenementen en krijg je ${discount} korting in de webshop. Er zijn geen verborgen kosten.`,
    },
    {
      q: "Ik heb al een gratis account. Moet ik een nieuw account maken?",
      a: "Nee. Log in met je bestaande account en kies 'Lid worden'. Je lidmaatschap wordt aan je huidige account gekoppeld; je bestellingen en inschrijvingen blijven gewoon zichtbaar.",
    },
    ...(pricing.autoRenewAvailable
      ? [
          {
            q: "Hoe werkt de automatische verlenging?",
            a: `Kies je voor automatische verlenging, dan wordt je lidmaatschap elk jaar op de verlengdatum verlengd voor ${price} via een automatische incasso. Zo blijf je zonder onderbreking lid. Je kunt de automatische verlenging op elk moment uitzetten in Mijn Account.`,
          },
        ]
      : []),
  {
    q: "Kan ik mijn lidmaatschap opzeggen?",
    a: "Ja. Zet de automatische verlenging uit in Mijn Account vóór de verlengdatum. Je lidmaatschap blijft dan geldig tot het einde van de lopende periode en wordt daarna niet verlengd. Na aanmelding heb je bovendien 14 dagen bedenktijd.",
  },
  {
    q: "Welke betaalmethodes kan ik gebruiken?",
    a: "Je betaalt veilig via onze betaalprovider met iDEAL | Wero, Bancontact, creditcard, Apple Pay, Google Pay of PayPal. Kies je voor automatische verlenging, dan zie je alleen de methodes die daarvoor geschikt zijn.",
  },
  { q: "Wanneer gaan mijn voordelen in?", a: "Direct na een geslaagde betaling. Log in met je account, dan zie je bij evenementen meteen de ledenprijs en krijg je in de webshop automatisch je korting." },
  { q: "Moet ik een Mazda hebben om lid te worden?", a: "Nee, iedere Mazda-liefhebber is welkom. De meeste leden rijden wel een Mazda, van klassieke RX-7 tot gloednieuwe MX-5 of CX-60." },
  ];
  return { price, discount, benefits, steps, faqs };
}

export default async function MembershipPage() {
  const [user, content, pricing] = await Promise.all([getCurrentUser(), getContent(), getPricing()]);
  const { price, discount, benefits, steps, faqs } = pageTexts(pricing);
  const membership = user?.membership ?? null;
  const view = membershipView(membership);
  const recurring = await recurringSupported();
  const autoRenewing = view.active && !!membership?.mollieSubscriptionId;
  const mode = !user ? "guest" : view.active ? "renew" : "join";
  const renewUntil = view.active && membership?.currentPeriodEnd ? formatDate(addYears(membership.currentPeriodEnd, 1)) : null;

  return (
    <>
      <PageHeader
        eyebrow="Lidmaatschap"
        title={content.pageMembershipTitle}
        description={content.pageMembershipText}
        image={content.pageMembershipImage || undefined}
        breadcrumbs={[{ label: "Lid worden" }]}
      >
        <div className="flex flex-wrap items-center gap-4">
          <Button asChild size="lg">
            <a href="#aanmelden">{view.active ? "Mijn lidmaatschap" : `Direct lid worden – ${price}`}</a>
          </Button>
          <p className="text-sm text-white/70">
            <span className="font-display text-2xl font-bold text-white">{price}</span> per jaar · direct actief
          </p>
        </div>
      </PageHeader>

      <div className="container-site grid gap-12 py-14 sm:py-20 lg:grid-cols-[minmax(0,1fr)_460px] lg:gap-16">
        <div className="min-w-0 space-y-20">
          {/* Voordelen */}
          <section aria-labelledby="voordelen">
            <p className="eyebrow">Jouw voordelen</p>
            <h2 id="voordelen" className="heading-lg mt-4">
              Alles wat je krijgt als lid
            </h2>
            <ul className="mt-10 grid gap-5 sm:grid-cols-2">
              {benefits.map(({ icon: Icon, title, text, soon }) => (
                <li key={title} className="rounded-2xl border border-border bg-white p-6">
                  <div className="flex items-center justify-between">
                    <span className="flex size-12 items-center justify-center rounded-xl bg-accent text-primary">
                      <Icon className="size-6" />
                    </span>
                    {soon && <Badge variant="secondary">Binnenkort</Badge>}
                  </div>
                  <h3 className="mt-5 font-display text-lg font-bold uppercase tracking-tight">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{text}</p>
                </li>
              ))}
            </ul>
          </section>

          {/* Zo werkt het */}
          <section aria-labelledby="zo-werkt-het">
            <p className="eyebrow">In drie stappen</p>
            <h2 id="zo-werkt-het" className="heading-lg mt-4">
              Zo word je lid
            </h2>
            <ol className="mt-10 grid gap-6 md:grid-cols-3">
              {steps.map(({ icon: Icon, title, text }, i) => (
                <li key={title} className="relative rounded-2xl bg-surface p-6">
                  <span className="absolute top-5 right-6 font-display text-5xl font-extrabold text-ink/5">0{i + 1}</span>
                  <span className="flex size-11 items-center justify-center rounded-lg bg-ink text-white">
                    <Icon className="size-5" />
                  </span>
                  <h3 className="mt-5 font-semibold">{title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{text}</p>
                </li>
              ))}
            </ol>
          </section>

          {/* FAQ */}
          <section aria-labelledby="faq">
            <p className="eyebrow">Veelgestelde vragen</p>
            <h2 id="faq" className="heading-lg mt-4">
              Goed om te weten
            </h2>
            <div className="mt-8 divide-y divide-border rounded-2xl border border-border">
              {faqs.map((f) => (
                <details key={f.q} className="group px-6 py-5 [&_summary::-webkit-details-marker]:hidden">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold">
                    {f.q}
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-border text-lg leading-none text-primary transition-transform group-open:rotate-45">
                      +
                    </span>
                  </summary>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{f.a}</p>
                </details>
              ))}
            </div>
            <p className="mt-6 text-sm text-muted-foreground">
              Staat je vraag er niet tussen?{" "}
              <Link href="/contact" className="font-semibold text-primary hover:underline">
                Neem contact met ons op
              </Link>
              .
            </p>
          </section>
        </div>

        {/* Aanmelden */}
        <aside id="aanmelden" className="h-fit scroll-mt-28 lg:sticky lg:top-28">
          <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-[0_20px_50px_-25px_rgba(0,0,0,0.3)]">
            <div className="bg-ink p-7 text-white">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/60">Jaarlidmaatschap</p>
                <Sparkles className="size-5 text-primary" />
              </div>
              <p className="mt-3 flex items-baseline gap-2">
                <span className="font-display text-5xl font-bold">{price}</span>
                <span className="text-white/60">per jaar</span>
              </p>
              <ul className="mt-5 space-y-2 text-sm text-white/80">
                {["Gratis deelname aan alle evenementen", `${discount} korting in de webshop`, "Exclusieve ledenvoordelen", "Partneraanbiedingen (binnenkort)"].map((item) => (
                  <li key={item} className="flex items-center gap-2.5">
                    <Check className="size-4 shrink-0 text-primary" /> {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-6 sm:p-7">
              {autoRenewing && membership ? (
                <div className="space-y-4">
                  <Alert variant="success">
                    <strong className="font-semibold">Je bent lid ({formatMemberNumber(membership.memberNumber)}).</strong> Je lidmaatschap wordt
                    automatisch verlengd op {membership.currentPeriodEnd ? formatDate(membership.currentPeriodEnd) : "de verlengdatum"}. Je hoeft
                    niets te doen.
                  </Alert>
                  <Button asChild variant="outline" className="w-full">
                    <Link href="/account?tab=lidmaatschap">
                      <RefreshCw /> Lidmaatschap beheren
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-5">
                  {mode === "renew" && membership && (
                    <Alert variant="info">
                      Je bent lid ({formatMemberNumber(membership.memberNumber)}) tot en met{" "}
                      <strong className="font-semibold">{membership.currentPeriodEnd ? formatDate(membership.currentPeriodEnd) : "-"}</strong>. Verleng nu
                      met een jaar: de nieuwe periode sluit aan op je huidige einddatum{renewUntil ? ` en loopt tot en met ${renewUntil}` : ""}.
                    </Alert>
                  )}
                  {mode === "join" && membership && view.status !== "PENDING" && membership.currentPeriodEnd && (
                    <Alert variant="warning">
                      Je lidmaatschap is verlopen op {formatDate(membership.currentPeriodEnd)}. Word opnieuw lid en geniet direct weer van al je
                      voordelen.
                    </Alert>
                  )}
                  {mode === "join" && user && (
                    <p className="text-sm text-muted-foreground">
                      Je bent ingelogd als <strong className="font-semibold text-foreground">{user.email}</strong>. We koppelen het lidmaatschap aan dit
                      account.
                    </p>
                  )}
                  <MembershipForm mode={mode} supportsRecurring={recurring} priceLabel={price} />
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}
