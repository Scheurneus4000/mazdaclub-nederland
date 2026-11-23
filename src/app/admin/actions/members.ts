"use server";

import { createHash, randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { hashPassword } from "@/auth";
import { fromAmsterdamInput } from "@/components/admin/datetime";
import { markEmailVerified, onAccountCreated, resendVerificationEmail } from "@/lib/accounts";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { membershipPaymentLink } from "@/lib/email/account-templates";
import { INVITE_TTL_DAYS, memberInvitation, memberPasswordLink } from "@/lib/email/member-templates";
import { membershipConfirmation } from "@/lib/email/templates";
import { fd } from "@/lib/form-data";
import { isMembershipActive } from "@/lib/membership";
import { notifyAdmins } from "@/lib/notifications";
import { isOwnerEmail } from "@/lib/owner";
import { cancelSubscription } from "@/lib/payments/mollie";
import { requireAdmin } from "@/lib/session";
import { getPricing, getSettings } from "@/lib/settings";
import { addYears, formatDate, formatPrice, normalizeLicensePlate, siteUrl } from "@/lib/utils";
import { emailSchema, fieldErrors, profileSchema } from "@/lib/validation";
import { failure, success, type ActionState } from "./state";

const userIdSchema = z.object({ userId: z.string().min(1).max(64) });

function str(formData: FormData, key: string): string {
  const v = formData.get(key);
  return typeof v === "string" ? v : "";
}

const memberDetailsSchema = profileSchema.extend({ email: emailSchema });

function parseMemberDetails(formData: FormData) {
  return memberDetailsSchema.safeParse({
    firstName: str(formData, "firstName"),
    lastName: str(formData, "lastName"),
    email: str(formData, "email"),
    phone: str(formData, "phone"),
    street: str(formData, "street"),
    houseNumber: str(formData, "houseNumber"),
    postalCode: str(formData, "postalCode"),
    city: str(formData, "city"),
    country: str(formData, "country") || "NL",
    licensePlate: str(formData, "licensePlate"),
    carModel: str(formData, "carModel"),
    marketingConsent: formData.get("marketingConsent") === "on",
  });
}

function detailsToData(d: z.infer<typeof memberDetailsSchema>) {
  return {
    firstName: d.firstName,
    lastName: d.lastName,
    email: d.email,
    phone: d.phone || null,
    street: d.street || null,
    houseNumber: d.houseNumber || null,
    postalCode: d.postalCode ? d.postalCode.toUpperCase() : null,
    city: d.city || null,
    country: d.country,
    licensePlate: d.licensePlate ? normalizeLicensePlate(d.licensePlate) : null,
    carModel: d.carModel || null,
    marketingConsent: d.marketingConsent,
  };
}

/** Maakt een eenmalige link (7 dagen geldig) waarmee het lid zelf een wachtwoord kiest. */
async function createPasswordLink(userId: string, welcome: boolean): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  await prisma.$transaction([
    prisma.passwordResetToken.deleteMany({ where: { userId, usedAt: null } }),
    prisma.passwordResetToken.create({ data: { userId, tokenHash, expiresAt: new Date(Date.now() + INVITE_TTL_DAYS * 86_400_000) } }),
  ]);
  return siteUrl(`/wachtwoord-resetten?token=${encodeURIComponent(token)}${welcome ? "&welkom=1" : ""}`);
}

function revalidateMember(userId: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/leden");
  revalidatePath(`/admin/leden/${userId}`);
  revalidatePath("/account");
}

const manualMembershipSchema = userIdSchema.extend({
  years: z.coerce.number().int().min(1).max(5),
  method: z.enum(["transfer", "cash", "free"]),
  note: z.string().trim().max(200).optional().default(""),
  sendConfirmation: z.boolean(),
});

const manualMethodLabels: Record<"transfer" | "cash" | "free", string> = { transfer: "overboeking", cash: "contant", free: "gratis / erelid" };

/**
 * Gebruiker betaald lid maken of verlengen zonder online betaling (contant, overboeking, erelid).
 * Registreert een handmatige betaling (voor de administratie en omzetcijfers), verlengt het
 * lidmaatschap aansluitend op de huidige periode en stuurt optioneel de bevestigingsmail.
 */
