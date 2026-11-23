import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Mail, Phone, Printer } from "lucide-react";
import { refreshPaymentStatus } from "@/app/admin/actions/payments";
import { ActionButton } from "@/components/admin/action-button";
import { OrderNotesForm, OrderStatusForm } from "@/components/admin/order-forms";
import { AdminPageHeader, AdminSection, DetailList, TableEmpty } from "@/components/admin/page-title";
import { OrderStatusBadge, PaymentStatusBadge } from "@/components/admin/status-badges";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { prisma } from "@/lib/db";
import { getPricing } from "@/lib/settings";
import { requireAdmin } from "@/lib/session";
import { formatDateTime, formatPrice } from "@/lib/utils";

export const metadata: Metadata = { title: "Bestelling" };
export const dynamic = "force-dynamic";

export default async function AdminOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: { include: { product: { select: { id: true, images: true } } } },
      payments: { orderBy: { createdAt: "desc" } },
      user: { select: { id: true, firstName: true, lastName: true } },
    },
  });
  if (!order) notFound();

  const pickup = order.shippingMethod === "PICKUP_EVENT";
  const shipping = (await getPricing()).shipping[order.shippingMethod];

  return (
    <>
      <AdminPageHeader
        title={`Bestelling ${order.orderNumber}`}
        badge={<OrderStatusBadge status={order.status} />}
        description={`Geplaatst op ${formatDateTime(order.createdAt)}${order.paidAt ? ` · betaald op ${formatDateTime(order.paidAt)}` : ""}`}
        back={{ href: "/admin/bestellingen", label: "Bestellingen" }}
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href={`/admin/bestellingen/${order.id}/pakbon`} target="_blank">
              <Printer /> Pakbon printen
            </Link>
          </Button>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <AdminSection title="Artikelen" bodyClassName="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead className="text-right">Prijs</TableHead>
                  <TableHead className="text-right">Aantal</TableHead>
                  <TableHead className="text-right">Totaal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="min-w-56">
                      <div className="flex items-center gap-3">
                        <div className="size-12 shrink-0 overflow-hidden rounded-md border border-border bg-surface">
                          {item.product?.images[0] && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={item.product.images[0]} alt="" className="size-full object-contain p-1" />
                          )}
                        </div>
                        <div>
                          {item.product ? (
                            <Link href={`/admin/producten/${item.product.id}`} className="font-medium hover:text-primary">
                              {item.productName}
                            </Link>
                          ) : (
                            <span className="font-medium">{item.productName}</span>
                          )}
                          <p className="text-xs text-muted-foreground">{item.variantName}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{item.sku}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatPrice(item.unitPrice)}</TableCell>
                    <TableCell className="text-right tabular-nums">{item.quantity}</TableCell>
                    <TableCell className="text-right font-medium tabular-nums">{formatPrice(item.lineTotal)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <dl className="space-y-2 border-t border-border p-5 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Subtotaal</dt>
                <dd className="tabular-nums">{formatPrice(order.subtotal)}</dd>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between text-primary">
                  <dt>Ledenkorting</dt>
                  <dd className="tabular-nums">− {formatPrice(order.discount)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Verzending ({shipping.label})</dt>
                <dd className="tabular-nums">{order.shippingCost === 0 ? "Gratis" : formatPrice(order.shippingCost)}</dd>
              </div>
              <div className="flex justify-between border-t border-border pt-3 text-base font-bold">
                <dt>Totaal</dt>
                <dd className="tabular-nums">{formatPrice(order.total)}</dd>
              </div>
            </dl>
          </AdminSection>

          <AdminSection title="Betalingen" bodyClassName="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Datum</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Methode</TableHead>
                  <TableHead className="text-right">Bedrag</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.payments.length === 0 && <TableEmpty colSpan={6}>Geen betalingen.</TableEmpty>}
                {order.payments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="whitespace-nowrap text-sm">{formatDateTime(p.createdAt)}</TableCell>
                    <TableCell className="text-sm">
                      {p.provider}
                      {p.providerPaymentId && <p className="font-mono text-xs text-muted-foreground">{p.providerPaymentId}</p>}
                    </TableCell>
                    <TableCell className="text-sm capitalize">{p.method ?? "–"}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatPrice(p.amount)}</TableCell>
                    <TableCell>
                      <PaymentStatusBadge status={p.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      {(p.status === "OPEN" || p.status === "PENDING") && (
                        <ActionButton action={refreshPaymentStatus} fields={{ id: p.id }} variant="ghost">
                          Verversen
                        </ActionButton>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </AdminSection>
        </div>

        <div className="space-y-6">
          <AdminSection title="Status">
            <OrderStatusForm orderId={order.id} status={order.status} trackingCode={order.trackingCode} pickup={pickup} />
          </AdminSection>

          <AdminSection title="Klant">
            <DetailList
              items={[
                [
                  "Naam",
                  order.user ? (
                    <Link href={`/admin/leden/${order.user.id}`} className="text-primary hover:underline">
                      {order.firstName} {order.lastName}
                    </Link>
                  ) : (
                    `${order.firstName} ${order.lastName} (gast)`
                  ),
                ],
                [
                  "E-mail",
                  <a key="e" href={`mailto:${order.email}?subject=${encodeURIComponent(`Je bestelling ${order.orderNumber}`)}`} className="inline-flex items-center gap-1 hover:text-primary">
                    <Mail className="size-3.5" /> {order.email}
                  </a>,
                ],
                [
                  "Telefoon",
                  order.phone ? (
                    <a href={`tel:${order.phone}`} className="inline-flex items-center gap-1 hover:text-primary">
                      <Phone className="size-3.5" /> {order.phone}
                    </a>
                  ) : null,
                ],
                ["Ledenkorting", order.memberDiscountApplied ? "Ja" : "Nee"],
              ]}
            />
          </AdminSection>

          <AdminSection title="Bezorging">
            <DetailList
              items={[
                ["Methode", shipping.label],
                [
                  "Adres",
                  pickup ? (
                    "Ophalen bij clubevenement"
                  ) : (
                    <span className="whitespace-pre-line">{`${order.street ?? ""} ${order.houseNumber ?? ""}\n${order.postalCode ?? ""} ${order.city ?? ""}\n${order.country}`}</span>
                  ),
                ],
                ["Track & trace", order.trackingCode],
                ["Verzonden op", order.shippedAt ? formatDateTime(order.shippedAt) : null],
              ]}
            />
          </AdminSection>

          <AdminSection title="Notities">
            <OrderNotesForm orderId={order.id} notes={order.notes} />
          </AdminSection>
        </div>
      </div>
    </>
  );
}
