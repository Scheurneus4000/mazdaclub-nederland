import { clientIp, rateLimit } from "@/lib/rate-limit";

type AntiSpamFields = { website?: string; formStartedAt?: number; turnstileToken?: string };

/**
 * Botbescherming in drie lagen:
 *  1. Honeypot-veld "website" moet leeg zijn.
 *  2. Formulier moet minimaal 2 seconden open zijn geweest (bots vullen direct in).
 *  3. Optioneel Cloudflare Turnstile wanneer TURNSTILE_SECRET_KEY is ingesteld.
 * Daarnaast per IP een rate limit.
 */
export async function checkHuman(
  fields: AntiSpamFields,
  headers: Headers,
  opts: { scope: string; limit?: number; windowMs?: number },
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const ip = clientIp(headers);
  const rl = rateLimit(`${opts.scope}:${ip}`, opts.limit ?? 10, opts.windowMs ?? 10 * 60_000);
  if (!rl.ok) return { ok: false, status: 429, error: `Te veel pogingen. Probeer het over ${rl.retryAfter} seconden opnieuw.` };

  if (fields.website) return { ok: false, status: 400, error: "Je verzoek kon niet worden verwerkt." };
  if (fields.formStartedAt && Date.now() - fields.formStartedAt < 2000) {
    return { ok: false, status: 400, error: "Je verzoek kon niet worden verwerkt. Probeer het opnieuw." };
  }

  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (secret) {
    if (!fields.turnstileToken) return { ok: false, status: 400, error: "Bevestig dat je geen robot bent." };
    try {
      const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
        method: "POST",
        body: new URLSearchParams({ secret, response: fields.turnstileToken, remoteip: ip }),
      });
      const data = (await res.json()) as { success: boolean };
      if (!data.success) return { ok: false, status: 400, error: "Verificatie mislukt. Probeer het opnieuw." };
    } catch {
      return { ok: false, status: 503, error: "Verificatie tijdelijk niet beschikbaar." };
    }
  }
  return { ok: true };
}
