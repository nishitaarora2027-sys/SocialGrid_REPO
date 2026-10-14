/**
 * Creates the two expert accounts and two sample clients (a salon and a restaurant).
 * Run AFTER the SQL migrations and supabase/seed.sql:
 *
 *   npm run seed
 *
 * Reads .env.local. Safe to run more than once (existing accounts are skipped).
 * Passwords come from env vars, or are generated and printed once.
 */
import { config } from "dotenv";
import { randomBytes } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

config({ path: ".env.local" });
config();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY;
const domain = process.env.NEXT_PUBLIC_CLIENT_EMAIL_DOMAIN ?? "clients.socialgrid.app";
if (!url || !secret) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY in .env.local first.");
  process.exit(1);
}
const admin = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });

const pw = (env: string | undefined) => env || `sg-${randomBytes(4).toString("hex")}`;
const created: string[] = [];

async function findUser(email: string) {
  for (let page = 1; page < 50; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const hit = data.users.find((u) => u.email === email);
    if (hit) return hit;
    if (data.users.length < 200) return null;
  }
  return null;
}

async function ensureUser(email: string, password: string, label: string) {
  const existing = await findUser(email);
  if (existing) {
    console.log(`• ${label}: already exists (${email})`);
    return { id: existing.id, isNew: false };
  }
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
  if (error) throw error;
  const line = `${label.padEnd(28)} login: ${email.endsWith(domain) ? email.split("@")[0] : email}   password: ${password}`;
  created.push(line);
  console.log(`+ created ${line}`);
  return { id: data.user.id, isNew: true };
}

async function must<T>(p: PromiseLike<{ data: T; error: unknown }>) {
  const { data, error } = await p;
  if (error) throw error;
  return data;
}

async function seedExperts() {
  const experts = [
    { email: process.env.SEED_EXPERT1_EMAIL ?? "expert1@socialgrid.app", name: process.env.SEED_EXPERT1_NAME ?? "Founder 1", password: pw(process.env.SEED_EXPERT1_PASSWORD) },
    { email: process.env.SEED_EXPERT2_EMAIL ?? "expert2@socialgrid.app", name: process.env.SEED_EXPERT2_NAME ?? "Founder 2", password: pw(process.env.SEED_EXPERT2_PASSWORD) },
  ];
  for (const e of experts) {
    const { id } = await ensureUser(e.email, e.password, `Expert ${e.name}`);
    await must(admin.from("profiles").upsert({ id, role_id: 1, display_name: e.name, preferred_ui_language: "en" }, { onConflict: "id" }));
  }
}

interface SampleClient {
  phone: string;
  owner: string;
  business: string;
  industry: "salon" | "restaurant";
  brand: Record<string, unknown>;
  offerings: { name: string; price: number; is_signature?: boolean; description?: string }[];
  plan: { type: string; goal: string; day: number }[];
  rules: string[];
}

