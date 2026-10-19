import { requireExpert } from "@/lib/auth/session";
import { ExpertNav } from "@/components/expert/expert-nav";

export default async function ExpertLayout({ children }: { children: React.ReactNode }) {
  const { supabase, profile } = await requireExpert();
  const [{ count: open }, { count: overdue }] = await Promise.all([
    supabase.from("requests").select("id", { count: "exact", head: true }).in("status", ["new", "revision_requested"]),
    supabase
      .from("requests")
      .select("id", { count: "exact", head: true })
      .in("status", ["new", "in_progress", "revision_requested"])
      .lt("due_at", new Date().toISOString()),
  ]);
  return (
    <div className="flex min-h-dvh flex-col bg-paper text-[16px] lg:flex-row">
      <ExpertNav name={profile.display_name} newCount={open ?? 0} overdueCount={overdue ?? 0} />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
