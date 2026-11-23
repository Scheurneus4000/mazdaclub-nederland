import Link from "next/link";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/form-controls";
import { Input } from "@/components/ui/input";

export type FilterSelect = {
  name: string;
  label: string;
  value?: string;
  options: Array<{ value: string; label: string }>;
};

/**
 * GET-zoekformulier voor overzichten: zoekveld + filters (werkt zonder JavaScript).
 * Paginering wordt bij een nieuwe zoekopdracht automatisch gereset.
 */
export function SearchForm({
  action,
  q,
  placeholder = "Zoeken…",
  filters = [],
  hidden = {},
}: {
  action: string;
  q?: string;
  placeholder?: string;
  filters?: FilterSelect[];
  hidden?: Record<string, string | undefined>;
}) {
  const hasFilters = !!q || filters.some((f) => f.value && f.value !== f.options[0]?.value);
  return (
    <form action={action} method="get" className="flex flex-col gap-2 border-b border-border p-4 md:flex-row md:items-center">
      {Object.entries(hidden).map(([k, v]) => (v ? <input key={k} type="hidden" name={k} value={v} /> : null))}
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input name="q" defaultValue={q} placeholder={placeholder} className="h-10 pl-9" aria-label="Zoeken" />
      </div>
      {filters.map((f) => (
        <div key={f.name} className="md:w-52">
          <NativeSelect name={f.name} defaultValue={f.value ?? f.options[0]?.value} aria-label={f.label} className="h-10">
            {f.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </NativeSelect>
        </div>
      ))}
      <div className="flex gap-2">
        <Button type="submit" variant="dark" className="h-10">
          Filteren
        </Button>
        {hasFilters && (
          <Button asChild variant="ghost" className="h-10">
            <Link href={action}>Wissen</Link>
          </Button>
        )}
      </div>
    </form>
  );
}

export function readParam(value: string | string[] | undefined): string {
  return ((Array.isArray(value) ? value[0] : value) ?? "").trim().slice(0, 120);
}
