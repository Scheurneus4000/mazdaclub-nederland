"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { failure, success, type ActionState } from "./state";

const idSchema = z.object({ id: z.string().min(1).max(64) });

export async function toggleMessageHandled(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = idSchema.safeParse({ id: formData.get("id") });
  if (!parsed.success) return failure("Ongeldig bericht.");
  const msg = await prisma.contactMessage.findUnique({ where: { id: parsed.data.id }, select: { handled: true } });
  if (!msg) return failure("Bericht niet gevonden.");
  await prisma.contactMessage.update({ where: { id: parsed.data.id }, data: { handled: !msg.handled } });
  revalidatePath("/admin/berichten");
  revalidatePath("/admin", "layout");
  return success(msg.handled ? "Bericht weer als open gemarkeerd." : "Bericht gemarkeerd als afgehandeld.");
}

export async function deleteMessage(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = idSchema.safeParse({ id: formData.get("id") });
  if (!parsed.success) return failure("Ongeldig bericht.");
  await prisma.contactMessage.delete({ where: { id: parsed.data.id } }).catch(() => null);
  revalidatePath("/admin/berichten");
  revalidatePath("/admin", "layout");
  return success("Bericht verwijderd.");
}
