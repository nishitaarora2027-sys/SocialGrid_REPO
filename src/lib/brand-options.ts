// Fixed choices used by the brand profile wizard and the learning tags.
// Labels live in messages/*.json under "brandOptions".

export const TONES = ["friendly", "premium", "fun", "traditional"] as const;
export const FONT_STYLES = ["modern", "classic", "handwritten", "bold", "elegant", "traditional"] as const;
export const CONTENT_LANGUAGES = ["en", "hi", "hinglish"] as const;
export const EMOJI_LEVELS = ["none", "some", "lots"] as const;

export const AUDIENCE_TAGS = [
  "college_students",
  "families",
  "brides",
  "office_workers",
  "kids",
  "couples",
  "women",
  "men",
  "foodies",
  "health_conscious",
] as const;

export const AVOID_DEFAULTS = [
  "competitors",
  "prices",
  "faces_without_consent",
  "alcohol",
  "non_veg",
  "religious_symbols",
  "unapproved_discounts",
  "medical_claims",
  "political",
  "slang",
] as const;

/** Suggested learning tags; experts can type their own too */
export const TAG_SUGGESTIONS = {
  occasion: ["everyday", "festival", "offer", "new_item", "review", "wedding_season", "weekend", "launch"],
  style: ["photo_led", "text_led", "minimal", "bold", "festive", "premium", "playful", "before_after"],
  goal: ["footfall", "awareness", "engagement", "sales", "trust", "orders"],
} as const;

/** Photo editing checklist shown in the workspace (section 7.7 of the spec) */
export const PHOTO_CHECKLIST = {
  food: ["crop", "light", "warm", "background", "logo", "price_overlay"],
  salon: ["before_after", "even_light", "no_smoothing", "blur_faces", "logo"],
} as const;
