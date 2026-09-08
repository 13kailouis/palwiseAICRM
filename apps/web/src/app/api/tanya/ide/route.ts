import { NextResponse } from "next/server";
import { muatIdeTanya } from "@palwise/db";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await requireUser();
  const hasil = await muatIdeTanya(user.workspaceId);
  return NextResponse.json(hasil, { headers: { "Cache-Control": "no-store, private" } });
}
