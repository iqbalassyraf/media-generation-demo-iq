import type { Brand } from "./types";

const HEX = /^#[0-9a-fA-F]{6}$/;
const MAX_LOGO_CHARS = 1_500_000; // ~1 MB binary

/** Validates and normalizes a brand payload. Throws with a user-facing message. */
export function parseBrandBody(body: Record<string, unknown>): Brand {
  const str = (k: string) => (typeof body[k] === "string" ? (body[k] as string).trim() : "");
  const name = str("name");
  if (!name) throw new Error("Brand name is required");

  const colors = Array.isArray(body.colors)
    ? (body.colors as unknown[]).map((c) => String(c).trim()).filter(Boolean)
    : [];
  for (const c of colors) if (!HEX.test(c)) throw new Error(`Invalid color: ${c}`);
  if (colors.length > 8) throw new Error("Use at most 8 colors");

  const logo = typeof body.logo === "string" && body.logo ? body.logo : null;
  if (logo && (!logo.startsWith("data:image/") || logo.length > MAX_LOGO_CHARS)) {
    throw new Error("Logo must be an image under 1 MB");
  }

  return {
    id: String(body.id),
    name,
    tagline: str("tagline"),
    colors,
    fonts: str("fonts"),
    tone: str("tone"),
    useWords: str("useWords"),
    avoidWords: str("avoidWords"),
    notes: str("notes"),
    logo,
    updatedAt: Date.now(),
  };
}

export function message(err: unknown): string {
  return err instanceof Error ? err.message : "Bad request";
}
