import { requireClient } from "@/lib/auth/session";
import { ensureWeekSlots } from "@/lib/domain";
import { createAdminClient } from "@/lib/supabase/admin";
import { todayIST, weekStartIST } from "@/lib/format";
import { canCreateRequests } from "@/lib/billing";
import { PlanView } from "@/components/client/plan-view";
import type { PlanSlot, RequestRow, Subscription, Suggestion } from "@/lib/types";

export const dynamic = "force-dynamic";

function addDays(ymd: string, days: number) {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** The posts SocialGrid has planned for this business, one week at a time (?week=-1 / 1) */
export default async function PlanPage({ searchParams }: { searchParams: Promise<{ week?: string }> }) {
  const { supabase, business } = await requireClient();
  const offset = Math.max(-8, Math.min(4, Number((await searchParams).week) || 0));
  const thisWeek = weekStartIST();
  if (offset === 0) await ensureWeekSlots(createAdminClient(), business.id);
  const weekStart = addDays(thisWeek, offset * 7);

  const [{ data: slots }, { data: sub }, { data: festival }] = await Promise.all([
    supabase
      .from("plan_slots")
      .select("*")
      .eq("business_id", business.id)
      .eq("week_start", weekStart)
      .order("day")
      .order("slot_index"),
    supabase.from("subscriptions").select("status").eq("business_id", business.id).maybeSingle<Pick<Subscription, "status">>(),
    supabase
      .from("suggestions")
      .select("*")
      .eq("business_id", business.id)
      .eq("kind", "festival")
      .eq("status", "pending")
      .lte("show_at", new Date().toISOString())
      .order("show_at", { ascending: false })
      .limit(1)
      .maybeSingle<Suggestion>(),
  ]);
  const list = (slots ?? []) as PlanSlot[];
  const requestIds = list.map((s) => s.request_id).filter(Boolean) as string[];
  const { data: reqs } = requestIds.length
    ? await supabase.from("requests").select("id, status, due_at, summary").in("id", requestIds)
    : { data: [] };

  return (
    <PlanView
      weekStart={weekStart}
      today={todayIST()}
      offset={offset}
      slots={list}
      requests={Object.fromEntries(((reqs ?? []) as Pick<RequestRow, "id" | "status" | "due_at" | "summary">[]).map((r) => [r.id, r]))}
      festival={festival ?? null}
      canRequest={canCreateRequests(sub?.status)}
    />
  );
}
