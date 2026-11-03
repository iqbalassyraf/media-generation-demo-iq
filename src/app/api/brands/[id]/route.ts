import { NextResponse } from "next/server";
import { deleteBrand, getBrand, saveBrand } from "@/lib/db";
import { message, parseBrandBody } from "@/lib/validate";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const brand = getBrand((await params).id);
  return brand ? NextResponse.json({ brand }) : NextResponse.json({ error: "Not found" }, { status: 404 });
}

export async function PUT(req: Request, { params }: Ctx) {
  const id = (await params).id;
  if (!getBrand(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  try {
    const brand = parseBrandBody({ ...(await req.json()), id });
    saveBrand(brand);
    return NextResponse.json({ brand });
  } catch (err) {
    return NextResponse.json({ error: message(err) }, { status: 400 });
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  deleteBrand((await params).id);
  return NextResponse.json({ ok: true });
}
