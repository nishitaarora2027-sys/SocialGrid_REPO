// Row types for the tables in supabase/migrations. Keep in sync with the SQL.

export type Industry = "salon" | "restaurant" | "cafe" | "cloud_kitchen";
export const INDUSTRIES: Industry[] = ["salon", "restaurant", "cafe", "cloud_kitchen"];

export type ContentType =
  | "single_post"
  | "carousel"
  | "story"
  | "reel"
  | "festival_greeting"
  | "caption_only";
export const CONTENT_TYPES: ContentType[] = [
  "single_post",
  "carousel",
  "story",
  "reel",
  "festival_greeting",
  "caption_only",
];

export type AutonomyMode = "manual" | "ai_draft_review" | "auto";
export type RequestStatus =
  | "new"
  | "in_progress"
  | "delivered"
  | "revision_requested"
  | "completed"
  | "cancelled";
export const OPEN_STATUSES: RequestStatus[] = ["new", "in_progress", "revision_requested"];

export type SubscriptionStatus = "trial" | "active" | "past_due" | "paused" | "expired";
export const SUBSCRIPTION_STATUSES: SubscriptionStatus[] = [
  "trial",
  "active",
  "past_due",
  "paused",
  "expired",
];

export type PlanSlotStatus = "planned" | "waiting_photo" | "in_progress" | "done";
export type RuleScope = "client" | "industry" | "global";
export type EmojiLevel = "none" | "some" | "lots";
export type Locale = "en" | "hi";

export interface Profile {
  id: string;
  role_id: number;
  display_name: string;
  phone: string | null;
  preferred_ui_language: Locale;
}

export interface Business {
  id: string;
  owner_profile_id: string;
  name: string;
  industry: Industry;
  autonomy_mode: AutonomyMode;
  suggestions_enabled: boolean;
  photo_consent: boolean;
  created_at: string;
}

export interface BrandColors {
  primary: string;
  secondary: string;
  accent: string;
}

export interface BrandProfile {
  business_id: string;
  owner_name: string | null;
  address: string | null;
  maps_link: string | null;
  timings: string | null;
  contact_phone: string | null;
  whatsapp: string | null;
  logo_path: string | null;
  colors: BrandColors;
  font_style: string;
  example_paths: string[];
  tone: string;
  content_languages: string[];
  default_language: string;
  emoji_level: EmojiLevel;
  audience: string | null;
  audience_tags: string[];
  avoid_list: string[];
  avoid_custom: string | null;
  signature_items: string | null;
  current_offers: string | null;
  updated_at: string;
}

export interface Offering {
  id: string;
  business_id: string;
  name: string;
  price: number | null;
  description: string | null;
  photo_path: string | null;
  is_signature: boolean;
  sort: number;
}

export interface PlanSlotTemplate {
  type: ContentType;
  goal: string;
  /** 0 = Monday ... 6 = Sunday */
  day: number;
}

export interface PlanSlot {
  id: string;
  business_id: string;
  week_start: string;
  slot_index: number;
  day: number;
  type: ContentType;
  goal: string | null;
  status: PlanSlotStatus;
  request_id: string | null;
}

export interface Attachment {
  bucket: string;
  path: string;
  type: "image" | "audio" | "video";
  duration?: number;
  name?: string;
}

export type MessageSender = "client" | "expert" | "system";
export type MessageKind = "text" | "voice" | "images" | "options_card" | "suggestion" | "status";

export interface MessagePayload {
  /** System messages are stored as an i18n key + params so they render in either language */
  i18nKey?: string;
  params?: Record<string, string | number>;
  chips?: string[];
  optionIds?: string[];
  suggestionId?: string;
  revision?: number;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender: MessageSender;
  sender_profile_id: string | null;
  kind: MessageKind;
  body: string | null;
  attachments: Attachment[];
  payload: MessagePayload;
  request_id: string | null;
  created_at: string;
}

