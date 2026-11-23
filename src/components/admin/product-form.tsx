"use client";

import * as React from "react";
import { ArrowLeft, ArrowRight, ImagePlus, Link2, Loader2, Plus, Save, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { saveProduct } from "@/app/admin/actions/products";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, FieldError, NativeSelect } from "@/components/ui/form-controls";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn, slugify } from "@/lib/utils";
import { uploadFile } from "./upload-client";
import { useFormAction } from "./use-form-action";

export type ProductFormVariant = {
  id?: string;
  name: string;
  sku: string;
  price: string;
  stock: string;
  active: boolean;
  attributes: string;
  hasOrders?: boolean;
};

export type ProductFormValues = {
  id?: string;
  name: string;
  slug: string;
  categoryId: string;
  basePrice: string;
  description: string;
  active: boolean;
  featured: boolean;
  images: string[];
  variants: ProductFormVariant[];
};

const emptyVariant = (): ProductFormVariant => ({ name: "Standaard", sku: "", price: "", stock: "0", active: true, attributes: "" });

export function ProductForm({ initial, categories }: { initial?: ProductFormValues; categories: Array<{ id: string; name: string }> }) {
  const { onSubmit, pending, errors } = useFormAction(saveProduct);
  const [values, setValues] = React.useState<ProductFormValues>(
    initial ?? {
      name: "",
      slug: "",
      categoryId: categories[0]?.id ?? "",
      basePrice: "",
      description: "",
      active: true,
      featured: false,
      images: [],
      variants: [emptyVariant()],
    },
  );
  const [slugTouched, setSlugTouched] = React.useState(!!initial);
  const [uploading, setUploading] = React.useState<number | null>(null);
  const [urlInput, setUrlInput] = React.useState("");
  const fileRef = React.useRef<HTMLInputElement>(null);

  const set = <K extends keyof ProductFormValues>(key: K, value: ProductFormValues[K]) => setValues((v) => ({ ...v, [key]: value }));
  const setVariant = (i: number, patch: Partial<ProductFormVariant>) =>
    setValues((v) => ({ ...v, variants: v.variants.map((row, idx) => (idx === i ? { ...row, ...patch } : row)) }));

  function moveImage(i: number, dir: -1 | 1) {
    setValues((v) => {
      const images = [...v.images];
      const j = i + dir;
      if (j < 0 || j >= images.length) return v;
      [images[i], images[j]] = [images[j], images[i]];
      return { ...v, images };
    });
  }

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    const list = Array.from(files).slice(0, 12 - values.images.length);
    for (const [index, file] of list.entries()) {
      setUploading(Math.round((index / list.length) * 100));
      try {
        const uploaded = await uploadFile(file, { folder: "products" }, (pct) => setUploading(Math.round(((index + pct / 100) / list.length) * 100)));
        setValues((v) => ({ ...v, images: [...v.images, uploaded.url] }));
      } catch (err) {
        toast.error(`${file.name}: ${err instanceof Error ? err.message : "uploaden mislukt"}`);
      }
    }
    setUploading(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  const skuBase = slugify(values.name).replace(/-/g, "").slice(0, 8).toUpperCase() || "MCN";

  return (
    <form onSubmit={onSubmit} className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]" noValidate>
      <input type="hidden" name="payload" value={JSON.stringify(values)} />

      <div className="space-y-6">
        <div className="space-y-5 rounded-xl border border-border bg-white p-5 sm:p-6">
          <h2 className="text-base font-semibold">Productgegevens</h2>
          <Field label="Naam" htmlFor="name" required error={errors.name}>
            <Input
              id="name"
              value={values.name}
              onChange={(e) => {
                const name = e.target.value;
                setValues((v) => ({ ...v, name, slug: slugTouched ? v.slug : slugify(name) }));
              }}
              aria-invalid={!!errors.name}
            />
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="URL-naam (slug)" htmlFor="slug" error={errors.slug} hint={`/webshop/${values.slug || "…"}`}>
              <Input
                id="slug"
                value={values.slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  set("slug", slugify(e.target.value));
                }}
              />
            </Field>
            <Field label="Categorie" htmlFor="categoryId" required error={errors.categoryId}>
              <NativeSelect id="categoryId" value={values.categoryId} onChange={(e) => set("categoryId", e.target.value)} aria-invalid={!!errors.categoryId}>
                {categories.length === 0 && <option value="">Maak eerst een categorie aan</option>}
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </NativeSelect>
            </Field>
          </div>
          <Field label="Beschrijving" htmlFor="description" required error={errors.description}>
            <Textarea id="description" value={values.description} onChange={(e) => set("description", e.target.value)} rows={7} aria-invalid={!!errors.description} />
          </Field>
        </div>

        <div className="rounded-xl border border-border bg-white">
          <div className="flex flex-col gap-2 border-b border-border p-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div>
              <h2 className="text-base font-semibold">Varianten en voorraad</h2>
              <p className="text-sm text-muted-foreground">Bijv. maten of kleuren. Leeg prijsveld = basisprijs.</p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setValues((v) => ({ ...v, variants: [...v.variants, { ...emptyVariant(), name: "", sku: `${skuBase}-${v.variants.length + 1}` }] }))}
            >
              <Plus /> Variant toevoegen
            </Button>
          </div>
          <FieldError message={errors.variants} className="px-6 pt-3" />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead className="bg-muted/60 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-2.5">Naam</th>
                  <th className="px-2 py-2.5">SKU</th>
                  <th className="px-2 py-2.5">Prijs (€)</th>
                  <th className="px-2 py-2.5">Voorraad</th>
                  <th className="px-2 py-2.5">Kenmerken</th>
                  <th className="px-2 py-2.5 text-center">Actief</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {values.variants.map((v, i) => (
                  <tr key={v.id ?? `new-${i}`} className="border-t border-border align-top">
                    <td className="px-4 py-2.5">
                      <Input value={v.name} onChange={(e) => setVariant(i, { name: e.target.value })} className="h-9" placeholder="Maat L / Zwart" aria-label="Variantnaam" aria-invalid={!!errors[`variants.${i}.name`]} />
                      <FieldError message={errors[`variants.${i}.name`]} />
                    </td>
                    <td className="px-2 py-2.5">
                      <Input value={v.sku} onChange={(e) => setVariant(i, { sku: e.target.value.toUpperCase() })} className="h-9 w-36 font-mono" aria-label="SKU" aria-invalid={!!errors[`variants.${i}.sku`]} />
                      <FieldError message={errors[`variants.${i}.sku`]} />
                    </td>
                    <td className="px-2 py-2.5">
                      <Input value={v.price} onChange={(e) => setVariant(i, { price: e.target.value })} className="h-9 w-24" inputMode="decimal" placeholder={values.basePrice || "–"} aria-label="Prijs" />
                    </td>
                    <td className="px-2 py-2.5">
                      <Input
                        value={v.stock}
                        onChange={(e) => setVariant(i, { stock: e.target.value.replace(/[^0-9]/g, "") })}
                        className={cn("h-9 w-20 tabular-nums", Number(v.stock) <= 5 && "border-amber-400")}
                        inputMode="numeric"
                        aria-label="Voorraad"
                        aria-invalid={!!errors[`variants.${i}.stock`]}
                      />
                    </td>
                    <td className="px-2 py-2.5">
                      <Input value={v.attributes} onChange={(e) => setVariant(i, { attributes: e.target.value })} className="h-9 w-48" placeholder="maat=L, kleur=Zwart" aria-label="Kenmerken" />
                    </td>
                    <td className="px-2 py-2.5 text-center">
                      <Checkbox checked={v.active} onChange={(e) => setVariant(i, { active: e.target.checked })} className="mt-2.5" aria-label="Variant actief" />
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        disabled={values.variants.length <= 1}
                        onClick={() => {
                          if (v.hasOrders && !window.confirm("Deze variant komt voor in bestellingen en wordt daarom gedeactiveerd in plaats van verwijderd. Doorgaan?")) return;
                          setValues((cur) => ({ ...cur, variants: cur.variants.filter((_, idx) => idx !== i) }));
                        }}
                        aria-label="Variant verwijderen"
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-4 rounded-xl border border-border bg-white p-5 sm:p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold">Afbeeldingen</h2>
              <p className="text-sm text-muted-foreground">De eerste afbeelding is de hoofdafbeelding. Uploads worden automatisch geoptimaliseerd.</p>
            </div>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple className="hidden" onChange={(e) => onFiles(e.target.files)} />
            <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading !== null || values.images.length >= 12}>
              {uploading !== null ? <Loader2 className="animate-spin" /> : <ImagePlus />}
              {uploading !== null ? `Uploaden… ${uploading}%` : "Uploaden"}
            </Button>
          </div>
          <FieldError message={errors.images} />
          {values.images.length > 0 ? (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {values.images.map((url, i) => (
                <li key={`${url}-${i}`} className={cn("group relative overflow-hidden rounded-lg border bg-surface", i === 0 ? "border-primary" : "border-border", errors[`images.${i}`] && "border-destructive")}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="aspect-square w-full object-contain p-2" />
                  {i === 0 && <span className="absolute top-2 left-2 rounded bg-primary px-1.5 py-0.5 text-[10px] font-bold text-white">Hoofd</span>}
                  <div className="absolute inset-x-0 bottom-0 flex justify-between bg-gradient-to-t from-black/60 to-transparent p-1.5 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
                    <div className="flex gap-1">
                      <button type="button" onClick={() => moveImage(i, -1)} disabled={i === 0} className="flex size-7 cursor-pointer items-center justify-center rounded bg-white/90 disabled:opacity-40" aria-label="Naar links">
                        <ArrowLeft className="size-3.5" />
                      </button>
                      <button type="button" onClick={() => moveImage(i, 1)} disabled={i === values.images.length - 1} className="flex size-7 cursor-pointer items-center justify-center rounded bg-white/90 disabled:opacity-40" aria-label="Naar rechts">
                        <ArrowRight className="size-3.5" />
                      </button>
                    </div>
                    <button type="button" onClick={() => set("images", values.images.filter((_, idx) => idx !== i))} className="flex size-7 cursor-pointer items-center justify-center rounded bg-white/90 text-destructive" aria-label="Afbeelding verwijderen">
                      <X className="size-3.5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-lg border border-dashed border-border bg-surface px-4 py-8 text-center text-sm text-muted-foreground">Nog geen afbeeldingen.</p>
          )}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Link2 className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={urlInput} onChange={(e) => setUrlInput(e.target.value)} placeholder="Of plak een afbeeldings-URL" className="h-10 pl-9" aria-label="Afbeeldings-URL" />
            </div>
            <Button
              type="button"
              variant="outline"
              className="h-10"
              disabled={!urlInput.trim() || values.images.length >= 12}
              onClick={() => {
                set("images", [...values.images, urlInput.trim()]);
                setUrlInput("");
              }}
            >
              Toevoegen
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div className="space-y-5 rounded-xl border border-border bg-white p-5 sm:p-6">
          <h2 className="text-base font-semibold">Prijs en zichtbaarheid</h2>
          <Field label="Basisprijs incl. btw (€)" htmlFor="basePrice" required error={errors.basePrice} hint="Leden krijgen automatisch de ledenkorting (Instellingen → Lidmaatschap & prijzen).">
            <Input id="basePrice" value={values.basePrice} onChange={(e) => set("basePrice", e.target.value)} inputMode="decimal" placeholder="19,95" aria-invalid={!!errors.basePrice} />
          </Field>
          <label className="flex cursor-pointer items-start gap-3 text-sm">
            <Checkbox checked={values.active} onChange={(e) => set("active", e.target.checked)} className="mt-0.5" />
            <span>
              <span className="font-medium">Zichtbaar in webshop</span>
              <span className="block text-xs text-muted-foreground">Uit = verborgen voor bezoekers.</span>
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-3 text-sm">
            <Checkbox checked={values.featured} onChange={(e) => set("featured", e.target.checked)} className="mt-0.5" />
            <span>
              <span className="font-medium">Uitgelicht</span>
              <span className="block text-xs text-muted-foreground">Getoond op de homepagina met label "Populair".</span>
            </span>
          </label>
          <Button type="submit" className="w-full" disabled={pending || uploading !== null}>
            {pending ? <Loader2 className="animate-spin" /> : <Save />}
            {initial?.id ? "Wijzigingen opslaan" : "Product aanmaken"}
          </Button>
        </div>
        <div className="rounded-xl border border-border bg-white p-5 text-sm sm:p-6">
          <h2 className="font-semibold">Totale voorraad</h2>
          <p className="mt-2 text-3xl font-bold tabular-nums">
            {values.variants.filter((v) => v.active).reduce((s, v) => s + (Number(v.stock) || 0), 0)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Over {values.variants.filter((v) => v.active).length} actieve variant(en). Voorraad wordt bij bestelling automatisch gereserveerd.</p>
        </div>
      </div>
    </form>
  );
}
