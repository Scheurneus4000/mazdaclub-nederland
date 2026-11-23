"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { AlertTriangle, ArrowRight, BadgePercent, ShoppingBag, Trash2 } from "lucide-react";
import { EmptyState } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Alert, NativeSelect, Skeleton } from "@/components/ui/form-controls";
import { usePricing } from "@/components/pricing-provider";
import { enabledShippingMethods } from "@/lib/pricing";
import { formatPrice } from "@/lib/utils";
import { useCart } from "./cart-provider";
import { OrderTotals } from "./order-summary";
import { QuantityStepper } from "./quantity-stepper";
import { PaymentMethods } from "./shop-usps";
import type { ShippingMethodValue } from "./types";
import { useQuote } from "./use-quote";

const SHIPPING_KEY = "mcn-shipping-method";

export function CartView({ isLoggedIn }: { isLoggedIn: boolean }) {
  const { items, ready, updateQuantity, removeItem, subtotal } = useCart();
  const pricing = usePricing();
  const enabled = React.useMemo(() => enabledShippingMethods(pricing), [pricing]);
  const [shippingMethod, setShippingMethod] = React.useState<ShippingMethodValue>(enabled[0]);

  React.useEffect(() => {
    try {
      const saved = window.sessionStorage.getItem(SHIPPING_KEY) as ShippingMethodValue | null;
      if (saved && enabled.includes(saved)) setShippingMethod(saved);
    } catch {
      /* negeren */
    }
  }, [enabled]);

  function changeShipping(value: ShippingMethodValue) {
    setShippingMethod(value);
    try {
      window.sessionStorage.setItem(SHIPPING_KEY, value);
    } catch {
      /* negeren */
    }
  }

  const { quote, loading, error } = useQuote(items, shippingMethod, ready);
  const quoteLines = new Map(quote?.lines.map((l) => [l.variantId, l]) ?? []);

  if (!ready) {
    return (
      <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
        <div className="space-y-4">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-32 w-full rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-80 w-full rounded-2xl" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon={<ShoppingBag />}
        title="Je winkelwagen is leeg"
        description={`Ontdek onze kentekenplaathouders, stickers, kleding en meer. Leden krijgen ${pricing.memberDiscountPercent}% korting op alles.`}
        action={
          <Button asChild>
            <Link href="/webshop">
              Naar de webshop <ArrowRight />
            </Link>
          </Button>
        }
      />
    );
  }

  const blocking = quote?.lines.some((l) => !l.available || l.stock < l.requested) ?? false;

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[1fr_380px] lg:gap-12">
      <div>
        <ul className="divide-y divide-border rounded-2xl border border-border bg-white">
          {items.map((item) => {
            const line = quoteLines.get(item.variantId);
            const unit = line?.finalUnitPrice ?? item.unitPrice;
            const discounted = line && line.finalUnitPrice < line.unitPrice;
            const showVariant = item.variantName && item.variantName !== "Standaard";
            return (
              <li key={item.variantId} className="flex gap-4 p-4 sm:gap-6 sm:p-6">
                <Link href={`/webshop/${item.slug}`} className="relative size-24 shrink-0 overflow-hidden rounded-xl border border-border bg-surface sm:size-28">
                  {item.image && <Image src={item.image} alt={item.name} fill sizes="112px" className="object-contain p-2" />}
                </Link>
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link href={`/webshop/${item.slug}`} className="font-semibold leading-snug hover:text-primary">
                        {item.name}
                      </Link>
                      {showVariant && <p className="mt-0.5 text-sm text-muted-foreground">{item.variantName}</p>}
                      <p className="mt-1 text-sm">
                        <span className="font-medium">{formatPrice(unit)}</span>
                        {discounted && <span className="ml-2 text-xs text-muted-foreground line-through">{formatPrice(line.unitPrice)}</span>}
                      </p>
                    </div>
                    <p className="font-semibold whitespace-nowrap">{formatPrice(line ? line.finalUnitPrice * item.quantity : item.unitPrice * item.quantity)}</p>
                  </div>

                  {line?.reason && (
                    <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-medium text-amber-700">
                      <AlertTriangle className="size-3.5" /> {line.reason}
                      {line.available && line.stock < item.quantity && (
                        <button type="button" onClick={() => updateQuantity(item.variantId, line.stock)} className="cursor-pointer font-semibold text-primary underline underline-offset-2">
                          Aanpassen naar {line.stock}
                        </button>
                      )}
                      {!line.available && (
                        <button type="button" onClick={() => removeItem(item.variantId)} className="cursor-pointer font-semibold text-primary underline underline-offset-2">
                          Verwijderen
                        </button>
                      )}
                    </p>
                  )}

                  <div className="mt-auto flex items-center justify-between pt-3">
                    <QuantityStepper
                      size="sm"
                      value={item.quantity}
                      max={Math.max(1, Math.min(25, line?.stock ?? item.maxQuantity))}
                      onChange={(q) => updateQuantity(item.variantId, q)}
                      label={`Aantal ${item.name}`}
                    />
                    <button
                      type="button"
                      onClick={() => removeItem(item.variantId)}
                      className="flex cursor-pointer items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-primary"
                    >
                      <Trash2 className="size-3.5" /> Verwijderen
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
        <Link href="/webshop" className="mt-5 inline-flex text-sm font-semibold text-primary hover:underline">
          ← Verder winkelen
        </Link>
      </div>

      <aside className="rounded-2xl border border-border bg-white p-6 lg:sticky lg:top-24" aria-label="Overzicht">
        <h2 className="font-display text-xl font-bold uppercase tracking-tight">Overzicht</h2>

        <div className="mt-5 space-y-1.5">
          <label htmlFor="cart-shipping" className="text-sm font-medium">
            Verzendmethode
          </label>
          <NativeSelect id="cart-shipping" value={shippingMethod} onChange={(e) => changeShipping(e.target.value as ShippingMethodValue)}>
            {enabled.map((key) => (
              <option key={key} value={key}>
                {pricing.shipping[key].label}
              </option>
            ))}
          </NativeSelect>
        </div>

        <OrderTotals className="mt-6" quote={quote} loading={loading} fallbackSubtotal={subtotal} shippingMethod={shippingMethod} />

        {error && (
          <Alert variant="error" className="mt-4">
            {error}
          </Alert>
        )}
        {blocking && (
          <Alert variant="warning" className="mt-4">
            Niet alle artikelen zijn (voldoende) op voorraad. Pas je winkelwagen aan om af te rekenen.
          </Alert>
        )}

        {!quote?.isMember && quote && (
          <div className="mt-5 flex gap-3 rounded-xl bg-accent p-4 text-sm text-accent-foreground">
            <BadgePercent className="mt-0.5 size-5 shrink-0" />
            <p>
              Als lid had je <strong className="font-semibold">{formatPrice(Math.round(quote.subtotal * 0.25))}</strong> bespaard.{" "}
              {isLoggedIn ? (
                <Link href="/lid-worden" className="font-semibold underline underline-offset-2">
                  Word lid
                </Link>
              ) : (
                <>
                  <Link href="/inloggen?callbackUrl=/winkelwagen" className="font-semibold underline underline-offset-2">
                    Log in
                  </Link>{" "}
                  of{" "}
                  <Link href="/lid-worden" className="font-semibold underline underline-offset-2">
                    word lid
                  </Link>
                </>
              )}
              .
            </p>
          </div>
        )}

        <Button asChild={!blocking && !!quote} size="lg" className="mt-6 w-full" disabled={blocking || !quote}>
          {!blocking && quote ? (
            <Link href={`/afrekenen?verzending=${shippingMethod}`}>
              Afrekenen <ArrowRight />
            </Link>
          ) : (
            <span>
              Afrekenen <ArrowRight />
            </span>
          )}
        </Button>
        <PaymentMethods className="mt-4 justify-center" />
      </aside>
    </div>
  );
}
