import type { Metadata } from "next";
import Link from "next/link";
import {
  Bell,
  CalendarDays,
  CreditCard,
  Globe,
  Images,
  LifeBuoy,
  Newspaper,
  Package,
  Palette,
  Rocket,
  Settings,
  ShoppingBag,
  Users,
  type LucideIcon,
} from "lucide-react";
import { AdminPageHeader } from "@/components/admin/page-title";
import { requireAdmin } from "@/lib/session";

export const metadata: Metadata = { title: "Hulp & uitleg" };

type Topic = { id: string; icon: LucideIcon; title: string; intro: string; steps?: string[]; tips?: string[]; link?: { href: string; label: string } };

const topics: Topic[] = [
  {
    id: "evenementen",
    icon: CalendarDays,
    title: "Een evenement aanmaken",
    intro: "Toerritten, Mazda Meetings en clubpaddocks zet je in de agenda via Evenementbeheer.",
    steps: [
      "Ga naar Evenementbeheer en klik op 'Nieuw evenement'.",
      "Vul titel, korte samenvatting, beschrijving (met de knoppen voor kopjes en opsommingen), datum, locatie en aantal plaatsen in.",
      "Kies een foto. Grote foto's worden automatisch verkleind.",
      "Zet de status op 'Gepubliceerd' en klik op opslaan. Het evenement staat direct op de website.",
    ],
    tips: [
      "Leden doen standaard gratis mee, niet-leden betalen de standaardprijs uit Instellingen → Lidmaatschap & prijzen. Per evenement kun je de prijs aanpassen.",
      "Zet het woord 'meeting' in de titel (bijv. 'Maandelijkse Mazda Meeting mei'), dan verschijnt hij automatisch op de homepagina als eerstvolgende meeting.",
      "Bij elk evenement zie je de deelnemerslijst en download je die als Excel of CSV.",
      "Deelnemers krijgen na aanmelding een bevestigingsmail met knoppen voor Google, Apple en Outlook Agenda.",
    ],
    link: { href: "/admin/evenementen/nieuw", label: "Nieuw evenement" },
  },
  {
    id: "nieuws",
    icon: Newspaper,
    title: "Nieuws publiceren",
    intro: "Aankondigingen en verslagen plaats je via Nieuws. De drie nieuwste berichten staan ook op de homepagina.",
    steps: [
      "Ga naar Nieuws en klik op 'Nieuw bericht'.",
      "Schrijf een titel, een korte samenvatting en de tekst. Voeg eventueel een coverfoto toe.",
      "Vink 'Publiceren op de website' aan. Kies een datum in de toekomst om het bericht automatisch op dat moment te laten verschijnen.",
    ],
    tips: ["Zonder vinkje blijft het bericht een concept dat alleen beheerders zien."],
    link: { href: "/admin/nieuws/nieuw", label: "Nieuw bericht" },
  },
  {
    id: "fotos",
    icon: Images,
    title: "Foto's en albums",
    intro: "De fotogalerij bestaat uit albums, bijvoorbeeld één per rit of meeting.",
    steps: [
      "Ga naar Fotoalbums en maak een album aan (titel, datum, eventueel gekoppeld aan een evenement).",
      "Sleep foto's in het uploadvak of klik op 'Foto's kiezen'. Tientallen tegelijk kan; ze worden automatisch verkleind, en locatiegegevens (GPS) worden verwijderd.",
      "Klik bij een foto op 'Vervangen' om hem door een andere te vervangen, of selecteer foto's om ze in één keer te verwijderen.",
    ],
    tips: [
      "De nieuwste foto's verschijnen automatisch op de homepagina.",
      "Bezoekers kunnen foto's groot bekijken en downloaden. Vraag toestemming als iemand duidelijk herkenbaar in beeld is.",
    ],
    link: { href: "/admin/fotoalbums", label: "Naar fotoalbums" },
  },
  {
    id: "teksten",
    icon: Palette,
    title: "Teksten, foto's en logo wijzigen",
    intro: "Bijna alle teksten en afbeeldingen van de website pas je aan via Teksten & afbeeldingen, verdeeld over vier tabbladen.",
    steps: [
      "Kies het tabblad (Homepagina, Pagina's, Logo & afbeeldingen of Contact & social).",
      "Wijzig de tekst of klik bij een afbeelding op 'Vervangen' en kies een bestand.",
      "Klik op 'Wijzigingen opslaan'. De wijziging staat direct online.",
    ],
    tips: [
      "Met 'Standaard terugzetten' herstel je de oorspronkelijke tekst of foto.",
      "Het clublogo (zwart en wit) staat er al. Wil je het ooit vervangen, upload dan bij Logo & afbeeldingen een PNG met transparante achtergrond of een SVG.",
      "Het aantal leden en evenementen op de homepagina wordt automatisch geteld. Oprichtingsjaar en aantal grote ritten pas je zelf aan.",
    ],
    link: { href: "/admin/content", label: "Teksten & afbeeldingen" },
  },
  {
    id: "webshop",
    icon: Package,
    title: "Producten en voorraad",
    intro: "Producten beheer je via Producten. Elk product heeft één of meer varianten (bijv. maat of kleur), elk met een eigen voorraad.",
    steps: [
      "Klik op 'Nieuw product', kies een categorie, vul naam, beschrijving en prijs (incl. btw) in en upload foto's.",
      "Voeg varianten toe, bijvoorbeeld 'Zwart / M', met per variant de voorraad. Eén variant 'Standaard' is genoeg als er geen keuzes zijn.",
      "Vink 'Uitgelicht' aan om het product op de homepagina te tonen.",
    ],
    tips: [
      "Leden krijgen automatisch de ledenkorting (in te stellen bij Instellingen → Lidmaatschap & prijzen). Je voert altijd de normale prijs in.",
      "Bij een bestelling wordt de voorraad meteen gereserveerd. Wordt er niet betaald, dan komt de voorraad automatisch terug zodra de betaling is mislukt of verlopen.",
      "Filter in het productoverzicht op 'Lage voorraad' om te zien wat je moet bijbestellen.",
      "Een product dat je niet meer verkoopt, zet je op inactief. Dan blijft de bestelgeschiedenis bewaard.",
    ],
    link: { href: "/admin/producten", label: "Naar producten" },
  },
  {
    id: "bestellingen",
    icon: ShoppingBag,
    title: "Bestellingen verwerken",
    intro: "Betaalde bestellingen verschijnen onder Bestellingen met een rood getal in het menu.",
    steps: [
      "Open de bestelling: je ziet de artikelen, het adres en de betaling.",
      "Pak de artikelen in en zet de status op 'In behandeling'.",
      "Verstuur het pakket, vul de track & trace-code in en zet de status op 'Verzonden'. De klant krijgt automatisch een e-mail.",
      "Annuleer je een bestelling, dan gaat de voorraad automatisch terug. Terugbetalen doe je in het Mollie-dashboard.",
    ],
    tips: ["Bestellingen exporteer je naar Excel voor de boekhouding."],
    link: { href: "/admin/bestellingen", label: "Naar bestellingen" },
  },
  {
    id: "leden",
    icon: Users,
    title: "Gebruikers & leden",
    intro: "Iedereen kan gratis een account aanmaken en later op hetzelfde account betaald lid worden. Onder Gebruikers & leden zie je alle accounts.",
    steps: [
      "Filter op 'Betaalde leden', 'Gratis accounts', 'Verlopen', 'Beheerders' of 'E-mail onbevestigd'.",
      "Open een gebruiker om gegevens te wijzigen. Met 'Betaald lid maken' registreer je een betaling (contant, overboeking of gratis/erelid) en is het lidmaatschap direct actief.",
      "Wil je dat iemand zelf online betaalt? Klik op 'Betaallink sturen': het lid logt in en betaalt op zijn eigen account.",
      "Nieuw lid dat nog geen account heeft? Klik op 'Lid toevoegen' en vink 'Uitnodiging sturen' aan.",
      "Maak een ander bestuurslid beheerder via 'Rol'. De eigenaar van de website kan niet worden gedegradeerd of verwijderd.",
    ],
    tips: ["Leden kunnen zelf hun gegevens downloaden of hun account verwijderen (AVG)."],
    link: { href: "/admin/leden", label: "Naar gebruikers & leden" },
  },
  {
    id: "betalen",
    icon: CreditCard,
    title: "Betalingen",
    intro:
      "Alle betalingen lopen via Mollie: iDEAL | Wero, Bancontact, creditcard, Apple Pay, Google Pay en PayPal. De koppeling stel je in bij Instellingen → Betalingen: plak je API-sleutel en klik op 'Verbinding testen'.",
    tips: [
      "Mollie maakt het geld automatisch over naar de bankrekening die je in je Mollie-account hebt ingesteld.",
      "Welke betaalmethodes zichtbaar zijn, zet je aan of uit in het Mollie-dashboard. Daarvoor hoef je niets aan de website te veranderen.",
      "Onder Betalingen zie je alle transacties. Terugbetalen (volledig of een deel) kan direct vanaf daar.",
      "Automatische verlenging van het lidmaatschap loopt via een Mollie-abonnement; leden kunnen die zelf stopzetten.",
    ],
    link: { href: "/admin/instellingen/betalingen", label: "Betaalinstellingen" },
  },
  {
    id: "instellingen",
    icon: Settings,
    title: "Instellingen zonder code",
    intro: "Alle belangrijke instellingen pas je zelf aan onder Instellingen. Wijzigingen gelden direct op de hele website.",
    steps: [
      "Overzicht: groene vinkjes laten zien wat klaar is voor livegang, met een knop 'Instellen' bij wat nog ontbreekt.",
      "Lidmaatschap & prijzen: lidmaatschapsprijs, ledenkorting, standaardprijzen voor evenementen en automatische verlenging.",
      "Verzending: je afzendadres, verzendmethoden, verzendkosten en vanaf welk bedrag verzending gratis is.",
      "E-mail: kies Resend (aanbevolen) of je eigen mailserver, vul je afzenderadres in en stuur een testmail.",
      "Meldingen: kies welke e-mails je wilt ontvangen, bijvoorbeeld bij een nieuwe aanmelding voor een rit of een nieuwe bestelling.",
    ],
    tips: [
      "API-sleutels en wachtwoorden worden versleuteld opgeslagen en nooit meer getoond. Laat een veld leeg om de huidige waarde te houden.",
      "In teksten kun je {lidmaatschapsprijs} en {ledenkorting} gebruiken; die worden automatisch de actuele prijs.",
    ],
    link: { href: "/admin/instellingen", label: "Naar instellingen" },
  },
  {
    id: "meldingen",
    icon: Bell,
    title: "Meldingen",
    intro: "Bij belangrijke activiteiten verschijnt een melding bij het belletje bovenaan de beheerdermodus. Je kunt ze ook per e-mail ontvangen.",
    tips: [
      "Je krijgt een melding bij een nieuw account, een nieuw of verlengd lid, een aanmelding voor een rit, een betaalde bestelling, een contactbericht en een terugbetaling.",
      "Klik op 'Bekijken' om direct naar de bestelling, het lid of het evenement te gaan.",
    ],
    link: { href: "/admin/meldingen", label: "Naar meldingen" },
  },
];