export async function activatePaidMembership(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const parsed = manualMembershipSchema.safeParse({
    userId: formData.get("userId"),
    years: formData.get("years") ?? 1,
    method: formData.get("method"),
    note: str(formData, "note"),
    sendConfirmation: formData.get("sendConfirmation") === "on",
  });
  if (!parsed.success) return failure("Controleer de gemarkeerde velden.", fieldErrors(parsed.error));
  const { userId, years, method, note, sendConfirmation } = parsed.data;

  const amount = method === "free" ? 0 : fd.cents(formData, "amount");
  if (amount === null || Number.isNaN(amount) || amount < 0 || amount > 1_000_000) {
    return failure("Controleer de gemarkeerde velden.", { amount: "Vul een geldig bedrag in, bijv. 50,00" });
  }

  const user = await prisma.user.findUnique({ where: { id: userId }, include: { membership: true } });
  if (!user) return failure("Gebruiker niet gevonden.");

  const now = new Date();
  const existing = user.membership;
  const wasActive = isMembershipActive(existing, now);
  const isRenewal = !!existing?.startedAt;
  const periodStart = wasActive && existing?.currentPeriodEnd ? existing.currentPeriodEnd : now;
  const periodEnd = addYears(periodStart, years);

  const membership = await prisma.$transaction(async (tx) => {
    const m = existing ?? (await tx.membership.create({ data: { userId, status: "PENDING", autoRenew: false } }));
    const updated = await tx.membership.update({
      where: { id: m.id },
      data: {
        status: "ACTIVE",
        startedAt: m.startedAt ?? now,
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
        reminderSentAt: null,
        cancelledAt: null,
      },
    });
    await tx.payment.create({
      data: {
        provider: "MANUAL",
        type: "MEMBERSHIP",
        status: "PAID",
        amount,
        method,
        paidAt: now,
        userId,
        membershipId: m.id,
        description: `${isRenewal ? "Verlenging lidmaatschap" : "Lidmaatschap"} (${years} jaar, handmatig: ${manualMethodLabels[method]})${note ? ` – ${note}` : ""} · door ${admin.firstName} ${admin.lastName}`.slice(0, 255),
      },
    });
    return updated;
  });

  let mailNote = "";
  if (sendConfirmation) {
    const sent = await sendEmail({ to: user.email, ...membershipConfirmation(user, membership, isRenewal) });
    mailNote = sent ? ` Bevestiging verstuurd naar ${user.email}.` : " Let op: de bevestigingsmail kon niet worden verstuurd.";
  }

  const name = `${user.firstName} ${user.lastName}`;
  await notifyAdmins({
    type: isRenewal ? "membershipRenewed" : "membershipStarted",
    title: `${isRenewal ? "Lidmaatschap verlengd" : "Nieuw betaald lid"}: ${name}`,
    message: `${name} is handmatig ${isRenewal ? "verlengd" : "betaald lid gemaakt"} door ${admin.firstName} ${admin.lastName} (${manualMethodLabels[method]}).`,
    link: `/admin/leden/${userId}`,
    details: [
      ["Geldig tot", formatDate(periodEnd)],
      ["Bedrag", amount === 0 ? "Gratis" : formatPrice(amount)],
      ["Betaalwijze", manualMethodLabels[method]],
    ],
  });

  revalidateMember(userId);
  revalidatePath("/admin/betalingen");
  return success(`${user.firstName} is betaald lid tot en met ${formatDate(periodEnd)}.${mailNote}`);
}

