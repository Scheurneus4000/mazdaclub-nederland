import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { getCurrentUser } from "@/lib/session";
import { LoginForm } from "@/components/auth/login-form";
import { safeCallbackUrl } from "@/components/auth/safe-callback";

export const metadata: Metadata = {
  title: "Inloggen",
  description: "Log in op je MazdaClub-account om je lidmaatschap, bestellingen en inschrijvingen te bekijken.",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ callbackUrl?: string; reset?: string; installatie?: string }> }) {
  const params = await searchParams;
  const callbackUrl = safeCallbackUrl(params.callbackUrl);
  // Controle in de database (niet alleen het JWT): voorkomt een redirect-lus als het account niet meer bestaat.
  if (await getCurrentUser()) redirect(callbackUrl);

  const notice =
    params.installatie === "1"
      ? "Je beheerdersaccount is aangemaakt. Log in om de website in te richten."
      : params.reset === "1"
        ? "Je wachtwoord is gewijzigd. Log in met je nieuwe wachtwoord."
        : undefined;

  return (
    <AuthShell
      eyebrow="Mijn Account"
      title="Welkom terug"
      description="Log in om je lidmaatschap, bestellingen en evenementinschrijvingen te bekijken."
      footer={
        <>
          Nog geen account?{" "}
          <Link href={`/registreren${callbackUrl !== "/account" ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : ""}`} className="font-semibold text-primary hover:underline">
            Maak er gratis een aan
          </Link>
          . Wil je lid worden?{" "}
          <Link href="/lid-worden" className="font-semibold text-primary hover:underline">
            Bekijk het lidmaatschap
          </Link>
          .
        </>
      }
    >
      <LoginForm callbackUrl={callbackUrl} notice={notice} />
    </AuthShell>
  );
}
