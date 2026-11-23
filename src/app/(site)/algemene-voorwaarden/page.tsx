import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { getContent } from "@/lib/content";
import { getPricing } from "@/lib/settings";
import { formatPrice } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Algemene voorwaarden",
  description: "De algemene voorwaarden van MazdaClub Nederland voor lidmaatschap, evenementen, de webshop en betalingen.",
  alternates: { canonical: "/algemene-voorwaarden" },
};

const LAST_UPDATED = "23 november 2026";

const toc = [
  { id: "definities", label: "Definities" },
  { id: "lidmaatschap", label: "Lidmaatschap" },
  { id: "evenementen", label: "Evenementen" },
  { id: "webshop", label: "Webshop" },
  { id: "herroeping", label: "Herroepingsrecht" },
  { id: "betalingen", label: "Betalingen" },
  { id: "aansprakelijkheid", label: "Aansprakelijkheid" },
  { id: "privacy", label: "Privacy en beeldmateriaal" },
  { id: "klachten", label: "Klachten" },
  { id: "recht", label: "Toepasselijk recht" },
];

export default async function TermsPage() {
  const [c, pricing] = await Promise.all([getContent(), getPricing()]);

  return (
    <>
      <PageHeader
        eyebrow="Juridisch"
        title="Algemene voorwaarden"
        description="Deze voorwaarden zijn van toepassing op het lidmaatschap van MazdaClub Nederland, deelname aan onze evenementen en aankopen in de webshop."
        breadcrumbs={[{ label: "Algemene voorwaarden" }]}
      />

      <div className="container-site grid gap-12 py-14 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-16 lg:py-20">
        <nav aria-label="Inhoudsopgave" className="hidden lg:block">
          <div className="sticky top-28">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Inhoud</p>
            <ol className="mt-4 space-y-2 border-l border-border text-sm">
              {toc.map((t, i) => (
                <li key={t.id}>
                  <a href={`#${t.id}`} className="-ml-px block border-l-2 border-transparent pl-4 text-muted-foreground hover:border-primary hover:text-foreground">
                    {i + 1}. {t.label}
                  </a>
                </li>
              ))}
            </ol>
          </div>
        </nav>

        <article className="prose-club max-w-3xl">
          <p className="text-sm text-muted-foreground">
            Laatst bijgewerkt: {LAST_UPDATED} · MazdaClub Nederland, KvK {c.kvkNumber}, {c.contactAddress},{" "}
            <a href={`mailto:${c.contactEmail}`}>{c.contactEmail}</a>
          </p>

          <h2 id="definities" className="scroll-mt-28">1. Definities</h2>
          <ul>
            <li><strong>Club</strong>: de vereniging MazdaClub Nederland.</li>
            <li><strong>Lid</strong>: een natuurlijk persoon met een actief, betaald lidmaatschap van de club.</li>
            <li><strong>Deelnemer</strong>: iedereen (lid of niet-lid) die zich inschrijft voor een evenement van de club.</li>
            <li><strong>Koper</strong>: iedereen die een bestelling plaatst in de webshop van de club.</li>
          </ul>

          <h2 id="lidmaatschap" className="scroll-mt-28">2. Lidmaatschap</h2>
          <ol>
            <li>Het lidmaatschap kost {formatPrice(pricing.membershipPriceCents)} per jaar en gaat in op de dag dat de betaling is ontvangen. Het lidmaatschap is persoonlijk en niet overdraagbaar.</li>
            <li>
              Het lidmaatschap geldt voor een periode van twaalf maanden. Heb je gekozen voor automatische verlenging, dan wordt het
              lidmaatschap telkens met twaalf maanden verlengd en wordt de contributie via automatische incasso afgeschreven op de
              verlengdatum.
            </li>
            <li>
              Opzeggen kan op elk moment door de automatische verlenging uit te zetten in <Link href="/account">Mijn Account</Link> of door een
              e-mail te sturen, uiterlijk vóór de verlengdatum. Het lidmaatschap loopt dan tot het einde van de lopende periode; reeds betaalde
              contributie wordt niet naar rato terugbetaald, behalve binnen de bedenktijd (zie artikel 5).
            </li>
            <li>Zonder automatische verlenging ontvang je ongeveer 30 dagen vóór de einddatum een herinnering om je lidmaatschap handmatig te verlengen.</li>
            <li>
              Als lid neem je gratis deel aan evenementen (tenzij bij een evenement uitdrukkelijk anders vermeld), krijg je {pricing.memberDiscountPercent}% korting op
              producten in de webshop en krijg je toegang tot exclusieve ledenvoordelen en partneraanbiedingen zodra die beschikbaar zijn.
            </li>
            <li>Het bestuur kan het lidmaatschap beëindigen bij gedrag dat de club, haar leden of deelnemers schaadt, zoals herhaaldelijk gevaarlijk rijgedrag tijdens evenementen.</li>
            <li>De club mag de contributie jaarlijks aanpassen. Wijzigingen worden minimaal twee maanden vooraf aangekondigd en gelden vanaf de eerstvolgende verlenging.</li>
          </ol>

          <h2 id="evenementen" className="scroll-mt-28">3. Evenementen</h2>
          <ol>
            <li>
              Leden nemen gratis deel aan evenementen. Niet-leden betalen {formatPrice(pricing.eventPriceNonMemberCents)} per evenement, tenzij een
              ander bedrag is vermeld. Een inschrijving is definitief na ontvangst van de bevestigingsmail.
            </li>
            <li>Het aantal plaatsen is beperkt. Een openstaande inschrijving houdt een plaats maximaal 30 minuten vast; daarna vervalt de reservering als de betaling niet is afgerond.</li>
            <li>
              Deelname is volledig op eigen risico. De deelnemer is zelf verantwoordelijk voor een technisch goede, verzekerde en APK-gekeurde
              auto, een geldig rijbewijs en het naleven van de verkeersregels. Clubritten zijn toerritten en geen wedstrijden.
            </li>
            <li>Aanwijzingen van de organisatie en (bij evenementen van derden, zoals een clubpaddock) van de organisator van dat evenement moeten worden opgevolgd. Bij gevaarlijk rijgedrag of alcohol- of drugsgebruik kan een deelnemer zonder restitutie worden uitgesloten.</li>
            <li>
              Annuleren door de deelnemer kan tot 48 uur vóór aanvang via e-mail; de deelnamekosten worden dan teruggestort. Bij latere
              annulering of niet verschijnen vindt geen restitutie plaats.
            </li>
            <li>De club mag een evenement wijzigen of annuleren, bijvoorbeeld bij extreem weer of te weinig aanmeldingen. Bij annulering door de club worden betaalde deelnamekosten volledig terugbetaald.</li>
          </ol>

          <h2 id="webshop" className="scroll-mt-28">4. Webshop</h2>
          <ol>
            <li>Alle prijzen zijn in euro&apos;s en inclusief btw. Verzendkosten worden vóór het afronden van de bestelling getoond; zie ook <Link href="/verzending">Verzending &amp; retour</Link>.</li>
            <li>De ledenkorting van {pricing.memberDiscountPercent}% wordt automatisch toegepast wanneer je bent ingelogd met een actief lidmaatschap. Kortingen zijn niet met elkaar te combineren, tenzij anders vermeld.</li>
            <li>De overeenkomst komt tot stand na ontvangst van de betaling. Je ontvangt een bevestiging per e-mail.</li>
            <li>We streven ernaar bestellingen binnen 1–3 werkdagen te verzenden. Opgegeven levertijden zijn indicatief; bij vertraging informeren we je.</li>
            <li>Kennelijke vergissingen of fouten in het aanbod (zoals een duidelijk verkeerde prijs) binden de club niet.</li>
            <li>Op alle producten is de wettelijke garantie van toepassing: een product moet doen wat je er redelijkerwijs van mag verwachten. Neem bij een defect contact met ons op; we zorgen voor herstel, vervanging of terugbetaling.</li>
          </ol>

          <h2 id="herroeping" className="scroll-mt-28">5. Herroepingsrecht (bedenktijd)</h2>
          <ol>
            <li>
              <strong>Webshop</strong>: je mag een aankoop binnen 14 dagen na ontvangst zonder opgave van reden ontbinden. Meld dit binnen die
              termijn per e-mail en stuur het product binnen 14 dagen daarna ongebruikt en in de originele verpakking terug. Wij betalen het
              aankoopbedrag inclusief de standaard verzendkosten binnen 14 dagen terug; de kosten van het terugsturen zijn voor jou.
              Gepersonaliseerde producten (bijvoorbeeld met eigen tekst of kenteken) zijn uitgezonderd.
            </li>
            <li>
              <strong>Lidmaatschap</strong>: je hebt 14 dagen bedenktijd na aanmelding. Zeg je binnen die termijn op, dan betalen we de
              contributie terug, verminderd met een redelijk bedrag voor in die periode genoten voordelen (zoals deelname aan een evenement of
              gebruikte webshopkorting).
            </li>
            <li>
              <strong>Evenementen</strong>: voor inschrijvingen voor een evenement op een specifieke datum geldt wettelijk geen herroepingsrecht;
              de annuleringsregeling uit artikel 3 is van toepassing.
            </li>
          </ol>

          <h2 id="betalingen" className="scroll-mt-28">6. Betalingen</h2>
          <ol>
            <li>Betalingen verlopen via een gecertificeerde betaalprovider (Mollie, eventueel Stripe). Je kunt betalen met iDEAL, Bancontact, creditcard, Apple Pay, Google Pay of PayPal.</li>
            <li>Bij automatische verlenging van het lidmaatschap geef je toestemming voor een terugkerende afschrijving. Een SEPA-incasso kun je binnen 8 weken via je bank laten terugboeken.</li>
            <li>Mislukt een automatische incasso, dan ontvang je bericht. Wordt de contributie niet alsnog voldaan, dan eindigt het lidmaatschap aan het einde van de lopende periode.</li>
            <li>Terugbetalingen gebeuren via dezelfde betaalmethode als waarmee is betaald.</li>
          </ol>

          <h2 id="aansprakelijkheid" className="scroll-mt-28">7. Aansprakelijkheid</h2>
          <ol>
            <li>
              De club, haar bestuur en vrijwilligers zijn niet aansprakelijk voor schade aan personen, voertuigen of eigendommen tijdens of in
              verband met evenementen, behalve bij opzet of grove nalatigheid van de club.
            </li>
            <li>De deelnemer is aansprakelijk voor schade die hij of zij (of een passagier) veroorzaakt aan derden, de club of locaties.</li>
            <li>De aansprakelijkheid van de club is in alle gevallen beperkt tot het bedrag dat de deelnemer of koper aan de club heeft betaald voor het betreffende evenement of de betreffende bestelling.</li>
          </ol>

          <h2 id="privacy" className="scroll-mt-28">8. Privacy en beeldmateriaal</h2>
          <p>
            We gaan zorgvuldig om met je persoonsgegevens; lees onze <Link href="/privacy">privacyverklaring</Link>. Tijdens evenementen worden
            foto&apos;s en video&apos;s gemaakt die de club mag gebruiken in de fotogalerij, op social media en in clubcommunicatie. Wil je een
            foto laten verwijderen, neem dan contact met ons op.
          </p>

          <h2 id="klachten" className="scroll-mt-28">9. Klachten</h2>
          <p>
            Heb je een klacht? Meld die zo snel mogelijk, volledig en duidelijk omschreven via <Link href="/contact">het contactformulier</Link> of{" "}
            <a href={`mailto:${c.contactEmail}`}>{c.contactEmail}</a>. We bevestigen de ontvangst binnen 2 werkdagen en streven ernaar de klacht
            binnen 14 dagen af te handelen. Kom je er met ons niet uit, dan kun je je geschil voorleggen via het Europese ODR-platform (
            <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer">ec.europa.eu/consumers/odr</a>).
          </p>

          <h2 id="recht" className="scroll-mt-28">10. Toepasselijk recht</h2>
          <p>
            Op deze voorwaarden en alle overeenkomsten met de club is Nederlands recht van toepassing. Geschillen worden voorgelegd aan de
            bevoegde rechter in het arrondissement waar de club is gevestigd, tenzij dwingend recht anders bepaalt. De club kan deze
            voorwaarden wijzigen; de versie die gold op het moment van aanmelden, inschrijven of bestellen is van toepassing.
          </p>
        </article>
      </div>
    </>
  );
}
