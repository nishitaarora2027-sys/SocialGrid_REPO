import "server-only";
import pg from "pg";
import { env } from "@/lib/config";
import { createAdminClient } from "@/lib/supabase/admin";
import { SETUP_SQL } from "./sql.generated";
import { connectionConfig } from "./migrate";

// Databases set up before a migration existed get it here, the first time the code needs it,
// so nobody has to paste SQL into the Supabase dashboard. Each upgrade must be idempotent.
const POST_CREDITS = "supabase/migrations/0004_post_credits.sql";

let postCredits: Promise<void> | null = null;

/** Makes sure subscriptions.post_credits exists. Runs at most once per server instance. */
export function ensurePostCredits() {
  postCredits ??= addPostCredits().catch((e) => {
    postCredits = null;
    console.error("post_credits upgrade failed", e);
  });
  return postCredits;
}

async function addPostCredits() {
  const admin = createAdminClient();
  const { error } = await admin.from("subscriptions").select("post_credits").limit(1);
  if (!error) return;

  const databaseUrl = env.databaseUrl();
  if (!databaseUrl) throw new Error("No direct database URL to add subscriptions.post_credits");
  const sql = SETUP_SQL.find((s) => s.file === POST_CREDITS)!.sql;
  const client = new pg.Client(connectionConfig(databaseUrl));
  await client.connect();
  try {
    await client.query(sql);
    await client.query("notify pgrst, 'reload schema'");
  } finally {
    await client.end();
  }
  // wait for the Supabase API to see the new column
  for (let i = 0; i < 10; i++) {
    const { error: again } = await admin.from("subscriptions").select("post_credits").limit(1);
    if (!again) return;
    await new Promise((r) => setTimeout(r, 1000));
  }
}
