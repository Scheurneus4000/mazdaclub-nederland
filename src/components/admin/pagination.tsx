import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export const ADMIN_PAGE_SIZE = 25;

export function parsePage(value: string | string[] | undefined): number {
  const n = Number.parseInt(Array.isArray(value) ? (value[0] ?? "") : (value ?? ""), 10);
  return Number.isFinite(n) && n > 0 ? Math.min(n, 10_000) : 1;
}

function hrefFor(basePath: string, params: Record<string, string | undefined>, page: number) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v && k !== "pagina") sp.set(k, v);
  if (page > 1) sp.set("pagina", String(page));
  const qs = sp.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

/** Paginering die bestaande filters in de URL behoudt. */
export function Pagination({
  page,
  total,
  pageSize = ADMIN_PAGE_SIZE,
  basePath,
  params,
}: {
  page: number;
  total: number;
  pageSize?: number;
  basePath: string;
  params: Record<string, string | undefined>;
}) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);

  const pages: number[] = [];
  for (let p = Math.max(1, page - 2); p <= Math.min(pageCount, page + 2); p++) pages.push(p);

  return (
    <div className="flex flex-col items-center justify-between gap-3 border-t border-border px-4 py-3 text-sm sm:flex-row">
      <p className="text-muted-foreground tabular-nums">
        {total === 0 ? "Geen resultaten" : `${from}–${to} van ${total.toLocaleString("nl-NL")}`}
      </p>
      {pageCount > 1 && (
        <nav className="flex items-center gap-1" aria-label="Paginering">
          <PageLink href={hrefFor(basePath, params, page - 1)} disabled={page <= 1} label="Vorige">
            <ChevronLeft className="size-4" />
          </PageLink>
          {pages[0] > 1 && <span className="px-1 text-muted-foreground">…</span>}
          {pages.map((p) => (
            <PageLink key={p} href={hrefFor(basePath, params, p)} active={p === page} label={`Pagina ${p}`}>
              {p}
            </PageLink>
          ))}
          {pages[pages.length - 1] < pageCount && <span className="px-1 text-muted-foreground">…</span>}
          <PageLink href={hrefFor(basePath, params, page + 1)} disabled={page >= pageCount} label="Volgende">
            <ChevronRight className="size-4" />
          </PageLink>
        </nav>
      )}
    </div>
  );
}

function PageLink({ href, children, active, disabled, label }: { href: string; children: React.ReactNode; active?: boolean; disabled?: boolean; label: string }) {
  const cls = cn(
    "flex h-8 min-w-8 items-center justify-center rounded-md border px-2 text-sm font-medium tabular-nums transition-colors",
    active ? "border-primary bg-primary text-white" : "border-border bg-white hover:bg-muted",
    disabled && "pointer-events-none opacity-40",
  );
  if (disabled) {
    return (
      <span className={cls} aria-disabled="true" aria-label={label}>
        {children}
      </span>
    );
  }
  return (
    <Link href={href} className={cls} aria-label={label} aria-current={active ? "page" : undefined}>
      {children}
    </Link>
  );
}
