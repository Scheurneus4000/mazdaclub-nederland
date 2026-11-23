"use client";

import * as React from "react";
import { DEFAULT_PRICING, type Pricing } from "@/lib/pricing";

const PricingContext = React.createContext<Pricing>(DEFAULT_PRICING);

/** Maakt de actuele prijzen en verzendopties (uit het beheer) beschikbaar voor client-componenten. */
export function PricingProvider({ value, children }: { value: Pricing; children: React.ReactNode }) {
  return <PricingContext.Provider value={value}>{children}</PricingContext.Provider>;
}

export function usePricing(): Pricing {
  return React.useContext(PricingContext);
}
