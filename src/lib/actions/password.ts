"use server";

import { createHash, timingSafeEqual } from "node:crypto";
import { createClient as createStatelessClient } from "@supabase/supabase-js";
import { requireExpert } from "@/lib/auth/session";
import { normalizePhone, phoneToEmail } from "@/lib/auth/phone";
import { env } from "@/lib/config";
import { createAdminClient } from "@/lib/supabase/admin";
import { findUserByEmail } from "@/lib/supabase/users";

const MIN_PASSWORD = 8;
const MIN_RECOVERY_CODE = 12;

type Result = { ok: true } | { ok: false; error: string; login?: string } | undefined;

const digest = (s: string) => createHash("sha256").update(s).digest();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** The owner sets RECOVERY_CODE in Vercel → Settings → Environment Variables to switch /reset on. */
export async function isRecoveryEnabled() {
  return (process.env.RECOVERY_CODE ?? "").trim().length >= MIN_RECOVERY_CODE;
}

/**
 * Sets a new password for any login (founder email or client mobile number) without being
 * signed in. Guarded by the RECOVERY_CODE environment variable, which only the Vercel
 * project owner can set.
 */
export async function recoverPassword(_prev: Result, formData: FormData): Promise<Result> {
  const expected = (process.env.RECOVERY_CODE ?? "").trim();
  if (expected.length < MIN_RECOVERY_CODE) return { ok: false, error: "not_enabled" };

  const code = String(formData.get("code") ?? "").trim();
  const login = String(formData.get("login") ?? "").trim();
  if (!timingSafeEqual(digest(code), digest(expected))) {
    await sleep(1500); // slow down guessing
    return { ok: false, error: "wrong_code", login };
  }

  const password = String(formData.get("password") ?? "").trim();
  if (password.length < MIN_PASSWORD) return { ok: false, error: "short_password", login };

  let email: string;
  if (login.includes("@")) email = login.toLowerCase();
  else {
    const phone = normalizePhone(login);
    if (!phone) return { ok: false, error: "no_user", login };
    email = phoneToEmail(phone);
  }

  const admin = createAdminClient();
  const user = await findUserByEmail(admin, email);
  if (!user) return { ok: false, error: "no_user", login };
  const { error } = await admin.auth.admin.updateUserById(user.id, { password });
  return error ? { ok: false, error: error.message, login } : { ok: true };
}

/** Signed-in founder changes their own password (Settings → My account). */
export async function changeMyPassword(current: string, next: string): Promise<{ ok: boolean; error?: string }> {
  const { supabase, user } = await requireExpert();
  if (next.trim().length < MIN_PASSWORD) return { ok: false, error: "short_password" };
  if (!user.email) return { ok: false, error: "no_user" };

  // check the current password without touching the browser session
  const probe = createStatelessClient(env.supabaseUrl(), env.supabaseKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error: wrong } = await probe.auth.signInWithPassword({ email: user.email, password: current.trim() });
  if (wrong) return { ok: false, error: "wrong_current" };

  // through the user's own session, so they stay logged in on this device
  const { error } = await supabase.auth.updateUser({ password: next.trim() });
  return error ? { ok: false, error: error.message } : { ok: true };
}
