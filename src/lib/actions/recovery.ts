"use server";

import { headers } from "next/headers";
import { isEmail } from "@/lib/auth/provider";
import { getSession } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

type Result = { ok: true } | { ok: false; error: string; email?: string } | undefined;

async function siteOrigin() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/+$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/**
 * Emails a password-reset link (sent by Supabase through your SMTP provider, e.g. Resend).
 * Always answers "sent" for unknown emails so nobody can probe which emails have accounts.
 */
export async function requestPasswordReset(_prev: Result, formData: FormData): Promise<Result> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!isEmail(email)) return { ok: false, error: "invalid_email", email };
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${await siteOrigin()}/auth/confirm?next=/update-password`,
  });
  if (error) {
    console.error("password reset email failed", { code: error.code, status: error.status, message: error.message });
    if (error.code === "over_email_send_rate_limit" || error.status === 429) return { ok: false, error: "rate_limited", email };
    if (error.code === "user_not_found") return { ok: true };
    return { ok: false, error: "send_failed", email };
  }
  return { ok: true };
}

/** Sets the new password for whoever opened the reset link (they are signed in by then). */
export async function setNewPassword(_prev: Result, formData: FormData): Promise<Result> {
  const password = String(formData.get("password") ?? "").trim();
  if (password.length < 8) return { ok: false, error: "short_password" };
  const session = await getSession();
  if (!session) return { ok: false, error: "expired" };
  const { error } = await session.supabase.auth.updateUser({ password });
  if (error) {
    if (error.code === "same_password") return { ok: false, error: "same_password" };
    return { ok: false, error: error.message };
  }
  return { ok: true };
}
