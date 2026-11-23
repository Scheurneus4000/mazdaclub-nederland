import type { Metadata } from "next";
import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/page-title";
import { ProductForm } from "@/components/admin/product-form";
import { Alert } from "@/components/ui/form-controls";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

export const metadata: Metadata = { title: "Nieuw product" };
export const dynamic = "force-dynamic";

export default async function NewProductPage() {
  await requireAdmin();
  const categories = await prisma.productCategory.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { id: true, name: true } });
  return (
    <>
      <AdminPageHeader title="Nieuw product" back={{ href: "/admin/producten", label: "Producten" }} />
      {categories.length === 0 ? (
        <Alert variant="warning">
          Er zijn nog geen categorieën. Maak eerst een categorie aan op de{" "}
          <Link href="/admin/producten" className="font-semibold underline">
            productenpagina
          </Link>
          .
        </Alert>
      ) : (
        <ProductForm categories={categories} />
      )}
    </>
  );
}
