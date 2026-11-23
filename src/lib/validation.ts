import { z } from "zod";

/** Gedeelde Zod-schema's. Worden zowel in API-routes als server actions gebruikt. */

const trimmed = (max = 200) => z.string().trim().max(max);

export const emailSchema = z.string().trim().toLowerCase().email("Vul een geldig e-mailadres in").max(254);

export const phoneSchema = z
  .string()
  .trim()
  .min(8, "Vul een geldig telefoonnummer in")
  .max(20, "Vul een geldig telefoonnummer in")
  .regex(/^[+0-9()\-\s]+$/, "Vul een geldig telefoonnummer in");

/** Ruime controle: Nederlandse en Belgische kentekens, met of zonder streepjes. */
export const licensePlateSchema = z
  .string()
  .trim()
  .min(4, "Vul een geldig kenteken in")
  .max(12, "Vul een geldig kenteken in")
  .regex(/^[A-Za-z0-9\-\s]+$/, "Vul een geldig kenteken in");

export const passwordSchema = z
  .string()
  .min(10, "Wachtwoord moet minimaal 10 tekens bevatten")
  .max(128)
  .regex(/[A-Za-z]/, "Gebruik minimaal één letter")
  .regex(/[0-9]/, "Gebruik minimaal één cijfer");

export const postalCodeSchema = z
  .string()
  .trim()
  .max(10)
  .regex(/^(\d{4}\s?[A-Za-z]{2}|\d{4})$/, "Vul een geldige postcode in");

/** Velden die elk publiek formulier meestuurt voor botbescherming. */
export const antiSpamSchema = z.object({
  website: z.string().max(0).optional().or(z.literal("")), // honeypot – moet leeg blijven
  formStartedAt: z.coerce.number().optional(),
  turnstileToken: z.string().optional(),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Vul je wachtwoord in").max(128),
});

/** Basisvelden van een nieuw account (gedeeld door registratie en lid worden). */
export const accountFieldsSchema = z.object({
  firstName: trimmed(80).min(1, "Vul je voornaam in"),
  lastName: trimmed(80).min(1, "Vul je achternaam in"),
  email: emailSchema,
  phone: phoneSchema.optional().or(z.literal("")),
  password: passwordSchema,
  marketingConsent: z.boolean().optional().default(false),
});

export const registerSchema = accountFieldsSchema
  .extend({
    acceptTerms: z.literal(true, { errorMap: () => ({ message: "Je moet akkoord gaan met de voorwaarden" }) }),
  })
  .merge(antiSpamSchema);

export const eventRegistrationSchema = z
  .object({
    firstName: trimmed(80).min(1, "Vul je voornaam in"),
    lastName: trimmed(80).min(1, "Vul je achternaam in"),
    email: emailSchema,
    phone: phoneSchema,
    licensePlate: licensePlateSchema,
    remarks: trimmed(1000).optional().or(z.literal("")),
    acceptTerms: z.literal(true, { errorMap: () => ({ message: "Je moet akkoord gaan met de voorwaarden" }) }),
  })
  .merge(antiSpamSchema);

export const addressSchema = z.object({
  street: trimmed(120).min(1, "Vul je straat in"),
  houseNumber: trimmed(20).min(1, "Vul je huisnummer in"),
  postalCode: postalCodeSchema,
  city: trimmed(80).min(1, "Vul je woonplaats in"),
  country: z.enum(["NL", "BE"]).default("NL"),
});

export const membershipCheckoutSchema = z
  .object({
    autoRenew: z.boolean().default(true),
    // Alleen verplicht als de bezoeker nog geen account heeft:
    account: accountFieldsSchema
      .merge(addressSchema.partial())
      .extend({ licensePlate: licensePlateSchema.optional().or(z.literal("")), carModel: trimmed(80).optional() })
      .optional(),
    acceptTerms: z.literal(true, { errorMap: () => ({ message: "Je moet akkoord gaan met de voorwaarden" }) }),
  })
  .merge(antiSpamSchema);

export const cartItemSchema = z.object({
  variantId: z.string().min(1),
  quantity: z.coerce.number().int().min(1).max(25),
});

export const quoteSchema = z.object({
  items: z.array(cartItemSchema).max(50),
  shippingMethod: z.enum(["POSTNL_NL", "POSTNL_BE", "PICKUP_EVENT"]).default("POSTNL_NL"),
});

