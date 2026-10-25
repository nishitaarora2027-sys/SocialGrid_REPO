import "server-only";
import { getSession } from "@/lib/auth/session";

/** The signed-in client's business id for API routes, or null (routes answer 401 instead of redirecting) */
export async function clientBusinessId() {
  const session = await getSession();
  if (!session || session.isExpert) return null;
  const { data: business } = await session.supabase
    .from("businesses")
    .select("id")
    .eq("owner_profile_id", session.profile.id)
    .maybeSingle<{ id: string }>();
  return business?.id ?? null;
}
