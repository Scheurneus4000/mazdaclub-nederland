import type { Metadata } from "next";
import Link from "next/link";
import type { PaymentStatus, PaymentType } from "@prisma/client";
import { ArrowRight, CalendarDays, CalendarPlus, Euro, ImagePlus, PackagePlus, Repeat, ShoppingBag, UserPlus, Users } from "lucide-react";
import { amsterdamMonthKey } from "@/components/admin/datetime";
import { NotificationIcon } from "@/components/admin/notification-icon";
import { AdminPageHeader, AdminSection, TableEmpty } from "@/components/admin/page-title";
import { RevenueChart, type RevenueMonth } from "@/components/admin/revenue-chart";
import { StatCard } from "@/components/admin/stat-card";
import { MembershipStatusBadge, OrderStatusBadge, RegistrationStatusBadge } from "@/components/admin/status-badges";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { prisma } from "@/lib/db";
import { membershipView } from "@/lib/membership";
import { paymentStatusLabels } from "@/lib/payments";
import { requireAdmin } from "@/lib/session";
import { formatDate, formatDateTime, formatPrice } from "@/lib/utils";

export const metadata: Metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

const DAY = 86_400_000;

export default async function AdminDashboardPage() {
  const admin = await requireAdmin();
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const since30 = new Date(now.getTime() - 30 * DAY);
  const chartStart = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const [
    activeMembers,
    activeSubscriptions,
    revenueAll,
    revenueYear,
    upcomingEvents,
    newUsers,
    newRegistrations,
    newMembers,
    chartPayments,
    paymentBreakdown,
    latestRegistrations,
    latestOrders,
    latestMemberships,
    nextEvents,
    latestNotifications,
    unreadNotifications,
  ] = await Promise.all([
    prisma.membership.count({ where: { status: "ACTIVE", currentPeriodEnd: { gt: now } } }),
    prisma.membership.count({
      where: { status: "ACTIVE", currentPeriodEnd: { gt: now }, OR: [{ mollieSubscriptionId: { not: null } }, { autoRenew: true }] },
    }),
    prisma.payment.groupBy({ by: ["type"], where: { status: "PAID" }, _sum: { amount: true } }),
    prisma.payment.groupBy({ by: ["type"], where: { status: "PAID", paidAt: { gte: startOfYear } }, _sum: { amount: true } }),
    prisma.event.count({ where: { status: "PUBLISHED", startsAt: { gte: now } } }),
    prisma.user.count({ where: { createdAt: { gte: since30 } } }),
    prisma.eventRegistration.count({ where: { createdAt: { gte: since30 }, status: { not: "CANCELLED" } } }),
    prisma.membership.count({ where: { startedAt: { gte: since30 } } }),
    prisma.payment.findMany({
      where: { status: "PAID", paidAt: { gte: chartStart } },
      select: { amount: true, type: true, paidAt: true },
    }),
    prisma.payment.groupBy({ by: ["status"], where: { createdAt: { gte: since30 } }, _count: { _all: true }, _sum: { amount: true } }),
    prisma.eventRegistration.findMany({
      where: { status: { not: "CANCELLED" } },
      orderBy: { createdAt: "desc" },
      take: 6,
      include: { event: { select: { id: true, title: true } } },
    }),
    prisma.order.findMany({ orderBy: { createdAt: "desc" }, take: 6 }),
    prisma.membership.findMany({
      where: { status: { in: ["ACTIVE", "PENDING"] } },
      orderBy: { updatedAt: "desc" },
      take: 6,
      include: { user: { select: { id: true, firstName: true, lastName: true, city: true } } },
    }),
    prisma.event.findMany({
      where: { status: "PUBLISHED", startsAt: { gte: now } },
      orderBy: { startsAt: "asc" },
      take: 4,
      include: { _count: { select: { registrations: { where: { status: "CONFIRMED" } } } } },
    }),
    prisma.adminNotification.findMany({ orderBy: { createdAt: "desc" }, take: 5 }),
    prisma.adminNotification.count({ where: { readAt: null } }),
  ]);

  const sumFor = (rows: Array<{ type: PaymentType; _sum: { amount: number | null } }>, type: PaymentType) =>
    rows.find((r) => r.type === type)?._sum.amount ?? 0;

  // Omzet per maand (Nederlandse tijd)
  const monthFmt = new Intl.DateTimeFormat("nl-NL", { month: "short", timeZone: "Europe/Amsterdam" });
  const months: RevenueMonth[] = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 15);
    return { key: amsterdamMonthKey(d), label: monthFmt.format(d).replace(".", ""), membership: 0, webshop: 0, events: 0 };
  });
  for (const p of chartPayments) {
    if (!p.paidAt) continue;
    const month = months.find((m) => m.key === amsterdamMonthKey(p.paidAt!));
    if (!month) continue;
    if (p.type === "MEMBERSHIP") month.membership += p.amount;
    if (p.type === "ORDER") month.webshop += p.amount;
    if (p.type === "EVENT") month.events += p.amount;
  }
  const chartTotal = months.reduce((s, m) => s + m.membership + m.webshop + m.events, 0);

  const breakdownMax = Math.max(1, ...paymentBreakdown.map((b) => b._count._all));
  const statusOrder: PaymentStatus[] = ["PAID", "OPEN", "PENDING", "FAILED", "CANCELED", "EXPIRED", "REFUNDED"];

  return (
    <>
      <AdminPageHeader
        title={`Goedendag, ${admin.firstName}`}
        description={`Overzicht van MazdaClub Nederland · ${formatDate(now, { weekday: "long" })}`}
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/fotoalbums">
                <ImagePlus /> Foto's uploaden
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/producten/nieuw">
                <PackagePlus /> Nieuw product
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/admin/evenementen/nieuw">
                <CalendarPlus /> Nieuw evenement
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <StatCard label="Aantal leden" value={activeMembers.toLocaleString("nl-NL")} hint={`+${newMembers} nieuw in 30 dagen`} icon={<Users />} href="/admin/leden?status=actief" accent />
        <StatCard
          label="Actieve abonnementen"
          value={activeSubscriptions.toLocaleString("nl-NL")}
          hint={activeMembers > 0 ? `${Math.round((activeSubscriptions / activeMembers) * 100)}% verlengt automatisch` : "Automatische verlenging"}
          icon={<Repeat />}
          href="/admin/leden?status=actief"
        />
        <StatCard
          label="Omzet webshop"
          value={formatPrice(sumFor(revenueYear, "ORDER"))}
          hint={`Dit jaar · ${formatPrice(sumFor(revenueAll, "ORDER"))} totaal`}
          icon={<ShoppingBag />}
          href="/admin/bestellingen"
        />
        <StatCard
          label="Omzet evenementen"
          value={formatPrice(sumFor(revenueYear, "EVENT"))}
          hint={`Dit jaar · ${formatPrice(sumFor(revenueAll, "EVENT"))} totaal`}
          icon={<Euro />}
          href="/admin/betalingen?type=EVENT"
        />
        <StatCard label="Komende evenementen" value={upcomingEvents} hint="Gepubliceerd" icon={<CalendarDays />} href="/admin/evenementen" />
        <StatCard label="Nieuwe registraties" value={newUsers + newRegistrations} hint={`${newUsers} accounts · ${newRegistrations} inschrijvingen (30 dagen)`} icon={<UserPlus />} href="/admin/leden" />
      </div>

      <AdminSection
        className="mt-6"
        title="Laatste meldingen"
        description={unreadNotifications > 0 ? `${unreadNotifications} ongelezen` : "Alles gelezen"}
        bodyClassName="p-0"
        actions={
          <Link href="/admin/meldingen" className="text-sm font-medium text-primary hover:underline">
            Alle meldingen
          </Link>
        }
      >
        {latestNotifications.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-muted-foreground">
            Nog geen meldingen. Hier verschijnen nieuwe accounts, leden, aanmeldingen voor ritten en bestellingen.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {latestNotifications.map((n) => (
              <li key={n.id} className="flex items-center gap-3 px-5 py-3">
                <NotificationIcon type={n.type} className="size-8" />
                <div className="min-w-0 flex-1">
                  <p className={n.readAt ? "truncate text-sm" : "truncate text-sm font-semibold"}>{n.title}</p>
                  <p className="text-xs text-muted-foreground">{formatDateTime(n.createdAt)}</p>
                </div>
                {!n.readAt && <span className="size-2 shrink-0 rounded-full bg-primary" aria-label="Ongelezen" />}
              </li>
            ))}
          </ul>
        )}
      </AdminSection>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <AdminSection
          title="Omzet per maand"
          description={`Laatste 6 maanden · ${formatPrice(chartTotal)} in totaal · lidmaatschap ${formatPrice(sumFor(revenueYear, "MEMBERSHIP"))} dit jaar`}
        >
          <RevenueChart months={months} />
        </AdminSection>

        <AdminSection title="Betaalstatussen" description="Laatste 30 dagen" actions={<Link href="/admin/betalingen" className="text-sm font-medium text-primary hover:underline">Alle betalingen</Link>}>
          {paymentBreakdown.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Nog geen betalingen in deze periode.</p>
          ) : (
            <ul className="space-y-3.5">
              {statusOrder
                .map((s) => ({ status: s, row: paymentBreakdown.find((b) => b.status === s) }))
                .filter((x) => x.row)
                .map(({ status, row }) => (
                  <li key={status}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-medium">{paymentStatusLabels[status]}</span>
                      <span className="text-muted-foreground tabular-nums">
                        {row!._count._all} · {formatPrice(row!._sum.amount ?? 0)}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className={status === "PAID" ? "h-full rounded-full bg-emerald-600" : status === "OPEN" || status === "PENDING" ? "h-full rounded-full bg-amber-500" : "h-full rounded-full bg-zinc-400"}
                        style={{ width: `${(row!._count._all / breakdownMax) * 100}%` }}
                      />
                    </div>
                  </li>
                ))}
            </ul>
          )}
        </AdminSection>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <AdminSection title="Nieuwste evenementdeelnemers" bodyClassName="p-0" actions={<Link href="/admin/evenementen" className="text-sm font-medium text-primary hover:underline">Evenementen</Link>}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Deelnemer</TableHead>
                <TableHead>Evenement</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {latestRegistrations.length === 0 && <TableEmpty colSpan={3}>Nog geen inschrijvingen.</TableEmpty>}
              {latestRegistrations.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <p className="font-medium">
                      {r.firstName} {r.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {r.isMember ? "Lid" : "Niet-lid"} · {formatDateTime(r.createdAt)}
                    </p>
                  </TableCell>
                  <TableCell>
                    <Link href={`/admin/evenementen/${r.event.id}`} className="text-sm hover:text-primary">
                      {r.event.title}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <RegistrationStatusBadge status={r.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </AdminSection>

        <AdminSection title="Nieuwste bestellingen" bodyClassName="p-0" actions={<Link href="/admin/bestellingen" className="text-sm font-medium text-primary hover:underline">Alle bestellingen</Link>}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bestelling</TableHead>
                <TableHead className="text-right">Totaal</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {latestOrders.length === 0 && <TableEmpty colSpan={3}>Nog geen bestellingen.</TableEmpty>}
              {latestOrders.map((o) => (
                <TableRow key={o.id}>
                  <TableCell>
                    <Link href={`/admin/bestellingen/${o.id}`} className="font-mono text-sm font-semibold hover:text-primary">
                      {o.orderNumber}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {o.firstName} {o.lastName} · {formatDateTime(o.createdAt)}
                    </p>
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">{formatPrice(o.total)}</TableCell>
                  <TableCell>
                    <OrderStatusBadge status={o.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </AdminSection>

        <AdminSection title="Lidmaatschappen" description="Recent gestart, verlengd of in afwachting" bodyClassName="p-0" actions={<Link href="/admin/leden" className="text-sm font-medium text-primary hover:underline">Ledenbeheer</Link>}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lid</TableHead>
                <TableHead>Geldig tot</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {latestMemberships.length === 0 && <TableEmpty colSpan={3}>Nog geen lidmaatschappen.</TableEmpty>}
              {latestMemberships.map((m) => {
                const view = membershipView(m);
                return (
                  <TableRow key={m.id}>
                    <TableCell>
                      <Link href={`/admin/leden/${m.user.id}`} className="font-medium hover:text-primary">
                        {m.user.firstName} {m.user.lastName}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {m.user.city ?? "–"}
                        {m.autoRenew ? " · automatisch verlengen" : ""}
                      </p>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm">{m.currentPeriodEnd ? formatDate(m.currentPeriodEnd) : "–"}</TableCell>
                    <TableCell>
                      <MembershipStatusBadge status={view.status} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </AdminSection>

        <AdminSection title="Komende evenementen" bodyClassName="p-0" actions={<Link href="/admin/evenementen/nieuw" className="text-sm font-medium text-primary hover:underline">Nieuw evenement</Link>}>
          {nextEvents.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-muted-foreground">Geen gepubliceerde evenementen gepland.</p>
          ) : (
            <ul className="divide-y divide-border">
              {nextEvents.map((e) => {
                const taken = e._count.registrations;
                const pct = Math.min(100, Math.round((taken / Math.max(1, e.capacity)) * 100));
                return (
                  <li key={e.id}>
                    <Link href={`/admin/evenementen/${e.id}`} className="group flex items-center gap-4 px-5 py-3.5 hover:bg-muted/40">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium group-hover:text-primary">{e.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDateTime(e.startsAt)} · {e.city}
                        </p>
                        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                          <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                      <span className="shrink-0 text-sm font-semibold tabular-nums">
                        {taken}/{e.capacity}
                      </span>
                      <ArrowRight className="size-4 shrink-0 text-muted-foreground group-hover:text-primary" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </AdminSection>
      </div>

      <p className="mt-8 text-xs text-muted-foreground">
        Openstaande betalingen worden na 2 uur automatisch afgesloten door de onderhoudstaak (/api/cron/maintenance); gereserveerde voorraad en plaatsen komen dan weer vrij.
      </p>
    </>
  );
}
