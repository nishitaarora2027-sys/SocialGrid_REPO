"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { emailPasswordAuth } from "@/lib/auth/provider";
import { LOCALE_COOKIE, resolveLocale } from "@/i18n/config";
import { createClient } from "@/lib/supabase/server";

const ONE_YEAR = 60 * 60 * 24 * 365;
const THEME_COOKIE = "theme";

type LoginState = { error?: string; code?: string; identifier?: string; mode?: "customer" | "team" } | undefined;

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const identifier = String(formData.get("email") ?? "").trim();
  // which tab the person used: customers (business owners) or the SocialGrid team
  const mode = formData.get("mode") === "team" ? "team" : "customer";
  const password = String(formData.get("password") ?? "");
  const supabase = await createClient();
  const result = await emailPasswordAuth.signIn(supabase, identifier, password);
  if (!result.ok) return { error: result.error, code: result.code, identifier, mode };

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
    return { error: "no_profile", identifier, mode };
  }
  const isTeam = profile.role_id === 1;
  if (isTeam !== (mode === "team")) {
    // right password, wrong door: say which tab to use instead of a vague error
    await supabase.auth.signOut();
    return { error: isTeam ? "use_team_tab" : "use_customer_tab", identifier, mode };
  }
  (await cookies()).set(LOCALE_COOKIE, profile.preferred_ui_language, { maxAge: ONE_YEAR, path: "/" });
  redirect(isTeam ? "/expert" : "/chat");
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

export async function setTheme(theme: string) {
  (await cookies()).set(THEME_COOKIE, theme === "dark" ? "dark" : "light", { maxAge: ONE_YEAR, path: "/" });
}
