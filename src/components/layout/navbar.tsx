import { auth } from "@/auth";
import { getContent } from "@/lib/content";
import { prisma } from "@/lib/db";
import { isMembershipActive } from "@/lib/membership";
import { getPricing } from "@/lib/settings";
import { formatPrice } from "@/lib/utils";
import { NavbarClient } from "./navbar-client";

/**
 * Server-deel van de navigatie. Rol en lidmaatschap komen uit de database (niet uit het JWT),
 * zodat een gewijzigde rol of een verwijderd account direct correct wordt getoond.
 */
export async function Navbar() {
  const [session, content, pricing] = await Promise.all([auth(), getContent(), getPricing()]);

  let user: { name: string; email: string; isAdmin: boolean; isMember: boolean } | null = null;
  if (session?.user?.id) {
    const dbUser = await prisma.user
      .findUnique({
        where: { id: session.user.id },
        select: { firstName: true, lastName: true, email: true, role: true, membership: { select: { status: true, currentPeriodEnd: true } } },
      })
      .catch(() => null);
    if (dbUser) {
      user = {
        name: `${dbUser.firstName} ${dbUser.lastName}`,
        email: dbUser.email,
        isAdmin: dbUser.role === "ADMIN",
        isMember: isMembershipActive(dbUser.membership),
      };
    }
  }
  return (
    <NavbarClient
      user={user}
      announcement={content.announcement}
      logo={{ logo: content.logoUrl || undefined, logoInverted: content.logoInvertedUrl || undefined }}
      membershipPriceLabel={formatPrice(pricing.membershipPriceCents)}
    />
  );
}
