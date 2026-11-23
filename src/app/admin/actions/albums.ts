"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { fromAmsterdamInput } from "@/components/admin/datetime";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { deleteObject } from "@/lib/storage";
import { slugify } from "@/lib/utils";
import { albumAdminSchema, fieldErrors } from "@/lib/validation";
import { failure, success, type ActionState } from "./state";

const idSchema = z.object({ id: z.string().min(1).max(64) });

async function uniqueAlbumSlug(base: string, excludeId?: string): Promise<string> {
  const root = base || "album";
  let slug = root;
  let i = 2;
  while (await prisma.album.findFirst({ where: { slug, ...(excludeId ? { NOT: { id: excludeId } } : {}) }, select: { id: true } })) {
    slug = `${root}-${i++}`;
  }
  return slug;
}

function revalidateAlbum(id?: string, slug?: string) {
  revalidatePath("/admin/fotoalbums");
  if (id) revalidatePath(`/admin/fotoalbums/${id}`);
  revalidatePath("/fotogalerij");
  if (slug) revalidatePath(`/fotogalerij/${slug}`);
  revalidatePath("/");
}

export async function saveAlbum(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const id = (formData.get("id") as string | null) || undefined;
  if (!fromAmsterdamInput(formData.get("date"))) return failure("Controleer de gemarkeerde velden.", { date: "Vul een geldige datum in" });
  const parsed = albumAdminSchema.safeParse({
    title: formData.get("title") ?? "",
    slug: formData.get("slug") ?? "",
    description: formData.get("description") ?? "",
    date: fromAmsterdamInput(formData.get("date")) ?? undefined,
    eventId: formData.get("eventId") ?? "",
    published: formData.get("published") === "on",
  });
  if (!parsed.success) return failure("Controleer de gemarkeerde velden.", fieldErrors(parsed.error));
  const data = parsed.data;

  if (data.eventId) {
    const event = await prisma.event.findUnique({ where: { id: data.eventId }, select: { id: true } });
    if (!event) return failure("Controleer de gemarkeerde velden.", { eventId: "Onbekend evenement" });
  }

  const slug = await uniqueAlbumSlug(slugify(data.slug || data.title), id);
  const record = {
    title: data.title,
    slug,
    description: data.description || null,
    date: data.date,
    eventId: data.eventId || null,
    published: data.published,
  };

  if (!id) {
    const created = await prisma.album.create({ data: record });
    revalidateAlbum(created.id, created.slug);
    redirect(`/admin/fotoalbums/${created.id}?aangemaakt=1`);
  }

  const before = await prisma.album.findUnique({ where: { id }, select: { slug: true } });
  if (!before) return failure("Album niet gevonden.");
  const updated = await prisma.album.update({ where: { id }, data: record });
  revalidateAlbum(updated.id, updated.slug);
  if (before.slug !== updated.slug) revalidatePath(`/fotogalerij/${before.slug}`);
  return success("Album opgeslagen.");
}

export async function deleteAlbum(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = idSchema.safeParse({ id: formData.get("id") });
  if (!parsed.success) return failure("Ongeldig album.");
  const album = await prisma.album.findUnique({ where: { id: parsed.data.id }, include: { photos: { select: { storageKey: true, thumbKey: true } } } });
  if (!album) return failure("Album niet gevonden.");

  await prisma.album.delete({ where: { id: album.id } });
  await Promise.all(album.photos.flatMap((p) => [deleteObject(p.storageKey), deleteObject(p.thumbKey)]));
  revalidateAlbum(undefined, album.slug);
  redirect("/admin/fotoalbums?verwijderd=1");
}

const captionSchema = idSchema.extend({ caption: z.string().trim().max(300) });

export async function updatePhotoCaption(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = captionSchema.safeParse({ id: formData.get("id"), caption: formData.get("caption") ?? "" });
  if (!parsed.success) return failure("Bijschrift is te lang (max. 300 tekens).");
  const photo = await prisma.photo.update({
    where: { id: parsed.data.id },
    data: { caption: parsed.data.caption || null },
    include: { album: { select: { id: true, slug: true } } },
  }).catch(() => null);
  if (!photo) return failure("Foto niet gevonden.");
  revalidateAlbum(photo.album.id, photo.album.slug);
  return success("Bijschrift opgeslagen.");
}

