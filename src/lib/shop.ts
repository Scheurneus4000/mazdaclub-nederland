import type { Prisma, ShippingMethod } from "@prisma/client";
import type { ProductCardData } from "@/components/shop/product-card";
import type { QuoteLineResponse, QuoteResponse, ShopCategoryOption } from "@/components/shop/types";
import { prisma } from "@/lib/db";
import { calculateQuote, type Pricing } from "@/lib/pricing";

/**
 * Webshop-helpers voor de server (pagina's en API-routes).
 * Niet importeren in client-componenten: dit bestand gebruikt Prisma.
 */

export const productCardInclude = {
  category: { select: { name: true, slug: true } },
  variants: { where: { active: true }, select: { id: true, price: true, stock: true }, orderBy: { sortOrder: "asc" } },
} satisfies Prisma.ProductInclude;

export type ProductWithCardData = Prisma.ProductGetPayload<{ include: typeof productCardInclude }>;

/** Effectieve prijs van een variant: eigen prijs of basisprijs van het product. */
export function variantPrice(product: { basePrice: number }, variant: { price: number | null }): number {
  return variant.price ?? product.basePrice;
}

export function toProductCard(p: ProductWithCardData): ProductCardData {
  const prices = p.variants.map((v) => variantPrice(p, v));
  const fromPrice = prices.length ? Math.min(...prices) : p.basePrice;
  return {
    slug: p.slug,
    name: p.name,
    categoryName: p.category.name,
    image: p.images[0] ?? null,
    fromPrice,
    hasMultiplePrices: new Set(prices).size > 1,
    inStock: p.variants.some((v) => v.stock > 0),
    featured: p.featured,
  };
}

// ─────────────────────────────────────────────────────────────
// Catalogus: zoeken, filteren, sorteren, pagineren
// ─────────────────────────────────────────────────────────────

export const SHOP_PAGE_SIZE = 24;

export const shopSortOptions = [
  { value: "nieuw", label: "Nieuwste eerst" },
  { value: "prijs-op", label: "Prijs: laag naar hoog" },
  { value: "prijs-af", label: "Prijs: hoog naar laag" },
  { value: "naam", label: "Naam: A–Z" },
] as const;

export type ShopSort = (typeof shopSortOptions)[number]["value"];

export type ShopFilters = {
  q: string;
  categorie: string;
  sorteer: ShopSort;
  voorraad: boolean;
  pagina: number;
};

type ParamSource = URLSearchParams | Record<string, string | string[] | undefined>;

function readParam(source: ParamSource, key: string): string {
  if (source instanceof URLSearchParams) return source.get(key) ?? "";
  const value = source[key];
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

export function parseShopFilters(source: ParamSource): ShopFilters {
  const sort = readParam(source, "sorteer");
  const page = Number.parseInt(readParam(source, "pagina"), 10);
  return {
    q: readParam(source, "q").trim().slice(0, 100),
    categorie: readParam(source, "categorie").replace(/[^a-z0-9-]/g, "").slice(0, 80),
    sorteer: (shopSortOptions.some((o) => o.value === sort) ? sort : "nieuw") as ShopSort,
    voorraad: readParam(source, "voorraad") === "1",
    pagina: Number.isFinite(page) && page > 0 ? Math.min(page, 1000) : 1,
  };
}

/** Zet filters om naar een querystring (lege waarden en standaardwaarden worden weggelaten). */
export function shopFiltersToQuery(f: Partial<ShopFilters>): string {
  const params = new URLSearchParams();
  if (f.q) params.set("q", f.q);
  if (f.categorie) params.set("categorie", f.categorie);
  if (f.sorteer && f.sorteer !== "nieuw") params.set("sorteer", f.sorteer);
  if (f.voorraad) params.set("voorraad", "1");
  if (f.pagina && f.pagina > 1) params.set("pagina", String(f.pagina));
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

function productOrderBy(sort: ShopSort): Prisma.ProductOrderByWithRelationInput[] {
  switch (sort) {
    case "prijs-op":
      return [{ basePrice: "asc" }, { name: "asc" }];
    case "prijs-af":
      return [{ basePrice: "desc" }, { name: "asc" }];
    case "naam":
      return [{ name: "asc" }];
    case "nieuw":
    default:
      return [{ createdAt: "desc" }, { name: "asc" }];
  }
}

export function productWhere(f: ShopFilters): Prisma.ProductWhereInput {
  const where: Prisma.ProductWhereInput = { active: true };
  if (f.categorie) where.category = { slug: f.categorie };
  if (f.voorraad) where.variants = { some: { active: true, stock: { gt: 0 } } };
  if (f.q) {
    where.OR = [
      { name: { contains: f.q, mode: "insensitive" } },
      { description: { contains: f.q, mode: "insensitive" } },
      { category: { name: { contains: f.q, mode: "insensitive" } } },
      { variants: { some: { sku: { contains: f.q, mode: "insensitive" } } } },
    ];
  }
  return where;
}

export async function searchProducts(f: ShopFilters) {
  const where = productWhere(f);
  const [total, rows] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      include: productCardInclude,
      orderBy: productOrderBy(f.sorteer),
      skip: (f.pagina - 1) * SHOP_PAGE_SIZE,
      take: SHOP_PAGE_SIZE,
    }),
  ]);
  return {
    products: rows.map(toProductCard),
    total,
    page: f.pagina,
    pageSize: SHOP_PAGE_SIZE,
    pageCount: Math.max(1, Math.ceil(total / SHOP_PAGE_SIZE)),
  };
}

