# Livegang, hosting en onderhoud

> **Liever de korte versie in gewone taal?** Lees eerst [WEBSITE-ONLINE-ZETTEN.md](WEBSITE-ONLINE-ZETTEN.md):
> publiceren, domein koppelen en later wijzigingen doorvoeren in drie delen.

Dit document beschrijft hoe de website online komt op een eigen domein, wat dat kost en hoe SSL, back-ups en
updates geregeld zijn. De **aanbevolen route** (A) vraagt geen eigen server en geen technisch onderhoud: na de
eenmalige inrichting beheert het bestuur alles via het beheerpaneel. Route B (eigen server) is goedkoper maar
vraagt iemand met technische kennis.

---

## In het kort

| Onderwerp | Hoe het geregeld is |
| --- | --- |
| **Hosting** | [Vercel](https://vercel.com) (de makers van Next.js), serverregio Frankfurt. Geen server om bij te houden; schaalt automatisch mee |
| **Database** | [Neon](https://neon.com) PostgreSQL in Frankfurt (EU), met automatische herstelpunten |
| **Foto's** | [Cloudflare R2](https://www.cloudflare.com/developer-platform/r2/): goedkope, snelle opslag zonder kosten voor dataverkeer |
| **E-mail** | [Resend](https://resend.com) verstuurt bevestigingen vanaf je eigen domein (bijv. `noreply@mazdaclubnederland.nl`) |
| **Betalingen** | [Mollie](https://www.mollie.com/nl): iDEAL \| Wero, Bancontact, creditcard, Apple Pay, Google Pay en PayPal |
| **Domeinnaam** | Registratie bij een Nederlandse provider; DNS via Cloudflare (gratis). Twee DNS-regels koppelen het domein aan Vercel |
| **SSL (https)** | Automatisch en gratis via Vercel (Let's Encrypt), inclusief vernieuwen |
| **Back-ups** | Automatische herstelpunten bij Neon + elke nacht een extra back-up naar een privé R2-bucket (GitHub Actions) |
| **Updates** | Code staat op GitHub; elke wijziging gaat automatisch online, met één klik terug te draaien. Dependabot stelt beveiligingsupdates voor |
| **Inhoud** | Teksten, foto's, logo, evenementen, nieuws, producten en leden beheer je in `/admin`; daarvoor is nooit een nieuwe versie nodig |

## Verwachte kosten (indicatie, november 2026)

Prijzen veranderen; controleer ze op de sites van de aanbieders voordat je een begroting maakt.

| Dienst | Kosten | Toelichting |
| --- | --- | --- |
| Vercel Pro | ± € 18–20 per maand ($ 20) | Het gratis Hobby-abonnement is alleen voor niet-commercieel gebruik; met een webshop heb je Pro nodig |
| Neon (database) | € 0–15 per maand | Het gratis abonnement volstaat bij de start; Launch rekent naar gebruik (ruim voldoende voor duizenden leden) |
| Cloudflare R2 + DNS | € 0–2 per maand | 10 GB opslag gratis, geen kosten voor dataverkeer |
| Resend (e-mail) | € 0 | Gratis tot 3.000 e-mails per maand (100 per dag); daarboven ± $ 20 per maand |
| Domeinnaam (.nl) | ± € 5–15 per jaar | Bij bijv. TransIP, Versio, Hostnet of Mijndomein |
| Mailbox `info@…` | € 0–7 per gebruiker per maand | Doorsturen naar een bestaand adres is bij veel domeinproviders gratis; een eigen mailbox via Microsoft 365 of Google Workspace kost ± € 6–7 |
| GitHub | € 0 | Gratis abonnement volstaat |
| **Totaal vast** | **± € 20–35 per maand** | Plus transactiekosten van Mollie |

**Mollie** rekent geen vaste kosten, alleen per geslaagde betaling. Ter indicatie: iDEAL ± € 0,29–0,32, Europese
creditcards ± 1,8% + € 0,25, Bancontact ± € 0,39; bij PayPal betaal je de PayPal-tarieven (± 3,4% + € 0,35) plus een
kleine Mollie-fee. Bij een inschrijving van € 5,00 via iDEAL houdt de club dus ± € 4,70 over. Zie
[mollie.com/nl/pricing](https://www.mollie.com/nl/pricing) voor de actuele tarieven.

**Route B (eigen VPS)** kost ± € 6–12 per maand (bijv. Hetzner of TransIP inclusief back-ups), maar vraagt technisch onderhoud.

## Advies: Mollie of Stripe?

Voor een Nederlandse vereniging adviseren we **Mollie**:

- **Nederlands bedrijf** (Amsterdam) met Nederlandstalig dashboard en support; onboarding met KvK-uittreksel is eenvoudig voor verenigingen.
- **Alle gewenste betaalmethoden in één account**: iDEAL \| Wero, Bancontact, creditcard, Apple Pay, Google Pay en PayPal. Aan- en uitzetten doe je in het Mollie-dashboard, zonder de website aan te passen.
- **Automatische jaarlijkse verlenging** van het lidmaatschap (SEPA-incasso via Mollie-abonnementen) is in deze website alleen met Mollie gebouwd.
- **Geen vaste kosten**, en Mollie regelt de overgang van iDEAL naar **Wero** (2026–2027) automatisch: de website hoeft daarvoor niet te veranderen.

Stripe werkt ook (iDEAL, Bancontact, kaarten, Apple/Google Pay en PayPal via "dynamic payment methods") en is als
alternatief ingebouwd (`PAYMENT_PROVIDER="stripe"`), maar is meer gericht op ontwikkelaars, heeft vooral Engelstalige
support en ondersteunt in deze site geen automatische verlenging.

---

## A. Aanbevolen: Vercel + Neon + Cloudflare R2

Eenmalig ± 1–2 uur werk. Iemand met wat computerervaring kan dit volgen; daarna is geen technisch onderhoud nodig.

### 1. Accounts aanmaken

Maak (bij voorkeur met een algemeen clubadres, bijv. `bestuur@…`) accounts aan bij: GitHub, Vercel (Pro), Neon,
Cloudflare, Resend en Mollie. Leg de inloggegevens vast in een gedeelde wachtwoordkluis van het bestuur.

### 2. Code op GitHub

Maak een **privé** repository (bijv. `mazdaclub-nederland`) en zet de projectmap erin. `.env` wordt bewust niet
meegestuurd (staat in `.gitignore`).

### 3. Domein en DNS

1. Registreer het domein, bijv. `mazdaclubnederland.nl`.
2. Voeg het domein toe aan Cloudflare (gratis abonnement) en zet bij de domeinprovider de **nameservers** op de twee die Cloudflare toont. Vanaf dan beheer je alle DNS-regels in Cloudflare.

### 4. Foto-opslag (Cloudflare R2)

1. Cloudflare → R2 → *Create bucket* `mazdaclub-media` (locatie: Europa).
2. Bucket → *Settings* → *Custom domain*: `media.mazdaclubnederland.nl`.
3. R2 → *Manage API tokens* → token met *Object Read & Write* op deze bucket.
4. Maak voor de back-ups een tweede, **privé** bucket `mazdaclub-backups` met een eigen token, en stel onder *Object lifecycle rules* in dat bestanden na 60 dagen worden verwijderd.

### 5. Vercel-project

1. Vercel → *Add New Project* → kies de GitHub-repository. Framework *Next.js* wordt automatisch herkend; `vercel.json` regelt de rest (bouwen inclusief databasemigraties, regio Frankfurt, onderhoudstaak elk uur).
2. Vercel → *Storage* / *Marketplace* → **Neon** → database aanmaken in regio *Frankfurt (eu-central-1)* en koppelen aan het project. Vercel vult dan zelf `DATABASE_URL` (gepoold) en `DATABASE_URL_UNPOOLED` (voor migraties) in. Zet achter `DATABASE_URL` `&pgbouncer=true`.
3. Vul onder *Settings → Environment Variables* (Production) in:

   ```dotenv
   NEXT_PUBLIC_SITE_URL="https://www.mazdaclubnederland.nl"
   AUTH_SECRET="<lange willekeurige tekst, bijv. via: npx auth secret>"
   AUTH_TRUST_HOST=true
   OWNER_EMAIL="<e-mailadres van de eigenaar>"   # krijgt automatisch beheerdersrechten na bevestiging
   CRON_SECRET="<lange willekeurige tekst>"
   SETUP_CODE="<optioneel: geheime code voor /installatie>"

   # Betalingen en e-mail stel je bij voorkeur in via Beheer → Instellingen (versleuteld opgeslagen).
   # Vul ze alleen hier in als je dat liever via de hosting regelt:
   # PAYMENT_PROVIDER="mollie"  MOLLIE_API_KEY="live_..."  RESEND_API_KEY="re_..."  EMAIL_FROM="..."

   STORAGE_DRIVER="s3"              # verplicht op Vercel (geen blijvende schijf)
   S3_ENDPOINT="https://<ACCOUNT_ID>.r2.cloudflarestorage.com"
   S3_REGION="auto"
   S3_BUCKET="mazdaclub-media"
   S3_ACCESS_KEY_ID="..."
   S3_SECRET_ACCESS_KEY="..."
   S3_PUBLIC_URL="https://media.mazdaclubnederland.nl"
   ```

   Optioneel: `NEXT_PUBLIC_TURNSTILE_SITE_KEY` + `TURNSTILE_SECRET_KEY` (extra spambescherming).
4. Klik op *Deploy*. Na een paar minuten staat de site op een `….vercel.app`-adres. `/api/health` moet "ok" geven.

> Foto-uploads worden in de browser al verkleind, zodat ze binnen de uploadlimiet van Vercel (4,5 MB per verzoek) blijven.

### 6. Eerste beheerder aanmaken

**Aanbevolen – via het eigenaarsadres:** registreer op de website (*Mijn Account → Account aanmaken*) met precies het
adres uit `OWNER_EMAIL` en klik op de link in de bevestigingsmail. Het account krijgt dan automatisch beheerdersrechten en
de knop **Beheerdermodus** verschijnt. Een eigenaar kan door andere beheerders niet worden gedegradeerd of verwijderd.
Is er nog geen e-maildienst gekoppeld, dan staat de bevestigingslink in de serverlog (Vercel → *Logs*).

**Alternatief:** ga naar `https://<jouw-adres>/installatie`, vul de **installatiecode** (`SETUP_CODE`) in en maak een
beheerdersaccount aan. Deze pagina verdwijnt zodra er een beheerder is.

Andere bestuursleden maak je daarna beheerder via Beheerdermodus → Gebruikers & leden → gebruiker → Rol. Controleer vervolgens
**Instellingen → Overzicht**: daar zie je per koppeling of alles in orde is.

### 7. Eigen domein koppelen

1. Vercel → project → *Settings → Domains* → voeg `www.mazdaclubnederland.nl` toe én `mazdaclubnederland.nl` (laat die doorsturen naar www).
2. Vercel toont welke DNS-regels nodig zijn (meestal een **A-record** voor het hoofddomein en een **CNAME** `www` → Vercel). Vul die in bij Cloudflare met *Proxy status: DNS only* (grijze wolk).
3. Binnen enkele minuten tot uren is het domein actief. Het **SSL-certificaat** wordt automatisch aangemaakt en vernieuwd.
4. Controleer dat `NEXT_PUBLIC_SITE_URL` exact het domein is (met `https://www.`) en klik in Vercel op *Redeploy*.

### 8. E-mail op je eigen domein

- **Ontvangen** (`info@` / `contact@`): maak bij je domeinprovider een mailbox of doorstuuradres, of gebruik Microsoft 365 / Google Workspace (die geven MX-records om in Cloudflare te zetten). Vul het adres daarna in bij Instellingen → Overzicht (ontvanger contactformulier), bij Instellingen → E-mail (antwoordadres) en bij Teksten & afbeeldingen → Contact & social (zichtbaar adres).
- **Versturen** (bevestigingsmails) – alles via **Instellingen → E-mail**, zonder code:
  - *Resend (aanbevolen):* Resend → *Domains* → `mazdaclubnederland.nl` toevoegen en de getoonde DNS-regels (SPF, DKIM, MX voor het subdomein `send`) in Cloudflare zetten. Voeg ook een DMARC-regel toe, bijv. `_dmarc` TXT `v=DMARC1; p=none; rua=mailto:info@mazdaclubnederland.nl`. Plak daarna de API-sleutel in het beheer en vul het afzenderadres in.
  - *Eigen mailserver (SMTP):* vul server, poort, gebruikersnaam en wachtwoord van je mailbox in (bijv. Microsoft 365 `smtp.office365.com`, poort 587). Gratis Outlook.com/Hotmail-adressen werken vaak niet meer via SMTP; gebruik dan Resend.
  - Klik op **Stuur testmail** om te controleren dat alles werkt. Wachtwoorden en sleutels worden versleuteld opgeslagen.
- **Meldingen voor jezelf** (nieuwe leden, aanmeldingen voor ritten, bestellingen, contactberichten): Instellingen → Meldingen. Ze verschijnen ook altijd in het meldingencentrum (het belletje in de beheerdermodus).

### 9. Mollie live zetten

1. Rond de onboarding af (KvK-uittreksel, UBO, bankrekening van de vereniging). Uitbetalingen gaan automatisch naar die rekening.
2. Activeer de betaalmethoden: **iDEAL \| Wero, Bancontact, Creditcard, Apple Pay, Google Pay** en **PayPal** (koppel hiervoor een zakelijk PayPal-account in het Mollie-dashboard) en **SEPA-incasso** (nodig voor automatische verlenging). Omdat de site de betaalpagina van Mollie gebruikt, is geen extra Apple Pay-domeinverificatie nodig.
3. Plak de **live**-sleutel (`live_…`) bij **Instellingen → Betalingen** en klik op *Verbinding testen*: je ziet dan welke betaalmethoden actief zijn. Opnieuw publiceren is niet nodig. Bij dezelfde pagina kun je de tenaamstelling en het IBAN van de vereniging invullen; die worden gebruikt voor handmatige overboekingen en betaallinkmails.
4. De webhook (`https://www.mazdaclubnederland.nl/api/webhooks/mollie`) wordt per betaling automatisch meegegeven.
5. Doe een echte testbetaling van € 5,00 (evenement) en betaal die terug via het Mollie-dashboard; de status in Beheer → Betalingen moet *Terugbetaald* worden.

### 10. Back-ups

| Wat | Hoe | Terugzetten |
| --- | --- | --- |
| Database (automatisch) | Neon maakt doorlopend herstelpunten (bewaartermijn afhankelijk van het abonnement) | Neon-dashboard → *Restore* naar een tijdstip |
| Database (extra, elke nacht) | `.github/workflows/backup.yml` maakt om 02:30 een `pg_dump` en zet die in de privé bucket `mazdaclub-backups` | zie hieronder |
| Foto's | Cloudflare R2 bewaart bestanden redundant; elke upload staat ook in de database als verwijzing | — |

Instellen: GitHub → repository → *Settings → Secrets and variables → Actions* → voeg toe: `BACKUP_DATABASE_URL`
(de *unpooled* Neon-URL), `BACKUP_S3_ENDPOINT`, `BACKUP_S3_BUCKET`, `BACKUP_S3_ACCESS_KEY_ID`, `BACKUP_S3_SECRET_ACCESS_KEY`.
Start de workflow één keer handmatig (*Actions → Database-back-up → Run workflow*) om te controleren dat het werkt.

**Back-up terugzetten** (door iemand met technische kennis):

```bash
# 1. Download het gewenste .dump-bestand uit de R2-bucket mazdaclub-backups
# 2. Zet het terug in een (nieuwe of lege) database:
pg_restore --clean --if-exists --no-owner --dbname "<directe database-URL>" mazdaclub_2026-11-23_0230.dump
```

Test het terugzetten bij voorkeur één keer per jaar op een tijdelijke Neon-branch.

### 11. Updates

- **Inhoud** (teksten, foto's, evenementen, nieuws, producten) wijzig je in het beheerpaneel; dat staat direct online.
- **Nieuwe versies van de website**: een wijziging op GitHub wordt automatisch gebouwd en online gezet. Bij een *pull request* maakt Vercel eerst een testversie (preview) die je kunt bekijken. Gaat er iets mis, dan zet je in Vercel → *Deployments* met *Instant Rollback* direct de vorige versie terug.
- **Beveiligingsupdates**: `.github/dependabot.yml` stelt wekelijks updates van onderdelen voor als pull request. Samenvoegen = automatisch online.
- **Databasewijzigingen** worden bij het bouwen automatisch doorgevoerd (`scripts/migrate-deploy.mjs`).

### 12. Monitoring (aanbevolen)

Maak een gratis uptime-check (bijv. UptimeRobot of Better Stack) op `https://www.mazdaclubnederland.nl/api/health`,
met een e-mailmelding naar het bestuur.

---

## B. Alternatief: eigen VPS met Docker Compose

Voordeliger (± € 6–12 per maand), maar iemand moet de server bijhouden (updates, back-ups, monitoring).

### 1. Server voorbereiden (Ubuntu 24.04 LTS, min. 2 vCPU / 4 GB RAM)

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y unattended-upgrades && sudo dpkg-reconfigure -plow unattended-upgrades
sudo adduser deploy && sudo usermod -aG sudo deploy
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker deploy
sudo ufw allow OpenSSH && sudo ufw allow 80 && sudo ufw allow 443 && sudo ufw enable
```

Zet in de DNS een **A-record** (en AAAA voor IPv6) voor het domein en `www` naar het IP-adres van de server.

### 2. Code en configuratie

```bash
sudo mkdir -p /opt/mazdaclub && sudo chown deploy: /opt/mazdaclub
git clone <repository-url> /opt/mazdaclub
cd /opt/mazdaclub
cp .env.example .env
nano .env
```

Vul dezelfde variabelen in als bij route A, plus:

```dotenv
DOMAIN="mazdaclubnederland.nl"
POSTGRES_USER="mazdaclub"
POSTGRES_PASSWORD="<sterk wachtwoord>"
POSTGRES_DB="mazdaclub"
STORAGE_DRIVER="s3"          # of "local" (opslag in Docker-volume 'uploads')
```

`DATABASE_URL` hoeft niet in `.env`: `docker-compose.yml` stelt die zelf samen voor het interne netwerk.

### 3. Starten

```bash
docker compose --profile proxy up -d --build
docker compose logs -f app
```

Bij elke start voert de container automatisch `prisma migrate deploy` uit. Caddy vraagt binnen een minuut een
HTTPS-certificaat aan en vernieuwt het automatisch. Controleer <https://www.mazdaclubnederland.nl/api/health> en maak
daarna de eerste beheerder aan via `/installatie` (met `SETUP_CODE`).

### 4. Geplande taken (cron)

```cron
# Onderhoud: verlopen lidmaatschappen, herinneringsmails, verlopen betalingen opruimen
5 * * * * curl -fsS -H "Authorization: Bearer <CRON_SECRET>" https://www.mazdaclubnederland.nl/api/cron/maintenance > /dev/null
# Dagelijkse databaseback-up om 03:15
15 3 * * * /opt/mazdaclub/deploy/backup.sh >> /var/log/mazdaclub-backup.log 2>&1
```

Bewaar back-ups ook buiten de server (bijv. `rclone` naar een R2-bucket), of gebruik de GitHub-workflow uit route A.

### 5. Updates uitrollen

```bash
cd /opt/mazdaclub && git pull
docker compose --profile proxy up -d --build
docker image prune -f
```

### Zonder Docker (PM2 + Nginx)

```bash
npm ci && npm run build
node scripts/migrate-deploy.mjs
cp -r public .next/standalone/ && cp -r .next/static .next/standalone/.next/
pm2 start .next/standalone/server.js --name mazdaclub --env production
pm2 save && pm2 startup
```

Gebruik `deploy/nginx.conf` als reverse proxy en `certbot --nginx` voor HTTPS.

---

## Checklist voor livegang

- [ ] Beheer → **Instellingen → Overzicht** toont bij alle koppelingen een groen vinkje
- [ ] `OWNER_EMAIL` ingesteld en het eigenaarsaccount aangemaakt en bevestigd
- [ ] `AUTH_SECRET`, `CRON_SECRET` en `SETUP_CODE` zijn lang en uniek (wijzig `AUTH_SECRET` daarna niet meer: de in het beheer opgeslagen sleutels zijn daarmee versleuteld)
- [ ] Testmail verstuurd via Instellingen → E-mail en een testmelding ontvangen via Instellingen → Meldingen
- [ ] Lidmaatschapsprijs, ledenkorting en verzendkosten gecontroleerd (Instellingen → Lidmaatschap & prijzen / Verzending)
- [ ] Mollie live, met iDEAL \| Wero, Bancontact, creditcard, Apple Pay, Google Pay, PayPal en SEPA-incasso actief
- [ ] E-maildomein geverifieerd in Resend (SPF, DKIM, DMARC); `EMAIL_FROM` op het eigen domein
- [ ] Ontvanger contactformulier en zichtbaar e-mailadres ingesteld (bijv. `info@mazdaclubnederland.nl`)
- [ ] Eigen foto's geüpload (geen "Tijdelijke foto"-labels meer in Teksten & afbeeldingen); het clublogo en favicon staan er al
- [ ] KvK-nummer en postadres ingevuld; privacyverklaring en algemene voorwaarden gecontroleerd door het bestuur
- [ ] Verwerkersovereenkomsten (AVG) met Vercel, Neon, Cloudflare, Resend en Mollie vastgelegd (standaard in hun voorwaarden)
- [ ] Nachtelijke back-up één keer handmatig gestart en terugzetten getest
- [ ] `https://www.mazdaclubnederland.nl/sitemap.xml` aangemeld in Google Search Console
- [ ] Uptime-check op `/api/health`
- [ ] Gebruik van de merknaam Mazda afgestemd (de site gebruikt een eigen clublogo, geen Mazda-merklogo)

## Groei naar duizenden leden

| Onderdeel | Aanpak |
| --- | --- |
| Database | Managed PostgreSQL met connection pooling (Neon pooler); indexen staan al op de zware queries. Bij groei het Neon-abonnement ophogen, zonder migratie |
| Afbeeldingen | R2 met CDN; uploads worden bij upload verkleind en naar WebP omgezet; `next/image` levert AVIF/WebP in de juiste maat |
| Applicatie | Stateless (JWT-sessies) en serverless: Vercel schaalt automatisch |
| Rate limiting | Werkt per serverinstantie; bij veel verkeer vervangen door Upstash Redis (zelfde functie-signatuur in `src/lib/rate-limit.ts`) |
| E-mail | Resend schaalt mee; voor nieuwsbrieven aan alle leden een apart abonnement of tool gebruiken |
| Betalingen | Webhooks zijn idempotent en veilig om parallel te verwerken |
