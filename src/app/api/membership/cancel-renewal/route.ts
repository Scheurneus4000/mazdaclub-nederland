import { auth } from "@/auth";
import { fail, ok } from "@/lib/api";
import { prisma } from "@/lib/db";
import { cancelSubscription } from "@/lib/payments/mollie";

/** Extra CSRF-bescherming naast SameSite-cookies: verzoeken van een andere origin weigeren. */
function isSameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  try {
    return !!host && new URL(origin).host === host;
  } catch {
    return false;
  }
}

/**
 * POST /api/membership/cancel-renewal
 * Zet de automatische verlenging uit (annuleert het Mollie-abonnement). Het lidmaatschap blijft
 * geldig tot het einde van de lopende periode.
 * 200: { ok: true }
 */
export async function POST(req: Request) {
  if (!isSameOrigin(req)) return fail("Ongeldig verzoek.", 403);

  const session = await auth();
  if (!session?.user?.id) return fail("Je bent niet ingelogd.", 401);

  const user = await prisma.user.findUnique({ where: { id: session.user.id }, include: { membership: true } });
  const membership = user?.membership;
  if (!user || !membership) return fail("Je hebt (nog) geen lidmaatschap.", 404);

  if (membership.mollieSubscriptionId && user.mollieCustomerId) {
    try {
      await cancelSubscription(user.mollieCustomerId, membership.mollieSubscriptionId);
    } catch (err) {
      console.error("[lidmaatschap] abonnement annuleren mislukt", err);
      return fail("Het stopzetten bij de betaalprovider is mislukt. Probeer het later opnieuw of neem contact met ons op.", 502);
    }
  }

  await prisma.membership.update({
    where: { id: membership.id },
    data: { autoRenew: false, mollieSubscriptionId: null, cancelledAt: new Date() },
  });

  return ok({ ok: true });
}
