"use server";

import { requireExpert } from "@/lib/auth/session";
import { BUCKETS } from "@/lib/config";
import { getConversationId, rulesFor } from "@/lib/domain";
import { buildCaptionPrompt, buildImagePrompt, parseCaptionDrafts, type CaptionDraft } from "@/lib/ai/content";
import { AiNotConfiguredError, generateImage, generateText, isImageAiEnabled, isTextAiEnabled } from "@/lib/ai/providers";
import { createAdminClient } from "@/lib/supabase/admin";
import type { BrandProfile, Business, Example, Offering, RequestRow, Revision } from "@/lib/types";

type Fail = { ok: false; error: string };

export async function aiStatus() {
  await requireExpert();
  return { text: isTextAiEnabled(), image: isImageAiEnabled() };
}

async function loadContext(requestId: string) {
  const { supabase } = await requireExpert();
  const { data: request } = await supabase.from("requests").select("*").eq("id", requestId).single<RequestRow>();
  if (!request) throw new Error("not_found");
  const [{ data: business }, { data: brand }, { data: offerings }, { data: examples }, { data: revisions }] = await Promise.all([
    supabase.from("businesses").select("*").eq("id", request.business_id).single<Business>(),
    supabase.from("brand_profiles").select("*").eq("business_id", request.business_id).maybeSingle<BrandProfile>(),
    supabase.from("offerings").select("name, price, description, is_signature").eq("business_id", request.business_id).order("sort"),
    supabase
      .from("examples")
      .select("caption, notes, is_gold_standard, content_type, business_id, created_at")
      .or(`business_id.eq.${request.business_id},is_gold_standard.eq.true`)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase.from("revisions").select("*").eq("request_id", requestId).order("number", { ascending: false }).limit(1),
  ]);
  if (!business) throw new Error("not_found");

  // the client's own words for this request (text messages and quick-start answers)
  const admin = createAdminClient();
  const conversationId = await getConversationId(admin, business.id);
  const { data: msgs } = await supabase
    .from("messages")
    .select("body")
    .eq("conversation_id", conversationId)
    .eq("request_id", requestId)
    .eq("sender", "client")
    .not("body", "is", null)
    .order("created_at")
    .limit(10);

  // same-business examples first, then gold standards from other brands
  const ex = ((examples ?? []) as (Example & { business_id: string | null })[]).sort(
    (a, b) => Number(b.business_id === business.id) - Number(a.business_id === business.id),
  );

  return {
    request,
    business,
    brand: brand ?? null,
    ctx: {
      business,
      brand: brand ?? null,
      offerings: (offerings ?? []) as Offering[],
      rules: await rulesFor(supabase, business),
      examples: ex,
      request,
      clientMessages: (msgs ?? []).map((m) => String(m.body).slice(0, 600)),
      lastFeedback: ((revisions ?? [])[0] as Revision | undefined) ?? null,
    },
  };
}

function failure(e: unknown): Fail {
  if (e instanceof AiNotConfiguredError) return { ok: false, error: "not_configured" };
  console.error("ai action failed", e);
  return { ok: false, error: e instanceof Error ? e.message.slice(0, 300) : "failed" };
}

/** Caption + hashtag drafts for a request. Nothing is saved; the expert edits and saves. */
export async function generateCaptionDrafts(
  requestId: string,
  count = 3,
  language?: string,
): Promise<{ ok: true; drafts: CaptionDraft[]; provider: string } | Fail> {
  try {
    const { ctx } = await loadContext(requestId);
    const n = Math.min(Math.max(count, 1), 3);
    const messages = buildCaptionPrompt(ctx, n, language);
    const res = await generateText(messages, { json: true, maxTokens: 1800 });
    console.info("ai captions", { requestId, provider: res.provider, model: res.model, usage: res.usage });
    return { ok: true, drafts: parseCaptionDrafts(res.text, n), provider: res.provider };
  } catch (e) {
    return failure(e);
  }
}

/** Generates an image and stores it with the request's deliverables. */
export async function generateRequestImage(
  requestId: string,
  idea: string,
): Promise<{ ok: true; path: string; url: string } | Fail> {
  try {
    if (!idea.trim()) return { ok: false, error: "empty_prompt" };
    const { request, business, brand } = await loadContext(requestId);
    const img = await generateImage(buildImagePrompt(idea.trim().slice(0, 800), { business, brand }));
    const ext = img.mimeType.includes("jpeg") ? "jpg" : img.mimeType.includes("webp") ? "webp" : "png";
    const path = `${request.business_id}/${request.id}/ai-${crypto.randomUUID()}.${ext}`;
    const admin = createAdminClient();
    const { error } = await admin.storage
      .from(BUCKETS.deliverables)
      .upload(path, img.bytes, { contentType: img.mimeType, upsert: false });
    if (error) throw error;
    const { data: signed } = await admin.storage.from(BUCKETS.deliverables).createSignedUrls([path], 60 * 60);
    console.info("ai image", { requestId, provider: img.provider, model: img.model, bytes: img.bytes.length });
    return { ok: true, path, url: signed?.[0]?.signedUrl ?? "" };
  } catch (e) {
    return failure(e);
  }
}
