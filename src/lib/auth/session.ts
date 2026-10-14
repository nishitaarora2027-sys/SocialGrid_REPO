import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Business, Profile } from "@/lib/types";

export const ROLE = { expert: 1, client: 2 } as const;

export const getSession = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single<Profile>();
  if (!profile) return null;
  return { supabase, user, profile, isExpert: profile.role_id === ROLE.expert };
});

export async function requireExpert() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!session.isExpert) redirect("/chat");
  return session;
}

export async function requireClient() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.isExpert) redirect("/expert");
  const { data: business } = await session.supabase
    .from("businesses")
    .select("*")
    .eq("owner_profile_id", session.profile.id)
    .single<Business>();
  if (!business) redirect("/login?error=no_business");
  return { ...session, business };
}
