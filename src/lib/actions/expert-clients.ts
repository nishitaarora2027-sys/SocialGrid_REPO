"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ENABLED_AUTONOMY_MODES } from "@/lib/ai";
import { normalizePhone } from "@/lib/auth/phone";
import { isEmail } from "@/lib/auth/provider";
import { ROLE, requireExpert } from "@/lib/auth/session";
import { getBillingProvider } from "@/lib/billing";
import {
  createRequest,
  ensureWeekSlots,
  getConversationId,
  postMessage,
  postSystem,
} from "@/lib/domain";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  CONTENT_TYPES,
  INDUSTRIES,
  SUBSCRIPTION_STATUSES,
  type Business,
  type PlanSlot,
} from "@/lib/types";

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

const createClientSchema = z.object({
  businessName: z.string().trim().min(1).max(120),
  ownerName: z.string().trim().min(1).max(120),
  email: z.string().trim().toLowerCase().refine(isEmail),
  phone: z.string().optional(),
  password: z.string().min(6).max(72),
  industry: z.enum(INDUSTRIES as [string, ...string[]]),
  language: z.enum(["en", "hi"]),
});

/** In-person onboarding: creates the login, business, brand profile, chat and trial subscription. */
export async function createClientAccount(
  input: z.input<typeof createClientSchema>,
): Promise<Result<{ businessId: string }>> {
  await requireExpert();
  const parsed = createClientSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.some((i) => i.path[0] === "email") ? "invalid_email" : "invalid" };
  }
  const d = parsed.data;
  // the mobile number is optional contact info (WhatsApp), not the login
  const phone = d.phone?.trim() ? normalizePhone(d.phone) : null;
  if (d.phone?.trim() && !phone) return { ok: false, error: "invalid_phone" };

  const admin = createAdminClient();
  const { data: created, error: authError } = await admin.auth.admin.createUser({
    email: d.email,
    password: d.password,
    email_confirm: true,
    user_metadata: { phone, display_name: d.ownerName },
  });
  if (authError || !created.user) {
    const exists = authError?.message?.toLowerCase().includes("already");
    return { ok: false, error: exists ? "email_taken" : (authError?.message ?? "failed") };
  }
  const userId = created.user.id;

  try {
    const { error: pErr } = await admin.from("profiles").insert({
      id: userId,
      role_id: ROLE.client,
      display_name: d.ownerName,
      phone,
      preferred_ui_language: d.language,
    });
    if (pErr) throw pErr;

    const { data: business, error: bErr } = await admin
      .from("businesses")
      .insert({ owner_profile_id: userId, name: d.businessName, industry: d.industry })
      .select("id")
      .single();
    if (bErr) throw bErr;

    await admin.from("brand_profiles").insert({
      business_id: business.id,
      owner_name: d.ownerName,
      contact_phone: phone,
      whatsapp: phone,
      default_language: d.language,
      content_languages: d.language === "hi" ? ["hi", "hinglish"] : ["en"],
    });
    await admin.from("weekly_plans").insert({ business_id: business.id, slots: [] });
    await getConversationId(admin, business.id);

    const { data: plan } = await admin.from("plans").select("id").eq("active", true).order("price_inr").limit(1).maybeSingle();
    if (plan) await getBillingProvider().createSubscription({ businessId: business.id, planId: plan.id, status: "trial" });

    revalidatePath("/expert/clients");
    return { ok: true, businessId: business.id as string };
  } catch (e) {
    // roll back the login so the phone number can be used again
    await admin.auth.admin.deleteUser(userId);
    return { ok: false, error: e instanceof Error ? e.message : "failed" };
  }
}

/** Changes the email a client logs in with. */
export async function updateClientLoginEmail(businessId: string, email: string): Promise<Result> {
  const { supabase } = await requireExpert();
  const clean = email.trim().toLowerCase();
  if (!isEmail(clean)) return { ok: false, error: "invalid_email" };
  const { data: business } = await supabase.from("businesses").select("owner_profile_id").eq("id", businessId).single();
  if (!business) return { ok: false, error: "not_found" };
  const { error } = await createAdminClient().auth.admin.updateUserById(business.owner_profile_id, {
    email: clean,
    email_confirm: true,
  });
  if (error) return { ok: false, error: error.message.toLowerCase().includes("already") ? "email_taken" : error.message };
  revalidatePath(`/expert/clients/${businessId}`);
  return { ok: true };
}

