import { PlatformNav } from "@/components/PlatformNav";
import Link from "next/link";
import { getPlan, prisma } from "@palwise/db";
import { requireUser } from "@/lib/auth";
import { PageHeader, formatWaktu } from "@/components/ui";
import { KnowledgeAdd } from "@/components/KnowledgeAdd";
import { KnowledgeList } from "@/components/KnowledgeList";
import { AgentTabs } from "@/components/AgentTabs";
import { callWorker } from "@/lib/worker";

export const dynamic = "force-dynamic";

/** Kalimat "cara Palwise membaca Sheet ini" dari simpanan worker. */
function bacaanSheet(json: string | null): string | null {
  if (!json) return null;
  try {
    const b = JSON.parse(json)?.bacaan;
    return typeof b === "string" && b ? b : null;
  } catch {
    return null;
  }
}

export default async function KnowledgePage({
  searchParams,
}: {
  searchParams: Promise<{ a?: string; tambah?: string }>;
}) {
  const user = await requireUser();
  const { a, tambah } = await searchParams;

  const [workspace, agents, infoSheet] = await Promise.all([
    prisma.workspace.findUniqueOrThrow({ where: { id: user.workspaceId } }),
    prisma.agent.findMany({
      where: { workspaceId: user.workspaceId },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true },
    }),
    // Worker mati tidak boleh menjatuhkan halaman ini. Tanpa jawabannya, tab
    // Sheet tetap jalan untuk Sheet berlink, cuma tidak menawarkan email robot.
    callWorker<{ robot: string | null }>("/sheets/info", {
      timeoutMs: 4000,
    }).catch(() => ({ robot: null })),
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
        description="Satu tempat untuk informasi yang menjadi acuan jawaban asistenmu."
        action={
          <Link href="/app/galeri" className="btn-ghost">
            Buka galeri produk
          </Link>
        }
      />

      <PlatformNav active="/app/knowledge" agentId={active.id} />

      <AgentTabs
        agents={agents}
        activeId={active.id}
        basePath="/app/knowledge"
        note="Pilih asisten untuk mengelola sumber informasinya."
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
                  Paket {plan.name} muat {plan.maxKnowledgeSources} catatan
                  untuk seluruh akunmu, dan semuanya sudah terpakai. Hapus yang
                  tidak dipakai lagi, atau naikkan paket.
                </>
              ) : (
                <>
                  <span className="font-medium">Sisa {sisa} catatan lagi.</span>{" "}
                  Paket {plan.name} muat {plan.maxKnowledgeSources} catatan
                  untuk seluruh akunmu.
                </>
              )}
            </p>
            <Link
              href="/app/tagihan"
              className="btn-ink shrink-0 px-4 py-1.5 text-xs"
            >
              Naikkan paket
            </Link>
          </div>
        </div>
      )}

      <div className="pw-knowledge">
        <div className="pw-knowledge-intro">
          <div>
            <h2>Info bisnismu. Acuan jawaban asisten.</h2>
            <p>
              Tambahkan layanan, harga, dan aturan bisnismu. Periksa jawabannya
              sebelum dipakai melayani pelanggan.
            </p>
          </div>
          <Link
            href={`/app/coba?a=${active.id}`}
            className="pw-button pw-button-outline"
          >
            Uji jawaban asisten <span aria-hidden>↗</span>
          </Link>
        </div>
        <div className="pw-knowledge-grid">
          <div className="pw-knowledge-library">
            <div className="pw-knowledge-stats">
              <div>
                <strong>{sources.length}</strong>
                <span>Sumber informasi</span>
              </div>
              <div>
                <strong>{ready}</strong>
                <span>Siap digunakan</span>
              </div>
              <div>
                <strong>{sources.length - ready}</strong>
                <span>Belum siap</span>
              </div>
            </div>
            <div className="pw-knowledge-heading">
              <h2>Pustaka bisnis</h2>
              <span>
                {totalHuruf.toLocaleString("id-ID")} karakter tersimpan
              </span>
              <a href="#tambah-info" className="pw-knowledge-mobile-add">
                + Tambah info
              </a>
            </div>
            <KnowledgeList
              key={active.id}
              sources={sources.map((s) => ({
                id: s.id,
                type: s.type,
                title: s.title,
                content: s.content,
                status: s.status,
                error: s.error,
                chunkCount: s.chunkCount,
                addedLabel: formatWaktu(s.createdAt),
                sheetUrl: s.sheetUrl,
                sheetDisinkronLabel: s.sheetDisinkron
                  ? formatWaktu(s.sheetDisinkron)
                  : null,
                sheetGagal: s.sheetGagal,
                sheetCatatan: s.sheetCatatan,
                sheetBacaan: bacaanSheet(s.sheetStruktur),
              }))}
            />
            <p className="pw-knowledge-quota">
              Penyimpanan seluruh akun: {terpakaiAkun.toLocaleString("id-ID")} /{" "}
              {plan.maxKnowledgeSources.toLocaleString("id-ID")} catatan
              {agents.length > 1 &&
                ` · dipakai bersama ${agents.length} asisten`}
              .{" "}
              <Link
                href="/app/tagihan"
                className="underline underline-offset-4"
              >
                Kelola paket
              </Link>
            </p>
          </div>

          <div id="tambah-info" className="pw-knowledge-add">
            <KnowledgeAdd
              agentId={active.id}
              namaBisnis={workspace.name}
              robotSheet={infoSheet.robot}
              bukaSheet={tambah === "sheet"}
            />
          </div>
        </div>
      </div>
    </>
  );
}
