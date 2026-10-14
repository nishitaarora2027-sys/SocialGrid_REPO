import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { onRequestCreated } from "@/lib/ai";
import { weekStartIST } from "@/lib/format";
import { getSettings } from "@/lib/settings";
import { computeDueAt, type TurnaroundKind } from "@/lib/turnaround";
import type {
  Attachment,
  Business,
  BrandProfile,
  ContentType,
  MessageKind,
  MessagePayload,
  MessageSender,
  PlanSlotTemplate,
  RequestRow,
  Rule,
} from "@/lib/types";

// Everything here runs with the service-role client, after the calling server action
// has checked that the user may do it.

export async function getConversationId(admin: SupabaseClient, businessId: string) {
  const { data } = await admin.from("conversations").select("id").eq("business_id", businessId).maybeSingle();
  if (data) return data.id as string;
  const { data: created, error } = await admin
    .from("conversations")
    .insert({ business_id: businessId })
    .select("id")
    .single();
  if (error) throw error;
  return created.id as string;
}

export interface NewMessage {
  sender: MessageSender;
  senderProfileId?: string | null;
  kind: MessageKind;
  body?: string | null;
  attachments?: Attachment[];
  payload?: MessagePayload;
  requestId?: string | null;
}

export async function postMessage(admin: SupabaseClient, conversationId: string, m: NewMessage) {
  const { data, error } = await admin
    .from("messages")
    .insert({
      conversation_id: conversationId,
      sender: m.sender,
      sender_profile_id: m.senderProfileId ?? null,
      kind: m.kind,
      body: m.body ?? null,
      attachments: m.attachments ?? [],
      payload: m.payload ?? {},
      request_id: m.requestId ?? null,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

export function postSystem(
  admin: SupabaseClient,
  conversationId: string,
  i18nKey: string,
  params: Record<string, string | number> = {},
  requestId: string | null = null,
  extra: Partial<MessagePayload> = {},
) {
  return postMessage(admin, conversationId, {
    sender: "system",
    kind: "status",
    payload: { i18nKey, params, ...extra },
    requestId,
  });
}

export async function dueAtFor(admin: SupabaseClient, kind: TurnaroundKind) {
  const settings = await getSettings(admin);
  return computeDueAt(settings, kind).toISOString();
}

export interface CreateRequestInput {
  business: Business;
  createdBy: string;
  source: RequestRow["source"];
  summary: string | null;
  contentType?: ContentType | null;
  quickStartType?: string | null;
  structuredAnswers?: Record<string, string>;
  isUrgent?: boolean;
  planSlotId?: string | null;
  suggestionId?: string | null;
  status?: "new" | "in_progress";
}

/** Creates a request with its due time. Does not post any chat messages. */
export async function createRequest(admin: SupabaseClient, input: CreateRequestInput) {
  const { data: brand } = await admin
    .from("brand_profiles")
    .select("*")
    .eq("business_id", input.business.id)
    .maybeSingle<BrandProfile>();

  const dueAt = await dueAtFor(admin, input.isUrgent ? "urgent" : "standard");
  const { data, error } = await admin
    .from("requests")
    .insert({
      business_id: input.business.id,
      source: input.source,
      summary: input.summary,
      content_type: input.contentType ?? null,
      quick_start_type: input.quickStartType ?? null,
      structured_answers: input.structuredAnswers ?? {},
      is_urgent: input.isUrgent ?? false,
      language: brand?.default_language ?? "en",
      status: input.status ?? "new",
      due_at: dueAt,
      plan_slot_id: input.planSlotId ?? null,
      suggestion_id: input.suggestionId ?? null,
      created_by: input.createdBy,
    })
    .select("*")
    .single<RequestRow>();
  if (error) throw error;

  // Future AI hook: with autonomy_mode = manual this returns nothing and the
  // request simply waits in the expert queue.
  await onRequestCreated(input.business.autonomy_mode, {
    request: data,
    brandProfile: brand ?? null,
    rules: [],
    examples: [],
  });

  return data;
}

/** Starts a new revision of a request (client asked for changes). */
export async function startRevision(
  admin: SupabaseClient,
  request: RequestRow,
  feedback: string | null,
  chip: string | null,
) {
  const number = request.current_revision + 1;
  const dueAt = await dueAtFor(admin, "revision");
  const { error: revErr } = await admin.from("revisions").insert({
    request_id: request.id,
    number,
    client_feedback: feedback,
    feedback_chip: chip,
    due_at: dueAt,
  });
  if (revErr) throw revErr;
  const { error } = await admin
    .from("requests")
    .update({ status: "revision_requested", current_revision: number, due_at: dueAt, completed_at: null })
    .eq("id", request.id);
  if (error) throw error;
  if (request.plan_slot_id) {
    await admin.from("plan_slots").update({ status: "in_progress" }).eq("id", request.plan_slot_id);
  }
  return { number, dueAt };
}

/** Creates this week's plan slots from the business's weekly plan template, if missing. */
export async function ensureWeekSlots(admin: SupabaseClient, businessId: string, now = new Date()) {
  const weekStart = weekStartIST(now);
  const { data: plan } = await admin
    .from("weekly_plans")
    .select("slots")
    .eq("business_id", businessId)
    .maybeSingle();
  const template = (plan?.slots ?? []) as PlanSlotTemplate[];
  if (template.length) {
    await admin.from("plan_slots").upsert(
      template.map((s, i) => ({
        business_id: businessId,
        week_start: weekStart,
        slot_index: i,
        day: s.day ?? 0,
        type: s.type,
        goal: s.goal ?? null,
      })),
      { onConflict: "business_id,week_start,slot_index", ignoreDuplicates: true },
    );
  }
  return weekStart;
}

/** Rules that apply to a business: its own, its industry's and global ones */
export async function rulesFor(supabase: SupabaseClient, business: Business) {
  const { data } = await supabase
    .from("rules")
    .select("*")
    .eq("active", true)
    .or(`business_id.eq.${business.id},and(scope.eq.industry,industry.eq.${business.industry}),scope.eq.global`)
    .order("created_at");
  return (data ?? []) as Rule[];
}
