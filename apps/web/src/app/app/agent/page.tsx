import Link from "next/link";
import { fiturPaket, getPlan, paketMinimalTiapFitur, prisma } from "@palwise/db";
import { requireUser } from "@/lib/auth";
import { AgentForm } from "@/components/AgentForm";
import { AgentPicker } from "@/components/AgentPicker";
import { EmptyState, PageHeader } from "@/components/ui";
import { TombolHapus } from "@/components/TombolHapus";
import { deleteAgentAction } from "@/app/actions/agent";

export const dynamic = "force-dynamic";

export default async function AgentPage({
  searchParams,
}: {
  searchParams: Promise<{ a?: string }>;
}) {
  const user = await requireUser();
  const { a } = await searchParams;

  const [workspace, agents] = await Promise.all([
    prisma.workspace.findUniqueOrThrow({ where: { id: user.workspaceId } }),
    prisma.agent.findMany({
      where: { workspaceId: user.workspaceId },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  if (agents.length === 0) {
    return (
      <>
        <PageHeader title="Asisten" />
        <div className="p-4 sm:p-6">
          <EmptyState
            title="Belum ada asisten"
            body="Biasanya asisten dibuat otomatis waktu kamu daftar. Coba hubungi kami kalau tidak muncul."
          />
        </div>
      </>
    );
  }

  const active = agents.find((x) => x.id === a) ?? agents[0];
  const plan = getPlan(workspace.plan);

  // Dihitung supaya peringatan hapus menyebut angka nyata, bukan ancaman
  // samar. Orang perlu tahu persis apa yang hilang sebelum menekan tombol.
  const [jumlahCatatan, jumlahBerkas, jumlahNomor] = await Promise.all([
    prisma.knowledgeSource.count({ where: { agentId: active.id } }),
    prisma.mediaAsset.count({ where: { agentId: active.id } }),
    prisma.channel.count({ where: { agentId: active.id } }),
  ]);

  return (
    <>
      <PageHeader
        sempit
        title="Asisten"
        description="Atur siapa dia, cara bicaranya, dan kapan dia harus memanggil kamu."
        action={
          <div className="flex gap-2">
            {agents.length > 1 && (
              <TombolHapus
                action={deleteAgentAction}
                fields={{ agentId: active.id }}
                label="Hapus asisten ini"
                konfirmasi={
                  `Hapus "${active.name}"? Yang ikut terhapus permanen: ` +
                  `${jumlahCatatan} catatan info bisnis dan ${jumlahBerkas} gambar miliknya. ` +
                  (jumlahNomor > 0
                    ? `${jumlahNomor} nomor WhatsApp yang dijaganya dipindahkan ke asisten lain, jadi chatnya tetap dibalas.`
                    : "Tidak ada nomor WhatsApp yang terpengaruh.")
                }
              />
            )}
            <Link href="/app/coba" className="btn-ghost">
              Coba dulu
            </Link>
          </div>
        }
      />

      <AgentPicker
        agents={agents.map((x) => ({
          id: x.id,
          name: x.name,
          isActive: x.isActive,
        }))}
        activeId={active.id}
        used={agents.length}
        max={plan.maxAgents}
        planName={plan.name}
      />

      {/* key memaksa form dimuat ulang saat pindah asisten,
          supaya isian lama tidak tertinggal di layar. */}
      <AgentForm
        key={active.id}
        agent={active}
        namaBisnis={workspace.name}
        fiturAktif={fiturPaket(workspace.plan)}
        paketFitur={paketMinimalTiapFitur()}
      />
    </>
  );
}
