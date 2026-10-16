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
  ): Promise<{ ok: true } | { ok: false; error: "invalid_phone" | "wrong_credentials" | "login_failed"; code?: string }>;
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
    // copied passwords often carry a trailing space or newline
    const { error } = await supabase.auth.signInWithPassword({ email, password: secret.trim() });
    if (!error) return { ok: true };
    if (error.code === "invalid_credentials") return { ok: false, error: "wrong_credentials" };
    // anything else (email login switched off, bad project keys, network) is not the user's typo
    console.error("login failed", { code: error.code, status: error.status, message: error.message });
    return { ok: false, error: "login_failed", code: error.code ?? String(error.status ?? "unknown") };
  },
};
