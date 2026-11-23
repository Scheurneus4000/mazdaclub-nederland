import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, Trash2 } from "lucide-react";
import { deleteProduct } from "@/app/admin/actions/products";
import { ActionButton } from "@/components/admin/action-button";
import { AdminPageHeader, AdminSection } from "@/components/admin/page-title";
import { ProductForm, type ProductFormValues } from "@/components/admin/product-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/form-controls";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

export const metadata: Metadata = { title: "Product bewerken" };
export const dynamic = "force-dynamic";

const euro = (cents: number | null) => (cents === null ? "" : (cents / 100).toFixed(2).replace(".", ","));

function attributesToString(value: unknown): string {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "";
  return Object.entries(value as Record<string, unknown>)
    .map(([k, v]) => `${k}=${String(v)}`)
    .join(", ");
}

export default async function EditProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();
  const { id } = await params;
  const sp = await searchParams;

  const [product, categories, sold] = await Promise.all([
    prisma.product.findUnique({
      where: { id },
      include: { variants: { orderBy: { sortOrder: "asc" }, include: { _count: { select: { orderItems: true } } } } },
    }),
    prisma.productCategory.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { id: true, name: true } }),
    prisma.orderItem.aggregate({ where: { productId: id, order: { status: { in: ["PAID", "PROCESSING", "SHIPPED", "COMPLETED"] } } }, _sum: { quantity: true, lineTotal: true } }),
  ]);
  if (!product) notFound();

  const initial: ProductFormValues = {
    id: product.id,
    name: product.name,
    slug: product.slug,
    categoryId: product.categoryId,
    basePrice: euro(product.basePrice),
    description: product.description,
    active: product.active,
    featured: product.featured,
    images: product.images,
    variants: product.variants.map((v) => ({
      id: v.id,
      name: v.name,
      sku: v.sku,
      price: euro(v.price),
      stock: String(v.stock),
      active: v.active,
      attributes: attributesToString(v.attributes),
      hasOrders: v._count.orderItems > 0,
    })),
  };

  return (
    <>
      <AdminPageHeader
        title={product.name}
        badge={product.active ? <Badge variant="success">Actief</Badge> : <Badge variant="secondary">Verborgen</Badge>}
        description={`${sold._sum.quantity ?? 0} stuks verkocht · omzet € ${((sold._sum.lineTotal ?? 0) / 100).toFixed(2).replace(".", ",")}`}
        back={{ href: "/admin/producten", label: "Producten" }}
        actions={
          product.active ? (
            <Button asChild variant="outline" size="sm">
              <Link href={`/webshop/${product.slug}`} target="_blank">
                <ExternalLink /> Bekijk in webshop
              </Link>
            </Button>
          ) : undefined
        }
      />
      {sp.aangemaakt && (
        <Alert variant="success" className="mb-6">
          Het product is aangemaakt.
        </Alert>
      )}
      {/* key: na opslaan opnieuw initialiseren met de verse gegevens (incl. nieuwe variant-id's). */}
      <ProductForm key={product.updatedAt.toISOString()} initial={initial} categories={categories} />
      <AdminSection title="Product verwijderen" description="Producten die al besteld zijn worden gedeactiveerd in plaats van verwijderd." className="mt-8">
        <ActionButton action={deleteProduct} fields={{ id: product.id }} variant="destructive" size="default" confirm={`"${product.name}" verwijderen?`}>
          <Trash2 /> Product verwijderen
        </ActionButton>
      </AdminSection>
    </>
  );
}
