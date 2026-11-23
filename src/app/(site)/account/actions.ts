"use server";

import { revalidatePath } from "next/cache";
import { hashPassword, signOut, verifyPassword } from "@/auth";
import { prisma } from "@/lib/db";
import { cancelSubscription } from "@/lib/payments/mollie";
import { rateLimit } from "@/lib/rate-limit";
import { getCurrentUser } from "@/lib/session";
import { normalizeLicensePlate } from "@/lib/utils";
import { changePasswordSchema, fieldErrors, profileSchema } from "@/lib/validation";

export type AccountActionState = {
  ok: boolean;
  message?: string;
  error?: string;
  fields?: Record<string, string>;
} | null;

const SESSION_EXPIRED: AccountActionState = { ok: false, error: "Je sessie is verlopen. Log opnieuw in." };

function str(form: FormData, key: string): string {
  const v = form.get(key);
  return typeof v === "string" ? v : "";
}

/** Profielgegevens bijwerken (Mijn Account → Profiel). */
export async function updateProfile(_prev: AccountActionState, form: FormData): Promise<AccountActionState> {
  const user = await getCurrentUser();
  if (!user) return SESSION_EXPIRED;

  const parsed = profileSchema.safeParse({
    firstName: str(form, "firstName"),
    lastName: str(form, "lastName"),
    phone: str(form, "phone"),
    street: str(form, "street"),
    houseNumber: str(form, "houseNumber"),
    postalCode: str(form, "postalCode"),
    city: str(form, "city"),
    country: str(form, "country") || "NL",
    licensePlate: str(form, "licensePlate"),
    carModel: str(form, "carModel"),
    marketingConsent: form.get("marketingConsent") === "on",
  });
  if (!parsed.success) return { ok: false, error: "Controleer de gemarkeerde velden.", fields: fieldErrors(parsed.error) };

  const d = parsed.data;
  await prisma.user.update({
    where: { id: user.id },
    data: {
      firstName: d.firstName,
      lastName: d.lastName,
      phone: d.phone || null,
      street: d.street || null,
      houseNumber: d.houseNumber || null,
      postalCode: d.postalCode ? d.postalCode.toUpperCase() : null,
      city: d.city || null,
      country: d.country,
      licensePlate: d.licensePlate ? normalizeLicensePlate(d.licensePlate) : null,
      carModel: d.carModel || null,
      marketingConsent: d.marketingConsent,
    },
  });
  revalidatePath("/account");
  return { ok: true, message: "Je gegevens zijn opgeslagen." };
}

/** Wachtwoord wijzigen; vereist het huidige wachtwoord. */
export async function changePassword(_prev: AccountActionState, form: FormData): Promise<AccountActionState> {
  const user = await getCurrentUser();
  if (!user) return SESSION_EXPIRED;
  if (!rateLimit(`password-change:${user.id}`, 5, 15 * 60_000).ok) {
    return { ok: false, error: "Te veel pogingen. Probeer het over een kwartier opnieuw." };
  }

  const parsed = changePasswordSchema.safeParse({ currentPassword: str(form, "currentPassword"), newPassword: str(form, "newPassword") });
  if (!parsed.success) return { ok: false, error: "Controleer de gemarkeerde velden.", fields: fieldErrors(parsed.error) };
  if (str(form, "confirmPassword") !== parsed.data.newPassword) {
    return { ok: false, error: "Controleer de gemarkeerde velden.", fields: { confirmPassword: "De wachtwoorden komen niet overeen." } };
  }

  const valid = await verifyPassword(parsed.data.currentPassword, user.passwordHash);
  if (!valid) return { ok: false, error: "Je huidige wachtwoord is onjuist.", fields: { currentPassword: "Onjuist wachtwoord." } };

  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(parsed.data.newPassword) } });
  // Openstaande herstellinks zijn na een wijziging niet meer nodig.
  await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });
  revalidatePath("/account");
  return { ok: true, message: "Je wachtwoord is gewijzigd." };
}

/**
 * Account verwijderen (AVG – recht op vergetelheid).
 * - Een lopend Mollie-abonnement wordt eerst stopgezet.
 * - Inschrijvingen voor afgelopen evenementen worden geanonimiseerd.
 * - Bestellingen en betalingen blijven 7 jaar bewaard (fiscale bewaarplicht), maar worden losgekoppeld van het account.
 */
export async function deleteAccount(_prev: AccountActionState, form: FormData): Promise<AccountActionState> {
  const user = await getCurrentUser();
  if (!user) return SESSION_EXPIRED;
  if (str(form, "confirmation").trim().toUpperCase() !== "VERWIJDER") {
    return { ok: false, error: "Typ VERWIJDER om te bevestigen.", fields: { confirmation: "Typ VERWIJDER om te bevestigen." } };
  }

  if (user.membership?.mollieSubscriptionId && user.mollieCustomerId) {
    try {
      await cancelSubscription(user.mollieCustomerId, user.membership.mollieSubscriptionId);
    } catch (err) {
      console.error("[account verwijderen] abonnement stopzetten mislukt", err);
      return {
        ok: false,
        error: "We konden je automatische verlenging niet stopzetten. Neem contact met ons op, dan verwijderen we je account handmatig.",
      };
    }
  }

  await prisma.$transaction([
    prisma.eventRegistration.updateMany({
      where: { userId: user.id, event: { startsAt: { lt: new Date() } } },
      data: {
        firstName: "Verwijderd",
        lastName: "account",
        email: `verwijderd-${user.id}@anoniem.invalid`,
        phone: "-",
        licensePlate: "-",
        remarks: null,
      },
    }),
    prisma.user.delete({ where: { id: user.id } }),
  ]);

  await signOut({ redirectTo: "/" });
  return { ok: true };
}
