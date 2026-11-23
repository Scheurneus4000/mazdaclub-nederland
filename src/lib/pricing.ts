import type { ShippingMethod } from "@prisma/client";

/**
 * Prijzen en verzendopties. De actuele waarden stelt de beheerder in via Beheer → Instellingen →
 * Lidmaatschap & prijzen en → Verzending; server-code haalt ze op met getPricing() uit @/lib/settings,
 * client-componenten met usePricing() uit @/components/pricing-provider.
 * Dit bestand bevat alleen pure rekenfuncties en de standaardwaarden.
 */

export type ShippingOption = { enabled: boolean; label: string; description: string; cost: number; freeFrom: number | null };

export type Pricing = {
  membershipPriceCents: number;
  memberDiscountPercent: number;
  /** 0–1, bijv. 0.25 */
  memberDiscountRate: number;
  eventPriceNonMemberCents: number;
  eventPriceMemberCents: number;
  autoRenewAvailable: boolean;
  shipping: Record<ShippingMethod, ShippingOption>;
};

/** Standaardwaarden (gelijk aan de standaarden in src/lib/settings.ts). */
export const DEFAULT_PRICING: Pricing = {
  membershipPriceCents: 5000,
  memberDiscountPercent: 25,
  memberDiscountRate: 0.25,
  eventPriceNonMemberCents: 500,
  eventPriceMemberCents: 0,
  autoRenewAvailable: true,
  shipping: {
    POSTNL_NL: { enabled: true, label: "PostNL – Nederland", description: "Binnen 1–3 werkdagen in huis", cost: 495, freeFrom: 7500 },
    POSTNL_BE: { enabled: true, label: "PostNL – België", description: "Binnen 2–4 werkdagen in huis", cost: 795, freeFrom: 10000 },
    PICKUP_EVENT: { enabled: true, label: "Ophalen bij een clubevenement", description: "Gratis, afhalen bij de clubstand", cost: 0, freeFrom: null },
  },
};

/** @deprecated Alleen standaardlabels; gebruik de verzendopties uit getPricing() / usePricing(). */
export const shippingOptions = DEFAULT_PRICING.shipping;

export const SHIPPING_METHODS: ShippingMethod[] = ["POSTNL_NL", "POSTNL_BE", "PICKUP_EVENT"];

/** Een openstaande inschrijving/bestelling houdt plek of voorraad zo lang vast. */
export const PENDING_HOLD_MINUTES = 30;

export function enabledShippingMethods(pricing: Pricing): ShippingMethod[] {
  const enabled = SHIPPING_METHODS.filter((m) => pricing.shipping[m].enabled);
  return enabled.length ? enabled : ["POSTNL_NL"];
}

export function memberUnitPrice(unitPrice: number, discountRate: number = DEFAULT_PRICING.memberDiscountRate): number {
  return Math.round(unitPrice * (1 - discountRate));
}

export function eventPriceFor(event: { priceNonMember: number; priceMember: number }, isMember: boolean): number {
  return isMember ? event.priceMember : event.priceNonMember;
}

export type QuoteLine = {
  variantId: string;
  quantity: number;
  unitPrice: number; // vóór korting
};

export type Quote = {
  subtotal: number;
  discount: number;
  shippingCost: number;
  total: number;
  memberDiscountApplied: boolean;
  lines: Array<QuoteLine & { finalUnitPrice: number; lineTotal: number }>;
};

/**
 * Berekent een prijsopgave aan de serverkant. Prijzen van de client worden nooit vertrouwd:
 * de aanroeper haalt unitPrice zelf uit de database en de prijsinstellingen via getPricing().
 */
export function calculateQuote(lines: QuoteLine[], isMember: boolean, shippingMethod: ShippingMethod, pricing: Pricing = DEFAULT_PRICING): Quote {
  const calculated = lines.map((l) => {
    const finalUnitPrice = isMember ? memberUnitPrice(l.unitPrice, pricing.memberDiscountRate) : l.unitPrice;
    return { ...l, finalUnitPrice, lineTotal: finalUnitPrice * l.quantity };
  });
  const subtotal = calculated.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
  const afterDiscount = calculated.reduce((s, l) => s + l.lineTotal, 0);
  const discount = subtotal - afterDiscount;
  const option = pricing.shipping[shippingMethod];
  const shippingCost = option.freeFrom !== null && afterDiscount >= option.freeFrom ? 0 : option.cost;
  return {
    subtotal,
    discount,
    shippingCost: lines.length === 0 ? 0 : shippingCost,
    total: afterDiscount + (lines.length === 0 ? 0 : shippingCost),
    memberDiscountApplied: isMember && discount > 0,
    lines: calculated,
  };
}

const euro = (cents: number) =>
  new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR", minimumFractionDigits: cents % 100 === 0 ? 0 : 2 }).format(cents / 100);

/**
 * Vervangt prijs-placeholders in beheerbare teksten:
 * {lidmaatschapsprijs} → "€ 50", {ledenkorting} → "25%", {evenementprijs} → "€ 5", {gratisverzending} → "€ 75".
 */
export function fillPricingText(text: string, pricing: Pricing): string {
  if (!text.includes("{")) return text;
  const freeNl = pricing.shipping.POSTNL_NL.freeFrom;
  return text
    .replace(/\{lidmaatschapsprijs\}/g, euro(pricing.membershipPriceCents))
    .replace(/\{ledenkorting\}/g, `${pricing.memberDiscountPercent}%`)
    .replace(/\{evenementprijs\}/g, euro(pricing.eventPriceNonMemberCents))
    .replace(/\{gratisverzending\}/g, freeNl !== null ? euro(freeNl) : "");
}

export const pricingPlaceholderHelp =
  "Tip: {lidmaatschapsprijs}, {ledenkorting}, {evenementprijs} en {gratisverzending} worden automatisch vervangen door de actuele prijzen.";
