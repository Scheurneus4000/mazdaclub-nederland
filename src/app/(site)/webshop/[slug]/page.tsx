import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, CreditCard, Percent, RotateCcw, ShieldCheck, Truck } from "lucide-react";
import { auth } from "@/auth";
import { ProductCard } from "@/components/shop/product-card";
import { ProductGallery } from "@/components/shop/product-gallery";
import { ProductPurchase, type PurchaseVariant } from "@/components/shop/product-purchase";
import { PaymentMethods } from "@/components/shop/shop-usps";
import { prisma } from "@/lib/db";
import { isActiveMember } from "@/lib/membership";
import { productCardInclude, toProductCard, variantPrice } from "@/lib/shop";
import { getPricing } from "@/lib/settings";
import { centsToDecimalString, formatPrice, siteUrl } from "@/lib/utils";

export const dynamic = "force-dynamic";

type Params = Promise<{ slug: string }>;

async function getProduct(slug: string) {
  return prisma.product.findUnique({
    where: { slug },
    include: {
      category: true,
      variants: { where: { active: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] },
    },
  });
}

function absolute(url: string) {
  return url.startsWith("http") ? url : siteUrl(url);
}

function toAttributes(value: unknown): Record<string, string> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const entries = Object.entries(value as Record<string, unknown>).filter((e): e is [string, string] => typeof e[1] === "string");
  return entries.length ? Object.fromEntries(entries) : null;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug).catch(() => null);
  if (!product || !product.active) return { title: "Product niet gevonden" };
  const description = product.description.replace(/\s+/g, " ").slice(0, 155);
  return {
    title: `${product.name} – ${product.category.name}`,
    description,
    alternates: { canonical: `/webshop/${product.slug}` },
    openGraph: {
      title: product.name,
      description,
      type: "website",
      images: product.images[0] && !product.images[0].endsWith(".svg") ? [{ url: absolute(product.images[0]) }] : undefined,
    },
  };
}

export default async function ProductPage({ params }: { params: Params }) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product || !product.active || product.variants.length === 0) notFound();

  const session = await auth();
  const [isMember, related, pricing] = await Promise.all([
    isActiveMember(session?.user?.id),
    prisma.product.findMany({
      where: { active: true, categoryId: product.categoryId, id: { not: product.id } },
      include: productCardInclude,
      orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
      take: 4,
    }),
    getPricing(),
  ]);
  const freeNl = pricing.shipping.POSTNL_NL.enabled ? pricing.shipping.POSTNL_NL.freeFrom : null;

  const variants: PurchaseVariant[] = product.variants.map((v) => ({
    id: v.id,
    name: v.name,
    price: variantPrice(product, v),
    stock: Math.max(0, v.stock),
    attributes: toAttributes(v.attributes),
  }));

  const prices = variants.map((v) => v.price);
  const inStock = variants.some((v) => v.stock > 0);
  const paragraphs = product.description.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    image: product.images.map(absolute),
    sku: product.variants[0].sku,
    category: product.category.name,
    brand: { "@type": "Brand", name: "MazdaClub Nederland" },
    offers:
      variants.length > 1
        ? {
            "@type": "AggregateOffer",
            priceCurrency: "EUR",
            lowPrice: centsToDecimalString(Math.min(...prices)),
            highPrice: centsToDecimalString(Math.max(...prices)),
            offerCount: variants.length,
            availability: inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
            url: siteUrl(`/webshop/${product.slug}`),
          }
        : {
            "@type": "Offer",
            priceCurrency: "EUR",
            price: centsToDecimalString(prices[0]),
            availability: inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
            url: siteUrl(`/webshop/${product.slug}`),
            itemCondition: "https://schema.org/NewCondition",
          },
  };

  return (
    <>
      <div className="border-b border-border bg-surface">
        <nav aria-label="Kruimelpad" className="container-site py-4">
          <ol className="flex flex-wrap items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <li>
              <Link href="/" className="hover:text-foreground">
                Home
              </Link>
            </li>
            <li className="flex items-center gap-1.5">
              <ChevronRight className="size-3" />
              <Link href="/webshop" className="hover:text-foreground">
                Webshop
              </Link>
            </li>
            <li className="flex items-center gap-1.5">
              <ChevronRight className="size-3" />
              <Link href={`/webshop?categorie=${product.category.slug}`} className="hover:text-foreground">
                {product.category.name}
              </Link>
            </li>
            <li className="flex items-center gap-1.5">
              <ChevronRight className="size-3" />
              <span aria-current="page" className="text-foreground">
                {product.name}
              </span>
            </li>
          </ol>
        </nav>
      </div>

      <section className="container-site grid gap-10 py-10 lg:grid-cols-2 lg:gap-16 lg:py-14">
        <ProductGallery images={product.images} name={product.name} />

        <div>
          <Link href={`/webshop?categorie=${product.category.slug}`} className="eyebrow">
            {product.category.name}
          </Link>
          <h1 className="mt-3 font-display text-3xl font-bold uppercase leading-tight tracking-tight sm:text-4xl">{product.name}</h1>
          {paragraphs[0] && <p className="mt-4 text-base leading-relaxed text-muted-foreground">{paragraphs[0]}</p>}

          <div className="mt-8 border-t border-border pt-8">
            <ProductPurchase
              product={{ id: product.id, slug: product.slug, name: product.name, image: product.images[0] ?? null }}
              variants={variants}
              isMember={isMember}
            />
          </div>

          <ul className="mt-8 grid gap-3 rounded-2xl border border-border bg-surface p-5 text-sm sm:grid-cols-2">
            <li className="flex items-start gap-3">
              <Truck className="mt-0.5 size-4 shrink-0 text-primary" />
              <span>{freeNl !== null ? `Gratis verzending in Nederland vanaf ${formatPrice(freeNl)}` : "Verzonden met track & trace"}</span>
            </li>
            <li className="flex items-start gap-3">
              <Percent className="mt-0.5 size-4 shrink-0 text-primary" />
              <span>Leden altijd {pricing.memberDiscountPercent}% korting</span>
            </li>
            <li className="flex items-start gap-3">
              <RotateCcw className="mt-0.5 size-4 shrink-0 text-primary" />
              <span>14 dagen bedenktijd</span>
            </li>
            <li className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
              <span>Gratis ophalen bij clubevenementen</span>
            </li>
            <li className="sm:col-span-2">
              <Link href="/verzending" className="text-sm font-semibold text-primary hover:underline">
                Meer over verzenden en retourneren →
              </Link>
            </li>
          </ul>

          <div className="mt-6 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <CreditCard className="size-4" /> Veilig betalen met
            <PaymentMethods />
          </div>
        </div>
      </section>

      {paragraphs.length > 1 && (
        <section className="container-site pb-6">
          <div className="max-w-3xl border-t border-border pt-10">
            <h2 className="heading-md">Productinformatie</h2>
            <div className="prose-club mt-4">
              {paragraphs.slice(1).map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          </div>
        </section>
      )}

      {related.length > 0 && (
        <section className="container-site pt-12">
          <div className="mb-8 flex items-end justify-between gap-4 border-t border-border pt-12">
            <h2 className="heading-md">Ook leuk</h2>
            <Link href={`/webshop?categorie=${product.category.slug}`} className="text-sm font-semibold text-primary hover:underline">
              Meer {product.category.name.toLowerCase()} →
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 lg:grid-cols-4">
            {related.map((p) => (
              <ProductCard key={p.id} product={toProductCard(p)} isMember={isMember} discountPercent={pricing.memberDiscountPercent} />
            ))}
          </div>
        </section>
      )}

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
    </>
  );
}
