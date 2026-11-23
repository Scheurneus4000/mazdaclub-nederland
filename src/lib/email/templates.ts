import type { Event, EventRegistration, Membership, Order, OrderItem, User } from "@prisma/client";
import { formatDateTime, formatDate, formatMemberNumber, formatPrice, formatTime, siteUrl } from "@/lib/utils";
import { calendarLinks } from "@/lib/calendar";
import { shippingOptions } from "@/lib/pricing";

/** Escape gebruikersinvoer voordat die in HTML-mails terechtkomt. */
export function esc(value: string | null | undefined): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Plek in layout() waar sendEmail de ondertekening uit Beheer → Instellingen → E-mail invoegt. */
export const SIGNATURE_PLACEHOLDER = "<!--MCN_SIGNATURE-->";

export function layout(title: string, body: string, preheader = ""): string {
  return `<!doctype html>
<html lang="nl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title></head>
<body style="margin:0;background:#f4f4f5;font-family:Helvetica,Arial,sans-serif;color:#18181b;">
<span style="display:none;max-height:0;overflow:hidden">${esc(preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 12px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden;">
<tr><td style="background:#0b0b0c;padding:22px 32px;border-bottom:4px solid #C00000;">
<a href="${siteUrl()}" style="text-decoration:none;"><img src="${siteUrl("/images/logo/mazdaclub-nederland-wit.png")}" width="200" height="54" alt="MazdaClub Nederland" style="display:block;border:0;width:200px;height:auto;color:#ffffff;font-size:18px;font-weight:700;letter-spacing:2px;text-transform:uppercase;"></a>
</td></tr>
<tr><td style="padding:32px;font-size:15px;line-height:1.6;">
<h1 style="margin:0 0 16px;font-size:22px;color:#0b0b0c;">${esc(title)}</h1>
${body}
${SIGNATURE_PLACEHOLDER}
</td></tr>
<tr><td style="padding:20px 32px;background:#fafafa;color:#71717a;font-size:12px;line-height:1.5;">
MazdaClub Nederland · <a href="${siteUrl()}" style="color:#C00000;">${siteUrl().replace(/^https?:\/\//, "")}</a><br>
Je ontvangt deze e-mail omdat je een account, inschrijving of bestelling hebt bij MazdaClub Nederland.
<a href="${siteUrl("/privacy")}" style="color:#71717a;">Privacyverklaring</a>
</td></tr>
</table></td></tr></table></body></html>`;
}

export function button(href: string, label: string): string {
  return `<p style="margin:24px 0;"><a href="${href}" style="display:inline-block;background:#C00000;color:#ffffff;text-decoration:none;font-weight:700;padding:12px 22px;border-radius:8px;">${esc(label)}</a></p>`;
}

/** Tabel met label/waarde-regels. Waarden moeten al ge-escaped zijn (esc). */
export function rows(pairs: Array<[string, string]>): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin:16px 0;">${pairs
    .map(
      ([k, v]) =>
        `<tr><td style="padding:8px 0;border-bottom:1px solid #f0f0f0;color:#71717a;width:40%;">${esc(k)}</td><td style="padding:8px 0;border-bottom:1px solid #f0f0f0;font-weight:600;">${v}</td></tr>`,
    )
    .join("")}</table>`;
}

function calendarBlock(event: Event, hasAttachment: boolean): string {
  const links = calendarLinks(event, { absolute: true });
  const pill = (href: string, label: string) =>
    `<a href="${esc(href)}" style="display:inline-block;margin:0 6px 8px 0;padding:9px 14px;border:1px solid #e4e4e7;border-radius:8px;background:#ffffff;color:#0b0b0c;text-decoration:none;font-weight:600;font-size:14px;">${esc(label)}</a>`;
  return `
