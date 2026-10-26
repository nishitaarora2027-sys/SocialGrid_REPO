"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireExpert } from "@/lib/auth/session";
import { CONTENT_TYPES, INDUSTRIES } from "@/lib/types";

// Settings page (turnaround, festivals, plans, quick-start cards) and the teaching library.

type Result = { ok: true } | { ok: false; error: string };

const settingsSchema = z.object({
  standard_hours: z.number().positive().max(200),
  urgent_hours: z.number().positive().max(200),
  revision_hours: z.number().positive().max(200),
  work_start: z.string().regex(/^\d{2}:\d{2}$/),
  work_end: z.string().regex(/^\d{2}:\d{2}$/),
  work_days: z.array(z.number().int().min(1).max(7)).min(1),
  suggestion_lead_days: z.number().int().min(0).max(60),
  inactivity_days: z.number().int().min(1).max(60),
});

export async function updateSettings(input: z.input<typeof settingsSchema>): Promise<Result> {
  const { supabase } = await requireExpert();
  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const { error } = await supabase.from("settings").update(parsed.data).eq("id", 1);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/expert/settings");
  return { ok: true };
}

const festivalSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1),
  name_hi: z.string().trim().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  industries: z.array(z.enum(INDUSTRIES as [string, ...string[]])).min(1),
  default_lead_days: z.number().int().min(0).max(60),
  active: z.boolean(),
});

export async function saveFestival(input: z.input<typeof festivalSchema>): Promise<Result> {
  const { supabase } = await requireExpert();
  const parsed = festivalSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const { id, ...row } = parsed.data;
  const { error } = id
    ? await supabase.from("festivals").update(row).eq("id", id)
    : await supabase.from("festivals").insert(row);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/expert/settings");
  return { ok: true };
}

export async function deleteFestival(id: string): Promise<Result> {
  const { supabase } = await requireExpert();
  await supabase.from("festivals").delete().eq("id", id);
  revalidatePath("/expert/settings");
  return { ok: true };
}

const planSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1),
  price_inr: z.number().int().min(0),
  limits: z.object({
    billing: z.enum(["month", "year", "post"]).nullish(),
    requests_per_month: z.number().int().positive().nullable(),
    content_types: z.array(z.enum(CONTENT_TYPES as [string, ...string[]])).nullable(),
  }),
  active: z.boolean(),
});

export async function savePlan(input: z.input<typeof planSchema>): Promise<Result> {
  const { supabase } = await requireExpert();
  const parsed = planSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const { id, ...row } = parsed.data;
  const { error } = id
    ? await supabase.from("plans").update(row).eq("id", id)
    : await supabase.from("plans").insert(row);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/expert/settings");
  return { ok: true };
}

const questionSchema = z.object({
  id: z.string().min(1),
  type: z.enum(["choice", "text", "photo"]),
  q_en: z.string().min(1),
  q_hi: z.string().min(1),
  options: z.array(z.object({ en: z.string(), hi: z.string() })).optional(),
  allow_text: z.boolean().optional(),
});

const cardSchema = z.object({
  id: z.string().uuid().optional(),
  industry: z.enum(INDUSTRIES as [string, ...string[]]),
  key: z.string().trim().min(1).regex(/^[a-z0-9_]+$/),
  label_en: z.string().trim().min(1),
  label_hi: z.string().trim().min(1),
  icon: z.string().min(1),
  content_type: z.enum(CONTENT_TYPES as [string, ...string[]]),
  questions: z.array(questionSchema).max(3),
  sort: z.number().int(),
  active: z.boolean(),
});

export async function saveQuickStartCard(input: z.input<typeof cardSchema>): Promise<Result> {
  const { supabase } = await requireExpert();
  const parsed = cardSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const { id, ...row } = parsed.data;
  const { error } = id
    ? await supabase.from("quick_start_cards").update(row).eq("id", id)
    : await supabase.from("quick_start_cards").insert(row);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/expert/settings");
  return { ok: true };
}

const ruleSchema = z.object({
  id: z.string().uuid().optional(),
  scope: z.enum(["client", "industry", "global"]),
  business_id: z.string().uuid().nullable(),
  industry: z.enum(INDUSTRIES as [string, ...string[]]).nullable(),
  text: z.string().trim().min(1).max(1000),
  active: z.boolean(),
});

export async function saveRule(input: z.input<typeof ruleSchema>): Promise<Result> {
  const { supabase, profile } = await requireExpert();
  const parsed = ruleSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const { id, ...rule } = parsed.data;
  const row = {
    ...rule,
    business_id: rule.scope === "client" ? rule.business_id : null,
    industry: rule.scope === "industry" ? rule.industry : null,
  };
  const { error } = id
    ? await supabase.from("rules").update(row).eq("id", id)
    : await supabase.from("rules").insert({ ...row, created_by: profile.id });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/expert/library");
  return { ok: true };
}

export async function deleteRule(id: string): Promise<Result> {
  const { supabase } = await requireExpert();
  await supabase.from("rules").delete().eq("id", id);
  revalidatePath("/expert/library");
  return { ok: true };
}

const exampleSchema = z.object({
  industry: z.enum(INDUSTRIES as [string, ...string[]]).nullable(),
  business_id: z.string().uuid().nullable(),
  content_type: z.enum(CONTENT_TYPES as [string, ...string[]]).nullable(),
  media: z.array(z.object({ path: z.string(), type: z.enum(["image", "video"]), bucket: z.string().optional() })),
  caption: z.string().nullable(),
  notes: z.string().nullable(),
  tags: z.object({
    occasion: z.array(z.string()).optional(),
    style: z.array(z.string()).optional(),
    goal: z.array(z.string()).optional(),
  }),
  is_gold_standard: z.boolean(),
});

/** A great post from elsewhere, saved with notes for future AI */
export async function addManualExample(input: z.input<typeof exampleSchema>): Promise<Result> {
  const { supabase, profile } = await requireExpert();
  const parsed = exampleSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const { error } = await supabase.from("examples").insert({ ...parsed.data, source: "manual", created_by: profile.id });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/expert/library");
  return { ok: true };
}

export async function setExampleGold(exampleId: string, gold: boolean): Promise<Result> {
  const { supabase } = await requireExpert();
  const { data } = await supabase
    .from("examples")
    .update({ is_gold_standard: gold })
    .eq("id", exampleId)
    .select("option_id")
    .single();
  if (data?.option_id) {
    await supabase.from("content_options").update({ is_gold_standard: gold }).eq("id", data.option_id);
  }
  revalidatePath("/expert/library");
  return { ok: true };
}
