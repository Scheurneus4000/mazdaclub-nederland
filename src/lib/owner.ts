/**
 * Eigenaar(s) van de website: e-mailadressen uit de omgevingsvariabele OWNER_EMAIL (komma-gescheiden).
 * Een account met zo'n e-mailadres krijgt automatisch beheerdersrechten zodra het e-mailadres is
 * bevestigd, en kan door andere beheerders niet worden gedegradeerd of verwijderd.
 */
export function ownerEmails(): string[] {
  return (process.env.OWNER_EMAIL || "")
    .split(/[,;\s]+/)
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.includes("@"));
}

export function isOwnerEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return ownerEmails().includes(email.trim().toLowerCase());
}