/** E-mail met een link om met het bestaande account online lid te worden of te verlengen. */
export async function sendMembershipPaymentLink(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = userIdSchema.safeParse({ userId: formData.get("userId") });
  if (!parsed.success) return failure("Ongeldige gebruiker.");
  const user = await prisma.user.findUnique({ where: { id: parsed.data.userId }, include: { membership: true } });
  if (!user) return failure("Gebruiker niet gevonden.");
  if (user.membership?.mollieSubscriptionId && isMembershipActive(user.membership)) {
    return failure(`${user.firstName} wordt al automatisch verlengd; een betaallink is niet nodig.`);
  }

  const [pricing, payments] = await Promise.all([getPricing(), getSettings("payments")]);
  const sent = await sendEmail({
    to: user.email,
    ...membershipPaymentLink(user, {
      priceLabel: formatPrice(pricing.membershipPriceCents),
      url: siteUrl(`/inloggen?callbackUrl=${encodeURIComponent("/lid-worden")}`),
      transfer: payments.iban ? { iban: payments.iban, accountHolder: payments.accountHolder } : null,
      renew: !!user.membership?.startedAt,
    }),
  });
  if (!sent) return failure("De e-mail kon niet worden verstuurd. Controleer Instellingen → E-mail.");
  return success(`Betaallink verstuurd naar ${user.email}. ${user.firstName} logt in met het bestaande account en betaalt online.`);
}

/** E-mailadres handmatig als bevestigd markeren (bijv. als het lid dat persoonlijk heeft bevestigd). */
export async function markUserEmailVerified(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = userIdSchema.safeParse({ userId: formData.get("userId") });
  if (!parsed.success) return failure("Ongeldige gebruiker.");
  const { promoted } = await markEmailVerified(parsed.data.userId);
  revalidateMember(parsed.data.userId);
  return success(promoted ? "E-mailadres bevestigd. Dit is de eigenaar: het account heeft nu beheerdersrechten." : "E-mailadres gemarkeerd als bevestigd.");
}

/** Nieuwe bevestigingsmail sturen (max. 3 per kwartier per account). */
export async function resendUserVerification(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = userIdSchema.safeParse({ userId: formData.get("userId") });
  if (!parsed.success) return failure("Ongeldige gebruiker.");
  const result = await resendVerificationEmail(parsed.data.userId);
  if (!result.ok) return failure(result.error);
  return success("Er is een nieuwe bevestigingsmail verstuurd.");
}

const statusSchema = userIdSchema.extend({ status: z.enum(["ACTIVE", "EXPIRED", "CANCELLED", "PENDING"]) });

export async function setMembershipStatus(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = statusSchema.safeParse({ userId: formData.get("userId"), status: formData.get("status") });
  if (!parsed.success) return failure("Ongeldige status.");
  const { userId, status } = parsed.data;

  const membership = await prisma.membership.findUnique({ where: { userId }, include: { user: { select: { mollieCustomerId: true } } } });
  if (!membership) return failure("Dit account heeft nog geen lidmaatschap. Gebruik 'Handmatig verlengen'.");
  if (membership.status === status) return failure("De status is al zo ingesteld.");

  if (status === "ACTIVE" && !isMembershipActive({ status: "ACTIVE", currentPeriodEnd: membership.currentPeriodEnd })) {
    return failure("De lidmaatschapsperiode is verlopen. Gebruik 'Handmatig 1 jaar verlengen' om een nieuwe periode te starten.");
  }

  let note = "";
  if (status === "CANCELLED" && membership.mollieSubscriptionId) {
    if (membership.user.mollieCustomerId) {
      try {
        await cancelSubscription(membership.user.mollieCustomerId, membership.mollieSubscriptionId);
        note = " Het automatische Mollie-abonnement is stopgezet.";
      } catch (err) {
        console.error("[admin] abonnement opzeggen mislukt", err);
        note = " Let op: het Mollie-abonnement kon niet automatisch worden stopgezet; controleer dit in het Mollie-dashboard.";
      }
    }
  }

  await prisma.membership.update({
    where: { id: membership.id },
    data: {
      status,
      ...(status === "CANCELLED" ? { cancelledAt: new Date(), autoRenew: false, mollieSubscriptionId: null } : {}),
    },
  });
  revalidateMember(userId);
  return success(`Status van het lidmaatschap gewijzigd.${note}`);
}

const roleSchema = userIdSchema.extend({ role: z.enum(["USER", "ADMIN"]) });

