import type { Prisma } from "@prisma/client";

/** Gedeelde filters voor het overzicht "Gebruikers & leden" en de ledenexport. */
export const memberFilterOptions = [
  { value: "alle", label: "Alle gebruikers" },
  { value: "actief", label: "Betaalde leden (actief)" },
  { value: "gratis", label: "Gratis accounts (geen actief lidmaatschap)" },
  { value: "verlopen", label: "Lidmaatschap verlopen / opgezegd" },
  { value: "in-afwachting", label: "Wacht op eerste betaling" },
  { value: "geen", label: "Nooit lid geweest" },
  { value: "beheerders", label: "Beheerders" },
  { value: "onbevestigd", label: "E-mailadres niet bevestigd" },
];

export function memberWhere(status: string, q: string, now = new Date()): Prisma.UserWhereInput {
  const and: Prisma.UserWhereInput[] = [];
  const activeMembership: Prisma.MembershipWhereInput = { status: "ACTIVE", currentPeriodEnd: { gt: now } };
  switch (status) {
    case "actief":
      and.push({ membership: { is: activeMembership } });
      break;
    case "gratis":
      and.push({ NOT: { membership: { is: activeMembership } } });
      break;
    case "verlopen":
      and.push({
        membership: {
          is: { OR: [{ status: "EXPIRED" }, { status: "CANCELLED" }, { status: "ACTIVE", currentPeriodEnd: { lte: now } }] },
        },
      });
      break;
    case "in-afwachting":
      and.push({ membership: { is: { status: "PENDING" } } });
      break;
    case "geen":
      and.push({ membership: { is: null } });
      break;
    case "beheerders":
      and.push({ role: "ADMIN" });
      break;
    case "onbevestigd":
      and.push({ emailVerifiedAt: null });
      break;
  }
  if (q) {
    const or: Prisma.UserWhereInput[] = [
      { firstName: { contains: q, mode: "insensitive" } },
      { lastName: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
      { licensePlate: { contains: q.replace(/\s/g, ""), mode: "insensitive" } },
      { city: { contains: q, mode: "insensitive" } },
    ];
    const digits = q.replace(/^MCN-?/i, "");
    if (/^\d{1,9}$/.test(digits)) or.push({ membership: { is: { memberNumber: Number(digits) } } });
    and.push({ OR: or });
  }
  return and.length ? { AND: and } : {};
}