export interface RequestRow {
  id: string;
  business_id: string;
  source: "chat" | "quick_start" | "suggestion" | "plan_slot";
  quick_start_type: string | null;
  structured_answers: Record<string, string>;
  summary: string | null;
  content_type: ContentType | null;
  language: string | null;
  is_urgent: boolean;
  status: RequestStatus;
  due_at: string;
  current_revision: number;
  plan_slot_id: string | null;
  suggestion_id: string | null;
  created_at: string;
  updated_at: string;
  delivered_at: string | null;
  completed_at: string | null;
}

export interface Revision {
  id: string;
  request_id: string;
  number: number;
  client_feedback: string | null;
  feedback_chip: string | null;
  expert_change_note: string | null;
  due_at: string | null;
  created_at: string;
}

export interface MediaItem {
  path: string;
  type: "image" | "video";
  name?: string;
  /** Only set when not in the deliverables bucket (e.g. manual examples) */
  bucket?: string;
}

export interface ReelFields {
  script?: string;
  shot_list?: string;
  on_screen_text?: string;
  audio_mood?: string;
}

export interface OptionTags {
  occasion?: string[];
  style?: string[];
  goal?: string[];
}

export interface ContentOption {
  id: string;
  request_id: string;
  revision_id: string | null;
  revision_number: number;
  position: number;
  content_type: ContentType;
  media: MediaItem[];
  caption: string | null;
  hashtags: string | null;
  language: string;
  reel_fields: ReelFields;
  tags: OptionTags;
  why_it_works: string | null;
  expert_notes: string | null;
  chosen: boolean;
  is_gold_standard: boolean;
  brand_snapshot: Record<string, unknown> | null;
  created_at: string;
  delivered_at: string | null;
}

export interface Rule {
  id: string;
  scope: RuleScope;
  business_id: string | null;
  industry: Industry | null;
  text: string;
  active: boolean;
  created_at: string;
}

export interface Example {
  id: string;
  source: "delivered" | "manual";
  option_id: string | null;
  request_id: string | null;
  industry: Industry | null;
  business_id: string | null;
  content_type: ContentType | null;
  media: MediaItem[];
  caption: string | null;
  notes: string | null;
  tags: OptionTags;
  is_gold_standard: boolean;
  created_at: string;
}

export interface Festival {
  id: string;
  name: string;
  name_hi: string;
  date: string;
  industries: Industry[];
  default_lead_days: number;
  active: boolean;
}

export interface SuggestionPayload {
  title_en: string;
  title_hi: string;
  text_en?: string;
  text_hi?: string;
  festival_id?: string;
  content_type?: ContentType;
}

export interface Suggestion {
  id: string;
  business_id: string;
  kind: "festival" | "inactivity" | "plan_reminder" | "custom";
  payload: SuggestionPayload;
  dedupe_key: string | null;
  show_at: string;
  status: "pending" | "accepted" | "dismissed";
  message_id: string | null;
}

export interface PlanLimits {
  requests_per_month?: number | null;
  content_types?: ContentType[] | null;
}

export interface Plan {
  id: string;
  name: string;
  price_inr: number;
  limits: PlanLimits;
  active: boolean;
}

export interface Subscription {
  id: string;
  business_id: string;
  plan_id: string | null;
  status: SubscriptionStatus;
  current_period_end: string | null;
  provider: string;
  provider_ref: string | null;
}

export interface Settings {
  standard_hours: number;
  urgent_hours: number;
  revision_hours: number;
  work_start: string;
  work_end: string;
  work_days: number[];
  timezone: string;
  suggestion_lead_days: number;
  inactivity_days: number;
}

export interface QuickStartQuestion {
  id: string;
  type: "choice" | "text" | "photo";
  q_en: string;
  q_hi: string;
  options?: { en: string; hi: string }[];
  allow_text?: boolean;
}

export interface QuickStartCard {
  id: string;
  industry: Industry;
  key: string;
  label_en: string;
  label_hi: string;
  icon: string;
  content_type: ContentType;
  questions: QuickStartQuestion[];
  sort: number;
  active: boolean;
}
