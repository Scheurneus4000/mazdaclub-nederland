# Mappenstructuur

Next.js 15 App Router-project (± 215 bronbestanden). Route groups tussen haakjes (`(site)`) bepalen alleen de layout en komen niet in de URL.

```text
mazdaclub-nederland/
├── prisma/
│   ├── schema.prisma               Databaseschema (zie DATABASE.md / ERD.md)
│   ├── migrations/                 SQL-migraties (prisma migrate)
│   ├── seed.ts                     Schone start: webshopcategorieën (+ lokaal een testbeheerder)
│   └── demo.ts                     Fictieve demodata, alleen voor lokaal testen (npm run db:demo)
├── scripts/migrate-deploy.mjs      Databasemigraties tijdens het bouwen (Vercel/Neon)
├── .github/
│   ├── workflows/backup.yml        Nachtelijke databaseback-up naar Cloudflare R2
│   └── dependabot.yml              Automatische voorstellen voor (beveiligings)updates
├── vercel.json                     Hosting op Vercel: build, regio Frankfurt, onderhoudstaak
├── public/
│   ├── icon.svg                    Favicon / clublogo
│   └── images/products/            Productillustraties (SVG)
├── deploy/
│   ├── Caddyfile                   Reverse proxy + automatische HTTPS (Docker-stack)
│   ├── nginx.conf                  Alternatieve reverse proxy (PM2/systemd)
│   └── backup.sh                   Dagelijkse PostgreSQL-back-up
├── docs/                           Documentatie (dit bestand, API, database, ERD, installatie, deployment)
├── storage/uploads/                Lokale uploads bij STORAGE_DRIVER=local (niet in git)
├── Dockerfile                      Productie-image (Next.js standalone)
├── docker-compose.yml              PostgreSQL + app + Caddy
├── next.config.ts                  Afbeeldingsdomeinen, security headers, standalone output
├── .env.example                    Alle omgevingsvariabelen met uitleg
└── src/
    ├── middleware.ts               Toegangscontrole /admin en /account (Auth.js)
    ├── auth.ts                     Auth.js-configuratie met e-mail/wachtwoord (bcrypt)
    ├── auth.config.ts              Edge-veilige Auth.js-config (rollen in JWT)
    ├── types/next-auth.d.ts        Sessietypes (id, rol)
    │
    ├── app/
    │   ├── layout.tsx              Root: fonts, metadata/SEO, navigatie, cookiebanner, winkelwagen
    │   ├── globals.css             Tailwind 4-thema (wit + Mazda-rood #C00000)
    │   ├── sitemap.ts · robots.ts · not-found.tsx · error.tsx
    │   ├── og/route.tsx            Standaard deelafbeelding voor social media
    │   ├── actions/auth.ts         Server action: uitloggen
    │   │
    │   ├── (site)/                 Publieke website (met footer)
    │   │   ├── page.tsx            Homepagina
    │   │   ├── evenementen/        Agenda + [slug] detail met inschrijfformulier en agendaknoppen
    │   │   ├── nieuws/             Nieuwsoverzicht + [slug] artikel
    │   │   ├── installatie/        Eenmalig: eerste beheerdersaccount aanmaken (SETUP_CODE)
    │   │   ├── e-mail-bevestigen/  E-mailadres bevestigen (eigenaar krijgt dan beheerdersrechten)
    │   │   ├── lid-worden/         Lidmaatschap (€ 50/jaar), aanmelden en verlengen
    │   │   ├── webshop/            Catalogus + [slug] productpagina
    │   │   ├── winkelwagen/ · afrekenen/
    │   │   ├── fotogalerij/        Albums + [slug] album met lichtbox
    │   │   ├── account/            Mijn Account (tabs) + actions.ts
    │   │   ├── inloggen/ · registreren/ · wachtwoord-vergeten/ · wachtwoord-resetten/
    │   │   ├── betaling/           resultaat/ (na betaling) en mock/ (testbetalingen)
    │   │   ├── contact/ · privacy/ · algemene-voorwaarden/ · verzending/
    │   │   └── layout.tsx
    │   │
    │   ├── admin/                  Beheerpaneel (alleen rol ADMIN)
    │   │   ├── layout.tsx          Zijbalk + controle requireAdmin()
    │   │   ├── page.tsx            Dashboard met statistieken en overzichten
    │   │   ├── evenementen/        Lijst, nieuw, [id] (bewerken + deelnemers + export)
    │   │   ├── bestellingen/       Lijst, [id] (status, track & trace)
    │   │   ├── producten/          Lijst, nieuw, [id] (varianten, voorraad, afbeeldingen)
    │   │   ├── leden/              Lijst, nieuw (lid toevoegen + uitnodigen), [id] (gegevens, lidmaatschap, rol)
    │   │   ├── nieuws/             Lijst, nieuw, [id] (teksteditor, coverfoto, publiceren/inplannen)
    │   │   ├── fotoalbums/         Albums, uploaden, vervangen, (meerdere) verwijderen
    │   │   ├── content/            Teksten & afbeeldingen (tabbladen: homepagina, pagina's, logo & afbeeldingen, contact)
    │   │   ├── instellingen/       Overzicht (status) + betalingen/, lidmaatschap/, verzending/, e-mail/, meldingen/
    │   │   ├── meldingen/          Meldingencentrum (nieuwe leden, aanmeldingen, bestellingen, …)
    │   │   ├── bestellingen/[id]/pakbon/  Printbare pakbon
    │   │   ├── hulp/               Handleiding voor beheerders
    │   │   ├── betalingen/ · berichten/
    │   │   └── actions/            Server actions per domein (events, orders, products, members, albums, …)
    │   │
    │   ├── api/                    Route handlers (zie API.md)
    │   │   ├── auth/[...nextauth]/ · register/ · password/{forgot,reset}/ · account/export/
    │   │   ├── events/ · events/[slug]/register/ · events/[slug]/agenda/ (.ics)
    │   │   ├── membership/{checkout,cancel-renewal}/
    │   │   ├── shop/{products,quote,checkout}/
    │   │   ├── payments/[id]/ · payments/mock/[id]/
    │   │   ├── webhooks/{mollie,stripe}/
    │   │   ├── admin/upload/ · admin/export/[type]/
    │   │   ├── contact/ · cron/maintenance/ · health/
    │   │
    │   └── media/[...key]/         Serveert lokale uploads
    │
    ├── components/
    │   ├── ui/                     shadcn/ui-basiscomponenten (button, card, dialog, sheet, tabs, table, …)
    │   ├── layout/                 Navbar, footer, logo, cookiebanner, paginakop
    │   ├── home/                   Hero met wisselende sfeerbeelden
    │   ├── events/                 Evenementkaart, inschrijfformulier, beschrijving, "Zet in je agenda"
    │   ├── news/                   Nieuwskaart en homepagina-sectie
    │   ├── membership/             Aanmeldformulier lidmaatschap
    │   ├── shop/                   Winkelwagen-context, productkaart, filters, varianten, checkout
    │   ├── gallery/                Albumkaart, fotogrid met lichtbox
    │   ├── account/                Accounttabs, ledenpas, profiel- en privacyformulieren
    │   ├── auth/                   Inlog-, registratie- en wachtwoordformulieren
    │   ├── contact/                Contactformulier
    │   ├── admin/                  Beheer-UI: formulieren, teksteditor (Tiptap), uploader, fotogrid, bevestigingsvensters, grafiek
    │   └── forms/anti-spam.tsx     Honeypot + tijdscontrole + Cloudflare Turnstile
    │
    └── lib/
        ├── db.ts                   Prisma-client (singleton)
        ├── session.ts              getCurrentUser / requireUser / requireAdmin
        ├── validation.ts           Zod-schema's voor alle formulieren en API's
        ├── pricing.ts              Prijzen: lidmaatschap, evenementen, 25% korting, verzendkosten
        ├── membership.ts           Actief-check, activeren en verlengen
        ├── events.ts               Beschikbare plaatsen en reserveringen
        ├── shop.ts                 Catalogus, zoeken/filteren, prijsopgave winkelwagen
        ├── orders.ts               Ordernummers, statuslabels, voorraad terugzetten
        ├── payments/               Betaallaag: Mollie, Stripe, Mock + idempotente verwerking (fulfillment)
        ├── email/                  Resend-client en HTML-templates (bevestigingen, reset, verlenging)
        ├── storage.ts              R2/S3 of lokale opslag + beeldoptimalisatie (sharp → WebP)
        ├── export.ts               CSV (Excel-compatibel) en XLSX-export
        ├── content.ts              Alle beheerbare teksten, afbeeldingen en instellingen (labels, uitleg, standaardwaarden)
        ├── news.ts                 Nieuwsqueries en validatie
        ├── calendar.ts             Agenda-links (Google, Outlook) en .ics-bestanden
        ├── rich-text.ts            Opschonen en omzetten van opgemaakte tekst
        ├── system-status.ts        Status van koppelingen voor Beheer → Instellingen
        ├── settings.ts             Instellingen uit het beheer (betalingen, prijzen, verzending, e-mail, meldingen)
        ├── crypto.ts               Versleuteling van API-sleutels en wachtwoorden (AES-256-GCM)
        ├── owner.ts · accounts.ts  Eigenaar (OWNER_EMAIL), e-mailverificatie, nieuwe accounts
        ├── notifications.ts        Meldingen voor beheerders (meldingencentrum + e-mail)
        ├── form-data.ts · iban.ts  Hulpfuncties voor formulieren en IBAN-controle
        ├── setup.ts                Standaard webshopcategorieën
        ├── spam.ts · rate-limit.ts Bescherming tegen bots en misbruik
        ├── site.ts · images.ts     Navigatie/siteconfig en sfeerbeelden
        └── utils.ts · api.ts · client-fetch.ts
```

## Waar pas ik wat aan?

| Wil je… | Kijk in |
| --- | --- |
| Kleuren of lettertypes wijzigen | `src/app/globals.css`, `src/app/layout.tsx` |
| Menu-items aanpassen | `src/lib/site.ts` |
| Prijzen (lidmaatschap, evenementen, korting, verzending) | Beheer → Instellingen → Lidmaatschap & prijzen / Verzending (rekenregels: `src/lib/pricing.ts`) |
| Betaal- of e-mailkoppeling, meldingen | Beheer → Instellingen → Betalingen / E-mail / Meldingen |
| Teksten, foto's, logo, contactgegevens, social links | Beheer → Teksten & afbeeldingen (`/admin/content`) |
| Een nieuw beheerbaar tekst- of afbeeldingsveld toevoegen | `contentDefaults` + `contentFields` in `src/lib/content.ts` |
| Ontvanger contactformulier | Beheer → Instellingen (`/admin/instellingen`) |
| E-mailteksten | `src/lib/email/templates.ts` |
| Een veld aan een tabel toevoegen | `prisma/schema.prisma` → `npm run db:migrate` |
| Een betaalprovider toevoegen | nieuwe adapter in `src/lib/payments/` die `PaymentProviderAdapter` implementeert |
