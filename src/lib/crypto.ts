import "server-only";
import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "crypto";

/**
 * Versleuteling van geheime instellingen (API-sleutels, SMTP-wachtwoord) in de database met
 * AES-256-GCM. De sleutel wordt afgeleid van SETTINGS_ENCRYPTION_KEY of anders AUTH_SECRET.
 * Let op: wijzig je die waarde, dan moeten de geheime instellingen opnieuw worden ingevuld.
 */
const VERSION = "v1";

function encryptionKey(): Buffer {
  const secret = process.env.SETTINGS_ENCRYPTION_KEY || process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET ontbreekt: geheime instellingen kunnen niet veilig worden opgeslagen.");
  return Buffer.from(hkdfSync("sha256", secret, "mazdaclub-nederland", "app-settings-v1", 32));
}

export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${VERSION}:${Buffer.concat([iv, tag, ciphertext]).toString("base64")}`;
}

/** Geeft null terug als de waarde niet (meer) te ontsleutelen is, bijv. na het wijzigen van AUTH_SECRET. */
export function decryptSecret(value: string | null | undefined): string | null {
  if (!value) return null;
  const [version, payload] = value.split(":", 2);
  if (version !== VERSION || !payload) return null;
  try {
    const raw = Buffer.from(payload, "base64");
    const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), raw.subarray(0, 12));
    decipher.setAuthTag(raw.subarray(12, 28));
    return Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}

/** Toont alleen het begin en de laatste 4 tekens, bijv. "live_••••••••3f9a". */
export function maskSecret(plain: string | null | undefined): string | null {
  if (!plain) return null;
  const prefix = /^[a-z]+_/i.exec(plain)?.[0] ?? "";
  return `${prefix}${"•".repeat(8)}${plain.slice(-4)}`;
}
