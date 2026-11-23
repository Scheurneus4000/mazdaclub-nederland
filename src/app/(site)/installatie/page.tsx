import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { Alert } from "@/components/ui/form-controls";
import { prisma } from "@/lib/db";
import { SetupForm } from "./setup-form";

export const metadata: Metadata = { title: "Installatie", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

/**
 * Eenmalige installatie: het eerste beheerdersaccount aanmaken na livegang.
 * Verdwijnt (404) zodra er een beheerder bestaat.
 */
export default async function SetupPage() {
  const admins = await prisma.user.count({ where: { role: "ADMIN" } });
  if (admins > 0) notFound();

  const isProd = process.env.NODE_ENV === "production";
  const codeConfigured = !!process.env.SETUP_CODE;

  return (
    <AuthShell
      eyebrow="Installatie"
      title="Welkom bij je nieuwe website"
      description="Maak het eerste beheerdersaccount aan. Daarmee richt je de website in en kun je later andere bestuursleden beheerder maken."
    >
      {isProd && !codeConfigured ? (
        <Alert variant="warning">
          Stel eerst bij de hosting de omgevingsvariabele <strong>SETUP_CODE</strong> in (een zelfgekozen geheime code) en herlaad deze pagina. Zo kan
          niemand anders het beheerdersaccount aanmaken.
        </Alert>
      ) : (
        <SetupForm codeRequired={codeConfigured || isProd} />
      )}
    </AuthShell>
  );
}
