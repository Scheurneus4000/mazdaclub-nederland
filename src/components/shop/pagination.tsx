import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/** Paginering met behoud van de huidige filters. `hrefFor(page)` bouwt de URL. */
export function Pagination({ page, pageCount, hrefFor }: { page: number; pageCount: number; hrefFor: (page: number) => string }) {
  if (pageCount <= 1) return null;

  const pages: Array<number | "…"> = [];
  for (let p = 1; p <= pageCount; p++) {
    if (p === 1 || p === pageCount || Math.abs(p - page) <= 1) pages.push(p);
    else if (pages[pages.length - 1] !== "…") pages.push("…");
  }

  const base = "flex h-10 min-w-10 items-center justify-center rounded-md border px-3 text-sm font-semibold transition-colors";

  return (
    <nav aria-label="Paginering" className="mt-14 flex items-center justify-center gap-1.5">
      {page > 1 ? (
        <Link href={hrefFor(page - 1)} className={cn(base, "border-border hover:bg-muted")} aria-label="Vorige pagina" rel="prev">
          <ChevronLeft className="size-4" />
        </Link>
      ) : (
        <span className={cn(base, "border-border opacity-40")} aria-hidden>
          <ChevronLeft className="size-4" />
        </span>
      )}
      {pages.map((p, i) =>
        p === "…" ? (
          <span key={`gap-${i}`} className="px-1 text-muted-foreground">
            …
          </span>
        ) : (
          <Link
            key={p}
            href={hrefFor(p)}
            aria-current={p === page ? "page" : undefined}
            className={cn(base, p === page ? "border-ink bg-ink text-white" : "border-border hover:bg-muted")}
          >
            {p}
          </Link>
        ),
      )}
      {page < pageCount ? (
        <Link href={hrefFor(page + 1)} className={cn(base, "border-border hover:bg-muted")} aria-label="Volgende pagina" rel="next">
          <ChevronRight className="size-4" />
        </Link>
      ) : (
        <span className={cn(base, "border-border opacity-40")} aria-hidden>
          <ChevronRight className="size-4" />
        </span>
      )}
    </nav>
  );
}
