import { notFound } from "next/navigation";
import { requireExpert } from "@/lib/auth/session";
import { BUCKETS } from "@/lib/config";
import { ensureWeekSlots } from "@/lib/domain";
import { signFiles } from "@/lib/storage";
import { createAdminClient } from "@/lib/supabase/admin";
import { ClientDetail } from "@/components/expert/client-detail";
import type {
  BrandProfile,
  Business,
  Offering,
  Plan,
  PlanSlot,
  PlanSlotTemplate,
  Profile,
  RequestRow,
  Subscription,
  Suggestion,
} from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ClientPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ wizard?: string; tab?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const { supabase } = await requireExpert();
  const { data: business } = await supabase.from("businesses").select("*").eq("id", id).maybeSingle<Business>();
  if (!business) notFound();

  const weekStart = await ensureWeekSlots(createAdminClient(), id);
  const [
    { data: owner },
    { data: brand },
    { data: offerings },
    { data: plan },
    { data: slots },
    { data: sub },
    { data: plans },
    { data: suggestions },
    { data: requests },
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", business.owner_profile_id).single<Profile>(),
    supabase.from("brand_profiles").select("*").eq("business_id", id).maybeSingle<BrandProfile>(),
    supabase.from("offerings").select("*").eq("business_id", id).order("sort").order("created_at"),
    supabase.from("weekly_plans").select("slots").eq("business_id", id).maybeSingle(),
    supabase.from("plan_slots").select("*").eq("business_id", id).eq("week_start", weekStart).order("day").order("slot_index"),
    supabase.from("subscriptions").select("*").eq("business_id", id).maybeSingle<Subscription>(),
    supabase.from("plans").select("*").order("price_inr"),
    supabase.from("suggestions").select("*").eq("business_id", id).order("created_at", { ascending: false }).limit(30),
    supabase.from("requests").select("*").eq("business_id", id).order("created_at", { ascending: false }).limit(200),
  ]);

  const offeringList = (offerings ?? []) as Offering[];
  const urls = await signFiles(supabase, [
    ...(brand?.logo_path ? [brand.logo_path] : []),
    ...((brand?.example_paths ?? []) as string[]),
    ...offeringList.map((o) => o.photo_path).filter(Boolean) as string[],
  ].map((path) => ({ bucket: BUCKETS.brandAssets, path })));

  const { data: login } = await createAdminClient().auth.admin.getUserById(business.owner_profile_id);

  return (
    <ClientDetail
      business={business}
      owner={owner!}
      brand={brand}
      offerings={offeringList}
      planSlots={(plan?.slots ?? []) as PlanSlotTemplate[]}
      weekSlots={(slots ?? []) as PlanSlot[]}
      subscription={sub}
      plans={(plans ?? []) as Plan[]}
      suggestions={(suggestions ?? []) as Suggestion[]}
      requests={(requests ?? []) as RequestRow[]}
      urls={urls}
      loginEmail={login.user?.email ?? ""}
      initialTab={sp.wizard ? "brand" : (sp.tab ?? "brand")}
      wizard={!!sp.wizard}
    />
  );
}
