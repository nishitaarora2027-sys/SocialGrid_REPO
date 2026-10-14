"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireExpert } from "@/lib/auth/session";
import { getConversationId, postMessage, postSystem } from "@/lib/domain";
import { createAdminClient } from "@/lib/supabase/admin";
import { CONTENT_TYPES, type BrandProfile, type ContentOption, type RequestRow } from "@/lib/types";

type Result = { ok: true } | { ok: false; error: string };

async function loadRequest(requestId: string) {
  const session = await requireExpert();
  const { data: request } = await session.supabase
    .from("requests")
    .select("*")
    .eq("id", requestId)
    .single<RequestRow>();
  if (!request) throw new Error("Request not found");
  return { ...session, request };
}

function refresh(requestId: string) {
  revalidatePath(`/expert/requests/${requestId}`);
  revalidatePath("/expert");
}

export async function markInProgress(requestId: string): Promise<Result> {
  const { supabase, request } = await loadRequest(requestId);
  if (!["new", "revision_requested"].includes(request.status)) return { ok: false, error: "bad_status" };
  await supabase.from("requests").update({ status: "in_progress" }).eq("id", requestId);
  const admin = createAdminClient();
  const conversationId = await getConversationId(admin, request.business_id);
  await postSystem(admin, conversationId, "workingOnIt", {}, requestId);
  if (request.plan_slot_id) {
    await supabase.from("plan_slots").update({ status: "in_progress" }).eq("id", request.plan_slot_id);
  }
  refresh(requestId);
  return { ok: true };
}

export async function updateRequestMeta(
  requestId: string,
  meta: { content_type?: string | null; is_urgent?: boolean; status?: "cancelled" },
): Promise<Result> {
  const { supabase } = await loadRequest(requestId);
  const update: Record<string, unknown> = {};
  if (meta.content_type !== undefined) {
    if (meta.content_type && !CONTENT_TYPES.includes(meta.content_type as never)) return { ok: false, error: "invalid" };
    update.content_type = meta.content_type;
  }
  if (meta.is_urgent !== undefined) update.is_urgent = meta.is_urgent;
  if (meta.status === "cancelled") update.status = "cancelled";
  const { error } = await supabase.from("requests").update(update).eq("id", requestId);
  if (error) return { ok: false, error: error.message };
  refresh(requestId);
  return { ok: true };
}

export async function sendExpertMessage(requestId: string | null, businessId: string, text: string): Promise<Result> {
  const { profile } = await requireExpert();
  if (!text.trim()) return { ok: false, error: "empty" };
  const admin = createAdminClient();
  const conversationId = await getConversationId(admin, businessId);
  await postMessage(admin, conversationId, {
    sender: "expert",
    senderProfileId: profile.id,
    kind: "text",
    body: text.trim().slice(0, 4000),
    requestId,
  });
  if (requestId) refresh(requestId);
  return { ok: true };
}

const optionSchema = z.object({
  id: z.string().uuid().optional(),
  content_type: z.enum(CONTENT_TYPES as [string, ...string[]]),
  media: z
    .array(z.object({ path: z.string(), type: z.enum(["image", "video"]), name: z.string().optional() }))
    .max(10),
  caption: z.string().max(5000).nullable(),
  hashtags: z.string().max(2000).nullable(),
  language: z.string().max(20),
  reel_fields: z.object({
    script: z.string().optional(),
    shot_list: z.string().optional(),
    on_screen_text: z.string().optional(),
    audio_mood: z.string().optional(),
  }),
  tags: z.object({
    occasion: z.array(z.string()).optional(),
    style: z.array(z.string()).optional(),
    goal: z.array(z.string()).optional(),
  }),
  why_it_works: z.string().max(2000).nullable(),
  expert_notes: z.string().max(2000).nullable(),
});
export type OptionInput = z.infer<typeof optionSchema>;

/** Saves the current revision's draft options (create / update / remove). */
export async function saveDraftOptions(requestId: string, options: OptionInput[]): Promise<{ ok: true; ids: string[] } | { ok: false; error: string }> {
  const parsed = z.array(optionSchema).max(3).safeParse(options);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const { supabase, profile, request } = await loadRequest(requestId);

  const { data: existing } = await supabase
    .from("content_options")
    .select("id, delivered_at")
    .eq("request_id", requestId)
    .eq("revision_number", request.current_revision);
  const drafts = (existing ?? []).filter((o) => !o.delivered_at);
  if ((existing ?? []).some((o) => o.delivered_at)) return { ok: false, error: "already_delivered" };

  const { data: revision } = await supabase
    .from("revisions")
    .select("id")
    .eq("request_id", requestId)
    .eq("number", request.current_revision)
    .maybeSingle();

  const keepIds = parsed.data.map((o) => o.id).filter(Boolean) as string[];
  const toDelete = drafts.filter((d) => !keepIds.includes(d.id)).map((d) => d.id);
  if (toDelete.length) await supabase.from("content_options").delete().in("id", toDelete);

  const ids: string[] = [];
  for (const [position, o] of parsed.data.entries()) {
    const row = {
      ...o,
      request_id: requestId,
      revision_number: request.current_revision,
      revision_id: revision?.id ?? null,
      position,
      created_by: profile.id,
    };
    if (o.id) {
      const { error } = await supabase.from("content_options").update(row).eq("id", o.id);
      if (error) return { ok: false, error: error.message };
      ids.push(o.id);
    } else {
      const { id: _drop, ...insertRow } = row;
      void _drop;
      const { data, error } = await supabase.from("content_options").insert(insertRow).select("id").single();
      if (error) return { ok: false, error: error.message };
      ids.push(data.id);
    }
  }
  // Content type on the request follows the first option, if not set yet
  if (!request.content_type && parsed.data[0]) {
    await supabase.from("requests").update({ content_type: parsed.data[0].content_type }).eq("id", requestId);
  }
  refresh(requestId);
  return { ok: true, ids };
}

