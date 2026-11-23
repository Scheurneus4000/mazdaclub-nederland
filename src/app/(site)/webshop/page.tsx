import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BadgePercent, CheckCircle2, PackageSearch } from "lucide-react";
import { auth } from "@/auth";
import { EmptyState, PageHeader } from "@/components/layout/page-header";
import { Pagination } from "@/components/shop/pagination";
import { ProductCard } from "@/components/shop/product-card";
import { ShopFilters } from "@/components/shop/shop-filters";
import { ShopUspBar } from "@/components/shop/shop-usps";
import { Button } from "@/components/ui/button";
import { getContent } from "@/lib/content";
import { isActiveMember } from "@/lib/membership";
import { getPricing } from "@/lib/settings";
import { getShopCategories, parseShopFilters, searchProducts, shopFiltersToQuery, shopSortOptions } from "@/lib/shop";
import { formatPrice } from "@/lib/utils";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({ searchParams }: { searchParams: SearchParams }): Promise<Metadata> {
  const filters = parseShopFilters(await searchParams);
  const filtered = !!(filters.q || filters.categorie || filters.voorraad || filters.pagina > 1 || filters.sorteer !== "nieuw");
  return {
    title: "Webshop",
    description:
      "Officiële MazdaClub Nederland-artikelen: kentekenplaathouders, stickers, kleding, drinkbekers en sleutelhangers. Leden krijgen automatisch korting.",
    alternates: { canonical: "/webshop" },
    robots: filtered ? { index: false, follow: true } : undefined,
  };
}

export default async function WebshopPage({ searchParams }: { searchParams: SearchParams }) {
  const filters = parseShopFilters(await searchParams);
  const session = await auth();
  const [categories, result, isMember, content, pricing] = await Promise.all([
    getShopCategories(),
    searchProducts(filters),
    isActiveMember(session?.user?.id),
    getContent(),
    getPricing(),
  ]);
  const discount = `${pricing.memberDiscountPercent}%`;
  const shopEmpty = result.total === 0 && !filters.q && !filters.categorie && !filters.voorraad;

  const activeCategory = categories.find((c) => c.slug === filters.categorie);
  const from = result.total === 0 ? 0 : (result.page - 1) * result.pageSize + 1;
  const to = Math.min(result.total, result.page * result.pageSize);

  return (
    <>
      <PageHeader
        eyebrow="Officiële clubartikelen"
        title={content.pageShopTitle}
        description={content.pageShopText}
        image={content.pageShopImage || undefined}
        breadcrumbs={[{ label: "Webshop" }]}
      />
      <ShopUspBar pricing={pricing} />

      <div className="container-site py-10 sm:py-14">
        {isMember ? (
          <div className="mb-8 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-900">
            <CheckCircle2 className="size-5 shrink-0 text-emerald-600" />
            <p>
              <strong className="font-semibold">Welkom terug, lid!</strong> Je ledenkorting van {discount} wordt automatisch toegepast op alle prijzen.
            </p>
          </div>
        ) : (
          <div className="mb-8 flex flex-col gap-4 overflow-hidden rounded-2xl bg-ink px-6 py-5 text-white sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary">
                <BadgePercent className="size-5" />
              </span>
              <div>
                <p className="font-display text-lg font-bold uppercase tracking-tight">Leden krijgen {discount} korting</p>
                <p className="text-sm text-white/65">
                  Word lid voor {formatPrice(pricing.membershipPriceCents)} per jaar en bespaar direct op elke bestelling.
                  {!session?.user && (
                    <>
                      {" "}
                      Al lid?{" "}
                      <Link href="/inloggen?callbackUrl=/webshop" className="font-semibold text-white underline underline-offset-2">
                        Log in
                      </Link>
                      .
                    </>
                  )}
                </p>
              </div>
            </div>
            <Button asChild className="shrink-0">
              <Link href="/lid-worden">
                Word lid <ArrowRight />
              </Link>
            </Button>
          </div>
        )}

        {!shopEmpty && (
          <ShopFilters
            categories={categories}
            filters={{ q: filters.q, categorie: filters.categorie, sorteer: filters.sorteer, voorraad: filters.voorraad }}
            sortOptions={shopSortOptions}
            total={result.total}
          />
        )}

        <div className={shopEmpty ? "sr-only" : "mt-8 mb-6 flex flex-wrap items-baseline justify-between gap-2"}>
          <h2 className="font-display text-2xl font-bold uppercase tracking-tight">
            {filters.q ? <>Resultaten voor &ldquo;{filters.q}&rdquo;</> : (activeCategory?.name ?? "Alle producten")}
          </h2>
          <p className="text-sm text-muted-foreground" aria-live="polite">
            {result.total === 0
              ? "Geen producten gevonden"
              : result.pageCount > 1
                ? `${from}–${to} van ${result.total} producten`
                : `${result.total} ${result.total === 1 ? "product" : "producten"}`}
          </p>
        </div>

        {result.products.length > 0 ? (
          <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 sm:gap-x-6 lg:grid-cols-4">
            {result.products.map((product) => (
              <ProductCard key={product.slug} product={product} isMember={isMember} discountPercent={pricing.memberDiscountPercent} />
            ))}
          </div>
        ) : (
          shopEmpty ? (
            <EmptyState
              icon={<PackageSearch />}
              title="De webshop wordt gevuld"
              description={`Binnenkort vind je hier de eerste clubartikelen. Leden krijgen straks automatisch ${discount} korting.`}
              action={
                <Button asChild variant="outline">
                  <Link href="/evenementen">Bekijk de agenda</Link>
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={<PackageSearch />}
              title="Geen producten gevonden"
              description={
                filters.q
                  ? `We konden niets vinden voor "${filters.q}". Probeer een andere zoekterm of bekijk alle producten.`
                  : "Er zijn op dit moment geen producten die aan je filters voldoen."
              }
              action={
                <Button asChild variant="outline">
                  <Link href="/webshop">Bekijk alle producten</Link>
                </Button>
              }
            />
          )
        )}

        <Pagination page={result.page} pageCount={result.pageCount} hrefFor={(p) => `/webshop${shopFiltersToQuery({ ...filters, pagina: p })}`} />
      </div>
    </>
  );
}
