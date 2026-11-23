import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { AddToCalendar } from "@/components/events/add-to-calendar";
import { Button } from "@/components/ui/button";
import { calendarLinks } from "@/lib/calendar";
import { prisma } from "@/lib/db";
import { syncPayment } from "@/lib/payments";
import { formatDateTime, formatMemberNumber, formatPrice } from "@/lib/utils";
import { PaymentStatusWatcher } from "./status-watcher";

export const metadata: Metadata = { title: "Betaling", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function PaymentResultPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const { id } = await searchParams;
  if (!id) notFound();

  await syncPayment(id);
  const payment = await prisma.payment.findUnique({
    where: { id },
    include: {
      order: { select: { orderNumber: true, email: true } },
      registration: {
        include: {
          event: { select: { id: true, title: true, slug: true, summary: true, startsAt: true, endsAt: true, locationName: true, address: true, city: true, status: true } },
        },
      },
      membership: { select: { memberNumber: true, currentPeriodEnd: true } },
    },
  });
  if (!payment) notFound();

  const paid = payment.status === "PAID";
  const waiting = payment.status === "OPEN" || payment.status === "PENDING";

  const what =
    payment.type === "ORDER"
      ? `Bestelling ${payment.order?.orderNumber ?? ""}`
      : payment.type === "EVENT"
        ? `Inschrijving ${payment.registration?.event.title ?? "evenement"}`
        : "Lidmaatschap MazdaClub Nederland";

  return (
    <section className="container-site flex min-h-[70vh] items-center justify-center py-16">
      <div className="w-full max-w-xl rounded-3xl border border-border bg-white p-8 text-center shadow-sm sm:p-12">
        <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-accent">
          {paid ? <CheckCircle2 className="size-9 text-emerald-600" /> : waiting ? <Clock className="size-9 text-amber-500" /> : <XCircle className="size-9 text-primary" />}
        </div>

        <h1 className="heading-md mt-6">
          {paid ? "Bedankt, je betaling is gelukt!" : waiting ? "We wachten op je betaling" : "De betaling is niet gelukt"}
        </h1>
        <p className="mt-3 text-muted-foreground">
          {paid
            ? "Je ontvangt binnen enkele minuten een bevestiging per e-mail."
            : waiting
              ? "Dit duurt meestal maar een paar seconden. Deze pagina ververst automatisch."
              : "Er is niets afgeschreven. Je kunt het opnieuw proberen."}
        </p>

        <dl className="mt-8 space-y-3 rounded-2xl bg-surface p-5 text-left text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Omschrijving</dt>
            <dd className="text-right font-medium">{what}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Bedrag</dt>
            <dd className="font-medium">{formatPrice(payment.amount)}</dd>
          </div>
          {paid && payment.type === "EVENT" && payment.registration && (
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Datum</dt>
              <dd className="text-right font-medium">{formatDateTime(payment.registration.event.startsAt)}</dd>
            </div>
          )}
          {paid && payment.type === "MEMBERSHIP" && payment.membership && (
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Lidnummer</dt>
              <dd className="font-medium">{formatMemberNumber(payment.membership.memberNumber)}</dd>
            </div>
          )}
        </dl>

        {paid && payment.type === "EVENT" && payment.registration?.status === "CONFIRMED" && payment.registration.event.status === "PUBLISHED" && (
          <AddToCalendar links={calendarLinks(payment.registration.event)} className="mt-6" />
        )}

        <PaymentStatusWatcher paymentId={payment.id} initialStatus={payment.status} type={payment.type} />

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          {paid && payment.type === "ORDER" && (
            <>
              <Button asChild>
                <Link href="/account?tab=bestellingen">Bekijk bestelling</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/webshop">Verder winkelen</Link>
              </Button>
            </>
          )}
          {paid && payment.type === "EVENT" && payment.registration && (
            <>
              <Button asChild>
                <Link href={`/evenementen/${payment.registration.event.slug}`}>Naar het evenement</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/lid-worden">Word lid en rijd gratis mee</Link>
              </Button>
            </>
          )}
          {paid && payment.type === "MEMBERSHIP" && (
            <Button asChild>
              <Link href="/account">Naar mijn account</Link>
            </Button>
          )}
          {!paid && !waiting && (
            <>
              <Button asChild>
                <Link
                  href={
                    payment.type === "ORDER"
                      ? "/winkelwagen"
                      : payment.type === "EVENT" && payment.registration
                        ? `/evenementen/${payment.registration.event.slug}`
                        : "/lid-worden"
                  }
                >
                  Opnieuw proberen
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/contact">Hulp nodig?</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
