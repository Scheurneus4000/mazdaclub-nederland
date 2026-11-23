import type { Membership } from "@prisma/client";
import { prisma } from "@/lib/db";
import { addYears } from "@/lib/utils";

/** Een lidmaatschap is actief als de status ACTIVE is en de periode nog niet verlopen is. */
export function isMembershipActive(m: Pick<Membership, "status" | "currentPeriodEnd"> | null | undefined, now = new Date()): boolean {
  return !!m && m.status === "ACTIVE" && !!m.currentPeriodEnd && m.currentPeriodEnd > now;
}

export async function getMembership(userId: string) {
  return prisma.membership.findUnique({ where: { userId } });
}

/** Snelle check voor prijsberekeningen (webshopkorting, gratis evenementen). */
export async function isActiveMember(userId: string | null | undefined): Promise<boolean> {
  if (!userId) return false;
  const m = await prisma.membership.findUnique({
    where: { userId },
    select: { status: true, currentPeriodEnd: true },
  });
  return isMembershipActive(m);
}

/** Leden die met hun e-mailadres (zonder in te loggen) inschrijven, herkennen we ook. */
export async function isActiveMemberByEmail(email: string): Promise<{ isMember: boolean; userId: string | null }> {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    select: { id: true, membership: { select: { status: true, currentPeriodEnd: true } } },
  });
  if (!user) return { isMember: false, userId: null };
  return { isMember: isMembershipActive(user.membership), userId: user.id };
}

/**
 * Activeert of verlengt een lidmaatschap met één jaar.
 * - Nog actief: nieuwe periode sluit aan op het huidige einde.
 * - Verlopen of nieuw: periode start vandaag.
 */
export async function activateOrExtendMembership(membershipId: string, paidAt = new Date()) {
  const m = await prisma.membership.findUniqueOrThrow({ where: { id: membershipId } });
  const stillActive = isMembershipActive(m, paidAt);
  const periodStart = stillActive && m.currentPeriodEnd ? m.currentPeriodEnd : paidAt;
  const periodEnd = addYears(periodStart, 1);

  return prisma.membership.update({
    where: { id: membershipId },
    data: {
      status: "ACTIVE",
      startedAt: m.startedAt ?? paidAt,
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
      reminderSentAt: null,
      cancelledAt: null,
    },
  });
}

export type MembershipView = {
  status: Membership["status"] | "NONE";
  active: boolean;
  memberNumber: number | null;
  currentPeriodEnd: Date | null;
  autoRenew: boolean;
  daysLeft: number | null;
};

export function membershipView(m: Membership | null): MembershipView {
  if (!m) return { status: "NONE", active: false, memberNumber: null, currentPeriodEnd: null, autoRenew: false, daysLeft: null };
  const active = isMembershipActive(m);
  const daysLeft = m.currentPeriodEnd ? Math.ceil((m.currentPeriodEnd.getTime() - Date.now()) / 86_400_000) : null;
  return {
    status: active ? "ACTIVE" : m.status === "ACTIVE" ? "EXPIRED" : m.status,
    active,
    memberNumber: m.memberNumber,
    currentPeriodEnd: m.currentPeriodEnd,
    autoRenew: m.autoRenew,
    daysLeft,
  };
}
