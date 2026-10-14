"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireClient } from "@/lib/auth/session";
import { checkRequestAccess } from "@/lib/billing";
import { BUCKETS, LIMITS } from "@/lib/config";
import {
  createRequest,
  getConversationId,
  postMessage,
  postSystem,
  startRevision,
} from "@/lib/domain";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  Attachment,
  ContentType,
  QuickStartCard,
  RequestRow,
  Suggestion,
} from "@/lib/types";

type Result = { ok: true; dueAt?: string } | { ok: false; error: string };

const attachmentSchema = z.object({
  bucket: z.enum([BUCKETS.clientUploads, BUCKETS.voiceNotes]),
  path: z.string().min(1),
  type: z.enum(["image", "audio"]),
  duration: z.number().optional(),
});

/** Uploaded files must live in the client's own business folder */
function ownsPaths(businessId: string, attachments: Attachment[]) {
  return attachments.every((a) => a.path.startsWith(`${businessId}/`));
}

const sendSchema = z.object({
  text: z.string().max(4000).optional(),
  attachments: z.array(attachmentSchema).max(LIMITS.photosPerMessage + 1).default([]),
  urgent: z.boolean().default(false),
  intent: z.discriminatedUnion("type", [
    z.object({ type: z.literal("new") }),
    z.object({ type: z.literal("add"), requestId: z.string().uuid() }),
    z.object({ type: z.literal("changes"), requestId: z.string().uuid() }),
  ]),
});

/**
 * A chat message from the client. The intent says whether it starts a new request,
 * adds to an open one (e.g. sending the photo the team asked for) or asks for changes
 * to something already delivered.
 */
export async function sendChatMessage(input: z.input<typeof sendSchema>): Promise<Result> {
  const parsed = sendSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const { text, attachments, urgent, intent } = parsed.data;
  if (!text?.trim() && attachments.length === 0) return { ok: false, error: "empty" };

  const { supabase, profile, business } = await requireClient();
  if (!ownsPaths(business.id, attachments)) return { ok: false, error: "invalid" };

  const admin = createAdminClient();
  const conversationId = await getConversationId(admin, business.id);
  const voice = attachments.find((a) => a.type === "audio");
  const images = attachments.filter((a) => a.type === "image");
  const kind = voice ? "voice" : images.length ? "images" : "text";

  if (intent.type === "new") {
    const access = await checkRequestAccess(supabase, business.id);
    if (access !== "ok") return { ok: false, error: access };
    const summary = text?.trim().split("\n")[0].slice(0, 140) || null;
    const request = await createRequest(admin, {
      business,
      createdBy: profile.id,
      source: "chat",
      summary,
      isUrgent: urgent,
    });
    await postMessage(admin, conversationId, {
      sender: "client",
      senderProfileId: profile.id,
      kind,
      body: text?.trim() || null,
      attachments,
      requestId: request.id,
    });
    await postSystem(admin, conversationId, urgent ? "ackUrgent" : "ack", { due: request.due_at }, request.id);
    revalidatePath("/chat");
    return { ok: true, dueAt: request.due_at };
  }

  // add / changes: the request must belong to this client (RLS check)
  const { data: request } = await supabase
    .from("requests")
    .select("*")
    .eq("id", intent.requestId)
    .single<RequestRow>();
  if (!request) return { ok: false, error: "not_found" };

  await postMessage(admin, conversationId, {
    sender: "client",
    senderProfileId: profile.id,
    kind,
    body: text?.trim() || null,
    attachments,
    requestId: request.id,
  });

  if (intent.type === "add") {
    if (images.length && request.plan_slot_id) {
      await admin
        .from("plan_slots")
        .update({ status: "in_progress" })
        .eq("id", request.plan_slot_id)
        .eq("status", "waiting_photo");
    }
    if (urgent && !request.is_urgent) {
      await admin.from("requests").update({ is_urgent: true }).eq("id", request.id);
    }
    await postSystem(admin, conversationId, "added", { due: request.due_at }, request.id);
    revalidatePath("/chat");
    return { ok: true, dueAt: request.due_at };
  }

  const { dueAt, number } = await startRevision(admin, request, text?.trim() || (voice ? "[voice note]" : null), null);
  await postSystem(admin, conversationId, "ackChanges", { due: dueAt }, request.id, { revision: number });
  revalidatePath("/chat");
  return { ok: true, dueAt };
}

