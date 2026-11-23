import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { PENDING_HOLD_MINUTES } from "@/lib/pricing";

/** Registraties die een plek bezetten: bevestigd, of openstaand en jonger dan de reserveringstijd. */
export function seatTakingWhere(eventId: string): Prisma.EventRegistrationWhereInput {
  const holdSince = new Date(Date.now() - PENDING_HOLD_MINUTES * 60_000);
  return {
    eventId,
    OR: [{ status: "CONFIRMED" }, { status: "PENDING", createdAt: { gte: holdSince } }],
  };
}

export async function getTakenSeats(eventId: string, tx: Prisma.TransactionClient = prisma): Promise<number> {
  return tx.eventRegistration.count({ where: seatTakingWhere(eventId) });
}

export async function getAvailableSeats(event: { id: string; capacity: number }, tx: Prisma.TransactionClient = prisma) {
  const taken = await getTakenSeats(event.id, tx);
  return Math.max(0, event.capacity - taken);
}

/** Beschikbare plaatsen voor meerdere evenementen in één query (voor overzichten). */
export async function getAvailabilityMap(events: Array<{ id: string; capacity: number }>): Promise<Record<string, number>> {
  if (events.length === 0) return {};
  const holdSince = new Date(Date.now() - PENDING_HOLD_MINUTES * 60_000);
  const grouped = await prisma.eventRegistration.groupBy({
    by: ["eventId"],
    where: {
      eventId: { in: events.map((e) => e.id) },
      OR: [{ status: "CONFIRMED" }, { status: "PENDING", createdAt: { gte: holdSince } }],
    },
    _count: { _all: true },
  });
  const taken = Object.fromEntries(grouped.map((g) => [g.eventId, g._count._all]));
  return Object.fromEntries(events.map((e) => [e.id, Math.max(0, e.capacity - (taken[e.id] ?? 0))]));
}

export function isRegistrationOpen(event: { status: string; startsAt: Date; registrationDeadline: Date | null }, now = new Date()) {
  if (event.status !== "PUBLISHED") return false;
  const deadline = event.registrationDeadline ?? event.startsAt;
  return deadline > now;
}

export async function getUpcomingEvents(limit?: number) {
  return prisma.event.findMany({
    where: { status: "PUBLISHED", startsAt: { gte: new Date() } },
    orderBy: { startsAt: "asc" },
    take: limit,
  });
}
