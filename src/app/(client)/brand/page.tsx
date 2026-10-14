import { requireClient } from "@/lib/auth/session";
import { BUCKETS } from "@/lib/config";
import { signFiles } from "@/lib/storage";
import { BrandView } from "@/components/client/brand-view";
import type { BrandProfile, Offering } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function BrandPage() {
  const { supabase, business } = await requireClient();
  const [{ data: brand }, { data: offerings }, { data: photos }] = await Promise.all([
    supabase.from("brand_profiles").select("*").eq("business_id", business.id).maybeSingle<BrandProfile>(),
    supabase.from("offerings").select("*").eq("business_id", business.id).order("sort").order("created_at"),
    supabase.from("brand_photos").select("id, path").eq("business_id", business.id).order("created_at", { ascending: false }),
  ]);
  const files = [
    ...(brand?.logo_path ? [{ bucket: BUCKETS.brandAssets, path: brand.logo_path }] : []),
    ...((offerings ?? []) as Offering[])
      .filter((o) => o.photo_path)
      .map((o) => ({ bucket: BUCKETS.brandAssets, path: o.photo_path! })),
    ...(photos ?? []).map((p) => ({ bucket: BUCKETS.clientUploads, path: p.path as string })),
  ];
  const urls = await signFiles(supabase, files);
  return (
    <BrandView
      business={business}
      brand={brand}
      offerings={(offerings ?? []) as Offering[]}
      photos={(photos ?? []) as { id: string; path: string }[]}
      urls={urls}
    />
  );
}
