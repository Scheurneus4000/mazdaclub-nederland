import { cache } from "react";
import { prisma } from "@/lib/db";
import { photoPool, unsplash } from "@/lib/images";
import { DEFAULT_PRICING, fillPricingText } from "@/lib/pricing";
import { getPricing } from "@/lib/settings";

/** Het officiële clublogo (public/images/logo). Via het beheer te vervangen door een andere versie. */
export const DEFAULT_LOGO = "/images/logo/mazdaclub-nederland-zwart.png";
export const DEFAULT_LOGO_INVERTED = "/images/logo/mazdaclub-nederland-wit.png";
export const DEFAULT_FAVICON = "/images/logo/favicon.png";

/**
 * Beheerbare teksten, afbeeldingen en instellingen. Beheerders passen ze aan via
 * Beheer → Teksten & afbeeldingen (/admin/content) en Beheer → Instellingen (/admin/instellingen).
 * Een lege waarde in de database betekent: gebruik de standaardwaarde hieronder.
 */
export const contentDefaults = {
  // ─── Homepagina: welkomstblok ───
  heroEyebrow: "Opgericht in 2025 · Landelijke Mazda-vereniging",
  heroTitle: "Rijden met passie. Samen met de club.",
  heroSubtitle:
    "MazdaClub Nederland verbindt Mazda-liefhebbers in heel het land. Van eigen toerritten en maandelijkse Mazda Meetings tot een clubpaddock op de mooiste autoevenementen.",

  // ─── Homepagina: kerncijfers (leden en evenementen worden automatisch geteld) ───
  statMembersLabel: "Leden",
  statEventsLabel: "Evenementen",
  statFounded: "2025",
  statFoundedLabel: "Opgericht",
  statRides: "± 6",
  statRidesLabel: "Grote ritten per jaar",

  // ─── Homepagina: over de club ───
  aboutTitle: "Meer dan een club: een gemeenschap van liefhebbers",
  aboutText:
    "MazdaClub Nederland is in 2025 opgericht als landelijke vereniging voor iedereen die van Mazda houdt. Of je nu een klassieke RX-7, een wendbare MX-5 of een moderne CX-60 rijdt: bij ons deel je je passie met gelijkgestemden. We rijden samen, wisselen kennis en ervaringen uit en maken er elke keer weer een mooie dag van.",
  mission:
    "Onze missie is het samenbrengen van Mazda-rijders, het delen van kennis en het beleven van het unieke Jinba Ittai-gevoel: de eenheid tussen bestuurder en auto.",
  activity1Title: "Toerritten",
  activity1Text: "Zelf uitgezette routes door de mooiste delen van Nederland en daarbuiten, van de Nieuwjaarsrit tot de Zomerrit.",
  activity2Title: "Mazda Meetings",
  activity2Text: "Elke maand een informele meeting om bij te praten, auto's te bekijken en ervaringen te delen.",
  activity3Title: "Clubpaddock op evenementen",
  activity3Text: "Op evenementen zoals Japfest en GoJapan staan we met een eigen clubpaddock waar je je bij kunt aansluiten.",
  activity4Title: "Treffens & fotomomenten",
  activity4Text: "Gezellige clubdagen en mooie foto's van elke rit, terug te vinden in onze fotogalerij.",

  // ─── Homepagina: Maandelijkse Mazda Meetings ───
  meetingsEyebrow: "Elke maand",
  meetingsTitle: "Maandelijkse Mazda Meetings",
  meetingsText:
    "Naast onze grote jaarlijkse ritten organiseren wij regelmatig informele Mazda Meetings door heel Nederland. Een ideale gelegenheid om andere Mazda-liefhebbers te ontmoeten, ervaringen uit te wisselen en samen van onze passie voor Mazda te genieten.",

  // ─── Homepagina: overige blokken ───
  benefitsTitle: "Voordelen van het lidmaatschap",
  benefitsIntro: "Voor {lidmaatschapsprijs} per jaar ben je onderdeel van een groeiende, landelijke Mazda-community.",
  photosTitle: "Foto's van onze ritten",
  eventsTitle: "Komende evenementen",
  eventsIntro: "Leden rijden gratis mee. Niet-leden zijn welkom voor {evenementprijs} per evenement.",
  shopTitle: "Laat zien dat je erbij hoort",
  ctaTitle: "Klaar om mee te rijden?",
  ctaText:
    "Word lid en rijd gratis mee met al onze evenementen, krijg {ledenkorting} korting in de webshop en ontmoet Mazda-liefhebbers uit heel Nederland.",
  announcement: "",

  // ─── Paginakoppen ───
  pageEventsTitle: "Evenementen & clubritten",
  pageEventsText:
    "Toerritten, maandelijkse Mazda Meetings en clubpaddocks op evenementen door heel Nederland en daarbuiten. Leden rijden gratis mee; niet-leden zijn welkom voor {evenementprijs} per evenement.",
  pageNewsTitle: "Nieuws uit de club",
  pageNewsText: "Aankondigingen, verslagen van onze ritten en Mazda Meetings en alles wat er speelt binnen MazdaClub Nederland.",
  pageShopTitle: "MazdaClub Webshop",
  pageShopText:
    "Kentekenplaathouders, stickers, kleding en accessoires waarmee je laat zien dat je erbij hoort. Leden krijgen automatisch {ledenkorting} korting.",
  pageGalleryTitle: "Herbeleef onze ritten",
  pageGalleryText: "Blader door de albums van onze ritten en evenementen, bekijk foto's in groot formaat en download je favorieten.",
  pageMembershipTitle: "Word lid van MazdaClub Nederland",
  pageMembershipText:
    "Sluit je aan bij de landelijke community van Mazda-liefhebbers. Rijd gratis mee met al onze evenementen, profiteer van {ledenkorting} webshopkorting en ontmoet gelijkgestemden.",
  pageContactTitle: "We horen graag van je",
  pageContactText:
    "Vragen over het lidmaatschap, een evenement of je bestelling? Of wil je samenwerken met de club? Stuur ons een bericht; onze vrijwilligers helpen je graag.",
  contactResponseTime: "We reageren meestal binnen 2 werkdagen",

  // ─── Contact & social media ───
  contactEmail: "Mazdaclubnl@gmail.com",
  contactPhone: "",
  contactAddress: "",
  kvkNumber: "",
  instagramUrl: "https://www.instagram.com/mazdaclub_nl/",
  facebookUrl: "",
  youtubeUrl: "",
  tiktokUrl: "",
  footerText: "De landelijke vereniging voor Mazda-liefhebbers. Samen rijden, kennis delen en genieten van het Jinba Ittai-gevoel.",

  // ─── Logo en afbeeldingen ───
  logoUrl: DEFAULT_LOGO,
  logoInvertedUrl: DEFAULT_LOGO_INVERTED,
  faviconUrl: DEFAULT_FAVICON,
  shareImageUrl: "",
  heroImage1: unsplash("1787947612261-c2d4feab3454", 2400),
  heroImage2: unsplash("1758675704459-604750a2f853", 2400),
  heroImage3: unsplash("1722553708493-5a22cfdac07f", 2400),
  aboutImage: unsplash(photoPool.mx5Sunset, 1200),
  aboutImageSmall: unsplash(photoPool.rx7Blue, 700),
  meetingsImage: unsplash(photoPool.rx7WhiteMeet, 1400),
  ctaImage: unsplash(photoPool.mountainsNight, 1800),
  pageEventsImage: unsplash(photoPool.mountainsNight, 2000),
  pageNewsImage: unsplash(photoPool.headlight, 2000),
  pageShopImage: unsplash(photoPool.rx7Silver, 2000),
  pageGalleryImage: unsplash(photoPool.mx5Autumn, 2000),
  pageMembershipImage: unsplash(photoPool.mx5Red, 2000),
  pageContactImage: unsplash(photoPool.rainyStreet, 2000),
  authImage: unsplash(photoPool.mx5LightTrails, 1400),

  // ─── Instellingen (Beheer → Instellingen) ───
  contactFormRecipient: "",
};

