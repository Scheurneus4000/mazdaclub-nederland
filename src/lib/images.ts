/**
 * Sfeerbeelden (Unsplash-licentie: gratis te gebruiken, ook commercieel). Vervang ze gerust door
 * eigen clubfoto's: upload via /admin/fotoalbums of zet een eigen URL in de seed/het beheer.
 */
export function unsplash(id: string, w = 1600, h?: number): string {
  const size = h ? `&h=${h}&fit=crop` : "";
  return `https://images.unsplash.com/photo-${id}?auto=format&q=80&w=${w}${size}`;
}

export const heroImages = [
  { id: "1787947612261-c2d4feab3454", alt: "Een donkere Mazda MX-5 in de stad met lichtstrepen" },
  { id: "1758675704459-604750a2f853", alt: "Rode Mazda MX-5 cabrio geparkeerd in de straat" },
  { id: "1722553708493-5a22cfdac07f", alt: "Rode Mazda rijdend door een regenachtige straat" },
];

/** Foto's die de seed gebruikt voor albums, evenementen en de homepagina. */
export const photoPool = {
  mx5White: "1643928342307-ff6c85459450",
  mx5WhiteGarage: "1643928342164-2f89c3701f03",
  mx5Black: "1661963834892-80058578ed84",
  mx5Classic: "1762095214741-9b08480e9df7",
  headlight: "1661963834904-6e52b96e6934",
  mx5Red: "1758675704459-604750a2f853",
  lake: "1765406065486-380b46fb4aa4",
  mx5BlueNA: "1667240062478-6fdd70e95cad",
  mountainsNight: "1758509200958-2d9aecc29fb4",
  mx5Autumn: "1781651419267-e53c13412992",
  rainyStreet: "1722553708493-5a22cfdac07f",
  rx7Orange: "1705043133894-180161ae5d61",
  mx5Sunset: "1705440160276-4f277899be75",
  rx7Silver: "1727383114270-28aae0ae56e7",
  rx7Black: "1784818007758-cba79fa307c8",
  mazda3Autumn: "1783078174762-3227bc7b74d8",
  mazda6Red: "1668415759930-5a9dbe80c488",
  mx5LightTrails: "1787947612261-c2d4feab3454",
  cx5White: "1643142311296-304953706775",
  rx7Blue: "1762095213085-2f91bfd26e17",
  rx7BlueWet: "1762095207409-487036f2aab5",
  rx7BlackLot: "1658063289436-10d12a31fd0e",
  rx7White: "1692574021676-ab5d8db0114f",
  rx7Rear: "1548197116-4779e25c8e30",
  rx7OrangeRear: "1652644827306-9d4dd39ed20e",
  rx7WhiteMeet: "1673163638246-a27e09103469",
} as const;
