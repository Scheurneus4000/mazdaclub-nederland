import type { Metadata } from "next";
import Link from "next/link";
import type { EventStatus, Prisma } from "@prisma/client";
import { Plus } from "lucide-react";
import { AdminPageHeader, TableEmpty } from "@/components/admin/page-title";
import { Pagination, parsePage, ADMIN_PAGE_SIZE } from "@/components/admin/pagination";
import { readParam, SearchForm } from "@/components/admin/search-form";
import { EventStatusBadge } from "@/components/admin/status-badges";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { cn, formatDateTime, formatPrice } from "@/lib/utils";

export const metadata: Metadata = { title: "Evenementbeheer" };
export const dynamic = "force-dynamic";

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function AdminEventsPage({ searchParams }: { searchParams: SP }) {
  await requireAdmin();
  const sp = await searchParams;
  const q = readParam(sp.q);
  const status = readParam(sp.status) || "alle";
  const periode = readParam(sp.periode) || "komend";
  const page = parsePage(sp.pagina);
  const now = new Date();

  const where: Prisma.EventWhereInput = {};
  if (q) where.OR = [{ title: { contains: q, mode: "insensitive" } }, { city: { contains: q, mode: "insensitive" } }, { locationName: { contains: q, mode: "insensitive" } }];
  if (["DRAFT", "PUBLISHED", "CANCELLED"].includes(status)) where.status = status as EventStatus;
  if (periode === "komend") where.startsAt = { gte: now };
  if (periode === "afgelopen") where.startsAt = { lt: now };

  const [total, events] = await Promise.all([
    prisma.event.count({ where }),
    prisma.event.findMany({
      where,
      orderBy: { startsAt: periode === "afgelopen" ? "desc" : "asc" },
      skip: (page - 1) * ADMIN_PAGE_SIZE,
      take: ADMIN_PAGE_SIZE,
    }),
  ]);

  const ids = events.map((e) => e.id);
  const [counts, payments] = await Promise.all([
    prisma.eventRegistration.groupBy({ by: ["eventId", "status"], where: { eventId: { in: ids } }, _count: { _all: true } }),
    prisma.payment.findMany({
      where: { type: "EVENT", status: "PAID", registration: { eventId: { in: ids } } },
      select: { amount: true, registration: { select: { eventId: true } } },
    }),
  ]);
  const confirmed: Record<string, number> = {};
  const pending: Record<string, number> = {};
  for (const c of counts) {
    if (c.status === "CONFIRMED") confirmed[c.eventId] = c._count._all;
    if (c.status === "PENDING") pending[c.eventId] = c._count._all;
  }
  const revenue: Record<string, number> = {};
  for (const p of payments) {
    const eventId = p.registration?.eventId;
    if (eventId) revenue[eventId] = (revenue[eventId] ?? 0) + p.amount;
  }

  return (
    <>
      <AdminPageHeader
        title="Evenementbeheer"
        description="Ritten en evenementen aanmaken, wijzigen en deelnemers beheren."
        actions={
          <Button asChild>
            <Link href="/admin/evenementen/nieuw">
              <Plus /> Nieuw evenement
            </Link>
          </Button>
        }
      />

      <div className="overflow-hidden rounded-xl border border-border bg-white shadow-xs">
        <SearchForm
          action="/admin/evenementen"
          q={q}
          placeholder="Zoek op titel, plaats of locatie"
          filters={[
            {
              name: "periode",
              label: "Periode",
              value: periode,
              options: [
                { value: "komend", label: "Komende evenementen" },
                { value: "afgelopen", label: "Afgelopen evenementen" },
                { value: "alle", label: "Alle evenementen" },
              ],
            },
            {
              name: "status",
              label: "Status",
              value: status,
              options: [
                { value: "alle", label: "Alle statussen" },
                { value: "PUBLISHED", label: "Gepubliceerd" },
                { value: "DRAFT", label: "Concept" },
                { value: "CANCELLED", label: "Geannuleerd" },
              ],
            },
          ]}
        />
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Evenement</TableHead>
              <TableHead>Datum</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Inschrijvingen</TableHead>
              <TableHead className="text-right">Omzet</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {events.length === 0 && <TableEmpty colSpan={5}>Geen evenementen gevonden.</TableEmpty>}
            {events.map((e) => {
              const taken = confirmed[e.id] ?? 0;
              const pct = Math.min(100, Math.round((taken / Math.max(1, e.capacity)) * 100));
              return (
                <TableRow key={e.id}>
                  <TableCell className="min-w-64">
                    <Link href={`/admin/evenementen/${e.id}`} className="font-semibold hover:text-primary">
                      {e.title}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {e.locationName}, {e.city}
                    </p>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm">{formatDateTime(e.startsAt)}</TableCell>
                  <TableCell>
                    <EventStatusBadge status={e.status} />
                  </TableCell>
                  <TableCell className="min-w-44">
                    <div className="flex items-center justify-between text-xs tabular-nums">
                      <span className="font-semibold">
                        {taken} / {e.capacity}
                      </span>
                      {(pending[e.id] ?? 0) > 0 && <span className="text-amber-600">+{pending[e.id]} open</span>}
                    </div>
                    <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div className={cn("h-full rounded-full", pct >= 100 ? "bg-ink" : "bg-primary")} style={{ width: `${pct}%` }} />
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">{formatPrice(revenue[e.id] ?? 0)}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        <Pagination page={page} total={total} basePath="/admin/evenementen" params={{ q, status, periode }} />
      </div>
    </>
  );
}
