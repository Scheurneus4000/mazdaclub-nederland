import { hashPassword } from "@/auth";
import { onAccountCreated } from "@/lib/accounts";
import { fail, ok, readJson, validationFailed } from "@/lib/api";
import { prisma } from "@/lib/db";
import { checkHuman } from "@/lib/spam";
import { registerSchema } from "@/lib/validation";

/**
 * POST /api/register – maakt een (gratis) gebruikersaccount aan.
 * Body: { firstName, lastName, email, phone?, password, acceptTerms: true, marketingConsent?, website, formStartedAt, turnstileToken? }
 * 200 { ok: true, verificationSent: true } · 409 e-mailadres bestaat al · 422 validatiefout · 429 te veel pogingen
 * Stuurt een welkomstmail met bevestigingslink. Het account is direct bruikbaar; het e-mailadres van de
 * eigenaar (OWNER_EMAIL) krijgt beheerdersrechten zodra het is bevestigd.
 */
export async function POST(req: Request) {
  const parsed = registerSchema.safeParse(await readJson(req));
  if (!parsed.success) return validationFailed(parsed.error);
  const data = parsed.data;

  const human = await checkHuman(data, req.headers, { scope: "register", limit: 5 });
  if (!human.ok) return fail(human.error, human.status);

  const existing = await prisma.user.findUnique({ where: { email: data.email }, select: { id: true } });
  if (existing) {
    return fail("Er bestaat al een account met dit e-mailadres. Log in of vraag een nieuw wachtwoord aan.", 409, {
      email: "Dit e-mailadres is al in gebruik.",
    });
  }

  const user = await prisma.user.create({
    data: {
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      phone: data.phone || null,
      passwordHash: await hashPassword(data.password),
      marketingConsent: data.marketingConsent ?? false,
    },
  });

  // Welkomstmail met bevestigingslink + melding voor het bestuur (eigenaar: beheerder na bevestiging).
  await onAccountCreated(user, { via: "registratie" });
  return ok({ ok: true, verificationSent: true });
}
