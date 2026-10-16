import { describe, expect, it } from "vitest";
import { buildCaptionPrompt, buildImagePrompt, parseCaptionDrafts, type CaptionContext } from "./content";

const ctx: CaptionContext = {
  business: { name: "Glow Beauty Salon", industry: "salon" },
  brand: {
    business_id: "b1",
    owner_name: "Sunita",
    address: "MG Road, Indore",
    maps_link: null,
    timings: "10am–8pm",
    contact_phone: "919000000001",
    whatsapp: "919000000001",
    logo_path: null,
    colors: { primary: "#E8590C", secondary: "#FFF4E6", accent: "#2B8A3E" },
    font_style: "elegant",
    example_paths: [],
    tone: "friendly",
    content_languages: ["hi", "en"],
    default_language: "hi",
    emoji_level: "some",
    audience: "working women",
    audience_tags: ["brides"],
    avoid_list: ["before/after photos"],
    avoid_custom: null,
    signature_items: "Bridal makeup",
    current_offers: null,
    updated_at: "",
  },
  offerings: [{ name: "Bridal makeup", price: 15000, description: null, is_signature: true }],
  rules: [{ text: "Never show client faces without consent" }],
  examples: [
    { caption: "Old caption", notes: null, is_gold_standard: false, content_type: "single_post" },
    { caption: "Gold caption", notes: "short and warm", is_gold_standard: true, content_type: "single_post" },
  ],
  request: { summary: "Bridal makeup post", structured_answers: { occasion: "wedding season" }, content_type: "single_post", language: null, current_revision: 1 },
  clientMessages: ["दुल्हन मेकअप की पोस्ट चाहिए"],
  lastFeedback: { client_feedback: "make it shorter", feedback_chip: null },
};

describe("buildCaptionPrompt", () => {
  const [system, user] = buildCaptionPrompt(ctx, 3);

  it("asks for the brand's default language and the right number of options", () => {
    expect(system.content).toContain("Hindi in Devanagari");
    expect(system.content).toContain("3 clearly different options");
  });

  it("includes brand facts, menu, rules, client words and change requests", () => {
    for (const s of ["Glow Beauty Salon", "₹15000", "Never show client faces", "दुल्हन मेकअप", "make it shorter", "before/after photos", "wedding season"]) {
      expect(user.content).toContain(s);
    }
  });

  it("puts gold-standard examples first", () => {
    expect(user.content.indexOf("Gold caption")).toBeLessThan(user.content.indexOf("Old caption"));
  });

  it("respects an explicit language", () => {
    expect(buildCaptionPrompt(ctx, 1, "hinglish")[0].content).toContain("Hinglish");
  });
});

describe("parseCaptionDrafts", () => {
  it("reads JSON wrapped in code fences and normalises hashtags", () => {
    const text = '```json\n{"options":[{"caption":"Hello","hashtags":"bridal, #indore makeup","image_idea":"bride","why_it_works":"x"},{"caption":""}]}\n```';
    expect(parseCaptionDrafts(text, 3)).toEqual([{ caption: "Hello", hashtags: "#bridal #indore #makeup", image_idea: "bride", why_it_works: "x" }]);
  });

  it("caps the number of options", () => {
    const text = JSON.stringify({ options: [1, 2, 3, 4].map((i) => ({ caption: `c${i}` })) });
    expect(parseCaptionDrafts(text, 2)).toHaveLength(2);
  });

  it("throws when there is nothing usable", () => {
    expect(() => parseCaptionDrafts("sorry, I can't", 3)).toThrow();
    expect(() => parseCaptionDrafts('{"options":[]}', 3)).toThrow();
  });
});

describe("buildImagePrompt", () => {
  it("adds brand colours, avoid list and a no-text instruction", () => {
    const p = buildImagePrompt("A bride getting ready", ctx);
    expect(p).toContain("#E8590C");
    expect(p).toContain("before/after photos");
    expect(p).toContain("No text");
  });
});
