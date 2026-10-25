// Supabase settings readable in the browser. Accepts both our names and the names the
// Vercel ↔ Supabase integration sets automatically. Written out in full so Next.js can
// inline the NEXT_PUBLIC_ values at build time.
export const PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const PUBLIC_SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
// Razorpay key ID (never the secret) for Standard Checkout in the browser
export const PUBLIC_RAZORPAY_KEY_ID = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? "";
