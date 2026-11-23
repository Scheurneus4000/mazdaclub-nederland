/** Tabs van Mijn Account (gedeeld tussen server en client; bevat bewust geen componenten). */
export const accountTabList = [
  { value: "overzicht", label: "Overzicht" },
  { value: "profiel", label: "Profiel" },
  { value: "lidmaatschap", label: "Lidmaatschap" },
  { value: "bestellingen", label: "Bestellingen" },
  { value: "inschrijvingen", label: "Inschrijvingen" },
  { value: "voordelen", label: "Voordelen" },
  { value: "privacy", label: "Privacy" },
] as const;

export type AccountTab = (typeof accountTabList)[number]["value"];

export function isAccountTab(value: string | null | undefined): value is AccountTab {
  return accountTabList.some((t) => t.value === value);
}
