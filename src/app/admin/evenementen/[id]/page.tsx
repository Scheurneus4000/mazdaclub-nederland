import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Ban, CheckCircle2, Download, ExternalLink, FileSpreadsheet, MailCheck, Trash2 } from "lucide-react";
import { cancelRegistration, confirmRegistration, deleteEvent, resendRegistrationConfirmation } from "@/app/admin/actions/events";
import { ActionButton } from "@/components/admin/action-button";
import { EventForm } from "@/components/admin/event-form";
import { AdminPageHeader, AdminSection, TableEmpty } from "@/components/admin/page-title";
import { StatCard } from "@/components/admin/stat-card";
import { EventStatusBadge, PaymentStatusBadge, RegistrationStatusBadge } from "@/components/admin/status-badges";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/form-controls";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { formatDateTime, formatPrice } from "@/lib/utils";

export const metadata: Metadata = { title: "Evenement" };
export const dynamic = "force-dynamic";

export default async function AdminEventDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();
  const { id } = await params;
  const sp = await searchParams;

  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      registrations: {
        orderBy: { createdAt: "desc" },
        include: { payments: { orderBy: { createdAt: "desc" }, take: 1, select: { status: true, amount: true, method: true } } },
      },
    },
  });
  if (!event) notFound();

  const regs = event.registrations;
  const confirmed = regs.filter((r) => r.status === "CONFIRMED");
  const pending = regs.filter((r) => r.status === "PENDING");
  const members = confirmed.filter((r) => r.isMember).length;
  const revenue = await prisma.payment.aggregate({
    where: { type: "EVENT", status: "PAID", registration: { eventId: event.id } },
    _sum: { amount: true },
  });
  const exportBase = `/api/admin/export/registrations?eventId=${event.id}`;

  return (
    <>
      <AdminPageHeader
        title={event.title}
        badge={<EventStatusBadge status={event.status} />}
        description={`${formatDateTime(event.startsAt)} · ${event.locationName}, ${event.city}`}
        back={{ href: "/admin/evenementen", label: "Evenementbeheer" }}
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <a href={`${exportBase}&format=csv`}>
                <Download /> CSV
              </a>
            </Button>
            <Button asChild variant="outline" size="sm">
              <a href={`${exportBase}&format=xlsx`}>
                <FileSpreadsheet /> Excel
              </a>
            </Button>
            {event.status === "PUBLISHED" && (
              <Button asChild variant="dark" size="sm">
                <Link href={`/evenementen/${event.slug}`} target="_blank">
                  <ExternalLink /> Bekijk op site
                </Link>
              </Button>
            )}
          </>
        }
      />

      {sp.aangemaakt && (
        <Alert variant="success" className="mb-6">
          {event.status === "PUBLISHED" ? (
            <>Het evenement is aangemaakt en staat nu op de website. Inschrijven is geopend.</>
          ) : (
            <>
              Het evenement is aangemaakt als concept. Zet de status op <strong>Gepubliceerd</strong> om het op de website te tonen en inschrijvingen te
              openen.
            </>
          )}
        </Alert>
      )}

      <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Bevestigde deelnemers" value={`${confirmed.length} / ${event.capacity}`} hint={`${Math.max(0, event.capacity - confirmed.length)} plaatsen vrij`} accent />
        <StatCard label="Wacht op betaling" value={pending.length} hint="Plek 30 minuten gereserveerd" />
        <StatCard label="Leden / niet-leden" value={`${members} / ${confirmed.length - members}`} hint="Van de bevestigde deelnemers" />
        <StatCard label="Omzet" value={formatPrice(revenue._sum.amount ?? 0)} hint="Betaalde inschrijvingen" />
      </div>

      <Tabs defaultValue="deelnemers">
        <TabsList>
          <TabsTrigger value="deelnemers">Deelnemers ({regs.length})</TabsTrigger>
          <TabsTrigger value="gegevens">Gegevens bewerken</TabsTrigger>
        </TabsList>

        <TabsContent value="deelnemers">
          <div className="overflow-hidden rounded-xl border border-border bg-white shadow-xs">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Deelnemer</TableHead>
                  <TableHead>Telefoon</TableHead>
                  <TableHead>Kenteken</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Bedrag</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Betaling</TableHead>
                  <TableHead>Aangemeld</TableHead>
                  <TableHead className="text-right">Acties</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {regs.length === 0 && <TableEmpty colSpan={9}>Nog geen inschrijvingen.</TableEmpty>}
                {regs.map((r) => {
                  const payment = r.payments[0];
                  return (
                    <TableRow key={r.id} className={r.status === "CANCELLED" ? "opacity-60" : undefined}>
                      <TableCell className="min-w-52">
                        <p className="font-semibold">
                          {r.firstName} {r.lastName}
                        </p>
                        <a href={`mailto:${r.email}`} className="text-xs text-muted-foreground hover:text-primary">
                          {r.email}
                        </a>
                        {r.remarks && <p className="mt-1 max-w-xs text-xs italic text-muted-foreground">“{r.remarks}”</p>}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm">{r.phone}</TableCell>
                      <TableCell>
                        <span className="rounded border border-amber-300 bg-amber-50 px-1.5 py-0.5 font-mono text-xs font-semibold tracking-wider">{r.licensePlate}</span>
                      </TableCell>
                      <TableCell>{r.isMember ? <Badge variant="info">Lid</Badge> : <Badge variant="outline">Niet-lid</Badge>}</TableCell>
                      <TableCell className="tabular-nums">{r.amount === 0 ? "Gratis" : formatPrice(r.amount)}</TableCell>
                      <TableCell>
                        <RegistrationStatusBadge status={r.status} />
                      </TableCell>
                      <TableCell>{payment ? <PaymentStatusBadge status={payment.status} /> : <span className="text-xs text-muted-foreground">n.v.t.</span>}</TableCell>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{formatDateTime(r.createdAt)}</TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1.5">
                          {r.status === "CONFIRMED" && (
                            <ActionButton action={resendRegistrationConfirmation} fields={{ id: r.id }} variant="ghost" title="Bevestiging opnieuw sturen">
                              <MailCheck />
                            </ActionButton>
                          )}
                          {r.status !== "CONFIRMED" && (
                            <ActionButton
                              action={confirmRegistration}
                              fields={{ id: r.id }}
                              variant="ghost"
                              title="Handmatig bevestigen"
                              confirm={`Inschrijving van ${r.firstName} handmatig bevestigen (bijv. contant betaald)?`}
                            >
                              <CheckCircle2 />
                            </ActionButton>
                          )}
                          {r.status !== "CANCELLED" && (
                            <ActionButton
                              action={cancelRegistration}
                              fields={{ id: r.id }}
                              variant="ghost"
                              className="text-destructive hover:text-destructive"
                              title="Annuleren"
                              confirm={`Inschrijving van ${r.firstName} ${r.lastName} annuleren?`}
                            >
                              <Ban />
                            </ActionButton>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="gegevens" className="space-y-8">
          <EventForm key={event.updatedAt.toISOString()} event={event} />
          <AdminSection title="Evenement verwijderen" description="Alleen mogelijk zonder betaalde inschrijvingen. Annuleer anders het evenement.">
            <ActionButton
              action={deleteEvent}
              fields={{ id: event.id }}
              variant="destructive"
              size="default"
              confirm={`Weet je zeker dat je "${event.title}" en alle inschrijvingen definitief wilt verwijderen?`}
            >
              <Trash2 /> Evenement verwijderen
            </ActionButton>
          </AdminSection>
        </TabsContent>
      </Tabs>
    </>
  );
}
