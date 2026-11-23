/** IBAN controleren (lengte per land + mod-97) en netjes opmaken. */
const LENGTHS: Record<string, number> = { NL: 18, BE: 16, DE: 22, LU: 20, FR: 27, ES: 24, IT: 27, AT: 20, GB: 22, IE: 22, PT: 25, DK: 18, SE: 24, NO: 15, FI: 18, CH: 21, PL: 28 };

export function normalizeIban(input: string): string {
  return input.replace(/[\s.-]/g, "").toUpperCase();
}

export function isValidIban(input: string): boolean {
  const iban = normalizeIban(input);
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(iban)) return false;
  const expected = LENGTHS[iban.slice(0, 2)];
  if (expected && iban.length !== expected) return false;
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  const digits = rearranged.replace(/[A-Z]/g, (ch) => String(ch.charCodeAt(0) - 55));
  let remainder = 0;
  for (let i = 0; i < digits.length; i += 7) remainder = Number(String(remainder) + digits.slice(i, i + 7)) % 97;
  return remainder === 1;
}

/** "NL91ABNA0417164300" → "NL91 ABNA 0417 1643 00" */
export function formatIban(input: string): string {
  return normalizeIban(input).replace(/(.{4})/g, "$1 ").trim();
}
