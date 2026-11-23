import { fail } from "@/lib/api";
import { prisma } from "@/lib/db";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { getCurrentUser } from "@/lib/session";

/**
 * GET /api/account/export – AVG-recht op inzage/dataportabiliteit.
 * Geeft alle persoonsgegevens van de ingelogde gebruiker als JSON-download (zonder wachtwoordhash).
 */
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return fail("Je bent niet ingelogd.", 401);
  if (!rateLimit(`export:${user.id}:${clientIp(req.headers)}`, 5, 60 * 60_000).ok) {
    return fail("Je hebt je gegevens recent al gedownload. Probeer het later opnieuw.", 429);
  }

  const [orders, registrations, payments] = await Promise.all([
    prisma.order.findMany({ where: { userId: user.id }, include: { items: true }, orderBy: { createdAt: "desc" } }),
    prisma.eventRegistration.findMany({
      where: { userId: user.id },
      include: { event: { select: { title: true, startsAt: true, city: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.payment.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        provider: true,
        type: true,
        status: true,
        amount: true,
        currency: true,
        method: true,
        description: true,
        isRecurring: true,
        paidAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const data = {
    exportedAt: new Date().toISOString(),
    note: "Persoonsgegevens van MazdaClub Nederland. Bedragen zijn in centen (EUR).",
    profile: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      street: user.street,
      houseNumber: user.houseNumber,
      postalCode: user.postalCode,
      city: user.city,
      country: user.country,
      licensePlate: user.licensePlate,
      carModel: user.carModel,
      role: user.role,
      marketingConsent: user.marketingConsent,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    },
    membership: user.membership
      ? {
          memberNumber: user.membership.memberNumber,
          status: user.membership.status,
          startedAt: user.membership.startedAt,
          currentPeriodStart: user.membership.currentPeriodStart,
          currentPeriodEnd: user.membership.currentPeriodEnd,
          autoRenew: user.membership.autoRenew,
          cancelledAt: user.membership.cancelledAt,
          createdAt: user.membership.createdAt,
        }
      : null,
    orders,
    eventRegistrations: registrations,
    payments,
  };

  const date = new Date().toISOString().slice(0, 10);
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="mazdaclub-mijn-gegevens-${date}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
