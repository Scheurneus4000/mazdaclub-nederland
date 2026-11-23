"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { sendTestEmail } from "@/lib/email";
import { fd } from "@/lib/form-data";
import { rateLimit } from "@/lib/rate-limit";
import { requireAdmin } from "@/lib/session";
import { applySecretInput, getSettings, saveSettings, secretValue, type SettingsOf } from "@/lib/settings";
import { failure, success, type ActionState } from "./state";

const email = z.string().email();
const PROVIDERS = ["auto", "resend", "smtp", "off"] as const;

/** Beheer → Instellingen → E-mail opslaan. Geheime waarden: leeg laten = niet wijzigen. */
export async function saveEmailSettings(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const current = await getSettings("email");
  const errors: Record<string, string> = {};

  const providerRaw = fd.str(formData, "provider");
  const provider = (PROVIDERS as readonly string[]).includes(providerRaw) ? (providerRaw as SettingsOf<"email">["provider"]) : "auto";

  const fromName = fd.str(formData, "fromName");
  const fromAddress = fd.str(formData, "fromAddress").toLowerCase();
  const replyTo = fd.str(formData, "replyTo").toLowerCase();
  const smtpHost = fd.str(formData, "smtpHost").toLowerCase();
  const smtpPortRaw = fd.str(formData, "smtpPort");
  const smtpPort = smtpPortRaw ? Number.parseInt(smtpPortRaw, 10) : 587;
  const smtpUser = fd.str(formData, "smtpUser");
  const signature = fd.str(formData, "signature").replace(/\r\n/g, "\n");

  if (fromName.length > 80) errors.fromName = "Maximaal 80 tekens";
  if (/["<>]/.test(fromName)) errors.fromName = "Gebruik geen aanhalingstekens of < >";
  if (fromAddress && !email.safeParse(fromAddress).success) errors.fromAddress = "Vul een geldig e-mailadres in";
  if (replyTo && !email.safeParse(replyTo).success) errors.replyTo = "Vul een geldig e-mailadres in";
  if (signature.length > 500) errors.signature = "Maximaal 500 tekens";

  const resendApiKey = applySecretInput(current.resendApiKey, formData.get("resendApiKey"));
  const smtpPassword = applySecretInput(current.smtpPassword, formData.get("smtpPassword"));

  if (provider === "resend" || provider === "smtp") {
    if (!fromAddress) errors.fromAddress = "Vul het adres in waarmee e-mails worden verstuurd";
  }
  if (provider === "resend") {
    const key = secretValue(resendApiKey);
    if (!key && !process.env.RESEND_API_KEY) errors.resendApiKey = "Vul de API-sleutel van Resend in";
    else if (key && !key.startsWith("re_")) errors.resendApiKey = "Een Resend-sleutel begint met re_";
  }
  if (provider === "smtp") {
    if (!smtpHost) errors.smtpHost = "Vul de servernaam in, bijv. smtp.office365.com";
    else if (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(smtpHost)) errors.smtpHost = "Ongeldige servernaam";
    if (!Number.isInteger(smtpPort) || smtpPort < 1 || smtpPort > 65535) errors.smtpPort = "Ongeldige poort (meestal 587 of 465)";
    if (!smtpUser) errors.smtpUser = "Vul de gebruikersnaam in (meestal je volledige e-mailadres)";
    if (!secretValue(smtpPassword)) errors.smtpPassword = "Vul het wachtwoord (of app-wachtwoord) in";
  } else if (smtpPortRaw && (!Number.isInteger(smtpPort) || smtpPort < 1 || smtpPort > 65535)) {
    errors.smtpPort = "Ongeldige poort";
  }

  if (Object.keys(errors).length) return failure("Controleer de gemarkeerde velden.", errors);

  try {
    await saveSettings(
      "email",
      {
        provider,
        fromName: fromName || "MazdaClub Nederland",
        fromAddress,
        replyTo,
        resendApiKey,
        smtpHost,
        smtpPort: Number.isInteger(smtpPort) ? smtpPort : 587,
        smtpSecure: fd.bool(formData, "smtpSecure"),
        smtpUser,
        smtpPassword,
        signature,
      },
      admin.email,
    );
  } catch (err) {
    console.error("[instellingen e-mail] opslaan mislukt", err);
    return failure("Opslaan mislukt. Controleer de invoer en probeer het opnieuw.");
  }

  revalidatePath("/admin/instellingen", "layout");
  return success("E-mailinstellingen opgeslagen. Stuur een testmail om te controleren of alles werkt.");
}

/** Stuurt een testmail met de opgeslagen instellingen naar de beheerder (of een ingevuld adres). */
export async function sendTestEmailAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  if (!rateLimit(`testmail:${admin.id}`, 5, 10 * 60_000).ok) return failure("Je hebt net al een paar testmails gestuurd. Probeer het over enkele minuten opnieuw.");

  const to = (fd.str(formData, "to") || admin.email).toLowerCase();
  if (!email.safeParse(to).success) return failure("Vul een geldig e-mailadres in.", { to: "Ongeldig e-mailadres" });

  const result = await sendTestEmail(to);
  if (!result.ok) return failure(result.error ?? "Versturen mislukt.");
  return success(`Testmail verstuurd naar ${to}. Niets ontvangen? Kijk ook in je spammap.`);
}
