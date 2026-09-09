import { NextResponse } from "next/server";
import { ambilJatahTanya } from "@palwise/db";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export async function GET() {
  const user = await requireUser();
  return NextResponse.json(await ambilJatahTanya(user.workspaceId), { headers: { "Cache-Control": "private, no-store" } });
}
