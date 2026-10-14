import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizePhone, phoneToEmail } from "./phone";

/**
 * Login is behind this interface so phone OTP can replace phone + password later
 * without touching the login page logic.
 */
export interface AuthProvider {
  signIn(
    supabase: SupabaseClient,
    identifier: string,
    secret: string,
  ): Promise<{ ok: true } | { ok: false; error: "invalid_phone" | "wrong_credentials" }>;
}

/** V1: phone + password, stored in Supabase as a synthetic email. Experts may use a real email. */
export const phonePasswordAuth: AuthProvider = {
  async signIn(supabase, identifier, secret) {
    let email: string;
    if (identifier.includes("@")) {
      email = identifier.trim().toLowerCase();
    } else {
      const phone = normalizePhone(identifier);
      if (!phone) return { ok: false, error: "invalid_phone" };
      email = phoneToEmail(phone);
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password: secret });
    return error ? { ok: false, error: "wrong_credentials" } : { ok: true };
  },
};
