import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { Eye, EyeOff, Plus, Trash2 } from "lucide-react";
import { deleteCategory, toggleProductActive } from "@/app/admin/actions/products";
import { ActionButton } from "@/components/admin/action-button";
import { CategoryForm } from "@/components/admin/category-form";
import { AdminPageHeader, AdminSection, TableEmpty } from "@/components/admin/page-title";
import { ADMIN_PAGE_SIZE, Pagination, parsePage } from "@/components/admin/pagination";
import { readParam, SearchForm } from "@/components/admin/search-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/form-controls";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { formatPrice } from "@/lib/utils";

export const metadata: Metadata = { title: "Producten" };
export const dynamic = "force-dynamic";

const LOW_STOCK = 5;

export default async function AdminProductsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdmin();
  const sp = await searchParams;
  const q = readParam(sp.q);
  const categorie = readParam(sp.categorie) || "alle";
  const voorraad = readParam(sp.voorraad) || "alle";
  const page = parsePage(sp.pagina);

  const where: Prisma.ProductWhereInput = {};
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { variants: { some: { sku: { contains: q, mode: "insensitive" } } } },
    ];
  }
  if (categorie !== "alle") where.categoryId = categorie;
  if (voorraad === "laag") where.variants = { some: { active: true, stock: { lte: LOW_STOCK } } };
  if (voorraad === "inactief") where.active = false;

  const [categories, total, products] = await Promise.all([
    prisma.productCategory.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], include: { _count: { select: { products: true } } } }),
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      orderBy: [{ category: { sortOrder: "asc" } }, { name: "asc" }],
      skip: (page - 1) * ADMIN_PAGE_SIZE,
      take: ADMIN_PAGE_SIZE,
      include: { category: { select: { name: true } }, variants: { select: { price: true, stock: true, active: true } } },
    }),
  ]);

  return (
    <>
      <AdminPageHeader
        title="Producten"
        description="Assortiment, varianten en voorraad van de webshop."
        actions={
          <Button asChild>
            <Link href="/admin/producten/nieuw">
              <Plus /> Nieuw product
            </Link>
          </Button>
        }
      />
      {sp.verwijderd && (
        <Alert variant="success" className="mb-6">
          Het product is verwijderd.
        </Alert>
      )}

      <div className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="overflow-hidden rounded-xl border border-border bg-white shadow-xs">
          <SearchForm
            action="/admin/producten"
            q={q}
            placeholder="Zoek op naam of SKU"
            filters={[
              {
                name: "categorie",
                label: "Categorie",
                value: categorie,
                options: [{ value: "alle", label: "Alle categorieën" }, ...categories.map((c) => ({ value: c.id, label: c.name }))],
              },
              {
                name: "voorraad",
                label: "Voorraad",
                value: voorraad,
                options: [
                  { value: "alle", label: "Alle producten" },
                  { value: "laag", label: `Lage voorraad (≤ ${LOW_STOCK})` },
                  { value: "inactief", label: "Verborgen producten" },
                ],
              },
            ]}
          />
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Categorie</TableHead>
                <TableHead className="text-right">Prijs</TableHead>
                <TableHead className="text-right">Voorraad</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.length === 0 && <TableEmpty colSpan={6}>Geen producten gevonden.</TableEmpty>}
              {products.map((p) => {
                const active = p.variants.filter((v) => v.active);
                const prices = active.map((v) => v.price ?? p.basePrice);
                const min = prices.length ? Math.min(...prices) : p.basePrice;
                const max = prices.length ? Math.max(...prices) : p.basePrice;
                const stock = active.reduce((s, v) => s + v.stock, 0);
                const low = active.some((v) => v.stock <= LOW_STOCK);
                return (
                  <TableRow key={p.id}>
                    <TableCell className="min-w-64">
                      <div className="flex items-center gap-3">
                        <div className="size-11 shrink-0 overflow-hidden rounded-md border border-border bg-surface">
                          {p.images[0] && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={p.images[0]} alt="" className="size-full object-contain p-1" />
                          )}
                        </div>
                        <div>
                          <Link href={`/admin/producten/${p.id}`} className="font-semibold hover:text-primary">
                            {p.name}
                          </Link>
                          <p className="text-xs text-muted-foreground">
                            {active.length} variant{active.length === 1 ? "" : "en"}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{p.category.name}</TableCell>
                    <TableCell className="text-right whitespace-nowrap tabular-nums">
                      {min === max ? formatPrice(min) : `${formatPrice(min)} – ${formatPrice(max)}`}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="font-semibold tabular-nums">{stock}</span>
                      {stock === 0 ? (
                        <Badge variant="danger" className="ml-2">
                          Uitverkocht
                        </Badge>
                      ) : low ? (
                        <Badge variant="warning" className="ml-2">
                          Laag
                        </Badge>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {p.active ? <Badge variant="success">Actief</Badge> : <Badge variant="secondary">Verborgen</Badge>}
                        {p.featured && <Badge variant="info">Uitgelicht</Badge>}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <ActionButton action={toggleProductActive} fields={{ id: p.id }} variant="ghost" title={p.active ? "Verbergen" : "Tonen"}>
                        {p.active ? <EyeOff /> : <Eye />}
                      </ActionButton>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <Pagination page={page} total={total} basePath="/admin/producten" params={{ q, categorie: categorie !== "alle" ? categorie : undefined, voorraad: voorraad !== "alle" ? voorraad : undefined }} />
        </div>

        <AdminSection title="Categorieën" description="Indeling van de webshop.">
          <ul className="mb-5 divide-y divide-border">
            {categories.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <span>
                  <span className="font-medium">{c.name}</span>
                  <span className="ml-2 text-xs text-muted-foreground tabular-nums">{c._count.products}</span>
                </span>
                {c._count.products === 0 && (
                  <ActionButton action={deleteCategory} fields={{ id: c.id }} variant="ghost" confirm={`Categorie "${c.name}" verwijderen?`} title="Verwijderen">
                    <Trash2 />
                  </ActionButton>
                )}
              </li>
            ))}
            {categories.length === 0 && <li className="py-3 text-sm text-muted-foreground">Nog geen categorieën.</li>}
          </ul>
          <CategoryForm />
        </AdminSection>
      </div>
    </>
  );
}
