import type { ContentGenerator, Transcriber } from "./types";

/** V1: no AI. Every request goes to the expert queue untouched. */
export const manualGenerator: ContentGenerator = {
  name: "manual",
  async generateDraft() {
    return [];
  },
};

/** V1: experts listen to voice notes themselves. */
export const nullTranscriber: Transcriber = {
  name: "none",
  async transcribe() {
    return null;
  },
};
