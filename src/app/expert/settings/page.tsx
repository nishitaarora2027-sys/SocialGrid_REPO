import { requireExpert } from "@/lib/auth/session";
import { getSettings } from "@/lib/settings";
import { SettingsView } from "@/components/expert/settings-view";
import type { Festival, Plan, QuickStartCard } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const { supabase } = await requireExpert();
  const [settings, { data: festivals }, { data: plans }, { data: cards }] = await Promise.all([
    getSettings(supabase),
    supabase.from("festivals").select("*").order("date"),
    supabase.from("plans").select("*").order("price_inr"),
    supabase.from("quick_start_cards").select("*").order("industry").order("sort"),
  ]);
  return (
    <SettingsView
      settings={settings}
      festivals={(festivals ?? []) as Festival[]}
      plans={(plans ?? []) as Plan[]}
      cards={(cards ?? []) as QuickStartCard[]}
    />
  );
}