export async function resetClientPassword(businessId: string, password: string): Promise<Result> {
  const { supabase } = await requireExpert();
  if (password.length < 6) return { ok: false, error: "short_password" };
  const { data: business } = await supabase.from("businesses").select("owner_profile_id").eq("id", businessId).single();
  if (!business) return { ok: false, error: "not_found" };
  const { error } = await createAdminClient().auth.admin.updateUserById(business.owner_profile_id, { password });
  return error ? { ok: false, error: error.message } : { ok: true };
}

const businessSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  industry: z.enum(INDUSTRIES as [string, ...string[]]).optional(),
  ownerName: z.string().trim().min(1).max(120).optional(),
  suggestions_enabled: z.boolean().optional(),
  photo_consent: z.boolean().optional(),
  autonomy_mode: z.enum(["manual", "ai_draft_review", "auto"]).optional(),
});

export async function updateBusiness(businessId: string, input: z.input<typeof businessSchema>): Promise<Result> {
  const { supabase } = await requireExpert();
  const parsed = businessSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const { ownerName, ...rest } = parsed.data;
  if (rest.autonomy_mode && !ENABLED_AUTONOMY_MODES.includes(rest.autonomy_mode)) {
    return { ok: false, error: "coming_soon" };
  }
  if (Object.keys(rest).length) {
    const { error } = await supabase.from("businesses").update(rest).eq("id", businessId);
    if (error) return { ok: false, error: error.message };
  }
  if (ownerName) {
    const { data: b } = await supabase.from("businesses").select("owner_profile_id").eq("id", businessId).single();
    if (b) await supabase.from("profiles").update({ display_name: ownerName }).eq("id", b.owner_profile_id);
    await supabase.from("brand_profiles").update({ owner_name: ownerName }).eq("business_id", businessId);
  }
  revalidatePath(`/expert/clients/${businessId}`);
  return { ok: true };
}

const brandSchema = z
  .object({
    owner_name: z.string().nullable(),
    address: z.string().nullable(),
    maps_link: z.string().nullable(),
    timings: z.string().nullable(),
    contact_phone: z.string().nullable(),
    whatsapp: z.string().nullable(),
    logo_path: z.string().nullable(),
    colors: z.object({ primary: z.string(), secondary: z.string(), accent: z.string() }),
    font_style: z.string(),
    example_paths: z.array(z.string()),
    tone: z.string(),
    content_languages: z.array(z.string()),
    default_language: z.string(),
    emoji_level: z.enum(["none", "some", "lots"]),
    audience: z.string().nullable(),
    audience_tags: z.array(z.string()),
    avoid_list: z.array(z.string()),
    avoid_custom: z.string().nullable(),
    signature_items: z.string().nullable(),
    current_offers: z.string().nullable(),
  })
  .partial();

export async function updateBrandProfile(businessId: string, input: z.input<typeof brandSchema>): Promise<Result> {
  const { supabase } = await requireExpert();
  const parsed = brandSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const { error } = await supabase
    .from("brand_profiles")
    .upsert({ business_id: businessId, ...parsed.data }, { onConflict: "business_id" });
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/expert/clients/${businessId}`);
  return { ok: true };
}

const offeringSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(200),
  price: z.number().nonnegative().nullable(),
  description: z.string().max(1000).nullable(),
  photo_path: z.string().nullable(),
  is_signature: z.boolean(),
});

export async function saveOffering(businessId: string, input: z.input<typeof offeringSchema>): Promise<Result> {
  const { supabase } = await requireExpert();
  const parsed = offeringSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const { id, ...row } = parsed.data;
  const { error } = id
    ? await supabase.from("offerings").update(row).eq("id", id)
    : await supabase.from("offerings").insert({ ...row, business_id: businessId });
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/expert/clients/${businessId}`);
  return { ok: true };
}

export async function deleteOffering(businessId: string, offeringId: string): Promise<Result> {
  const { supabase } = await requireExpert();
  await supabase.from("offerings").delete().eq("id", offeringId);
  revalidatePath(`/expert/clients/${businessId}`);
  return { ok: true };
}

const slotSchema = z.object({
  type: z.enum(CONTENT_TYPES as [string, ...string[]]),
  goal: z.string().max(200),
  day: z.number().int().min(0).max(6),
});

