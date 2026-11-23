"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { imageUrlHint, isAllowedImageUrl } from "@/components/admin/image-hosts";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { parseEuroToCents, slugify } from "@/lib/utils";
import { fieldErrors, productAdminSchema } from "@/lib/validation";
import { failure, success, type ActionState } from "./state";

/** Ruwe vorm zoals het productformulier (client) hem als JSON meestuurt. */
const payloadSchema = z.object({
  id: z.string().max(64).optional(),
  name: z.string().max(200),
  slug: z.string().max(120),
  categoryId: z.string().max(64),
  basePrice: z.string().max(20),
  description: z.string().max(20000),
  active: z.boolean(),
  featured: z.boolean(),
  images: z.array(z.string().max(500)).max(12),
  variants: z
    .array(
      z.object({
        id: z.string().max(64).optional(),
        name: z.string().max(200),
        sku: z.string().max(80),
        price: z.string().max(20),
        stock: z.string().max(10),
        active: z.boolean(),
        attributes: z.string().max(500),
      }),
    )
    .max(100),
});

export type ProductFormPayload = z.infer<typeof payloadSchema>;

/** "maat=L, kleur=Zwart" → { maat: "L", kleur: "Zwart" } */
function parseAttributes(input: string): Record<string, string> | null {
  const out: Record<string, string> = {};
  for (const part of input.split(",")) {
    const [k, ...rest] = part.split("=");
    const key = k?.trim().toLowerCase();
    const value = rest.join("=").trim();
    if (key && value) out[key.slice(0, 40)] = value.slice(0, 80);
  }
  return Object.keys(out).length ? out : null;
}

async function uniqueProductSlug(base: string, excludeId?: string): Promise<string> {
  const root = base || "product";
  let slug = root;
  let i = 2;
  while (await prisma.product.findFirst({ where: { slug, ...(excludeId ? { NOT: { id: excludeId } } : {}) }, select: { id: true } })) {
    slug = `${root}-${i++}`;
  }
  return slug;
}

function revalidateShop(id?: string, slug?: string) {
  revalidatePath("/admin/producten");
  if (id) revalidatePath(`/admin/producten/${id}`);
  revalidatePath("/webshop");
  if (slug) revalidatePath(`/webshop/${slug}`);
  revalidatePath("/");
}

export async function saveProduct(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  let raw: unknown;
  try {
    raw = JSON.parse(String(formData.get("payload") ?? ""));
  } catch {
    return failure("Ongeldige invoer.");
  }
  const payload = payloadSchema.safeParse(raw);
  if (!payload.success) return failure("Ongeldige invoer.");
  const p = payload.data;
  const id = p.id || undefined;

  const parsed = productAdminSchema.safeParse({
    name: p.name,
    slug: p.slug,
    description: p.description,
    categoryId: p.categoryId,
    basePrice: parseEuroToCents(p.basePrice),
    images: p.images.map((u) => u.trim()).filter(Boolean),
    active: p.active,
    featured: p.featured,
    variants: p.variants.map((v) => ({
      id: v.id || undefined,
      name: v.name,
      sku: v.sku.trim().toUpperCase(),
      price: v.price.trim() === "" ? null : parseEuroToCents(v.price),
      stock: v.stock === "" ? 0 : v.stock,
      active: v.active,
      attributes: parseAttributes(v.attributes),
    })),
  });
  if (!parsed.success) return failure("Controleer de gemarkeerde velden.", fieldErrors(parsed.error));
  const data = parsed.data;

  const errors: Record<string, string> = {};
  data.images.forEach((url, i) => {
    if (!isAllowedImageUrl(url)) errors[`images.${i}`] = imageUrlHint;
  });
  if (errors[Object.keys(errors)[0]]) errors.images = imageUrlHint;

  const skus = data.variants.map((v) => v.sku);
  skus.forEach((sku, i) => {
    if (skus.indexOf(sku) !== i) errors[`variants.${i}.sku`] = "Deze SKU komt dubbel voor";
  });
  const ownVariantIds = data.variants.map((v) => v.id).filter((v): v is string => !!v);
  const clashes = await prisma.productVariant.findMany({
    where: { sku: { in: skus }, ...(id ? { NOT: { productId: id } } : {}) },
    select: { sku: true },
  });
  for (const c of clashes) {
    const i = skus.indexOf(c.sku);
    if (i >= 0) errors[`variants.${i}.sku`] = "Deze SKU is al in gebruik bij een ander product";
  }
  const category = await prisma.productCategory.findUnique({ where: { id: data.categoryId }, select: { id: true } });
  if (!category) errors.categoryId = "Kies een geldige categorie";
  if (Object.keys(errors).length) return failure("Controleer de gemarkeerde velden.", errors);

  const slug = await uniqueProductSlug(slugify(data.slug || data.name), id);
  const productData = {
    name: data.name,
    slug,
    description: data.description,
    categoryId: data.categoryId,
    basePrice: data.basePrice,
    images: data.images,
    active: data.active,
    featured: data.featured,
  };

  let savedId: string;
  let deactivated = 0;
  try {
    const saved = await prisma.$transaction(async (tx) => {
      const product = id ? await tx.product.update({ where: { id }, data: productData }) : await tx.product.create({ data: productData });

      const existing = await tx.productVariant.findMany({
        where: { productId: product.id },
        select: { id: true, _count: { select: { orderItems: true } } },
      });
      const existingIds = new Set(existing.map((e) => e.id));

      // Verwijderde varianten: weg als er nooit op besteld is, anders alleen deactiveren.
      for (const ex of existing) {
        if (ownVariantIds.includes(ex.id)) continue;
        if (ex._count.orderItems > 0) {
          await tx.productVariant.update({ where: { id: ex.id }, data: { active: false } });
          deactivated++;
        } else {
          await tx.productVariant.delete({ where: { id: ex.id } });
        }
      }

      for (const [index, v] of data.variants.entries()) {
        const variantData = {
          name: v.name,
          sku: v.sku,
          price: v.price ?? null,
          stock: v.stock,
          active: v.active,
          attributes: v.attributes ?? Prisma.DbNull,
          sortOrder: index,
        };
        if (v.id && existingIds.has(v.id)) {
          await tx.productVariant.update({ where: { id: v.id }, data: variantData });
        } else {
          await tx.productVariant.create({ data: { ...variantData, productId: product.id } });
        }
      }
      return product;
    });
    savedId = saved.id;
    revalidateShop(saved.id, saved.slug);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return failure("Een SKU of URL-naam is al in gebruik. Kies een unieke waarde.");
    }
    console.error("[admin] product opslaan mislukt", err);
    return failure("Opslaan mislukt. Probeer het opnieuw.");
  }

  if (!id) redirect(`/admin/producten/${savedId}?aangemaakt=1`);
  return success(
    deactivated > 0
      ? `Product opgeslagen. ${deactivated} verwijderde variant(en) met bestelgeschiedenis zijn gedeactiveerd in plaats van verwijderd.`
      : "Product opgeslagen.",
  );
}

