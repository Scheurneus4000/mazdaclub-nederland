"use client";

import * as React from "react";
import { postJson } from "@/lib/client-fetch";
import type { CartItem } from "./cart-provider";
import type { QuoteResponse, ShippingMethodValue } from "./types";

/**
 * Vraagt (gedebounced) een prijsopgave op bij /api/shop/quote voor de huidige winkelwagen.
 * De server rekent met actuele prijzen, voorraad en de ledenkorting van de ingelogde gebruiker.
 */
export function useQuote(items: CartItem[], shippingMethod: ShippingMethodValue, enabled = true) {
  const [quote, setQuote] = React.useState<QuoteResponse | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const key = React.useMemo(() => items.map((i) => `${i.variantId}:${i.quantity}`).join("|"), [items]);

  React.useEffect(() => {
    if (!enabled) return;
    if (!key) {
      setQuote(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const timer = window.setTimeout(async () => {
      const payload = key.split("|").map((part) => {
        const [variantId, quantity] = part.split(":");
        return { variantId, quantity: Number(quantity) };
      });
      const res = await postJson<QuoteResponse>("/api/shop/quote", { items: payload, shippingMethod });
      if (cancelled) return;
      if (res.ok) {
        setQuote(res.data);
        setError(null);
      } else {
        setError(res.error);
      }
      setLoading(false);
    }, 300);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [key, shippingMethod, enabled]);

  return { quote, loading, error };
}
