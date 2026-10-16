"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { emailPasswordAuth } from "@/lib/auth/provider";
import { LOCALE_COOKIE, resolveLocale } from "@/i18n/config";
import { createClient } from "@/lib/supabase/server";

const ONE_YEAR = 60 * 60 * 24 * 365;

export async function login(_prev: { error?: string; code?: string; identifier?: string } | undefined, formData: FormData) {
  const identifier = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const supabase = await createClient();
  const result = await emailPasswordAuth.signIn(supabase, identifier, password);
  if (!result.ok) return { error: result.error, code: result.code, identifier };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("role_id, preferred_ui_language")
    .eq("id", user!.id)
    .single();
  if (!profile) {
    await supabase.auth.signOut();
    return { error: "no_profile", identifier };
  }
  (await cookies()).set(LOCALE_COOKIE, profile.preferred_ui_language, { maxAge: ONE_YEAR, path: "/" });
  redirect(profile.role_id === 1 ? "/expert" : "/chat");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function setLocale(locale: string) {
  const value = resolveLocale(locale);
  (await cookies()).set(LOCALE_COOKIE, value, { maxAge: ONE_YEAR, path: "/" });
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    await supabase.from("profiles").update({ preferred_ui_language: value }).eq("id", user.id);
  }
}
