import { auth } from "@/auth";
import { fail, ok, readJson, validationFailed } from "@/lib/api";
import { isActiveMember } from "@/lib/membership";
import { enabledShippingMethods } from "@/lib/pricing";
import { getPricing } from "@/lib/settings";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { buildQuote, resolveCartLines } from "@/lib/shop";
import { quoteSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

/**
 * POST /api/shop/quote
 * body: { items: [{ variantId, quantity }], shippingMethod?: "POSTNL_NL" | "POSTNL_BE" | "PICKUP_EVENT" }
 * → QuoteResponse (prijzen en voorraad uit de database, ledenkorting voor de ingelogde gebruiker)
 */
export async function POST(req: Request) {
  if (!rateLimit(`quote:${clientIp(req.headers)}`, 120, 60_000).ok) return fail("Te veel verzoeken. Probeer het zo opnieuw.", 429);

  const parsed = quoteSchema.safeParse(await readJson(req));
  if (!parsed.success) return validationFailed(parsed.error);

  const session = await auth();
  const [lines, isMember, pricing] = await Promise.all([resolveCartLines(parsed.data.items), isActiveMember(session?.user?.id), getPricing()]);
  const enabled = enabledShippingMethods(pricing);
  const method = enabled.includes(parsed.data.shippingMethod) ? parsed.data.shippingMethod : enabled[0];
  return ok(buildQuote(lines, isMember, method, pricing), { headers: { "Cache-Control": "no-store" } });
}