const quickStartSchema = z.object({
  cardId: z.string().uuid(),
  answers: z.record(z.string(), z.string().max(1000)),
  /** Human-readable summary in the client's language, shown as their chat message */
  summaryText: z.string().max(2000),
  attachments: z.array(attachmentSchema).max(LIMITS.photosPerMessage).default([]),
  urgent: z.boolean().default(false),
});

export async function submitQuickStart(input: z.input<typeof quickStartSchema>): Promise<Result> {
  const parsed = quickStartSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const { cardId, answers, summaryText, attachments, urgent } = parsed.data;

  const { supabase, profile, business } = await requireClient();
  if (!ownsPaths(business.id, attachments)) return { ok: false, error: "invalid" };

  const { data: card } = await supabase
    .from("quick_start_cards")
    .select("*")
    .eq("id", cardId)
    .single<QuickStartCard>();
  if (!card || card.industry !== business.industry) return { ok: false, error: "invalid" };

  const access = await checkRequestAccess(supabase, business.id, card.content_type);
  if (access !== "ok") return { ok: false, error: access };

  const admin = createAdminClient();
  const conversationId = await getConversationId(admin, business.id);
  const answerSummary = Object.values(answers).filter(Boolean).join(" · ");
  const request = await createRequest(admin, {
    business,
    createdBy: profile.id,
    source: "quick_start",
    quickStartType: card.key,
    structuredAnswers: answers,
    contentType: card.content_type,
    summary: [card.label_en, answerSummary].filter(Boolean).join(": ").slice(0, 140),
    isUrgent: urgent,
  });
  await postMessage(admin, conversationId, {
    sender: "client",
    senderProfileId: profile.id,
    kind: attachments.length ? "images" : "text",
    body: summaryText,
    attachments,
    requestId: request.id,
  });
  await postSystem(
    admin,
    conversationId,
    urgent ? "ackUrgentTopic" : "ackTopic",
    { due: request.due_at, topic_en: card.label_en, topic_hi: card.label_hi },
    request.id,
  );
  revalidatePath("/chat");
  return { ok: true, dueAt: request.due_at };
}

/** Client picks one of the delivered options */
export async function chooseOption(optionId: string): Promise<Result> {
  const { supabase } = await requireClient();
  // RLS: only returns delivered options of this client's own requests
  const { data: option } = await supabase
    .from("content_options")
    .select("id, request_id, revision_number")
    .eq("id", optionId)
    .single();
  if (!option) return { ok: false, error: "not_found" };

  const admin = createAdminClient();
  await admin
    .from("content_options")
    .update({ chosen: false })
    .eq("request_id", option.request_id)
    .eq("revision_number", option.revision_number);
  await admin.from("content_options").update({ chosen: true }).eq("id", option.id);
  const { data: request } = await admin
    .from("requests")
    .update({ status: "completed", completed_at: new Date().toISOString() })
    .eq("id", option.request_id)
    .in("status", ["delivered", "completed"])
    .select("plan_slot_id")
    .maybeSingle();
  if (request?.plan_slot_id) {
    await admin.from("plan_slots").update({ status: "done" }).eq("id", request.plan_slot_id);
  }
  revalidatePath("/chat");
  revalidatePath("/posts");
  return { ok: true };
}

