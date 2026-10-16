"use server";

import { createHash, timingSafeEqual } from "node:crypto";
import { createClient as createStatelessClient } from "@supabase/supabase-js";
import { requireExpert } from "@/lib/auth/session";
import { env } from "@/lib/config";
import { ROLE } from "@/lib/auth/session";
import { createClientRecords } from "@/lib/clients/create";
import { createAdminClient } from "@/lib/supabase/admin";

const MIN_PASSWORD = 8;
const MIN_RECOVERY_CODE = 12;

const digest = (s: string) => createHash("sha256").update(s).digest();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** The owner sets RECOVERY_CODE in Vercel → Settings → Environment Variables to switch /reset on. */
export async function isRecoveryEnabled() {
  return (process.env.RECOVERY_CODE ?? "").trim().length >= MIN_RECOVERY_CODE;
}

/** Checks the recovery code; wrong codes are slowed down to make guessing impractical. */
async function codeIsValid(code: string) {
  const expected = (process.env.RECOVERY_CODE ?? "").trim();
  if (expected.length < MIN_RECOVERY_CODE) return false;
  const ok = timingSafeEqual(digest(code.trim()), digest(expected));
  if (!ok) await sleep(1500);
  return ok;
}

export interface RescueAccount {
  id: string;
  email: string;
  kind: "team" | "customer" | "unfinished";
  name: string | null;
  business: string | null;
  lastSignIn: string | null;
}

/** Account rescue: every login with its role, so the owner can see exactly which emails exist. */
export async function rescueListAccounts(code: string): Promise<{ ok: true; accounts: RescueAccount[] } | { ok: false; error: string }> {
  if (!(await isRecoveryEnabled())) return { ok: false, error: "not_enabled" };
  if (!(await codeIsValid(code))) return { ok: false, error: "wrong_code" };
  const admin = createAdminClient();
  const users = [];
  for (let page = 1; page < 50; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) return { ok: false, error: error.message };
    users.push(...data.users);
    if (data.users.length < 200) break;
  }
  const ids = users.map((u) => u.id);
  const [{ data: profiles }, { data: businesses }] = await Promise.all([
    admin.from("profiles").select("id, role_id, display_name").in("id", ids),
    admin.from("businesses").select("owner_profile_id, name").in("owner_profile_id", ids),
  ]);
  const accounts: RescueAccount[] = users.map((u) => {
    const p = profiles?.find((x) => x.id === u.id);
    return {
      id: u.id,
      email: u.email ?? "",
      kind: !p ? "unfinished" : p.role_id === ROLE.expert ? "team" : "customer",
      name: p?.display_name ?? null,
      business: businesses?.find((b) => b.owner_profile_id === u.id)?.name ?? null,
      lastSignIn: u.last_sign_in_at ?? null,
    };
  });
  const order = { team: 0, customer: 1, unfinished: 2 };
  accounts.sort((a, b) => order[a.kind] - order[b.kind] || a.email.localeCompare(b.email));
  return { ok: true, accounts };
}

export async function rescueSetPassword(code: string, userId: string, password: string): Promise<{ ok: boolean; error?: string }> {
  if (!(await codeIsValid(code))) return { ok: false, error: "wrong_code" };
  if (password.trim().length < MIN_PASSWORD) return { ok: false, error: "short_password" };
  const { error } = await createAdminClient().auth.admin.updateUserById(userId, { password: password.trim() });
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function rescueCreateCustomer(
  code: string,
  input: { businessName: string; ownerName: string; email: string; password: string },
): Promise<{ ok: boolean; error?: string }> {
  if (!(await codeIsValid(code))) return { ok: false, error: "wrong_code" };
  if (input.password.trim().length < MIN_PASSWORD) return { ok: false, error: "short_password" };
  const res = await createClientRecords({ ...input, password: input.password.trim(), industry: "salon", language: "en" });
  return res.ok ? { ok: true } : { ok: false, error: res.error };
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
