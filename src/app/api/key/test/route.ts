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

    // 1. First, try Google AI Studio (generativelanguage.googleapis.com)
    try {
      const aiDev = new GoogleGenAI({ apiKey: key });
      // Validate key via models.list (native AI Studio method) or gemini-2.0-flash / gemini-1.5-flash
      try {
        await aiDev.models.list({ config: { pageSize: 1 } });
      } catch (listErr) {
        try {
          await aiDev.models.generateContent({
            model: "gemini-2.0-flash",
            contents: [{ role: "user", parts: [{ text: "ping" }] }],
          });
        } catch {
          await aiDev.models.generateContent({
            model: "gemini-1.5-flash",
            contents: [{ role: "user", parts: [{ text: "ping" }] }],
          });
        }
      }
      return NextResponse.json({
        ok: true,
        mode: "gemini",
        message: "Connected to Gemini Developer API (Google AI Studio)",
      });
    } catch (err) {
      devError = err instanceof Error ? err.message : String(err);
    }

    // 2. If Developer API is blocked, try Google Cloud Vertex AI (aiplatform.googleapis.com)
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
        message: "Connected to Google Cloud Vertex AI",
      });
    } catch (err) {
      vertexError = err instanceof Error ? err.message : String(err);
    }

    const finalErr = devError || vertexError || "Validation failed";
    return NextResponse.json({ error: finalErr }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: message(err) }, { status: 400 });
  }
}
