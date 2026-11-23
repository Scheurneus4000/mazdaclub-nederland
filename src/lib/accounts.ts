import "server-only";
import { createHash, randomBytes } from "crypto";
import type { Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import {
  accountWelcomeVerification,
  EMAIL_VERIFICATION_TTL_HOURS,
  emailVerificationReminder,
  ownerActivated,
  type AccountCreatedVia,
} from "@/lib/email/account-templates";
import { notifyAdmins } from "@/lib/notifications";
import { isOwnerEmail } from "@/lib/owner";
import { rateLimit } from "@/lib/rate-limit";
import { getEmailConfig } from "@/lib/settings";
import { siteUrl } from "@/lib/utils";

export type { AccountCreatedVia };

type AccountUser = { id: string; email: string; firstName: string; lastName: string };
type RoleUser = { id: string; email: string; firstName: string; role: Role; emailVerifiedAt: Date | null };

const viaLabels: Record<AccountCreatedVia, string> = {
  registratie: "de website (gratis account)",
  lidmaatschap: "het lidmaatschapsformulier",
  beheer: "het beheer",
};

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

/**
 * Lokaal (niet in productie) en zonder gekoppelde e-maildienst kan niemand een bevestigingslink
 * ontvangen. Dan krijgt alleen de eigenaar direct beheerdersrechten, zodat je lokaal kunt testen.
 */
async function localWithoutEmail(): Promise<boolean> {
  if (process.env.NODE_ENV === "production") return false;
  try {
    return (await getEmailConfig()).transport === "log";
  } catch {
    return false;
  }
}

/** Maakt een nieuwe bevestigingslink (48 uur geldig). Eerdere ongebruikte links vervallen. */
export async function createEmailVerificationLink(userId: string): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  await prisma.$transaction([
    prisma.emailVerificationToken.deleteMany({ where: { userId, usedAt: null } }),
    prisma.emailVerificationToken.create({
      data: { userId, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + EMAIL_VERIFICATION_TTL_HOURS * 3_600_000) },
    }),
  ]);
  return siteUrl(`/e-mail-bevestigen?token=${encodeURIComponent(token)}`);
}

/**
 * Geeft het account automatisch beheerdersrechten als het e-mailadres van de eigenaar is én
 * bevestigd is. Zonder bevestiging nooit (behalve lokaal zonder e-maildienst), zodat niemand anders
 * met het e-mailadres van de eigenaar een beheerdersaccount kan aanmaken.
 * Geeft true terug als het account zojuist is gepromoveerd.
 */
export async function ensureOwnerRole(user: RoleUser): Promise<boolean> {
  if (!isOwnerEmail(user.email) || user.role === "ADMIN") return false;

  let verifiedAt = user.emailVerifiedAt;
  if (!verifiedAt && (await localWithoutEmail())) {
    verifiedAt = new Date();
    console.info(`[eigenaar] Lokaal zonder e-maildienst: ${user.email} krijgt direct beheerdersrechten (op de echte website pas na bevestiging).`);
  }
  if (!verifiedAt) return false;

  const updated = await prisma.user.updateMany({
    where: { id: user.id, role: { not: "ADMIN" } },
    data: { role: "ADMIN", emailVerifiedAt: user.emailVerifiedAt ?? verifiedAt },
  });
  if (updated.count === 0) return false;

  console.info(`[eigenaar] ${user.email} heeft nu beheerdersrechten.`);
  await sendEmail({ to: user.email, ...ownerActivated(user) });
  return true;
}

/** Markeert het e-mailadres als bevestigd (bijv. na een wachtwoordreset of door een beheerder). */
export async function markEmailVerified(userId: string): Promise<{ promoted: boolean }> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, email: true, firstName: true, role: true, emailVerifiedAt: true } });
  if (!user) return { promoted: false };
  const verifiedAt = user.emailVerifiedAt ?? new Date();
  if (!user.emailVerifiedAt) {
    await prisma.user.update({ where: { id: userId }, data: { emailVerifiedAt: verifiedAt } });
    await prisma.emailVerificationToken.deleteMany({ where: { userId, usedAt: null } });
  }
  return { promoted: await ensureOwnerRole({ ...user, emailVerifiedAt: verifiedAt }) };
}

