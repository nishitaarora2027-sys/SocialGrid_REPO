import "server-only";
import { isEmail } from "@/lib/auth/provider";
import { ROLE } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { findUserByEmail } from "@/lib/supabase/users";

export interface NewTeamMember {
  name: string;
  email: string;
  password: string;
}

/**
 * Creates a SocialGrid team (founder) login, or repairs one:
 *  - new email → new login + team profile
 *  - email exists without a profile (setup stopped halfway) → becomes a team login, password reset
 *  - email is already a team login → password reset
 *  - email belongs to a customer → refused (one email can't be both)
 * No permission check here — callers must check (expert session or recovery code).
 */
export async function createTeamMember(input: NewTeamMember): Promise<{ ok: true; repaired: boolean } | { ok: false; error: string }> {
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  const password = input.password.trim();
  if (!name) return { ok: false, error: "missing_name" };
  if (!isEmail(email)) return { ok: false, error: "invalid_email" };
  if (password.length < 8) return { ok: false, error: "short_password" };

  const admin = createAdminClient();
  let userId: string;
  let repaired = false;
  const existing = await findUserByEmail(admin, email);
  if (existing) {
    const { data: profile } = await admin.from("profiles").select("role_id").eq("id", existing.id).maybeSingle();
    if (profile && profile.role_id !== ROLE.expert) return { ok: false, error: "is_customer" };
    const { error } = await admin.auth.admin.updateUserById(existing.id, { password, email_confirm: true });
    if (error) return { ok: false, error: error.message };
    userId = existing.id;
    repaired = true;
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { display_name: name },
    });
    if (error || !data.user) return { ok: false, error: error?.message ?? "failed" };
    userId = data.user.id;
  }

  const { error: pErr } = await admin
    .from("profiles")
    .upsert({ id: userId, role_id: ROLE.expert, display_name: name, preferred_ui_language: "en" }, { onConflict: "id" });
  if (pErr) {
    if (!repaired) await admin.auth.admin.deleteUser(userId);
    return { ok: false, error: pErr.message };
  }
  return { ok: true, repaired };
}
