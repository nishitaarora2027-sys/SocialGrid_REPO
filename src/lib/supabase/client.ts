"use client";

import { createBrowserClient } from "@supabase/ssr";
import { PUBLIC_SUPABASE_KEY, PUBLIC_SUPABASE_URL } from "@/lib/public-env";

let client: ReturnType<typeof createBrowserClient> | undefined;

/** Browser Supabase client (uploads, realtime). Row Level Security applies. */
export function getBrowserClient() {
  client ??= createBrowserClient(
    PUBLIC_SUPABASE_URL,
    PUBLIC_SUPABASE_KEY,
  );
  return client;
}
