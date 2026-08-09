import Link from "next/link";
import { prisma } from "@palwise/db";
import { requireUser } from "@/lib/auth";
import { EmptyState, PageHeader } from "@/components/ui";
import { AgentTabs } from "@/components/AgentTabs";
import { Playground } from "@/components/Playground";

export const dynamic = "force-dynamic";

export default async function CobaPage({
  searchParams,
}: {
  searchParams: Promise<{ a?: string }>;
}) {
  const user = await requireUser();
  const { a } = await searchParams;

  const agents = await prisma.agent.findMany({
    where: { workspaceId: user.workspaceId },
    orderBy: { createdAt: "asc" },
  });

  if (agents.length === 0) {
    return (
      <>
        <PageHeader title="Coba dulu" />
        <div className="p-4 sm:p-6">
          <EmptyState
            title="Belum ada asisten"
            body="Atur asistennya dulu, baru bisa dicoba di sini."
            href="/app/agent"
            cta="Atur asisten"
          />
        </div>
      </>
    );
  }

  const active = agents.find((x) => x.id === a) ?? agents[0];

  const knowledgeReady = await prisma.knowledgeSource.count({
    where: { agentId: active.id, status: "ready" },
  });

  return (
    <>
      <PageHeader
        title="Coba dulu"
        description="Tes di sini sebelum dilepas ke pelanggan asli. Yang kamu ketik di sini tidak dikirim ke WhatsApp siapa pun."
        action={
          <Link href={`/app/agent?a=${active.id}`} className="btn-ghost">
            Ubah cara bicaranya
          </Link>
        }
      />

      <AgentTabs agents={agents} activeId={active.id} basePath="/app/coba" />

      <div className="p-4 sm:p-6">
        {knowledgeReady === 0 && (
          <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Info bisnis buat asisten ini masih kosong, jadi dia belum tahu produk
            dan harganya.{" "}
            <Link
              href={`/app/knowledge?a=${active.id}`}
              className="font-medium underline"
            >
              Isi sekarang
            </Link>
            .
          </div>
        )}
        {/* key memaksa percakapan uji dimulai bersih saat pindah asisten */}
        <Playground key={active.id} agentId={active.id} agentName={active.name} />
      </div>
    </>
  );
}
