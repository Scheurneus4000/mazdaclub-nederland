import { richTextToPlain } from "@/lib/rich-text";
import { siteUrl } from "@/lib/utils";

/**
 * "Zet in je agenda": links voor Google Agenda en Outlook en een .ics-bestand (Apple Agenda,
 * Outlook-desktop en andere agenda-apps). Alle tijden in UTC, zodat elke agenda ze correct
 * omzet naar de tijdzone van de gebruiker.
 */
export type CalendarEvent = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  startsAt: Date;
  endsAt: Date | null;
  locationName: string;
  address: string | null;
  city: string;
};

export type CalendarLinks = {
  google: string;
  outlook: string;
  office365: string;
  ics: string;
};

const DEFAULT_DURATION_MS = 3 * 60 * 60 * 1000;

function times(event: CalendarEvent): { start: Date; end: Date } {
  const start = new Date(event.startsAt);
  const end = event.endsAt && new Date(event.endsAt) > start ? new Date(event.endsAt) : new Date(start.getTime() + DEFAULT_DURATION_MS);
  return { start, end };
}

/** 2026-05-09T08:30:00.000Z → 20260509T083000Z */
function compactUtc(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/** ISO zonder milliseconden, zoals Outlook die verwacht. */
function isoUtc(date: Date): string {
  return date.toISOString().replace(/\.\d{3}Z$/, "Z");
}

export function eventLocation(event: Pick<CalendarEvent, "locationName" | "address" | "city">): string {
  return [event.locationName, event.address, event.city].filter((part) => part && part.trim()).join(", ");
}

export function eventPageUrl(slug: string): string {
  return siteUrl(`/evenementen/${slug}`);
}

/** Link naar het .ics-bestand; absoluut voor e-mails, relatief op de eigen website. */
export function icsUrl(slug: string, absolute = false): string {
  const path = `/api/events/${encodeURIComponent(slug)}/agenda`;
  return absolute ? siteUrl(path) : path;
}

function details(event: CalendarEvent): string {
  const summary = richTextToPlain(event.summary ?? "");
  return [summary, `Meer info: ${eventPageUrl(event.slug)}`].filter(Boolean).join("\n\n");
}

export function googleCalendarUrl(event: CalendarEvent): string {
  const { start, end } = times(event);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${compactUtc(start)}/${compactUtc(end)}`,
    details: details(event),
    location: eventLocation(event),
    ctz: "Europe/Amsterdam",
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function outlookUrl(host: string, event: CalendarEvent): string {
  const { start, end } = times(event);
  const params: Record<string, string> = {
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: event.title,
    startdt: isoUtc(start),
    enddt: isoUtc(end),
    body: details(event),
    location: eventLocation(event),
    allday: "false",
  };
  // Outlook zet "+" niet om naar een spatie, dus %20-codering (encodeURIComponent) gebruiken.
  const query = Object.entries(params)
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join("&");
  return `https://${host}/calendar/0/action/compose?${query}`;
}

/** Outlook.com / Hotmail / Live (persoonlijke Microsoft-accounts). */
export function outlookCalendarUrl(event: CalendarEvent): string {
  return outlookUrl("outlook.live.com", event);
}

/** Outlook van werk of school (Microsoft 365). */
export function office365CalendarUrl(event: CalendarEvent): string {
  return outlookUrl("outlook.office.com", event);
}

export function calendarLinks(event: CalendarEvent, opts: { absolute?: boolean } = {}): CalendarLinks {
  return {
    google: googleCalendarUrl(event),
    outlook: outlookCalendarUrl(event),
    office365: office365CalendarUrl(event),
    ics: icsUrl(event.slug, opts.absolute),
  };
}

// ─── iCalendar (RFC 5545) ───────────────────────────────────────────

/** Escape van tekstwaarden: backslash, puntkomma, komma en regeleinden. */
function escapeText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r\n|\r|\n/g, "\\n");
}

/** Vouwt regels op maximaal 75 octets (UTF-8); vervolgregels beginnen met een spatie. */
function fold(line: string): string {
  const parts: string[] = [];
  let current = "";
  let bytes = 0;
  for (const char of line) {
    const size = Buffer.byteLength(char, "utf8");
    const limit = parts.length === 0 ? 75 : 74; // vervolgregel: de spatie telt mee
    if (bytes + size > limit) {
      parts.push(current);
      current = "";
      bytes = 0;
    }
    current += char;
    bytes += size;
  }
  parts.push(current);
  return parts.join("\r\n ");
}

export function buildEventIcs(event: CalendarEvent, opts: { now?: Date } = {}): string {
  const { start, end } = times(event);
  const url = eventPageUrl(event.slug);
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//MazdaClub Nederland//Evenementen//NL",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${event.id}@mazdaclub`,
    `DTSTAMP:${compactUtc(opts.now ?? new Date())}`,
    `DTSTART:${compactUtc(start)}`,
    `DTEND:${compactUtc(end)}`,
    `SUMMARY:${escapeText(event.title)}`,
    `DESCRIPTION:${escapeText(details(event))}`,
    `LOCATION:${escapeText(eventLocation(event))}`,
    `URL:${url}`,
    "STATUS:CONFIRMED",
    "TRANSP:OPAQUE",
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    `DESCRIPTION:${escapeText(`Morgen: ${event.title}`)}`,
    "TRIGGER:-P1D",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.map(fold).join("\r\n") + "\r\n";
}
