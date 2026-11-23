import { CreditCard, Percent, RotateCcw, Truck } from "lucide-react";
import type { Pricing } from "@/lib/pricing";
import { cn, formatPrice } from "@/lib/utils";

export function shopUspsFor(pricing: Pricing) {
  const freeNl = pricing.shipping.POSTNL_NL.enabled ? pricing.shipping.POSTNL_NL.freeFrom : null;
  return [
    freeNl !== null
      ? { icon: Truck, title: "Gratis verzending", text: `Binnen Nederland vanaf ${formatPrice(freeNl)}` }
      : { icon: Truck, title: "Snel verzonden", text: "Met PostNL, met track & trace" },
    { icon: Percent, title: `${pricing.memberDiscountPercent}% ledenkorting`, text: "Automatisch toegepast" },
    { icon: CreditCard, title: "Veilig betalen", text: "iDEAL, Bancontact, creditcard, PayPal" },
    { icon: RotateCcw, title: "14 dagen bedenktijd", text: "Eenvoudig retourneren" },
  ];
}

export function ShopUspBar({ pricing, className }: { pricing: Pricing; className?: string }) {
  const shopUsps = shopUspsFor(pricing);
  return (
    <div className={cn("border-b border-border bg-white", className)}>
      <ul className="container-site grid grid-cols-2 gap-x-4 gap-y-4 py-5 lg:grid-cols-4">
        {shopUsps.map(({ icon: Icon, title, text }) => (
          <li key={title} className="flex items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent text-primary">
              <Icon className="size-[18px]" />
            </span>
            <span className="leading-tight">
              <span className="block text-sm font-semibold">{title}</span>
              <span className="block text-xs text-muted-foreground">{text}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Rij met ondersteunde betaalmethodes (tekstbadges, geen merklogo's). */
export function PaymentMethods({ className }: { className?: string }) {
  const methods = ["iDEAL", "Bancontact", "Creditcard", "Apple Pay", "Google Pay", "PayPal"];
  return (
    <ul className={cn("flex flex-wrap gap-1.5", className)} aria-label="Betaalmethodes">
      {methods.map((m) => (
        <li key={m} className="rounded-md border border-border bg-white px-2.5 py-1 text-[11px] font-semibold tracking-wide text-foreground/70">
          {m}
        </li>
      ))}
    </ul>
  );
}
