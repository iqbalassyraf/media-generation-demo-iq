import { GoogleGenAI } from "@google/genai";
import { tmpDir } from "../storage";
import fs from "node:fs";
import path from "node:path";
import type { ImageRequest, MediaProvider, VideoPoll, VideoStartRequest } from "./types";

/**
 * Gemini / Veo provider. Auth is chosen by env:
 *  - GOOGLE_GENAI_USE_VERTEXAI=true  → Vertex AI with Application Default Credentials
 *  - otherwise                        → Gemini Developer API with GEMINI_API_KEY
 */
function createClient(apiKeyOverride?: string, modeOverride?: string): GoogleGenAI {
  const key = apiKeyOverride?.trim() || process.env.GEMINI_API_KEY?.trim();
  if (key) {
    if (modeOverride === "gemini") {
      return new GoogleGenAI({ apiKey: key });
    }
    if (modeOverride === "vertex") {
      return new GoogleGenAI({
        vertexai: true,
        project: process.env.GOOGLE_CLOUD_PROJECT || "825574069297",
        location: process.env.GOOGLE_CLOUD_LOCATION || "us-central1",
        apiKey: key,
      });
    }
    // If not explicitly set, keys starting with AQ. default to Vertex AI
    if (key.startsWith("AQ.")) {
      return new GoogleGenAI({
        vertexai: true,
        project: process.env.GOOGLE_CLOUD_PROJECT || "825574069297",
        location: process.env.GOOGLE_CLOUD_LOCATION || "us-central1",
        apiKey: key,
      });
    }
    return new GoogleGenAI({ apiKey: key });
  }
  if (process.env.GOOGLE_GENAI_USE_VERTEXAI === "true") {
    return new GoogleGenAI({
      vertexai: true,
      project: process.env.GOOGLE_CLOUD_PROJECT,
      location: process.env.GOOGLE_CLOUD_LOCATION ?? "us-central1",
    });
  }
  throw new Error("GEMINI_API_KEY is not set (or enable GOOGLE_GENAI_USE_VERTEXAI for ADC)");
}

export class GeminiProvider implements MediaProvider {
  readonly name = "gemini";
  readonly mock = false;
  private ai: GoogleGenAI;
  private imageModel = process.env.IMAGE_MODEL ?? "gemini-2.5-flash-image";
  private videoModel: string;

  constructor(apiKeyOverride?: string, modeOverride?: string) {
    this.ai = createClient(apiKeyOverride, modeOverride);
    this.videoModel = process.env.VIDEO_MODEL ?? (modeOverride === "gemini" ? "veo-3.1-generate-preview" : "veo-3.0-generate-001");
  }

  async generateImage(req: ImageRequest) {
    const parts: Array<Record<string, unknown>> = req.referenceImages.map((r) => ({
      inlineData: { mimeType: r.mimeType, data: r.data.toString("base64") },
    }));
    parts.push({ text: req.prompt });

    const res = await this.ai.models.generateContent({
      model: this.imageModel,
      contents: [{ role: "user", parts }],
      config: {
        responseModalities: ["IMAGE"],
        imageConfig: { aspectRatio: req.aspectRatio },
      },
    } as Parameters<GoogleGenAI["models"]["generateContent"]>[0]);

    const part = res.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data);
    if (!part?.inlineData?.data) {
      const reason = res.candidates?.[0]?.finishReason ?? "no image part in response";
      throw new Error(`Image model returned no image (${reason})`);
    }
    return {
      data: Buffer.from(part.inlineData.data, "base64"),
      mimeType: part.inlineData.mimeType ?? "image/png",
    };
  }

  async startVideo(req: VideoStartRequest) {
    try {
      const op = await this.ai.models.generateVideos({
        model: this.videoModel,
        prompt: req.prompt,
        image: req.startingImage
          ? { imageBytes: req.startingImage.data.toString("base64"), mimeType: req.startingImage.mimeType }
          : undefined,
        config: {
          aspectRatio: req.aspectRatio,
          durationSeconds: req.durationSeconds,
          numberOfVideos: 1,
        },
      });
      if (!op.name) throw new Error("Video model did not return an operation name");
      return { operationName: op.name };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("404") || msg.includes("NOT_FOUND")) {
        throw new Error(
          `Veo video generation model (${this.videoModel}) was not found or your project has not been allowlisted for Vertex AI Veo preview. To generate real video, switch to an API key from Google AI Studio (aistudio.google.com/apikey) or request Vertex AI Veo access from Google Cloud.`
        );
      }
      throw err;
    }
  }

  async pollVideo(operationName: string): Promise<VideoPoll> {
    const op = await this.ai.operations.getVideosOperation({
      operation: { name: operationName } as Parameters<GoogleGenAI["operations"]["getVideosOperation"]>[0]["operation"],
    });
    if (!op.done) return { done: false };
    if (op.error) return { done: true, error: JSON.stringify(op.error) };

    const video = op.response?.generatedVideos?.[0]?.video;
    if (!video) {
      const filtered = op.response?.raiMediaFilteredReasons?.[0];
      return { done: true, error: filtered ? `Filtered: ${filtered}` : "Video model returned no video" };
    }

    let data: Buffer;
    if (video.videoBytes) {
      data = Buffer.from(video.videoBytes, "base64");
    } else if (video.uri) {
      const tmp = path.join(tmpDir(), `${Date.now()}-${Math.random().toString(36).slice(2)}.mp4`);
      await this.ai.files.download({ file: video, downloadPath: tmp });
      data = fs.readFileSync(tmp);
      fs.rmSync(tmp, { force: true });
    } else {
      return { done: true, error: "Video had neither bytes nor a URI" };
    }
    return { done: true, data, mimeType: video.mimeType ?? "video/mp4" };
  }
}
