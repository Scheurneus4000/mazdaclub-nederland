import type { OrderStatus, PaymentProvider, PaymentStatus, PaymentType, Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { memberWhere } from "@/components/admin/member-filters";
import { eventStatusLabels, membershipStatusLabels, paymentTypeLabels, registrationStatusLabels } from "@/components/admin/status-badges";
import { prisma } from "@/lib/db";
import { exportFilename, toCsv, toXlsx, type ExportColumn } from "@/lib/export";
import { membershipView } from "@/lib/membership";
import { orderStatusLabels } from "@/lib/orders";
import { paymentStatusLabels } from "@/lib/payments";
import { getPricing } from "@/lib/settings";
import { getAdminOrNull } from "@/lib/session";
import { formatMemberNumber, slugify } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Bovengrens per export; ruim voldoende voor duizenden leden. */
const MAX_ROWS = 50_000;

type Format = "csv" | "xlsx";

async function respond<T>(rows: T[], columns: ExportColumn<T>[], base: string, sheet: string, format: Format) {
  const filename = exportFilename(base, format);
  if (format === "xlsx") {
    const buffer = await toXlsx(rows, columns, sheet);
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  }
  return new Response(toCsv(rows, columns), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

/**
 * GET /api/admin/export/{registrations|orders|members|payments}?format=csv|xlsx
 *   registrations: &eventId=…   orders: &status=…   members: &status=…&q=…   payments: &type=…&status=…&provider=…&q=…
 */
export async function GET(req: Request, { params }: { params: Promise<{ type: string }> }) {
  const admin = await getAdminOrNull();
  if (!admin) return NextResponse.json({ error: "Niet geautoriseerd" }, { status: 401 });

  const { type } = await params;
  const url = new URL(req.url);
  const format: Format = url.searchParams.get("format") === "xlsx" ? "xlsx" : "csv";
  const q = (url.searchParams.get("q") ?? "").trim().slice(0, 120);
  const status = url.searchParams.get("status") ?? "";

  switch (type) {
    case "registrations": {
      const eventId = url.searchParams.get("eventId") || undefined;
      const event = eventId ? await prisma.event.findUnique({ where: { id: eventId }, select: { title: true } }) : null;
      if (eventId && !event) return NextResponse.json({ error: "Evenement niet gevonden" }, { status: 404 });

      const rows = await prisma.eventRegistration.findMany({
        where: eventId ? { eventId } : {},
        orderBy: [{ event: { startsAt: "asc" } }, { lastName: "asc" }],
        take: MAX_ROWS,
        include: {
          event: { select: { title: true, startsAt: true, status: true } },
          payments: { orderBy: { createdAt: "desc" }, take: 1, select: { status: true, method: true } },
        },
      });
      type Row = (typeof rows)[number];
      const columns: ExportColumn<Row>[] = [
        { header: "Evenement", value: (r) => r.event.title, width: 32 },
        { header: "Datum evenement", value: (r) => r.event.startsAt, type: "datetime", width: 18 },
        { header: "Status evenement", value: (r) => eventStatusLabels[r.event.status] },
        { header: "Voornaam", value: (r) => r.firstName, width: 16 },
        { header: "Achternaam", value: (r) => r.lastName, width: 20 },
        { header: "E-mailadres", value: (r) => r.email, width: 30 },
        { header: "Telefoonnummer", value: (r) => r.phone, width: 18 },
        { header: "Kenteken", value: (r) => r.licensePlate },
        { header: "Lid", value: (r) => r.isMember, type: "boolean" },
        { header: "Bedrag", value: (r) => r.amount, type: "money" },
        { header: "Status inschrijving", value: (r) => registrationStatusLabels[r.status], width: 20 },
        { header: "Betaalstatus", value: (r) => (r.payments[0] ? paymentStatusLabels[r.payments[0].status] : r.amount === 0 ? "Gratis" : "") },
        { header: "Betaalmethode", value: (r) => r.payments[0]?.method ?? "" },
        { header: "Opmerkingen", value: (r) => r.remarks ?? "", width: 40 },
        { header: "Ingeschreven op", value: (r) => r.createdAt, type: "datetime", width: 18 },
      ];
      const base = event ? `deelnemers-${slugify(event.title)}` : "deelnemers";
      return respond(rows, columns, base, event ? `Deelnemers ${event.title}` : "Deelnemers", format);
    }

    case "shipments": {
      // Verzendlijst om te importeren in MyParcel, Sendcloud of PostNL (CSV-import van adressen).
      const rows = await prisma.order.findMany({
        where: { status: { in: ["PAID", "PROCESSING"] }, shippingMethod: { not: "PICKUP_EVENT" } },
        orderBy: { createdAt: "asc" },
        take: MAX_ROWS,
        include: { items: true },
      });
      type Row = (typeof rows)[number];
      const splitNumber = (value: string | null) => {
        const m = /^(\d+)\s*[-\s]?\s*(.*)$/.exec((value ?? "").trim());
        return m ? { number: m[1], suffix: m[2] } : { number: value ?? "", suffix: "" };
      };
      const columns: ExportColumn<Row>[] = [
        { header: "Referentie", value: (r) => r.orderNumber, width: 18 },
        { header: "Naam", value: (r) => `${r.firstName} ${r.lastName}`, width: 26 },
        { header: "Straat", value: (r) => r.street ?? "", width: 26 },
        { header: "Huisnummer", value: (r) => splitNumber(r.houseNumber).number },
        { header: "Toevoeging", value: (r) => splitNumber(r.houseNumber).suffix },
        { header: "Postcode", value: (r) => r.postalCode ?? "" },
        { header: "Plaats", value: (r) => r.city ?? "", width: 20 },
        { header: "Land", value: (r) => r.country },
        { header: "E-mailadres", value: (r) => r.email, width: 30 },
        { header: "Telefoonnummer", value: (r) => r.phone ?? "" },
        { header: "Aantal colli", value: () => 1 },
        { header: "Inhoud", value: (r) => r.items.map((i) => `${i.quantity}× ${i.productName}`).join(", "), width: 50 },
      ];
      return respond(rows, columns, "verzendlijst", "Verzendlijst", format);
    }

    case "orders": {
      const { shipping: shippingOptions } = await getPricing();
      const where: Prisma.OrderWhereInput = {};
      if (status === "te-verzenden") where.status = { in: ["PAID", "PROCESSING"] };
      else if (Object.hasOwn(orderStatusLabels, status)) where.status = status as OrderStatus;
      const rows = await prisma.order.findMany({ where, orderBy: { createdAt: "desc" }, take: MAX_ROWS, include: { items: true } });
      type Row = (typeof rows)[number];
      const columns: ExportColumn<Row>[] = [
        { header: "Ordernummer", value: (r) => r.orderNumber, width: 18 },
        { header: "Datum", value: (r) => r.createdAt, type: "datetime", width: 18 },
        { header: "Status", value: (r) => orderStatusLabels[r.status] },
        { header: "Voornaam", value: (r) => r.firstName },
        { header: "Achternaam", value: (r) => r.lastName },
        { header: "E-mailadres", value: (r) => r.email, width: 30 },
        { header: "Telefoonnummer", value: (r) => r.phone ?? "" },
        { header: "Adres", value: (r) => [r.street, r.houseNumber].filter(Boolean).join(" "), width: 28 },
        { header: "Postcode", value: (r) => r.postalCode ?? "" },
        { header: "Plaats", value: (r) => r.city ?? "" },
        { header: "Land", value: (r) => r.country },
        { header: "Verzendmethode", value: (r) => shippingOptions[r.shippingMethod].label, width: 26 },
        { header: "Artikelen", value: (r) => r.items.map((i) => `${i.quantity}× ${i.productName} (${i.variantName})`).join(", "), width: 50 },
        { header: "Subtotaal", value: (r) => r.subtotal, type: "money" },
        { header: "Ledenkorting", value: (r) => r.discount, type: "money" },
        { header: "Verzendkosten", value: (r) => r.shippingCost, type: "money" },
        { header: "Totaal", value: (r) => r.total, type: "money" },
        { header: "Track & trace", value: (r) => r.trackingCode ?? "" },
        { header: "Betaald op", value: (r) => r.paidAt, type: "datetime", width: 18 },
        { header: "Verzonden op", value: (r) => r.shippedAt, type: "datetime", width: 18 },
      ];
      return respond(rows, columns, "bestellingen", "Bestellingen", format);
    }

    case "members": {
      const rows = await prisma.user.findMany({
        where: memberWhere(status || "alle", q),
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
        take: MAX_ROWS,
        include: { membership: true },
      });
      type Row = (typeof rows)[number];
      const columns: ExportColumn<Row>[] = [
        { header: "Lidnummer", value: (r) => (r.membership ? formatMemberNumber(r.membership.memberNumber) : "") },
        { header: "Voornaam", value: (r) => r.firstName },
        { header: "Achternaam", value: (r) => r.lastName, width: 20 },
        { header: "E-mailadres", value: (r) => r.email, width: 30 },
        { header: "Telefoonnummer", value: (r) => r.phone ?? "" },
        { header: "Straat", value: (r) => r.street ?? "", width: 24 },
        { header: "Huisnummer", value: (r) => r.houseNumber ?? "" },
        { header: "Postcode", value: (r) => r.postalCode ?? "" },
        { header: "Plaats", value: (r) => r.city ?? "" },
        { header: "Land", value: (r) => r.country },
        { header: "Kenteken", value: (r) => r.licensePlate ?? "" },
        { header: "Auto", value: (r) => r.carModel ?? "", width: 20 },
        { header: "Status lidmaatschap", value: (r) => membershipStatusLabels[membershipView(r.membership).status], width: 20 },
        { header: "Lid sinds", value: (r) => r.membership?.startedAt ?? null, type: "date" },
        { header: "Geldig tot", value: (r) => r.membership?.currentPeriodEnd ?? null, type: "date" },
        { header: "Automatisch verlengen", value: (r) => (r.membership ? r.membership.autoRenew : null), type: "boolean" },
        { header: "Rol", value: (r) => (r.role === "ADMIN" ? "Beheerder" : "Gebruiker") },
        { header: "Toestemming nieuwsbrief", value: (r) => r.marketingConsent, type: "boolean" },
        { header: "Account aangemaakt", value: (r) => r.createdAt, type: "date" },
      ];
      return respond(rows, columns, "leden", "Leden", format);
    }

    case "payments": {
      const where: Prisma.PaymentWhereInput = {};
      const pType = url.searchParams.get("type") ?? "";
      const provider = url.searchParams.get("provider") ?? "";
      if (Object.hasOwn(paymentTypeLabels, pType)) where.type = pType as PaymentType;
      if (Object.hasOwn(paymentStatusLabels, status)) where.status = status as PaymentStatus;
      if (["MOLLIE", "STRIPE", "MOCK", "MANUAL"].includes(provider)) where.provider = provider as PaymentProvider;
      if (q) {
        where.OR = [
          { providerPaymentId: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
          { user: { email: { contains: q, mode: "insensitive" } } },
          { order: { orderNumber: { contains: q, mode: "insensitive" } } },
        ];
      }
      const rows = await prisma.payment.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: MAX_ROWS,
        include: {
          user: { select: { email: true } },
          order: { select: { orderNumber: true, email: true } },
          registration: { select: { email: true } },
        },
      });
      type Row = (typeof rows)[number];
      const columns: ExportColumn<Row>[] = [
        { header: "Datum", value: (r) => r.createdAt, type: "datetime", width: 18 },
        { header: "Type", value: (r) => paymentTypeLabels[r.type] },
        { header: "Omschrijving", value: (r) => r.description, width: 40 },
        { header: "Ordernummer", value: (r) => r.order?.orderNumber ?? "" },
        { header: "E-mailadres", value: (r) => r.user?.email ?? r.order?.email ?? r.registration?.email ?? "", width: 30 },
        { header: "Provider", value: (r) => r.provider },
        { header: "Provider-ID", value: (r) => r.providerPaymentId ?? "", width: 26 },
        { header: "Methode", value: (r) => r.method ?? "" },
        { header: "Bedrag", value: (r) => r.amount, type: "money" },
        { header: "Status", value: (r) => paymentStatusLabels[r.status] },
        { header: "Automatische incasso", value: (r) => r.isRecurring, type: "boolean" },
        { header: "Betaald op", value: (r) => r.paidAt, type: "datetime", width: 18 },
      ];
      return respond(rows, columns, "betalingen", "Betalingen", format);
    }

    default:
      return NextResponse.json({ error: "Onbekend exporttype" }, { status: 404 });
  }
}
