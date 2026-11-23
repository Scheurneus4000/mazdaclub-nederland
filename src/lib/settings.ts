import "server-only";
import { cache } from "react";
import type { Prisma, ShippingMethod } from "@prisma/client";
import { z } from "zod";
import { decryptSecret, encryptSecret, maskSecret } from "@/lib/crypto";
import { prisma } from "@/lib/db";
import { ownerEmails } from "@/lib/owner";
import type { Pricing, ShippingOption } from "@/lib/pricing";

/**
 * Instellingen die beheerders zelf aanpassen in Beheer → Instellingen (zonder code of hosting).
 * Per onderdeel één JSON-record in AppSetting. Geheime waarden staan versleuteld als { enc }.
 * Volgorde bij het bepalen van een waarde: instelling in het beheer → omgevingsvariabele → standaard.
 */

/** Versleutelde geheime waarde. Nooit naar de browser sturen; gebruik secretInfo() voor weergave. */
const secret = z.object({ enc: z.string() }).nullable().default(null);
export type StoredSecret = z.infer<typeof secret>;

const shippingMethodSchema = (label: string, description: string, costCents: number, freeFromCents: number | null) =>
  z
    .object({
      enabled: z.boolean().default(true),
      label: z.string().trim().min(1).max(80).default(label),
      description: z.string().trim().max(160).default(description),
      costCents: z.number().int().min(0).max(100_000).default(costCents),
      /** Gratis verzending vanaf dit bedrag (na ledenkorting); null = nooit gratis. */
      freeFromCents: z.number().int().min(0).max(1_000_000).nullable().default(freeFromCents),
    })
    .default({});

export const settingsSchemas = {
  payments: z.object({
    /** "auto" = PAYMENT_PROVIDER uit de hosting (standaard Mollie). */
    provider: z.enum(["auto", "mollie", "stripe"]).default("auto"),
    mollieApiKey: secret,
    stripeSecretKey: secret,
    stripeWebhookSecret: secret,
    /** Ter informatie en voor handmatige overboekingen; uitbetalingen van online betalingen regelt de provider. */
    accountHolder: z.string().trim().max(120).default(""),
    iban: z.string().trim().max(40).default(""),
  }),

  membership: z.object({
    priceCents: z.number().int().min(0).max(100_000).default(5000),
    memberDiscountPercent: z.number().int().min(0).max(100).default(25),
    eventPriceNonMemberCents: z.number().int().min(0).max(100_000).default(500),
    eventPriceMemberCents: z.number().int().min(0).max(100_000).default(0),
    /** Automatische jaarlijkse verlenging aanbieden (alleen met Mollie). */
    autoRenewAvailable: z.boolean().default(true),
    /** Herinneringsmail zoveel dagen vóór het einde van een lidmaatschap zonder automatische verlenging. */
    reminderDaysBefore: z.number().int().min(0).max(90).default(30),
  }),

  shipping: z.object({
    sender: z
      .object({
        name: z.string().trim().max(120).default("MazdaClub Nederland"),
        contactPerson: z.string().trim().max(120).default(""),
        street: z.string().trim().max(120).default(""),
        houseNumber: z.string().trim().max(20).default(""),
        postalCode: z.string().trim().max(12).default(""),
        city: z.string().trim().max(80).default(""),
        country: z.string().trim().length(2).default("NL"),
        phone: z.string().trim().max(30).default(""),
        email: z.string().trim().max(254).default(""),
      })
      .default({}),
    methods: z
      .object({
        POSTNL_NL: shippingMethodSchema("PostNL – Nederland", "Binnen 1–3 werkdagen in huis", 495, 7500),
        POSTNL_BE: shippingMethodSchema("PostNL – België", "Binnen 2–4 werkdagen in huis", 795, 10000),
        PICKUP_EVENT: shippingMethodSchema("Ophalen bij een clubevenement", "Gratis, afhalen bij de clubstand", 0, null),
      })
      .default({}),
    processingTime: z.string().trim().max(160).default("Bestellingen worden binnen 1–2 werkdagen verzonden."),
    /** Voorbereid voor een koppeling met een verzendplatform (labels, track & trace). */
    carrier: z
      .object({
        provider: z.enum(["none", "sendcloud", "myparcel"]).default("none"),
        apiKey: secret,
        apiSecret: secret,
      })
      .default({}),
  }),

  email: z.object({
    /** "auto" = RESEND_API_KEY / EMAIL_FROM uit de hosting; "off" = niets versturen (alleen loggen). */
    provider: z.enum(["auto", "resend", "smtp", "off"]).default("auto"),
    fromName: z.string().trim().max(80).default("MazdaClub Nederland"),
    fromAddress: z.string().trim().max(254).default(""),
    replyTo: z.string().trim().max(254).default(""),
    resendApiKey: secret,
    smtpHost: z.string().trim().max(200).default(""),
    smtpPort: z.number().int().min(1).max(65535).default(587),
    /** true = SSL/TLS vanaf het begin (meestal poort 465); false = STARTTLS (meestal poort 587). */
    smtpSecure: z.boolean().default(false),
    smtpUser: z.string().trim().max(200).default(""),
    smtpPassword: secret,
    /** Optionele afsluiting onder elke e-mail, bijv. "Met sportieve groet, het bestuur". */
    signature: z.string().trim().max(500).default(""),
  }),

  notifications: z.object({
    /** Ontvangers van e-mailmeldingen. Leeg = de eigenaar (OWNER_EMAIL). */
    recipients: z.array(z.string().trim().toLowerCase().email()).max(10).default([]),
    events: z
      .object({
        accountCreated: z.boolean().default(true),
        membershipStarted: z.boolean().default(true),
        membershipRenewed: z.boolean().default(true),
        membershipExpired: z.boolean().default(false),
        eventRegistration: z.boolean().default(true),
        orderPaid: z.boolean().default(true),
        contactMessage: z.boolean().default(true),
        paymentFailed: z.boolean().default(false),
        paymentRefunded: z.boolean().default(true),
      })
      .default({}),
  }),
};

