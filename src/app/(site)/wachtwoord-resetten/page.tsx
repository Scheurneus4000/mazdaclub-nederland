import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/form-controls";

export const metadata: Metadata = {
  title: "Wachtwoord instellen",
  robots: { index: false, follow: false },
};

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string; welkom?: string }> }) {
  const { token: raw, welkom } = await searchParams;
  const token = typeof raw === "string" && raw.length >= 20 ? raw : null;
  const welcome = welkom === "1";

  return (
    <AuthShell
      eyebrow={welcome ? "Account activeren" : "Wachtwoord herstellen"}
      title={welcome ? "Welkom bij MazdaClub Nederland – kies je wachtwoord" : "Kies een nieuw wachtwoord"}
      description={
        welcome
          ? "Het bestuur heeft een account voor je aangemaakt. Kies een sterk wachtwoord; daarna kun je direct inloggen."
          : "Kies een sterk wachtwoord dat je nergens anders gebruikt."
      }
    >
      {token ? (
        <ResetPasswordForm token={token} welcome={welcome} />
      ) : (
        <div className="space-y-5">
          <Alert variant="error">
            {welcome ? "Deze uitnodigingslink is ongeldig of onvolledig." : "Deze herstellink is ongeldig of onvolledig."} Vraag een nieuwe link aan.
          </Alert>
          <Button asChild className="w-full" size="lg">
            <Link href="/wachtwoord-vergeten">Nieuwe link aanvragen</Link>
          </Button>
        </div>
      )}
    </AuthShell>
  );
}
