import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PrintButton } from "@/components/admin/print-button";
import { getContent } from "@/lib/content";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { getPricing, getSettings } from "@/lib/settings";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Pakbon", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const countries: Record<string, string> = { NL: "Nederland", BE: "België", DE: "Duitsland" };

/** Printbare pakbon met afzend- en ontvangstgegevens (A4). */
export default async function PackingSlipPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const [order, shipping, pricing, content] = await Promise.all([
    prisma.order.findUnique({ where: { id }, include: { items: true } }),
    getSettings("shipping"),
    getPricing(),
    getContent(),
  ]);
  if (!order) notFound();
  const s = shipping.sender;
  const pickup = order.shippingMethod === "PICKUP_EVENT";

  return (
    <div className="mx-auto max-w-3xl bg-white p-8 text-ink print:p-0">
      <div className="mb-6 flex items-center justify-between gap-4 print:hidden">
        <p className="text-sm text-muted-foreground">Tip: print op A4 en stop de pakbon bij het pakket.</p>
        <PrintButton />
      </div>

      <header className="flex items-start justify-between gap-6 border-b-4 border-primary pb-6">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={content.logoUrl || "/images/logo/mazdaclub-nederland-zwart.png"} alt="MazdaClub Nederland" className="h-14 w-auto" />
        <div className="text-right text-sm">
          <p className="text-2xl font-bold uppercase tracking-tight">Pakbon</p>
          <p className="mt-1 font-mono">{order.orderNumber}</p>
          <p className="text-muted-foreground">{formatDate(order.createdAt)}</p>
        </div>
      </header>

      <section className="mt-8 grid grid-cols-2 gap-8 text-sm">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Afzender</p>
          <address className="mt-2 not-italic leading-relaxed">
            {s.name || "MazdaClub Nederland"}
            {s.contactPerson && (
              <>
                <br />
                t.a.v. {s.contactPerson}
              </>
            )}
            {s.street && (
              <>
                <br />
                {s.street} {s.houseNumber}
                <br />
                {s.postalCode} {s.city}
                <br />
                {countries[s.country] ?? s.country}
              </>
            )}
            {(s.email || content.contactEmail) && (
              <>
                <br />
                {s.email || content.contactEmail}
              </>
            )}
          </address>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{pickup ? "Ophalen door" : "Ontvanger"}</p>
          <address className="mt-2 not-italic leading-relaxed">
            {order.firstName} {order.lastName}
            {!pickup && (
              <>
                <br />
                {order.street} {order.houseNumber}
                <br />
                {order.postalCode} {order.city}
                <br />
                {countries[order.country] ?? order.country}
              </>
            )}
            {order.phone && (
              <>
                <br />
                {order.phone}
              </>
            )}
          </address>
          <p className="mt-3 text-xs text-muted-foreground">Verzendmethode: {pricing.shipping[order.shippingMethod].label}</p>
        </div>
      </section>

      <table className="mt-10 w-full border-collapse text-sm">
        <thead>
          <tr className="border-b-2 border-ink text-left">
            <th className="py-2">Artikel</th>
            <th className="py-2">Variant</th>
            <th className="py-2">SKU</th>
            <th className="py-2 text-right">Aantal</th>
            <th className="w-16 py-2 text-center print:table-cell">✓</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((i) => (
            <tr key={i.id} className="border-b border-border">
              <td className="py-2.5 font-medium">{i.productName}</td>
              <td className="py-2.5">{i.variantName}</td>
              <td className="py-2.5 font-mono text-xs">{i.sku}</td>
              <td className="py-2.5 text-right font-semibold">{i.quantity}</td>
              <td className="py-2.5 text-center">
                <span className="inline-block size-4 border border-ink" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {order.notes && (
        <p className="mt-6 rounded-md bg-surface p-3 text-sm">
          <strong>Opmerking klant:</strong> {order.notes}
        </p>
      )}

      <footer className="mt-12 border-t border-border pt-4 text-xs leading-relaxed text-muted-foreground">
        Bedankt voor je bestelling! Vragen of retourneren? Mail naar {content.contactEmail}. Je hebt 14 dagen bedenktijd vanaf ontvangst.
      </footer>
    </div>
  );
}
