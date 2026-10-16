import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Login is behind this interface so another method (OTP, Google) can replace
 * email + password later without touching the login page logic.
 */
export interface AuthProvider {
  signIn(
    supabase: SupabaseClient,
    identifier: string,
    secret: string,
  ): Promise<{ ok: true } | { ok: false; error: "invalid_email" | "wrong_credentials" | "login_failed"; code?: string }>;
}

export const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

/** Everyone (founders and clients) logs in with email + password. */
export const emailPasswordAuth: AuthProvider = {
  async signIn(supabase, identifier, secret) {
    const email = identifier.trim().toLowerCase();
    if (!isEmail(email)) return { ok: false, error: "invalid_email" };
    // copied passwords often carry a trailing space or newline
    const { error } = await supabase.auth.signInWithPassword({ email, password: secret.trim() });
    if (!error) return { ok: true };
    if (error.code === "invalid_credentials") return { ok: false, error: "wrong_credentials" };
    // anything else (email login switched off, bad project keys, network) is not the user's typo
    console.error("login failed", { code: error.code, status: error.status, message: error.message });
    return { ok: false, error: "login_failed", code: error.code ?? String(error.status ?? "unknown") };
  },
};
