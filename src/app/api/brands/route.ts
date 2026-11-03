import { NextResponse } from "next/server";
import { listBrands, saveBrand } from "@/lib/db";
import { message, parseBrandBody } from "@/lib/validate";
import { ensureSeedBrand } from "@/lib/seed";

export const runtime = "nodejs";

export async function GET() {
  ensureSeedBrand();
  return NextResponse.json({ brands: listBrands() });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const brand = parseBrandBody({ ...body, id: crypto.randomUUID() });
    saveBrand(brand);
    return NextResponse.json({ brand }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: message(err) }, { status: 400 });
  }
}
