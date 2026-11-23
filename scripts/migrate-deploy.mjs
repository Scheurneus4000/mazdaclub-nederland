#!/usr/bin/env node
/**
 * Voert databasemigraties uit tijdens het bouwen (Vercel) of handmatig.
 *
 * Migraties hebben een directe verbinding nodig (geen connection pooler). Daarom gebruikt dit script
 * DIRECT_URL of DATABASE_URL_UNPOOLED (zoals de Neon-integratie van Vercel die instelt) als die er is,
 * en anders DATABASE_URL.
 *
 *   node scripts/migrate-deploy.mjs
 *
 * Zet SKIP_MIGRATIONS=true om migraties over te slaan (bijv. voor preview-builds zonder database).
 */
import { spawnSync } from "node:child_process";

if (process.env.SKIP_MIGRATIONS === "true") {
  console.log("[migraties] overgeslagen (SKIP_MIGRATIONS=true)");
  process.exit(0);
}

const url = process.env.DIRECT_URL || process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!url) {
  console.error("[migraties] Geen DATABASE_URL ingesteld. Voeg die toe bij de hosting (Settings → Environment Variables).");
  process.exit(1);
}

console.log("[migraties] prisma migrate deploy…");
const result = spawnSync("npx", ["prisma", "migrate", "deploy"], {
  stdio: "inherit",
  shell: process.platform === "win32",
  env: { ...process.env, DATABASE_URL: url },
});
process.exit(result.status ?? 1);
