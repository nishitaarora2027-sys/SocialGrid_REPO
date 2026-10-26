import "server-only";
import pg from "pg";
import { SETUP_SQL } from "./sql.generated";

// Applies supabase/migrations/*.sql and supabase/seed.sql over a direct Postgres connection.
// Used once by /setup so nobody has to paste SQL into the Supabase dashboard.

export function connectionConfig(url: string): pg.ClientConfig {
  // Supabase uses its own CA; `sslmode` in the URL would make pg insist on full verification
  const u = new URL(url);
  u.searchParams.delete("sslmode");
  u.searchParams.delete("supa");
  const local = ["localhost", "127.0.0.1"].includes(u.hostname) || u.searchParams.has("host");
  return { connectionString: u.toString(), ssl: local ? undefined : { rejectUnauthorized: false } };
}

export async function applyMigrations(databaseUrl: string) {
  const client = new pg.Client(connectionConfig(databaseUrl));
  await client.connect();
  try {
    const { rows } = await client.query("select to_regclass('public.roles') is not null as done");
    if (rows[0]?.done) return { applied: false };
    for (const { file, sql } of SETUP_SQL) {
      await client.query("begin");
      try {
        await client.query(sql);
        await client.query("commit");
      } catch (e) {
        await client.query("rollback");
        throw new Error(`${file}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
    // tell the Supabase API about the new tables right away
    await client.query("notify pgrst, 'reload schema'");
    return { applied: true };
  } finally {
    await client.end();
  }
}