function hasTags(o: Pick<ContentOption, "tags">) {
  const t = o.tags ?? {};
  return [...(t.occasion ?? []), ...(t.style ?? []), ...(t.goal ?? [])].length > 0;
}

/**
 * Approve & deliver: posts the options card into the client's chat, snapshots the
 * brand profile and saves every option to the learning library.
 */
export async function deliverOptions(requestId: string, expertChangeNote: string | null): Promise<Result> {
  const { supabase, profile, request } = await loadRequest(requestId);
  const { data: optionsData } = await supabase
    .from("content_options")
    .select("*")
    .eq("request_id", requestId)
    .eq("revision_number", request.current_revision)
    .is("delivered_at", null)
    .order("position");
  const options = (optionsData ?? []) as ContentOption[];
  if (!options.length) return { ok: false, error: "no_options" };
  for (const o of options) {
    const missingContent =
      o.content_type === "caption_only"
        ? !o.caption
        : o.content_type === "reel"
          ? !o.reel_fields?.script && !o.media.length
          : !o.media.length;
    if (missingContent) return { ok: false, error: "missing_content" };
    if (!hasTags(o)) return { ok: false, error: "missing_tags" };
  }
  if (request.current_revision > 0 && !expertChangeNote?.trim()) return { ok: false, error: "missing_change_note" };

  const [{ data: business }, { data: brand }, { data: offerings }] = await Promise.all([
    supabase.from("businesses").select("*").eq("id", request.business_id).single(),
    supabase.from("brand_profiles").select("*").eq("business_id", request.business_id).maybeSingle<BrandProfile>(),
    supabase.from("offerings").select("name, price, is_signature").eq("business_id", request.business_id),
  ]);
  const snapshot = {
    business: business && { name: business.name, industry: business.industry, photo_consent: business.photo_consent },
    brand,
    offerings,
    taken_at: new Date().toISOString(),
  };

  const now = new Date().toISOString();
  const ids = options.map((o) => o.id);
  const { error } = await supabase
    .from("content_options")
    .update({ delivered_at: now, brand_snapshot: snapshot })
    .in("id", ids);
  if (error) return { ok: false, error: error.message };

  // Learning library: one example per delivered option
  await supabase.from("examples").upsert(
    options.map((o) => ({
      source: "delivered",
      option_id: o.id,
      request_id: requestId,
      industry: business?.industry ?? null,
      business_id: request.business_id,
      content_type: o.content_type,
      media: o.media,
      caption: [o.caption, o.hashtags].filter(Boolean).join("\n\n"),
      notes: o.why_it_works,
      tags: o.tags,
      brand_snapshot: snapshot,
      created_by: profile.id,
    })),
    { onConflict: "option_id" },
  );

  if (request.current_revision > 0) {
    await supabase
      .from("revisions")
      .update({ expert_change_note: expertChangeNote })
      .eq("request_id", requestId)
      .eq("number", request.current_revision);
  }

  await supabase
    .from("requests")
    .update({ status: "delivered", delivered_at: now, content_type: request.content_type ?? options[0].content_type })
    .eq("id", requestId);
  if (request.plan_slot_id) {
    await supabase.from("plan_slots").update({ status: "done" }).eq("id", request.plan_slot_id);
  }

  const admin = createAdminClient();
  const conversationId = await getConversationId(admin, request.business_id);
  await postSystem(admin, conversationId, "ready", {}, requestId);
  await postMessage(admin, conversationId, {
    sender: "expert",
    senderProfileId: profile.id,
    kind: "options_card",
    requestId,
    payload: {
      optionIds: ids,
      revision: request.current_revision,
      chips: ["looks_good", "make_changes", "try_hindi", "shorter_caption", "different_colours"],
    },
  });
  refresh(requestId);
  return { ok: true };
}

export async function setGoldStandard(optionId: string, gold: boolean): Promise<Result> {
  const { supabase } = await requireExpert();
  await supabase.from("content_options").update({ is_gold_standard: gold }).eq("id", optionId);
  await supabase.from("examples").update({ is_gold_standard: gold }).eq("option_id", optionId);
  revalidatePath("/expert/library");
  return { ok: true };
}

export async function markConversationReadExpert(conversationId: string) {
  const { supabase, profile } = await requireExpert();
  await supabase
    .from("conversation_reads")
    .upsert({ conversation_id: conversationId, profile_id: profile.id, last_read_at: new Date().toISOString() });
}
