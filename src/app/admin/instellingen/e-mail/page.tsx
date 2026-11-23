import type { Metadata } from "next";
import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { EmailSettingsForm, TestEmailForm } from "@/components/admin/email-settings-form";
import { AdminSection } from "@/components/admin/page-title";
import { requireAdmin } from "@/lib/session";
import { getEmailConfig, getSettings, getSettingsMeta, secretInfo } from "@/lib/settings";
import { formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "E-mailinstellingen" };
export const dynamic = "force-dynamic";

const transportLabels = { resend: "Resend", smtp: "je eigen mailserver (SMTP)", log: "niet: e-mails worden alleen in de serverlog gezet" } as const;

export default async function EmailSettingsPage() {
  const admin = await requireAdmin();
  const [settings, config, meta] = await Promise.all([getSettings("email"), getEmailConfig(), getSettingsMeta("email")]);
  const freeMailbox = /@(gmail|googlemail|hotmail|outlook|live|yahoo|icloud|ziggo|kpnmail)\./i.test(config.from);

  return (
    <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_400px]">
      <div className="min-w-0">
        <EmailSettingsForm
          envHasResend={!!process.env.RESEND_API_KEY}
          values={{
            provider: settings.provider,
            fromName: settings.fromName,
            fromAddress: settings.fromAddress,
            replyTo: settings.replyTo,
            smtpHost: settings.smtpHost,
            smtpPort: settings.smtpPort,
            smtpSecure: settings.smtpSecure,
            smtpUser: settings.smtpUser,
            signature: settings.signature,
            resendApiKey: secretInfo(settings.resendApiKey),
            smtpPassword: secretInfo(settings.smtpPassword),
          }}
        />
      </div>

      <div className="space-y-6">
        <AdminSection title="Huidige situatie">
          <div className="flex gap-3 text-sm">
            {config.transport === "log" ? (
              <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-600" />
            ) : (
              <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-600" />
            )}
            <div className="min-w-0 space-y-1">
              <p>
                E-mails worden verstuurd via <strong>{transportLabels[config.transport]}</strong>
                {config.transport === "resend" && config.source === "hosting" ? " (sleutel uit de hosting)" : ""}.
              </p>
              {config.transport === "log" && <p className="text-muted-foreground">{config.reason}.</p>}
              {config.transport !== "log" && (
                <p className="break-words text-muted-foreground">
                  Afzender: <span className="font-medium text-foreground">{config.from}</span>
                </p>
              )}
              {meta && (
                <p className="text-xs text-muted-foreground">
                  Laatst gewijzigd {formatDateTime(meta.updatedAt)}
                  {meta.updatedBy ? ` door ${meta.updatedBy}` : ""}
                </p>
              )}
            </div>
          </div>
          {freeMailbox && config.transport !== "log" && (
            <p className="mt-4 rounded-md bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-900">
              Je verstuurt vanaf een gratis mailadres. Ontvangers zien dat sneller als spam en Resend accepteert het niet. Gebruik bij voorkeur een adres
              op je eigen domein.
            </p>
          )}
          <div className="mt-5 border-t border-border pt-5">
            <TestEmailForm defaultTo={admin.email} />
          </div>
        </AdminSection>

        <AdminSection title="Eigen domein koppelen bij Resend">
          <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground">
            <li>Maak een gratis account op resend.com en kies Domains → Add domain, bijv. mazdaclubnederland.nl.</li>
            <li>
              Resend toont een paar DNS-records (<strong className="text-foreground">SPF</strong>, <strong className="text-foreground">DKIM</strong> en
              een MX-record voor het subdomein <code>send</code>). Zet die bij je domeinbeheer (bijv. Cloudflare of je domeinprovider).
            </li>
            <li>
              Voeg ook een <strong className="text-foreground">DMARC</strong>-record toe: naam <code>_dmarc</code>, type TXT, waarde{" "}
              <code className="break-all">v=DMARC1; p=none; rua=mailto:info@mazdaclubnederland.nl</code>.
            </li>
            <li>Wacht tot het domein in Resend op “Verified” staat (meestal binnen een uur).</li>
            <li>Maak onder API Keys een sleutel aan (rechten: Sending access), plak die hierboven en kies een afzenderadres op dat domein.</li>
            <li>Sla op en stuur een testmail.</li>
          </ol>
        </AdminSection>

        <AdminSection title="Eigen mailserver (SMTP)">
          <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
            <p>Heb je al een mailbox bij je domeinprovider, dan kun je die gebruiken. De gegevens vind je bij de provider onder “e-mailinstellingen” of “SMTP”.</p>
            <ul className="space-y-1.5">
              <li>
                <strong className="text-foreground">Microsoft 365:</strong> smtp.office365.com, poort 587. Je beheerder moet “SMTP AUTH” aanzetten voor de
                mailbox.
              </li>
              <li>
                <strong className="text-foreground">Google Workspace / Gmail:</strong> smtp.gmail.com, poort 465 met SSL. Gebruik een app-wachtwoord
                (tweestapsverificatie moet aan staan).
              </li>
              <li>
                <strong className="text-foreground">TransIP, Versio, Hostnet:</strong> zie de gegevens in het klantenpaneel van je pakket.
              </li>
            </ul>
            <p className="flex gap-2 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-900">
              <Info className="mt-0.5 size-4 shrink-0" />
              Gratis Outlook.com- en Hotmail-adressen accepteren vaak geen SMTP-wachtwoord meer. Kies in dat geval Resend met je eigen domein.
            </p>
            <p className="text-xs">Tip: gebruik als afzenderadres hetzelfde adres als waarmee je inlogt, anders weigeren veel mailservers het bericht.</p>
          </div>
        </AdminSection>
      </div>
    </div>
  );
}