export type ContentKey = keyof typeof contentDefaults;
export type SiteContent = Record<ContentKey, string>;

export type ContentFieldType = "text" | "textarea" | "email" | "url" | "image" | "logo" | "favicon";
export type ContentTab = "home" | "paginas" | "afbeeldingen" | "contact" | "instellingen";

export type ContentFieldDef = {
  key: ContentKey;
  label: string;
  type: ContentFieldType;
  group: string;
  tab: ContentTab;
  help?: string;
  maxLength?: number;
  /** Mag niet leeg zijn (titels, hoofdfoto's). Wel terug te zetten naar de standaard. */
  required: boolean;
};

/** Velden die niet leeg mogen blijven. */
const REQUIRED = new Set<ContentKey>([
  "heroTitle",
  "heroSubtitle",
  "statMembersLabel",
  "statEventsLabel",
  "aboutTitle",
  "aboutText",
  "meetingsTitle",
  "meetingsText",
  "benefitsTitle",
  "photosTitle",
  "eventsTitle",
  "shopTitle",
  "ctaTitle",
  "pageEventsTitle",
  "pageNewsTitle",
  "pageShopTitle",
  "pageGalleryTitle",
  "pageMembershipTitle",
  "pageContactTitle",
  "contactEmail",
  "heroImage1",
  "aboutImage",
]);

