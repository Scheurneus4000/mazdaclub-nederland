import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const euro = new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" });

/** Formatteert een bedrag in centen als euro's, bijv. 500 → "€ 5,00". */
export function formatPrice(cents: number): string {
  return euro.format(cents / 100);
}

/** Centen → Mollie/Stripe-notatie "5.00". */
export function centsToDecimalString(cents: number): string {
  return (cents / 100).toFixed(2);
}

/** Euro-invoer uit formulieren ("12,50" of "12.50") → centen. */
export function parseEuroToCents(input: string | number | null | undefined): number {
  if (input === null || input === undefined || input === "") return 0;
  const n = typeof input === "number" ? input : Number(String(input).replace(/\s/g, "").replace(",", "."));
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

const TZ = "Europe/Amsterdam";

export function formatDate(date: Date | string, opts: Intl.DateTimeFormatOptions = {}): string {
  return new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "long", year: "numeric", timeZone: TZ, ...opts }).format(
    new Date(date),
  );
}

export function formatDateTime(date: Date | string): string {
  return new Intl.DateTimeFormat("nl-NL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TZ,
  }).format(new Date(date));
}

export function formatTime(date: Date | string): string {
  return new Intl.DateTimeFormat("nl-NL", { hour: "2-digit", minute: "2-digit", timeZone: TZ }).format(new Date(date));
}

/** Korte datum voor kaarten: { day: "14", month: "jun" } */
export function dateBadge(date: Date | string): { day: string; month: string; weekday: string } {
  const d = new Date(date);
  return {
    day: new Intl.DateTimeFormat("nl-NL", { day: "numeric", timeZone: TZ }).format(d),
    month: new Intl.DateTimeFormat("nl-NL", { month: "short", timeZone: TZ }).format(d).replace(".", ""),
    weekday: new Intl.DateTimeFormat("nl-NL", { weekday: "short", timeZone: TZ }).format(d).replace(".", ""),
  };
}

export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** Normaliseert een kenteken naar hoofdletters zonder spaties, bijv. "ab-123-c" → "AB-123-C". */
export function normalizeLicensePlate(input: string): string {
  return input.toUpperCase().replace(/\s+/g, "").replace(/[^A-Z0-9-]/g, "");
}

export function formatMemberNumber(n: number): string {
  return `MCN-${String(n).padStart(5, "0")}`;
}

export function fullName(p: { firstName: string; lastName: string }): string {
  return `${p.firstName} ${p.lastName}`.trim();
}

export function siteUrl(path = ""): string {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
  return `${base}${path.startsWith("/") || path === "" ? path : `/${path}`}`;
}

export function isLocalUrl(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname.endsWith(".local") || hostname.endsWith(".localhost");
  } catch {
    return true;
  }
}

export function addYears(date: Date, years: number): Date {
  const d = new Date(date);
  d.setFullYear(d.getFullYear() + years);
  return d;
}

export function toDateInputValue(date: Date | string | null | undefined): string {
  if (!date) return "";
  const d = new Date(date);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Waarde voor <input type="datetime-local"> in lokale (server)tijd. */
export function toDateTimeInputValue(date: Date | string | null | undefined): string {
  if (!date) return "";
  const d = new Date(date);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${toDateInputValue(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
