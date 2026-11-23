import { ok } from "@/lib/api";
import { getAvailabilityMap, getUpcomingEvents } from "@/lib/events";
import { siteUrl } from "@/lib/utils";

export const dynamic = "force-dynamic";

/** GET /api/events – publieke lijst van komende, gepubliceerde evenementen. */
export async function GET() {
  const events = await getUpcomingEvents();
  const availability = await getAvailabilityMap(events);
  return ok(
    {
      events: events.map((e) => ({
        slug: e.slug,
        title: e.title,
        summary: e.summary,
        startsAt: e.startsAt.toISOString(),
        endsAt: e.endsAt?.toISOString() ?? null,
        registrationDeadline: e.registrationDeadline?.toISOString() ?? null,
        locationName: e.locationName,
        address: e.address,
        city: e.city,
        capacity: e.capacity,
        availableSeats: availability[e.id] ?? 0,
        priceNonMember: e.priceNonMember,
        priceMember: e.priceMember,
        imageUrl: e.imageUrl,
        url: siteUrl(`/evenementen/${e.slug}`),
      })),
    },
    { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } },
  );
}
