import { buildEventIcs } from "@/lib/calendar";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/events/[slug]/agenda
 * Agenda-bestand (.ics) van een gepubliceerd evenement, voor Apple Agenda, Outlook en andere agenda-apps.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await prisma.event.findUnique({
    where: { slug },
    select: { id: true, slug: true, title: true, summary: true, startsAt: true, endsAt: true, locationName: true, address: true, city: true, status: true },
  });
  if (!event || event.status !== "PUBLISHED") {
    return new Response("Evenement niet gevonden", { status: 404, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }

  const filename = `${event.slug.replace(/[^a-z0-9-]/gi, "") || "evenement"}.ics`;
  return new Response(buildEventIcs(event), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "public, max-age=300",
    },
  });
}