export async function getShopCategories(): Promise<ShopCategoryOption[]> {
  const categories = await prisma.productCategory.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { _count: { select: { products: { where: { active: true } } } } },
  });
  return categories.map((c) => ({ slug: c.slug, name: c.name, count: c._count.products }));
}

// ─────────────────────────────────────────────────────────────
// Winkelwagen → prijsopgave (altijd met prijzen en voorraad uit de database)
// ─────────────────────────────────────────────────────────────

export type ResolvedCartLine = {
  variantId: string;
  productId: string;
  slug: string;
  name: string;
  variantName: string;
  sku: string;
  image: string | null;
  unitPrice: number;
  requested: number;
  stock: number;
  available: boolean;
  reason: string | null;
};

/** Voegt dubbele regels samen en haalt naam, prijs en voorraad op uit de database. */
export async function resolveCartLines(items: Array<{ variantId: string; quantity: number }>): Promise<ResolvedCartLine[]> {
  const merged = new Map<string, number>();
  for (const item of items) merged.set(item.variantId, Math.min(99, (merged.get(item.variantId) ?? 0) + item.quantity));
  if (merged.size === 0) return [];

  const variants = await prisma.productVariant.findMany({
    where: { id: { in: [...merged.keys()] } },
    include: { product: { select: { id: true, slug: true, name: true, basePrice: true, images: true, active: true } } },
  });
  const byId = new Map(variants.map((v) => [v.id, v]));

  return [...merged.entries()].map(([variantId, requested]) => {
    const v = byId.get(variantId);
    if (!v) {
      return {
        variantId,
        productId: "",
        slug: "",
        name: "Onbekend product",
        variantName: "",
        sku: "",
        image: null,
        unitPrice: 0,
        requested,
        stock: 0,
        available: false,
        reason: "Dit product bestaat niet meer.",
      };
    }
    const sellable = v.active && v.product.active;
    const reason = !sellable ? "Dit product is niet meer leverbaar." : v.stock <= 0 ? "Uitverkocht." : v.stock < requested ? `Nog maar ${v.stock} op voorraad.` : null;
    return {
      variantId,
      productId: v.product.id,
      slug: v.product.slug,
      name: v.product.name,
      variantName: v.name,
      sku: v.sku,
      image: v.product.images[0] ?? null,
      unitPrice: variantPrice(v.product, v),
      requested,
      stock: sellable ? Math.max(0, v.stock) : 0,
      available: sellable && v.stock > 0,
      reason,
    };
  });
}

/** Prijsopgave op basis van opgeloste regels. Niet-leverbare regels tellen niet mee. */
export function buildQuote(lines: ResolvedCartLine[], isMember: boolean, shippingMethod: ShippingMethod, pricing: Pricing): QuoteResponse {
  const billable = lines.filter((l) => l.available).map((l) => ({ variantId: l.variantId, quantity: Math.min(l.requested, l.stock), unitPrice: l.unitPrice }));
  const quote = calculateQuote(billable, isMember, shippingMethod, pricing);
  const calculated = new Map(quote.lines.map((l) => [l.variantId, l]));

  const responseLines: QuoteLineResponse[] = lines.map((l) => {
    const c = calculated.get(l.variantId);
    return {
      variantId: l.variantId,
      productId: l.productId,
      slug: l.slug,
      name: l.name,
      variantName: l.variantName,
      image: l.image,
      unitPrice: l.unitPrice,
      finalUnitPrice: c?.finalUnitPrice ?? l.unitPrice,
      quantity: c?.quantity ?? 0,
      requested: l.requested,
      lineTotal: c?.lineTotal ?? 0,
      stock: l.stock,
      available: l.available,
      reason: l.reason,
    };
  });

  return {
    subtotal: quote.subtotal,
    discount: quote.discount,
    shippingCost: quote.shippingCost,
    total: quote.total,
    memberDiscountApplied: quote.memberDiscountApplied,
    isMember,
    shippingMethod,
    lines: responseLines,
    hasIssues: lines.some((l) => l.reason !== null),
  };
}