export const checkoutSchema = z
  .object({
    items: z.array(cartItemSchema).min(1, "Je winkelwagen is leeg").max(50),
    shippingMethod: z.enum(["POSTNL_NL", "POSTNL_BE", "PICKUP_EVENT"]),
    firstName: trimmed(80).min(1, "Vul je voornaam in"),
    lastName: trimmed(80).min(1, "Vul je achternaam in"),
    email: emailSchema,
    phone: phoneSchema.optional().or(z.literal("")),
    street: trimmed(120).optional().or(z.literal("")),
    houseNumber: trimmed(20).optional().or(z.literal("")),
    postalCode: trimmed(10).optional().or(z.literal("")),
    city: trimmed(80).optional().or(z.literal("")),
    country: z.enum(["NL", "BE"]).default("NL"),
    notes: trimmed(1000).optional().or(z.literal("")),
    acceptTerms: z.literal(true, { errorMap: () => ({ message: "Je moet akkoord gaan met de voorwaarden" }) }),
  })
  .merge(antiSpamSchema)
  .superRefine((data, ctx) => {
    if (data.shippingMethod !== "PICKUP_EVENT") {
      const parsed = addressSchema.safeParse(data);
      if (!parsed.success) {
        for (const issue of parsed.error.issues) ctx.addIssue(issue);
      }
    }
  });

export const contactSchema = z
  .object({
    name: trimmed(120).min(1, "Vul je naam in"),
    email: emailSchema,
    subject: trimmed(160).min(1, "Vul een onderwerp in"),
    message: trimmed(5000).min(10, "Je bericht is te kort"),
  })
  .merge(antiSpamSchema);

export const profileSchema = z.object({
  firstName: trimmed(80).min(1, "Vul je voornaam in"),
  lastName: trimmed(80).min(1, "Vul je achternaam in"),
  phone: phoneSchema.optional().or(z.literal("")),
  street: trimmed(120).optional().or(z.literal("")),
  houseNumber: trimmed(20).optional().or(z.literal("")),
  postalCode: trimmed(10).optional().or(z.literal("")),
  city: trimmed(80).optional().or(z.literal("")),
  country: z.enum(["NL", "BE"]).default("NL"),
  licensePlate: trimmed(12).optional().or(z.literal("")),
  carModel: trimmed(80).optional().or(z.literal("")),
  marketingConsent: z.boolean().default(false),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Vul je huidige wachtwoord in"),
  newPassword: passwordSchema,
});

export const forgotPasswordSchema = z.object({ email: emailSchema }).merge(antiSpamSchema);

export const resetPasswordSchema = z.object({
  token: z.string().min(20),
  password: passwordSchema,
});

export const eventAdminSchema = z.object({
  title: trimmed(160).min(3, "Titel is verplicht"),
  slug: trimmed(100).regex(/^[a-z0-9-]*$/, "Alleen kleine letters, cijfers en streepjes").optional().or(z.literal("")),
  summary: trimmed(300).min(10, "Korte samenvatting is verplicht"),
  description: z.string().trim().min(20, "Beschrijving is verplicht").max(20000),
  startsAt: z.coerce.date({ errorMap: () => ({ message: "Ongeldige startdatum" }) }),
  endsAt: z.coerce.date().optional().nullable(),
  registrationDeadline: z.coerce.date().optional().nullable(),
  locationName: trimmed(160).min(2, "Locatie is verplicht"),
  address: trimmed(200).optional().or(z.literal("")),
  city: trimmed(80).min(2, "Plaats is verplicht"),
  capacity: z.coerce.number().int().min(1).max(10000),
  priceNonMember: z.coerce.number().int().min(0).max(100000),
  priceMember: z.coerce.number().int().min(0).max(100000),
  imageUrl: trimmed(500).optional().or(z.literal("")),
  status: z.enum(["DRAFT", "PUBLISHED", "CANCELLED"]),
});

export const variantAdminSchema = z.object({
  id: z.string().optional(),
  name: trimmed(120).min(1, "Variantnaam is verplicht"),
  sku: trimmed(60).min(1, "SKU is verplicht"),
  price: z.coerce.number().int().min(0).optional().nullable(),
  stock: z.coerce.number().int().min(0).max(100000),
  active: z.boolean().default(true),
  attributes: z.record(z.string()).optional().nullable(),
});

export const productAdminSchema = z.object({
  name: trimmed(160).min(2, "Naam is verplicht"),
  slug: trimmed(100).regex(/^[a-z0-9-]*$/, "Alleen kleine letters, cijfers en streepjes").optional().or(z.literal("")),
  description: z.string().trim().min(10, "Beschrijving is verplicht").max(20000),
  categoryId: z.string().min(1, "Kies een categorie"),
  basePrice: z.coerce.number().int().min(0).max(1000000),
  images: z.array(z.string().max(500)).max(12).default([]),
  active: z.boolean().default(true),
  featured: z.boolean().default(false),
  variants: z.array(variantAdminSchema).min(1, "Minimaal één variant"),
});

export const albumAdminSchema = z.object({
  title: trimmed(160).min(2, "Titel is verplicht"),
  slug: trimmed(100).regex(/^[a-z0-9-]*$/).optional().or(z.literal("")),
  description: trimmed(2000).optional().or(z.literal("")),
  date: z.coerce.date(),
  eventId: z.string().optional().or(z.literal("")),
  published: z.boolean().default(true),
});

/** Zet een ZodError om in { veld: "melding" } voor formulieren. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
