"use client";

import { Loader2 } from "lucide-react";
import { usePricing } from "@/components/pricing-provider";
import { cn, formatPrice } from "@/lib/utils";
import type { QuoteResponse, ShippingMethodValue } from "./types";

/** Totalenblok (subtotaal, ledenkorting, verzending, totaal) op basis van de serverquote. */
export function OrderTotals({
  quote,
  loading,
  fallbackSubtotal,
  shippingMethod,
  className,
}: {
  quote: QuoteResponse | null;
  loading: boolean;
  fallbackSubtotal: number;
  shippingMethod: ShippingMethodValue;
  className?: string;
}) {
  const pricing = usePricing();
  const option = pricing.shipping[shippingMethod];
  const subtotal = quote?.subtotal ?? fallbackSubtotal;
  const afterDiscount = subtotal - (quote?.discount ?? 0);
  const remainingForFree = option.freeFrom !== null ? option.freeFrom - afterDiscount : null;

  return (
    <dl className={cn("space-y-3 text-sm", className)}>
      <div className="flex justify-between">
        <dt className="text-muted-foreground">Subtotaal</dt>
        <dd className="font-medium">{formatPrice(subtotal)}</dd>
      </div>
      {quote && quote.discount > 0 && (
        <div className="flex justify-between text-primary">
          <dt className="font-medium">Ledenkorting ({pricing.memberDiscountPercent}%)</dt>
          <dd className="font-semibold">− {formatPrice(quote.discount)}</dd>
        </div>
      )}
      <div className="flex justify-between">
        <dt className="text-muted-foreground">Verzending ({option.label.replace("PostNL – ", "")})</dt>
        <dd className="font-medium">{quote ? (quote.shippingCost === 0 ? "Gratis" : formatPrice(quote.shippingCost)) : "–"}</dd>
      </div>
      {remainingForFree !== null && remainingForFree > 0 && quote && quote.shippingCost > 0 && (
        <p className="rounded-md bg-surface px-3 py-2 text-xs text-muted-foreground">
          Nog <strong className="text-foreground">{formatPrice(remainingForFree)}</strong> tot gratis verzending.
        </p>
      )}
      <div className="flex items-baseline justify-between border-t border-border pt-4">
        <dt className="text-base font-semibold">Totaal</dt>
        <dd className="flex items-center gap-2 font-display text-2xl font-bold">
          {loading && <Loader2 className="size-4 animate-spin text-muted-foreground" aria-label="Bijwerken" />}
          {quote ? formatPrice(quote.total) : "–"}
        </dd>
      </div>
      <p className="text-xs text-muted-foreground">Alle prijzen zijn inclusief btw.</p>
    </dl>
  );
}
