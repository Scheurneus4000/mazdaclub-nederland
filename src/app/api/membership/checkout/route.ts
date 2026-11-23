import { Prisma } from "@prisma/client";
import { auth, hashPassword, signIn } from "@/auth";
import { onAccountCreated } from "@/lib/accounts";
import { fail, ok, readJson, validationFailed } from "@/lib/api";
import { prisma } from "@/lib/db";
import { isMembershipActive } from "@/lib/membership";
import { activeProvider, startPayment } from "@/lib/payments";
import { cancelSubscription, createMollieCustomer } from "@/lib/payments/mollie";
import { getPricing } from "@/lib/settings";
import { checkHuman } from "@/lib/spam";
import { fullName, normalizeLicensePlate } from "@/lib/utils";
import { membershipCheckoutSchema } from "@/lib/validation";

async function providerName(): Promise<string | null> {
  try {
    return (await activeProvider()).name;
  } catch {
    return null;
  }
}

function formatPostalCode(input: string | undefined): string | null {
  if (!input) return null;
  return input.toUpperCase().replace(/^(\d{4})\s?([A-Z]{2})$/, "$1 $2");
}

/**
 * POST /api/membership/checkout
 * Body: { autoRenew: boolean, acceptTerms: true, account?: {...nieuw account}, website?, formStartedAt?, turnstileToken? }
 * 200: { checkoutUrl } – 409 bij bestaand e-mailadres of lopend automatisch abonnement.
 */
export async function POST(req: Request) {
  const parsed = membershipCheckoutSchema.safeParse(await readJson(req));
  if (!parsed.success) return validationFailed(parsed.error);
  const data = parsed.data;

  const human = await checkHuman(data, req.headers, { scope: "membership", limit: 6 });
  if (!human.ok) return fail(human.error, human.status);

  const [provider, pricing] = await Promise.all([providerName(), getPricing()]);
  if (!provider) return fail("Online betalen is tijdelijk niet beschikbaar.", 503);

  const session = await auth();
  let user = session?.user?.id ? await prisma.user.findUnique({ where: { id: session.user.id }, include: { membership: true } }) : null;
  let newAccount: { email: string; password: string } | null = null;

  // ── Nieuw account voor bezoekers zonder login ──
  if (!user) {
    const acc = data.account;
    if (!acc) {
      return fail("Vul je gegevens in om een account aan te maken.", 422, { "account.firstName": "Vul je voornaam in" });
    }
    const exists = await prisma.user.findUnique({ where: { email: acc.email }, select: { id: true } });
    if (exists) {
      return fail("Er bestaat al een account met dit e-mailadres. Log in om lid te worden.", 409, {
        "account.email": "Er bestaat al een account met dit e-mailadres.",
      });
    }
    try {
      user = await prisma.user.create({
        data: {
          email: acc.email,
          passwordHash: await hashPassword(acc.password),
          firstName: acc.firstName,
          lastName: acc.lastName,
          phone: acc.phone || null,
          street: acc.street || null,
          houseNumber: acc.houseNumber || null,
          postalCode: formatPostalCode(acc.postalCode),
          city: acc.city || null,
          country: acc.country ?? "NL",
          licensePlate: acc.licensePlate ? normalizeLicensePlate(acc.licensePlate) : null,
          carModel: acc.carModel || null,
          marketingConsent: acc.marketingConsent ?? false,
        },
        include: { membership: true },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        return fail("Er bestaat al een account met dit e-mailadres. Log in om lid te worden.", 409, {
          "account.email": "Er bestaat al een account met dit e-mailadres.",
        });
      }
      throw err;
    }
    await onAccountCreated(user, { via: "lidmaatschap" });
    newAccount = { email: acc.email, password: acc.password };
  }

  // ── Lidmaatschap aanmaken of verlengen ──
  const existing = user.membership;
  const active = isMembershipActive(existing);
  if (existing && active && existing.mollieSubscriptionId) {
    return fail("Je lidmaatschap wordt al automatisch verlengd. Je hoeft niets te doen.", 409);
  }

  // Inactief lidmaatschap met een oud abonnement (bijv. mislukte incasso): oud abonnement opruimen.
  if (existing && !active && existing.mollieSubscriptionId) {
    if (user.mollieCustomerId) {
      try {
        await cancelSubscription(user.mollieCustomerId, existing.mollieSubscriptionId);
      } catch (err) {
        console.warn("[lidmaatschap] oud abonnement annuleren mislukt", err);
      }
    }
    await prisma.membership.update({ where: { id: existing.id }, data: { mollieSubscriptionId: null } });
  }

  let autoRenew = data.autoRenew && provider === "MOLLIE" && pricing.autoRenewAvailable;
  let recurringFirst: { customerId: string } | undefined;
  if (autoRenew) {
    let customerId = user.mollieCustomerId;
    if (!customerId) {
      try {
        customerId = await createMollieCustomer(fullName(user), user.email);
        await prisma.user.update({ where: { id: user.id }, data: { mollieCustomerId: customerId } });
      } catch (err) {
        console.error("[lidmaatschap] Mollie-klant aanmaken mislukt; verder zonder automatische verlenging", err);
        customerId = null;
      }
    }
    if (customerId) recurringFirst = { customerId };
    else autoRenew = false;
  }

  const membership = existing
    ? await prisma.membership.update({ where: { id: existing.id }, data: { autoRenew } })
    : await prisma.membership.create({ data: { userId: user.id, status: "PENDING", autoRenew } });

  // Nieuw account direct inloggen, zodat de bezoeker na betaling in "Mijn Account" uitkomt.
  if (newAccount) {
    try {
      await signIn("credentials", { email: newAccount.email, password: newAccount.password, redirect: false });
    } catch (err) {
      console.warn("[lidmaatschap] automatisch inloggen mislukt", err);
    }
  }

  const isRenewal = !!membership.startedAt;
  try {
    const { checkoutUrl } = await startPayment({
      type: "MEMBERSHIP",
      amount: pricing.membershipPriceCents,
      description: isRenewal ? "Verlenging lidmaatschap MazdaClub Nederland (1 jaar)" : "Lidmaatschap MazdaClub Nederland (1 jaar)",
      customerEmail: user.email,
      customerName: fullName(user),
      userId: user.id,
      membershipId: membership.id,
      recurringFirst,
    });
    return ok({ checkoutUrl });
  } catch (err) {
    return fail(err instanceof Error ? err.message : "De betaling kon niet worden gestart.", 502);
  }
}