const SAMPLES: SampleClient[] = [
  {
    phone: "919000000001",
    owner: "Sunita",
    business: "Glow Beauty Salon",
    industry: "salon",
    brand: {
      address: "12, MG Road, Indore",
      timings: "10 AM – 8 PM, closed Tuesday",
      colors: { primary: "#C2255C", secondary: "#FFF0F6", accent: "#F59F00" },
      font_style: "elegant",
      tone: "friendly",
      content_languages: ["hi", "hinglish"],
      default_language: "hinglish",
      emoji_level: "some",
      audience_tags: ["brides", "women", "college_students"],
      audience: "Brides and their families, college girls before functions",
      avoid_list: ["faces_without_consent", "medical_claims", "competitors"],
      signature_items: "Bridal makeup, keratin treatment",
      current_offers: "20% off on keratin this month",
    },
    offerings: [
      { name: "Bridal makeup", price: 15000, is_signature: true },
      { name: "Keratin treatment", price: 3500, is_signature: true },
      { name: "Haircut & blow-dry", price: 600 },
      { name: "Facial (gold)", price: 1200 },
    ],
    plan: [
      { type: "single_post", goal: "offer", day: 0 },
      { type: "carousel", goal: "before & after", day: 2 },
      { type: "reel", goal: "behind the scenes", day: 4 },
    ],
    rules: ["Never promise permanent results in captions.", "Use soft pink and gold tones."],
  },
  {
    phone: "919000000002",
    owner: "Ramesh",
    business: "Sharma Ji Ka Dhaba",
    industry: "restaurant",
    brand: {
      address: "Near Bus Stand, Ujjain",
      timings: "11 AM – 11 PM, all days",
      colors: { primary: "#E8590C", secondary: "#FFF4E6", accent: "#2B8A3E" },
      font_style: "bold",
      tone: "traditional",
      content_languages: ["hi", "en"],
      default_language: "hi",
      emoji_level: "lots",
      audience_tags: ["families", "foodies", "office_workers"],
      audience: "Families on weekends, travellers from the bus stand",
      avoid_list: ["alcohol", "non_veg", "competitors"],
      signature_items: "Dal baati churma, paneer tikka",
      current_offers: "Free lassi with every thali on Sunday",
    },
    offerings: [
      { name: "Dal baati churma", price: 180, is_signature: true },
      { name: "Paneer tikka", price: 220, is_signature: true },
      { name: "Special thali", price: 250 },
      { name: "Sweet lassi", price: 60 },
    ],
    plan: [
      { type: "single_post", goal: "today's special", day: 1 },
      { type: "reel", goal: "food being made", day: 3 },
      { type: "single_post", goal: "customer review", day: 5 },
    ],
    rules: ["Always show the dish close-up with steam.", "Pure veg: never show eggs or meat."],
  },
];

async function seedClients() {
  const { data: plan } = await admin.from("plans").select("id").eq("name", "Pilot").maybeSingle();
  for (const s of SAMPLES) {
    const password = pw(undefined);
    const existing = await findUser(`${s.phone}@${domain}`);
    if (existing) {
      const { data: biz } = await admin.from("businesses").select("id").eq("owner_profile_id", existing.id).maybeSingle();
      const { count } = biz
        ? await admin.from("subscriptions").select("id", { count: "exact", head: true }).eq("business_id", biz.id)
        : { count: 0 };
      if (count) {
        console.log(`• Sample ${s.industry}: already set up`);
        continue;
      }
    }
    const { id } = await ensureUser(`${s.phone}@${domain}`, password, `Sample ${s.industry} (${s.owner})`);
    await must(
      admin
        .from("profiles")
        .upsert({ id, role_id: 2, display_name: s.owner, phone: s.phone, preferred_ui_language: "hi" }, { onConflict: "id" }),
    );
    // A previous run may have stopped half way: start this client's data over
    await must(admin.from("businesses").delete().eq("owner_profile_id", id));
    const business = await must(
      admin.from("businesses").insert({ owner_profile_id: id, name: s.business, industry: s.industry }).select("id").single(),
    );
    const bid = (business as { id: string }).id;
    await must(admin.from("brand_profiles").insert({ business_id: bid, owner_name: s.owner, contact_phone: s.phone, whatsapp: s.phone, ...s.brand }));
    // every row needs the same keys, or PostgREST inserts NULL instead of the column default
    await must(
      admin.from("offerings").insert(
        s.offerings.map((o, i) => ({
          business_id: bid,
          name: o.name,
          price: o.price,
          description: o.description ?? null,
          is_signature: o.is_signature ?? false,
          sort: i,
        })),
      ),
    );
    await must(admin.from("weekly_plans").insert({ business_id: bid, slots: s.plan }));
    await must(admin.from("conversations").insert({ business_id: bid }));
    await must(admin.from("rules").insert(s.rules.map((text) => ({ scope: "client", business_id: bid, text }))));
    await must(admin.from("subscriptions").insert({ business_id: bid, plan_id: plan?.id ?? null, status: "trial" }));
  }
}

async function main() {
  const { error } = await admin.from("roles").select("id").limit(1);
  if (error) {
    console.error("Can't read the roles table. Did you run the SQL migrations first? See README.", error.message);
    process.exit(1);
  }
  const { count } = await admin.from("festivals").select("id", { count: "exact", head: true });
  if (!count) console.warn("⚠ No festivals found — run supabase/seed.sql in the SQL editor too.");

  await seedExperts();
  await seedClients();

  if (created.length) {
    console.log("\nNew accounts — save these now, passwords are not shown again:\n");
    for (const line of created) console.log("  " + line);
  }
  console.log("\nDone.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
