"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { getBrowserClient } from "@/lib/supabase/client";

/**
 * Refreshes the server-rendered page when rows change in `table` (Supabase Realtime,
 * filtered by RLS). Also polls every 30 seconds as a fallback for flaky mobile networks.
 */
export function useRealtimeRefresh(table: "messages" | "requests", filter?: string) {
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const refresh = () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => router.refresh(), 300);
    };
    const supabase = getBrowserClient();
    const channel = supabase
      .channel(`${table}:${filter ?? "all"}`)
      .on("postgres_changes", { event: "*", schema: "public", table, ...(filter ? { filter } : {}) }, refresh)
      .subscribe();
    const poll = setInterval(() => document.visibilityState === "visible" && router.refresh(), 30_000);
    const onVisible = () => document.visibilityState === "visible" && router.refresh();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      void supabase.removeChannel(channel);
      clearInterval(poll);
      document.removeEventListener("visibilitychange", onVisible);
      if (timer.current) clearTimeout(timer.current);
    };
  }, [router, table, filter]);
}
