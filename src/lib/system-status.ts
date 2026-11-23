import "server-only";
import { ownerEmails } from "@/lib/owner";
import { getEmailConfig, getPaymentConfig } from "@/lib/settings";

export type StatusLevel = "ok" | "warning" | "error";
export type SystemCheck = { id: string; title: string; level: StatusLevel; summary: string; action?: string; href?: string };

const filled = (v: string | undefined | null) => !!v && !/^(vervang|xxx|test_x)/i.test(v) && v.trim() !== "";

/**
 * Overzicht van de technische koppelingen in begrijpelijke taal, zodat het bestuur kan zien of de
 * website klaar is voor livegang. Toont nooit geheime waarden.
 */
export async function getSystemChecks(): Promise<SystemCheck[]> {
  const env = process.env;
  const isProd = env.NODE_ENV === "production";
  const checks: SystemCheck[] = [];
  const [payments, email] = await Promise.all([getPaymentConfig(), getEmailConfig()]);

  // Website-adres
  const url = env.NEXT_PUBLIC_SITE_URL || "";
  const localUrl = !url || /localhost|127\.0\.0\.1/.test(url);
  checks.push({
    id: "domain",
    title: "Websiteadres (domeinnaam)",
    level: localUrl ? (isProd ? "error" : "warning") : url.startsWith("https://") ? "ok" : "warning",
    summary: localUrl ? "De website draait nog op een testadres (localhost)." : `De website gebruikt ${url}.`,
    action: localUrl ? "Stel bij de hosting NEXT_PUBLIC_SITE_URL in op je eigen domein, bijv. https://www.mazdaclubnederland.nl." : undefined,
  });

  // Eigenaar
  const owners = ownerEmails();
  checks.push({
    id: "owner",
    title: "Eigenaar van de website",
    level: owners.length ? "ok" : "warning",
    summary: owners.length
      ? `${owners.length === 1 ? "Het eigenaarsadres krijgt" : "De eigenaarsadressen krijgen"} automatisch beheerdersrechten na bevestiging van het e-mailadres.`
      : "Er is nog geen eigenaar ingesteld.",
    action: owners.length ? undefined : "Stel bij de hosting OWNER_EMAIL in op het e-mailadres van de eigenaar.",
  });

  // Betalingen
  if (payments.provider === "MOCK") {
    checks.push({
      id: "payments",
      title: "Online betalen",
      level: isProd ? "error" : "warning",
      summary: "Alleen testbetalingen: er wordt geen echt geld afgeschreven.",
      action: "Koppel Mollie bij Instellingen → Betalingen.",
      href: "/admin/instellingen/betalingen",
    });
  } else {
    const name = payments.provider === "STRIPE" ? "Stripe" : "Mollie";
    const hasKey = payments.provider === "STRIPE" ? !!payments.stripeSecretKey : !!payments.mollieApiKey;
    const webhookOk = payments.provider !== "STRIPE" || !!payments.stripeWebhookSecret;
    checks.push({
      id: "payments",
      title: `Online betalen (${name})`,
      level: !hasKey ? "error" : payments.testMode || !webhookOk ? "warning" : "ok",
      summary: !hasKey
        ? `Er is nog geen ${name}-sleutel ingesteld; bezoekers kunnen niet betalen.`
        : payments.testMode
          ? `${name} staat in testmodus: er wordt nog geen echt geld afgeschreven.`
          : `${name} is live gekoppeld. Betalingen komen binnen op de rekening die in ${name} is ingesteld.`,
      action: !hasKey
        ? `Vul de API-sleutel in bij Instellingen → Betalingen.`
        : payments.testMode
          ? "Vervang na goedkeuring van je account de test-sleutel door de live-sleutel."
          : !webhookOk
            ? "Vul het webhookgeheim van Stripe in, anders worden betalingen niet automatisch verwerkt."
            : undefined,
      href: "/admin/instellingen/betalingen",
    });
  }

  // E-mail
  const freeMailbox = /@(gmail|hotmail|outlook|live|yahoo|icloud)\./i.test(email.from);
  checks.push({
    id: "email",
    title: "Automatische e-mails",
    level: email.transport === "log" ? (isProd ? "error" : "warning") : freeMailbox && email.transport === "resend" ? "warning" : "ok",
    summary:
      email.transport === "log"
        ? `E-mails worden nog niet verstuurd: ${email.reason.toLowerCase()}.`
        : `Bevestigingsmails worden verstuurd vanaf ${email.from} via ${email.transport === "smtp" ? "je eigen mailserver" : "Resend"}.`,
    action:
      email.transport === "log"
        ? "Koppel een e-maildienst bij Instellingen → E-mail."
        : freeMailbox && email.transport === "resend"
          ? "Verstuur vanaf je eigen domein (bijv. noreply@mazdaclubnederland.nl); Gmail- of Outlook-adressen worden via Resend geweigerd of als spam gezien."
          : undefined,
    href: "/admin/instellingen/e-mail",
  });

  // Opslag
  const s3 = (env.STORAGE_DRIVER || "local").toLowerCase() === "s3";
  checks.push({
    id: "storage",
    title: "Opslag van foto's",
    level: s3 ? (filled(env.S3_PUBLIC_URL) ? "ok" : "error") : env.VERCEL ? "error" : "warning",
    summary: s3 ? "Foto's worden opgeslagen in de cloud (Cloudflare R2 / S3)." : "Foto's worden op de server zelf opgeslagen.",
    action: s3
      ? filled(env.S3_PUBLIC_URL)
        ? undefined
        : "Stel S3_PUBLIC_URL in, anders kunnen foto's niet worden getoond."
      : env.VERCEL
        ? "Op Vercel blijven lokale bestanden niet bewaard. Koppel Cloudflare R2 (STORAGE_DRIVER=s3)."
        : "Prima voor een eigen server met back-ups; voor Vercel is Cloudflare R2 nodig.",
  });

  // Onderhoudstaak
  checks.push({
    id: "cron",
    title: "Dagelijkse onderhoudstaak",
    level: filled(env.CRON_SECRET) ? "ok" : "warning",
    summary: filled(env.CRON_SECRET)
      ? "Verlopen lidmaatschappen, herinneringsmails en verlopen betalingen worden automatisch verwerkt."
      : "De onderhoudstaak is nog niet beveiligd.",
    action: filled(env.CRON_SECRET) ? undefined : "Stel CRON_SECRET in (een lange willekeurige tekst). Op Vercel draait de taak dan automatisch.",
  });

  // Spambescherming
  checks.push({
    id: "spam",
    title: "Extra spambescherming (Cloudflare Turnstile)",
    level: filled(env.TURNSTILE_SECRET_KEY) && filled(env.NEXT_PUBLIC_TURNSTILE_SITE_KEY) ? "ok" : "warning",
    summary:
      filled(env.TURNSTILE_SECRET_KEY) && filled(env.NEXT_PUBLIC_TURNSTILE_SITE_KEY)
        ? "Formulieren zijn extra beschermd tegen bots."
        : "Formulieren zijn beschermd met een onzichtbare botval en limieten. Turnstile is optioneel.",
  });

  return checks;
}
