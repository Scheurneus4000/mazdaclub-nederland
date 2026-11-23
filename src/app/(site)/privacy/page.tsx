import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { getContent } from "@/lib/content";

export const metadata: Metadata = {
  title: "Privacyverklaring",
  description: "Lees hoe MazdaClub Nederland omgaat met je persoonsgegevens en cookies, conform de AVG.",
  alternates: { canonical: "/privacy" },
};

const LAST_UPDATED = "23 november 2026";

const toc = [
  { id: "wie-zijn-wij", label: "Wie zijn wij" },
  { id: "gegevens", label: "Welke gegevens en waarom" },
  { id: "grondslagen", label: "Grondslagen" },
  { id: "bewaartermijnen", label: "Bewaartermijnen" },
  { id: "verwerkers", label: "Delen met derden" },
  { id: "beveiliging", label: "Beveiliging" },
  { id: "rechten", label: "Jouw rechten" },
  { id: "cookies", label: "Cookies" },
  { id: "klachten", label: "Klachten" },
  { id: "wijzigingen", label: "Wijzigingen" },
];

export default async function PrivacyPage() {
  const c = await getContent();

  return (
    <>
      <PageHeader
        eyebrow="Juridisch"
        title="Privacyverklaring"
        description="Jouw privacy is belangrijk voor ons. In deze verklaring lees je welke persoonsgegevens MazdaClub Nederland verwerkt, waarom we dat doen en welke rechten je hebt."
        breadcrumbs={[{ label: "Privacyverklaring" }]}
      />

      <div className="container-site grid gap-12 py-14 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-16 lg:py-20">
        <nav aria-label="Inhoudsopgave" className="hidden lg:block">
          <div className="sticky top-28">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Inhoud</p>
            <ul className="mt-4 space-y-2 border-l border-border text-sm">
              {toc.map((t) => (
                <li key={t.id}>
                  <a href={`#${t.id}`} className="-ml-px block border-l-2 border-transparent pl-4 text-muted-foreground hover:border-primary hover:text-foreground">
                    {t.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </nav>

        <article className="prose-club max-w-3xl">
          <p className="text-sm text-muted-foreground">Laatst bijgewerkt: {LAST_UPDATED}</p>

          <h2 id="wie-zijn-wij" className="scroll-mt-28">1. Wie zijn wij</h2>
          <p>
            MazdaClub Nederland (hierna: &quot;de club&quot;, &quot;wij&quot;) is een vereniging van en voor Mazda-liefhebbers, ingeschreven bij de
            Kamer van Koophandel onder nummer {c.kvkNumber}. Wij zijn verwerkingsverantwoordelijke in de zin van de Algemene Verordening
            Gegevensbescherming (AVG) voor de persoonsgegevens die via deze website en onze activiteiten worden verwerkt.
          </p>
          <p>
            Contact over privacy: <a href={`mailto:${c.contactEmail}`}>{c.contactEmail}</a> · {c.contactAddress}
          </p>

          <h2 id="gegevens" className="scroll-mt-28">2. Welke gegevens verwerken we en waarom</h2>
          <h3>Account en lidmaatschap</h3>
          <ul>
            <li>Naam, e-mailadres, telefoonnummer en (optioneel) adres – om je account en lidmaatschap te beheren en met je te communiceren.</li>
            <li>Kenteken en Mazda-model (optioneel) – voor de ledenadministratie en de organisatie van ritten.</li>
            <li>Lidnummer, lidmaatschapsperiode en betaalstatus – om je ledenvoordelen toe te kennen en je lidmaatschap te verlengen.</li>
            <li>Je wachtwoord slaan we uitsluitend versleuteld (gehasht met bcrypt) op; wij kunnen het niet inzien.</li>
          </ul>
          <h3>Inschrijvingen voor evenementen</h3>
          <ul>
            <li>Naam, e-mailadres, telefoonnummer, kenteken en eventuele opmerkingen – om je deelname te bevestigen, deelnemerslijsten op te stellen en je bij wijzigingen of noodgevallen te bereiken.</li>
          </ul>
          <h3>Webshop</h3>
          <ul>
            <li>Naam, e-mailadres, telefoonnummer, bezorgadres en bestelgegevens – om je bestelling te verwerken, te verzenden en je klantenservice te bieden.</li>
          </ul>
          <h3>Betalingen</h3>
          <ul>
            <li>
              Betalingen verlopen via onze betaalprovider. Wij ontvangen alleen de betaalstatus, de gekozen betaalmethode en een referentie;
              bank- of kaartgegevens worden niet door ons opgeslagen.
            </li>
          </ul>
          <h3>Contact en fotogalerij</h3>
          <ul>
            <li>Naam, e-mailadres en de inhoud van je bericht wanneer je het contactformulier gebruikt.</li>
            <li>
              Tijdens evenementen worden foto&apos;s gemaakt die we in de fotogalerij en op social media kunnen plaatsen. Bij uploaden
              verwijderen we automatisch de metadata (zoals GPS-locatie). Wil je niet herkenbaar in beeld? Laat het ons weten, dan verwijderen we
              de foto.
            </li>
          </ul>
          <h3>Technische gegevens</h3>
          <ul>
            <li>IP-adres en browsergegevens – kortstondig, voor beveiliging, het voorkomen van misbruik (spam- en botbescherming) en het goed laten functioneren van de website.</li>
          </ul>

          <h2 id="grondslagen" className="scroll-mt-28">3. Grondslagen voor de verwerking</h2>
          <ul>
            <li><strong>Uitvoering van een overeenkomst</strong> – lidmaatschap, inschrijvingen voor evenementen en webshopbestellingen.</li>
            <li><strong>Wettelijke verplichting</strong> – het bewaren van financiële gegevens voor de fiscale administratie.</li>
            <li><strong>Gerechtvaardigd belang</strong> – beveiliging van de website, fraude- en spampreventie en het organiseren van veilige evenementen.</li>
            <li><strong>Toestemming</strong> – het ontvangen van clubnieuws en het plaatsen van analytische en marketingcookies. Je kunt je toestemming altijd intrekken.</li>
          </ul>

          <h2 id="bewaartermijnen" className="scroll-mt-28">4. Bewaartermijnen</h2>
          <p>We bewaren je gegevens niet langer dan nodig:</p>
          <ul>
            <li><strong>Account- en ledengegevens</strong>: zolang je account actief is, en tot 2 jaar na beëindiging van je lidmaatschap (voor bijvoorbeeld een heraanmelding), tenzij je eerder om verwijdering vraagt.</li>
            <li><strong>Bestellingen, betalingen en facturen</strong>: 7 jaar, op grond van de fiscale bewaarplicht (artikel 52 Algemene wet inzake rijksbelastingen).</li>
            <li><strong>Inschrijvingen voor evenementen</strong>: tot 1 jaar na het evenement; financiële gegevens daarvan 7 jaar.</li>
            <li><strong>Contactberichten</strong>: tot 1 jaar nadat je vraag is afgehandeld.</li>
            <li><strong>Technische logbestanden</strong>: maximaal 30 dagen.</li>
          </ul>

          <h2 id="verwerkers" className="scroll-mt-28">5. Delen met derden (verwerkers)</h2>
          <p>
            Wij verkopen je gegevens nooit. We delen gegevens alleen met partijen die ons helpen de dienstverlening uit te voeren. Met deze
            verwerkers hebben we een verwerkersovereenkomst gesloten en zij verwerken gegevens binnen de Europese Economische Ruimte of met
            passende waarborgen:
          </p>
          <ul>
            <li><strong>Mollie B.V.</strong> (Amsterdam) – verwerking van online betalingen (iDEAL, Bancontact, creditcard, Apple Pay, Google Pay, PayPal). Optioneel <strong>Stripe</strong> als alternatieve betaalprovider.</li>
            <li><strong>Resend</strong> – verzenden van transactionele e-mails, zoals bevestigingen van inschrijvingen en bestellingen.</li>
            <li><strong>Cloudflare (R2)</strong> – opslag en snelle levering van afbeeldingen en foto&apos;s.</li>
            <li><strong>Hostingpartij</strong> – het hosten van de website en de database op servers in de EU.</li>
            <li><strong>PostNL</strong> – bezorging van webshopbestellingen (naam en adres).</li>
          </ul>
          <p>Daarnaast kunnen we gegevens verstrekken als we daartoe wettelijk verplicht zijn.</p>

          <h2 id="beveiliging" className="scroll-mt-28">6. Beveiliging</h2>
          <p>
            We nemen passende technische en organisatorische maatregelen: versleutelde verbindingen (HTTPS), gehashte wachtwoorden,
            toegangsbeperking tot het beheerpaneel, bescherming tegen bots en misbruik, en regelmatige back-ups. Vermoed je een datalek of
            misbruik? Meld het direct via <a href={`mailto:${c.contactEmail}`}>{c.contactEmail}</a>.
          </p>

          <h2 id="rechten" className="scroll-mt-28">7. Jouw rechten</h2>
          <p>Op grond van de AVG heb je de volgende rechten:</p>
          <ul>
            <li><strong>Inzage</strong> – je kunt in <Link href="/account">Mijn Account</Link> je gegevens, lidmaatschap, bestellingen en inschrijvingen bekijken.</li>
            <li><strong>Correctie</strong> – pas je profielgegevens zelf aan in Mijn Account.</li>
            <li><strong>Dataportabiliteit</strong> – download al je gegevens als bestand via Mijn Account (Privacy).</li>
            <li><strong>Verwijdering</strong> – vraag verwijdering van je account aan via Mijn Account of per e-mail. Gegevens die we wettelijk moeten bewaren (zoals facturen) worden geanonimiseerd bewaard tot de bewaartermijn verstreken is.</li>
            <li><strong>Bezwaar en beperking</strong> – maak bezwaar tegen verwerking op basis van gerechtvaardigd belang of vraag om beperking.</li>
            <li><strong>Intrekken van toestemming</strong> – bijvoorbeeld voor clubnieuws of cookies, op elk moment.</li>
          </ul>
          <p>
            Je kunt een verzoek ook sturen naar <a href={`mailto:${c.contactEmail}`}>{c.contactEmail}</a>. We reageren binnen een maand en kunnen je
            vragen je identiteit te bevestigen.
          </p>

          <h2 id="cookies" className="scroll-mt-28">8. Cookies</h2>
          <p>
            Bij je eerste bezoek vragen we via de cookiebanner om je voorkeur. Standaard plaatsen we alleen noodzakelijke cookies. Je kunt je
            keuze altijd wijzigen via &quot;Cookie-instellingen&quot; onderaan elke pagina.
          </p>
          <ul>
            <li>
              <strong>Noodzakelijk</strong> (altijd actief) – een sessiecookie om ingelogd te blijven (geldig tot 30 dagen), beveiligingscookies
              (CSRF-bescherming), en lokale opslag voor je winkelwagen en je cookiekeuze. Hiervoor is geen toestemming nodig.
            </li>
            <li>
              <strong>Analytisch</strong> (alleen met toestemming) – geanonimiseerde statistieken over het gebruik van de website, zodat we die
              kunnen verbeteren.
            </li>
            <li>
              <strong>Marketing</strong> (alleen met toestemming) – ingesloten media van derden, zoals YouTube-video&apos;s, die zelf cookies kunnen
              plaatsen.
            </li>
          </ul>
          <p>
            Bij het afrekenen word je doorgestuurd naar de omgeving van onze betaalprovider; die plaatst daar eigen, voor de betaling
            noodzakelijke cookies. Als botbescherming kunnen we Cloudflare Turnstile gebruiken, dat uitsluitend functionele gegevens verwerkt.
          </p>

          <h2 id="klachten" className="scroll-mt-28">9. Klachten</h2>
          <p>
            Ben je niet tevreden over hoe we met je gegevens omgaan? Neem dan eerst contact met ons op, dan zoeken we samen naar een
            oplossing. Je hebt daarnaast altijd het recht een klacht in te dienen bij de{" "}
            <a href="https://autoriteitpersoonsgegevens.nl" target="_blank" rel="noopener noreferrer">
              Autoriteit Persoonsgegevens
            </a>
            .
          </p>

          <h2 id="wijzigingen" className="scroll-mt-28">10. Wijzigingen</h2>
          <p>
            We kunnen deze privacyverklaring aanpassen, bijvoorbeeld bij nieuwe functies of gewijzigde wetgeving. De actuele versie staat
            altijd op deze pagina. Bij belangrijke wijzigingen informeren we leden per e-mail.
          </p>
        </article>
      </div>
    </>
  );
}
