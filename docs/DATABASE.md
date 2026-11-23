# Databaseschema

- **Database:** PostgreSQL 15+ (getest met 17)
- **ORM:** Prisma 6 – schema in [`prisma/schema.prisma`](../prisma/schema.prisma), migraties in [`prisma/migrations`](../prisma/migrations)
- **Diagram:** zie [ERD.md](ERD.md)

## Ontwerpprincipes

1. **Bedragen in centen (`Int`).** Geen afrondingsfouten met floats. `500` = € 5,00. Omrekenen gebeurt alleen bij weergave (`formatPrice`) en richting de betaalprovider (`centsToDecimalString`).
2. **Snapshots in bestellingen.** `OrderItem` bewaart productnaam, variantnaam, SKU en de betaalde prijs. Als een product later wordt aangepast of verwijderd, blijft de bestelgeschiedenis kloppen.
3. **Betalingen als eigen tabel.** Elke poging (ook mislukte) is een `Payment`-rij met een polymorfe koppeling naar `Order`, `EventRegistration` of `Membership` (`type` geeft aan welke). Zo zie je in het beheer elke betaalstatus en kun je terugbetalingen en herpogingen volgen.
4. **Idempotente verwerking.** Statusovergangen gebeuren met een voorwaardelijke update (`updateMany ... where status = oud`). Webhook, resultaatpagina en cronjob mogen dezelfde betaling dus tegelijk verwerken zonder dubbele mails of dubbele voorraadmutaties.
5. **Reservering van voorraad en plaatsen.** Bij het afrekenen wordt voorraad direct (atomair, `stock >= aantal`) afgeboekt; een openstaande inschrijving houdt 30 minuten een plek vast. Mislukt of verloopt de betaling, dan komt alles automatisch vrij.
6. **AVG.** Bestellingen en inschrijvingen hebben `onDelete: SetNull` naar `User`: bij het verwijderen van een account blijven fiscaal verplichte gegevens (7 jaar) bewaard, maar zonder koppeling aan het account. Wachtwoord-resettokens worden alleen als SHA-256-hash opgeslagen.

## Tabellen

### `User`
Accounts van leden, niet-leden en beheerders. Wachtwoorden worden met **bcrypt (cost 12)** gehasht. `role` is `USER` of `ADMIN`. `mollieCustomerId` koppelt aan de klant in Mollie (nodig voor automatische incasso).

### `Membership`
Maximaal één per gebruiker (`userId` uniek). Een lidmaatschap is **actief** als `status = ACTIVE` én `currentPeriodEnd > nu`.

| Status | Betekenis |
| --- | --- |
| `PENDING` | Aangemaakt, eerste betaling nog niet voldaan |
| `ACTIVE` | Betaald; geldig tot `currentPeriodEnd` |
| `EXPIRED` | Periode verlopen (gezet door de onderhoudscron) |
| `CANCELLED` | Handmatig beëindigd door een beheerder |

Verlengen sluit aan op het huidige einde (nooit dagen verliezen). Bij automatische verlenging staat het Mollie-abonnement in `mollieSubscriptionId`; elke incasso komt via de webhook binnen als nieuwe `Payment` met `isRecurring = true`. `memberNumber` is een oplopend lidnummer (weergave `MCN-00042`).

### `Event` en `EventRegistration`
`priceNonMember` (standaard € 5,00) en `priceMember` (standaard gratis) staan per evenement in de database, zodat ze per evenement aanpasbaar zijn. Beschikbare plaatsen = `capacity` − bevestigde inschrijvingen − openstaande inschrijvingen jonger dan 30 minuten.
Verplichte velden van een inschrijving: voornaam, achternaam, e-mail, telefoon en kenteken; opmerkingen zijn optioneel. `isMember` legt vast of de deelnemer op dat moment lid was (alleen bij ingelogde actieve leden).

### `ProductCategory`, `Product`, `ProductVariant`
Elk product heeft minimaal één variant; voorraad en SKU zitten op de variant. Een variant kan een eigen prijs hebben (`price`), anders geldt `Product.basePrice`. `attributes` (JSON) bevat filterbare kenmerken zoals `{ "maat": "L", "kleur": "Zwart" }`. `images` is een PostgreSQL-array met URL's.

### `Order` en `OrderItem`
Ondersteunt gastbestellingen (`userId` leeg). `discount` bevat de automatische ledenkorting van 25%. Statussen: `PENDING → PAID → PROCESSING → SHIPPED → COMPLETED`, of `CANCELLED` / `REFUNDED`.

| Verzendmethode | Kosten | Gratis vanaf |
| --- | --- | --- |
| `POSTNL_NL` | € 4,95 | € 75 |
| `POSTNL_BE` | € 7,95 | € 100 |
| `PICKUP_EVENT` | gratis | – |

### `Payment`
`provider` is `MOLLIE` (primair), `STRIPE` (optioneel) of `MOCK` (lokale ontwikkeling). `providerPaymentId` is uniek en wordt in webhooks gebruikt om de betaling terug te vinden. Statussen volgen Mollie: `OPEN`, `PENDING`, `PAID`, `FAILED`, `CANCELED`, `EXPIRED`, `REFUNDED`.

