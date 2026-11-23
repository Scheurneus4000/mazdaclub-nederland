import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata: Metadata = {
  title: "Wachtwoord vergeten",
  robots: { index: false, follow: false },
};

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      eyebrow="Wachtwoord vergeten"
      title="Geen zorgen, dat regelen we"
      description="Vul het e-mailadres van je account in. We sturen je een link waarmee je een nieuw wachtwoord kunt instellen."
      footer={
        <>
          Weet je het weer?{" "}
          <Link href="/inloggen" className="font-semibold text-primary hover:underline">
            Terug naar inloggen
          </Link>
        </>
      }
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
