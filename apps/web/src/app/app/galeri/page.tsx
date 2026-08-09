import Link from "next/link";
import { bolehPakai, paketMinimal, prisma } from "@palwise/db";
import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { AgentTabs } from "@/components/AgentTabs";
import { GaleriTambah } from "@/components/GaleriTambah";
import { GaleriDaftar } from "@/components/GaleriDaftar";
import { Rincian } from "@/components/Kosong";
import { MAKS_BERKAS } from "@/lib/batas";

export const dynamic = "force-dynamic";

export default async function GaleriPage({
  searchParams,
}: {
  searchParams: Promise<{ a?: string }>;
}) {
  const user = await requireUser();
  const { a } = await searchParams;

  const workspace = await prisma.workspace.findUniqueOrThrow({
    where: { id: user.workspaceId },
  });
  const bolehKirim = bolehPakai(workspace.plan, "kirimMedia");

  const agents = await prisma.agent.findMany({
    where: { workspaceId: user.workspaceId },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true },
  });

  if (agents.length === 0) {
    return (
      <>
        <PageHeader title="Gambar & berkas" />
        <div className="p-4 sm:p-6">
          <p className="text-sm text-ink-500">Belum ada asisten di akun ini.</p>
        </div>
      </>
    );
  }

  const active = agents.find((x) => x.id === a) ?? agents[0];

  const berkas = await prisma.mediaAsset.findMany({
    where: { agentId: active.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <>
      <PageHeader
        title="Gambar & berkas"
        description="Foto barang atau hasil kerja, menu, daftar harga, atau QRIS yang dikirim asistenmu ke pelanggan."
        action={
          <Link href="/app/knowledge" className="btn-ghost">
            Info tertulis ada di sini
          </Link>
        }
      />

      <AgentTabs
        agents={agents}
        activeId={active.id}
        basePath="/app/galeri"
        note="Tiap asisten punya kumpulan gambarnya sendiri."
      />

      {/* Batasnya diumumkan sebelum orang mengunggah, bukan sesudah.

          Penolakannya sudah ada di server, tapi dia baru muncul setelah
          berkasnya selesai naik dan keterangannya selesai diketik. Sama seperti
          batas catatan di Info bisnis: yang hilang bukan cuma fiturnya, tapi
          pekerjaan yang sudah dikerjakan. */}
      {MAKS_BERKAS - berkas.length <= 3 && (
        <div className="px-4 pt-4 sm:px-6">
          <div
            className={`flex flex-wrap items-center gap-3 rounded-xl border px-4 py-3 ${
              berkas.length >= MAKS_BERKAS
                ? "border-red-200 bg-red-50"
                : "border-amber-200 bg-amber-50"
            }`}
          >
            <p className="flex-1 text-sm leading-relaxed text-ink-800">
              {berkas.length >= MAKS_BERKAS ? (
                <>
                  <span className="font-medium">Sudah penuh.</span> Satu asisten
                  muat {MAKS_BERKAS} berkas. Hapus yang tidak terpakai dulu kalau
                  mau menambah.
                </>
              ) : (
                <>
                  <span className="font-medium">
                    Sisa {MAKS_BERKAS - berkas.length} berkas lagi.
                  </span>{" "}
                  Satu asisten muat {MAKS_BERKAS} berkas.
                </>
              )}
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-6 p-4 sm:p-6 lg:grid-cols-[minmax(0,1fr)_400px]">
        <div className="space-y-4">
          <h2 className="font-semibold text-ink-900">
            {berkas.length} dari {MAKS_BERKAS} berkas
            {berkas.length > 0 && (
              <span className="font-normal text-ink-400">
                {" "}
                · {berkas.reduce((n, b) => n + b.sentCount, 0)} kali terkirim
              </span>
            )}
          </h2>

          <GaleriDaftar
            berkas={berkas.map((b) => ({
              id: b.id,
              code: b.code,
              name: b.name,
              description: b.description,
              fileName: b.fileName,
              kind: b.kind,
              sizeBytes: b.sizeBytes,
              sentCount: b.sentCount,
              readStatus: b.readStatus,
              readError: b.readError,
            }))}
          />

          {/* Terlipat, bukan terbentang.

              Empat paragraf aturan ini dulu ditampilkan penuh kepada orang
              yang belum mengunggah satu gambar pun. Dia belum punya
              pertanyaannya, jadi jawabannya cuma jadi tembok yang harus
              dilewati. Yang belum bertanya tidak boleh dipaksa membaca
              jawabannya. Isinya tetap ada dan tetap bisa dicari. */}
          <Rincian judul="Cara kerjanya">
            <ul className="space-y-2 text-sm leading-relaxed text-ink-600">
              <li>
                Asistenmu membaca keterangan tiap gambar, lalu memutuskan otomatis
                kapan mengirimnya. Kamu tidak perlu mengatur alur apa pun.
              </li>
              <li>
                Sekali balas maksimal 2 berkas, dan gambar yang barusan dikirim
                tidak ditawarkan lagi supaya tidak berulang-ulang.
              </li>
              <li>
                Mengirim gambar dan tahu isinya itu dua hal berbeda. Centang
                &ldquo;Baca juga tulisan di dalam gambarnya&rdquo; kalau gambarmu
                memuat harga atau keterangan, supaya tulisannya ikut masuk ke
                Info bisnis dan bisa dijawab kalau ditanya.
              </li>
              <li>
                Mengirim gambar lewat Palwise tidak menambah biaya sama sekali,
                karena jalur ini tidak menagih per pesan.
              </li>
            </ul>
          </Rincian>
        </div>

        <div className="lg:sticky lg:top-6 lg:self-start">
          {bolehKirim ? (
            <GaleriTambah agentId={active.id} />
          ) : (
            /* Daftar gambar yang sudah ada tetap terlihat, cuma penambahannya
               yang ditutup. Penolakan sesungguhnya ada di server, di
               tambahBerkasAction. */
            <div className="card-pad">
              <h2 className="font-semibold text-ink-900">
                Kirim foto, video, dan PDF
              </h2>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-600">
                Unggah foto barang, katalog, atau daftar harga PDF sekali, lalu
                asistenmu yang mengirimkannya waktu pelanggan minta lihat.
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-3 rounded-lg border border-ink-200 bg-ink-50 px-4 py-3">
                <p className="flex-1 text-sm leading-relaxed text-ink-600">
                  Ada mulai paket{" "}
                  <span className="font-medium text-ink-900">
                    {paketMinimal("kirimMedia").name}
                  </span>
                  .
                </p>
                <Link href="/app/tagihan" className="btn-ink shrink-0 px-4 py-1.5 text-xs">
                  Naikkan paket
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