const f = (key: ContentKey, label: string, type: ContentFieldType, tab: ContentTab, group: string, help?: string, maxLength?: number): ContentFieldDef => ({
  key,
  label,
  type,
  tab,
  group,
  help,
  maxLength,
  required: REQUIRED.has(key),
});

/** Volgorde, labels en uitleg van alle beheerbare velden. */
export const contentFields: ContentFieldDef[] = [
  // Homepagina
  f("announcement", "Mededelingsbalk bovenaan de website", "text", "home", "Mededeling", "Bijv. \"Inschrijving Nieuwjaarsrit 2027 is geopend!\". Laat leeg om de balk te verbergen.", 160),
  f("heroEyebrow", "Bovenregel", "text", "home", "Welkomstblok (bovenaan de homepagina)", undefined, 80),
  f("heroTitle", "Titel", "text", "home", "Welkomstblok (bovenaan de homepagina)", "Kort en krachtig, maximaal ± 8 woorden.", 90),
  f("heroSubtitle", "Introductietekst", "textarea", "home", "Welkomstblok (bovenaan de homepagina)", undefined, 320),
  f("statMembersLabel", "Leden – omschrijving", "text", "home", "Kerncijfers", "Het aantal wordt automatisch geteld: alle actieve leden.", 30),
  f("statEventsLabel", "Evenementen – omschrijving", "text", "home", "Kerncijfers", "Het aantal wordt automatisch geteld: alle gepubliceerde evenementen.", 30),
  f("statFounded", "Oprichtingsjaar", "text", "home", "Kerncijfers", undefined, 10),
  f("statFoundedLabel", "Oprichtingsjaar – omschrijving", "text", "home", "Kerncijfers", undefined, 30),
  f("statRides", "Grote ritten per jaar", "text", "home", "Kerncijfers", "Bijv. \"± 6\" of \"6+\".", 10),
  f("statRidesLabel", "Grote ritten – omschrijving", "text", "home", "Kerncijfers", undefined, 30),
  f("aboutTitle", "Titel", "text", "home", "Over de club", undefined, 100),
  f("aboutText", "Tekst", "textarea", "home", "Over de club", undefined, 1200),
  f("mission", "Missie (citaat)", "textarea", "home", "Over de club", undefined, 400),
  f("activity1Title", "Activiteit 1 – titel", "text", "home", "Wat we organiseren", undefined, 50),
  f("activity1Text", "Activiteit 1 – tekst", "textarea", "home", "Wat we organiseren", undefined, 200),
  f("activity2Title", "Activiteit 2 – titel", "text", "home", "Wat we organiseren", undefined, 50),
  f("activity2Text", "Activiteit 2 – tekst", "textarea", "home", "Wat we organiseren", undefined, 200),
  f("activity3Title", "Activiteit 3 – titel", "text", "home", "Wat we organiseren", undefined, 50),
  f("activity3Text", "Activiteit 3 – tekst", "textarea", "home", "Wat we organiseren", undefined, 200),
  f("activity4Title", "Activiteit 4 – titel", "text", "home", "Wat we organiseren", undefined, 50),
  f("activity4Text", "Activiteit 4 – tekst", "textarea", "home", "Wat we organiseren", undefined, 200),
  f("meetingsEyebrow", "Bovenregel", "text", "home", "Maandelijkse Mazda Meetings", undefined, 40),
  f("meetingsTitle", "Titel", "text", "home", "Maandelijkse Mazda Meetings", "De eerstvolgende meeting uit de agenda (een evenement met \"meeting\" in de titel) wordt automatisch getoond.", 80),
  f("meetingsText", "Tekst", "textarea", "home", "Maandelijkse Mazda Meetings", undefined, 800),
  f("benefitsTitle", "Ledenvoordelen – titel", "text", "home", "Overige blokken", undefined, 80),
  f("benefitsIntro", "Ledenvoordelen – introductie", "textarea", "home", "Overige blokken", undefined, 300),
  f("photosTitle", "Fotogalerij – titel", "text", "home", "Overige blokken", undefined, 80),
  f("eventsTitle", "Agenda – titel", "text", "home", "Overige blokken", undefined, 80),
  f("eventsIntro", "Agenda – introductie", "textarea", "home", "Overige blokken", undefined, 300),
  f("shopTitle", "Webshop – titel", "text", "home", "Overige blokken", undefined, 80),
  f("ctaTitle", "Afsluitend blok – titel", "text", "home", "Overige blokken", undefined, 80),
  f("ctaText", "Afsluitend blok – tekst", "textarea", "home", "Overige blokken", undefined, 400),

  // Pagina's
  f("pageEventsTitle", "Titel", "text", "paginas", "Evenementen", undefined, 80),
  f("pageEventsText", "Introductie", "textarea", "paginas", "Evenementen", undefined, 400),
  f("pageNewsTitle", "Titel", "text", "paginas", "Nieuws", undefined, 80),
  f("pageNewsText", "Introductie", "textarea", "paginas", "Nieuws", undefined, 400),
  f("pageShopTitle", "Titel", "text", "paginas", "Webshop", undefined, 80),
  f("pageShopText", "Introductie", "textarea", "paginas", "Webshop", undefined, 400),
  f("pageGalleryTitle", "Titel", "text", "paginas", "Fotogalerij", undefined, 80),
  f("pageGalleryText", "Introductie", "textarea", "paginas", "Fotogalerij", undefined, 400),
  f("pageMembershipTitle", "Titel", "text", "paginas", "Lid worden", undefined, 80),
  f("pageMembershipText", "Introductie", "textarea", "paginas", "Lid worden", undefined, 400),
  f("pageContactTitle", "Titel", "text", "paginas", "Contact", undefined, 80),
  f("pageContactText", "Introductie", "textarea", "paginas", "Contact", undefined, 400),
  f("contactResponseTime", "Reactietijd / bereikbaarheid", "text", "paginas", "Contact", "Bijv. \"We reageren meestal binnen 2 werkdagen\". Leeg = niet tonen.", 120),

  // Afbeeldingen & logo
  f("logoUrl", "Clublogo (zwart)", "logo", "afbeeldingen", "Logo", "Voor witte achtergronden, zoals de menubalk. PNG met transparante achtergrond of SVG werkt het best."),
  f("logoInvertedUrl", "Clublogo (wit)", "logo", "afbeeldingen", "Logo", "Voor donkere achtergronden: de kop van de homepagina, de footer en de digitale ledenpas."),
  f("faviconUrl", "Websitepictogram (favicon)", "favicon", "afbeeldingen", "Logo", "Het kleine pictogram in het browsertabblad. Gebruik een vierkant beeld; het wordt automatisch 512 × 512."),
  f("shareImageUrl", "Deelafbeelding social media", "image", "afbeeldingen", "Logo", "Getoond als iemand een link naar de website deelt (WhatsApp, Facebook). Liggend formaat, bijv. 1200 × 630. Leeg = automatisch ontwerp."),
  f("heroImage1", "Welkomstfoto 1", "image", "afbeeldingen", "Homepagina", "Groot liggend formaat (minimaal 1920 px breed). De foto's wisselen elkaar af."),
  f("heroImage2", "Welkomstfoto 2", "image", "afbeeldingen", "Homepagina", "Kies 'Geen foto' om minder foto's te laten wisselen."),
  f("heroImage3", "Welkomstfoto 3", "image", "afbeeldingen", "Homepagina", "Kies 'Geen foto' om minder foto's te laten wisselen."),
  f("aboutImage", "Over de club – hoofdfoto", "image", "afbeeldingen", "Homepagina", "Staand formaat werkt het best."),
  f("aboutImageSmall", "Over de club – kleine foto", "image", "afbeeldingen", "Homepagina"),
  f("meetingsImage", "Mazda Meetings – foto", "image", "afbeeldingen", "Homepagina"),
  f("ctaImage", "Afsluitend blok – achtergrond", "image", "afbeeldingen", "Homepagina"),
  f("pageEventsImage", "Evenementen", "image", "afbeeldingen", "Paginakoppen"),
  f("pageNewsImage", "Nieuws", "image", "afbeeldingen", "Paginakoppen"),
  f("pageShopImage", "Webshop", "image", "afbeeldingen", "Paginakoppen"),
  f("pageGalleryImage", "Fotogalerij", "image", "afbeeldingen", "Paginakoppen"),
  f("pageMembershipImage", "Lid worden", "image", "afbeeldingen", "Paginakoppen"),
  f("pageContactImage", "Contact", "image", "afbeeldingen", "Paginakoppen"),
  f("authImage", "Inloggen & registreren", "image", "afbeeldingen", "Paginakoppen", "Staand formaat, naast het inlogformulier."),

  // Contact & social
  f("contactEmail", "E-mailadres op de website", "email", "contact", "Contactgegevens", "Wordt getoond op de contactpagina, in de footer en in e-mails. Bijv. info@mazdaclubnederland.nl."),
  f("contactPhone", "Telefoonnummer", "text", "contact", "Contactgegevens", "Leeg = niet tonen.", 40),
  f("contactAddress", "Postadres", "text", "contact", "Contactgegevens", "Leeg = niet tonen.", 160),
  f("kvkNumber", "KvK-nummer", "text", "contact", "Contactgegevens", "Leeg = niet tonen.", 20),
  f("footerText", "Korte omschrijving in de footer", "textarea", "contact", "Contactgegevens", undefined, 300),
  f("instagramUrl", "Instagram", "url", "contact", "Social media", "Volledige link, bijv. https://www.instagram.com/mazdaclub_nl/. Leeg = niet tonen."),
  f("facebookUrl", "Facebook", "url", "contact", "Social media", "Leeg = niet tonen."),
  f("youtubeUrl", "YouTube", "url", "contact", "Social media", "Leeg = niet tonen."),
  f("tiktokUrl", "TikTok", "url", "contact", "Social media", "Leeg = niet tonen."),

  // Instellingen
  f(
    "contactFormRecipient",
    "Ontvanger van het contactformulier",
    "email",
    "instellingen",
    "E-mail",
    "Naar dit adres worden berichten uit het contactformulier doorgestuurd, bijv. info@ of contact@mazdaclubnederland.nl. Leeg = het e-mailadres op de website.",
  ),
];

