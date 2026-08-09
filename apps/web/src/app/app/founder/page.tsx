import { notFound } from "next/navigation";
import {
  BAYAR_GAGAL,
  BAYAR_LUNAS,
  BAYAR_MENUNGGU,
  SEMUA_PAKET,
  formatIDR,
  getPlan,
  hitungBalasanSemua,
  prisma,
} from "@palwise/db";
import { requireUser } from "@/lib/auth";
import { bolehLihatFounder } from "@/lib/founder";
import { PageHeader } from "@/components/ui";
import { tandaiMasukanDibacaAction } from "@/app/actions/masukan";

/**
 * Halaman internal: angka saja.
 *
 * TIDAK ADA SATU PUN ISI CHAT PELANGGAN DI HALAMAN INI, dan itu bukan
 * kelupaan. Kebijakan privasi Palwise menulis data pelanggan "tidak dijual,
 * tidak dipakai melatih AI, dan tidak dibaca karyawan kami". Halaman founder
 * yang bisa membuka obrolan orang membuat kalimat itu bohong, dan kalimat itu
 * salah satu alasan orang mau menyambungkan nomor WhatsApp usahanya ke produk
 * yang belum punya reputasi.
 *
 * Kalau suatu hari benar-benar perlu membuka satu akun untuk membantu yang
 * komplain, ubah dulu kalimat di halaman privasi, catat siapa membuka apa dan
 * kapan, dan minta izin orangnya. Jangan diselipkan diam-diam ke halaman ini.
 *
 * Yang boleh: hitungan, jumlah, dan rata-rata. Nama usaha ikut ditampilkan di
 * daftar masukan karena orangnya sendiri yang mengirimkan masukan itu.
 */

export const dynamic = "force-dynamic";

const HARI = 24 * 60 * 60 * 1000;

function Angka({
  nilai,
  label,
  catatan,
}: {
  nilai: string;
  label: string;
  catatan?: string;
}) {
  return (
    <div className="card-pad">
      <p className="text-sm text-ink-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight text-ink-950">
        {nilai}
      </p>
      {catatan && (
        <p className="mt-1 text-xs leading-relaxed text-ink-500">{catatan}</p>
      )}
    </div>
  );
}

const LABEL_JENIS: Record<string, string> = {
  bug: "Bug",
  saran: "Saran",
  lainnya: "Lainnya",
};

