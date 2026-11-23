import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { DEFAULT_PRICING, memberUnitPrice } from "@/lib/pricing";
import { cn, formatPrice } from "@/lib/utils";

export type ProductCardData = {
  slug: string;
  name: string;
  categoryName: string;
  image: string | null;
  /** Laagste prijs over alle actieve varianten (centen). */
  fromPrice: number;
  hasMultiplePrices: boolean;
  inStock: boolean;
  featured?: boolean;
};

export function ProductCard({
  product,
  isMember = false,
  discountPercent = DEFAULT_PRICING.memberDiscountPercent,
  className,
}: {
  product: ProductCardData;
  isMember?: boolean;
  /** Ledenkorting uit Beheer → Instellingen (getPricing().memberDiscountPercent). */
  discountPercent?: number;
  className?: string;
}) {
  const price = isMember ? memberUnitPrice(product.fromPrice, discountPercent / 100) : product.fromPrice;
  return (
    <article className={cn("group relative flex flex-col", className)}>
      <div className="relative aspect-square overflow-hidden rounded-2xl border border-border bg-surface">
        {product.image && (
          <Image
            src={product.image}
            alt={product.name}
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
            className="object-contain p-6 transition-transform duration-500 group-hover:scale-105"
          />
        )}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
          {!product.inStock && <Badge variant="dark">Uitverkocht</Badge>}
          {product.featured && product.inStock && <Badge>Populair</Badge>}
        </div>
        {isMember && (
          <span className="absolute top-3 right-3 rounded-full bg-primary px-2.5 py-1 text-[11px] font-bold text-white">−{discountPercent}% lid</span>
        )}
      </div>
      <div className="mt-4 flex flex-1 flex-col">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{product.categoryName}</p>
        <h3 className="mt-1 font-semibold leading-snug">
          <Link href={`/webshop/${product.slug}`} className="after:absolute after:inset-0 hover:text-primary">
            {product.name}
          </Link>
        </h3>
        <p className="mt-1.5 flex items-baseline gap-2 text-sm">
          <span className="font-bold text-ink">
            {product.hasMultiplePrices && "vanaf "}
            {formatPrice(price)}
          </span>
          {isMember && <span className="text-xs text-muted-foreground line-through">{formatPrice(product.fromPrice)}</span>}
        </p>
      </div>
    </article>
  );
}
