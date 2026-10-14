import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { BUCKETS } from "@/lib/config";
import { fileKey, signFiles, type FileRef } from "@/lib/storage";
import type { ContentOption, Message, RequestRow, Suggestion } from "@/lib/types";

export type ThreadRequest = Pick<
  RequestRow,
  | "id"
  | "summary"
  | "status"
  | "due_at"
  | "current_revision"
  | "quick_start_type"
  | "content_type"
  | "is_urgent"
  | "created_at"
  | "delivered_at"
  | "plan_slot_id"
>;

export interface ThreadData {
  messages: Message[];
  options: Record<string, ContentOption>;
  suggestions: Record<string, Suggestion>;
  requests: Record<string, ThreadRequest>;
  urls: Record<string, string>;
}

/** Messages of a conversation plus everything needed to render them (options, files, ...). */
export async function loadThread(
  supabase: SupabaseClient,
  conversationId: string,
  { limit = 150, extraFiles = [] as FileRef[] } = {},
): Promise<ThreadData> {
  const { data: recent } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(limit);
  const messages = ((recent ?? []) as Message[]).reverse();

  const optionIds = messages.flatMap((m) => m.payload?.optionIds ?? []);
  const suggestionIds = messages.map((m) => m.payload?.suggestionId).filter(Boolean) as string[];
  const requestIds = [...new Set(messages.map((m) => m.request_id).filter(Boolean))] as string[];

  const [{ data: opts }, { data: sugs }, { data: reqs }] = await Promise.all([
    optionIds.length
      ? supabase.from("content_options").select("*").in("id", optionIds)
      : Promise.resolve({ data: [] }),
    suggestionIds.length
      ? supabase.from("suggestions").select("*").in("id", suggestionIds)
      : Promise.resolve({ data: [] }),
    requestIds.length
      ? supabase
          .from("requests")
          .select(
            "id, summary, status, due_at, current_revision, quick_start_type, content_type, is_urgent, created_at, delivered_at, plan_slot_id",
          )
          .in("id", requestIds)
      : Promise.resolve({ data: [] }),
  ]);

  const options = Object.fromEntries(((opts ?? []) as ContentOption[]).map((o) => [o.id, o]));
  const files: FileRef[] = [
    ...extraFiles,
    ...messages.flatMap((m) => m.attachments.map((a) => ({ bucket: a.bucket, path: a.path }))),
    ...Object.values(options).flatMap((o) => o.media.map((md) => ({ bucket: BUCKETS.deliverables, path: md.path }))),
  ];

  return {
    messages,
    options,
    suggestions: Object.fromEntries(((sugs ?? []) as Suggestion[]).map((s) => [s.id, s])),
    requests: Object.fromEntries(((reqs ?? []) as ThreadRequest[]).map((r) => [r.id, r])),
    urls: await signFiles(supabase, files),
  };
}

export { fileKey };