export const contentTabs: Array<{ id: Exclude<ContentTab, "instellingen">; label: string; description: string }> = [
  { id: "home", label: "Homepagina", description: "Alle teksten op de homepagina." },
  { id: "paginas", label: "Pagina's", description: "Titels en introducties bovenaan de andere pagina's." },
  { id: "afbeeldingen", label: "Logo & afbeeldingen", description: "Clublogo, websitepictogram en alle foto's op de website." },
  { id: "contact", label: "Contact & social", description: "Contactgegevens, footer en links naar social media." },
];

export const contentKeys = Object.keys(contentDefaults) as ContentKey[];

/**
 * Ruwe teksten (met placeholders zoals {lidmaatschapsprijs}), voor het beheerformulier.
 * Geen rij in de database = standaardwaarde; een opgeslagen lege waarde = bewust leeg.
 */
export const getRawContent = cache(async (): Promise<SiteContent> => {
  try {
    const rows = await prisma.siteContent.findMany({ where: { key: { in: contentKeys } } });
    const result = { ...contentDefaults } as SiteContent;
    for (const row of rows) result[row.key as ContentKey] = row.value;
    return result;
  } catch {
    return { ...contentDefaults };
  }
});

/** Teksten voor de website: prijs-placeholders zijn vervangen door de actuele prijzen uit het beheer. */
export const getContent = cache(async (): Promise<SiteContent> => {
  const [raw, pricing] = await Promise.all([getRawContent(), getPricing().catch(() => DEFAULT_PRICING)]);
  const result = { ...raw };
  for (const key of contentKeys) result[key] = fillPricingText(result[key], pricing);
  return result;
});

/** Ruwe database-waarden (zonder standaardwaarden), voor het beheerformulier. */
export async function getStoredContent(): Promise<Partial<SiteContent>> {
  const rows = await prisma.siteContent.findMany({ where: { key: { in: contentKeys } } });
  return Object.fromEntries(rows.map((r) => [r.key, r.value])) as Partial<SiteContent>;
}

/** Afbeeldingen van de welkomstslider (lege velden worden overgeslagen). */
export function heroImagesFrom(c: SiteContent): Array<{ src: string; alt: string }> {
  return [c.heroImage1, c.heroImage2, c.heroImage3].filter(Boolean).map((src, i) => ({ src, alt: `Sfeerbeeld ${i + 1} van MazdaClub Nederland` }));
}

/** Ontvanger van contactformulieren: instelling → ADMIN_EMAIL → openbaar e-mailadres. */
export async function getContactRecipient(): Promise<string | null> {
  const c = await getContent();
  return c.contactFormRecipient || process.env.ADMIN_EMAIL || c.contactEmail || null;
}