export async function saveWeeklyPlan(businessId: string, slots: z.input<typeof slotSchema>[]): Promise<Result> {
  const { supabase } = await requireExpert();
  const parsed = z.array(slotSchema).max(21).safeParse(slots);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const { error } = await supabase
    .from("weekly_plans")
    .upsert({ business_id: businessId, slots: parsed.data }, { onConflict: "business_id" });
  if (error) return { ok: false, error: error.message };

  // Rebuild this week's slots that haven't been started yet
  const admin = createAdminClient();
  const weekStart = await ensureWeekSlots(admin, businessId);
  await admin
    .from("plan_slots")
    .delete()
    .eq("business_id", businessId)
    .eq("week_start", weekStart)
    .eq("status", "planned")
    .is("request_id", null);
  await ensureWeekSlots(admin, businessId);
  revalidatePath(`/expert/clients/${businessId}`);
  return { ok: true };
}

async function slotRequest(slotId: string) {
  const session = await requireExpert();
  const { data: slot } = await session.supabase.from("plan_slots").select("*").eq("id", slotId).single<PlanSlot>();
  if (!slot) throw new Error("Slot not found");
  const { data: business } = await session.supabase
    .from("businesses")
    .select("*")
    .eq("id", slot.business_id)
    .single<Business>();
  const admin = createAdminClient();
  let requestId = slot.request_id;
  if (!requestId) {
    const request = await createRequest(admin, {
      business: business!,
      createdBy: session.profile.id,
      source: "plan_slot",
      summary: `Weekly plan: ${slot.type.replace("_", " ")}${slot.goal ? ` – ${slot.goal}` : ""}`,
      contentType: slot.type,
      planSlotId: slot.id,
      status: "in_progress",
    });
    requestId = request.id;
    await admin.from("plan_slots").update({ request_id: requestId, status: "in_progress" }).eq("id", slot.id);
  }
  return { ...session, slot, business: business!, admin, requestId: requestId! };
}

/** Expert starts making a planned post proactively */
export async function startPlanSlot(slotId: string): Promise<Result<{ requestId: string }>> {
  const { admin, slot, requestId } = await slotRequest(slotId);
  const conversationId = await getConversationId(admin, slot.business_id);
  await postSystem(admin, conversationId, "planStarted", { type: slot.type }, requestId);
  revalidatePath(`/expert/clients/${slot.business_id}`);
  return { ok: true, requestId };
}

/** The planned post needs something from the client, usually a photo */
export async function askForPhoto(slotId: string, text: string): Promise<Result<{ requestId: string }>> {
  const { admin, slot, requestId, profile } = await slotRequest(slotId);
  const conversationId = await getConversationId(admin, slot.business_id);
  await postMessage(admin, conversationId, {
    sender: "expert",
    senderProfileId: profile.id,
    kind: "text",
    body: text.trim(),
    requestId,
  });
  await admin.from("plan_slots").update({ status: "waiting_photo", reminded_at: null }).eq("id", slot.id);
  revalidatePath(`/expert/clients/${slot.business_id}`);
  return { ok: true, requestId };
}

export async function setSubscription(
  businessId: string,
  input: { status: string; planId: string | null; currentPeriodEnd: string | null },
): Promise<Result> {
  const { supabase } = await requireExpert();
  if (!SUBSCRIPTION_STATUSES.includes(input.status as never)) return { ok: false, error: "invalid" };
  const { error } = await supabase.from("subscriptions").upsert(
    {
      business_id: businessId,
      status: input.status,
      plan_id: input.planId,
      current_period_end: input.currentPeriodEnd || null,
      provider: "manual",
    },
    { onConflict: "business_id" },
  );
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/expert/clients/${businessId}`);
  revalidatePath("/expert/clients");
  return { ok: true };
}

export async function addCustomSuggestion(
  businessId: string,
  input: { title_en: string; title_hi: string; content_type: string | null; show_at: string | null },
): Promise<Result> {
  const { supabase, profile } = await requireExpert();
  if (!input.title_en.trim()) return { ok: false, error: "invalid" };
  const { error } = await supabase.from("suggestions").insert({
    business_id: businessId,
    kind: "custom",
    payload: {
      title_en: input.title_en.trim(),
      title_hi: input.title_hi.trim() || input.title_en.trim(),
      content_type: input.content_type || null,
    },
    show_at: input.show_at ? new Date(input.show_at).toISOString() : new Date().toISOString(),
    created_by: profile.id,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/expert/clients/${businessId}`);
  return { ok: true };
}
