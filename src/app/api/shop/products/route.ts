import { ok } from "@/lib/api";
import { parseShopFilters, searchProducts } from "@/lib/shop";

export const dynamic = "force-dynamic";

/**
 * GET /api/shop/products?q=&categorie=&sorteer=nieuw|prijs-op|prijs-af|naam&voorraad=1&pagina=1
 * → { products: ProductCardData[], total, page, pageSize, pageCount }
 */
export async function GET(req: Request) {
  const filters = parseShopFilters(new URL(req.url).searchParams);
  const result = await searchProducts(filters);
  return ok(result, { headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=120" } });
}