<div style="margin:24px 0;padding:18px 20px;border-radius:10px;background:#fdf2f2;border:1px solid #f5d0d0;">
<p style="margin:0 0 4px;font-weight:700;font-size:16px;color:#0b0b0c;">Zet het in je agenda</p>
<p style="margin:0 0 12px;color:#52525b;font-size:13px;">Kies je agenda-app, dan vergeet je de rit niet.</p>
${pill(links.google, "Google Agenda")}${pill(links.ics, "Apple Agenda")}${pill(links.outlook, "Outlook")}${pill(links.ics, "Andere agenda (.ics)")}
${hasAttachment ? `<p style="margin:4px 0 0;color:#52525b;font-size:12px;">Het agendabestand zit ook als bijlage bij deze e-mail.</p>` : ""}
</div>`;
}

/** Contactgegevens van de club voor in e-mails (uit Teksten & afbeeldingen → Contact & social). */
export type ClubContact = { email?: string | null; phone?: string | null };

const sameDay = (a: Date, b: Date) => formatDate(a) === formatDate(b);

/** "zaterdag 12 december 2026" + "19:00 – 22:00 uur" (of meerdaags). */
function eventWhen(event: Pick<Event, "startsAt" | "endsAt">): { date: string; time: string } {
  const date = formatDate(event.startsAt, { weekday: "long" });
  if (!event.endsAt) return { date, time: `Vanaf ${formatTime(event.startsAt)} uur` };
  if (sameDay(event.startsAt, event.endsAt)) return { date, time: `${formatTime(event.startsAt)} – ${formatTime(event.endsAt)} uur` };
  return { date: `${date} t/m ${formatDate(event.endsAt, { weekday: "long" })}`, time: `${formatTime(event.startsAt)} uur tot ${formatDateTime(event.endsAt)}` };
}

function eventPlace(event: Pick<Event, "locationName" | "address" | "city">): { label: string; mapsUrl: string } {
  const label = [event.locationName, event.address, event.city].filter(Boolean).join(", ");
  return { label, mapsUrl: `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(label)}` };
}

function contactLine(contact: ClubContact | undefined, intro: string): string {
  const parts = [
    contact?.email ? `<a href="mailto:${esc(contact.email)}" style="color:#C00000;">${esc(contact.email)}</a>` : "",
    contact?.phone ? `<a href="tel:${esc(contact.phone.replace(/[^+0-9]/g, ""))}" style="color:#C00000;">${esc(contact.phone)}</a>` : "",
  ].filter(Boolean);
  return `<p style="color:#52525b;font-size:13px;">${intro}${parts.length ? ` Of neem contact op via ${parts.join(" of ")}.` : ""}</p>`;
}

export function eventRegistrationConfirmation(
  reg: EventRegistration,
  event: Event,
  opts: { hasCalendarAttachment?: boolean; contact?: ClubContact } = {},
) {
  const subject = `Inschrijving bevestigd: ${event.title}`;
  const when = eventWhen(event);
  const place = eventPlace(event);
  const body = `
<p>Hoi ${esc(reg.firstName)},</p>
<p>Je inschrijving voor <strong>${esc(event.title)}</strong> is bevestigd. We kijken ernaar uit je te zien!</p>
${event.summary ? `<p style="color:#3f3f46;">${esc(event.summary)}</p>` : ""}
<p style="margin:24px 0 0;font-weight:700;font-size:16px;color:#0b0b0c;">Wanneer en waar</p>
${rows([
  ["Datum", esc(when.date)],
  ["Tijd", esc(when.time)],
  ["Verzamelpunt", `${esc(place.label)}<br><a href="${esc(place.mapsUrl)}" style="color:#C00000;font-weight:600;font-size:13px;">Route plannen →</a>`],
  ["Deelnamekosten", reg.amount === 0 ? (reg.isMember ? "Gratis (lid)" : "Gratis") : `${esc(formatPrice(reg.amount))} – betaald`],
])}
<p style="margin:24px 0 0;font-weight:700;font-size:16px;color:#0b0b0c;">Je gegevens</p>
${rows([
  ["Naam", esc(`${reg.firstName} ${reg.lastName}`)],
  ["Telefoon", esc(reg.phone)],
  ["Kenteken", esc(reg.licensePlate)],
  ...(reg.remarks ? ([["Opmerking", esc(reg.remarks)]] as Array<[string, string]>) : []),
  ["Inschrijvingsnummer", esc(reg.id.slice(-8).toUpperCase())],
])}
${event.status === "PUBLISHED" ? calendarBlock(event, !!opts.hasCalendarAttachment) : ""}
${button(siteUrl(`/evenementen/${event.slug}`), "Bekijk het evenement")}
<p style="margin:24px 0 4px;font-weight:700;color:#0b0b0c;">Kun je toch niet komen?</p>
${contactLine(opts.contact, "Laat het ons zo snel mogelijk weten door op deze e-mail te reageren, dan geven we je plek aan een ander.")}
<p style="color:#71717a;font-size:12px;">Je inschrijvingen zie je ook in <a href="${siteUrl("/account?tab=inschrijvingen")}" style="color:#71717a;">Mijn Account</a>.</p>`;
  return { subject, html: layout(subject, body, `${when.date} · ${event.locationName}`) };
}

/** Bericht aan de deelnemer als een beheerder de inschrijving annuleert. */
export function eventRegistrationCancelled(reg: EventRegistration, event: Event, opts: { paidAmount?: number; contact?: ClubContact } = {}) {
  const subject = `Inschrijving geannuleerd: ${event.title}`;
  const when = eventWhen(event);
  const body = `
