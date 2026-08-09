import { requireUser } from "@/lib/auth";
import { Inbox } from "@/components/Inbox";

export const dynamic = "force-dynamic";

export default async function InboxPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string }>;
}) {
  await requireUser();
  const { c } = await searchParams;

  return (
    <div className="h-full">
      <Inbox initialId={c ?? null} />
    </div>
  );
}
