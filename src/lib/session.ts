import "server-only";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";

/** Huidige sessie (of null). */
export async function getSession() {
  return auth();
}

export async function getCurrentUser() {
  const session = await auth();
  if (!session?.user?.id) return null;
  return prisma.user.findUnique({ where: { id: session.user.id }, include: { membership: true } });
}

/** Voor pagina's: stuurt door naar /inloggen als er niemand is ingelogd. */
export async function requireUser(callbackUrl = "/account") {
  const user = await getCurrentUser();
  if (!user) redirect(`/inloggen?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  return user;
}

/**
 * Voor beheerpagina's en -acties. De rol wordt altijd opnieuw uit de database gelezen,
 * zodat een ingetrokken beheerdersrol direct effect heeft (ook met een oud JWT).
 */
export async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) redirect("/inloggen?callbackUrl=/admin");
  if (user.role !== "ADMIN") redirect("/account");
  return user;
}

/** Variant voor API-routes: geeft null terug in plaats van te redirecten. */
export async function getAdminOrNull() {
  const user = await getCurrentUser();
  return user && user.role === "ADMIN" ? user : null;
}
