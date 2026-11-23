import type { User } from "@prisma/client";
import { formatDate } from "@/lib/utils";
import { button, esc, layout } from "./templates";

export const INVITE_TTL_DAYS = 7;

/** Uitnodiging voor een lid dat door het bestuur is toegevoegd: zelf een wachtwoord kiezen. */
export function memberInvitation(user: Pick<User, "firstName">, url: string, opts: { periodEnd?: Date | null } = {}) {
  const subject = "Welkom bij MazdaClub Nederland – activeer je account";
  const membershipLine = opts.periodEnd
    ? `<p>Je lidmaatschap is actief tot en met <strong>${esc(formatDate(opts.periodEnd))}</strong>. Als lid rijd je gratis mee met onze evenementen en krijg je korting in de webshop.</p>`
    : "";
  const body = `
<p>Hoi ${esc(user.firstName)},</p>
<p>Het bestuur van MazdaClub Nederland heeft een account voor je aangemaakt op onze website. Kies via de knop hieronder je eigen wachtwoord; daarna kun je inloggen, je gegevens bekijken en je aanmelden voor evenementen.</p>
${membershipLine}
${button(url, "Wachtwoord kiezen")}
<p style="color:#52525b;font-size:13px;">Deze link is ${INVITE_TTL_DAYS} dagen geldig. Is hij verlopen? Gebruik dan "Wachtwoord vergeten" op de inlogpagina.</p>
<p style="color:#52525b;font-size:13px;">Verwacht je deze e-mail niet? Dan kun je hem negeren of ons laten weten dat je geen account wilt.</p>`;
  return { subject, html: layout(subject, body, "Kies je wachtwoord en log in bij MazdaClub Nederland") };
}

/** Nieuwe wachtwoordlink op verzoek van het bestuur (voor een bestaand, al geactiveerd account). */
export function memberPasswordLink(user: Pick<User, "firstName">, url: string) {
  const subject = "Stel je wachtwoord in voor MazdaClub Nederland";
  const body = `
<p>Hoi ${esc(user.firstName)},</p>
<p>Op jouw verzoek (of dat van het bestuur) sturen we je een link om een nieuw wachtwoord voor je MazdaClub-account in te stellen.</p>
${button(url, "Wachtwoord instellen")}
<p style="color:#52525b;font-size:13px;">Deze link is ${INVITE_TTL_DAYS} dagen geldig. Heb je niets aangevraagd? Dan kun je deze e-mail negeren; je huidige wachtwoord blijft werken.</p>`;
  return { subject, html: layout(subject, body) };
}
