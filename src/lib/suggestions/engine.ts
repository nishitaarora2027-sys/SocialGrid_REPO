import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getConversationId, postMessage, postSystem } from "@/lib/domain";
import { todayIST } from "@/lib/format";
import { getSettings } from "@/lib/settings";
import type { Business, Festival, PlanSlot, SuggestionPayload } from "@/lib/types";
import { ideasFor } from "./ideas";

const DAY = 24 * 3600_000;

function daysBetween(fromYmd: string, toYmd: string) {
  return Math.round((Date.parse(toYmd) - Date.parse(fromYmd)) / DAY);
}

/**
 * Rule-based suggestions (no AI). Runs lazily whenever the client opens the chat,
 * so no scheduled job is needed. Each suggestion has a dedupe key, so running this
 * many times only ever posts it once.
 */
export async function runSuggestions(admin: SupabaseClient, business: Business, now = new Date()) {
  const settings = await getSettings(admin);
  const conversationId = await getConversationId(admin, business.id);
  const today = todayIST(now);

  if (business.suggestions_enabled) {
    // 1. Festivals coming up within their lead time
    const horizon = new Date(now.getTime() + 30 * DAY).toISOString().slice(0, 10);
    const { data: festivals } = await admin
      .from("festivals")
      .select("*")
      .eq("active", true)
      .gte("date", today)
      .lte("date", horizon)
      .contains("industries", [business.industry]);

    for (const f of (festivals ?? []) as Festival[]) {
      const daysLeft = daysBetween(today, f.date);
      const lead = f.default_lead_days ?? settings.suggestion_lead_days;
      if (daysLeft > lead) continue;
      await createSuggestion(admin, business.id, conversationId, {
        kind: "festival",
        dedupeKey: `festival:${f.id}`,
        payload: {
          title_en: f.name,
          title_hi: f.name_hi,
          festival_id: f.id,
          content_type: "festival_greeting",
        },
        params: { days: daysLeft },
      });
    }

    // 2. Inactivity nudge
    const { data: lastReq } = await admin
      .from("requests")
      .select("created_at")
      .eq("business_id", business.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const lastActivity = lastReq?.created_at ?? business.created_at;
    const idleDays = Math.floor((now.getTime() - Date.parse(lastActivity)) / DAY);
    if (idleDays >= settings.inactivity_days) {
      const ideas = ideasFor(business.industry);
      const weekNo = Math.floor(now.getTime() / (7 * DAY));
      const idea = ideas[weekNo % ideas.length];
      await createSuggestion(admin, business.id, conversationId, {
        kind: "inactivity",
        dedupeKey: `inactivity:${weekNo}`,
        payload: { title_en: idea.title_en, title_hi: idea.title_hi, content_type: idea.content_type },
      });
    }
  }

  // 3. Custom one-off suggestions from experts whose time has come
  const { data: custom } = await admin
    .from("suggestions")
    .select("id, payload")
    .eq("business_id", business.id)
    .eq("kind", "custom")
    .eq("status", "pending")
    .is("message_id", null)
    .lte("show_at", now.toISOString());
  for (const s of custom ?? []) {
    const messageId = await postMessage(admin, conversationId, {
      sender: "system",
      kind: "suggestion",
      payload: { suggestionId: s.id },
    });
    await admin.from("suggestions").update({ message_id: messageId }).eq("id", s.id);
  }

  // 4. Weekly plan reminders: slots waiting for the client's photo, at most once a day
  const { data: waiting } = await admin
    .from("plan_slots")
    .select("*")
    .eq("business_id", business.id)
    .eq("status", "waiting_photo");
  for (const slot of (waiting ?? []) as (PlanSlot & { reminded_at: string | null })[]) {
    if (slot.reminded_at && now.getTime() - Date.parse(slot.reminded_at) < DAY) continue;
    if (!slot.reminded_at) {
      // The expert's own "please send a photo" message is the first ask; remind from tomorrow.
      await admin.from("plan_slots").update({ reminded_at: now.toISOString() }).eq("id", slot.id);
      continue;
    }
    await postSystem(admin, conversationId, "planReminder", { type: slot.type }, slot.request_id);
    await admin.from("plan_slots").update({ reminded_at: now.toISOString() }).eq("id", slot.id);
  }
}

async function createSuggestion(
  admin: SupabaseClient,
  businessId: string,
  conversationId: string,
  s: {
    kind: "festival" | "inactivity";
    dedupeKey: string;
    payload: SuggestionPayload;
    params?: Record<string, number>;
  },
) {
  const { data: inserted } = await admin
    .from("suggestions")
    .upsert(
      {
        business_id: businessId,
        kind: s.kind,
        dedupe_key: s.dedupeKey,
        payload: { ...s.payload, ...(s.params ?? {}) },
      },
      { onConflict: "business_id,dedupe_key", ignoreDuplicates: true },
    )
    .select("id");
  const id = inserted?.[0]?.id as string | undefined;
  if (!id) return; // already suggested before
  const messageId = await postMessage(admin, conversationId, {
    sender: "system",
    kind: "suggestion",
    payload: { suggestionId: id },
  });
  await admin.from("suggestions").update({ message_id: messageId }).eq("id", id);
}
