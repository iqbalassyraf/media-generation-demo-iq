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

    const ai = new GoogleGenAI({ apiKey: key });
    // Verify credentials by listing models (lightweight, zero-cost operation)
    await ai.models.list({ config: { pageSize: 1 } });

    return NextResponse.json({ ok: true, message: "API key is valid" });
  } catch (err) {
    return NextResponse.json({ error: message(err) }, { status: 400 });
  }
}
