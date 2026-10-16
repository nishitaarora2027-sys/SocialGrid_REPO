import { randomBytes } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { findUserByEmail } from "../supabase/users";

// Creates expert logins and the two sample clients. Shared by `npm run seed` and the
// one-time /setup page. Safe to run repeatedly: existing accounts are skipped and a
// half-created sample client is rebuilt.

export interface Credential {
  label: string;
  login: string;
  password: string;
}

export interface ExpertInput {
  name: string;
  email: string;
  password?: string;
}

export const randomPassword = () => `sg-${randomBytes(4).toString("hex")}`;

export interface SampleClient {
  phone: string;
  owner: string;
  business: string;
  industry: "salon" | "restaurant";
  brand: Record<string, unknown>;
  offerings: { name: string; price: number; is_signature?: boolean; description?: string }[];
  plan: { type: string; goal: string; day: number }[];
  rules: string[];
}

export const SAMPLES: SampleClient[] = [
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

export function createSeeder(admin: SupabaseClient, domain: string, log: (msg: string) => void = () => {}) {
  const created: Credential[] = [];

  async function must<T>(p: PromiseLike<{ data: T; error: unknown }>) {
    const { data, error } = await p;
    if (error) throw error;
    return data;
  }

  const findUser = (email: string) => findUserByEmail(admin, email);

  async function ensureUser(email: string, password: string, label: string) {
    const existing = await findUser(email);
    if (existing) {
      log(`• ${label}: already exists (${email})`);
      return existing.id;
    }
    const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    if (error) throw error;
    const cred = { label, login: email.endsWith(`@${domain}`) ? email.split("@")[0] : email, password };
    created.push(cred);
    log(`+ created ${label.padEnd(28)} login: ${cred.login}   password: ${password}`);
    return data.user.id;
  }

  async function seedExperts(experts: ExpertInput[]) {
    for (const e of experts) {
      const id = await ensureUser(e.email.trim().toLowerCase(), e.password || randomPassword(), `Expert ${e.name}`);
      await must(
        admin
          .from("profiles")
          .upsert({ id, role_id: 1, display_name: e.name, preferred_ui_language: "en" }, { onConflict: "id" }),
      );
    }
  }

  async function seedSampleClients() {
    const { data: plan } = await admin.from("plans").select("id").eq("name", "Pilot").maybeSingle();
    for (const s of SAMPLES) {
      const existing = await findUser(`${s.phone}@${domain}`);
      if (existing) {
        const { data: biz } = await admin.from("businesses").select("id").eq("owner_profile_id", existing.id).maybeSingle();
        const { count } = biz
          ? await admin.from("subscriptions").select("id", { count: "exact", head: true }).eq("business_id", biz.id)
          : { count: 0 };
        if (count) {
          log(`• Sample ${s.industry}: already set up`);
          continue;
        }
      }
      const id = await ensureUser(`${s.phone}@${domain}`, randomPassword(), `Sample ${s.industry} (${s.owner})`);
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
      await must(
        admin.from("brand_profiles").insert({ business_id: bid, owner_name: s.owner, contact_phone: s.phone, whatsapp: s.phone, ...s.brand }),
      );
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

  return { seedExperts, seedSampleClients, created };
}
