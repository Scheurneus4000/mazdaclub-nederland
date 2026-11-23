import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, ShieldCheck } from "lucide-react";
import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/form-controls";
import { verifyEmailToken } from "@/lib/accounts";
import { getCurrentUser } from "@/lib/session";

export const metadata: Metadata = { title: "E-mailadres bevestigen", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  const [result, user] = await Promise.all([verifyEmailToken(typeof token === "string" ? token : ""), getCurrentUser()]);

  const loggedIn = !!user;
  const ok = result.status === "ok" || result.status === "already";
  const isAdmin = ok && result.isAdmin;

  return (
    <AuthShell
      eyebrow="E-mailadres bevestigen"
      title={ok ? "Je e-mailadres is bevestigd" : result.status === "expired" ? "Deze link is verlopen" : "Deze link werkt niet (meer)"}
      description={
        ok
          ? `Bedankt${"firstName" in result ? `, ${result.firstName}` : ""}! Bevestigingen van ritten, bestellingen en je lidmaatschap komen nu zeker bij je aan.`
          : result.status === "expired"
            ? "Bevestigingslinks zijn 48 uur geldig. Log in en vraag in Mijn Account een nieuwe link aan."
            : "De link is ongeldig of al eerder gebruikt. Log in om te zien of je e-mailadres al is bevestigd, of vraag een nieuwe link aan."
      }
    >
      <div className="space-y-5">
        {result.status === "ok" && result.promoted && (
          <Alert variant="success">
            <span className="flex items-start gap-2">
              <ShieldCheck className="mt-0.5 size-4 shrink-0" />
              <span>
                <strong className="font-semibold">Je bent nu beheerder.</strong> Je ziet bovenaan de website de knop &quot;Beheerdermodus&quot;. Daarmee open je het beheer
                van gebruikers, lidmaatschappen, betalingen, verzending, e-mail en meldingen.
              </span>
            </span>
          </Alert>
        )}
        {ok && !(result.status === "ok" && result.promoted) && (
          <p className="flex items-center gap-2 text-sm text-emerald-700">
            <CheckCircle2 className="size-4" /> {result.status === "already" ? "Dit e-mailadres was al bevestigd." : "Bevestigd."}
          </p>
        )}

        <div className="flex flex-col gap-3 sm:flex-row">
          {isAdmin && loggedIn ? (
            <Button asChild size="lg" className="flex-1">
              <Link href="/admin">
                <ShieldCheck /> Beheerdermodus openen
              </Link>
            </Button>
          ) : null}
          <Button asChild size="lg" variant={isAdmin && loggedIn ? "outline" : "default"} className="flex-1">
            <Link href={loggedIn ? "/account" : `/inloggen?callbackUrl=${encodeURIComponent(isAdmin ? "/admin" : "/account")}`}>
              {loggedIn ? "Naar Mijn Account" : "Inloggen"}
            </Link>
          </Button>
        </div>
      </div>
    </AuthShell>
  );
}