### `Album` en `Photo`
Albums kunnen aan een evenement gekoppeld zijn. Bij upload maakt de server automatisch twee WebP-versies (max. 2400 px en 640 px), draait foto's recht volgens EXIF en **verwijdert alle metadata, inclusief GPS-locatie**. `storageKey`/`thumbKey` verwijzen naar het object in R2/S3 of de lokale opslag.

### `EmailVerificationToken`
Eenmalige links om het e-mailadres te bevestigen (gehasht opgeslagen, 48 uur geldig). `User.emailVerifiedAt` wordt gezet bij
bevestiging, een wachtwoordreset of het accepteren van een uitnodiging. Alleen een bevestigd account met het eigenaarsadres
(`OWNER_EMAIL`) krijgt automatisch de rol `ADMIN`.

### `AppSetting`
Instellingen uit het beheer per onderdeel (`payments`, `membership`, `shipping`, `email`, `notifications`) als JSON, met
`updatedBy`. Geheime waarden staan versleuteld (`{ "enc": "v1:…" }`). Schema's en standaardwaarden: `src/lib/settings.ts`.

### `AdminNotification`
Meldingen voor beheerders (type, titel, bericht, link naar het beheer, `readAt`). Index op `(readAt, createdAt)`.

### `Payment.provider = MANUAL`
Handmatig geregistreerde betalingen (contant, overboeking, gratis/erelid) wanneer een beheerder iemand betaald lid maakt.

### `NewsPost`
Nieuwsberichten. `content` is HTML uit de teksteditor (Tiptap) en wordt zowel bij opslaan als bij tonen opgeschoond (alleen eenvoudige opmaak, geen scripts). Een bericht is zichtbaar als `published = true` én `publishedAt <= nu`; een datum in de toekomst plant het bericht dus automatisch in. Index op `(published, publishedAt)`.

### `SiteContent`
Sleutel/waarde-tabel voor alles wat beheerders zelf aanpassen via **Teksten & afbeeldingen** en **Instellingen**: teksten (homepagina, paginakoppen, footer), afbeeldingen (clublogo, favicon, welkomstfoto's, paginafoto's), contactgegevens, social links, kerncijfers (oprichtingsjaar, ritten per jaar) en de ontvanger van het contactformulier. Alle sleutels, labels, uitleg en standaardwaarden staan in `src/lib/content.ts`. Geen rij = standaardwaarde; een opgeslagen lege waarde = bewust leeg (bijv. geen telefoonnummer). De kerncijfers *leden* en *evenementen* worden niet opgeslagen maar live geteld.

### Evenementbeschrijvingen
`Event.description` bevat sinds de teksteditor HTML; oudere platte tekst wordt automatisch netjes weergegeven (alinea's, kopjes, opsommingen).

### `ContactMessage`
Berichten van het contactformulier, met `handled`-vlag voor opvolging.

### `PartnerOffer`
Voorbereid voor toekomstige uitbreiding: aanbiedingen van partners, optioneel alleen zichtbaar voor actieve leden en met een einddatum.

## Indexen en schaalbaarheid

Indexen zijn gekozen op de zwaarste queries:

| Index | Gebruikt door |
| --- | --- |
| `Membership(status, currentPeriodEnd)` | ledentelling dashboard, onderhoudscron |
| `Event(status, startsAt)` | agenda en homepagina |
| `EventRegistration(eventId, status)` | beschikbare plaatsen, deelnemerslijsten |
| `Product(categoryId, active)` | webshopfilters |
| `Order(status, createdAt)` | bestellingenoverzicht beheer |
| `Payment(type, status)`, `Payment(createdAt)` | omzetstatistieken |
| `Album(published, date)`, `Photo(albumId, sortOrder)` | fotogalerij |
| `NewsPost(published, publishedAt)` | nieuwsoverzicht en homepagina |

Met deze opzet kan één PostgreSQL-instantie zonder problemen tienduizenden leden en honderdduizenden bestellingen aan. Bij groei: gebruik connection pooling (PgBouncer of `?connection_limit=` in `DATABASE_URL`), een managed database met dagelijkse back-ups, en verplaats uploads naar R2/S3 met CDN.

## Migraties

```powershell
npx prisma migrate dev --name omschrijving   # nieuwe migratie maken (ontwikkeling)
npx prisma migrate deploy                    # migraties uitvoeren (productie)
node scripts/migrate-deploy.mjs              # idem, met DIRECT_URL / DATABASE_URL_UNPOOLED (Vercel + Neon)
npx prisma studio                            # data bekijken in de browser
```

| Migratie | Inhoud |
| --- | --- |
| `20261123000000_init` | Alle basistabellen |
| `20261123180000_news` | Tabel `NewsPost` |
| `20261124090000_admin_settings` | `User.emailVerifiedAt`, `EmailVerificationToken`, `AppSetting`, `AdminNotification`, betaalprovider `MANUAL` |

## Startdata

De database start **leeg, zonder voorbeelddata**. `npm run db:seed` maakt alleen de standaard webshopcategorieën aan (en lokaal een testbeheerder). Fictieve demodata voor lokaal testen staat apart in `prisma/demo.ts` (`npm run db:demo`) en weigert in productie te draaien.
