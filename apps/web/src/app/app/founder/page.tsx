import Link from "next/link";
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
import { bolehLihatFounder, emailFounder } from "@/lib/founder";
import { bacaJejakBuka } from "@/lib/jejakFounder";
import { PageHeader } from "@/components/ui";
import { Ikon, type NamaIkon } from "@/components/Ikon";
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
 *
 * ── GARIS YANG DITARIK DI DAFTAR AKUN (10 Agustus 2026) ─────────────────────
 *
 * Ditambahkan daftar "Akun terbaru": siapa yang daftar, kapan, paketnya apa,
 * sudah nyambungin nomor atau belum, dan seberapa banyak dipakai. Tanpa itu
 * halaman ini cuma bisa menjawab "berapa", tidak pernah "siapa", padahal yang
 * bisa ditindaklanjuti justru yang kedua: sepuluh orang mendaftar dan tujuh
 * berhenti sebelum scan QR itu tujuh orang yang bisa dihubungi hari ini.
 *
 * Yang ditampilkan cuma keterangan AKUNNYA SENDIRI: nama usaha, email
 * pemiliknya, tanggal daftar, paket, status nomor, dan hitungan pemakaian. Itu
 * data pendaftarnya, dan kita memang sudah memegangnya karena dia yang mengisi
 * dan kita yang menagihnya.
 *
 * Yang TETAP tidak boleh, dan ini garisnya: apa pun milik PELANGGAN DIA. Tidak
 * ada nama kontak, tidak ada nomor WhatsApp pelanggan, tidak ada judul atau
 * cuplikan obrolan. Jumlah kontak dan jumlah obrolan boleh, karena itu
 * hitungan, bukan isi.
 */

export const dynamic = "force-dynamic";

const HARI = 24 * 60 * 60 * 1000;