export type SettingsGroup = keyof typeof settingsSchemas;
export type SettingsOf<G extends SettingsGroup> = z.infer<(typeof settingsSchemas)[G]>;
export type NotificationEvent = keyof SettingsOf<"notifications">["events"];

/** Alle instellingen in één query per request. */
const loadAll = cache(async (): Promise<Map<string, { value: unknown; updatedAt: Date; updatedBy: string | null }>> => {
  try {
    const rows = await prisma.appSetting.findMany();
    return new Map(rows.map((r) => [r.key, { value: r.value, updatedAt: r.updatedAt, updatedBy: r.updatedBy }]));
  } catch (err) {
    console.error("[instellingen] laden mislukt, standaardwaarden gebruikt", err);
    return new Map();
  }
});

export async function getSettings<G extends SettingsGroup>(group: G): Promise<SettingsOf<G>> {
  const stored = (await loadAll()).get(group)?.value ?? {};
  const schema = settingsSchemas[group];
  const parsed = schema.safeParse(stored);
  if (parsed.success) return parsed.data as SettingsOf<G>;
  console.warn(`[instellingen] ${group} ongeldig opgeslagen, standaardwaarden gebruikt`, parsed.error.issues[0]);
  return schema.parse({}) as SettingsOf<G>;
}

export async function getSettingsMeta(group: SettingsGroup): Promise<{ updatedAt: Date; updatedBy: string | null } | null> {
  const row = (await loadAll()).get(group);
  return row ? { updatedAt: row.updatedAt, updatedBy: row.updatedBy } : null;
}

/** Valideert en slaat een compleet onderdeel op. Gooit een ZodError bij ongeldige invoer. */
export async function saveSettings<G extends SettingsGroup>(group: G, value: SettingsOf<G>, updatedBy: string): Promise<SettingsOf<G>> {
  const parsed = settingsSchemas[group].parse(value) as SettingsOf<G>;
  const json = parsed as unknown as Prisma.InputJsonValue;
  await prisma.appSetting.upsert({ where: { key: group }, update: { value: json, updatedBy }, create: { key: group, value: json, updatedBy } });
  return parsed;
}

// ─── Geheime waarden ─────────────────────────────────────────────────────────

export const CLEAR_SECRET = "__wissen__";

export function secretValue(s: StoredSecret | undefined): string | null {
  return s ? decryptSecret(s.enc) : null;
}

/** Veilige weergave voor het beheer: nooit de waarde zelf. */
export function secretInfo(s: StoredSecret | undefined): { set: boolean; masked: string | null; unreadable: boolean } {
  if (!s) return { set: false, masked: null, unreadable: false };
  const plain = decryptSecret(s.enc);
  return { set: true, masked: plain ? maskSecret(plain) : null, unreadable: !plain };
}

/**
 * Verwerkt invoer uit een formulier voor een geheim veld:
 *  - leeg of niet meegestuurd → huidige waarde behouden
 *  - CLEAR_SECRET → wissen
 *  - anders → nieuwe waarde versleuteld opslaan
 */
export function applySecretInput(current: StoredSecret | undefined, input: FormDataEntryValue | null | undefined): StoredSecret {
  if (typeof input !== "string" || input.trim() === "") return current ?? null;
  if (input === CLEAR_SECRET) return null;
  return { enc: encryptSecret(input.trim()) };
}

// ─── Afgeleide configuratie ──────────────────────────────────────────────────

export type PaymentConfig = {
  provider: "MOLLIE" | "STRIPE" | "MOCK";
  mollieApiKey: string | null;
  stripeSecretKey: string | null;
  stripeWebhookSecret: string | null;
  /** Waar de sleutel vandaan komt, voor de statusweergave. */
  keySource: "beheer" | "hosting" | null;
  testMode: boolean;
};