export default async function FounderPage() {
  const user = await requireUser();

  // notFound(), BUKAN pesan "kamu tidak punya akses".
  //
  // Halaman yang menjawab "dilarang" memberi tahu bahwa halamannya ADA, dan itu
  // satu-satunya petunjuk yang dibutuhkan orang untuk mulai menebak isinya.
  // Yang bukan founder harus melihat hal yang sama persis dengan alamat yang
  // memang tidak pernah ada.
  if (!bolehLihatFounder(user.email)) notFound();

  const sekarang = new Date();
  const tujuhHari = new Date(sekarang.getTime() - 7 * HARI);
  const tigaPuluhHari = new Date(sekarang.getTime() - 30 * HARI);

  const [
    totalWorkspace,
    baru7,
    baru30,
    adaNomor,
    nomorTersambung,
    perPaket,
    lunas30,
    menunggu,
    gagal30,
    balasan30,
    masukanBaru,
    daftarMasukan,
  ] = await Promise.all([
    prisma.workspace.count(),
    prisma.workspace.count({ where: { createdAt: { gte: tujuhHari } } }),
    prisma.workspace.count({ where: { createdAt: { gte: tigaPuluhHari } } }),
    // Aktivasi yang sebenarnya: bukan yang mendaftar, tapi yang sampai
    // menyambungkan nomor. Selisih dua angka ini yang memberi tahu di mana orang
    // menyerah, dan itu satu-satunya angka yang bisa memperbaiki produk.
    prisma.workspace.count({ where: { channels: { some: {} } } }),
    prisma.workspace.count({
      where: { channels: { some: { status: "connected" } } },
    }),
    prisma.workspace.groupBy({ by: ["plan"], _count: { plan: true } }),
    prisma.pembayaran.findMany({
      where: { status: BAYAR_LUNAS, lunasPada: { gte: tigaPuluhHari } },
      select: { jumlah: true },
    }),
    prisma.pembayaran.count({ where: { status: BAYAR_MENUNGGU } }),
    prisma.pembayaran.count({
      where: { status: BAYAR_GAGAL, createdAt: { gte: tigaPuluhHari } },
    }),
    // BALASAN, bukan baris pesan. Satu balasan bisa dipecah jadi tiga bubble,
    // dan tiap bubble satu baris Message. Menghitung baris membuat angka ini
    // jauh lebih besar dari yang sebenarnya, dan kartu "Pendapatan per balasan"
    // tepat di sebelahnya jadi terlalu kecil. Yang paling merugikan: angka itu
    // yang dipakai memutuskan harga.
    hitungBalasanSemua(tigaPuluhHari),
    prisma.masukan.count({ where: { dibacaPada: null } }),
    prisma.masukan.findMany({
      orderBy: [{ dibacaPada: "asc" }, { createdAt: "desc" }],
      take: 30,
    }),
  ]);

  const jumlahPaket = new Map(perPaket.map((p) => [p.plan, p._count.plan]));

  // MRR dihitung dari langganan yang MASIH BERLAKU, bukan dari jumlah akun yang
  // paketnya berbayar. Akun yang paketnya berbayar tapi tanggalnya sudah lewat
  // bukan pendapatan, dia utang yang belum diturunkan penjadwal.
  const berbayarAktif = await prisma.workspace.findMany({
    where: {
      langgananSampai: { gt: sekarang },
      NOT: { plan: "free" },
    },
    select: { plan: true },
  });
  const mrr = berbayarAktif.reduce(
    (t, w) => t + getPlan(w.plan).pricePerMonth,
    0,
  );

  const terkumpul30 = lunas30.reduce((t, p) => t + p.jumlah, 0);

  return (
    <>
      <PageHeader
        title="Founder"
        description="Angka saja. Isi chat pelanggan tidak pernah ditampilkan di halaman ini."
      />

      <div className="space-y-6 p-4 sm:p-6">
        <div>
          <h2 className="font-semibold text-ink-900">Pertumbuhan</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Angka nilai={String(totalWorkspace)} label="Total akun" />
            <Angka nilai={String(baru7)} label="Daftar 7 hari terakhir" />
            <Angka nilai={String(baru30)} label="Daftar 30 hari terakhir" />
            <Angka
              nilai={String(adaNomor)}
              label="Sampai nyambungin nomor"
              catatan={
                totalWorkspace > 0
                  ? `${Math.round((adaNomor / totalWorkspace) * 100)}% dari total akun. Selisihnya di sini yang paling perlu diperbaiki.`
                  : undefined
              }
            />
          </div>
        </div>

        <div>
          <h2 className="font-semibold text-ink-900">Uang</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Angka
              nilai={formatIDR(mrr)}
              label="MRR"
              catatan="Dari langganan yang tanggalnya masih berlaku, bukan dari paket yang tertulis di akun."
            />
            <Angka
              nilai={formatIDR(terkumpul30)}
              label="Masuk 30 hari terakhir"
              catatan={`${lunas30.length} pembayaran lunas`}
            />
            <Angka
              nilai={String(menunggu)}
              label="Tagihan menunggu"
              catatan="Kalau angkanya nggak turun-turun, curigai Payment Notification URL di Midtrans."
            />
            <Angka
              nilai={String(gagal30)}
              label="Gagal 30 hari terakhir"
              catatan="Termasuk yang ditinggalkan di halaman bayar."
            />
          </div>
        </div>

        <div>
          <h2 className="font-semibold text-ink-900">Sebaran paket</h2>
          <div className="card mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink-100 text-left text-xs text-ink-500">
                  <th className="px-4 py-2.5 font-medium">Paket</th>
                  <th className="px-4 py-2.5 font-medium">Akun</th>
                  <th className="px-4 py-2.5 font-medium">Kalau semua bayar</th>
                </tr>
              </thead>
              <tbody>
                {SEMUA_PAKET.map((p) => (
                  <tr key={p.id} className="border-b border-ink-100 last:border-0">
                    <td className="px-4 py-2.5 text-ink-700">{p.name}</td>
                    <td className="px-4 py-2.5 text-ink-900">
                      {jumlahPaket.get(p.id) ?? 0}
                    </td>
                    <td className="px-4 py-2.5 text-ink-500">
                      {p.pricePerMonth === 0
                        ? "—"
                        : formatIDR(p.pricePerMonth * (jumlahPaket.get(p.id) ?? 0))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-ink-500">
            Kolom kanan itu bukan MRR. Dia menghitung semua akun yang paketnya
            berbayar, termasuk yang tanggalnya sudah lewat dan belum diturunkan.
            Yang benar angka MRR di atas.
          </p>
        </div>

        <div>
          <h2 className="font-semibold text-ink-900">Pemakaian</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Angka
              nilai={balasan30.toLocaleString("id-ID")}
              label="Balasan AI 30 hari"
              catatan="Ini yang jadi ongkos token kamu. Bandingkan dengan yang masuk di atas."
            />
            <Angka nilai={String(nomorTersambung)} label="Nomor tersambung sekarang" />
            <Angka
              nilai={
                balasan30 > 0 && terkumpul30 > 0
                  ? formatIDR(Math.round(terkumpul30 / balasan30))
                  : "—"
              }
              label="Pendapatan per balasan"
              catatan="Kalau angka ini di bawah ongkos token per balasan, tiap balasan bikin rugi."
            />
            <Angka
              nilai={String(masukanBaru)}
              label="Masukan belum dibaca"
            />
          </div>
        </div>

        <div>
          <h2 className="font-semibold text-ink-900">
            Masukan dari pengguna
            {masukanBaru > 0 && (
              <span className="ml-2 rounded-full bg-brand-600 px-2 py-0.5 text-xs font-semibold text-white">
                {masukanBaru} baru
              </span>
            )}
          </h2>

          {daftarMasukan.length === 0 ? (
            <p className="mt-4 text-sm leading-relaxed text-ink-500">
              Belum ada masukan. Tombolnya melayang di sudut kanan bawah tiap
              halaman dashboard.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {daftarMasukan.map((m) => (
                <div
                  key={m.id}
                  className={`card-pad ${m.dibacaPada ? "" : "border-brand-500 ring-1 ring-brand-500"}`}
                >
                  <div className="flex flex-wrap items-center gap-2 text-xs text-ink-500">
                    <span
                      className={`badge ${
                        m.jenis === "bug"
                          ? "bg-ink-900 text-white"
                          : "bg-ink-100 text-ink-700"
                      }`}
                    >
                      {LABEL_JENIS[m.jenis] ?? m.jenis}
                    </span>
                    {!m.dibacaPada && (
                      <span className="badge bg-brand-600 text-white">Baru</span>
                    )}
                    <span>
                      {m.createdAt.toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                    {m.halaman && (
                      <span className="font-mono text-ink-400">{m.halaman}</span>
                    )}
                  </div>

                  {/* whitespace-pre-line supaya baris yang dia enter tetap
                      terbaca sebagai baris. Laporan bug sering ditulis sebagai
                      langkah-langkah, dan menggabungnya jadi satu paragraf
                      membuat langkahnya hilang. */}
                  <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-ink-800">
                    {m.isi}
                  </p>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-ink-100 pt-3 text-xs text-ink-500">
                    <span>
                      {m.namaUsaha ?? "Tanpa nama usaha"}
                      {m.emailPengirim ? ` · ${m.emailPengirim}` : ""}
                    </span>
                    {!m.dibacaPada && (
                      <form action={tandaiMasukanDibacaAction}>
                        <input type="hidden" name="id" value={m.id} />
                        <button type="submit" className="btn-ghost px-3 py-1.5 text-xs">
                          Tandai sudah dibaca
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