<p>Hoi ${esc(reg.firstName)},</p>
<p>Je inschrijving voor <strong>${esc(event.title)}</strong> op ${esc(when.date)} is geannuleerd. Je plek is vrijgegeven.</p>
${rows([
  ["Evenement", esc(event.title)],
  ["Datum", esc(`${when.date}, ${when.time}`)],
  ["Inschrijvingsnummer", esc(reg.id.slice(-8).toUpperCase())],
])}
${
  opts.paidAmount && opts.paidAmount > 0
    ? `<p>Je hebt ${esc(formatPrice(opts.paidAmount))} betaald. We storten dit bedrag terug op de rekening waarmee je hebt betaald; houd rekening met enkele werkdagen.</p>`
    : ""
}
${contactLine(opts.contact, "Is dit niet de bedoeling of heb je vragen? Reageer dan op deze e-mail.")}
${button(siteUrl("/evenementen"), "Bekijk de agenda")}`;
  return { subject, html: layout(subject, body, `Je inschrijving voor ${event.title} is geannuleerd`) };
}

export function orderConfirmation(order: Order & { items: OrderItem[] }) {
  const subject = `Bedankt voor je bestelling ${order.orderNumber}`;
  const items = order.items
    .map(
      (i) =>
        `<tr><td style="padding:8px 0;border-bottom:1px solid #f0f0f0;">${esc(i.productName)}<br><span style="color:#71717a;font-size:13px;">${esc(i.variantName)} × ${i.quantity}</span></td><td style="padding:8px 0;border-bottom:1px solid #f0f0f0;text-align:right;white-space:nowrap;">${esc(formatPrice(i.lineTotal))}</td></tr>`,
    )
    .join("");
  const shipping = shippingOptions[order.shippingMethod];
  const address =
    order.shippingMethod === "PICKUP_EVENT"
      ? "Ophalen bij een clubevenement"
      : esc(`${order.street ?? ""} ${order.houseNumber ?? ""}, ${order.postalCode ?? ""} ${order.city ?? ""} (${order.country})`);
  const body = `
<p>Hoi ${esc(order.firstName)},</p>
<p>We hebben je betaling ontvangen. Je bestelling wordt zo snel mogelijk ingepakt en verzonden.</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin:16px 0;">${items}
<tr><td style="padding:8px 0;color:#71717a;">Subtotaal</td><td style="padding:8px 0;text-align:right;">${esc(formatPrice(order.subtotal))}</td></tr>
${order.discount > 0 ? `<tr><td style="padding:4px 0;color:#C00000;">Ledenkorting</td><td style="padding:4px 0;text-align:right;color:#C00000;">− ${esc(formatPrice(order.discount))}</td></tr>` : ""}
<tr><td style="padding:4px 0;color:#71717a;">Verzending (${esc(shipping.label)})</td><td style="padding:4px 0;text-align:right;">${order.shippingCost === 0 ? "Gratis" : esc(formatPrice(order.shippingCost))}</td></tr>
<tr><td style="padding:10px 0;font-weight:700;border-top:2px solid #0b0b0c;">Totaal</td><td style="padding:10px 0;text-align:right;font-weight:700;border-top:2px solid #0b0b0c;">${esc(formatPrice(order.total))}</td></tr>
</table>
${rows([
  ["Ordernummer", esc(order.orderNumber)],
  ["Bezorging", address],
])}
${button(siteUrl("/account?tab=bestellingen"), "Bekijk je bestelling")}`;
  return { subject, html: layout(subject, body, "Je betaling is ontvangen") };
}

export function orderShipped(order: Order) {
  const subject = `Je bestelling ${order.orderNumber} is verzonden`;
  const body = `
