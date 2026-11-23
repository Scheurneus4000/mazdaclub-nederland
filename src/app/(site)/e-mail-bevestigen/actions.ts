"use server";

import { resendVerificationEmail } from "@/lib/accounts";
import { getCurrentUser } from "@/lib/session";

export type ResendState = { ok?: boolean; error?: string; message?: string; at?: number };

/** Stuurt de ingelogde gebruiker een nieuwe bevestigingslink (max. 3 per kwartier). */
export async function resendMyVerification(): Promise<ResendState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Log opnieuw in om een nieuwe bevestigingsmail aan te vragen.", at: Date.now() };
  const result = await resendVerificationEmail(user.id);
  if (!result.ok) return { error: result.error, at: Date.now() };
  return { ok: true, message: `We hebben een nieuwe bevestigingslink gestuurd naar ${user.email}.`, at: Date.now() };
}
