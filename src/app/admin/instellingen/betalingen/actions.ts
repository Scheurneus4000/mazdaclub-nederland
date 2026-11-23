"use server";

import { revalidatePath } from "next/cache";
import { failure, success, type ActionState } from "@/app/admin/actions/state";
import { fd } from "@/lib/form-data";
import { formatIban, isValidIban, normalizeIban } from "@/lib/iban";
import { mollieClientFor } from "@/lib/payments/mollie";
import { stripeClientFor } from "@/lib/payments/stripe";
import { requireAdmin } from "@/lib/session";
import { applySecretInput, CLEAR_SECRET, getPaymentConfig, getSettings, saveSettings, secretValue } from "@/lib/settings";

const MOLLIE_KEY = /^(test|live)_[A-Za-z0-9]{20,}$/;
const STRIPE_KEY = /^(sk|rk)_(test|live)_[A-Za-z0-9]{10,}$/;
const STRIPE_WEBHOOK = /^whsec_[A-Za-z0-9]{10,}$/;

function checkKey(value: FormDataEntryValue | null, pattern: RegExp): boolean {
  if (typeof value !== "string" || value.trim() === "" || value === CLEAR_SECRET) return true;
  return pattern.test(value.trim());
}

/** Betaalinstellingen opslaan. Geheime sleutels worden versleuteld; leeg veld = niet wijzigen. */
export async function savePaymentSettings(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const current = await getSettings("payments");

  const provider = fd.str(formData, "provider");
  const errors: Record<string, string> = {};
  if (!["auto", "mollie", "stripe"].includes(provider)) errors.provider = "Kies een betaalprovider";
  if (!checkKey(formData.get("mollieApiKey"), MOLLIE_KEY)) errors.mollieApiKey = "Een Mollie API-sleutel begint met test_ of live_ (bijv. live_abc123…).";
  if (!checkKey(formData.get("stripeSecretKey"), STRIPE_KEY)) errors.stripeSecretKey = "Een Stripe-sleutel begint met sk_test_ of sk_live_.";
  if (!checkKey(formData.get("stripeWebhookSecret"), STRIPE_WEBHOOK)) errors.stripeWebhookSecret = "Een Stripe-webhookgeheim begint met whsec_.";

  const ibanRaw = fd.str(formData, "iban");
  const iban = ibanRaw ? normalizeIban(ibanRaw) : "";
  if (iban && !isValidIban(iban)) errors.iban = "Dit IBAN klopt niet. Controleer het nummer (bijv. NL91 ABNA 0417 1643 00).";
  const accountHolder = fd.str(formData, "accountHolder").slice(0, 120);
  if (iban && !accountHolder) errors.accountHolder = "Vul de tenaamstelling van de rekening in.";
  if (Object.keys(errors).length) return failure("Controleer de gemarkeerde velden.", errors);

  const next = {
    provider: provider as "auto" | "mollie" | "stripe",
    mollieApiKey: applySecretInput(current.mollieApiKey, formData.get("mollieApiKey")),
    stripeSecretKey: applySecretInput(current.stripeSecretKey, formData.get("stripeSecretKey")),
    stripeWebhookSecret: applySecretInput(current.stripeWebhookSecret, formData.get("stripeWebhookSecret")),
    accountHolder,
    iban: iban ? formatIban(iban) : "",
  };
  await saveSettings("payments", next, admin.email);

  revalidatePath("/admin/instellingen", "layout");
  revalidatePath("/lid-worden");

  const config = await getPaymentConfig();
  const keyMissing = (config.provider === "MOLLIE" && !config.mollieApiKey) || (config.provider === "STRIPE" && !config.stripeSecretKey);
  if (keyMissing) return success("Opgeslagen. Let op: er is nog geen API-sleutel, dus bezoekers kunnen nog niet online betalen.");
  return success(config.testMode ? "Opgeslagen. De betaalprovider staat in testmodus: er wordt nog geen echt geld afgeschreven." : "Opgeslagen. Online betalen is live.");
}

const mollieMethodNames: Record<string, string> = {
  ideal: "iDEAL | Wero",
  bancontact: "Bancontact",
  creditcard: "Creditcard",
  applepay: "Apple Pay",
  googlepay: "Google Pay",
  paypal: "PayPal",
  directdebit: "SEPA-incasso (automatisch verlengen)",
  banktransfer: "Overboeking",
  wero: "Wero",
};

/**
 * Test de verbinding met Mollie of Stripe. Gebruikt de sleutel uit het formulier (als die is ingevuld)
 * of anders de opgeslagen sleutel, zodat je kunt testen vóór je opslaat.
 */
export async function testPaymentConnection(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const target = fd.str(formData, "target") === "stripe" ? "stripe" : "mollie";
  const [settings, config] = await Promise.all([getSettings("payments"), getPaymentConfig()]);

  if (target === "mollie") {
    const typed = fd.str(formData, "mollieApiKey");
    const key = typed && typed !== CLEAR_SECRET ? typed : secretValue(settings.mollieApiKey) || config.mollieApiKey;
    if (!key) return failure("Vul eerst een Mollie API-sleutel in.");
    if (!MOLLIE_KEY.test(key)) return failure("Dit lijkt geen Mollie API-sleutel. Hij begint met test_ of live_.");
    try {
      const methods = await mollieClientFor(key).methods.list();
      const names = [...methods].map((m) => mollieMethodNames[m.id] ?? m.description);
      const mode = key.startsWith("live_") ? "live (echte betalingen)" : "testmodus (geen echt geld)";
      if (names.length === 0) {
        return success(`Verbinding gelukt (${mode}), maar er staan nog geen betaalmethoden aan. Zet ze aan in je Mollie-dashboard onder Instellingen → Betaalmethoden.`);
      }
      const hasPaypal = names.includes("PayPal");
      return success(`Verbinding gelukt – ${mode}. Actieve betaalmethoden: ${names.join(", ")}.${hasPaypal ? "" : " Tip: koppel PayPal in je Mollie-dashboard om ook PayPal aan te bieden."}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (/401|unauthori[sz]ed|invalid api key|authentication/i.test(msg)) return failure("Mollie weigert deze sleutel. Controleer of je de juiste API-sleutel hebt gekopieerd (Mollie-dashboard → Ontwikkelaars → API-sleutels).");
      return failure(`Geen verbinding met Mollie: ${msg}`);
    }
  }

  const typed = fd.str(formData, "stripeSecretKey");
  const key = typed && typed !== CLEAR_SECRET ? typed : secretValue(settings.stripeSecretKey) || config.stripeSecretKey;
  if (!key) return failure("Vul eerst een Stripe secret key in.");
  if (!STRIPE_KEY.test(key)) return failure("Dit lijkt geen Stripe secret key. Hij begint met sk_test_ of sk_live_.");
  try {
    const balance = await stripeClientFor(key).balance.retrieve();
    const hasWebhook = !!(secretValue(settings.stripeWebhookSecret) || config.stripeWebhookSecret || fd.str(formData, "stripeWebhookSecret"));
    return success(
      `Verbinding met Stripe gelukt – ${balance.livemode ? "live (echte betalingen)" : "testmodus (geen echt geld)"}.${hasWebhook ? "" : " Vul ook het webhookgeheim in, anders worden betalingen niet automatisch verwerkt."}`,
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/invalid api key|authentication|401/i.test(msg)) return failure("Stripe weigert deze sleutel. Controleer de secret key in het Stripe-dashboard → Developers → API keys.");
    return failure(`Geen verbinding met Stripe: ${msg}`);
  }
}