export async function getPaymentConfig(): Promise<PaymentConfig> {
  const s = await getSettings("payments");
  const chosen = s.provider === "auto" ? (process.env.PAYMENT_PROVIDER || "mollie").toLowerCase() : s.provider;
  const provider = chosen === "stripe" ? "STRIPE" : chosen === "mock" ? "MOCK" : "MOLLIE";

  const dbMollie = secretValue(s.mollieApiKey);
  const dbStripe = secretValue(s.stripeSecretKey);
  const mollieApiKey = dbMollie || process.env.MOLLIE_API_KEY || null;
  const stripeSecretKey = dbStripe || process.env.STRIPE_SECRET_KEY || null;
  const stripeWebhookSecret = secretValue(s.stripeWebhookSecret) || process.env.STRIPE_WEBHOOK_SECRET || null;

  const key = provider === "STRIPE" ? stripeSecretKey : provider === "MOLLIE" ? mollieApiKey : null;
  const fromDb = provider === "STRIPE" ? !!dbStripe : provider === "MOLLIE" ? !!dbMollie : false;
  return {
    provider,
    mollieApiKey,
    stripeSecretKey,
    stripeWebhookSecret,
    keySource: key ? (fromDb ? "beheer" : "hosting") : null,
    testMode: provider === "MOCK" || (!!key && (key.startsWith("test_") || key.startsWith("sk_test_"))),
  };
}

export type { Pricing, ShippingOption };

/** Prijzen en verzendopties uit Beheer → Instellingen. Veilig om aan client-componenten door te geven. */
export const getPricing = cache(async (): Promise<Pricing> => {
  const [m, s] = await Promise.all([getSettings("membership"), getSettings("shipping")]);
  const shipping = Object.fromEntries(
    (Object.keys(s.methods) as ShippingMethod[]).map((key) => {
      const o = s.methods[key];
      return [key, { enabled: o.enabled, label: o.label, description: o.description, cost: o.costCents, freeFrom: o.freeFromCents }];
    }),
  ) as Record<ShippingMethod, ShippingOption>;
  return {
    membershipPriceCents: m.priceCents,
    memberDiscountPercent: m.memberDiscountPercent,
    memberDiscountRate: m.memberDiscountPercent / 100,
    eventPriceNonMemberCents: m.eventPriceNonMemberCents,
    eventPriceMemberCents: m.eventPriceMemberCents,
    autoRenewAvailable: m.autoRenewAvailable,
    shipping,
  };
});

export type EmailConfig =
  | { transport: "resend"; apiKey: string; from: string; replyTo: string | null; signature: string; source: "beheer" | "hosting" }
  | {
      transport: "smtp";
      host: string;
      port: number;
      secure: boolean;
      user: string;
      password: string;
      from: string;
      replyTo: string | null;
      signature: string;
    }
  | { transport: "log"; from: string; replyTo: string | null; signature: string; reason: string };

function formatFrom(name: string, address: string): string {
  const cleanName = name.replace(/["<>]/g, "").trim();
  return cleanName ? `${cleanName} <${address}>` : address;
}

/** Bepaalt hoe e-mails worden verstuurd (Resend, eigen mailserver via SMTP, of alleen in de log). */
export async function getEmailConfig(): Promise<EmailConfig> {
  const s = await getSettings("email");
  const envFrom = process.env.EMAIL_FROM || "MazdaClub Nederland <noreply@mazdaclubnederland.nl>";
  const from = s.fromAddress ? formatFrom(s.fromName, s.fromAddress) : envFrom;
  const replyTo = s.replyTo || null;
  const signature = s.signature;

  if (s.provider === "off") return { transport: "log", from, replyTo, signature, reason: "E-mail staat uit in Beheer → Instellingen → E-mail" };

  if (s.provider === "smtp") {
    const password = secretValue(s.smtpPassword);
    if (s.smtpHost && s.smtpUser && password) {
      return { transport: "smtp", host: s.smtpHost, port: s.smtpPort, secure: s.smtpSecure, user: s.smtpUser, password, from, replyTo, signature };
    }
    return { transport: "log", from, replyTo, signature, reason: "SMTP-gegevens zijn niet volledig ingevuld" };
  }

  const dbKey = secretValue(s.resendApiKey);
  const apiKey = dbKey || process.env.RESEND_API_KEY || null;
  if (apiKey) return { transport: "resend", apiKey, from, replyTo, signature, source: dbKey ? "beheer" : "hosting" };
  return { transport: "log", from, replyTo, signature, reason: "Er is nog geen e-maildienst gekoppeld" };
}

/** E-mailadressen die meldingen ontvangen: instelling → eigenaar(s) → ADMIN_EMAIL. */
export async function getNotificationRecipients(): Promise<string[]> {
  const s = await getSettings("notifications");
  if (s.recipients.length) return s.recipients;
  const owners = ownerEmails();
  if (owners.length) return owners;
  return process.env.ADMIN_EMAIL ? [process.env.ADMIN_EMAIL] : [];
}
