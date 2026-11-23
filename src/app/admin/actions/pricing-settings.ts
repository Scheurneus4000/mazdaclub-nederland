"use server";

import type { ShippingMethod } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { fd } from "@/lib/form-data";
import { SHIPPING_METHODS } from "@/lib/pricing";
import { requireAdmin } from "@/lib/session";
import { applySecretInput, getSettings, saveSettings } from "@/lib/settings";
import { failure, success, type ActionState } from "./state";

function moneyField(form: FormData, key: string, errors: Record<string, string>, opts: { required?: boolean; max?: number } = {}): number | null {
  const value = fd.cents(form, key);
  if (value === null) {
    if (opts.required) errors[key] = "Vul een bedrag in";
    return null;
  }
  if (Number.isNaN(value)) {
    errors[key] = "Vul een geldig bedrag in, bijv. 50 of 4,95";
    return null;
  }
  if (opts.max !== undefined && value > opts.max) {
    errors[key] = `Maximaal € ${(opts.max / 100).toLocaleString("nl-NL")}`;
    return null;
  }
  return value;
}

/** Beheer → Instellingen → Lidmaatschap & prijzen */
export async function saveMembershipSettings(_prev: ActionState, form: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const errors: Record<string, string> = {};

  const priceCents = moneyField(form, "priceCents", errors, { required: true, max: 100_000 });
  const eventPriceNonMemberCents = moneyField(form, "eventPriceNonMemberCents", errors, { required: true, max: 100_000 });
  const eventPriceMemberCents = moneyField(form, "eventPriceMemberCents", errors, { max: 100_000 }) ?? 0;
  const discountRaw = fd.str(form, "memberDiscountPercent");
  const memberDiscountPercent = Number.parseInt(discountRaw, 10);
  if (!/^\d{1,3}$/.test(discountRaw) || memberDiscountPercent > 100) errors.memberDiscountPercent = "Vul een percentage tussen 0 en 100 in";
  const reminderRaw = fd.str(form, "reminderDaysBefore");
  const reminderDaysBefore = Number.parseInt(reminderRaw, 10);
  if (!/^\d{1,2}$/.test(reminderRaw) || reminderDaysBefore > 90) errors.reminderDaysBefore = "Vul een aantal dagen tussen 0 en 90 in";
  if (priceCents === 0) errors.priceCents = "Het lidmaatschap moet een prijs hebben (minimaal € 1)";

  if (Object.keys(errors).length) return failure("Controleer de gemarkeerde velden.", errors);

  const current = await getSettings("membership");
  await saveSettings(
    "membership",
    {
      ...current,
      priceCents: priceCents!,
      memberDiscountPercent,
      eventPriceNonMemberCents: eventPriceNonMemberCents!,
      eventPriceMemberCents,
      autoRenewAvailable: fd.bool(form, "autoRenewAvailable"),
      reminderDaysBefore,
    },
    admin.email,
  );
  revalidatePath("/", "layout");
  return success("Opgeslagen. De nieuwe prijzen gelden direct op de hele website.");
}

const emailOrEmpty = z.union([z.literal(""), z.string().email()]);

/** Beheer → Instellingen → Verzending */
export async function saveShippingSettings(_prev: ActionState, form: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const errors: Record<string, string> = {};
  const current = await getSettings("shipping");

  const country = fd.str(form, "sender.country").toUpperCase() || "NL";
  if (!/^[A-Z]{2}$/.test(country)) errors["sender.country"] = "Kies een land";
  const senderEmail = fd.str(form, "sender.email");
  if (!emailOrEmpty.safeParse(senderEmail).success) errors["sender.email"] = "Vul een geldig e-mailadres in";
  const postalCode = fd.str(form, "sender.postalCode").toUpperCase().replace(/^(\d{4})\s?([A-Z]{2})$/, "$1 $2");

  const methods = { ...current.methods };
  for (const m of SHIPPING_METHODS as ShippingMethod[]) {
    const label = fd.str(form, `${m}.label`);
    if (!label) errors[`${m}.label`] = "Vul een naam in";
    const costCents = m === "PICKUP_EVENT" ? 0 : (moneyField(form, `${m}.costCents`, errors, { required: true, max: 100_000 }) ?? 0);
    const freeFromCents = m === "PICKUP_EVENT" ? null : moneyField(form, `${m}.freeFromCents`, errors, { max: 1_000_000 });
    methods[m] = {
      enabled: fd.bool(form, `${m}.enabled`),
      label: label.slice(0, 80),
      description: fd.str(form, `${m}.description`).slice(0, 160),
      costCents,
      freeFromCents,
    };
  }
  if (!SHIPPING_METHODS.some((m) => methods[m].enabled)) errors["POSTNL_NL.enabled"] = "Zet minimaal één verzendmethode aan";

  const provider = fd.str(form, "carrier.provider");
  if (!["none", "sendcloud", "myparcel"].includes(provider)) errors["carrier.provider"] = "Kies een verzendplatform";

  if (Object.keys(errors).length) return failure("Controleer de gemarkeerde velden.", errors);

  await saveSettings(
    "shipping",
    {
      sender: {
        name: fd.str(form, "sender.name").slice(0, 120),
        contactPerson: fd.str(form, "sender.contactPerson").slice(0, 120),
        street: fd.str(form, "sender.street").slice(0, 120),
        houseNumber: fd.str(form, "sender.houseNumber").slice(0, 20),
        postalCode: postalCode.slice(0, 12),
        city: fd.str(form, "sender.city").slice(0, 80),
        country,
        phone: fd.str(form, "sender.phone").slice(0, 30),
        email: senderEmail,
      },
      methods,
      processingTime: fd.str(form, "processingTime").slice(0, 160),
      carrier: {
        provider: provider as "none" | "sendcloud" | "myparcel",
        apiKey: applySecretInput(current.carrier.apiKey, form.get("carrier.apiKey")),
        apiSecret: applySecretInput(current.carrier.apiSecret, form.get("carrier.apiSecret")),
      },
    },
    admin.email,
  );
  revalidatePath("/", "layout");
  return success("Opgeslagen. Verzendopties en -kosten gelden direct in de webshop.");
}
