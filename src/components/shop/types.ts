/** Gedeelde types tussen de webshop-API's en de client-componenten (geen runtime-code). */

export type ShippingMethodValue = "POSTNL_NL" | "POSTNL_BE" | "PICKUP_EVENT";

export type QuoteLineResponse = {
  variantId: string;
  productId: string;
  slug: string;
  name: string;
  variantName: string;
  image: string | null;
  /** Prijs per stuk vóór ledenkorting (centen). */
  unitPrice: number;
  /** Prijs per stuk na eventuele ledenkorting (centen). */
  finalUnitPrice: number;
  /** Aantal waarmee gerekend is (maximaal de voorraad). */
  quantity: number;
  /** Aantal dat in de winkelwagen staat. */
  requested: number;
  lineTotal: number;
  stock: number;
  available: boolean;
  reason: string | null;
};

export type QuoteResponse = {
  subtotal: number;
  discount: number;
  shippingCost: number;
  total: number;
  memberDiscountApplied: boolean;
  isMember: boolean;
  shippingMethod: ShippingMethodValue;
  lines: QuoteLineResponse[];
  /** true als minstens één regel niet (volledig) leverbaar is. */
  hasIssues: boolean;
};

export type CheckoutResponse = {
  checkoutUrl: string;
  orderNumber: string;
};

export type ShopCategoryOption = { slug: string; name: string; count: number };