function Angka({
  nilai,
  label,
  catatan,
  ikon,
}: {
  nilai: string;
  label: string;
  catatan?: string;
  ikon?: NamaIkon;
}) {
  return (
    <div className="card p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[13px] leading-snug text-ink-500">{label}</p>
        {ikon && (
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-ink-100 text-ink-500">
            <Ikon nama={ikon} size={15} />
          </span>
        )}
      </div>
      <p className="mt-2 text-[26px] font-semibold leading-none tracking-tight tabular-nums text-ink-950">
        {nilai}
      </p>
      {catatan && (
        <p className="mt-1.5 text-xs leading-relaxed text-ink-500">{catatan}</p>
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
    akunTerbaru,
    bayarTerbaru,
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
    // Siapa yang daftar. Yang diambil cuma kolom akunnya sendiri; tidak ada
    // satu pun kolom milik pelanggan dia, cuma hitungannya.
    prisma.workspace.findMany({
      orderBy: { createdAt: "desc" },
      take: 25,
      select: {
        id: true,
        name: true,
        plan: true,
        createdAt: true,
        langgananSampai: true,
        paketBerikutnya: true,
        aiCreditsUsed: true,
        users: {
          // Pemiliknya saja. Akun tim ikut terdaftar di sini juga, dan yang
          // menjawab "siapa yang daftar" cuma yang pertama.
          where: { role: "owner" },
          orderBy: { createdAt: "asc" },
          take: 1,
          select: { email: true, emailVerifiedAt: true },
        },
        channels: { select: { status: true } },
        _count: { select: { contacts: true, conversations: true } },
      },
    }),
    prisma.pembayaran.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        planId: true,
        jumlah: true,
        status: true,
        sumber: true,
        metode: true,
        createdAt: true,
        lunasPada: true,
        workspace: { select: { name: true } },
      },
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
    select: { plan: true, users: { select: { email: true } } },
  });

  // AKUN FOUNDER SENDIRI TIDAK DIHITUNG SEBAGAI PENDAPATAN.
  //
  // Paket berbayar bisa diberikan tanpa uang lewat `npm run akun:paket`, dan
  // yang pertama memakainya pasti akun founder sendiri. Tanpa pengecualian ini,
  // angka MRR yang dibaca tiap pagi naik Rp 599.000 dari uang yang tidak pernah
  // ada. Yang merugikan bukan salah hitungnya, tapi bahwa harga diputuskan dari
  // angka itu.
  //
  // Dasarnya email di FOUNDER_EMAILS, sama dengan yang membuka halaman ini.
  // Kalau suatu hari akun teman ikut digratiskan, dia akan terhitung lagi, dan
  // saat itu tanda "komplimen" perlu jadi kolom sendiri di database. Sekarang
  // belum, karena satu-satunya akun yang digratiskan memang akun founder.
  // Dibaca dari berkas, bukan database, jadi tidak ikut Promise.all di atas.
  const jejak = bacaJejakBuka(30);

  const founder = new Set(emailFounder());
  const punyaFounder = (w: { users: { email: string }[] }) =>
    w.users.some((u) => founder.has(u.email.trim().toLowerCase()));

  const berbayarPelanggan = berbayarAktif.filter((w) => !punyaFounder(w));
  const akunFounderBerbayar = berbayarAktif.length - berbayarPelanggan.length;
  const mrr = berbayarPelanggan.reduce(
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
          <h2 className="flex items-center gap-2 font-semibold text-ink-900">
            <Ikon nama="ringkasan" size={16} className="text-ink-400" />
            Pertumbuhan
          </h2>
          <div className="anim-urut mt-4 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <Angka nilai={String(totalWorkspace)} label="Total akun" ikon="pelanggan" />
            <Angka nilai={String(baru7)} label="Daftar 7 hari terakhir" ikon="jam" />
            <Angka nilai={String(baru30)} label="Daftar 30 hari terakhir" ikon="kalender" />
            <Angka
              nilai={String(adaNomor)}
              label="Sampai nyambungin nomor"
              ikon="whatsapp"
              catatan={
                totalWorkspace > 0
                  ? `${Math.round((adaNomor / totalWorkspace) * 100)}% dari total akun. Selisihnya di sini yang paling perlu diperbaiki.`
                  : undefined
              }
            />
          </div>
        </div>

        <div>
          <h2 className="flex items-center gap-2 font-semibold text-ink-900">
            <Ikon nama="paket" size={16} className="text-ink-400" />
            Uang
          </h2>
          <div className="anim-urut mt-4 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <Angka
              nilai={formatIDR(mrr)}
              label="MRR"
              ikon="paket"
              catatan={
                akunFounderBerbayar > 0
                  ? `Dari langganan yang tanggalnya masih berlaku. ${akunFounderBerbayar} akun founder tidak dihitung, paketnya diberikan bukan dibayar.`
                  : "Dari langganan yang tanggalnya masih berlaku, bukan dari paket yang tertulis di akun."
              }
            />
            <Angka
              nilai={formatIDR(terkumpul30)}
              label="Masuk 30 hari terakhir"
              ikon="paket"
              catatan={`${lunas30.length} pembayaran lunas`}
            />
            <Angka
              nilai={String(menunggu)}
              label="Tagihan menunggu"
              ikon="jam"
              catatan="Kalau angkanya nggak turun-turun, curigai Payment Notification URL di Midtrans."
            />
            <Angka
              nilai={String(gagal30)}
              label="Gagal 30 hari terakhir"
              ikon="silang"
              catatan="Termasuk yang ditinggalkan di halaman bayar."
            />
          </div>
        </div>

        <div>
          <h2 className="flex items-center gap-2 font-semibold text-ink-900">
            <Ikon nama="paket" size={16} className="text-ink-400" />
            Sebaran paket
          </h2>
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
          <h2 className="flex items-center gap-2 font-semibold text-ink-900">
            <Ikon nama="kirim" size={16} className="text-ink-400" />
            Pemakaian
          </h2>
          <div className="anim-urut mt-4 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <Angka
              nilai={balasan30.toLocaleString("id-ID")}
              label="Balasan AI 30 hari"
              ikon="kirim"
              catatan="Ini yang jadi ongkos token kamu. Bandingkan dengan yang masuk di atas."
            />
            <Angka nilai={String(nomorTersambung)} label="Nomor tersambung sekarang" ikon="whatsapp" />
            <Angka
              nilai={
                balasan30 > 0 && terkumpul30 > 0
                  ? formatIDR(Math.round(terkumpul30 / balasan30))
                  : "—"
              }
              label="Pendapatan per balasan"
              ikon="paket"
              catatan="Kalau angka ini di bawah ongkos token per balasan, tiap balasan bikin rugi."
            />
            <Angka
              nilai={String(masukanBaru)}
              label="Masukan belum dibaca"
              ikon="catat"
            />
          </div>
        </div>

        {/* Siapa yang daftar.
            Kartu, bukan tabel tujuh kolom: halaman ini paling sering dibuka
            dari HP, dan tabel selebar itu memaksa layar digeser ke samping
            sampai kolom nama usahanya hilang. Bentuk kartu sama enaknya di
            dua-duanya, cuma jadi dua kolom di layar lebar. */}
        <div>
          <h2 className="flex items-center gap-2 font-semibold text-ink-900">
            <Ikon nama="pelanggan" size={16} className="text-ink-400" />
            Akun terbaru
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-ink-500">
            25 pendaftar terakhir. Jumlah kontak dan obrolan cuma hitungan; isi
            chat pelanggan mereka tidak pernah bisa dibuka dari sini.
          </p>

          {akunTerbaru.length === 0 ? (
            <p className="mt-4 text-sm leading-relaxed text-ink-500">
              Belum ada yang daftar.
            </p>
          ) : (
            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              {akunTerbaru.map((w) => {
                const pemilik = w.users[0];
                const tersambung = w.channels.some((c) => c.status === "connected");
                const jatah = getPlan(w.plan).aiCredits;
                const aktifBerbayar =
                  w.plan !== "free" &&
                  w.langgananSampai !== null &&
                  w.langgananSampai.getTime() > sekarang.getTime();

                return (
                  // Seluruh kartunya yang diklik, bukan tautan kecil di
                  // sudutnya. Sasaran sebesar kartu tidak pernah meleset di HP,
                  // dan tidak ada yang perlu dicari dulu.
                  <Link
                    key={w.id}
                    href={`/app/founder/${w.id}`}
                    className="card-pad block transition hover:border-ink-300 hover:bg-ink-50/60"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-ink-900">
                          {w.name}
                        </p>
                        <p className="truncate text-xs text-ink-500">
                          {pemilik?.email ?? "tanpa pemilik"}
                        </p>
                      </div>
                      <span
                        className={`badge shrink-0 ${
                          aktifBerbayar
                            ? "bg-ink-900 text-white"
                            : "bg-ink-100 text-ink-700"
                        }`}
                      >
                        {getPlan(w.plan).name}
                      </span>
                    </div>

                    {/* Penanda yang bisa ditindaklanjuti hari ini. Yang paling
                        penting "belum nyambungin nomor": itu orang yang sudah
                        mau, sudah daftar, dan berhenti satu langkah sebelum
                        produknya jalan. */}
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {w.channels.length === 0 ? (
                        <span className="badge bg-amber-50 text-amber-800">
                          Belum nyambungin nomor
                        </span>
                      ) : tersambung ? (
                        <span className="badge bg-ink-100 text-ink-700">
                          Nomor tersambung
                        </span>
                      ) : (
                        <span className="badge bg-amber-50 text-amber-800">
                          Nomor terputus
                        </span>
                      )}
                      {pemilik && !pemilik.emailVerifiedAt && (
                        <span className="badge bg-ink-100 text-ink-600">
                          Email belum diverifikasi
                        </span>
                      )}
                      {w.paketBerikutnya && (
                        <span className="badge bg-amber-50 text-amber-800">
                          Turun ke {getPlan(w.paketBerikutnya).name}
                        </span>
                      )}
                    </div>

                    <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-ink-100 pt-3 text-xs sm:grid-cols-4">
                      <div>
                        <dt className="text-ink-500">Daftar</dt>
                        <dd className="mt-0.5 text-ink-800">
                          {w.createdAt.toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                            year: "2-digit",
                          })}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-ink-500">Balasan</dt>
                        <dd className="mt-0.5 text-ink-800">
                          {w.aiCreditsUsed.toLocaleString("id-ID")} /{" "}
                          {jatah.toLocaleString("id-ID")}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-ink-500">Obrolan</dt>
                        <dd className="mt-0.5 text-ink-800">
                          {w._count.conversations.toLocaleString("id-ID")}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-ink-500">Pelanggan</dt>
                        <dd className="mt-0.5 text-ink-800">
                          {w._count.contacts.toLocaleString("id-ID")}
                        </dd>
                      </div>
                    </dl>

                    {w.langgananSampai && (
                      <p className="mt-2 text-xs text-ink-500">
                        Langganan sampai{" "}
                        {w.langgananSampai.toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    )}
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Pembayaran terakhir.
            Angka "tagihan menunggu" di atas cuma menyebut jumlahnya, dan waktu
            angka itu tidak turun-turun yang perlu dilihat justru barisnya: umur
            tagihannya, paket apa, dan lewat metode apa. Itu yang membedakan
            "Midtrans belum mengabari kita" dari "orangnya memang meninggalkan
            halaman bayar". */}
        <div>
          <h2 className="flex items-center gap-2 font-semibold text-ink-900">
            <Ikon nama="paket" size={16} className="text-ink-400" />
            Pembayaran terakhir
          </h2>

          {bayarTerbaru.length === 0 ? (
            <p className="mt-4 text-sm leading-relaxed text-ink-500">
              Belum ada tagihan yang pernah dibuat.
            </p>
          ) : (
            <div className="card mt-4 divide-y divide-ink-100">
              {bayarTerbaru.map((b) => (
                <div
                  key={b.id}
                  className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink-900">
                      {b.workspace.name}
                    </p>
                    <p className="truncate text-xs text-ink-500">
                      {getPlan(b.planId).name}
                      {b.metode ? ` · ${b.metode}` : ""}
                      {b.sumber !== "midtrans" ? ` · ${b.sumber}` : ""}
                      {" · "}
                      {(b.lunasPada ?? b.createdAt).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "2-digit",
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-ink-900">
                      {formatIDR(b.jumlah)}
                    </span>
                    <span
                      className={`badge ${
                        b.status === BAYAR_LUNAS
                          ? "bg-ink-900 text-white"
                          : b.status === BAYAR_MENUNGGU
                            ? "bg-amber-50 text-amber-800"
                            : "bg-ink-100 text-ink-600"
                      }`}
                    >
                      {b.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Catatan bukaan chat, dipajang di sini juga.
            Halaman privasi menjanjikan tiap bukaan tercatat. Catatan yang cuma
            bisa dibaca lewat SSH itu, dalam praktiknya, catatan yang tidak
            pernah dibaca siapa pun, dan yang tidak pernah dibaca tidak
            menahan siapa-siapa. Ditaruh di halaman yang sama dengan tombol
            yang membukanya, jadi yang membuka melihat jejaknya sendiri
            bertambah. */}
        <div>
          <h2 className="flex items-center gap-2 font-semibold text-ink-900">
            <Ikon nama="jam" size={16} className="text-ink-400" />
            Catatan bukaan chat
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-ink-500">
            Kebijakan privasi kita menulis tiap bukaan tercatat. Ini catatannya,
            dan dia cuma bisa ditambah, tidak bisa dihapus dari aplikasi.
          </p>

          {jejak.length === 0 ? (
            <p className="mt-4 text-sm leading-relaxed text-ink-500">
              Belum ada satu pun obrolan pelanggan yang dibuka.
            </p>
          ) : (
            <div className="card mt-4 divide-y divide-ink-100">
              {jejak.map((j) => (
                <div
                  key={`${j.waktu}-${j.conversationId}`}
                  className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-2.5 text-sm"
                >
                  <span className="min-w-0 truncate text-ink-800">
                    {j.oleh} membuka obrolan di {j.namaUsaha}
                  </span>
                  <span className="shrink-0 text-xs text-ink-500">
                    {new Date(j.waktu).toLocaleString("id-ID", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h2 className="flex items-center gap-2 font-semibold text-ink-900">
            <Ikon nama="catat" size={16} className="text-ink-400" />
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
