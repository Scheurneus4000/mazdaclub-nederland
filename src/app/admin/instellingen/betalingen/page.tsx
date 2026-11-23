import type { Metadata } from "next";
import { ExternalLink } from "lucide-react";
import { AdminSection } from "@/components/admin/page-title";
import { Alert } from "@/components/ui/form-controls";
import { requireAdmin } from "@/lib/session";
import { getPaymentConfig, getSettings, getSettingsMeta, secretInfo } from "@/lib/settings";
import { formatDateTime, siteUrl } from "@/lib/utils";
import { PaymentSettingsForm } from "./payment-settings-form";

export const metadata: Metadata = { title: "Betalingen – Instellingen" };
export const dynamic = "force-dynamic";

const steps = [
  { title: "Account aanmaken", text: "Maak gratis een account op mollie.com met het e-mailadres van de vereniging." },
  { title: "Gegevens aanleveren", text: "Vul in het Mollie-dashboard de gegevens van de vereniging in: KvK-uittreksel, bestuurder(s) en de bankrekening waarop het geld moet binnenkomen." },
  { title: "Betaalmethoden aanzetten", text: "Instellingen → Betaalmethoden: zet iDEAL | Wero, Bancontact, creditcard, Apple Pay, Google Pay, PayPal (koppel je zakelijke PayPal-account) en SEPA-incasso aan." },
  { title: "Sleutel kopiëren", text: "Ontwikkelaars → API-sleutels: kopieer de test-sleutel (test_…), plak hem hiernaast en klik op 'Verbinding testen'." },
  { title: "Live gaan", text: "Is je account goedgekeurd? Vervang de test-sleutel door de live-sleutel (live_…) en sla op. Doe één echte testbetaling en betaal die terug." },
];

export default async function PaymentSettingsPage() {
  await requireAdmin();
  const [settings, config, meta] = await Promise.all([getSettings("payments"), getPaymentConfig(), getSettingsMeta("payments")]);

  const hostingMollie = !settings.mollieApiKey && !!process.env.MOLLIE_API_KEY;
  const hostingStripe = !settings.stripeSecretKey && !!process.env.STRIPE_SECRET_KEY;
  const hostingWebhook = !settings.stripeWebhookSecret && !!process.env.STRIPE_WEBHOOK_SECRET;

  const providerName = config.provider === "STRIPE" ? "Stripe" : config.provider === "MOCK" ? "testbetalingen" : "Mollie";

  return (
    <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="space-y-6">
        <Alert variant={config.provider === "MOCK" || config.testMode ? "warning" : config.keySource ? "success" : "error"}>
          {config.provider === "MOCK"
            ? "Nu actief: testbetalingen (alleen lokaal). Er wordt geen echt geld afgeschreven."
            : !config.keySource
              ? `Nu actief: ${providerName}, maar er is nog geen API-sleutel. Bezoekers kunnen nog niet online betalen.`
              : config.testMode
                ? `Nu actief: ${providerName} in testmodus (sleutel uit ${config.keySource === "beheer" ? "dit beheer" : "de hosting"}). Er wordt nog geen echt geld afgeschreven.`
                : `Nu actief: ${providerName}, live (sleutel uit ${config.keySource === "beheer" ? "dit beheer" : "de hosting"}). Betalingen komen binnen op de rekening die je bij ${providerName} hebt ingesteld.`}
          {meta && <span className="mt-1 block text-xs opacity-80">Laatst gewijzigd op {formatDateTime(meta.updatedAt)}{meta.updatedBy ? ` door ${meta.updatedBy}` : ""}.</span>}
        </Alert>

        <PaymentSettingsForm
          provider={settings.provider}
          mollieKey={{ ...secretInfo(settings.mollieApiKey), source: hostingMollie ? "hosting" : null }}
          stripeKey={{ ...secretInfo(settings.stripeSecretKey), source: hostingStripe ? "hosting" : null }}
          stripeWebhook={{ ...secretInfo(settings.stripeWebhookSecret), source: hostingWebhook ? "hosting" : null }}
          accountHolder={settings.accountHolder}
          iban={settings.iban}
          webhookUrl={siteUrl("/api/webhooks/stripe")}
        />
      </div>

      <div className="space-y-6">
        <AdminSection title="Mollie koppelen in 5 stappen">
          <ol className="space-y-4">
            {steps.map((s, i) => (
              <li key={s.title} className="flex gap-3">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">{i + 1}</span>
                <div className="text-sm">
                  <p className="font-semibold">{s.title}</p>
                  <p className="mt-0.5 leading-relaxed text-muted-foreground">{s.text}</p>
                </div>
              </li>
            ))}
          </ol>
          <a
            href="https://my.mollie.com/dashboard"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
          >
            <ExternalLink className="size-4" /> Open het Mollie-dashboard
          </a>
        </AdminSection>

        <AdminSection title="Goed om te weten">
          <ul className="space-y-2 text-sm leading-relaxed text-muted-foreground">
            <li>Mollie rekent geen vaste kosten, alleen een klein bedrag per geslaagde betaling (iDEAL ± € 0,30).</li>
            <li>Uitbetalingen gaan standaard dagelijks naar je bankrekening; dat stel je in bij Mollie onder Uitbetalingen.</li>
            <li>Webhooks van Mollie gaan automatisch naar {siteUrl("/api/webhooks/mollie")}. De site moet daarvoor online staan via https.</li>
            <li>Terugbetalen doe je bij Beheer → Betalingen, met de knop bij een betaalde betaling.</li>
          </ul>
        </AdminSection>
      </div>
    </div>
  );
}
