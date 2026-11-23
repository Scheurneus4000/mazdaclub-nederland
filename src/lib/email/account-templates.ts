import type { User } from "@prisma/client";
import { siteUrl } from "@/lib/utils";
import { button, esc, layout, rows } from "./templates";

export const EMAIL_VERIFICATION_TTL_HOURS = 48;

export type AccountCreatedVia = "registratie" | "lidmaatschap" | "beheer";

const ownerBlock = `<p style="background:#fef2f2;border-left:4px solid #C00000;padding:12px 14px;border-radius:6px;">Dit e-mailadres is ingesteld als <strong>eigenaar van de website</strong>. Zodra je je e-mailadres hebt bevestigd, krijg je automatisch toegang tot de <strong>beheerdermodus</strong>.</p>`;

/** Welkomstmail na het aanmaken van een account, met de link om het e-mailadres te bevestigen. */
export function accountWelcomeVerification(user: Pick<User, "firstName">, url: string, opts: { owner?: boolean; via?: AccountCreatedVia } = {}) {
  const subject = "Welkom bij MazdaClub Nederland – bevestig je e-mailadres";
  const intro =
    opts.via === "lidmaatschap"
      ? "<p>Je account bij MazdaClub Nederland is aangemaakt. Je lidmaatschap wordt actief zodra je betaling is gelukt; daarover ontvang je een aparte bevestiging.</p>"
      : opts.via === "beheer"
        ? `<p>Het bestuur van MazdaClub Nederland heeft een account voor je aangemaakt. Inloggen doe je met dit e-mailadres; kies eerst een wachtwoord via <a href="${siteUrl("/wachtwoord-vergeten")}" style="color:#C00000;">Wachtwoord vergeten</a>.</p>`
        : `<p>Je gratis account bij MazdaClub Nederland is aangemaakt. Je kunt je nu aanmelden voor ritten en bestellingen volgen. Wil je gratis meerijden met alle evenementen en korting in de webshop? Word dan op elk moment lid via <a href="${siteUrl("/account?tab=lidmaatschap")}" style="color:#C00000;">Mijn Account</a>; je hoeft daarvoor geen nieuw account te maken.</p>`;
  const body = `
<p>Hoi ${esc(user.firstName)},</p>
${intro}
<p>Bevestig nog even je e-mailadres, zodat we zeker weten dat bevestigingen en belangrijke berichten bij jou aankomen.</p>
${opts.owner ? ownerBlock : ""}
${button(url, "E-mailadres bevestigen")}
<p style="color:#52525b;font-size:13px;">Deze link is ${EMAIL_VERIFICATION_TTL_HOURS} uur geldig. Werkt de knop niet? Kopieer dan deze link in je browser:<br><span style="word-break:break-all;">${esc(url)}</span></p>
<p style="color:#52525b;font-size:13px;">Heb je geen account aangemaakt? Dan kun je deze e-mail negeren.</p>`;
  return { subject, html: layout(subject, body, "Bevestig je e-mailadres om je account af te ronden") };
}

/** Nieuwe bevestigingslink (op verzoek van het lid of het bestuur). */
export function emailVerificationReminder(user: Pick<User, "firstName">, url: string, opts: { owner?: boolean } = {}) {
  const subject = "Bevestig je e-mailadres voor MazdaClub Nederland";
  const body = `
<p>Hoi ${esc(user.firstName)},</p>
<p>Klik op de knop hieronder om je e-mailadres te bevestigen.</p>
${opts.owner ? ownerBlock : ""}
${button(url, "E-mailadres bevestigen")}
<p style="color:#52525b;font-size:13px;">Deze link is ${EMAIL_VERIFICATION_TTL_HOURS} uur geldig. Eerder verstuurde links werken niet meer.</p>`;
  return { subject, html: layout(subject, body) };
}

/** Bevestiging dat de eigenaar nu beheerder is. */
export function ownerActivated(user: Pick<User, "firstName">) {
  const subject = "Je hebt nu toegang tot de beheerdermodus";
  const body = `
<p>Hoi ${esc(user.firstName)},</p>
<p>Je e-mailadres is bevestigd en je account heeft nu beheerdersrechten. Je gebruikt de website zoals iedere bezoeker, maar ziet bovenaan de knop <strong>Beheerdermodus</strong>. Daarmee open je het beheer: gebruikers, lidmaatschappen, betalingen, verzending, e-mail en meldingen.</p>
${button(siteUrl("/admin"), "Open de beheerdermodus")}
<p style="color:#52525b;font-size:13px;">Was jij dit niet? Wijzig dan direct je wachtwoord via "Wachtwoord vergeten".</p>`;
  return { subject, html: layout(subject, body) };
}

/**
 * Uitnodiging van het bestuur om (opnieuw) betaald lid te worden met het bestaande account.
 * Optioneel met gegevens voor een handmatige overboeking.
 */
export function membershipPaymentLink(
  user: Pick<User, "firstName">,
  opts: { priceLabel: string; url: string; transfer?: { iban: string; accountHolder: string } | null; renew?: boolean },
) {
  const subject = opts.renew ? "Verleng je lidmaatschap van MazdaClub Nederland" : "Word betaald lid van MazdaClub Nederland";
  const transfer = opts.transfer
    ? `<p>Liever zelf overmaken? Dat kan ook:</p>
${rows([
  ["Bedrag", esc(opts.priceLabel)],
  ["IBAN", esc(opts.transfer.iban)],
  ["Ten name van", esc(opts.transfer.accountHolder || "MazdaClub Nederland")],
  ["Omschrijving", "Contributie + je naam"],
])}
<p style="color:#52525b;font-size:13px;">Na ontvangst activeren we je lidmaatschap handmatig; dat kan een paar dagen duren. Online betalen is direct geregeld.</p>`
    : "";
  const body = `
<p>Hoi ${esc(user.firstName)},</p>
<p>${opts.renew ? "Je kunt je lidmaatschap nu verlengen" : "Je kunt nu betaald lid worden"} van MazdaClub Nederland voor <strong>${esc(opts.priceLabel)} per jaar</strong>. Je gebruikt gewoon je bestaande account: log in en rond de betaling af met iDEAL, Bancontact, creditcard, Apple Pay, Google Pay of PayPal.</p>
${button(opts.url, opts.renew ? "Lidmaatschap verlengen" : "Nu lid worden")}
${transfer}
<p style="color:#52525b;font-size:13px;">Vragen? Beantwoord gewoon deze e-mail.</p>`;
  return { subject, html: layout(subject, body, `${opts.renew ? "Verleng" : "Word lid"} voor ${opts.priceLabel} per jaar`) };
}
