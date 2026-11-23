import { createHash, randomBytes } from "crypto";
import { fail, ok, readJson, validationFailed } from "@/lib/api";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { passwordReset } from "@/lib/email/templates";
import { checkHuman } from "@/lib/spam";
import { siteUrl } from "@/lib/utils";
import { forgotPasswordSchema } from "@/lib/validation";

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 uur

/**
 * POST /api/password/forgot – stuurt een herstellink als het account bestaat.
 * Body: { email, website, formStartedAt, turnstileToken? }
 * Antwoordt altijd { ok: true }, zodat niet te achterhalen is welke e-mailadressen een account hebben.
 */
export async function POST(req: Request) {
  const parsed = forgotPasswordSchema.safeParse(await readJson(req));
  if (!parsed.success) return validationFailed(parsed.error);

  const human = await checkHuman(parsed.data, req.headers, { scope: "forgot", limit: 5 });
  if (!human.ok) return fail(human.error, human.status);

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email }, select: { id: true, firstName: true, email: true } });
  if (user) {
    const token = randomBytes(32).toString("base64url");
    const tokenHash = createHash("sha256").update(token).digest("hex");
    await prisma.$transaction([
      // Oude, ongebruikte links vervallen zodra er een nieuwe wordt aangevraagd.
      prisma.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } }),
      prisma.passwordResetToken.create({ data: { userId: user.id, tokenHash, expiresAt: new Date(Date.now() + TOKEN_TTL_MS) } }),
    ]);
    const url = siteUrl(`/wachtwoord-resetten?token=${encodeURIComponent(token)}`);
    await sendEmail({ to: user.email, ...passwordReset(user, url) });
  }

  return ok({ ok: true });
}
