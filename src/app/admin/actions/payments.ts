"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { fd } from "@/lib/form-data";
import { notifyAdmins } from "@/lib/notifications";
import { paymentStatusLabels, refundPayment, syncPayment } from "@/lib/payments";
import { requireAdmin } from "@/lib/session";
import { formatPrice } from "@/lib/utils";
import { failure, success, type ActionState } from "./state";

const idSchema = z.object({ id: z.string().min(1).max(64) });

function revalidatePayment(p: { orderId: string | null; userId: string | null; registrationId: string | null }) {
  revalidatePath("/admin/betalingen");
  revalidatePath("/admin");
  if (p.orderId) revalidatePath(`/admin/bestellingen/${p.orderId}`);
  if (p.userId) revalidatePath(`/admin/leden/${p.userId}`);
}

export async function refreshPaymentStatus(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = idSchema.safeParse({ id: formData.get("id") });
  if (!parsed.success) return failure("Ongeldige betaling.");

  const before = await prisma.payment.findUnique({ where: { id: parsed.data.id }, select: { status: true, orderId: true, userId: true, registrationId: true } });
  if (!before) return failure("Betaling niet gevonden.");
  const status = await syncPayment(parsed.data.id);
  if (!status) return failure("Status kon niet worden opgehaald.");

  revalidatePayment(before);
  return success(
    status === before.status ? `Status ongewijzigd: ${paymentStatusLabels[status]}.` : `Status bijgewerkt: ${paymentStatusLabels[before.status]} → ${paymentStatusLabels[status]}.`,
  );
}

/**
 * Betaalde betaling (gedeeltelijk) terugbetalen via Mollie of Stripe. Het geld gaat terug naar de
 * rekening of kaart waarmee is betaald. Leeg bedrag = alles terugbetalen.
 */
export async function refundPaymentAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const parsed = idSchema.safeParse({ id: formData.get("id") });
  if (!parsed.success) return failure("Ongeldige betaling.");

  const payment = await prisma.payment.findUnique({ where: { id: parsed.data.id } });
  if (!payment) return failure("Betaling niet gevonden.");

  const partial = formData.get("mode") === "partial";
  const amount = partial ? fd.cents(formData, "amount") : undefined;
  if (partial && (amount === null || amount === undefined || Number.isNaN(amount))) return failure("Vul een geldig bedrag in, bijv. 2,50.");
  const cents = partial ? (amount as number) : undefined;

  const result = await refundPayment(payment.id, cents);
  if (!result.ok) return failure(result.error);

  if (!result.full) {
    // Gedeeltelijke terugbetaling verandert de status niet; leg het wel vast als melding.
    await notifyAdmins({
      type: "paymentRefunded",
      title: `Gedeeltelijk terugbetaald: ${formatPrice(cents ?? 0)}`,
      message: `${admin.firstName} ${admin.lastName} heeft ${formatPrice(cents ?? 0)} van "${payment.description}" (${formatPrice(payment.amount)}) terugbetaald.`,
      link: "/admin/betalingen",
    });
  }

  revalidatePayment(payment);
  return success(
    result.full
      ? result.status === "REFUNDED"
        ? `${formatPrice(payment.amount)} is terugbetaald. De betaling staat nu op "Terugbetaald".`
        : `Terugbetaling van ${formatPrice(payment.amount)} is gestart. De status wordt bijgewerkt zodra de betaalprovider die heeft verwerkt.`
      : `${formatPrice(cents ?? 0)} is terugbetaald (gedeeltelijk).`,
  );
}
