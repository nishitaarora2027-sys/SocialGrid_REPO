import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/**
 * Where links in Supabase emails land. Handles both link styles:
 *  - ?token_hash=…&type=recovery  (recommended email template; works on any device)
 *  - ?code=…                        (default template; only works in the browser that asked)
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const next = url.searchParams.get("next") ?? "/update-password";
  // only ever redirect inside this site
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/update-password";
  const supabase = await createClient();

  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const code = url.searchParams.get("code");

  let ok = false;
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    ok = !error;
    if (error) console.error("verifyOtp failed", { code: error.code, message: error.message });
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    ok = !error;
    if (error) console.error("exchangeCode failed", { code: error.code, message: error.message });
  }

  const target = url.clone();
  target.search = "";
  target.pathname = ok ? safeNext : "/forgot";
  if (!ok) target.searchParams.set("error", "link");
  return NextResponse.redirect(target);
}
