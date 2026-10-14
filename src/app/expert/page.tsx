import { requireExpert } from "@/lib/auth/session";
import { todayIST } from "@/lib/format";
import { QueueView, type QueueRow } from "@/components/expert/queue-view";
import type { Business, RequestRow } from "@/lib/types";
import { OPEN_STATUSES } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function QueuePage({
  searchParams,
}: {
  searchParams: Promise<{ client?: string; status?: string; type?: string; overdue?: string }>;
}) {
  const { supabase, profile } = await requireExpert();
  const sp = await searchParams;
  const nowIso = new Date().toISOString();
  const todayStart = new Date(`${todayIST()}T00:00:00+05:30`).toISOString();

  let q = supabase.from("requests").select("*").order("due_at", { ascending: true }).limit(300);
  if (sp.status && sp.status !== "open") q = q.eq("status", sp.status);
  else q = q.in("status", OPEN_STATUSES);
  if (sp.client) q = q.eq("business_id", sp.client);
  if (sp.type) q = q.eq("content_type", sp.type);
  if (sp.overdue === "1") q = q.lt("due_at", nowIso);

  const head = () => supabase.from("requests").select("id", { count: "exact", head: true });

  const [{ data: reqData }, { data: businesses }, counts] = await Promise.all([
    q,
    supabase.from("businesses").select("id, name, industry").order("name"),
    Promise.all([
      head().eq("status", "new"),
      head().in("status", ["in_progress", "revision_requested"]),
      head().in("status", OPEN_STATUSES).lt("due_at", nowIso),
      head().gte("delivered_at", todayStart),
    ]).then((rs) => rs.map((r) => r.count ?? 0)),
  ]);
  const requests = (reqData ?? []) as RequestRow[];
  const ids = requests.map((r) => r.id);

  // first client message (for "Voice note" summaries) and latest client message (for unread dots)
  const [{ data: msgs }, { data: convs }, { data: reads }] = await Promise.all([
    ids.length
      ? supabase
          .from("messages")
          .select("request_id, kind, body, created_at")
          .in("request_id", ids)
          .eq("sender", "client")
          .order("created_at", { ascending: true })
      : Promise.resolve({ data: [] as { request_id: string; kind: string; body: string | null; created_at: string }[] }),
    supabase.from("conversations").select("id, business_id"),
    supabase.from("conversation_reads").select("conversation_id, last_read_at").eq("profile_id", profile.id),
  ]);
  const firstMsg: Record<string, { kind: string; body: string | null }> = {};
  const lastClientAt: Record<string, string> = {};
  for (const m of msgs ?? []) {
    firstMsg[m.request_id] ??= { kind: m.kind, body: m.body };
    lastClientAt[m.request_id] = m.created_at;
  }
  const convByBiz = Object.fromEntries((convs ?? []).map((c) => [c.business_id, c.id]));
  const readAt = Object.fromEntries((reads ?? []).map((r) => [r.conversation_id, r.last_read_at]));
  const bizById = Object.fromEntries(((businesses ?? []) as Business[]).map((b) => [b.id, b]));

  const rows: QueueRow[] = requests.map((r) => {
    const conv = convByBiz[r.business_id];
    const last = lastClientAt[r.id];
    return {
      ...r,
      businessName: bizById[r.business_id]?.name ?? "—",
      industry: bizById[r.business_id]?.industry ?? "restaurant",
      firstKind: firstMsg[r.id]?.kind ?? null,
      unread: !!last && (!conv || !readAt[conv] || readAt[conv] < last),
    };
  });

  return (
    <QueueView
      rows={rows}
      businesses={(businesses ?? []) as Pick<Business, "id" | "name" | "industry">[]}
      counts={{ new: counts[0], inProgress: counts[1], overdue: counts[2], deliveredToday: counts[3] }}
      filters={sp}
    />
  );
}
