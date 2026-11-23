import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { syncPayment } from "@/lib/payments";
import { clientIp, rateLimit } from "@/lib/rate-limit";

/**
 * Status van een betaling (voor de resultaatpagina, die hier periodiek naar vraagt).
 * Synchroniseert met de provider, zodat het ook werkt zonder bereikbare webhook (lokaal).
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!rateLimit(`payment-status:${clientIp(req.headers)}`, 60, 60_000).ok) {
    return NextResponse.json({ error: "Te veel verzoeken" }, { status: 429 });
  }
  const status = await syncPayment(id);
  if (!status) return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });
  const payment = await prisma.payment.findUnique({
    where: { id },
    select: { status: true, type: true, amount: true, order: { select: { orderNumber: true } } },
  });
  return NextResponse.json(payment, { headers: { "Cache-Control": "no-store" } });
}