/**
 * Na het aanmaken van een account: welkomstmail met bevestigingslink en een melding voor het bestuur.
 * Gooit nooit, zodat registratie of betaling niet mislukt door een e-mailprobleem.
 */
export async function onAccountCreated(user: AccountUser, { via }: { via: AccountCreatedVia }): Promise<void> {
  const owner = isOwnerEmail(user.email);
  try {
    const url = await createEmailVerificationLink(user.id);
    if (await localWithoutEmail()) {
      console.info(`[e-mailverificatie] Geen e-maildienst gekoppeld. Bevestigingslink voor ${user.email}:\n${url}`);
    }
    await sendEmail({ to: user.email, ...accountWelcomeVerification(user, url, { owner, via }) });
    if (owner) {
      const fresh = await prisma.user.findUnique({ where: { id: user.id }, select: { id: true, email: true, firstName: true, role: true, emailVerifiedAt: true } });
      if (fresh) await ensureOwnerRole(fresh);
    }
  } catch (err) {
    console.error("[account] welkomstmail of bevestigingslink mislukt", err);
  }

  const name = `${user.firstName} ${user.lastName}`.trim();
  await notifyAdmins({
    type: "accountCreated",
    title: `Nieuw account: ${name}`,
    message: `${name} (${user.email}) heeft een account aangemaakt via ${viaLabels[via]}.`,
    link: `/admin/leden/${user.id}`,
    details: [
      ["Naam", name],
      ["E-mail", user.email],
      ["Aangemaakt via", viaLabels[via]],
      ...(owner ? ([["Let op", "Dit is het e-mailadres van de eigenaar"]] as Array<[string, string]>) : []),
    ],
  });
}

export type VerifyResult =
  | { status: "ok"; firstName: string; promoted: boolean; isAdmin: boolean }
  | { status: "already"; firstName: string; isAdmin: boolean }
  | { status: "expired" }
  | { status: "invalid" };

/** Verwerkt de link uit de bevestigingsmail. */
export async function verifyEmailToken(token: string): Promise<VerifyResult> {
  if (!token || token.length < 20 || token.length > 200) return { status: "invalid" };
  const record = await prisma.emailVerificationToken.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: { select: { id: true, email: true, firstName: true, role: true, emailVerifiedAt: true } } },
  });
  if (!record) return { status: "invalid" };

  if (record.usedAt) {
    return record.user.emailVerifiedAt ? { status: "already", firstName: record.user.firstName, isAdmin: record.user.role === "ADMIN" } : { status: "invalid" };
  }
  if (record.expiresAt < new Date()) return { status: "expired" };

  const claimed = await prisma.emailVerificationToken.updateMany({ where: { id: record.id, usedAt: null }, data: { usedAt: new Date() } });
  if (claimed.count === 0) return { status: "already", firstName: record.user.firstName, isAdmin: record.user.role === "ADMIN" };

  const verifiedAt = record.user.emailVerifiedAt ?? new Date();
  if (!record.user.emailVerifiedAt) await prisma.user.update({ where: { id: record.userId }, data: { emailVerifiedAt: verifiedAt } });
  const promoted = await ensureOwnerRole({ ...record.user, emailVerifiedAt: verifiedAt });
  return { status: "ok", firstName: record.user.firstName, promoted, isAdmin: promoted || record.user.role === "ADMIN" };
}

/** Stuurt een nieuwe bevestigingslink. Max. 3 keer per kwartier per account. */
export async function resendVerificationEmail(userId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, email: true, firstName: true, emailVerifiedAt: true } });
  if (!user) return { ok: false, error: "Account niet gevonden." };
  if (user.emailVerifiedAt) return { ok: false, error: "Dit e-mailadres is al bevestigd." };
  if (!rateLimit(`verify-resend:${userId}`, 3, 15 * 60_000).ok) {
    return { ok: false, error: "Je hebt net al een paar e-mails aangevraagd. Wacht een kwartier en controleer ook je spammap." };
  }
  const url = await createEmailVerificationLink(user.id);
  if (await localWithoutEmail()) console.info(`[e-mailverificatie] Bevestigingslink voor ${user.email}:\n${url}`);
  const sent = await sendEmail({ to: user.email, ...emailVerificationReminder(user, url, { owner: isOwnerEmail(user.email) }) });
  return sent ? { ok: true } : { ok: false, error: "De e-mail kon niet worden verstuurd. Probeer het later opnieuw." };
}
