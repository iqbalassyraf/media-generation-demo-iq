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

    const isVertex = key.startsWith("AQ.") || process.env.GOOGLE_GENAI_USE_VERTEXAI === "true";
    const ai = isVertex
      ? new GoogleGenAI({
          vertexai: true,
          project: process.env.GOOGLE_CLOUD_PROJECT || "825574069297",
          location: process.env.GOOGLE_CLOUD_LOCATION || "us-central1",
          apiKey: key,
        })
      : new GoogleGenAI({ apiKey: key });

    // Validate key with a lightweight 1-token test prompt (works with both Vertex AI & AI Studio)
    await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: "ping" }] }],
    });

    return NextResponse.json({
      ok: true,
      message: isVertex
        ? "Connected to Vertex AI (Gemini 2.5 Flash / project 825574069297)"
        : "Connected to Gemini Developer API",
    });
  } catch (err) {
    return NextResponse.json({ error: message(err) }, { status: 400 });
  }
}
