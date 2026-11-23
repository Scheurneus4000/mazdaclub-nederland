import type { Metadata } from "next";
import Link from "next/link";
import type { PaymentProvider, PaymentStatus, PaymentType, Prisma } from "@prisma/client";
import { Download, FileSpreadsheet, RefreshCw } from "lucide-react";
import { refreshPaymentStatus } from "@/app/admin/actions/payments";
import { ActionButton } from "@/components/admin/action-button";
import { AdminPageHeader, TableEmpty } from "@/components/admin/page-title";
import { ADMIN_PAGE_SIZE, Pagination, parsePage } from "@/components/admin/pagination";
import { readParam, SearchForm } from "@/components/admin/search-form";
import { RefundDialog } from "@/components/admin/payment-forms";
import { paymentMethodLabel, paymentProviderLabels, PaymentStatusBadge, paymentTypeLabels } from "@/components/admin/status-badges";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { prisma } from "@/lib/db";
import { paymentStatusLabels } from "@/lib/payments";
import { requireAdmin } from "@/lib/session";
import { formatDateTime, formatPrice } from "@/lib/utils";

export const metadata: Metadata = { title: "Betalingen" };
export const dynamic = "force-dynamic";

const TYPES = Object.keys(paymentTypeLabels) as PaymentType[];
const STATUSES = Object.keys(paymentStatusLabels) as PaymentStatus[];
const PROVIDERS: PaymentProvider[] = ["MOLLIE", "STRIPE", "MANUAL", "MOCK"];

