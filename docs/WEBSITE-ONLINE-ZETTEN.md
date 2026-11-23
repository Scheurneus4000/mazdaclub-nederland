# De website online zetten – stappenplan in gewone taal

Dit is de korte, praktische versie voor de eigenaar. De technische details (alle instellingen, een eigen server,
back-ups terugzetten) staan in [DEPLOYMENT.md](DEPLOYMENT.md).

**Wat je nodig hebt:** ± 1–2 uur, een creditcard of iDEAL voor de abonnementen, en toegang tot je e-mail.
**Kosten:** ± € 20–35 per maand plus ± € 10 per jaar voor de domeinnaam (zie DEPLOYMENT.md voor de opbouw).

---

## Deel 1 – Publiceren (eenmalig)

### Stap 1. Accounts aanmaken
Maak gratis accounts aan bij:

| Dienst | Waarvoor | Link |
| --- | --- | --- |
| GitHub | Bewaart de code van de website | github.com |
| Vercel | Zet de website online (kies het **Pro**-abonnement, nodig voor een webshop) | vercel.com |
| Cloudflare | Foto-opslag (R2) en DNS van je domein | cloudflare.com |
| Mollie | Online betalingen | mollie.com |
| Resend | Versturen van bevestigingsmails | resend.com |

Tip: gebruik voor al deze accounts hetzelfde e-mailadres en bewaar de wachtwoorden in een wachtwoordkluis.

### Stap 2. De code op GitHub zetten
1. Maak op GitHub een nieuwe **privé** repository, bijvoorbeeld `mazdaclub-nederland`.
2. Zet de projectmap erin, bijvoorbeeld met GitHub Desktop (*Add existing repository* → *Publish*).
   Het bestand `.env` met geheime waarden gaat bewust níet mee.

### Stap 3. De website koppelen aan Vercel
1. Log in bij Vercel → **Add New → Project** → kies je GitHub-repository → **Import**.
2. Ga in het project naar **Storage** (of *Marketplace*) → **Neon** → maak een database aan in regio **Frankfurt** en koppel die aan het project. Daarmee staat de database klaar.
3. Ga naar **Settings → Environment Variables** en vul deze vijf in (de rest regel je later in het beheer):

   | Naam | Waarde |
   | --- | --- |
   | `NEXT_PUBLIC_SITE_URL` | het adres van je website, bijv. `https://www.mazdaclubnederland.nl` |
   | `AUTH_SECRET` | een lange willekeurige tekst (bijv. 40 letters en cijfers door elkaar) |
   | `OWNER_EMAIL` | jouw e-mailadres: dit account krijgt automatisch beheerdersrechten |
   | `CRON_SECRET` | nog een lange willekeurige tekst |
   | `STORAGE_DRIVER` + `S3_…` | de gegevens van je Cloudflare R2-bucket (zie DEPLOYMENT.md stap 4) |

4. Klik op **Deploy**. Na een paar minuten staat de website op een tijdelijk adres (`…vercel.app`).

### Stap 4. Jezelf beheerder maken
1. Open de website en klik op **Mijn Account → Account aanmaken**.
2. Registreer met **precies het e-mailadres uit `OWNER_EMAIL`**.
3. Klik op de link in de bevestigingsmail. Je krijgt dan automatisch beheerdersrechten en ziet bovenaan de knop **Beheerdermodus**.
   (Zolang er nog geen e-maildienst is gekoppeld, kan de websitebouwer de link in de serverlog van Vercel vinden.)

### Stap 5. Alles instellen in het beheer – zonder code
Klik op **Beheerdermodus → Instellingen**. Het tabblad *Overzicht* laat met groene vinkjes zien wat klaar is.

1. **Betalingen** – plak je Mollie API-sleutel (test- of live-sleutel uit het Mollie-dashboard) en klik op *Verbinding testen*.
   Het geld komt automatisch op de bankrekening die je in je Mollie-account hebt ingesteld.
2. **E-mail** – kies *Resend* (aanbevolen) of je eigen mailserver, vul je afzenderadres in (bijv. `noreply@mazdaclubnederland.nl`) en klik op *Stuur testmail*.
3. **Lidmaatschap & prijzen** – lidmaatschapsprijs, ledenkorting en standaardprijzen voor evenementen.
4. **Verzending** – je afzendadres, verzendkosten en wanneer verzending gratis is.
5. **Meldingen** – kies welke e-mailmeldingen je wilt ontvangen (nieuwe leden, aanmeldingen voor ritten, bestellingen …).

---

## Deel 2 – Je eigen domeinnaam koppelen

1. **Domein kopen** – registreer bijvoorbeeld `mazdaclubnederland.nl` bij een Nederlandse provider (TransIP, Versio, Hostnet, Mijndomein).
2. **DNS naar Cloudflare** – voeg het domein toe in Cloudflare en zet bij je domeinprovider de twee *nameservers* die Cloudflare toont. (Dit is één keer instellen; Cloudflare is gratis.)
3. **Domein in Vercel** – Vercel → project → **Settings → Domains** → voeg `www.mazdaclubnederland.nl` en `mazdaclubnederland.nl` toe. Vercel laat zien welke twee regels je in Cloudflare moet invullen (een *A*-regel en een *CNAME*-regel). Zet in Cloudflare de wolk op **grijs** (*DNS only*).
4. **Wachten** – binnen enkele minuten tot een paar uur werkt het domein. Het **beveiligingsslotje (SSL)** wordt automatisch en gratis geregeld.
5. **Adres bijwerken** – zet `NEXT_PUBLIC_SITE_URL` in Vercel op je nieuwe adres en klik op **Redeploy**.
6. **E-mailadres op je domein** – maak bij je domeinprovider `info@…` aan (of een doorstuuradres) en volg in het beheer **Instellingen → E-mail** de uitleg om het domein bij Resend te verifiëren. Dan komen bevestigingsmails van je eigen adres en niet in de spam.

---

## Deel 3 – Later iets veranderen

| Wat wil je veranderen? | Hoe | Code nodig? |
| --- | --- | --- |
| Teksten, foto's, logo | Beheerdermodus → Teksten & afbeeldingen | Nee |
| Evenementen, nieuws, fotoalbums | Beheerdermodus → Evenementbeheer / Nieuws / Fotoalbums | Nee |
| Producten, voorraad, bestellingen | Beheerdermodus → Producten / Bestellingen | Nee |
| Gebruikers, leden, betaald lid maken | Beheerdermodus → Gebruikers & leden | Nee |
| Prijzen, verzendkosten, betalingen, e-mail, meldingen | Beheerdermodus → Instellingen | Nee |
| Een nieuwe functie of een ander ontwerp | Laat de wijziging in de code maken (bijv. door een ontwikkelaar of met Claude) en zet die op GitHub. Vercel zet de nieuwe versie **automatisch** online | Ja |

**Veilig wijzigen:** maak een wijziging in de code eerst in een aparte *branch* of *pull request*. Vercel maakt daarvan een
testversie (*Preview*) met een eigen link, zodat je kunt kijken vóór het live gaat. Gaat er na livegang toch iets mis?
Vercel → **Deployments** → kies de vorige versie → **Instant Rollback**. Binnen een paar seconden staat de oude versie terug.

**Updates en beveiliging:** GitHub stelt elke week automatisch updates voor (Dependabot). Je ziet ze als pull request;
na samenvoegen gaan ze vanzelf online. Back-ups van de database worden elke nacht gemaakt (zie DEPLOYMENT.md, stap 10).
