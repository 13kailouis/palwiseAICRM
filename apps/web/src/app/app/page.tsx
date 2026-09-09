import { muatPusatBisnis } from "@palwise/db";
import { requireUser } from "@/lib/auth";
import { RingkasanBisnis } from "@/components/RingkasanBisnis";

export const dynamic = "force-dynamic";
export default async function DashboardPage() {
  const user = await requireUser();
  return <RingkasanBisnis awal={await muatPusatBisnis(user.workspaceId)} />;
}
