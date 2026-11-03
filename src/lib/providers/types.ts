import type { Aspect, Brand } from "../types";

export type BrandRef = Pick<Brand, "name" | "colors">;

export type InlineImage = { mimeType: string; data: Buffer };

export type ImageRequest = {
  prompt: string;
  aspectRatio: Aspect;
  referenceImages: InlineImage[];
  brand?: BrandRef;
};

export type VideoStartRequest = {
  prompt: string;
  aspectRatio: "16:9" | "9:16";
  durationSeconds: number;
  startingImage?: InlineImage;
  brand?: BrandRef;
};

export type VideoPoll =
  | { done: false }
  | { done: true; error?: string; data?: Buffer; mimeType?: string };

/** The only seam between the app and a media model. Gemini and Mock both implement it. */
export interface MediaProvider {
  readonly name: string;
  readonly mock: boolean;
  generateImage(req: ImageRequest): Promise<{ data: Buffer; mimeType: string }>;
  startVideo(req: VideoStartRequest): Promise<{ operationName: string }>;
  pollVideo(operationName: string): Promise<VideoPoll>;
}
