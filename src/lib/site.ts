/** Centrale siteconfiguratie: naam, navigatie en vaste bedragen. */

export const siteConfig = {
  name: "MazdaClub Nederland",
  shortName: "MazdaClub NL",
  description:
    "MazdaClub Nederland is de landelijke vereniging voor Mazda-liefhebbers. Clubritten, evenementen, een eigen webshop en exclusieve ledenvoordelen.",
  keywords: ["Mazda", "MazdaClub", "MX-5", "RX-7", "RX-8", "autoclub", "clubritten", "Mazda evenementen", "Mazda Nederland"],
  locale: "nl_NL",
} as const;

export type NavItem = { label: string; href: string };

export const mainNav: NavItem[] = [
  { label: "Home", href: "/" },
  { label: "Evenementen", href: "/evenementen" },
  { label: "Nieuws", href: "/nieuws" },
  { label: "Webshop", href: "/webshop" },
  { label: "Fotogalerij", href: "/fotogalerij" },
  { label: "Lid worden", href: "/lid-worden" },
  { label: "Contact", href: "/contact" },
];

export const accountNavItem: NavItem = { label: "Mijn Account", href: "/account" };

export const adminNav: NavItem[] = [
  { label: "Dashboard", href: "/admin" },
  { label: "Evenementbeheer", href: "/admin/evenementen" },
  { label: "Bestellingen", href: "/admin/bestellingen" },
  { label: "Gebruikers & leden", href: "/admin/leden" },
];

/** Volledige zijbalk in het beheerpaneel. */
export const adminSidebarNav: NavItem[] = [
  ...adminNav,
  { label: "Nieuws", href: "/admin/nieuws" },
  { label: "Fotoalbums", href: "/admin/fotoalbums" },
  { label: "Producten", href: "/admin/producten" },
  { label: "Teksten & afbeeldingen", href: "/admin/content" },
  { label: "Betalingen", href: "/admin/betalingen" },
  { label: "Meldingen", href: "/admin/meldingen" },
  { label: "Berichten", href: "/admin/berichten" },
  { label: "Instellingen", href: "/admin/instellingen" },
  { label: "Hulp & uitleg", href: "/admin/hulp" },
];

export const legalNav: NavItem[] = [
  { label: "Privacyverklaring", href: "/privacy" },
  { label: "Algemene voorwaarden", href: "/algemene-voorwaarden" },
  { label: "Verzending & retour", href: "/verzending" },
];
