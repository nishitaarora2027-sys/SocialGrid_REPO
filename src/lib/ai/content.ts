import type { BrandProfile, Business, Example, Offering, RequestRow, Revision, Rule } from "@/lib/types";
import type { ChatMessage } from "./providers";

export interface CaptionContext {
  business: Pick<Business, "name" | "industry">;
  brand: BrandProfile | null;
  offerings: Pick<Offering, "name" | "price" | "description" | "is_signature">[];
  rules: Pick<Rule, "text">[];
  examples: Pick<Example, "caption" | "notes" | "is_gold_standard" | "content_type">[];
  request: Pick<RequestRow, "summary" | "structured_answers" | "content_type" | "language" | "current_revision">;
  clientMessages: string[];
  lastFeedback: Pick<Revision, "client_feedback" | "feedback_chip"> | null;
}

export interface CaptionDraft {
  caption: string;
  hashtags: string;
  image_idea: string;
  why_it_works: string;
}

const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  hi: "Hindi in Devanagari script",
  hinglish: "Hinglish (Hindi written in Roman letters, mixed with English)",
};

const EMOJI: Record<string, string> = { none: "no emojis", some: "a few emojis", lots: "plenty of emojis" };

const line = (label: string, value: unknown) =>
  value && (!Array.isArray(value) || value.length) ? `- ${label}: ${Array.isArray(value) ? value.join(", ") : value}` : null;

/** Builds the chat prompt for caption drafts. Pure function so it can be unit-tested. */
export function buildCaptionPrompt(ctx: CaptionContext, count: number, language?: string): ChatMessage[] {
  const b = ctx.brand;
  const lang = language || ctx.request.language || b?.default_language || "en";
  const brandLines = [
    line("Business", `${ctx.business.name} (${ctx.business.industry.replace("_", " ")})`),
    line("Tone", b?.tone),
    line("Emojis", b ? EMOJI[b.emoji_level] : null),
    line("Audience", [b?.audience, ...(b?.audience_tags ?? [])].filter(Boolean).join("; ")),
    line("Signature items", b?.signature_items),
    line("Current offers", b?.current_offers),
    line("Address", b?.address),
    line("Timings", b?.timings),
    line("WhatsApp / phone for bookings", b?.whatsapp || b?.contact_phone),
    line("Never mention or show", [...(b?.avoid_list ?? []), b?.avoid_custom].filter(Boolean)),
  ].filter(Boolean);

  const menu = ctx.offerings
    .slice(0, 25)
    .map((o) => `- ${o.name}${o.price != null ? ` — ₹${o.price}` : ""}${o.is_signature ? " (signature)" : ""}${o.description ? ` — ${o.description}` : ""}`);

  const examples = [...ctx.examples]
    .sort((a, z) => Number(z.is_gold_standard) - Number(a.is_gold_standard))
    .filter((e) => e.caption?.trim())
    .slice(0, 5)
    .map((e, i) => `Example ${i + 1}${e.is_gold_standard ? " (best)" : ""}:\n${e.caption!.trim()}${e.notes ? `\n(Why it worked: ${e.notes})` : ""}`);

  const answers = Object.entries(ctx.request.structured_answers ?? {})
    .filter(([, v]) => v)
    .map(([k, v]) => `- ${k.replace(/_/g, " ")}: ${v}`);

  const system = [
    "You write Instagram and WhatsApp captions for small Indian businesses (salons, restaurants, cafes, cloud kitchens).",
    "Write like the owner talking to local customers: warm, specific, short. No generic marketing filler, no made-up prices, discounts or claims.",
    "Only use facts given below. If a detail is missing (price, date, address), leave it out rather than inventing it.",
    `Write every caption in ${LANGUAGE_NAMES[lang] ?? lang}.`,
    "Captions: 2–5 short lines, a clear call to action at the end (visit, call, WhatsApp or DM).",
    "Hashtags: 8–12, mixing local/city tags (only if the city is known), industry tags and the occasion. Space-separated, each starting with #.",
    `Return JSON only, shaped exactly like {"options":[{"caption":"","hashtags":"","image_idea":"","why_it_works":""}]} with ${count} clearly different options.`,
    "image_idea: one sentence describing the photo or design that should go with the caption.",
    "why_it_works: one short sentence for the team (English).",
  ].join("\n");

  const user = [
    "BRAND",
    ...brandLines,
    menu.length ? `\nMENU / SERVICES\n${menu.join("\n")}` : "",
    ctx.rules.length ? `\nRULES (must follow)\n${ctx.rules.map((r) => `- ${r.text}`).join("\n")}` : "",
    examples.length ? `\nPAST POSTS THIS BRAND LIKED\n${examples.join("\n\n")}` : "",
    "\nTHIS REQUEST",
    line("Type of post", ctx.request.content_type?.replace(/_/g, " ")),
    line("Summary", ctx.request.summary),
    ...answers,
    ctx.clientMessages.length ? `Client's own words:\n${ctx.clientMessages.map((m) => `> ${m}`).join("\n")}` : "",
    ctx.request.current_revision > 0 && ctx.lastFeedback
      ? `\nTHE CLIENT ASKED FOR CHANGES: ${[ctx.lastFeedback.feedback_chip, ctx.lastFeedback.client_feedback].filter(Boolean).join(" — ")}`
      : "",
    `\nWrite ${count} options now.`,
  ]
    .filter(Boolean)
    .join("\n");

  return [
    { role: "system", content: system },
    { role: "user", content: user },
  ];
}

/** Parses the model's answer; tolerates code fences and extra text around the JSON. */
export function parseCaptionDrafts(text: string, count: number): CaptionDraft[] {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("AI answer had no JSON");
  const data = JSON.parse(text.slice(start, end + 1)) as { options?: Partial<CaptionDraft>[] };
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const options = (data.options ?? [])
    .map((o) => ({
      caption: str(o.caption),
      hashtags: str(o.hashtags)
        .split(/[\s,]+/)
        .filter(Boolean)
        .map((h) => (h.startsWith("#") ? h : `#${h}`))
        .join(" "),
      image_idea: str(o.image_idea),
      why_it_works: str(o.why_it_works),
    }))
    .filter((o) => o.caption);
  if (!options.length) throw new Error("AI answer had no captions");
  return options.slice(0, count);
}

/** Prompt for an image that matches the brand. */
export function buildImagePrompt(idea: string, ctx: Pick<CaptionContext, "business" | "brand">) {
  const b = ctx.brand;
  return [
    `Instagram post image (4:5) for ${ctx.business.name}, a ${ctx.business.industry.replace("_", " ")} in India.`,
    idea,
    b?.colors ? `Brand colours: ${b.colors.primary}, ${b.colors.secondary}, ${b.colors.accent}.` : "",
    b?.font_style ? `Overall style: ${b.font_style}.` : "",
    "Photorealistic, appetising/flattering, natural light, uncluttered. No text, letters, logos or watermarks in the image.",
    b?.avoid_list?.length || b?.avoid_custom ? `Avoid: ${[...(b.avoid_list ?? []), b.avoid_custom].filter(Boolean).join(", ")}.` : "",
  ]
    .filter(Boolean)
    .join(" ");
}
