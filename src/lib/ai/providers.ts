import "server-only";

/**
 * Text and image generation over OpenAI-compatible HTTP APIs.
 *
 * Text:  River (DeepSeek) first, OpenRouter as fallback.
 * Image: OpenRouter.
 *
 * Every address, key and model name comes from environment variables, so a provider
 * or model can be swapped in Vercel without a code change.
 */

export interface TextProvider {
  name: string;
  baseUrl: string;
  apiKey: string;
  model: string;
}

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export class AiNotConfiguredError extends Error {
  constructor(what: string) {
    super(`${what} is not set up. Add the API key in Vercel → Settings → Environment Variables.`);
  }
}

const trimSlash = (s: string) => s.replace(/\/+$/, "");

export function textProviders(): TextProvider[] {
  const list: TextProvider[] = [];
  if (process.env.RIVER_API_KEY) {
    list.push({
      name: "river",
      baseUrl: trimSlash(process.env.RIVER_BASE_URL || "https://api.river.ai/v1"),
      apiKey: process.env.RIVER_API_KEY,
      model: process.env.RIVER_MODEL || "deepseek-ai/DeepSeek-V4.1-Flash",
    });
  }
  if (process.env.OPENROUTER_API_KEY) {
    list.push({
      name: "openrouter",
      baseUrl: trimSlash(process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1"),
      apiKey: process.env.OPENROUTER_API_KEY,
      model: process.env.OPENROUTER_TEXT_MODEL || "deepseek/deepseek-chat",
    });
  }
  return list;
}

export function imageProvider(): TextProvider | null {
  if (!process.env.OPENROUTER_API_KEY) return null;
  return {
    name: "openrouter",
    baseUrl: trimSlash(process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1"),
    apiKey: process.env.OPENROUTER_API_KEY,
    model: process.env.OPENROUTER_IMAGE_MODEL || "google/gemini-2.5-flash-image",
  };
}

export const isTextAiEnabled = () => textProviders().length > 0;
export const isImageAiEnabled = () => imageProvider() !== null;

function headers(p: TextProvider) {
  return {
    Authorization: `Bearer ${p.apiKey}`,
    "Content-Type": "application/json",
    // OpenRouter uses these to show the app in its dashboard; others ignore them
    "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "https://socialgrid.app",
    "X-Title": "SocialGrid",
  };
}

async function post(p: TextProvider, body: unknown, timeoutMs: number) {
  const res = await fetch(`${p.baseUrl}/chat/completions`, {
    method: "POST",
    headers: headers(p),
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${p.name} ${res.status}: ${text.slice(0, 300)}`);
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`${p.name}: response was not JSON`);
  }
}

export interface TextResult {
  text: string;
  provider: string;
  model: string;
  usage?: { prompt_tokens?: number; completion_tokens?: number };
}

/** Tries each text provider in order; the first one that answers wins. */
export async function generateText(
  messages: ChatMessage[],
  { maxTokens = 1500, temperature = 0.8, json = false } = {},
): Promise<TextResult> {
  const providers = textProviders();
  if (!providers.length) throw new AiNotConfiguredError("Text AI");
  const failures: string[] = [];
  for (const p of providers) {
    try {
      const data = await post(
        p,
        {
          model: p.model,
          messages,
          max_tokens: maxTokens,
          temperature,
          ...(json ? { response_format: { type: "json_object" } } : {}),
        },
        60_000,
      );
      const text: string | undefined = data?.choices?.[0]?.message?.content;
      if (!text?.trim()) throw new Error(`${p.name}: empty answer`);
      return { text, provider: p.name, model: data.model ?? p.model, usage: data.usage };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("text provider failed", { provider: p.name, model: p.model, error: msg });
      failures.push(msg);
    }
  }
  throw new Error(`All text providers failed — ${failures.join(" | ")}`);
}

export interface ImageResult {
  bytes: Uint8Array;
  mimeType: string;
  provider: string;
  model: string;
}

/** Generates one image through OpenRouter's chat endpoint (`modalities: ["image", "text"]`). */
export async function generateImage(prompt: string, aspectRatio = "4:5"): Promise<ImageResult> {
  const p = imageProvider();
  if (!p) throw new AiNotConfiguredError("Image AI");
  const data = await post(
    p,
    {
      model: p.model,
      messages: [{ role: "user", content: prompt }],
      modalities: ["image", "text"],
      image_config: { aspect_ratio: aspectRatio },
    },
    120_000,
  );
  const url: string | undefined = data?.choices?.[0]?.message?.images?.[0]?.image_url?.url;
  if (!url) throw new Error(`${p.name}: no image in the answer (model ${p.model})`);
  return { ...(await decodeImage(url)), provider: p.name, model: data.model ?? p.model };
}

async function decodeImage(url: string) {
  const m = /^data:([^;,]+);base64,([\s\S]*)$/.exec(url);
  if (m) return { mimeType: m[1], bytes: Uint8Array.from(Buffer.from(m[2], "base64")) };
  // some models return a hosted link instead of inline data
  const res = await fetch(url, { signal: AbortSignal.timeout(60_000) });
  if (!res.ok) throw new Error(`image download failed (${res.status})`);
  return { mimeType: res.headers.get("content-type") ?? "image/png", bytes: new Uint8Array(await res.arrayBuffer()) };
}