<p>Hoi ${esc(order.firstName)},</p>
<p>Goed nieuws: je bestelling is onderweg!</p>
${rows([
  ["Ordernummer", esc(order.orderNumber)],
  ...(order.trackingCode ? ([["Track & trace", esc(order.trackingCode)]] as Array<[string, string]>) : []),
])}
${button(siteUrl("/account?tab=bestellingen"), "Mijn bestellingen")}`;
  return { subject, html: layout(subject, body) };
}

export function membershipConfirmation(user: User, membership: Membership, isRenewal: boolean, opts: { discountPercent?: number } = {}) {
  const subject = isRenewal ? "Je lidmaatschap is verlengd" : "Welkom bij MazdaClub Nederland!";
  const body = `
<p>Hoi ${esc(user.firstName)},</p>
<p>${
    isRenewal
      ? "Bedankt voor je verlenging! Je blijft een jaar lang profiteren van alle ledenvoordelen."
      : "Wat leuk dat je lid bent geworden van MazdaClub Nederland! Vanaf nu profiteer je van al onze ledenvoordelen."
  }</p>
${rows([
  ["Lidnummer", esc(formatMemberNumber(membership.memberNumber))],
  ["Geldig tot en met", esc(membership.currentPeriodEnd ? formatDate(membership.currentPeriodEnd) : "-")],
  ["Automatische verlenging", membership.autoRenew ? "Aan" : "Uit"],
])}
<p><strong>Jouw voordelen:</strong></p>
<ul style="padding-left:18px;color:#3f3f46;">
<li>Gratis deelname aan alle clubevenementen</li>
<li>${opts.discountPercent ? `${esc(String(opts.discountPercent))}% korting` : "Ledenkorting"} op alle producten in de webshop</li>
<li>Toegang tot exclusieve ledenvoordelen en partneraanbiedingen</li>
</ul>
${button(siteUrl("/account"), "Naar mijn account")}`;
  return { subject, html: layout(subject, body) };
}

export function membershipReminder(user: User, membership: Membership) {
  const subject = "Je lidmaatschap verloopt binnenkort";
  const body = `
<p>Hoi ${esc(user.firstName)},</p>
<p>Je lidmaatschap van MazdaClub Nederland verloopt op <strong>${esc(
    membership.currentPeriodEnd ? formatDate(membership.currentPeriodEnd) : "",
  )}</strong>. Verleng op tijd om gratis aan evenementen deel te blijven nemen en je webshopkorting te behouden.</p>
${button(siteUrl("/lid-worden"), "Lidmaatschap verlengen")}`;
  return { subject, html: layout(subject, body) };
}

export function passwordReset(user: Pick<User, "firstName">, url: string) {
  const subject = "Wachtwoord opnieuw instellen";
  const body = `
<p>Hoi ${esc(user.firstName)},</p>
<p>We ontvingen een verzoek om het wachtwoord van je MazdaClub-account opnieuw in te stellen. Deze link is één uur geldig.</p>
${button(url, "Nieuw wachtwoord instellen")}
<p style="color:#52525b;font-size:13px;">Heb je dit niet aangevraagd? Dan kun je deze e-mail negeren; je wachtwoord blijft ongewijzigd.</p>`;
  return { subject, html: layout(subject, body) };
}

export function welcomeAccount(user: Pick<User, "firstName">) {
  const subject = "Je MazdaClub-account is aangemaakt";
  const body = `
<p>Hoi ${esc(user.firstName)},</p>
<p>Je account bij MazdaClub Nederland is aangemaakt. Je kunt nu inloggen om je inschrijvingen, bestellingen en lidmaatschap te bekijken.</p>
${button(siteUrl("/account"), "Naar mijn account")}`;
  return { subject, html: layout(subject, body) };
}

export function contactNotification(msg: { name: string; email: string; subject: string; message: string }) {
  const subject = `Nieuw contactbericht: ${msg.subject}`;
  const body = `
${rows([
  ["Naam", esc(msg.name)],
  ["E-mail", esc(msg.email)],
  ["Onderwerp", esc(msg.subject)],
])}
<p style="white-space:pre-wrap;background:#fafafa;padding:16px;border-radius:8px;">${esc(msg.message)}</p>
${button(siteUrl("/admin/berichten"), "Bekijk in beheer")}`;
  return { subject, html: layout(subject, body) };
}
