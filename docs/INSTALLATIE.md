# Installatiehandleiding (lokale ontwikkeling)

## 1. Vereisten

| Software | Versie | Opmerking |
| --- | --- | --- |
| Node.js | 20.9 of hoger (getest met 22 en 26 LTS) | Windows: `winget install OpenJS.NodeJS.LTS` |
| PostgreSQL | 15 of hoger | Via Docker, een lokale installatie, `prisma dev` (zonder installatie) of een cloud-database |
| Git | recent | optioneel |

> **Tip (Windows):** zet het project níet in een OneDrive-map. `node_modules` bevat tienduizenden bestanden die OneDrive anders gaat synchroniseren. Bijvoorbeeld `C:\dev\mazdaclub-nederland`.

## 2. Project installeren

```powershell
cd C:\dev\mazdaclub-nederland
npm install
Copy-Item .env.example .env
```

Open `.env` en vul minimaal in:

- `AUTH_SECRET` – genereer met `npx auth secret` (of een willekeurige string van 32+ tekens)
- `DATABASE_URL` – zie stap 3
- `NEXT_PUBLIC_SITE_URL` – lokaal `http://localhost:3000`

Alle overige sleutels zijn optioneel tijdens ontwikkeling: zonder Mollie-sleutel gebruik je testbetalingen (`PAYMENT_PROVIDER="mock"`), zonder Resend-sleutel worden e-mails in de terminal getoond en zonder R2/S3 worden uploads lokaal opgeslagen in `storage/uploads`.

## 3. Database kiezen

**Optie A – zonder installatie (`prisma dev`)**

```powershell
npm run db:dev
```

Laat dit venster open. Prisma toont een verbindings-URL; gebruik de **TCP-URL** als `DATABASE_URL` in `.env` en voeg `&connection_limit=1&pgbouncer=true` toe (deze lichte database ondersteunt maar één echte verbinding en geen gedeelde prepared statements):

```dotenv
DATABASE_URL="postgres://postgres:postgres@localhost:51214/template1?sslmode=disable&connection_limit=1&pgbouncer=true"
```

**Optie B – Docker**

```powershell
docker compose up -d db
```

`DATABASE_URL="postgresql://mazdaclub:mazdaclub@localhost:5432/mazdaclub?schema=public"`

**Optie C – eigen PostgreSQL of cloud (Neon, Supabase, Railway)**

Maak een database aan en zet de verbindings-URL in `DATABASE_URL`.

## 4. Tabellen aanmaken (schone start)

```powershell
npx prisma migrate deploy
npm run db:seed
```

De website start bewust **zonder voorbeelddata**: de seed maakt alleen de zes standaard webshopcategorieën aan (kentekenplaathouders, stickers, drinkbekers, sleutelhangers, kleding, overige) en lokaal één testbeheerder (`admin@mazdaclub.nl`; het wachtwoord staat bovenaan [`prisma/seed.ts`](../prisma/seed.ts), of stel `SEED_ADMIN_EMAIL` / `SEED_PASSWORD` in). Kerncijfers op de homepagina (leden, evenementen) beginnen dus op 0 en groeien vanzelf mee.

| Commando | Wat het doet |
| --- | --- |
| `npm run db:seed` | Schone start; veilig om vaker te draaien (wist niets) |
| `npm run db:fresh` | Lokaal: **wist alle data** en begint opnieuw leeg (lidnummers weer vanaf MCN-00001). Weigert in productie |
| `npm run db:demo` | Lokaal: vult de database met **fictieve demodata** (producten, evenementen, albums, leden, bestellingen) om alle schermen te bekijken. Weigert in productie |

Op de echte website maak je het eerste beheerdersaccount aan via `/installatie` (zie [DEPLOYMENT.md](DEPLOYMENT.md#6-eerste-beheerder-aanmaken)).

## 5. Starten

```powershell
npm run dev
```

Open <http://localhost:3000>. Het beheerpaneel staat op <http://localhost:3000/admin>.

## 6. Handige commando's

| Commando | Doel |
| --- | --- |
| `npm run dev` | ontwikkelserver met hot reload |
| `npm run build` | productiebuild (genereert ook de Prisma-client) |
| `npm run start` | productiebuild draaien |
| `npm run typecheck` | TypeScript-controle |
| `npm run lint` | ESLint |
| `npm run db:migrate` | nieuwe migratie maken na schemawijziging |
| `npm run db:seed` / `db:fresh` / `db:demo` | schone start / alles wissen / demodata (zie stap 4) |
| `npm run db:studio` | database bekijken/bewerken in de browser |

## 7. Externe diensten koppelen

### Mollie (betalingen)
1. Maak een account op [mollie.com](https://www.mollie.com) en kopieer de **test-API-sleutel** (`test_...`).
2. Zet in `.env`: `PAYMENT_PROVIDER="mollie"` en `MOLLIE_API_KEY="test_..."`.
3. Activeer in het Mollie-dashboard: iDEAL | Wero, Bancontact, Creditcard, Apple Pay, Google Pay en PayPal (PayPal: koppel een zakelijk PayPal-account in Mollie).
4. Lokaal kan Mollie je webhook niet bereiken. Dat is opgevangen: de resultaatpagina (`/betaling/resultaat`) vraagt de status zelf op. Wil je webhooks lokaal testen, gebruik dan een tunnel (bijv. `ngrok http 3000`) en zet `NEXT_PUBLIC_SITE_URL` op de tunnel-URL.

### Stripe (optioneel)
`PAYMENT_PROVIDER="stripe"`, `STRIPE_SECRET_KEY` en `STRIPE_WEBHOOK_SECRET`. Lokaal webhooks doorsturen met `stripe listen --forward-to localhost:3000/api/webhooks/stripe`. Automatische jaarlijkse verlenging is alleen met Mollie beschikbaar.

### Resend (e-mail)
Maak een API-sleutel op [resend.com](https://resend.com), verifieer je domein (SPF/DKIM) en zet `RESEND_API_KEY` en `EMAIL_FROM`.

### Cloudflare R2 (foto-opslag)
1. Maak een bucket en een API-token met *Object Read & Write*.
2. Koppel een publiek domein aan de bucket (bijv. `media.mazdaclub.nl`).
3. Zet `STORAGE_DRIVER="s3"`, `S3_ENDPOINT="https://<ACCOUNT_ID>.r2.cloudflarestorage.com"`, `S3_REGION="auto"`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` en `S3_PUBLIC_URL`.
Voor AWS S3: laat `S3_ENDPOINT` leeg en gebruik de juiste regio.

### Cloudflare Turnstile (botbescherming, optioneel)
Zet `NEXT_PUBLIC_TURNSTILE_SITE_KEY` en `TURNSTILE_SECRET_KEY`. Zonder sleutels beschermen honeypot, tijdscontrole en rate limiting de formulieren.

## Problemen oplossen

| Probleem | Oplossing |
| --- | --- |
| `Environment variable not found: DATABASE_URL` | `.env` ontbreekt of staat niet in de projectmap |
| `Can't reach database server` | database draait niet; start `npm run db:dev` of `docker compose up -d db` |
| Inloggen werkt niet na het wijzigen van `AUTH_SECRET` | log opnieuw in (oude sessiecookies zijn ongeldig) |
| Afbeeldingen van Unsplash laden niet | controleer je internetverbinding; vervang ze door eigen foto's via Beheer → Teksten & afbeeldingen |
| `prepared statement "s0" already exists` | voeg `&connection_limit=1&pgbouncer=true` toe aan `DATABASE_URL` (bij `prisma dev`) |
