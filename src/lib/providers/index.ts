import { GeminiProvider } from "./gemini";
import { MockProvider } from "./mock";
import type { MediaProvider } from "./types";

let cached: MediaProvider | null = null;

/** MEDIA_PROVIDER=gemini|mock overrides. Otherwise Gemini when credentials exist or apiKey provided, else mock. */
export function getProvider(apiKey?: string, apiMode?: string): MediaProvider {
  if (apiKey?.trim()) {
    return new GeminiProvider(apiKey.trim(), apiMode);
  }
  if (cached) return cached;
  const forced = process.env.MEDIA_PROVIDER;
  const hasCreds = Boolean(process.env.GEMINI_API_KEY) || process.env.GOOGLE_GENAI_USE_VERTEXAI === "true";
  const useGemini = forced === "gemini" || (forced !== "mock" && hasCreds);
  cached = useGemini ? new GeminiProvider() : new MockProvider();
  return cached;
}
