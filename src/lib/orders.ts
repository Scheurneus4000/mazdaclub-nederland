import { randomInt } from "crypto";
import type { OrderStatus, Prisma } from "@prisma/client";

/** Leesbaar, niet-raadbaar ordernummer, bijv. MCN-2026-48K3QZ. */
export function generateOrderNumber(date = new Date()): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) code += alphabet[randomInt(alphabet.length)];
  return `MCN-${date.getFullYear()}-${code}`;
}

export const orderStatusLabels: Record<OrderStatus, string> = {
  PENDING: "Wacht op betaling",
  PAID: "Betaald",
  PROCESSING: "In behandeling",
  SHIPPED: "Verzonden",
  COMPLETED: "Afgerond",
  CANCELLED: "Geannuleerd",
  REFUNDED: "Terugbetaald",
};

/** Zet gereserveerde voorraad terug wanneer een bestelling niet betaald wordt. */
export async function restoreStockForOrder(tx: Prisma.TransactionClient, orderId: string) {
  const items = await tx.orderItem.findMany({ where: { orderId }, select: { variantId: true, quantity: true } });
  for (const item of items) {
    if (!item.variantId) continue;
    await tx.productVariant.update({
      where: { id: item.variantId },
      data: { stock: { increment: item.quantity } },
    });
  }
}
