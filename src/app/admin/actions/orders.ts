"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import * as templates from "@/lib/email/templates";
import { orderStatusLabels, restoreStockForOrder } from "@/lib/orders";
import { requireAdmin } from "@/lib/session";
import { failure, success, type ActionState } from "./state";

const statusSchema = z.object({
  id: z.string().min(1).max(64),
  status: z.enum(["PENDING", "PAID", "PROCESSING", "SHIPPED", "COMPLETED", "CANCELLED", "REFUNDED"]),
  trackingCode: z.string().trim().max(100).optional().default(""),
});

const RESERVED_STOCK = ["PENDING", "PAID", "PROCESSING"] as const;

export async function updateOrderStatus(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = statusSchema.safeParse({
    id: formData.get("id"),
    status: formData.get("status"),
    trackingCode: formData.get("trackingCode") ?? "",
  });
  if (!parsed.success) return failure("Ongeldige invoer.");
  const { id, status, trackingCode } = parsed.data;

  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) return failure("Bestelling niet gevonden.");

  if (order.status === "CANCELLED" && status !== "CANCELLED") {
    return failure("Een geannuleerde bestelling kan niet worden heropend. Maak zo nodig een nieuwe bestelling aan.");
  }
  if (order.status === "PENDING" && ["PROCESSING", "SHIPPED", "COMPLETED"].includes(status)) {
    return failure("Deze bestelling is nog niet betaald. Markeer haar eerst als betaald.");
  }
  if (order.status === status && (trackingCode || "") === (order.trackingCode || "")) {
    return failure("Er is niets gewijzigd.");
  }

  const updated = await prisma.$transaction(async (tx) => {
    if (status === "CANCELLED" && (RESERVED_STOCK as readonly string[]).includes(order.status)) {
      await restoreStockForOrder(tx, order.id);
    }
    return tx.order.update({
      where: { id: order.id },
      data: {
        status,
        trackingCode: trackingCode || order.trackingCode,
        shippedAt: status === "SHIPPED" ? (order.shippedAt ?? new Date()) : order.shippedAt,
        paidAt: status === "PAID" && !order.paidAt ? new Date() : order.paidAt,
      },
    });
  });

  let message = `Status gewijzigd naar "${orderStatusLabels[status]}".`;
  if (status === "SHIPPED" && order.status !== "SHIPPED") {
    const sent = await sendEmail({ to: updated.email, ...templates.orderShipped(updated) });
    message += sent ? " De klant heeft een verzendmelding ontvangen." : " Let op: de verzendmail kon niet worden verstuurd.";
  } else if (status === order.status) {
    message = "Track & trace-code opgeslagen.";
  }
  if (status === "CANCELLED" && order.paidAt) message += " Vergeet niet de betaling terug te storten via het Mollie-dashboard.";
  if (status === "CANCELLED" && (RESERVED_STOCK as readonly string[]).includes(order.status)) message += " De voorraad is teruggeboekt.";

  revalidatePath("/admin");
  revalidatePath("/admin/bestellingen");
  revalidatePath(`/admin/bestellingen/${order.id}`);
  revalidatePath("/account");
  return success(message);
}

const notesSchema = z.object({ id: z.string().min(1).max(64), notes: z.string().trim().max(2000) });

export async function updateOrderNotes(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = notesSchema.safeParse({ id: formData.get("id"), notes: formData.get("notes") ?? "" });
  if (!parsed.success) return failure("Ongeldige notitie.");
  await prisma.order.update({ where: { id: parsed.data.id }, data: { notes: parsed.data.notes || null } });
  revalidatePath(`/admin/bestellingen/${parsed.data.id}`);
  return success("Notitie opgeslagen.");
}
