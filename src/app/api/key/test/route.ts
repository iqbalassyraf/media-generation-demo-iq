import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { message } from "@/lib/validate";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { apiKey } = (await req.json()) as { apiKey?: string };
    const key = apiKey?.trim();
    if (!key) {
      return NextResponse.json({ error: "API key is required" }, { status: 400 });
    }

    let devError: string | null = null;
    let vertexError: string | null = null;

    // 1. First, try standard Gemini Developer API (Google AI Studio - generativelanguage.googleapis.com)
    try {
      const aiDev = new GoogleGenAI({ apiKey: key });
      await aiDev.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{ role: "user", parts: [{ text: "ping" }] }],
      });
      return NextResponse.json({
        ok: true,
        mode: "gemini",
        message: "Connected to Gemini Developer API (Google AI Studio / generativelanguage)",
      });
    } catch (err) {
      devError = err instanceof Error ? err.message : String(err);
    }

    // 2. If Developer API fails, try Vertex AI (aiplatform.googleapis.com)
    try {
      const aiVertex = new GoogleGenAI({
        vertexai: true,
        project: process.env.GOOGLE_CLOUD_PROJECT || "825574069297",
        location: process.env.GOOGLE_CLOUD_LOCATION || "us-central1",
        apiKey: key,
      });
      await aiVertex.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{ role: "user", parts: [{ text: "ping" }] }],
      });
      return NextResponse.json({
        ok: true,
        mode: "vertex",
        message: "Connected to Google Cloud Vertex AI (aiplatform)",
      });
    } catch (err) {
      vertexError = err instanceof Error ? err.message : String(err);
    }

    // If both failed, return the clearest error
    const finalErr = devError && !devError.includes("API_KEY_SERVICE_BLOCKED") ? devError : (vertexError || devError || "Validation failed");
    return NextResponse.json({ error: finalErr }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: message(err) }, { status: 400 });
  }
}