export async function setAlbumCover(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = idSchema.safeParse({ id: formData.get("id") });
  if (!parsed.success) return failure("Ongeldige foto.");
  const photo = await prisma.photo.findUnique({ where: { id: parsed.data.id }, include: { album: { select: { id: true, slug: true } } } });
  if (!photo) return failure("Foto niet gevonden.");
  await prisma.album.update({ where: { id: photo.albumId }, data: { coverUrl: photo.thumbUrl } });
  revalidateAlbum(photo.album.id, photo.album.slug);
  return success("Omslagfoto ingesteld.");
}

export async function deletePhoto(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = idSchema.safeParse({ id: formData.get("id") });
  if (!parsed.success) return failure("Ongeldige foto.");
  const photo = await prisma.photo.findUnique({ where: { id: parsed.data.id }, include: { album: true } });
  if (!photo) return failure("Foto niet gevonden.");

  await prisma.photo.delete({ where: { id: photo.id } });
  if (photo.album.coverUrl === photo.thumbUrl || photo.album.coverUrl === photo.url) {
    const next = await prisma.photo.findFirst({ where: { albumId: photo.albumId }, orderBy: { sortOrder: "asc" }, select: { thumbUrl: true } });
    await prisma.album.update({ where: { id: photo.albumId }, data: { coverUrl: next?.thumbUrl ?? null } });
  }
  await Promise.all([deleteObject(photo.storageKey), deleteObject(photo.thumbKey)]);
  revalidateAlbum(photo.album.id, photo.album.slug);
  return success("Foto verwijderd.");
}

const bulkSchema = z.object({ albumId: z.string().min(1).max(64), ids: z.array(z.string().min(1).max(64)).min(1, "Selecteer eerst één of meer foto's.").max(500) });

/** Meerdere foto's tegelijk verwijderen (inclusief opslag). */
export async function deletePhotos(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = bulkSchema.safeParse({ albumId: formData.get("albumId"), ids: formData.getAll("ids").filter((v) => typeof v === "string") });
  if (!parsed.success) return failure(parsed.error.issues[0]?.message ?? "Ongeldige selectie.");
  const { albumId, ids } = parsed.data;

  const album = await prisma.album.findUnique({ where: { id: albumId }, select: { id: true, slug: true, coverUrl: true } });
  if (!album) return failure("Album niet gevonden.");
  const photos = await prisma.photo.findMany({ where: { id: { in: ids }, albumId }, select: { id: true, url: true, thumbUrl: true, storageKey: true, thumbKey: true } });
  if (photos.length === 0) return failure("De geselecteerde foto's zijn niet gevonden.");

  await prisma.photo.deleteMany({ where: { id: { in: photos.map((p) => p.id) } } });
  if (photos.some((p) => album.coverUrl === p.thumbUrl || album.coverUrl === p.url)) {
    const next = await prisma.photo.findFirst({ where: { albumId }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }], select: { thumbUrl: true } });
    await prisma.album.update({ where: { id: albumId }, data: { coverUrl: next?.thumbUrl ?? null } });
  }
  await Promise.all(photos.flatMap((p) => [deleteObject(p.storageKey), deleteObject(p.thumbKey)]));
  revalidateAlbum(album.id, album.slug);
  return success(`${photos.length} foto${photos.length === 1 ? "" : "'s"} verwijderd.`);
}

const moveSchema = idSchema.extend({ direction: z.enum(["up", "down"]) });

export async function movePhoto(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = moveSchema.safeParse({ id: formData.get("id"), direction: formData.get("direction") });
  if (!parsed.success) return failure("Ongeldige invoer.");
  const photo = await prisma.photo.findUnique({ where: { id: parsed.data.id }, include: { album: { select: { id: true, slug: true } } } });
  if (!photo) return failure("Foto niet gevonden.");

  // Volgorde normaliseren en daarna wisselen met de buur.
  const photos = await prisma.photo.findMany({ where: { albumId: photo.albumId }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }], select: { id: true } });
  const index = photos.findIndex((p) => p.id === photo.id);
  const target = parsed.data.direction === "up" ? index - 1 : index + 1;
  if (target < 0 || target >= photos.length) return failure("Deze foto staat al aan de rand.");
  [photos[index], photos[target]] = [photos[target], photos[index]];
  await prisma.$transaction(photos.map((p, i) => prisma.photo.update({ where: { id: p.id }, data: { sortOrder: i } })));
  revalidateAlbum(photo.album.id, photo.album.slug);
  return success("Volgorde aangepast.");
}
