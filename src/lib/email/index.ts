import "server-only";
import { createHash } from "crypto";
import nodemailer, { type Transporter } from "nodemailer";
import { Resend } from "resend";
import { getContent } from "@/lib/content";
import { getEmailConfig, type EmailConfig } from "@/lib/settings";
import { layout, SIGNATURE_PLACEHOLDER } from "./templates";

export type EmailAttachment = { filename: string; content: string | Buffer; contentType?: string };

export type EmailMessage = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  /** Bijlagen, bijv. een agendabestand (.ics). */
  attachments?: EmailAttachment[];
};

// ─── Verzenders (per sleutel/server hergebruikt) ─────────────────────────────

const resendClients = new Map<string, Resend>();
function resendClient(apiKey: string): Resend {
  let c = resendClients.get(apiKey);
  if (!c) {
    c = new Resend(apiKey);
    resendClients.set(apiKey, c);
  }
  return c;
}

const smtpTransports = new Map<string, Transporter>();
function smtpTransport(cfg: Extract<EmailConfig, { transport: "smtp" }>): Transporter {
  const key = createHash("sha256").update(`${cfg.host}|${cfg.port}|${cfg.secure}|${cfg.user}|${cfg.password}`).digest("hex");
  let t = smtpTransports.get(key);
  if (!t) {
    t = nodemailer.createTransport({
      host: cfg.host,
      port: cfg.port,
      secure: cfg.secure,
      auth: { user: cfg.user, pass: cfg.password },
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000,
    });
    smtpTransports.set(key, t);
  }
  return t;
}

// ─── Hulpfuncties ────────────────────────────────────────────────────────────

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function withSignature(html: string, signature: string): string {
  const block = signature
    ? `<p style="margin:24px 0 0;color:#3f3f46;white-space:pre-line;">${escapeHtml(signature)}</p>`
    : "";
  return html.includes(SIGNATURE_PLACEHOLDER) ? html.replace(SIGNATURE_PLACEHOLDER, block) : html;
}

