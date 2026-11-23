import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { RegisterForm } from "@/components/auth/register-form";
import { safeCallbackUrl } from "@/components/auth/safe-callback";
import { getCurrentUser } from "@/lib/session";
import { getPricing } from "@/lib/settings";
import { formatPrice } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Account aanmaken",
  description: "Maak gratis een MazdaClub-account aan om je bestellingen en inschrijvingen te volgen. Later word je eenvoudig betaald lid met hetzelfde account.",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ callbackUrl?: string }> }) {
  const { callbackUrl: raw } = await searchParams;
  const callbackUrl = safeCallbackUrl(raw);
  const [user, pricing] = await Promise.all([getCurrentUser(), getPricing()]);
  if (user) redirect(callbackUrl);

  return (
    <AuthShell
      eyebrow="Gratis account"
      title="Maak je account aan"
      description={`Met een gratis account meld je je aan voor ritten en volg je je bestellingen op één plek. Betaald lid worden kan later altijd met hetzelfde account: ${formatPrice(pricing.membershipPriceCents)} per jaar, met gratis evenementen en ${pricing.memberDiscountPercent}% webshopkorting.`}
      footer={
        <>
          Heb je al een account?{" "}
          <Link href="/inloggen" className="font-semibold text-primary hover:underline">
            Log in
          </Link>
          . Direct lid worden?{" "}
          <Link href="/lid-worden" className="font-semibold text-primary hover:underline">
            Word lid
          </Link>{" "}
          – je account wordt dan automatisch aangemaakt.
        </>
      }
    >
      <RegisterForm callbackUrl={callbackUrl} />
    </AuthShell>
  );
}
