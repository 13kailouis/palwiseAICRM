import Link from "next/link";
import { getPlan, prisma } from "@palwise/db";
import { requireUser } from "@/lib/auth";
import { PageHeader, formatWaktu } from "@/components/ui";
import { KnowledgeAdd } from "@/components/KnowledgeAdd";
import { KnowledgeList } from "@/components/KnowledgeList";
import { AgentTabs } from "@/components/AgentTabs";

export const dynamic = "force-dynamic";

export default async function KnowledgePage({
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
      select: { id: true, name: true },
    }),
  ]);

  if (agents.length === 0) {
    return (
      <>
        <PageHeader title="Info bisnis" />
        <div className="p-4 sm:p-6">
          <p className="text-sm text-ink-500">Belum ada asisten di akun ini.</p>
        </div>
      </>
    );
  }

  const active = agents.find((x) => x.id === a) ?? agents[0];

  // Dua hitungan yang berbeda, dan bedanya penting.
  //
  // Daftar di layar ini isinya catatan milik SATU asisten, tapi batas paketnya
  // dihitung untuk SELURUH akun. Dulu cuma angka per asisten yang ditampilkan,
  // jadi pemilik akun Growth dengan lima asisten melihat "40 catatan" di tiap
  // tab dan mengira masih jauh dari batas, padahal seluruh akunnya sudah 200
  // dan penambahan berikutnya pasti ditolak.
  const [sources, terpakaiAkun] = await Promise.all([
    prisma.knowledgeSource.findMany({
      where: { agentId: active.id },
      orderBy: { createdAt: "desc" },
    }),
    prisma.knowledgeSource.count({
      where: { agent: { workspaceId: user.workspaceId } },
    }),
  ]);

  const plan = getPlan(workspace.plan);
  const sisa = plan.maxKnowledgeSources - terpakaiAkun;
  const ready = sources.filter((s) => s.status === "ready").length;
  const totalHuruf = sources.reduce((sum, s) => sum + s.content.length, 0);

  return (
    <>
      <PageHeader
        title="Info bisnis"
        description="Semua yang asistenmu tahu soal usahamu. Dia cuma boleh menjawab dari sini, jadi tidak asal ngarang."
        action={
          <Link href="/app/galeri" className="btn-ghost">
            Punya foto produk?
          </Link>
        }
      />

      <AgentTabs
        agents={agents}
        activeId={active.id}
        basePath="/app/knowledge"
        note="Tiap asisten punya catatannya sendiri. Kalau punya beberapa asisten, isi info yang relevan buat masing-masing."
      />

      {/* Peringatan batas, sebelum orang mengetik apa pun.

          Penolakannya sendiri sudah ada di server, tapi dia baru muncul setelah
          catatannya selesai diketik dan tombol simpan ditekan. Yang hilang di
          situ bukan cuma fiturnya, tapi pekerjaan yang sudah dikerjakan. */}
      {sisa <= 3 && (
        <div className="px-4 pt-4 sm:px-6">
          <div
            className={`flex flex-wrap items-center gap-3 rounded-xl border px-4 py-3 ${
              sisa <= 0
                ? "border-red-200 bg-red-50"
                : "border-amber-200 bg-amber-50"
            }`}
          >
            <p className="flex-1 text-sm leading-relaxed text-ink-800">
              {sisa <= 0 ? (
                <>
                  <span className="font-medium">Catatannya sudah penuh.</span>{" "}
                  Paket {plan.name} muat {plan.maxKnowledgeSources} catatan untuk
                  seluruh akunmu, dan semuanya sudah terpakai. Hapus yang tidak
                  dipakai lagi, atau naikkan paket.
                </>
              ) : (
                <>
                  <span className="font-medium">Sisa {sisa} catatan lagi.</span>{" "}
                  Paket {plan.name} muat {plan.maxKnowledgeSources} catatan untuk
                  seluruh akunmu.
                </>
              )}
            </p>
            <Link href="/app/tagihan" className="btn-ink shrink-0 px-4 py-1.5 text-xs">
              Naikkan paket
            </Link>
          </div>
        </div>
      )}

      <div className="grid gap-6 p-4 sm:p-6 lg:grid-cols-[minmax(0,1fr)_400px]">
        <div className="space-y-4">
          <h2 className="font-semibold text-ink-900">
            {sources.length} catatan
            {sources.length > 0 && (
              <span className="font-normal text-ink-400">
                {" "}
                · {ready} sudah dihafal · {totalHuruf.toLocaleString("id-ID")} huruf
              </span>
            )}
          </h2>
          {/* Angka yang menentukan ditulis terpisah, karena satuannya beda:
              yang di atas milik asisten ini, yang di bawah milik seluruh akun
              dan itulah yang dibandingkan dengan batas paket. */}
          <p className="-mt-2 text-xs text-ink-500">
            Seluruh akun: {terpakaiAkun.toLocaleString("id-ID")} dari{" "}
            {plan.maxKnowledgeSources.toLocaleString("id-ID")} catatan
            {agents.length > 1 && ` (dipakai bersama ${agents.length} asisten)`}
          </p>

          <KnowledgeList
            sources={sources.map((s) => ({
              id: s.id,
              type: s.type,
              title: s.title,
              content: s.content,
              status: s.status,
              error: s.error,
              chunkCount: s.chunkCount,
              addedLabel: formatWaktu(s.createdAt),
            }))}
          />
        </div>

        <div className="lg:sticky lg:top-6 lg:self-start">
          <KnowledgeAdd agentId={active.id} namaBisnis={workspace.name} />
        </div>
      </div>
    </>
  );
}
