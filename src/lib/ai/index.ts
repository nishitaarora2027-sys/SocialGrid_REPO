import "server-only";
import type { AutonomyMode } from "@/lib/types";
import { manualGenerator, nullTranscriber } from "./manual";
import type { ContentGenerator, GenerationContext, Transcriber } from "./types";

export type { ContentGenerator, DraftOption, GenerationContext, Transcriber } from "./types";

/**
 * Picks the generator for a business's autonomy mode.
 * V1 only ships `manual`; `ai_draft_review` and `auto` fall back to it until a real
 * generator is registered here.
 */
export function getContentGenerator(mode: AutonomyMode): ContentGenerator {
  switch (mode) {
    case "ai_draft_review":
    case "auto":
    case "manual":
    default:
      return manualGenerator;
  }
}

export function getTranscriber(): Transcriber {
  return nullTranscriber;
}

/** Autonomy modes that can be selected in the UI today */
export const ENABLED_AUTONOMY_MODES: AutonomyMode[] = ["manual"];

/**
 * Called after a request is created. With the manual generator this is a no-op and the
 * request simply waits in the expert queue. Later: save returned drafts as unsent options
 * (ai_draft_review) or deliver them directly (auto).
 */
export async function onRequestCreated(mode: AutonomyMode, ctx: GenerationContext) {
  const drafts = await getContentGenerator(mode).generateDraft(ctx);
  return drafts;
}
