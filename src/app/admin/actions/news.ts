"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { fromAmsterdamInput } from "@/components/admin/datetime";
import { imageUrlHint, isAllowedImageUrl } from "@/components/admin/image-hosts";
import { prisma } from "@/lib/db";
import { newsAdminSchema } from "@/lib/news";
import { richTextToPlain, sanitizeRichText } from "@/lib/rich-text";
import { requireAdmin } from "@/lib/session";
import { formatDateTime, slugify } from "@/lib/utils";
import { fieldErrors } from "@/lib/validation";
import { failure, success, type ActionState } from "./state";

const idSchema = z.object({ id: z.string().min(1).max(64) });

function str(formData: FormData, key: string): string {
  const v = formData.get(key);
  return typeof v === "string" ? v : "";
}

async function uniqueNewsSlug(base: string, excludeId?: string): Promise<string> {
  const root = base || "nieuwsbericht";
  let slug = root;
  let i = 2;
  while (await prisma.newsPost.findFirst({ where: { slug, ...(excludeId ? { NOT: { id: excludeId } } : {}) }, select: { id: true } })) {
    slug = `${root}-${i++}`;
  }
  return slug;
}

function revalidateNews(id?: string, slug?: string) {
  revalidatePath("/admin/nieuws");
  if (id) revalidatePath(`/admin/nieuws/${id}`);
  revalidatePath("/nieuws");
  if (slug) revalidatePath(`/nieuws/${slug}`);
  revalidatePath("/");
  revalidatePath("/sitemap.xml");
}

function savedMessage(published: boolean, publishedAt: Date | null): string {
  if (!published) return "Opgeslagen als concept. Het bericht is nog niet zichtbaar op de website.";
  if (publishedAt && publishedAt > new Date()) return `Opgeslagen en ingepland: het bericht verschijnt op ${formatDateTime(publishedAt)}.`;
  return "Opgeslagen en gepubliceerd. Het bericht staat op de website.";
}

export async function saveNews(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const id = str(formData, "id") || undefined;

  const parsed = newsAdminSchema.safeParse({
    title: str(formData, "title"),
    slug: str(formData, "slug"),
    excerpt: str(formData, "excerpt"),
    content: str(formData, "content"),
    coverUrl: str(formData, "coverUrl"),
    published: formData.get("published") === "1",
    publishedAt: fromAmsterdamInput(formData.get("publishedAt")),
    authorName: str(formData, "authorName"),
  });
  if (!parsed.success) return failure("Controleer de gemarkeerde velden.", fieldErrors(parsed.error));
  const data = parsed.data;

  const content = sanitizeRichText(data.content);
  const fields: Record<string, string> = {};
  if (richTextToPlain(content).length < 20) fields.content = "Schrijf een tekst van minimaal 20 tekens";
  if (!isAllowedImageUrl(data.coverUrl)) fields.coverUrl = imageUrlHint;
  if (Object.keys(fields).length) return failure("Controleer de gemarkeerde velden.", fields);

  const existing = id ? await prisma.newsPost.findUnique({ where: { id }, select: { slug: true, publishedAt: true } }) : null;
  if (id && !existing) return failure("Nieuwsbericht niet gevonden.");

  // Publiceren zonder datum = nu (of de eerdere publicatiedatum bij een al gepubliceerd bericht).
  const publishedAt = data.published ? (data.publishedAt ?? existing?.publishedAt ?? new Date()) : data.publishedAt;

  const slug = await uniqueNewsSlug(slugify(data.slug || data.title), id);
  const record = {
    title: data.title,
    slug,
    excerpt: data.excerpt,
    content,
    coverUrl: data.coverUrl || null,
    published: data.published,
    publishedAt,
    authorName: data.authorName || `${admin.firstName} ${admin.lastName}`.trim() || null,
  };

  if (!id) {
    const created = await prisma.newsPost.create({ data: record });
    revalidateNews(created.id, created.slug);
    redirect(`/admin/nieuws/${created.id}?aangemaakt=1`);
  }

  const updated = await prisma.newsPost.update({ where: { id }, data: record });
  revalidateNews(updated.id, updated.slug);
  if (existing && existing.slug !== updated.slug) revalidatePath(`/nieuws/${existing.slug}`);
  return success(savedMessage(updated.published, updated.publishedAt));
}

/** Snel publiceren of offline halen vanuit het overzicht. */
export async function toggleNewsPublished(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = idSchema.safeParse({ id: formData.get("id") });
  if (!parsed.success) return failure("Ongeldig nieuwsbericht.");

  const post = await prisma.newsPost.findUnique({ where: { id: parsed.data.id }, select: { id: true, slug: true, published: true, publishedAt: true } });
  if (!post) return failure("Nieuwsbericht niet gevonden.");

  const published = !post.published;
  const publishedAt = published ? (post.publishedAt ?? new Date()) : post.publishedAt;
  await prisma.newsPost.update({ where: { id: post.id }, data: { published, publishedAt } });
  revalidateNews(post.id, post.slug);
  return success(published ? savedMessage(true, publishedAt) : "Het bericht is offline gehaald en staat weer als concept opgeslagen.");
}

export async function deleteNews(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = idSchema.safeParse({ id: formData.get("id") });
  if (!parsed.success) return failure("Ongeldig nieuwsbericht.");

  const post = await prisma.newsPost.delete({ where: { id: parsed.data.id } }).catch(() => null);
  if (!post) return failure("Nieuwsbericht niet gevonden.");
  revalidateNews(undefined, post.slug);
  redirect("/admin/nieuws?verwijderd=1");
}