/** "Make changes" and the quick chips ("Try in Hindi", "Shorter caption", ...) */
export async function requestChanges(requestId: string, feedback: string | null, chip: string | null): Promise<Result> {
  const { supabase, profile, business } = await requireClient();
  const { data: request } = await supabase
    .from("requests")
    .select("*")
    .eq("id", requestId)
    .single<RequestRow>();
  if (!request) return { ok: false, error: "not_found" };
  if (!["delivered", "completed"].includes(request.status)) return { ok: false, error: "not_delivered" };

  const admin = createAdminClient();
  const conversationId = await getConversationId(admin, business.id);
  await postMessage(admin, conversationId, {
    sender: "client",
    senderProfileId: profile.id,
    kind: "text",
    body: feedback?.trim() || null,
    payload: chip ? { i18nKey: `chips.${chip}` } : {},
    requestId,
  });
  const { dueAt, number } = await startRevision(admin, request, feedback?.trim() || null, chip);
  await postSystem(admin, conversationId, "ackChanges", { due: dueAt }, requestId, { revision: number });
  revalidatePath("/chat");
  return { ok: true, dueAt };
}

export async function recordDownload(optionId: string, action: "download" | "copy" | "share") {
  const { supabase, profile } = await requireClient();
  const { data: option } = await supabase.from("content_options").select("id").eq("id", optionId).single();
  if (!option) return;
  await createAdminClient().from("downloads").insert({ option_id: optionId, profile_id: profile.id, action });
}

/** "Yes, make it" / "Not now" on a suggestion card */
export async function respondSuggestion(suggestionId: string, accept: boolean, urgent = false): Promise<Result> {
  const { supabase, profile, business } = await requireClient();
  const { data: suggestion } = await supabase
    .from("suggestions")
    .select("*")
    .eq("id", suggestionId)
    .single<Suggestion>();
  if (!suggestion || suggestion.status !== "pending") return { ok: false, error: "not_found" };

  const admin = createAdminClient();
  if (!accept) {
    await admin.from("suggestions").update({ status: "dismissed" }).eq("id", suggestionId);
    revalidatePath("/chat");
    return { ok: true };
  }

  const contentType = (suggestion.payload.content_type ?? null) as ContentType | null;
  const access = await checkRequestAccess(supabase, business.id, contentType);
  if (access !== "ok") return { ok: false, error: access };

  const conversationId = await getConversationId(admin, business.id);
  const request = await createRequest(admin, {
    business,
    createdBy: profile.id,
    source: "suggestion",
    summary: suggestion.payload.title_en,
    contentType,
    suggestionId,
    isUrgent: urgent,
  });
  await admin.from("suggestions").update({ status: "accepted" }).eq("id", suggestionId);
  await postSystem(
    admin,
    conversationId,
    "ackTopic",
    { due: request.due_at, topic_en: suggestion.payload.title_en, topic_hi: suggestion.payload.title_hi },
    request.id,
  );
  revalidatePath("/chat");
  return { ok: true, dueAt: request.due_at };
}

export async function markConversationRead() {
  const { supabase, profile, business } = await requireClient();
  const { data: conv } = await supabase.from("conversations").select("id").eq("business_id", business.id).maybeSingle();
  if (!conv) return;
  await supabase
    .from("conversation_reads")
    .upsert({ conversation_id: conv.id, profile_id: profile.id, last_read_at: new Date().toISOString() });
}

export async function updateTimings(timings: string): Promise<Result> {
  const { supabase, business } = await requireClient();
  const { error } = await supabase.rpc("client_update_timings", { bid: business.id, new_timings: timings.slice(0, 500) });
  if (error) return { ok: false, error: "failed" };
  revalidatePath("/brand");
  return { ok: true };
}

export async function updateOfferingPrice(offeringId: string, price: number | null): Promise<Result> {
  const { supabase } = await requireClient();
  const { error } = await supabase.rpc("client_update_offering_price", { oid: offeringId, new_price: price });
  if (error) return { ok: false, error: "failed" };
  revalidatePath("/brand");
  return { ok: true };
}

export async function addBrandPhotos(paths: string[]): Promise<Result> {
  const { supabase, profile, business } = await requireClient();
  if (!paths.every((p) => p.startsWith(`${business.id}/`))) return { ok: false, error: "invalid" };
  const { error } = await supabase
    .from("brand_photos")
    .insert(paths.map((path) => ({ business_id: business.id, path, uploaded_by: profile.id })));
  if (error) return { ok: false, error: "failed" };
  revalidatePath("/brand");
  return { ok: true };
}
