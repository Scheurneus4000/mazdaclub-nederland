"use client";

import * as React from "react";
import Link from "next/link";
import { Check, Circle } from "lucide-react";
import { usePricing } from "@/components/pricing-provider";
import { memberUnitPrice } from "@/lib/pricing";
import { cn, formatPrice } from "@/lib/utils";
import { AddToCartButton } from "./add-to-cart";
import { QuantityStepper } from "./quantity-stepper";

export type PurchaseVariant = {
  id: string;
  name: string;
  price: number; // effectieve prijs vóór ledenkorting
  stock: number;
  attributes: Record<string, string> | null;
};

const MAX_PER_ORDER = 25;

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Prijs, variantkeuze, voorraadindicatie, aantal en "in winkelwagen" voor de productpagina. */
export function ProductPurchase({
  product,
  variants,
  isMember,
}: {
  product: { id: string; slug: string; name: string; image: string | null };
  variants: PurchaseVariant[];
  isMember: boolean;
}) {
  // Attribuutsleutels (bijv. maat, kleur) – alleen als élke variant ze heeft.
  const attributeKeys = React.useMemo(() => {
    if (variants.length < 2 || variants.some((v) => !v.attributes || Object.keys(v.attributes).length === 0)) return [];
    const keys = Object.keys(variants[0].attributes!);
    return keys.filter((k) => variants.every((v) => v.attributes && typeof v.attributes[k] === "string"));
  }, [variants]);

  const pricing = usePricing();
  const initial = variants.find((v) => v.stock > 0) ?? variants[0];
  const [selectedId, setSelectedId] = React.useState(initial?.id);
  const [quantity, setQuantity] = React.useState(1);
  const selected = variants.find((v) => v.id === selectedId) ?? initial;

  React.useEffect(() => {
    setQuantity((q) => Math.max(1, Math.min(q, selected?.stock || 1, MAX_PER_ORDER)));
  }, [selected?.id, selected?.stock]);

  if (!selected) return <p className="text-sm text-muted-foreground">Dit product is tijdelijk niet beschikbaar.</p>;

  const memberPrice = memberUnitPrice(selected.price, pricing.memberDiscountRate);
  const displayPrice = isMember ? memberPrice : selected.price;

  function selectAttribute(key: string, value: string) {
    const wanted = { ...(selected?.attributes ?? {}), [key]: value };
    const exact = variants.find((v) => attributeKeys.every((k) => v.attributes?.[k] === wanted[k]));
    const fallback = variants.filter((v) => v.attributes?.[key] === value).sort((a, b) => b.stock - a.stock)[0];
    const next = exact ?? fallback;
    if (next) setSelectedId(next.id);
  }

  const stockLabel =
    selected.stock <= 0 ? (
      <span className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <Circle className="size-2.5 fill-muted-foreground text-muted-foreground" /> Uitverkocht
      </span>
    ) : selected.stock <= 5 ? (
      <span className="flex items-center gap-2 text-sm font-medium text-amber-700">
        <Circle className="size-2.5 fill-amber-500 text-amber-500" /> Nog {selected.stock} op voorraad
      </span>
    ) : (
      <span className="flex items-center gap-2 text-sm font-medium text-emerald-700">
        <Check className="size-4" /> Op voorraad – vandaag besteld, binnen 1–3 werkdagen in huis
      </span>
    );

  return (
    <div className="space-y-7">
      <div>
        <div className="flex flex-wrap items-baseline gap-3">
          <p className={cn("font-display text-4xl font-bold", isMember ? "text-primary" : "text-ink")}>{formatPrice(displayPrice)}</p>
          {isMember && (
            <>
              <p className="text-lg text-muted-foreground line-through">{formatPrice(selected.price)}</p>
              <span className="rounded-full bg-primary px-2.5 py-1 text-xs font-bold text-white">Ledenprijs −{pricing.memberDiscountPercent}%</span>
            </>
          )}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">Inclusief btw, exclusief verzendkosten</p>
        {!isMember && (
          <p className="mt-3 rounded-lg bg-accent px-3.5 py-2.5 text-sm text-accent-foreground">
            Leden betalen <strong className="font-semibold">{formatPrice(memberPrice)}</strong>.{" "}
            <Link href="/lid-worden" className="font-semibold underline underline-offset-2">
              Word lid
            </Link>{" "}
            en krijg {pricing.memberDiscountPercent}% korting op alles.
          </p>
        )}
      </div>

      {attributeKeys.length > 0 ? (
        attributeKeys.map((key) => {
          const values = [...new Set(variants.map((v) => v.attributes![key]))];
          return (
            <fieldset key={key}>
              <legend className="mb-2.5 text-sm font-semibold">
                {capitalize(key)}: <span className="font-normal text-muted-foreground">{selected.attributes?.[key]}</span>
              </legend>
              <div className="flex flex-wrap gap-2">
                {values.map((value) => {
                  const combo = { ...(selected.attributes ?? {}), [key]: value };
                  const match = variants.find((v) => attributeKeys.every((k) => v.attributes?.[k] === combo[k]));
                  const soldOut = !match || match.stock <= 0;
                  const isSelected = selected.attributes?.[key] === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => selectAttribute(key, value)}
                      aria-pressed={isSelected}
                      className={cn(
                        "relative min-w-12 cursor-pointer rounded-md border px-4 py-2.5 text-sm font-semibold transition-colors",
                        isSelected ? "border-ink bg-ink text-white" : "border-border bg-white hover:border-ink/50",
                        soldOut && !isSelected && "text-muted-foreground line-through decoration-1",
                      )}
                    >
                      {value}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          );
        })
      ) : variants.length > 1 ? (
        <fieldset>
          <legend className="mb-2.5 text-sm font-semibold">Uitvoering</legend>
          <div className="flex flex-wrap gap-2">
            {variants.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setSelectedId(v.id)}
                aria-pressed={v.id === selected.id}
                className={cn(
                  "cursor-pointer rounded-md border px-4 py-2.5 text-sm font-semibold transition-colors",
                  v.id === selected.id ? "border-ink bg-ink text-white" : "border-border bg-white hover:border-ink/50",
                  v.stock <= 0 && v.id !== selected.id && "text-muted-foreground line-through decoration-1",
                )}
              >
                {v.name}
                {v.price !== variants[0].price && <span className="ml-1.5 font-normal opacity-70">{formatPrice(isMember ? memberUnitPrice(v.price, pricing.memberDiscountRate) : v.price)}</span>}
              </button>
            ))}
          </div>
        </fieldset>
      ) : null}

      <div>{stockLabel}</div>

      <div className="flex gap-3">
        <QuantityStepper value={quantity} max={Math.max(1, Math.min(selected.stock, MAX_PER_ORDER))} onChange={setQuantity} />
        <AddToCartButton
          className="flex-1"
          quantity={quantity}
          disabled={selected.stock <= 0}
          item={{
            variantId: selected.id,
            productId: product.id,
            slug: product.slug,
            name: product.name,
            variantName: selected.name,
            image: product.image,
            unitPrice: selected.price,
            maxQuantity: Math.min(selected.stock, MAX_PER_ORDER),
          }}
        />
      </div>
    </div>
  );
}
