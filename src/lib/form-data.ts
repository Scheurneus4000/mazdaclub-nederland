import { parseEuroToCents } from "@/lib/utils";

/** Kleine hulpfuncties om FormData uit beheerformulieren veilig uit te lezen. */
export const fd = {
  str(form: FormData, key: string): string {
    const v = form.get(key);
    return typeof v === "string" ? v.trim() : "";
  },
  /** Checkbox: aangevinkt = "on" (of "true"). */
  bool(form: FormData, key: string): boolean {
    const v = form.get(key);
    return v === "on" || v === "true" || v === "1";
  },
  int(form: FormData, key: string, fallback = 0): number {
    const n = Number.parseInt(fd.str(form, key), 10);
    return Number.isFinite(n) ? n : fallback;
  },
  /** "12,50" of "€ 12.50" → 1250; leeg → null; ongeldig → NaN (controleer met Number.isNaN). */
  cents(form: FormData, key: string): number | null {
    const raw = fd.str(form, key).replace(/[€\s]/g, "");
    if (!raw) return null;
    if (!/^\d{1,7}([.,]\d{1,2})?$/.test(raw)) return Number.NaN;
    return parseEuroToCents(raw);
  },
  list(form: FormData, key: string): string[] {
    return fd
      .str(form, key)
      .split(/[\n,;]+/)
      .map((s) => s.trim())
      .filter(Boolean);
  },
};
