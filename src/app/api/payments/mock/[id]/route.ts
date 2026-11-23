import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { applyPaymentState } from "@/lib/payments";
import { isMockAllowed } from "@/lib/payments/mock";

const bodySchema = z.object({ status: z.enum(["PAID", "FAILED", "CANCELED", "EXPIRED"]), method: z.string().max(30).optional() });

/** Alleen in ontwikkeling: simuleer de uitkomst van een testbetaling. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isMockAllowed()) return NextResponse.json({ error: "Niet beschikbaar" }, { status: 404 });
  const { id } = await params;
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Ongeldige status" }, { status: 422 });

  const payment = await prisma.payment.findUnique({ where: { id } });
  if (!payment || payment.provider !== "MOCK") return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });

  const status = await applyPaymentState(id, { status: parsed.data.status, method: parsed.data.method ?? "ideal", paidAt: new Date() });
  return NextResponse.json({ status });
}
