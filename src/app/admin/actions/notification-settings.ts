"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { fd } from "@/lib/form-data";
import { notificationEventLabels, sendTestNotification, type NotificationEvent } from "@/lib/notifications";
import { rateLimit } from "@/lib/rate-limit";
import { requireAdmin } from "@/lib/session";
import { saveSettings } from "@/lib/settings";
import { failure, success, type ActionState } from "./state";

const email = z.string().email();

/** Beheer → Instellingen → Meldingen opslaan: ontvangers en welke meldingen per e-mail komen. */
export async function saveNotificationSettings(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();

  const recipients = [...new Set(fd.list(formData, "recipients").map((r) => r.toLowerCase()))];
  const invalid = recipients.filter((r) => !email.safeParse(r).success);
  if (invalid.length) return failure("Controleer de gemarkeerde velden.", { recipients: `Ongeldig e-mailadres: ${invalid.join(", ")}` });
  if (recipients.length > 10) return failure("Controleer de gemarkeerde velden.", { recipients: "Maximaal 10 ontvangers" });

  const events = Object.fromEntries(
    (Object.keys(notificationEventLabels) as NotificationEvent[]).map((key) => [key, fd.bool(formData, `event.${key}`)]),
  ) as Record<NotificationEvent, boolean>;

  try {
    await saveSettings("notifications", { recipients, events }, admin.email);
  } catch (err) {
    console.error("[instellingen meldingen] opslaan mislukt", err);
    return failure("Opslaan mislukt. Probeer het opnieuw.");
  }
  revalidatePath("/admin/instellingen", "layout");
  return success("Meldingsinstellingen opgeslagen.");
}

export async function sendTestNotificationAction(prev: ActionState, formData: FormData): Promise<ActionState> {
  void prev;
  void formData;
  const admin = await requireAdmin();
  if (!rateLimit(`testmelding:${admin.id}`, 5, 10 * 60_000).ok) return failure("Je hebt net al een paar testmeldingen gestuurd. Probeer het over enkele minuten opnieuw.");
  const result = await sendTestNotification(`${admin.firstName} ${admin.lastName}`);
  revalidatePath("/admin", "layout");
  if (!result.ok) return failure(result.error ?? "Versturen mislukt.");
  return success(`Testmelding verstuurd naar ${result.recipients.join(", ")} en toegevoegd aan het meldingencentrum.`);
}

// ─── Meldingencentrum ────────────────────────────────────────────────────────

const idSchema = z.string().min(1).max(64);

export async function markNotificationRead(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = idSchema.safeParse(formData.get("id"));
  if (!id.success) return;
  await prisma.adminNotification.updateMany({ where: { id: id.data, readAt: null }, data: { readAt: new Date() } });
  revalidatePath("/admin", "layout");
}

export async function markAllNotificationsRead(): Promise<void> {
  await requireAdmin();
  await prisma.adminNotification.updateMany({ where: { readAt: null }, data: { readAt: new Date() } });
  revalidatePath("/admin", "layout");
}

/** Markeert een melding als gelezen en opent de bijbehorende pagina in het beheer. */
export async function openNotification(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = idSchema.safeParse(formData.get("id"));
  if (!id.success) redirect("/admin/meldingen");
  const n = await prisma.adminNotification.update({ where: { id: id.data }, data: { readAt: new Date() } }).catch(() => null);
  revalidatePath("/admin", "layout");
  // Alleen interne beheerpaden openen (geen open redirect).
  const link = n?.link && /^\/admin(\/|$|\?)/.test(n.link) ? n.link : "/admin/meldingen";
  redirect(link);
}
