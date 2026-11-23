"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Loader2, Lock, ShoppingBag, Store, Truck, UserRound } from "lucide-react";
import { toast } from "sonner";
import { useAntiSpam } from "@/components/forms/anti-spam";
import { EmptyState } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Alert, Checkbox, Field, FieldError, Skeleton } from "@/components/ui/form-controls";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { postJson } from "@/lib/client-fetch";
import { enabledShippingMethods } from "@/lib/pricing";
import { cn, formatPrice } from "@/lib/utils";
import { usePricing } from "@/components/pricing-provider";
import { useCart } from "./cart-provider";
import { OrderTotals } from "./order-summary";
import { PaymentMethods } from "./shop-usps";
import type { CheckoutResponse, ShippingMethodValue } from "./types";
import { useQuote } from "./use-quote";

export type CheckoutDefaults = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  street: string;
  houseNumber: string;
  postalCode: string;
  city: string;
  country: "NL" | "BE";
};

type FormState = CheckoutDefaults & { notes: string; acceptTerms: boolean };

const shippingIcons: Record<ShippingMethodValue, React.ComponentType<{ className?: string }>> = {
  POSTNL_NL: Truck,
  POSTNL_BE: Truck,
  PICKUP_EVENT: Store,
};

export function CheckoutForm({
  defaults,
  isLoggedIn,
  initialShipping,
}: {
  defaults: CheckoutDefaults;
  isLoggedIn: boolean;
  initialShipping: ShippingMethodValue;
}) {
  const { items, ready } = useCart();
  const pricing = usePricing();
  const spam = useAntiSpam();
  const [shippingMethod, setShippingMethod] = React.useState<ShippingMethodValue>(initialShipping);
  const [form, setForm] = React.useState<FormState>({ ...defaults, notes: "", acceptTerms: false });
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [formError, setFormError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  const { quote, loading } = useQuote(items, shippingMethod, ready && !submitting);
  const needsAddress = shippingMethod !== "PICKUP_EVENT";
  const country: "NL" | "BE" = shippingMethod === "POSTNL_BE" ? "BE" : shippingMethod === "POSTNL_NL" ? "NL" : form.country;
  const blocking = quote?.lines.some((l) => !l.available || l.stock < l.requested) ?? false;

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key as string]) setErrors((e) => ({ ...e, [key as string]: "" }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!form.acceptTerms) {
      setErrors((er) => ({ ...er, acceptTerms: "Je moet akkoord gaan met de voorwaarden" }));
      return;
    }
    setSubmitting(true);
    const res = await postJson<CheckoutResponse>("/api/shop/checkout", {
      items: items.map((i) => ({ variantId: i.variantId, quantity: i.quantity })),
      shippingMethod,
      firstName: form.firstName,
      lastName: form.lastName,
      email: form.email,
      phone: form.phone,
      street: needsAddress ? form.street : "",
      houseNumber: needsAddress ? form.houseNumber : "",
      postalCode: needsAddress ? form.postalCode : "",
      city: needsAddress ? form.city : "",
      country,
      notes: form.notes,
      acceptTerms: form.acceptTerms,
      ...spam.values(),
    });
    if (res.ok) {
      toast.success(`Bestelling ${res.data.orderNumber} aangemaakt. Je wordt doorgestuurd naar de betaling…`);
      window.location.href = res.data.checkoutUrl;
      return;
    }
    setErrors(res.fields ?? {});
    setFormError(res.fields?.items ?? res.error);
    spam.reset();
    setSubmitting(false);
    if (res.status !== 422) toast.error(res.error);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (!ready) {
    return (
      <div className="grid gap-8 lg:grid-cols-[1fr_400px]">
        <Skeleton className="h-[600px] w-full rounded-2xl" />
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    );
  }

  if (items.length === 0 && !submitting) {
    return (
      <EmptyState
        icon={<ShoppingBag />}
        title="Je winkelwagen is leeg"
        description="Voeg eerst producten toe aan je winkelwagen voordat je afrekent."
        action={
          <Button asChild>
            <Link href="/webshop">Naar de webshop</Link>
          </Button>
        }
      />
    );
  }

  const sectionTitle = (n: number, title: string) => (
    <h2 className="flex items-center gap-3 font-display text-xl font-bold uppercase tracking-tight">
      <span className="flex size-8 items-center justify-center rounded-full bg-ink text-sm text-white">{n}</span>
      {title}
    </h2>
  );

  return (
    <form onSubmit={handleSubmit} noValidate className="relative grid items-start gap-8 lg:grid-cols-[1fr_400px] lg:gap-12">
      {spam.fields}
      <div className="space-y-8">
        {formError && <Alert variant="error">{formError}</Alert>}

        {!isLoggedIn && (
          <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-5 text-sm sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-center gap-3">
              <UserRound className="size-5 shrink-0 text-primary" />
              <span>
                <strong className="font-semibold">Ben je lid?</strong> Log in om automatisch {pricing.memberDiscountPercent}% ledenkorting te krijgen.
              </span>
            </p>
            <Button asChild variant="outline" size="sm">
              <Link href="/inloggen?callbackUrl=/afrekenen">Inloggen</Link>
            </Button>
          </div>
        )}

        <section className="space-y-5 rounded-2xl border border-border bg-white p-6 sm:p-8">
          {sectionTitle(1, "Contactgegevens")}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Voornaam" htmlFor="firstName" error={errors.firstName} required>
              <Input id="firstName" autoComplete="given-name" value={form.firstName} onChange={(e) => set("firstName", e.target.value)} aria-invalid={!!errors.firstName} />
            </Field>
            <Field label="Achternaam" htmlFor="lastName" error={errors.lastName} required>
              <Input id="lastName" autoComplete="family-name" value={form.lastName} onChange={(e) => set("lastName", e.target.value)} aria-invalid={!!errors.lastName} />
            </Field>
            <Field label="E-mailadres" htmlFor="email" error={errors.email} hint="Hier sturen we je orderbevestiging naartoe." required>
              <Input id="email" type="email" autoComplete="email" value={form.email} onChange={(e) => set("email", e.target.value)} aria-invalid={!!errors.email} />
            </Field>
            <Field label="Telefoonnummer" htmlFor="phone" error={errors.phone} hint="Optioneel, voor vragen over je bezorging.">
              <Input id="phone" type="tel" autoComplete="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} aria-invalid={!!errors.phone} />
            </Field>
          </div>
        </section>

        <section className="space-y-5 rounded-2xl border border-border bg-white p-6 sm:p-8">
          {sectionTitle(2, "Bezorging")}
          <fieldset className="grid gap-3" aria-label="Verzendmethode">
            {enabledShippingMethods(pricing).map((key) => {
              const option = pricing.shipping[key];
              const Icon = shippingIcons[key];
              const selected = shippingMethod === key;
              const isFree = quote && selected && quote.shippingCost === 0;
              return (
                <label
                  key={key}
                  className={cn(
                    "flex cursor-pointer items-center gap-4 rounded-xl border-2 p-4 transition-colors",
                    selected ? "border-primary bg-accent/50" : "border-border hover:border-ink/30",
                  )}
                >
                  <input type="radio" name="shippingMethod" value={key} checked={selected} onChange={() => setShippingMethod(key)} className="size-4 accent-primary" />
                  <Icon className={cn("size-5 shrink-0", selected ? "text-primary" : "text-muted-foreground")} />
                  <span className="flex-1">
                    <span className="block text-sm font-semibold">{option.label}</span>
                    <span className="block text-xs text-muted-foreground">
                      {option.description}
                      {option.freeFrom !== null && ` · gratis vanaf ${formatPrice(option.freeFrom)}`}
                    </span>
                  </span>
                  <span className="text-sm font-semibold">{option.cost === 0 || isFree ? "Gratis" : formatPrice(option.cost)}</span>
                </label>
              );
            })}
          </fieldset>

          {needsAddress ? (
            <div className="grid gap-4 sm:grid-cols-6">
              <Field label="Straat" htmlFor="street" error={errors.street} required className="sm:col-span-4">
                <Input id="street" autoComplete="address-line1" value={form.street} onChange={(e) => set("street", e.target.value)} aria-invalid={!!errors.street} />
              </Field>
              <Field label="Huisnummer" htmlFor="houseNumber" error={errors.houseNumber} required className="sm:col-span-2">
                <Input id="houseNumber" value={form.houseNumber} onChange={(e) => set("houseNumber", e.target.value)} aria-invalid={!!errors.houseNumber} />
              </Field>
              <Field label="Postcode" htmlFor="postalCode" error={errors.postalCode} required className="sm:col-span-2">
                <Input
                  id="postalCode"
                  autoComplete="postal-code"
                  placeholder={country === "BE" ? "1000" : "1234 AB"}
                  value={form.postalCode}
                  onChange={(e) => set("postalCode", e.target.value)}
                  aria-invalid={!!errors.postalCode}
                />
              </Field>
              <Field label="Woonplaats" htmlFor="city" error={errors.city} required className="sm:col-span-3">
                <Input id="city" autoComplete="address-level2" value={form.city} onChange={(e) => set("city", e.target.value)} aria-invalid={!!errors.city} />
              </Field>
              <div className="space-y-1.5 sm:col-span-1">
                <span className="text-sm font-medium">Land</span>
                <p className="flex h-11 items-center rounded-md border border-input bg-muted/50 px-3.5 text-sm">{country === "BE" ? "België" : "Nederland"}</p>
              </div>
            </div>
          ) : (
            <Alert variant="info">
              Je haalt je bestelling gratis op bij de clubstand tijdens een van onze evenementen. Neem je orderbevestiging mee; we
              sturen je vooraf een herinnering.
            </Alert>
          )}
        </section>

        <section className="space-y-5 rounded-2xl border border-border bg-white p-6 sm:p-8">
          {sectionTitle(3, "Afronden")}
          <Field label="Opmerkingen bij je bestelling" htmlFor="notes" error={errors.notes}>
            <Textarea id="notes" rows={3} maxLength={1000} placeholder="Bijvoorbeeld: bij welk evenement je je bestelling wilt ophalen" value={form.notes} onChange={(e) => set("notes", e.target.value)} />
          </Field>
          <div>
            <label htmlFor="acceptTerms" className="flex cursor-pointer items-start gap-3 text-sm">
              <Checkbox id="acceptTerms" className="mt-0.5" checked={form.acceptTerms} onChange={(e) => set("acceptTerms", e.target.checked)} aria-invalid={!!errors.acceptTerms} />
              <span>
                Ik ga akkoord met de{" "}
                <Link href="/algemene-voorwaarden" target="_blank" className="font-medium text-primary underline underline-offset-2">
                  algemene voorwaarden
                </Link>{" "}
                en heb de{" "}
                <Link href="/privacy" target="_blank" className="font-medium text-primary underline underline-offset-2">
                  privacyverklaring
                </Link>{" "}
                gelezen.
              </span>
            </label>
            <FieldError message={errors.acceptTerms} />
          </div>
        </section>
      </div>

      <aside className="rounded-2xl border border-border bg-white p-6 lg:sticky lg:top-24" aria-label="Je bestelling">
        <h2 className="font-display text-xl font-bold uppercase tracking-tight">Je bestelling</h2>
        <ul className="mt-5 max-h-80 space-y-4 overflow-y-auto pr-1">
          {items.map((item) => {
            const line = quote?.lines.find((l) => l.variantId === item.variantId);
            return (
              <li key={item.variantId} className="flex gap-3">
                <div className="relative size-16 shrink-0 overflow-hidden rounded-lg border border-border bg-surface">
                  {item.image && <Image src={item.image} alt="" fill sizes="64px" className="object-contain p-1.5" />}
                  <span className="absolute -top-0 -right-0 flex size-5 items-center justify-center rounded-bl-lg bg-ink text-[10px] font-bold text-white">{item.quantity}</span>
                </div>
                <div className="min-w-0 flex-1 text-sm">
                  <p className="truncate font-medium">{item.name}</p>
                  {item.variantName !== "Standaard" && <p className="truncate text-xs text-muted-foreground">{item.variantName}</p>}
                  {line?.reason && <p className="text-xs font-medium text-amber-700">{line.reason}</p>}
                </div>
                <p className="text-sm font-semibold whitespace-nowrap">{formatPrice(line ? line.finalUnitPrice * item.quantity : item.unitPrice * item.quantity)}</p>
              </li>
            );
          })}
        </ul>

        <OrderTotals className="mt-6 border-t border-border pt-5" quote={quote} loading={loading} fallbackSubtotal={0} shippingMethod={shippingMethod} />

        {blocking && (
          <Alert variant="warning" className="mt-4">
            Niet alle artikelen zijn nog (voldoende) op voorraad.{" "}
            <Link href="/winkelwagen" className="font-semibold underline">
              Pas je winkelwagen aan
            </Link>
            .
          </Alert>
        )}

        <Button type="submit" size="lg" className="mt-6 w-full" disabled={submitting || blocking || !quote}>
          {submitting ? (
            <>
              <Loader2 className="animate-spin" /> Bezig…
            </>
          ) : (
            <>
              <Lock /> Betalen {quote ? formatPrice(quote.total) : ""} <ArrowRight />
            </>
          )}
        </Button>
        <p className="mt-3 text-center text-xs text-muted-foreground">Je rondt de betaling veilig af via onze betaalpartner.</p>
        <PaymentMethods className="mt-3 justify-center" />
      </aside>
    </form>
  );
}
