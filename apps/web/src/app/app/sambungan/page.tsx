import Link from "next/link";
import { prisma } from "@palwise/db";
import { requireUser } from "@/lib/auth";
import { callWorker } from "@/lib/worker";
import {
  FormDuaKolom,
  KOLOM_FORM,
  PageHeader,
  PanelBantuan,
  formatWaktu,
} from "@/components/ui";
import { Ikon } from "@/components/Ikon";
import { Kosong } from "@/components/Kosong";
import {
  PasangPelanggan,
  PerbaruiSheet,
  PutuskanPelanggan,
  SalinSekarang,
} from "@/components/SambungSheet";

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

/**
 * Semua sambungan Google Sheet satu akun, di satu tempat.
 *
 * Dua arah, dua kartu, dan urutannya disengaja: yang MEMBACA duluan, karena
 * itu yang membuat asistennya lebih benar menjawab, dan jalan itu terbuka
 * untuk semua akun tanpa pemasangan apa pun di server. Yang MENULIS data
 * pelanggan butuh robot Google di server, dan kalau robotnya belum dipasang
 * kartunya tidak digambar sama sekali: menawarkan tombol yang pasti gagal itu
 * lebih buruk daripada tidak menawarkan.
 */
export default async function SambunganPage() {
  const user = await requireUser();

  const [sumber, sambungan, info] = await Promise.all([
    prisma.knowledgeSource.findMany({
      where: { type: "sheet", agent: { workspaceId: user.workspaceId } },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        title: true,
        sheetUrl: true,
        sheetDisinkron: true,
        sheetGagal: true,
        sheetCatatan: true,
        sheetStruktur: true,
        content: true,
        agent: { select: { name: true } },
      },
    }),
    prisma.sambunganSheet.findUnique({ where: { workspaceId: user.workspaceId } }),
    callWorker<{ robot: string | null }>("/sheets/info", { timeoutMs: 4000 }).catch(
      () => null,
    ),
  ]);

  const robot = info?.robot ?? null;
  const banyakAsisten = new Set(sumber.map((s) => s.agent.name)).size > 1;

  return (
    <>
      <PageHeader
        title="Google Sheet"
        description="Sambungkan Sheet yang sudah kamu pakai tiap hari. Stok dan harga ikut sampai ke asistenmu, data pelanggan tersalin ke Sheet-mu."
        kolom={KOLOM_FORM}
      />

      <FormDuaKolom
        bantuan={
          <PanelBantuan
            judul="Cara kerjanya"
            poin={[
              {
                ikon: "info",
                teks: "Sheet stok atau harga dibaca ulang tiap 30 menit. Yang berubah langsung dihafal asistenmu.",
              },
              {
                ikon: "pelanggan",
                teks: 'Data pelanggan disalin ke tab "Pelanggan Palwise" tiap 15 menit. Tab lain di Sheet-mu tidak disentuh.',
              },
              {
                ikon: "catat",
                teks: "Jangan mengetik di tab Pelanggan Palwise, isinya ditulis ulang. Buat rumus atau catatan di tab lain.",
              },
              {
                ikon: "gembok",
                teks: "Kalau Sheet-nya gagal dibuka, asisten tetap memakai isi terakhir. Tidak ada yang tiba-tiba kosong.",
              },
            ]}
          />
        }
      >
        <div className="space-y-6">
          {/* ── Membaca: Sheet jadi Info bisnis ── */}
          <section className="card p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="flex items-center gap-2 font-semibold text-ink-900">
                  <Ikon nama="info" size={16} className="text-ink-500" />
                  Stok dan harga dari Sheet
                </h2>
                <p className="mt-1 text-sm leading-relaxed text-ink-500">
                  Asistenmu menjawab dari isi Sheet ini, dan ikut terbaru otomatis.
                </p>
              </div>
              <Link href="/app/knowledge?tambah=sheet" className="btn-ink shrink-0">
                Sambungkan Sheet
              </Link>
            </div>

            {sumber.length === 0 ? (
              <div className="mt-4 rounded-xl border border-dashed border-ink-200">
                <Kosong
                  ikon="sheet"
                  judul="Belum ada Sheet yang tersambung"
                  kalimat="Punya daftar stok di Google Sheet? Sambungkan, biar asistenmu tidak lagi menyebut stok kemarin."
                />
              </div>
            ) : (
              <ul className="mt-4 divide-y divide-ink-100 rounded-xl border border-ink-200">
                {sumber.map((s) => {
                  const baris = s.content ? s.content.split("\n").length : 0;
                  return (
                    <li key={s.id} className="space-y-2 p-4">
                      <div className="flex items-start gap-3">
                        <span className="mt-0.5 shrink-0 text-ink-400">
                          <Ikon nama="sheet" size={18} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-1 font-medium text-ink-900">{s.title}</p>
                          <p className="mt-0.5 text-xs text-ink-500">
                            {baris.toLocaleString("id-ID")} baris
                            {banyakAsisten && ` · asisten ${s.agent.name}`}
                            {" · "}
                            {s.sheetDisinkron
                              ? `diperbarui ${formatWaktu(s.sheetDisinkron)}`
                              : "belum pernah terbaca"}
                          </p>
                        </div>
                        {s.sheetUrl && (
                          <a
                            href={s.sheetUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="shrink-0 text-xs font-medium text-brand-700 hover:underline"
                          >
                            Buka
                          </a>
                        )}
                      </div>
                      {s.sheetGagal && (
                        <p className="rounded-lg bg-red-50 px-3 py-2 text-xs leading-relaxed text-red-700">
                          Pembaruan terakhir gagal, asisten masih memakai isi sebelumnya.{" "}
                          {s.sheetGagal}
                        </p>
                      )}
                      {bacaanSheet(s.sheetStruktur) && (
                        <p className="text-xs leading-relaxed text-ink-500">
                          {bacaanSheet(s.sheetStruktur)}
                        </p>
                      )}
                      {s.sheetCatatan && (
                        <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-800">
                          {s.sheetCatatan}
                        </p>
                      )}
                      <PerbaruiSheet id={s.id} kecil />
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* ── Menulis: data pelanggan ke Sheet ── */}
          {robot && (
            <section className="card p-5">
              <h2 className="flex items-center gap-2 font-semibold text-ink-900">
                <Ikon nama="pelanggan" size={16} className="text-ink-500" />
                Salin data pelanggan ke Sheet
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-ink-500">
                Nama, nomor, tahap, keluhan, janji temu, dan ringkasan AI tiap
                pelanggan, rapi di satu tab. Enak dipakai tim atau dihitung sendiri.
              </p>

              {sambungan ? (
                <div className="mt-4 space-y-4">
                  <div className="rounded-xl border border-ink-200 p-4">
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 shrink-0 text-ink-400">
                        <Ikon nama="sheet" size={18} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-ink-900">Tab Pelanggan Palwise</p>
                        <p className="mt-0.5 text-xs text-ink-500">
                          {sambungan.terakhirKirim
                            ? `${sambungan.jumlahBaris.toLocaleString("id-ID")} pelanggan · tersalin ${formatWaktu(sambungan.terakhirKirim)}`
                            : "Belum pernah berhasil tersalin"}
                        </p>
                      </div>
                      <a
                        href={sambungan.sheetUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 text-xs font-medium text-brand-700 hover:underline"
                      >
                        Buka
                      </a>
                    </div>
                    {sambungan.galat && (
                      <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs leading-relaxed text-red-700">
                        Salinan terakhir gagal. {sambungan.galat}
                      </p>
                    )}
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <SalinSekarang />
                      <PutuskanPelanggan />
                    </div>
                  </div>

                  <details className="group">
                    <summary className="tap-aman cursor-pointer list-none text-sm font-medium text-brand-700 hover:underline">
                      Ganti ke Sheet lain
                    </summary>
                    <div className="mt-4">
                      <PasangPelanggan robot={robot} ganti />
                    </div>
                  </details>
                </div>
              ) : (
                <div className="mt-4">
                  <PasangPelanggan robot={robot} />
                </div>
              )}
            </section>
          )}
        </div>
      </FormDuaKolom>
    </>
  );
}
