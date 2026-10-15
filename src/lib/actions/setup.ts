"use server";

import { CLIENT_EMAIL_DOMAIN, env, isConfigured } from "@/lib/config";
import { createSeeder, type Credential, type ExpertInput } from "@/lib/setup/accounts";
import { applyMigrations } from "@/lib/setup/migrate";
import { createAdminClient } from "@/lib/supabase/admin";

export type SetupStage = "no_supabase" | "ready" | "done";

export async function getSetupStatus(): Promise<{ stage: SetupStage; schema: boolean; canMigrate: boolean }> {
  if (!isConfigured()) return { stage: "no_supabase", schema: false, canMigrate: false };
  const admin = createAdminClient();
  const { error } = await admin.from("roles").select("id").limit(1);
  const schema = !error;
  let experts = 0;
  if (schema) {
    const { count } = await admin.from("profiles").select("id", { count: "exact", head: true }).eq("role_id", 1);
    experts = count ?? 0;
  }
  return { stage: experts ? "done" : "ready", schema, canMigrate: Boolean(env.databaseUrl()) };
}

export type SetupResult = { ok: true; credentials: Credential[] } | { ok: false; error: string; detail?: string } | undefined;

/**
 * One-time setup: creates the database tables (if needed), the founder logins and,
 * optionally, two sample clients. Refuses to run once any expert exists.
 */
export async function runSetup(_prev: SetupResult, formData: FormData): Promise<SetupResult> {
  const status = await getSetupStatus();
  if (status.stage === "no_supabase") return { ok: false, error: "no_supabase" };
  if (status.stage === "done") return { ok: false, error: "already_done" };

  const experts: ExpertInput[] = [1, 2]
    .map((n) => ({
      name: String(formData.get(`name${n}`) ?? "").trim(),
      email: String(formData.get(`email${n}`) ?? "").trim(),
      password: String(formData.get(`password${n}`) ?? ""),
    }))
    .filter((e) => e.name || e.email);
  if (!experts.length) return { ok: false, error: "need_expert" };
  if (experts.some((e) => !e.name || !/^\S+@\S+\.\S+$/.test(e.email) || (e.password?.length ?? 0) < 8)) {
    return { ok: false, error: "invalid_expert" };
  }

  const admin = createAdminClient();
  if (!status.schema) {
    const dbUrl = env.databaseUrl();
    if (!dbUrl) return { ok: false, error: "no_database" };
    try {
      await applyMigrations(dbUrl);
    } catch (e) {
      return { ok: false, error: "migration_failed", detail: e instanceof Error ? e.message : String(e) };
    }
    // wait for the Supabase API to pick up the new tables
    for (let i = 0; i < 20; i++) {
      const { error } = await admin.from("roles").select("id").limit(1);
      if (!error) break;
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  try {
    const seeder = createSeeder(admin, CLIENT_EMAIL_DOMAIN);
    await seeder.seedExperts(experts);
    if (formData.get("samples") === "on") await seeder.seedSampleClients();
    return { ok: true, credentials: seeder.created };
  } catch (e) {
    return { ok: false, error: "seed_failed", detail: e instanceof Error ? e.message : String(e) };
  }
}
