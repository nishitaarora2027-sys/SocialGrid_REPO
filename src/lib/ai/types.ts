import type { BrandProfile, ContentOption, Example, RequestRow, Rule } from "@/lib/types";

/** A draft option an AI (or anything else) proposes; experts review before delivery. */
export type DraftOption = Pick<
  ContentOption,
  "content_type" | "media" | "caption" | "hashtags" | "language" | "reel_fields" | "tags"
>;

export interface GenerationContext {
  request: RequestRow;
  brandProfile: BrandProfile | null;
  rules: Rule[];
  examples: Example[];
}

export interface ContentGenerator {
  readonly name: string;
  /** Returns draft options, or an empty list to leave the request to the expert team. */
  generateDraft(ctx: GenerationContext): Promise<DraftOption[]>;
}

export interface Transcriber {
  readonly name: string;
  /** Returns the transcript, or null when transcription isn't available. */
  transcribe(audio: Blob | ArrayBuffer, languageHint?: "en" | "hi"): Promise<string | null>;
}
