import { requireExpert } from "@/lib/auth/session";
import { BUCKETS } from "@/lib/config";
import { signFiles } from "@/lib/storage";
import { LibraryView } from "@/components/expert/library-view";
import type { Business, Example, Rule } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; industry?: string; gold?: string; client?: string }>;
}) {
  const sp = await searchParams;
  const { supabase } = await requireExpert();

  let ex = supabase
    .from("examples")
    .select("*, content_options(chosen)")
    .order("is_gold_standard", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(120);
  if (sp.industry) ex = ex.eq("industry", sp.industry);
  if (sp.client) ex = ex.eq("business_id", sp.client);
  if (sp.gold === "1") ex = ex.eq("is_gold_standard", true);

  const [{ data: rules }, { data: examples }, { data: businesses }] = await Promise.all([
    supabase.from("rules").select("*").order("scope").order("created_at", { ascending: false }),
    ex,
    supabase.from("businesses").select("id, name, industry").order("name"),
  ]);
  const exList = (examples ?? []) as (Example & { content_options: { chosen: boolean } | null })[];
  const urls = await signFiles(
    supabase,
    exList.flatMap((e) =>
      e.media.map((m) => ({ bucket: (m as { bucket?: string }).bucket ?? BUCKETS.deliverables, path: m.path })),
    ),
  );

  return (
    <LibraryView
      rules={(rules ?? []) as Rule[]}
      examples={exList}
      businesses={(businesses ?? []) as Pick<Business, "id" | "name" | "industry">[]}
      urls={urls}
      filters={sp}
    />
  );
}
