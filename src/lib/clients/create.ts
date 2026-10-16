import "server-only";
import { z } from "zod";
import { normalizePhone } from "@/lib/auth/phone";
import { isEmail } from "@/lib/auth/provider";
import { ROLE } from "@/lib/auth/session";
import { getBillingProvider } from "@/lib/billing";
import { getConversationId } from "@/lib/domain";
import { createAdminClient } from "@/lib/supabase/admin";
import { INDUSTRIES } from "@/lib/types";

const createClientSchema = z.object({
  businessName: z.string().trim().min(1).max(120),
  ownerName: z.string().trim().min(1).max(120),
  email: z.string().trim().toLowerCase().refine(isEmail),
  phone: z.string().optional(),
  password: z.string().min(6).max(72),
  industry: z.enum(INDUSTRIES as [string, ...string[]]),
  language: z.enum(["en", "hi"]),
});

export type NewClientInput = z.input<typeof createClientSchema>;

/**
 * Creates a customer: login, business, brand profile, chat and trial subscription.
 * No permission check here — callers must check (expert session or recovery code).
 */
export async function createClientRecords(
  input: NewClientInput,
): Promise<{ ok: true; businessId: string } | { ok: false; error: string }> {
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

    return { ok: true, businessId: business.id as string };
  } catch (e) {
    // roll back the login so the email can be used again
    await admin.auth.admin.deleteUser(userId);
    return { ok: false, error: e instanceof Error ? e.message : "failed" };
  }
}

