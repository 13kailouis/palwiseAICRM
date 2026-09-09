import { NextRequest, NextResponse } from "next/server";
import { muatPusatBisnis } from "@palwise/db";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export async function GET(req: NextRequest) {
  const user = await requireUser();
  const hari = req.nextUrl.searchParams.get("hari") === "30" ? 30 : 7;
  try {
    return NextResponse.json(await muatPusatBisnis(user.workspaceId, hari), { headers: { "Cache-Control": "no-store, private" } });
  } catch {
    return NextResponse.json({ error: "Ringkasan belum bisa dimuat." }, { status: 503 });
  }
}
