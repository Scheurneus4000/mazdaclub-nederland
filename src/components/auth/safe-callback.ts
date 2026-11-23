/** Alleen relatieve paden binnen de eigen site toestaan als redirect-doel (voorkomt open redirects). */
export function safeCallbackUrl(value: string | null | undefined, fallback = "/account"): string {
  if (!value || typeof value !== "string") return fallback;
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return fallback;
  if (value.startsWith("/inloggen") || value.startsWith("/registreren")) return fallback;
  return value;
}