export default async function AdminPaymentsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdmin();
  const sp = await searchParams;
  const q = readParam(sp.q);
  const type = readParam(sp.type) || "alle";
  const status = readParam(sp.status) || "alle";
  const provider = readParam(sp.provider) || "alle";
  const page = parsePage(sp.pagina);

  const where: Prisma.PaymentWhereInput = {};
  if (TYPES.includes(type as PaymentType)) where.type = type as PaymentType;
  if (STATUSES.includes(status as PaymentStatus)) where.status = status as PaymentStatus;
  if (PROVIDERS.includes(provider as PaymentProvider)) where.provider = provider as PaymentProvider;
  if (q) {
    where.OR = [
      { providerPaymentId: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
      { user: { email: { contains: q, mode: "insensitive" } } },
      { order: { orderNumber: { contains: q, mode: "insensitive" } } },
      { registration: { email: { contains: q, mode: "insensitive" } } },
    ];
  }

  const [total, payments, breakdown] = await Promise.all([
    prisma.payment.count({ where }),
    prisma.payment.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * ADMIN_PAGE_SIZE,
      take: ADMIN_PAGE_SIZE,
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
        order: { select: { id: true, orderNumber: true } },
        registration: { select: { firstName: true, lastName: true, event: { select: { id: true, title: true } } } },
      },
    }),
    prisma.payment.groupBy({ by: ["status"], where, _count: { _all: true }, _sum: { amount: true } }),
  ]);

  const params = {
    q,
    type: type !== "alle" ? type : undefined,
    status: status !== "alle" ? status : undefined,
    provider: provider !== "alle" ? provider : undefined,
  };
  const exportQs = new URLSearchParams(Object.entries(params).filter((e): e is [string, string] => !!e[1])).toString();

  return (
    <>
      <AdminPageHeader
        title="Betalingen"
        description="Alle betalingen: online via Mollie of Stripe, handmatig geregistreerde betalingen (contant/overboeking) en testbetalingen. Betaalde online betalingen kun je hier ook terugbetalen."
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <a href={`/api/admin/export/payments?format=csv${exportQs ? `&${exportQs}` : ""}`}>
                <Download /> CSV
              </a>
            </Button>
            <Button asChild variant="outline" size="sm">
              <a href={`/api/admin/export/payments?format=xlsx${exportQs ? `&${exportQs}` : ""}`}>
                <FileSpreadsheet /> Excel
              </a>
            </Button>
          </>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-7">
        {STATUSES.map((s) => {
          const row = breakdown.find((b) => b.status === s);
          return (
            <Link
              key={s}
              href={`/admin/betalingen?${new URLSearchParams({ ...Object.fromEntries(Object.entries(params).filter((e): e is [string, string] => !!e[1])), status: s }).toString()}`}
              className={`rounded-xl border bg-white p-4 shadow-xs transition-shadow hover:shadow-md ${status === s ? "border-primary" : "border-border"}`}
            >
              <p className="text-xs font-medium text-muted-foreground">{paymentStatusLabels[s]}</p>
              <p className="mt-1 text-xl font-bold tabular-nums">{row?._count._all ?? 0}</p>
              <p className="text-xs text-muted-foreground tabular-nums">{formatPrice(row?._sum.amount ?? 0)}</p>
            </Link>
          );
        })}
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-white shadow-xs">
        <SearchForm
          action="/admin/betalingen"
          q={q}
          placeholder="Zoek op betaal-ID, omschrijving, ordernummer of e-mail"
          filters={[
            { name: "type", label: "Type", value: type, options: [{ value: "alle", label: "Alle typen" }, ...TYPES.map((t) => ({ value: t, label: paymentTypeLabels[t] }))] },
            { name: "status", label: "Status", value: status, options: [{ value: "alle", label: "Alle statussen" }, ...STATUSES.map((s) => ({ value: s, label: paymentStatusLabels[s] }))] },
            { name: "provider", label: "Provider", value: provider, options: [{ value: "alle", label: "Alle providers" }, ...PROVIDERS.map((p) => ({ value: p, label: paymentProviderLabels[p] }))] },
          ]}
        />
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Datum</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Gekoppeld aan</TableHead>
              <TableHead>Provider</TableHead>
              <TableHead>Methode</TableHead>
              <TableHead className="text-right">Bedrag</TableHead>
              <TableHead>Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.length === 0 && <TableEmpty colSpan={8}>Geen betalingen gevonden.</TableEmpty>}
            {payments.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="whitespace-nowrap text-sm">
                  {formatDateTime(p.createdAt)}
                  {p.paidAt && <p className="text-xs text-muted-foreground">betaald {formatDateTime(p.paidAt)}</p>}
                </TableCell>
                <TableCell className="text-sm">
                  {paymentTypeLabels[p.type]}
                  {p.isRecurring && <p className="text-xs text-muted-foreground">automatische incasso</p>}
                </TableCell>
                <TableCell className="min-w-56 text-sm">
                  {p.order ? (
                    <Link href={`/admin/bestellingen/${p.order.id}`} className="font-mono font-semibold hover:text-primary">
                      {p.order.orderNumber}
                    </Link>
                  ) : p.registration ? (
                    <Link href={`/admin/evenementen/${p.registration.event.id}`} className="hover:text-primary">
                      {p.registration.firstName} {p.registration.lastName} – {p.registration.event.title}
                    </Link>
                  ) : (
                    <span className="text-muted-foreground">{p.description}</span>
                  )}
                  {p.user && (
                    <p className="text-xs">
                      <Link href={`/admin/leden/${p.user.id}`} className="text-muted-foreground hover:text-primary">
                        {p.user.firstName} {p.user.lastName}
                      </Link>
                    </p>
                  )}
                </TableCell>
                <TableCell className="text-sm">
                  {paymentProviderLabels[p.provider]}
                  {p.providerPaymentId && <p className="max-w-40 truncate font-mono text-xs text-muted-foreground">{p.providerPaymentId}</p>}
                </TableCell>
                <TableCell className="whitespace-nowrap text-sm">{paymentMethodLabel(p.provider, p.method)}</TableCell>
                <TableCell className="text-right font-medium tabular-nums">{formatPrice(p.amount)}</TableCell>
                <TableCell>
                  <PaymentStatusBadge status={p.status} />
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    {(p.provider === "MOLLIE" || p.provider === "STRIPE") && p.status !== "PAID" && p.status !== "REFUNDED" && (
                      <ActionButton action={refreshPaymentStatus} fields={{ id: p.id }} variant="ghost" title="Status verversen bij provider">
                        <RefreshCw />
                      </ActionButton>
                    )}
                    {p.status === "PAID" && p.provider !== "MANUAL" && p.providerPaymentId && (
                      <RefundDialog
                        paymentId={p.id}
                        amountLabel={formatPrice(p.amount)}
                        description={p.description}
                        providerLabel={paymentProviderLabels[p.provider]}
                        compact
                      />
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <Pagination page={page} total={total} basePath="/admin/betalingen" params={params} />
      </div>
    </>
  );
}
