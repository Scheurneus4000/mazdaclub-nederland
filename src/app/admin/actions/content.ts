"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { imageUrlHint, isAllowedImageUrl } from "@/components/admin/image-hosts";
import { contentDefaults, contentFields, type ContentKey } from "@/lib/content";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { failure, success, type ActionState } from "./state";

const FIELD_BY_KEY = new Map(contentFields.map((f) => [f.key, f]));

/**
 * Slaat de velden op die in dit formulier (tabblad) staan. Waarden die gelijk zijn aan de
 * standaardwaarde worden niet opgeslagen, zodat verbeterde standaardteksten automatisch doorwerken.
 */
export async function saveContent(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();

  const keys = formData
    .getAll("__keys")
    .filter((k): k is string => typeof k === "string")
    .filter((k): k is ContentKey => FIELD_BY_KEY.has(k as ContentKey));
  if (keys.length === 0) return failure("Er is niets om op te slaan.");

  const values = new Map<ContentKey, string>();
  const errors: Record<string, string> = {};

  for (const key of keys) {
    const def = FIELD_BY_KEY.get(key)!;
    const raw = formData.get(key);
    if (typeof raw !== "string") continue;
    const value = def.type === "textarea" ? raw.replace(/\r\n/g, "\n").trim() : raw.trim();
    const max = def.maxLength ?? (def.type === "textarea" ? 2000 : 500);

    if (def.required && !value) {
      errors[key] = "Dit veld mag niet leeg zijn. Gebruik eventueel 'Standaard terugzetten'.";
      continue;
    }
    if (value.length > max) {
      errors[key] = `Maximaal ${max} tekens (nu ${value.length})`;
      continue;
    }
    if (value && def.type === "email" && !z.string().email().safeParse(value).success) {
      errors[key] = "Vul een geldig e-mailadres in";
      continue;
    }
    if (value && def.type === "url" && !/^https:\/\/[^\s]+\.[^\s]+$/.test(value)) {
      errors[key] = "Gebruik een volledige link die begint met https://, of laat leeg";
      continue;
    }
    if (value && ["image", "logo", "favicon"].includes(def.type) && !isAllowedImageUrl(value)) {
      errors[key] = imageUrlHint;
      continue;
    }
    values.set(key, value);
  }
  if (Object.keys(errors).length) return failure("Controleer de gemarkeerde velden.", errors);

  const toDelete = [...values].filter(([key, value]) => value === contentDefaults[key]).map(([key]) => key);
  const toUpsert = [...values].filter(([key, value]) => value !== contentDefaults[key]);

  await prisma.$transaction([
    ...(toDelete.length ? [prisma.siteContent.deleteMany({ where: { key: { in: toDelete } } })] : []),
    ...toUpsert.map(([key, value]) => prisma.siteContent.upsert({ where: { key }, update: { value }, create: { key, value } })),
  ]);

  revalidatePath("/", "layout");
  return success("Opgeslagen. De wijzigingen zijn direct zichtbaar op de website.");
}