/** Eenvoudige tekstversie van de HTML (beter voor spamfilters en tekst-mailprogramma's). */
function htmlToText(html: string): string {
  return html
    .replace(/<head[\s\S]*?<\/head>/gi, "")
    .replace(/<span style="display:none[^>]*>[\s\S]*?<\/span>/gi, "")
    .replace(/<a [^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, (_m, href: string, label: string) => {
      const text = label.replace(/<[^>]+>/g, "").trim();
      return text && !href.startsWith("mailto:") ? `${text} (${href})` : text || href;
    })
    .replace(/<(br|\/p|\/h[1-6]|\/tr|\/li|\/div)\s*\/?>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<\/td>/gi, "  ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function defaultReplyTo(cfg: EmailConfig): Promise<string | undefined> {
  if (cfg.replyTo) return cfg.replyTo;
  const contact = (await getContent().catch(() => null))?.contactEmail;
  return contact || undefined;
}

type Prepared = { from: string; to: string[]; subject: string; html: string; text: string; replyTo?: string; attachments?: EmailAttachment[] };

async function prepare(message: EmailMessage, cfg: EmailConfig): Promise<Prepared> {
  const html = withSignature(message.html, cfg.signature);
  return {
    from: cfg.from,
    to: [message.to].flat(),
    subject: message.subject,
    html,
    text: message.text ?? htmlToText(html),
    // Een specifiek antwoordadres (bijv. de afzender van een contactbericht) gaat voor.
    replyTo: message.replyTo ?? (await defaultReplyTo(cfg)),
    attachments: message.attachments,
  };
}

async function deliver(cfg: EmailConfig, mail: Prepared): Promise<void> {
  if (cfg.transport === "resend") {
    const { error } = await resendClient(cfg.apiKey).emails.send({
      from: mail.from,
      to: mail.to,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
      replyTo: mail.replyTo,
      attachments: mail.attachments?.map((a) => ({ filename: a.filename, content: a.content, contentType: a.contentType })),
    });
    if (error) throw Object.assign(new Error(error.message), { resendName: error.name });
    return;
  }
  if (cfg.transport === "smtp") {
    await smtpTransport(cfg).sendMail({
      from: mail.from,
      to: mail.to,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
      replyTo: mail.replyTo,
      attachments: mail.attachments?.map((a) => ({ filename: a.filename, content: a.content, contentType: a.contentType })),
    });
  }
}

/** Vertaalt technische foutmeldingen naar begrijpelijke taal voor het beheer. */
export function explainEmailError(err: unknown): string {
  const e = err as { code?: string; responseCode?: number; resendName?: string; message?: string };
  const msg = (e?.message ?? "").toLowerCase();
  if (e?.code === "EAUTH" || e?.responseCode === 535 || msg.includes("authentication")) {
    return "Inloggen bij de mailserver mislukt. Controleer gebruikersnaam en wachtwoord. Bij Microsoft 365 moet 'SMTP AUTH' aan staan; bij Gmail en Outlook.com heb je meestal een app-wachtwoord nodig.";
  }
  if (["ECONNECTION", "ETIMEDOUT", "ESOCKET", "ENOTFOUND", "ECONNREFUSED", "EDNS"].includes(e?.code ?? "")) {
    return "Geen verbinding met de mailserver. Controleer de servernaam en de poort (meestal 587, of 465 met SSL/TLS).";
  }
  if (msg.includes("certificate") || msg.includes("wrong version number") || msg.includes("ssl") || msg.includes("tls")) {
    return "De beveiligde verbinding mislukte. Gebruik poort 465 mét 'SSL/TLS' aangevinkt, of poort 587 zónder.";
  }
  if (e?.resendName === "validation_error" && msg.includes("domain")) {
    return "Het afzenderdomein is nog niet geverifieerd bij Resend. Voeg de DNS-records toe die Resend toont en wacht tot het domein op 'Verified' staat.";
  }
  if (e?.resendName === "invalid_api_Key" || e?.resendName === "missing_api_key" || msg.includes("api key")) {
    return "De Resend API-sleutel is ongeldig of ingetrokken. Maak een nieuwe sleutel aan in Resend.";
  }
  if (msg.includes("from") && msg.includes("invalid")) return "Het afzenderadres is ongeldig.";
  if (e?.responseCode === 550 || e?.responseCode === 553 || msg.includes("sender") || msg.includes("not allowed to send")) {
    return "De mailserver weigert dit afzenderadres. Gebruik als afzender hetzelfde adres als waarmee je inlogt (of een alias daarvan).";
  }
  return `Versturen mislukt: ${e?.message || "onbekende fout"}`;
}

// ─── Publieke functies ───────────────────────────────────────────────────────

/**
 * Verstuurt een e-mail via de ingestelde dienst (Beheer → Instellingen → E-mail): Resend of een eigen
 * mailserver (SMTP). Zonder koppeling wordt de mail alleen in de serverlog getoond, zodat lokaal
 * ontwikkelen zonder e-mailaccount mogelijk is. Gooit nooit: een mislukte e-mail mag een betaling of
 * inschrijving niet laten mislukken.
 */
export async function sendEmail(message: EmailMessage): Promise<boolean> {
  let cfg: EmailConfig;
  try {
    cfg = await getEmailConfig();
  } catch (err) {
    console.error("[e-mail] instellingen laden mislukt", err);
    return false;
  }

  if (cfg.transport === "log") {
    const files = message.attachments?.length ? `\nBijlagen: ${message.attachments.map((a) => a.filename).join(", ")}` : "";
    console.info(`\n[e-mail – niet verzonden: ${cfg.reason}]\nAan: ${[message.to].flat().join(", ")}\nOnderwerp: ${message.subject}${files}\n`);
    return true;
  }

  try {
    await deliver(cfg, await prepare(message, cfg));
    return true;
  } catch (err) {
    console.error(`[e-mail] versturen via ${cfg.transport} mislukt:`, explainEmailError(err), err);
    return false;
  }
}

/** Verstuurt een testmail met de opgeslagen instellingen en geeft een begrijpelijke foutmelding terug. */
export async function sendTestEmail(to: string): Promise<{ ok: boolean; error?: string; transport: EmailConfig["transport"]; from: string }> {
  const cfg = await getEmailConfig();
  if (cfg.transport === "log") return { ok: false, error: `Er wordt nog niets verstuurd: ${cfg.reason}.`, transport: cfg.transport, from: cfg.from };

  const html = layout(
    "Testmail van je website",
    `<p>Goed nieuws: de e-mailinstellingen van MazdaClub Nederland werken.</p>
<p style="color:#52525b;font-size:13px;">Verzonden via ${cfg.transport === "smtp" ? `je eigen mailserver (${escapeHtml(cfg.host)})` : "Resend"} vanaf ${escapeHtml(cfg.from)}.</p>`,
    "De e-mailinstellingen werken",
  );
  try {
    if (cfg.transport === "smtp") await smtpTransport(cfg).verify();
    await deliver(cfg, await prepare({ to, subject: "Testmail: de e-mailinstellingen werken", html }, cfg));
    return { ok: true, transport: cfg.transport, from: cfg.from };
  } catch (err) {
    return { ok: false, error: explainEmailError(err), transport: cfg.transport, from: cfg.from };
  }
}
