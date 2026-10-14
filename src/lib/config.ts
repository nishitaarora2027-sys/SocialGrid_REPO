function required(name: string, value: string | undefined) {
  if (!value) throw new Error(`Missing environment variable ${name}. See README → Environment variables.`);
  return value;
}

export const env = {
  supabaseUrl: () => required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL),
  supabaseKey: () =>
    required("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY),
  supabaseSecretKey: () => required("SUPABASE_SECRET_KEY", process.env.SUPABASE_SECRET_KEY),
};

/**
 * Clients log in with phone + password. Under the hood Supabase uses email/password
 * with a synthetic address built from the phone number. This domain is never shown
 * to anyone and never receives mail.
 */
export const CLIENT_EMAIL_DOMAIN =
  process.env.NEXT_PUBLIC_CLIENT_EMAIL_DOMAIN ?? "clients.socialgrid.app";

export const LIMITS = {
  imageMaxSide: 2048,
  imageQuality: 0.8,
  photosPerMessage: 10,
  voiceMaxSeconds: 120,
  videoMaxBytes: 50 * 1024 * 1024,
  optionsPerRequest: 3,
  carouselMaxSlides: 10,
  storyMaxItems: 5,
};

export const SUPPORT_WHATSAPP = process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP ?? "";

export const BUCKETS = {
  clientUploads: "client-uploads",
  voiceNotes: "voice-notes",
  deliverables: "deliverables",
  brandAssets: "brand-assets",
  examples: "examples",
} as const;
export type Bucket = (typeof BUCKETS)[keyof typeof BUCKETS];