export default async function AdminHelpPage() {
  await requireAdmin();

  return (
    <>
      <AdminPageHeader
        title="Hulp & uitleg"
        description="Alles wat je nodig hebt om de website te beheren, stap voor stap. Je hoeft niets van techniek te weten."
      />

      <nav aria-label="Onderwerpen" className="mb-8 flex flex-wrap gap-2">
        {[...topics, { id: "livegang", title: "Livegang & techniek" }].map((t) => (
          <a key={t.id} href={`#${t.id}`} className="rounded-full border border-border bg-white px-3.5 py-1.5 text-sm font-medium hover:border-primary hover:text-primary">
            {t.title}
          </a>
        ))}
      </nav>

      <div className="grid gap-6 lg:grid-cols-2">
        {topics.map(({ id, icon: Icon, title, intro, steps, tips, link }) => (
          <section key={id} id={id} className="scroll-mt-28 rounded-xl border border-border bg-white p-6">
            <div className="flex items-start gap-4">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent text-primary">
                <Icon className="size-5" />
              </span>
              <div className="min-w-0">
                <h2 className="text-lg font-semibold">{title}</h2>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{intro}</p>
              </div>
            </div>
            {steps && (
              <ol className="mt-5 list-decimal space-y-2 pl-5 text-sm leading-relaxed">
                {steps.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ol>
            )}
            {tips && (
              <ul className="mt-4 space-y-1.5 rounded-lg bg-surface p-4 text-sm leading-relaxed text-foreground/80">
                {tips.map((t) => (
                  <li key={t} className="flex gap-2">
                    <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
                    {t}
                  </li>
                ))}
              </ul>
            )}
            {link && (
              <Link href={link.href} className="mt-4 inline-flex text-sm font-semibold text-primary hover:underline">
                {link.label} →
              </Link>
            )}
          </section>
        ))}
      </div>

      <section id="livegang" className="mt-6 scroll-mt-28 rounded-xl border border-border bg-white p-6">
        <div className="flex items-start gap-4">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-ink text-white">
            <Rocket className="size-5" />
          </span>
          <div>
            <h2 className="text-lg font-semibold">Livegang & techniek</h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              Dit stel je één keer in, of laat je doen door iemand met wat technische ervaring. Daarna beheer je alles hier in het beheerpaneel.
            </p>
          </div>
        </div>
        <dl className="mt-6 grid gap-5 text-sm leading-relaxed md:grid-cols-2 xl:grid-cols-3">
          {[
            ["Hosting", "De website draait bij Vercel (de makers van Next.js), de database bij Neon (Europa), foto's bij Cloudflare R2. Geen eigen server om bij te houden."],
            ["Domeinnaam", "Registreer bijv. mazdaclubnederland.nl bij een Nederlandse provider en voeg in Vercel het domein toe. Vercel toont welke 2 DNS-regels je bij de provider invult."],
            ["SSL (https)", "Wordt automatisch en gratis geregeld en vernieuwd. Je hoeft er niets voor te doen."],
            ["Back-ups", "De database maakt automatisch herstelpunten. Daarnaast draait er elke nacht een extra back-up naar de foto-opslag. Foto's staan dubbel veilig in Cloudflare R2."],
            ["Updates", "Nieuwe versies van de website worden via GitHub automatisch online gezet. Gaat er iets mis, dan zet je met één klik de vorige versie terug. Beveiligingsupdates worden automatisch voorgesteld."],
            ["Kosten", "Indicatie: € 20–35 per maand (vooral hosting), plus ± € 10 per jaar voor de domeinnaam. Mollie rekent alleen per betaling (iDEAL ± € 0,30)."],
          ].map(([term, text]) => (
            <div key={term} className="rounded-lg bg-surface p-4">
              <dt className="flex items-center gap-2 font-semibold">
                <Globe className="size-4 text-primary" /> {term}
              </dt>
              <dd className="mt-1 text-foreground/80">{text}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
          <LifeBuoy className="size-4" /> Bekijk bij{" "}
          <Link href="/admin/instellingen" className="font-semibold text-primary hover:underline">
            Instellingen
          </Link>{" "}
          of alle koppelingen in orde zijn. Een stappenplan in gewone taal staat in docs/WEBSITE-ONLINE-ZETTEN.md (publiceren, domein koppelen,
          later wijzigen); de technische details in docs/DEPLOYMENT.md.
        </p>
      </section>
    </>
  );
}