export async function setUserRole(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const parsed = roleSchema.safeParse({ userId: formData.get("userId"), role: formData.get("role") });
  if (!parsed.success) return failure("Ongeldige rol.");
  const { userId, role } = parsed.data;

  if (userId === admin.id && role !== "ADMIN") return failure("Je kunt je eigen beheerdersrechten niet intrekken.");
  if (role === "USER") {
    const target = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
    if (target && isOwnerEmail(target.email)) return failure("Dit is de eigenaar van de website. De beheerdersrechten van de eigenaar kunnen niet worden ingetrokken.");
    const admins = await prisma.user.count({ where: { role: "ADMIN" } });
    if (admins <= 1) return failure("Er moet minimaal één beheerder overblijven.");
  }

  const user = await prisma.user.update({ where: { id: userId }, data: { role } }).catch(() => null);
  if (!user) return failure("Gebruiker niet gevonden.");
  revalidateMember(userId);
  return success(
    role === "ADMIN"
      ? `${user.firstName} is nu beheerder en ziet direct de knop "Beheerdermodus".`
      : `${user.firstName} is geen beheerder meer.`,
  );
}

/**
 * Lid toevoegen dat buiten de website om lid werd (contant, overboeking, erelid).
 * Optioneel direct een actief lidmaatschap en een uitnodigingsmail om zelf een wachtwoord te kiezen.
 */
export async function createMember(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = parseMemberDetails(formData);
  if (!parsed.success) return failure("Controleer de gemarkeerde velden.", fieldErrors(parsed.error));
  const details = detailsToData(parsed.data);

  const withMembership = formData.get("createMembership") === "on";
  const sendInvite = formData.get("sendInvite") === "on";
  const fields: Record<string, string> = {};

  let periodStart: Date | null = null;
  let periodEnd: Date | null = null;
  if (withMembership) {
    periodStart = fromAmsterdamInput(formData.get("periodStart"));
    periodEnd = fromAmsterdamInput(formData.get("periodEnd"));
    if (!periodStart) fields.periodStart = "Vul een geldige startdatum in";
    if (!periodEnd) fields.periodEnd = "Vul een geldige einddatum in";
    if (periodStart && periodEnd && periodEnd <= periodStart) fields.periodEnd = "De einddatum moet na de startdatum liggen";
    else if (periodEnd && periodEnd <= new Date()) fields.periodEnd = "De einddatum moet in de toekomst liggen";
  }
  if (await prisma.user.findUnique({ where: { email: details.email }, select: { id: true } })) {
    fields.email = "Er bestaat al een account met dit e-mailadres. Zoek het lid op in de ledenlijst.";
  }
  if (Object.keys(fields).length) return failure("Controleer de gemarkeerde velden.", fields);

  // Willekeurig wachtwoord dat niemand kent: het lid kiest zelf een wachtwoord via de uitnodiging of "Wachtwoord vergeten".
  const passwordHash = await hashPassword(randomBytes(32).toString("base64url"));
  const user = await prisma.user.create({
    data: {
      ...details,
      passwordHash,
      ...(withMembership && periodStart && periodEnd
        ? {
            membership: {
              create: {
                status: "ACTIVE",
                startedAt: periodStart,
                currentPeriodStart: periodStart,
                currentPeriodEnd: periodEnd,
                autoRenew: false,
              },
            },
          }
        : {}),
    },
  });

  let invited = false;
  if (sendInvite) {
    const url = await createPasswordLink(user.id, true);
    invited = await sendEmail({ to: user.email, ...memberInvitation(user, url, { periodEnd }) });
  } else {
    // Zonder uitnodiging: welkomstmail met bevestigingslink (inloggen kan later via "Wachtwoord vergeten").
    await onAccountCreated(user, { via: "beheer" });
  }

  revalidateMember(user.id);
  redirect(`/admin/leden/${user.id}?aangemaakt=1${sendInvite ? (invited ? "&uitnodiging=1" : "&uitnodiging=mislukt") : ""}`);
}

/** Persoonsgegevens van een lid aanpassen. */
export async function updateMemberProfile(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const idParsed = userIdSchema.safeParse({ userId: formData.get("userId") });
  if (!idParsed.success) return failure("Ongeldig lid.");
  const { userId } = idParsed.data;

  const parsed = parseMemberDetails(formData);
  if (!parsed.success) return failure("Controleer de gemarkeerde velden.", fieldErrors(parsed.error));
  const details = detailsToData(parsed.data);

  const existing = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, email: true } });
  if (!existing) return failure("Lid niet gevonden.");
  if (details.email !== existing.email) {
    const taken = await prisma.user.findUnique({ where: { email: details.email }, select: { id: true } });
    if (taken) return failure("Controleer de gemarkeerde velden.", { email: "Dit e-mailadres is al in gebruik bij een ander account." });
  }

  await prisma.user.update({ where: { id: userId }, data: details });
  revalidateMember(userId);
  return success(
    details.email !== existing.email
      ? `Gegevens opgeslagen. Let op: ${details.firstName} logt voortaan in met ${details.email}.`
      : "Gegevens opgeslagen.",
  );
}

