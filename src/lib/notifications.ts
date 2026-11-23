import "server-only";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { button, esc, layout, rows } from "@/lib/email/templates";
import { getNotificationRecipients, getSettings, type NotificationEvent } from "@/lib/settings";
import { siteUrl } from "@/lib/utils";

export type { NotificationEvent };

/** Labels voor Beheer → Instellingen → Meldingen en het meldingenoverzicht. */
export const notificationEventLabels: Record<NotificationEvent, { label: string; description: string }> = {
  accountCreated: { label: "Nieuw account", description: "Iemand heeft een (gratis) account aangemaakt." },
  membershipStarted: { label: "Nieuw betaald lid", description: "Een lidmaatschap is betaald of handmatig geactiveerd." },
  membershipRenewed: { label: "Lidmaatschap verlengd", description: "Een lid heeft verlengd (handmatig of automatisch)." },
  membershipExpired: { label: "Lidmaatschap verlopen", description: "Een lidmaatschap is afgelopen zonder verlenging." },
  eventRegistration: { label: "Aanmelding voor een rit of evenement", description: "Een inschrijving is bevestigd (gratis of betaald)." },
  orderPaid: { label: "Nieuwe bestelling", description: "Een webshopbestelling is betaald en moet worden verzonden." },
  contactMessage: { label: "Contactbericht", description: "Iemand heeft het contactformulier ingevuld." },
  paymentFailed: { label: "Mislukte betaling", description: "Een betaling is mislukt, geannuleerd of verlopen." },
  paymentRefunded: { label: "Terugbetaling", description: "Een betaling is (gedeeltelijk) terugbetaald." },
};

export type NotifyInput = {
  type: NotificationEvent;
  title: string;
  message: string;
  /** Pad in het beheer, bijv. /admin/bestellingen/abc */
  link?: string;
  /** Extra regels in de e-mail (label, waarde) – platte tekst. */
  details?: Array<[string, string]>;
};

function notificationEmailHtml(input: Pick<NotifyInput, "title" | "message" | "link" | "details">): string {
  const body = `
<p>${esc(input.message)}</p>
${input.details?.length ? rows(input.details.map(([k, v]) => [k, esc(v)])) : ""}
${input.link ? button(siteUrl(input.link), "Bekijk in het beheer") : ""}
<p style="color:#71717a;font-size:12px;">Je ontvangt deze melding omdat je beheerder bent van MazdaClub Nederland. Meldingen aan- of uitzetten: Beheer → Instellingen → Meldingen.</p>`;
  return layout(input.title, body, input.message);
}

/**
 * Meldt een belangrijke gebeurtenis aan de beheerders: altijd in het meldingencentrum van het beheer,
 * en per e-mail als die soort melding aan staat (Beheer → Instellingen → Meldingen).
 * Gooit nooit: een mislukte melding mag een betaling of inschrijving niet blokkeren.
 */
export async function notifyAdmins(input: NotifyInput): Promise<void> {
  try {
    await prisma.adminNotification.create({
      data: { type: input.type, title: input.title.slice(0, 200), message: input.message.slice(0, 2000), link: input.link ?? null },
    });
  } catch (err) {
    console.error("[melding] opslaan mislukt", err);
  }

  try {
    const settings = await getSettings("notifications");
    if (!settings.events[input.type]) return;
    const recipients = await getNotificationRecipients();
    if (recipients.length === 0) return;
    await sendEmail({ to: recipients, subject: `[MazdaClub beheer] ${input.title}`, html: notificationEmailHtml(input) });
  } catch (err) {
    console.error("[melding] e-mail versturen mislukt", err);
  }
}

/**
 * Testmelding vanuit Beheer → Instellingen → Meldingen: verschijnt in het meldingencentrum én wordt
 * altijd gemaild (ongeacht welke soorten meldingen aan staan).
 */
export async function sendTestNotification(requestedBy: string): Promise<{ ok: boolean; recipients: string[]; error?: string }> {
  const input = {
    title: "Testmelding",
    message: `Dit is een testmelding, aangevraagd door ${requestedBy}. Zo zien meldingen over nieuwe leden, aanmeldingen en bestellingen eruit.`,
    link: "/admin/meldingen",
    details: [["Verstuurd op", new Date().toLocaleString("nl-NL", { timeZone: "Europe/Amsterdam" })]] as Array<[string, string]>,
  };
  await prisma.adminNotification.create({ data: { type: "test", title: input.title, message: input.message, link: input.link } });
  const recipients = await getNotificationRecipients();
  if (recipients.length === 0) return { ok: false, recipients, error: "Er zijn geen ontvangers ingesteld en er is geen eigenaar (OWNER_EMAIL) bekend." };
  const sent = await sendEmail({ to: recipients, subject: `[MazdaClub beheer] ${input.title}`, html: notificationEmailHtml(input) });
  return sent ? { ok: true, recipients } : { ok: false, recipients, error: "De e-mail kon niet worden verstuurd. Controleer Instellingen → E-mail en stuur daar een testmail." };
}
