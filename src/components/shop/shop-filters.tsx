"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Search, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox, NativeSelect } from "@/components/ui/form-controls";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import type { ShopCategoryOption } from "./types";

type Filters = { q: string; categorie: string; sorteer: string; voorraad: boolean };

function toQuery(f: Filters): string {
  const params = new URLSearchParams();
  if (f.q) params.set("q", f.q);
  if (f.categorie) params.set("categorie", f.categorie);
  if (f.sorteer && f.sorteer !== "nieuw") params.set("sorteer", f.sorteer);
  if (f.voorraad) params.set("voorraad", "1");
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export function ShopFilters({
  categories,
  filters,
  sortOptions,
  total,
}: {
  categories: ShopCategoryOption[];
  filters: Filters;
  sortOptions: ReadonlyArray<{ value: string; label: string }>;
  total: number;
}) {
  const router = useRouter();
  const [q, setQ] = React.useState(filters.q);
  const [pending, startTransition] = React.useTransition();
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const lastSubmitted = React.useRef(filters.q);

  const navigate = React.useCallback(
    (next: Partial<Filters>) => {
      const merged: Filters = { ...filters, q: lastSubmitted.current, ...next };
      lastSubmitted.current = merged.q;
      startTransition(() => router.replace(`/webshop${toQuery(merged)}`, { scroll: false }));
    },
    [filters, router],
  );

  // Zoekterm gedebounced in de URL zetten.
  React.useEffect(() => {
    const trimmed = q.trim();
    if (trimmed === lastSubmitted.current) return;
    const timer = window.setTimeout(() => navigate({ q: trimmed }), 350);
    return () => window.clearTimeout(timer);
  }, [q, navigate]);

  const activeCount = (filters.categorie ? 1 : 0) + (filters.voorraad ? 1 : 0) + (filters.sorteer !== "nieuw" ? 1 : 0);
  const hasAnyFilter = activeCount > 0 || !!filters.q;
  const allCount = categories.reduce((s, c) => s + c.count, 0);

  function resetAll() {
    setQ("");
    lastSubmitted.current = "";
    startTransition(() => router.replace("/webshop", { scroll: false }));
  }

  const chip = (active: boolean) =>
    cn(
      "inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition-colors",
      active ? "border-ink bg-ink text-white" : "border-border bg-white text-foreground/80 hover:border-ink/40 hover:text-foreground",
    );

  const searchBox = (
    <div className="relative flex-1">
      <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground" />
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Zoek in de webshop, bijv. hoodie of sticker"
        aria-label="Zoeken in de webshop"
        className="h-11 w-full rounded-md border border-input bg-background pr-10 pl-10 text-base shadow-xs outline-none placeholder:text-muted-foreground/70 focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/15 md:text-sm [&::-webkit-search-cancel-button]:hidden"
      />
      {pending ? (
        <Loader2 className="absolute top-1/2 right-3.5 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
      ) : q ? (
        <button
          type="button"
          onClick={() => setQ("")}
          className="absolute top-1/2 right-2.5 flex size-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Zoekterm wissen"
        >
          <X className="size-3.5" />
        </button>
      ) : null}
    </div>
  );

  const sortSelect = (id: string) => (
    <NativeSelect id={id} value={filters.sorteer} onChange={(e) => navigate({ sorteer: e.target.value })} aria-label="Sorteren">
      {sortOptions.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </NativeSelect>
  );

  const stockToggle = (id: string) => (
    <label htmlFor={id} className="flex h-11 cursor-pointer items-center gap-2.5 rounded-md border border-input bg-background px-3.5 text-sm font-medium whitespace-nowrap">
      <Checkbox id={id} checked={filters.voorraad} onChange={(e) => navigate({ voorraad: e.target.checked })} />
      Alleen op voorraad
    </label>
  );

  return (
    <div className="space-y-5">
      {/* Desktop */}
      <div className="hidden gap-3 md:flex">
        {searchBox}
        <div className="w-56">{sortSelect("sort-desktop")}</div>
        {stockToggle("stock-desktop")}
      </div>

      {/* Mobiel */}
      <div className="flex gap-2 md:hidden">
        {searchBox}
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" className="h-11 shrink-0 px-3.5" aria-label="Filters openen">
              <SlidersHorizontal className="size-4" />
              Filters
              {activeCount > 0 && <span className="flex size-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white">{activeCount}</span>}
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="max-h-[85dvh] overflow-y-auto rounded-t-2xl">
            <SheetHeader className="pb-0">
              <SheetTitle className="font-display text-xl font-bold uppercase">Filteren & sorteren</SheetTitle>
            </SheetHeader>
            <div className="space-y-6 px-5 pb-6">
              <fieldset>
                <legend className="mb-3 text-sm font-semibold">Categorie</legend>
                <div className="flex flex-wrap gap-2">
                  <button type="button" className={chip(!filters.categorie)} onClick={() => navigate({ categorie: "" })}>
                    Alles <span className="text-xs opacity-60">{allCount}</span>
                  </button>
                  {categories.map((c) => (
                    <button key={c.slug} type="button" className={chip(filters.categorie === c.slug)} onClick={() => navigate({ categorie: c.slug })}>
                      {c.name} <span className="text-xs opacity-60">{c.count}</span>
                    </button>
                  ))}
                </div>
              </fieldset>
              <div className="space-y-2">
                <label htmlFor="sort-mobile" className="text-sm font-semibold">
                  Sorteren
                </label>
                {sortSelect("sort-mobile")}
              </div>
              {stockToggle("stock-mobile")}
              <div className="flex gap-2 pt-2">
                {hasAnyFilter && (
                  <Button variant="outline" className="flex-1" onClick={resetAll}>
                    Wis filters
                  </Button>
                )}
                <Button className="flex-1" onClick={() => setSheetOpen(false)}>
                  Toon {total} {total === 1 ? "product" : "producten"}
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Categorieën (desktop: chips, mobiel: horizontaal scrollen) */}
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0" role="group" aria-label="Categorieën">
        <button type="button" className={chip(!filters.categorie)} onClick={() => navigate({ categorie: "" })} aria-pressed={!filters.categorie}>
          Alle producten
        </button>
        {categories.map((c) => (
          <button
            key={c.slug}
            type="button"
            className={chip(filters.categorie === c.slug)}
            onClick={() => navigate({ categorie: filters.categorie === c.slug ? "" : c.slug })}
            aria-pressed={filters.categorie === c.slug}
          >
            {c.name}
            <span className={cn("text-xs", filters.categorie === c.slug ? "text-white/60" : "text-muted-foreground")}>{c.count}</span>
          </button>
        ))}
        {hasAnyFilter && (
          <button type="button" onClick={resetAll} className="inline-flex shrink-0 cursor-pointer items-center gap-1 px-3 py-2 text-sm font-medium text-primary hover:underline">
            <X className="size-3.5" /> Wis filters
          </button>
        )}
      </div>
    </div>
  );
}
