import type { Metadata } from "next";
import Link from "next/link";
import { Clock, MapPin, Package, RotateCcw, ShieldCheck, Truck } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { getContent } from "@/lib/content";
import { enabledShippingMethods } from "@/lib/pricing";
import { getPricing, getSettings } from "@/lib/settings";
import { formatPrice } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Verzending & retour",
  description: "Verzendkosten, levertijden en retourneren bij de webshop van MazdaClub Nederland.",
  alternates: { canonical: "/verzending" },
};

const icons = { POSTNL_NL: Truck, POSTNL_BE: Truck, PICKUP_EVENT: MapPin } as const;

export default async function ShippingPage() {
  const [c, pricing, shippingSettings] = await Promise.all([getContent(), getPricing(), getSettings("shipping")]);
  const options = enabledShippingMethods(pricing).map((key) => [key, pricing.shipping[key]] as const);

  return (
    <>
      <PageHeader
        eyebrow="Webshop"
        title="Verzending & retour"
        description="Alles over verzendkosten, levertijden en het retourneren van je bestelling."
        breadcrumbs={[{ label: "Webshop", href: "/webshop" }, { label: "Verzending & retour" }]}
      />

      <div className="container-site py-14 sm:py-20">
        <section aria-labelledby="verzendopties">
          <h2 id="verzendopties" className="heading-md">
            Verzendopties
          </h2>
          <ul className="mt-8 grid gap-5 md:grid-cols-3">
            {options.map(([key, o]) => {
              const Icon = icons[key];
              return (
                <li key={key} className="flex flex-col rounded-2xl border border-border bg-white p-6">
                  <span className="flex size-12 items-center justify-center rounded-xl bg-accent text-primary">
                    <Icon className="size-6" />
                  </span>
                  <h3 className="mt-5 font-semibold">{o.label}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{o.description}</p>
                  <div className="mt-6 border-t border-border pt-4">
                    <p className="font-display text-2xl font-bold">{o.cost === 0 ? "Gratis" : formatPrice(o.cost)}</p>
                    {o.freeFrom !== null && <p className="mt-1 text-sm font-medium text-primary">Gratis vanaf {formatPrice(o.freeFrom)}</p>}
                  </div>
                </li>
              );
            })}
          </ul>
          <p className="mt-4 text-sm text-muted-foreground">
            {shippingSettings.processingTime} Het bedrag voor gratis verzending wordt berekend over het totaal ná eventuele ledenkorting. Alle prijzen zijn inclusief btw.
          </p>
        </section>

        <div className="mt-16 grid gap-12 lg:grid-cols-2">
          <section className="prose-club">
            <h2 className="flex items-center gap-3">
              <Clock className="size-6 text-primary" /> Levertijden
            </h2>
            <ul>
              <li>Bestellingen die op werkdagen vóór 16:00 uur zijn betaald, verzenden we meestal binnen 1–3 werkdagen.</li>
              <li>Zodra je pakket onderweg is, ontvang je een e-mail met de track &amp; trace-code van PostNL.</li>
              <li>Levering in Nederland duurt doorgaans 1–2 werkdagen na verzending, in België 2–4 werkdagen.</li>
              <li>
                Kies je voor <strong>ophalen bij een clubevenement</strong>, dan ligt je bestelling klaar bij de clubstand tijdens het
                eerstvolgende evenement. Vermeld bij je bestelling bij welk evenement je hem wilt ophalen.
              </li>
              <li>Onze webshop wordt beheerd door vrijwilligers; rond feestdagen en grote evenementen kan de verzending iets langer duren.</li>
            </ul>
          </section>

          <section className="prose-club">
            <h2 className="flex items-center gap-3">
              <RotateCcw className="size-6 text-primary" /> Retourneren
            </h2>
            <ul>
              <li>Je hebt 14 dagen bedenktijd na ontvangst van je bestelling.</li>
              <li>
                Meld je retour binnen die termijn via <a href={`mailto:${c.contactEmail}`}>{c.contactEmail}</a> of{" "}
                <Link href="/contact">het contactformulier</Link>, onder vermelding van je ordernummer.
              </li>
              <li>Stuur het product binnen 14 dagen na je melding ongebruikt en in de originele verpakking terug. De kosten van het terugsturen zijn voor jou.</li>
              <li>We betalen het aankoopbedrag inclusief de standaard verzendkosten binnen 14 dagen terug via de oorspronkelijke betaalmethode.</li>
              <li>Gepersonaliseerde producten (bijvoorbeeld met eigen tekst of kenteken) kunnen niet worden geretourneerd.</li>
            </ul>
          </section>
        </div>

        <section className="mt-16 grid gap-5 md:grid-cols-3">
          {[
            { icon: ShieldCheck, title: "Veilig betalen", text: "iDEAL, Bancontact, creditcard, Apple Pay, Google Pay en PayPal via een gecertificeerde betaalprovider." },
            { icon: Package, title: "Zorgvuldig verpakt", text: "Elke bestelling wordt met de hand gecontroleerd en stevig verpakt door onze vrijwilligers." },
            { icon: RotateCcw, title: "Wettelijke garantie", text: "Is er iets mis met je product? Neem contact op, dan lossen we het snel op." },
          ].map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-2xl bg-surface p-6">
              <Icon className="size-6 text-primary" />
              <h3 className="mt-4 font-semibold">{title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{text}</p>
            </div>
          ))}
        </section>

        <div className="mt-12 flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/webshop">Naar de webshop</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/algemene-voorwaarden#webshop">Algemene voorwaarden</Link>
          </Button>
        </div>
      </div>
    </>
  );
}
