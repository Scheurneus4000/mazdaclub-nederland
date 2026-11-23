"use server";

import { timingSafeEqual } from "crypto";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { failure, type ActionState } from "@/app/admin/actions/state";
import { hashPassword } from "@/auth";
import { prisma } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { ensureDefaultCategories } from "@/lib/setup";
import { emailSchema, fieldErrors, passwordSchema } from "@/lib/validation";

const schema = z
  .object({
    code: z.string().max(200),
    firstName: z.string().trim().min(1, "Vul je voornaam in").max(80),
    lastName: z.string().trim().min(1, "Vul je achternaam in").max(80),
    email: emailSchema,
    password: passwordSchema,
    passwordConfirm: z.string(),
  })
  .refine((d) => d.password === d.passwordConfirm, { path: ["passwordConfirm"], message: "De wachtwoorden zijn niet gelijk" });

/** Installatiecode vereist in productie; lokaal mag het zonder (als SETUP_CODE niet is ingesteld). */
function codeMatches(input: string): boolean {
  const expected = process.env.SETUP_CODE ?? "";
  if (!expected) return process.env.NODE_ENV !== "production";
  const a = Buffer.from(input.trim());
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Maakt het allereerste beheerdersaccount aan. Werkt alleen zolang er nog geen beheerder bestaat. */
export async function createFirstAdmin(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "onbekend";
  if (!rateLimit(`installatie:${ip}`, 5, 15 * 60_000).ok) return failure("Te veel pogingen. Probeer het over een kwartier opnieuw.");

  const parsed = schema.safeParse(Object.fromEntries(["code", "firstName", "lastName", "email", "password", "passwordConfirm"].map((k) => [k, String(formData.get(k) ?? "")])));
  if (!parsed.success) return failure("Controleer de gemarkeerde velden.", fieldErrors(parsed.error));
  const data = parsed.data;

  if (!codeMatches(data.code)) return failure("De installatiecode klopt niet.", { code: "Onjuiste installatiecode" });

  const created = await prisma.$transaction(async (tx) => {
    if ((await tx.user.count({ where: { role: "ADMIN" } })) > 0) return false;
    const existing = await tx.user.findUnique({ where: { email: data.email }, select: { id: true } });
    const passwordHash = await hashPassword(data.password);
    if (existing) {
      await tx.user.update({ where: { id: existing.id }, data: { role: "ADMIN", passwordHash, firstName: data.firstName, lastName: data.lastName } });
    } else {
      await tx.user.create({ data: { email: data.email, passwordHash, firstName: data.firstName, lastName: data.lastName, role: "ADMIN" } });
    }
    await ensureDefaultCategories(tx);
    return true;
  });
  if (!created) return failure("De installatie is al voltooid. Log in met het bestaande beheerdersaccount.");

  redirect(`/inloggen?callbackUrl=${encodeURIComponent("/admin/hulp")}&installatie=1`);
}