const idSchema = z.object({ id: z.string().min(1).max(64) });

export async function toggleProductActive(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = idSchema.safeParse({ id: formData.get("id") });
  if (!parsed.success) return failure("Ongeldig product.");
  const product = await prisma.product.findUnique({ where: { id: parsed.data.id }, select: { active: true } });
  if (!product) return failure("Product niet gevonden.");
  const updated = await prisma.product.update({ where: { id: parsed.data.id }, data: { active: !product.active } });
  revalidateShop(updated.id, updated.slug);
  return success(updated.active ? "Product staat weer in de webshop." : "Product is verborgen in de webshop.");
}

export async function deleteProduct(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = idSchema.safeParse({ id: formData.get("id") });
  if (!parsed.success) return failure("Ongeldig product.");
  const product = await prisma.product.findUnique({
    where: { id: parsed.data.id },
    select: { id: true, slug: true, _count: { select: { orderItems: true } } },
  });
  if (!product) return failure("Product niet gevonden.");

  if (product._count.orderItems > 0) {
    await prisma.product.update({ where: { id: product.id }, data: { active: false } });
    revalidateShop(product.id, product.slug);
    return success("Dit product komt voor in bestellingen en is daarom gedeactiveerd in plaats van verwijderd.");
  }
  await prisma.product.delete({ where: { id: product.id } });
  revalidateShop(undefined, product.slug);
  redirect("/admin/producten?verwijderd=1");
}

const categorySchema = z.object({ name: z.string().trim().min(2, "Naam is verplicht").max(80), description: z.string().trim().max(300).optional() });

export async function createCategory(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = categorySchema.safeParse({ name: formData.get("name"), description: formData.get("description") || undefined });
  if (!parsed.success) return failure("Controleer de invoer.", fieldErrors(parsed.error));

  const base = slugify(parsed.data.name) || "categorie";
  let slug = base;
  let i = 2;
  while (await prisma.productCategory.findUnique({ where: { slug }, select: { id: true } })) slug = `${base}-${i++}`;
  const max = await prisma.productCategory.aggregate({ _max: { sortOrder: true } });
  await prisma.productCategory.create({
    data: { name: parsed.data.name, slug, description: parsed.data.description || null, sortOrder: (max._max.sortOrder ?? 0) + 1 },
  });
  revalidatePath("/admin/producten");
  revalidatePath("/webshop");
  return success(`Categorie "${parsed.data.name}" toegevoegd.`);
}

export async function deleteCategory(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = idSchema.safeParse({ id: formData.get("id") });
  if (!parsed.success) return failure("Ongeldige categorie.");
  const count = await prisma.product.count({ where: { categoryId: parsed.data.id } });
  if (count > 0) return failure(`Deze categorie bevat nog ${count} product(en). Verplaats die eerst.`);
  await prisma.productCategory.delete({ where: { id: parsed.data.id } }).catch(() => null);
  revalidatePath("/admin/producten");
  revalidatePath("/webshop");
  return success("Categorie verwijderd.");
}
