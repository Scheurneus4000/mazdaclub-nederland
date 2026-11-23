import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FlaskConical } from "lucide-react";
import { prisma } from "@/lib/db";
import { isMockAllowed } from "@/lib/payments/mock";
import { formatPrice } from "@/lib/utils";
import { MockCheckoutButtons } from "./mock-buttons";

export const metadata: Metadata = { title: "Testbetaling", robots: { index: false } };
export const dynamic = "force-dynamic";

/** Nagebootste betaalpagina voor lokale ontwikkeling (PAYMENT_PROVIDER=mock). */
export default async function MockCheckoutPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  if (!isMockAllowed()) notFound();
  const { id } = await searchParams;
  if (!id) notFound();
  const payment = await prisma.payment.findUnique({ where: { id } });
  if (!payment || payment.provider !== "MOCK") notFound();

  return (
    <section className="container-site flex min-h-[70vh] items-center justify-center py-16">
      <div className="w-full max-w-md rounded-3xl border-2 border-dashed border-amber-300 bg-amber-50/40 p-8 sm:p-10">
        <div className="flex items-center gap-3 text-amber-700">
          <FlaskConical className="size-6" />
          <p className="text-sm font-semibold uppercase tracking-wider">Testmodus – geen echte betaling</p>
        </div>
        <h1 className="mt-6 text-2xl font-bold">{payment.description}</h1>
        <p className="mt-2 text-4xl font-bold text-ink">{formatPrice(payment.amount)}</p>
        <p className="mt-4 text-sm text-muted-foreground">
          Dit scherm vervangt de Mollie-checkout tijdens ontwikkeling. Kies de uitkomst om de volledige flow (bevestigingsmail,
          voorraad, lidmaatschap) te testen. Zet <code className="rounded bg-white px-1">PAYMENT_PROVIDER=mollie</code> voor echte betalingen.
        </p>
        <MockCheckoutButtons paymentId={payment.id} disabled={payment.status !== "OPEN"} />
      </div>
    </section>
  );
}
