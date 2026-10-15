/**
 * Creates the two expert accounts and two sample clients (a salon and a restaurant).
 * Run AFTER the SQL migrations and supabase/seed.sql:
 *
 *   npm run seed
 *
 * Reads .env.local. Safe to run more than once (existing accounts are skipped).
 * Passwords come from env vars, or are generated and printed once.
 * (On a hosted deployment the /setup page does the same thing from the browser.)
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { createSeeder } from "../src/lib/setup/accounts";

config({ path: ".env.local" });
config();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
const domain = process.env.NEXT_PUBLIC_CLIENT_EMAIL_DOMAIN ?? "clients.socialgrid.app";
if (!url || !secret) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY in .env.local first.");
  process.exit(1);
}
const admin = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });

async function main() {
  const { error } = await admin.from("roles").select("id").limit(1);
  if (error) {
    console.error("Can't read the roles table. Did you run the SQL migrations first? See README.", error.message);
    process.exit(1);
  }
  const { count } = await admin.from("festivals").select("id", { count: "exact", head: true });
  if (!count) console.warn("⚠ No festivals found — run supabase/seed.sql in the SQL editor too.");

  const seeder = createSeeder(admin, domain, console.log);
  await seeder.seedExperts([
    { email: process.env.SEED_EXPERT1_EMAIL || "expert1@socialgrid.app", name: process.env.SEED_EXPERT1_NAME || "Founder 1", password: process.env.SEED_EXPERT1_PASSWORD },
    { email: process.env.SEED_EXPERT2_EMAIL || "expert2@socialgrid.app", name: process.env.SEED_EXPERT2_NAME || "Founder 2", password: process.env.SEED_EXPERT2_PASSWORD },
  ]);
  await seeder.seedSampleClients();

  if (seeder.created.length) {
    console.log("\nNew accounts — save these now, passwords are not shown again:\n");
    for (const c of seeder.created) console.log(`  ${c.label.padEnd(28)} login: ${c.login}   password: ${c.password}`);
  }
  console.log("\nDone.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
