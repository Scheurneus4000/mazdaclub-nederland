import { createHash } from "crypto";
import { hashPassword } from "@/auth";
import { markEmailVerified } from "@/lib/accounts";
import { fail, ok, readJson, validationFailed } from "@/lib/api";
import { prisma } from "@/lib/db";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { resetPasswordSchema } from "@/lib/validation";

/**
 * POST /api/password/reset – stelt een nieuw wachtwoord in met een geldige herstellink.
 * Body: { token, password } · 200 { ok: true } · 400 ongeldige/verlopen link · 422 validatiefout
 */
export async function POST(req: Request) {
  if (!rateLimit(`reset:${clientIp(req.headers)}`, 10, 15 * 60_000).ok) {
    return fail("Te veel pogingen. Probeer het later opnieuw.", 429);
  }

  const parsed = resetPasswordSchema.safeParse(await readJson(req));
  if (!parsed.success) return validationFailed(parsed.error);

  const tokenHash = createHash("sha256").update(parsed.data.token).digest("hex");
  const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return fail("Deze link is ongeldig of verlopen. Vraag een nieuwe link aan.", 400);
  }

  const passwordHash = await hashPassword(parsed.data.password);
  await prisma.$transaction([
    prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
    prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    prisma.passwordResetToken.deleteMany({ where: { userId: record.userId, id: { not: record.id } } }),
  ]);

  // Wie de link uit de e-mail gebruikt, bewijst dat het e-mailadres van hem/haar is.
  await markEmailVerified(record.userId).catch((err) => console.error("[wachtwoord] e-mail bevestigen mislukt", err));

  return ok({ ok: true });
}