/** Uitnodiging of nieuwe wachtwoordlink per e-mail sturen (7 dagen geldig). */
export async function sendMemberInvite(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const parsed = userIdSchema.safeParse({ userId: formData.get("userId") });
  if (!parsed.success) return failure("Ongeldig lid.");

  const user = await prisma.user.findUnique({
    where: { id: parsed.data.userId },
    select: { id: true, email: true, firstName: true, lastLoginAt: true, membership: { select: { status: true, currentPeriodEnd: true } } },
  });
  if (!user) return failure("Lid niet gevonden.");

  const neverLoggedIn = !user.lastLoginAt;
  const url = await createPasswordLink(user.id, neverLoggedIn);
  const activeEnd = user.membership && isMembershipActive(user.membership) ? user.membership.currentPeriodEnd : null;
  const sent = await sendEmail({
    to: user.email,
    ...(neverLoggedIn ? memberInvitation(user, url, { periodEnd: activeEnd }) : memberPasswordLink(user, url)),
  });
  if (!sent) return failure("De e-mail kon niet worden verstuurd. Controleer de e-mailinstellingen en probeer het opnieuw.");
  revalidateMember(user.id);
  return success(`${neverLoggedIn ? "Uitnodiging" : "Wachtwoordlink"} verstuurd naar ${user.email}. De link is ${INVITE_TTL_DAYS} dagen geldig.`);
}

/**
 * Lid (account) definitief verwijderen. Zet eerst een Mollie-abonnement stop. Bestellingen en betalingen blijven
 * (fiscale bewaarplicht) maar worden losgekoppeld; inschrijvingen voor afgelopen evenementen worden geanonimiseerd.
 */
export async function deleteMember(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const parsed = userIdSchema.safeParse({ userId: formData.get("userId") });
  if (!parsed.success) return failure("Ongeldig lid.");
  if (str(formData, "confirmation").trim().toUpperCase() !== "VERWIJDER") return failure("Typ VERWIJDER om te bevestigen.");

  const { userId } = parsed.data;
  if (userId === admin.id) return failure("Je kunt je eigen account hier niet verwijderen. Gebruik daarvoor Mijn Account.");

  const user = await prisma.user.findUnique({ where: { id: userId }, include: { membership: true } });
  if (!user) return failure("Lid niet gevonden.");
  if (isOwnerEmail(user.email)) return failure("Dit is de eigenaar van de website en kan niet door een beheerder worden verwijderd.");
  if (user.role === "ADMIN" && (await prisma.user.count({ where: { role: "ADMIN" } })) <= 1) {
    return failure("Dit is de laatste beheerder en kan niet worden verwijderd.");
  }

  if (user.membership?.mollieSubscriptionId && user.mollieCustomerId) {
    try {
      await cancelSubscription(user.mollieCustomerId, user.membership.mollieSubscriptionId);
    } catch (err) {
      console.error("[admin] abonnement stopzetten bij verwijderen mislukt", err);
      return failure("Het automatische Mollie-abonnement kon niet worden stopgezet. Zet het eerst stop in het Mollie-dashboard en probeer het opnieuw.");
    }
  }

  await prisma.$transaction([
    prisma.eventRegistration.updateMany({
      where: { userId, event: { startsAt: { lt: new Date() } } },
      data: { firstName: "Verwijderd", lastName: "account", email: `verwijderd-${userId}@anoniem.invalid`, phone: "-", licensePlate: "-", remarks: null },
    }),
    prisma.user.delete({ where: { id: userId } }),
  ]);

  revalidatePath("/admin");
  revalidatePath("/admin/leden");
  redirect("/admin/leden?verwijderd=1");
}
