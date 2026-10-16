import { notFound } from "next/navigation";
import { requireExpert } from "@/lib/auth/session";
import { BUCKETS } from "@/lib/config";
import { getConversationId, rulesFor } from "@/lib/domain";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadThread } from "@/lib/thread";
import { Workspace } from "@/components/expert/workspace";
import { isImageAiEnabled, isTextAiEnabled } from "@/lib/ai/providers";
import type { BrandProfile, Business, ContentOption, Offering, RequestRow, Revision } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function RequestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireExpert();
  const { data: request } = await supabase.from("requests").select("*").eq("id", id).maybeSingle<RequestRow>();
  if (!request) notFound();

  const [{ data: business }, { data: brand }, { data: offerings }, { data: optionRows }, { data: revisions }, { data: recent }] =
    await Promise.all([
      supabase.from("businesses").select("*").eq("id", request.business_id).single<Business>(),
      supabase.from("brand_profiles").select("*").eq("business_id", request.business_id).maybeSingle<BrandProfile>(),
      supabase.from("offerings").select("*").eq("business_id", request.business_id).order("sort"),
      supabase.from("content_options").select("*").eq("request_id", id).order("revision_number").order("position"),
      supabase.from("revisions").select("*").eq("request_id", id).order("number"),
      supabase
        .from("content_options")
        .select("*, requests!inner(business_id)")
        .eq("requests.business_id", request.business_id)
        .eq("chosen", true)
        .neq("request_id", id)
        .order("delivered_at", { ascending: false })
        .limit(6),
    ]);
  if (!business) notFound();

  const conversationId = await getConversationId(createAdminClient(), business.id);
  const options = (optionRows ?? []) as ContentOption[];
  const recentPosts = (recent ?? []) as ContentOption[];
  const brandFiles = [
    ...(brand?.logo_path ? [brand.logo_path] : []),
    ...((brand?.example_paths ?? []) as string[]),
  ].map((path) => ({ bucket: BUCKETS.brandAssets, path }));
  const thread = await loadThread(supabase, conversationId, {
    limit: 300,
    extraFiles: [
      ...brandFiles,
      ...[...options, ...recentPosts].flatMap((o) => o.media.map((m) => ({ bucket: BUCKETS.deliverables, path: m.path }))),
    ],
  });
  const rules = await rulesFor(supabase, business);

  return (
    <Workspace
      request={request}
      business={business}
      brand={brand}
      offerings={(offerings ?? []) as Offering[]}
      rules={rules}
      options={options}
      revisions={(revisions ?? []) as Revision[]}
      recentPosts={recentPosts}
      thread={thread}
      conversationId={conversationId}
      ai={{ text: isTextAiEnabled(), image: isImageAiEnabled() }}
    />
  );
}
