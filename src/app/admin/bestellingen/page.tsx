import type { Metadata } from "next";
import Link from "next/link";
import type { OrderStatus, Prisma } from "@prisma/client";
import { Download, FileSpreadsheet } from "lucide-react";
import { AdminPageHeader, TableEmpty } from "@/components/admin/page-title";
import { ADMIN_PAGE_SIZE, Pagination, parsePage } from "@/components/admin/pagination";
import { readParam, SearchForm } from "@/components/admin/search-form";
import { OrderStatusBadge } from "@/components/admin/status-badges";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { prisma } from "@/lib/db";
import { orderStatusLabels } from "@/lib/orders";
import { getPricing } from "@/lib/settings";
import { requireAdmin } from "@/lib/session";
import { formatDateTime, formatPrice } from "@/lib/utils";

export const metadata: Metadata = { title: "Bestellingen" };
export const dynamic = "force-dynamic";

const STATUSES = Object.keys(orderStatusLabels) as OrderStatus[];

export default async function AdminOrdersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdmin();
  const { shipping: shippingOptions } = await getPricing();
  const sp = await searchParams;
  const q = readParam(sp.q);
  const status = readParam(sp.status) || "alle";
  const page = parsePage(sp.pagina);

  const where: Prisma.OrderWhereInput = {};
  if (status === "te-verzenden") where.status = { in: ["PAID", "PROCESSING"] };
  else if (STATUSES.includes(status as OrderStatus)) where.status = status as OrderStatus;
  if (q) {
    where.OR = [
      { orderNumber: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
      { lastName: { contains: q, mode: "insensitive" } },
      { firstName: { contains: q, mode: "insensitive" } },
    ];
  }

  const [total, orders, statusCounts] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * ADMIN_PAGE_SIZE,
      take: ADMIN_PAGE_SIZE,
      include: { _count: { select: { items: true } } },
    }),
    prisma.order.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);
  const countFor = (s: OrderStatus) => statusCounts.find((c) => c.status === s)?._count._all ?? 0;
  const toShip = countFor("PAID") + countFor("PROCESSING");

  return (
    <>
      <AdminPageHeader
        title="Bestellingen"
        description={toShip > 0 ? `${toShip} bestelling${toShip === 1 ? "" : "en"} wacht${toShip === 1 ? "" : "en"} op verzending.` : "Alle webshopbestellingen."}
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <a href={`/api/admin/export/orders?format=csv${status !== "alle" ? `&status=${status}` : ""}`}>
                <Download /> CSV
              </a>
            </Button>
            <Button asChild variant="outline" size="sm">
              <a href={`/api/admin/export/orders?format=xlsx${status !== "alle" ? `&status=${status}` : ""}`}>
                <FileSpreadsheet /> Excel
              </a>
            </Button>
          </>
        }
      />

      <div className="mb-4 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
        {[
          { value: "alle", label: "Alle" },
          { value: "te-verzenden", label: `Te verzenden (${toShip})` },
          ...STATUSES.map((s) => ({ value: s, label: `${orderStatusLabels[s]} (${countFor(s)})` })),
        ].map((f) => (
          <Link
            key={f.value}
            href={f.value === "alle" ? "/admin/bestellingen" : `/admin/bestellingen?status=${f.value}`}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
              status === f.value ? "border-ink bg-ink text-white" : "border-border bg-white hover:bg-muted"
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-white shadow-xs">
        <SearchForm action="/admin/bestellingen" q={q} placeholder="Zoek op ordernummer, naam of e-mail" hidden={{ status: status !== "alle" ? status : undefined }} />
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Bestelling</TableHead>
              <TableHead>Klant</TableHead>
              <TableHead>Verzending</TableHead>
              <TableHead className="text-right">Totaal</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.length === 0 && <TableEmpty colSpan={5}>Geen bestellingen gevonden.</TableEmpty>}
            {orders.map((o) => (
              <TableRow key={o.id}>
                <TableCell className="min-w-48">
                  <Link href={`/admin/bestellingen/${o.id}`} className="font-mono text-sm font-semibold hover:text-primary">
                    {o.orderNumber}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {formatDateTime(o.createdAt)} · {o._count.items} artikel{o._count.items === 1 ? "" : "en"}
                  </p>
                </TableCell>
                <TableCell className="min-w-48">
                  <p className="font-medium">
                    {o.firstName} {o.lastName}
                  </p>
                  <p className="text-xs text-muted-foreground">{o.email}</p>
                </TableCell>
                <TableCell className="text-sm">{shippingOptions[o.shippingMethod].label}</TableCell>
                <TableCell className="text-right tabular-nums">
                  <span className="font-semibold">{formatPrice(o.total)}</span>
                  {o.memberDiscountApplied && (
                    <div>
                      <Badge variant="info" className="mt-1">
                        Ledenkorting
                      </Badge>
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <OrderStatusBadge status={o.status} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <Pagination page={page} total={total} basePath="/admin/bestellingen" params={{ q, status: status !== "alle" ? status : undefined }} />
      </div>
    </>
  );
}
