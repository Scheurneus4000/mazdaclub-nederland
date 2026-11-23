import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { CheckoutForm, type CheckoutDefaults } from "@/components/shop/checkout-form";
import type { ShippingMethodValue } from "@/components/shop/types";
import { enabledShippingMethods } from "@/lib/pricing";
import { getCurrentUser } from "@/lib/session";
import { getPricing } from "@/lib/settings";

export const metadata: Metadata = {
  title: "Afrekenen",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function CheckoutPage({ searchParams }: { searchParams: Promise<{ verzending?: string }> }) {
  const { verzending } = await searchParams;
  const [user, pricing] = await Promise.all([getCurrentUser(), getPricing()]);
  const enabled = enabledShippingMethods(pricing);
  const preferred: ShippingMethodValue = user?.country === "BE" ? "POSTNL_BE" : "POSTNL_NL";

  const initialShipping: ShippingMethodValue =
    verzending && enabled.includes(verzending as ShippingMethodValue)
      ? (verzending as ShippingMethodValue)
      : enabled.includes(preferred)
        ? preferred
        : enabled[0];

  const defaults: CheckoutDefaults = {
    firstName: user?.firstName ?? "",
    lastName: user?.lastName ?? "",
    email: user?.email ?? "",
    phone: user?.phone ?? "",
    street: user?.street ?? "",
    houseNumber: user?.houseNumber ?? "",
    postalCode: user?.postalCode ?? "",
    city: user?.city ?? "",
    country: user?.country === "BE" ? "BE" : "NL",
  };

  return (
    <section className="container-site py-10 sm:py-14">
      <Link href="/winkelwagen" className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" /> Terug naar winkelwagen
      </Link>
      <h1 className="heading-lg mt-4 mb-10">Afrekenen</h1>
      <CheckoutForm defaults={defaults} isLoggedIn={!!user} initialShipping={initialShipping} />
    </section>
  );
}
