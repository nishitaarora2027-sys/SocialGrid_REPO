import { requireClient } from "@/lib/auth/session";
import { canCreateRequests } from "@/lib/billing";
import { ensureWeekSlots, getConversationId } from "@/lib/domain";
import { runSuggestions } from "@/lib/suggestions/engine";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadThread } from "@/lib/thread";
import { SUPPORT_WHATSAPP } from "@/lib/config";
import { isoDaysAgo } from "@/lib/format";
import { ChatScreen } from "@/components/client/chat-screen";
import type { PlanSlot, QuickStartCard, RequestRow, Subscription } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ChatPage() {
  const { supabase, profile, business } = await requireClient();

  // Housekeeping that would otherwise need a scheduled job
  const admin = createAdminClient();
  const conversationId = await getConversationId(admin, business.id);
  const [, weekStart] = await Promise.all([
    runSuggestions(admin, business).catch((e) => console.error("suggestions failed", e)),
    ensureWeekSlots(admin, business.id),
  ]);

  const threeDaysAgo = isoDaysAgo(3);
  const [thread, { data: cards }, { data: slots }, { data: sub }, { data: recent }] = await Promise.all([
    loadThread(supabase, conversationId),
    supabase
      .from("quick_start_cards")
      .select("*")
      .eq("industry", business.industry)
      .eq("active", true)
      .order("sort"),
    supabase
      .from("plan_slots")
      .select("*")
      .eq("business_id", business.id)
      .eq("week_start", weekStart)
      .order("day")
      .order("slot_index"),
    supabase.from("subscriptions").select("status").eq("business_id", business.id).maybeSingle<Pick<Subscription, "status">>(),
    supabase
      .from("requests")
      .select("id, summary, status, due_at, updated_at, quick_start_type")
      .eq("business_id", business.id)
      .or(`status.in.(new,in_progress,revision_requested),updated_at.gte.${threeDaysAgo}`)
      .neq("status", "cancelled")
      .order("updated_at", { ascending: false })
      .limit(6),
  ]);

  // First names of the team members who wrote, read with the admin client (customers can't read team profiles)
  const teamIds = [...new Set(thread.messages.filter((m) => m.sender === "expert" && m.sender_profile_id).map((m) => m.sender_profile_id!))];
  const { data: team } = teamIds.length
    ? await admin.from("profiles").select("id, display_name").in("id", teamIds)
    : { data: [] as { id: string; display_name: string }[] };
  const teamNames = Object.fromEntries((team ?? []).map((p) => [p.id, p.display_name as string]));

  return (
    <ChatScreen
      businessId={business.id}
      businessName={business.name}
      conversationId={conversationId}
      ownerName={profile.display_name}
      cards={(cards ?? []) as QuickStartCard[]}
      slots={(slots ?? []) as PlanSlot[]}
      thread={thread}
      teamNames={teamNames}
      recentRequests={(recent ?? []) as Pick<RequestRow, "id" | "summary" | "status" | "due_at" | "quick_start_type">[]}
      canRequest={canCreateRequests(sub?.status)}
      supportWhatsapp={SUPPORT_WHATSAPP}
    />
  );
}
