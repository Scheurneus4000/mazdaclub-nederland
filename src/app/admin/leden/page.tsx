import type { Metadata } from "next";
import Link from "next/link";
import { Download, FileSpreadsheet, UserPlus } from "lucide-react";
import { memberFilterOptions, memberWhere } from "@/components/admin/member-filters";
import { AdminPageHeader, TableEmpty } from "@/components/admin/page-title";
import { ADMIN_PAGE_SIZE, Pagination, parsePage } from "@/components/admin/pagination";
import { readParam, SearchForm } from "@/components/admin/search-form";
import { StatCard } from "@/components/admin/stat-card";
import { EmailStatusBadge, MembershipStatusBadge, RoleBadge } from "@/components/admin/status-badges";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/form-controls";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { prisma } from "@/lib/db";
import { membershipView } from "@/lib/membership";
import { isOwnerEmail } from "@/lib/owner";
import { requireAdmin } from "@/lib/session";
import { formatDate, formatMemberNumber } from "@/lib/utils";

export const metadata: Metadata = { title: "Gebruikers & leden" };
export const dynamic = "force-dynamic";

export default async function AdminMembersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdmin();
  const sp = await searchParams;
  const q = readParam(sp.q);
  const status = memberFilterOptions.some((o) => o.value === readParam(sp.status)) ? readParam(sp.status) : "alle";
  const page = parsePage(sp.pagina);
  const now = new Date();
  const where = memberWhere(status, q, now);
  const in30 = new Date(now.getTime() + 30 * 86_400_000);

  const [total, users, activeCount, pendingCount, expiringCount, accountCount, unverifiedCount] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      skip: (page - 1) * ADMIN_PAGE_SIZE,
      take: ADMIN_PAGE_SIZE,
      include: { membership: true },
    }),
    prisma.membership.count({ where: { status: "ACTIVE", currentPeriodEnd: { gt: now } } }),
    prisma.membership.count({ where: { status: "PENDING" } }),
    prisma.membership.count({ where: { status: "ACTIVE", currentPeriodEnd: { gt: now, lte: in30 }, mollieSubscriptionId: null } }),
    prisma.user.count(),
    prisma.user.count({ where: { emailVerifiedAt: null } }),
  ]);

  const exportQs = new URLSearchParams({ ...(status !== "alle" ? { status } : {}), ...(q ? { q } : {}) }).toString();

  return (
    <>
      <AdminPageHeader
        title="Gebruikers & leden"
        description="Alle accounts: gratis accounts en betaalde leden. Open een gebruiker om gegevens aan te passen, iemand betaald lid te maken of een betaallink te sturen."
        actions={
          <>
            <Button asChild size="sm">
              <Link href="/admin/leden/nieuw">
                <UserPlus /> Lid toevoegen
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <a href={`/api/admin/export/members?format=csv${exportQs ? `&${exportQs}` : ""}`}>
                <Download /> CSV
              </a>
            </Button>
            <Button asChild variant="outline" size="sm">
              <a href={`/api/admin/export/members?format=xlsx${exportQs ? `&${exportQs}` : ""}`}>
                <FileSpreadsheet /> Excel
              </a>
            </Button>
          </>
        }
      />

      {sp.verwijderd && (
        <Alert variant="success" className="mb-6">
          Het account is verwijderd. Bestellingen en betalingen zijn bewaard voor de administratie, maar niet meer aan dit lid gekoppeld.
        </Alert>
      )}

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Betaalde leden" value={activeCount.toLocaleString("nl-NL")} href="/admin/leden?status=actief" accent />
        <StatCard label="In afwachting" value={pendingCount} hint="Eerste betaling nog niet voldaan" href="/admin/leden?status=in-afwachting" />
        <StatCard label="Verloopt binnen 30 dagen" value={expiringCount} hint="Zonder automatische verlenging" />
        <StatCard
          label="Gratis accounts"
          value={(accountCount - activeCount).toLocaleString("nl-NL")}
          hint={`${accountCount.toLocaleString("nl-NL")} accounts totaal · ${unverifiedCount} onbevestigd`}
          href="/admin/leden?status=gratis"
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-white shadow-xs">
        <SearchForm
          action="/admin/leden"
          q={q}
          placeholder="Zoek op naam, e-mail, kenteken, plaats of lidnummer"
          filters={[{ name: "status", label: "Status", value: status, options: memberFilterOptions }]}
        />
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Naam</TableHead>
              <TableHead>E-mail</TableHead>
              <TableHead>Lidnummer</TableHead>
              <TableHead>Lidmaatschap</TableHead>
              <TableHead>Geldig tot</TableHead>
              <TableHead>Woonplaats</TableHead>
              <TableHead>Kenteken</TableHead>
              <TableHead>Account sinds</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 && (
              <TableEmpty colSpan={8}>
                {q || status !== "alle" ? (
                  "Geen gebruikers gevonden met deze zoekopdracht."
                ) : (
                  <>
                    Nog geen leden. Leden die zich via de website aanmelden verschijnen hier automatisch, of{" "}
                    <Link href="/admin/leden/nieuw" className="font-medium text-primary hover:underline">
                      voeg zelf een lid toe
                    </Link>
                    .
                  </>
                )}
              </TableEmpty>
            )}
            {users.map((u) => {
              const view = membershipView(u.membership);
              return (
                <TableRow key={u.id}>
                  <TableCell className="min-w-56">
                    <div className="flex items-center gap-2">
                      <Link href={`/admin/leden/${u.id}`} className="font-semibold hover:text-primary">
                        {u.firstName} {u.lastName}
                      </Link>
                      <RoleBadge role={u.role} owner={isOwnerEmail(u.email)} />
                    </div>
                    <p className="text-xs text-muted-foreground">{u.email}</p>
                  </TableCell>
                  <TableCell>
                    <EmailStatusBadge verifiedAt={u.emailVerifiedAt} />
                  </TableCell>
                  <TableCell className="font-mono text-xs">{u.membership ? formatMemberNumber(u.membership.memberNumber) : "–"}</TableCell>
                  <TableCell>
                    <div className="flex flex-col items-start gap-1">
                      <MembershipStatusBadge status={view.status} />
                      {view.active && view.autoRenew && <span className="text-[11px] text-muted-foreground">Automatisch verlengen</span>}
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm">
                    {view.currentPeriodEnd ? formatDate(view.currentPeriodEnd) : "–"}
                    {view.active && view.daysLeft !== null && view.daysLeft <= 30 && <p className="text-xs text-amber-600">nog {view.daysLeft} dagen</p>}
                  </TableCell>
                  <TableCell className="text-sm">{u.city ?? "–"}</TableCell>
                  <TableCell>{u.licensePlate ? <span className="font-mono text-xs font-semibold">{u.licensePlate}</span> : "–"}</TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{formatDate(u.createdAt)}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        <Pagination page={page} total={total} basePath="/admin/leden" params={{ q, status: status !== "alle" ? status : undefined }} />
      </div>
    </>
  );
}
