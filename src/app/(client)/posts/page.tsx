import { requireClient } from "@/lib/auth/session";
import { BUCKETS } from "@/lib/config";
import { signFiles } from "@/lib/storage";
import { PostsLibrary } from "@/components/client/posts-library";
import type { ContentOption } from "@/lib/types";

export const dynamic = "force-dynamic";

/** Always available, even when the subscription has expired. */
export default async function PostsPage() {
  const { supabase, business } = await requireClient();
  const { data } = await supabase
    .from("content_options")
    .select("*, requests!inner(business_id)")
    .eq("requests.business_id", business.id)
    .not("delivered_at", "is", null)
    .order("delivered_at", { ascending: false })
    .limit(300);
  const all = (data ?? []) as ContentOption[];

  // Where the client picked one, show just that; otherwise show every option (latest revision)
  const latestRev: Record<string, number> = {};
  for (const o of all) latestRev[o.request_id] = Math.max(latestRev[o.request_id] ?? 0, o.revision_number);
  const chosenReq = new Set(all.filter((o) => o.chosen).map((o) => o.request_id));
  const visible = all.filter((o) =>
    chosenReq.has(o.request_id) ? o.chosen : o.revision_number === latestRev[o.request_id],
  );

  const urls = await signFiles(
    supabase,
    visible.flatMap((o) => o.media.map((m) => ({ bucket: BUCKETS.deliverables, path: m.path }))),
  );
  return <PostsLibrary options={visible} urls={urls} businessName={business.name} />;
}
