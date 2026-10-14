import "server-only";
import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/config";

/**
 * Service-role client. Bypasses Row Level Security, so only use it in server code
 * after checking that the signed-in user is allowed to do the thing.
 */
export function createAdminClient() {
  return createClient(env.supabaseUrl(), env.supabaseSecretKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
