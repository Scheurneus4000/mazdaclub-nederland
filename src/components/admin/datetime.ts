/**
 * Datum/tijd-hulpjes voor beheerformulieren. <input type="datetime-local"> heeft geen tijdzone;
 * we interpreteren invoer altijd als Nederlandse tijd (Europe/Amsterdam), ongeacht de servertijdzone.
 */
const TZ = "Europe/Amsterdam";

function parts(date: Date) {
  const p = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (t: string) => p.find((x) => x.type === t)?.value ?? "00";
  return { y: get("year"), m: get("month"), d: get("day"), h: get("hour"), mi: get("minute"), s: get("second") };
}

function offsetMinutes(date: Date): number {
  const p = parts(date);
  const asUtc = Date.UTC(+p.y, +p.m - 1, +p.d, +p.h, +p.mi, +p.s);
  return Math.round((asUtc - date.getTime()) / 60000);
}

/** Date → "2026-06-14T09:30" in Nederlandse tijd. */
export function toAmsterdamInput(date: Date | string | null | undefined): string {
  if (!date) return "";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  const p = parts(d);
  return `${p.y}-${p.m}-${p.d}T${p.h}:${p.mi}`;
}

/** Date → "2026-06-14" in Nederlandse tijd. */
export function toAmsterdamDateInput(date: Date | string | null | undefined): string {
  return toAmsterdamInput(date).slice(0, 10);
}

/** "2026-06-14T09:30" of "2026-06-14" (Nederlandse tijd) → Date, of null bij lege/ongeldige invoer. */
export function fromAmsterdamInput(value: FormDataEntryValue | null | undefined): Date | null {
  if (typeof value !== "string" || !value) return null;
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?$/);
  if (!m) return null;
  const [, y, mo, d, h = "00", mi = "00"] = m;
  const wallAsUtc = Date.UTC(+y, +mo - 1, +d, +h, +mi);
  const first = offsetMinutes(new Date(wallAsUtc));
  let result = new Date(wallAsUtc - first * 60000);
  const second = offsetMinutes(result);
  if (second !== first) result = new Date(wallAsUtc - second * 60000);
  return result;
}

/** "2026-11" sleutel van de maand in Nederlandse tijd. */
export function amsterdamMonthKey(date: Date): string {
  const p = parts(date);
  return `${p.y}-${p.m}`;
}
