import Link from "next/link";
import { headers } from "next/headers";
import {
  BAYAR_DIKEMBALIKAN,
  BAYAR_GAGAL,
  BAYAR_LUNAS,
  BAYAR_MENUNGGU,
  SEMUA_PAKET,
  SUMBER_BULAN_GRATIS,
  akibatPindahPaket,
  formatIDR,
  kalimatAkibat,
  kalimatGantiPaket,
  getPlan,
  hitungBalasan,
  periodeBerikutnya,
  pricePerReply,
  prisma,
  sisaJamUpaya,
  statusLangganan,
  terpakaiSekarang,
  tautanAjak,
  upayaMasihHidup,
} from "@palwise/db";
import { AjakTeman } from "@/components/AjakTeman";
import { ringkasanAjak } from "@/lib/ajakTeman";
import { requireUser } from "@/lib/auth";
import { midtransModeUji, midtransSiap, salahLingkunganKunci } from "@/lib/midtrans";
import { keSitus } from "@/lib/situs";
import { PageHeader } from "@/components/ui";
import { Ikon } from "@/components/Ikon";
import { TombolGantiPaket } from "@/components/TombolGantiPaket";
import { batalkanJadwalTurunAction, changePlanAction } from "@/app/actions/plan";

export const dynamic = "force-dynamic";

function tanggalIndo(d: Date): string {
  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

const LABEL_STATUS: Record<string, string> = {
  [BAYAR_MENUNGGU]: "Menunggu pembayaran",
  [BAYAR_LUNAS]: "Lunas",
  [BAYAR_GAGAL]: "Tidak selesai",
  [BAYAR_DIKEMBALIKAN]: "Dikembalikan",
};

export default async function TagihanPage({
  searchParams,
}: {
  searchParams: Promise<{ bayar?: string }>;
}) {
  const user = await requireUser();
  const { bayar: kembaliDariBayar } = await searchParams;

  const workspace = await prisma.workspace.findUniqueOrThrow({
    where: { id: user.workspaceId },
  });
  const plan = getPlan(workspace.plan);
  const langganan = statusLangganan(workspace);
  const ajak = await ringkasanAjak(workspace.id);

  const riwayat = await prisma.pembayaran.findMany({
    where: { workspaceId: workspace.id },
    orderBy: { createdAt: "desc" },
    take: 12,
  });
  const tertunda = riwayat.find((p) => upayaMasihHidup(p));

  // Tautan ajakan sengaja memakai alamat halaman jualan, bukan alamat
  // dashboard. Yang dikirim ke teman jadi palwise.id/daftar?ajak=XXXX, lebih
  // pendek dan lebih masuk akal buat orang yang belum punya akun. Pengalihan
  // ke alamat dashboard diurus middleware, kode ajaknya ikut terbawa.
  //
  // Saat dijalankan di laptop alamatnya localhost, dan itu memang benar.
  const kepala = await headers();
  const asalSitus = keSitus("", kepala.get("host") ?? "localhost:3000");

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [aiCount, channelCount, agentCount, sourceCount] = await Promise.all([
    // Dihitung per BALASAN, satuan yang sama dengan "Balasan terpakai" tepat di
    // atasnya.
    //
    // Dulu di sini menghitung baris pesan beruntun milik AI, dan satu balasan
    // bisa jadi tiga bubble. Hasilnya dua angka bersebelahan di satu kartu
    // memakai satuan yang berbeda, dan yang bawah selalu jauh lebih besar. Yang
    // membaca cuma punya dua kesimpulan, dan dua-duanya salah: entah jatahnya
    // dihitung kurang, atau angka pemakaiannya mengada-ada.
    //
    // Obrolan ruang coba juga ikut terbuang di sini, karena dia punya jatah
    // sendiri dan tidak pernah memotong jatah balasan.
    hitungBalasan(workspace.id, since),
    prisma.channel.count({ where: { workspaceId: workspace.id } }),
    prisma.agent.count({ where: { workspaceId: workspace.id } }),
    prisma.knowledgeSource.count({
      where: { agent: { workspaceId: workspace.id } },
    }),
  ]);

  // Lihat catatan di terpakaiSekarang: penolan jatah bulanan dikerjakan worker
  // waktu pesan pertama masuk, jadi angka mentahnya masih milik bulan lalu
  // sampai itu terjadi.
  const terpakai = terpakaiSekarang(
    workspace.aiCreditsUsed,
    workspace.quotaResetAt,
  );
  const pct = Math.min(100, Math.round((terpakai / plan.aiCredits) * 100));

  return (
    <>
      <PageHeader
        title="Paket & pemakaian"
        description="Bayar per bulan, berhenti kapan saja. Tidak ada biaya pasang."
      />

      <div className="space-y-6 p-4 sm:p-6">
        {/* Baru kembali dari halaman bayar.

            Sengaja TIDAK bilang "pembayaran berhasil". Halaman ini cuma bukti
            browsernya sampai ke sini, bukan bukti uangnya masuk, dan untuk
            transfer bank jeda antara keduanya bisa belasan menit. Menulis
            "berhasil" lalu menampilkan paket yang belum naik justru membuat
            orang mengira sistemnya rusak. */}
        {kembaliDariBayar === "selesai" && !langganan.aktif && (
          <div className="card-pad">
            <p className="font-semibold text-ink-900">
              Pembayaranmu sedang diperiksa
            </p>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-600">
              Kalau kamu bayar lewat transfer bank atau virtual account,
              paketnya naik begitu bank mengabari kami, biasanya beberapa menit.
              Tidak perlu bayar lagi, dan tidak perlu menunggu di halaman ini.
              Muat ulang saja sebentar lagi.
            </p>
          </div>
        )}

        {/* Kembali dari pembayaran yang GAGAL.

            Alamat ini yang diisi di Midtrans sebagai Error Payment URL. Tanpa
            cabang ini, orang yang pembayarannya gagal mendarat di halaman yang
            tidak menyebut apa pun soal kegagalannya, lalu harus menebak sendiri:
            uangnya kepotong atau tidak, paketnya naik atau tidak, harus bayar
            lagi atau tidak. Diam di titik itu jauh lebih menakutkan daripada
            pesan gagal, karena yang dipertaruhkan uangnya.

            Kalimat pertamanya menegaskan uangnya TIDAK terpotong, karena itu
            yang pertama dia pikirkan, bukan paketnya. */}
        {kembaliDariBayar === "gagal" && (
          <div className="card-pad">
            <p className="font-semibold text-ink-900">
              Pembayarannya nggak selesai
            </p>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-600">
              Uangmu tidak terpotong dan paketmu tidak berubah. Ini biasanya
              karena halaman bayarnya ditutup, waktunya habis, atau banknya
              menolak. Coba lagi dari kartu paket di bawah, dan kalau tetap
              begitu hubungi kami, jangan dicoba berkali-kali.
            </p>
          </div>
        )}

        <div className="card-pad">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm text-ink-500">Paket aktif</p>
              <p className="mt-1 text-2xl font-semibold tracking-tight">
                {plan.name}{" "}
                <span className="text-base font-normal text-ink-500">
                  · {formatIDR(plan.pricePerMonth)}/bln
                </span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-ink-500">Balasan terpakai</p>
              <p className="mt-1 text-2xl font-semibold tracking-tight">
                {terpakai.toLocaleString("id-ID")}
                <span className="text-base font-normal text-ink-400">
                  {" "}
                  / {plan.aiCredits.toLocaleString("id-ID")}
                </span>
              </p>
            </div>
          </div>

          <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-ink-100">
            <div
              className={`h-full rounded-full ${pct > 90 ? "bg-red-500" : "bg-brand-500"}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-ink-500">
            Hitungan mulai dari nol lagi tanggal{" "}
            {periodeBerikutnya(workspace.quotaResetAt).toLocaleDateString(
              "id-ID",
              { day: "numeric", month: "long", year: "numeric" },
            )}
          </p>

          {/* Sampai kapan dia berhak, bukan cuma paket apa yang dia pakai.
              Tanpa baris ini pemiliknya tidak punya satu pun cara mengetahui
              kapan langganannya habis, dan yang pertama memberitahunya adalah
              asistennya yang mengecil sendiri. */}
          {langganan.aktif && langganan.sampai && (
            <p className="mt-3 border-t border-ink-100 pt-3 text-sm text-ink-700">
              Sudah dibayar sampai{" "}
              <span className="font-medium text-ink-900">
                {tanggalIndo(langganan.sampai)}
              </span>
              {langganan.sisaHari !== null && (
                <span className="text-ink-500">
                  {" "}
                  · {langganan.sisaHari} hari lagi
                </span>
              )}
            </p>
          )}
          {plan.pricePerMonth === 0 && (
            <p className="mt-3 border-t border-ink-100 pt-3 text-sm text-ink-500">
              Paket gratis, tanpa batas waktu. Tidak ada tagihan.
            </p>
          )}
        </div>

        {/* Penurunan yang sudah dijadwalkan, plus jalan keluarnya.
            Satu klik yang tidak bisa ditarik kembali sampai berminggu-minggu
            itu jebakan, bukan fitur. */}
        {langganan.turunKe && langganan.sampai && (
          <div className="card-pad">
            <p className="font-semibold text-ink-900">
              Paketmu turun ke {getPlan(langganan.turunKe).name} tanggal{" "}
              {tanggalIndo(langganan.sampai)}
            </p>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-600">
              Sampai tanggal itu semuanya tetap jalan seperti sekarang, karena
              bulan ini sudah kamu bayar. Sesudahnya jatah balasan jadi{" "}
              {getPlan(langganan.turunKe).aiCredits.toLocaleString("id-ID")} per
              bulan dan nomor WhatsApp yang lewat jatah berhenti melayani
              pelanggan.
            </p>
            <form action={batalkanJadwalTurunAction} className="mt-4">
              <button type="submit" className="btn-ghost">
                Batalkan, lanjut berlangganan
              </button>
            </form>
          </div>
        )}

        {/* Tagihan yang belum dibayar. Tautannya dibawa lagi supaya orang yang
            menutup halaman Midtrans tidak perlu membuat tagihan baru, karena
            tagihan baru berarti dua virtual account untuk satu hal. */}
        {tertunda && tertunda.urlBayar && (
          <div className="card-pad">
            <p className="font-semibold text-ink-900">
              Ada tagihan yang belum dibayar
            </p>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-600">
              Paket {getPlan(tertunda.planId).name},{" "}
              {formatIDR(tertunda.jumlah)}. Kalau kamu sudah transfer,
              tunggu saja sebentar, paketnya naik sendiri begitu banknya
              mengabari kami.
            </p>
            {/* Sisa waktunya DISEBUT, bukan cuma dijadikan syarat munculnya
                tombol.

                Tanpa ini, tombolnya kelihatan sama saja di jam pertama dan di
                jam kedua puluh tiga, lalu hilang mendadak tanpa penjelasan. Yang
                lebih buruk: orang yang menekannya di menit terakhir mendarat di
                halaman "Transaksi sudah kedaluwarsa" milik Midtrans, dan kalimat
                itu bukan kalimat kita.

                Dibulatkan ke atas. "Tinggal 0 jam" untuk tagihan yang masih
                hidup terbaca seperti sudah mati. */}
            <p className="mt-1.5 text-sm leading-relaxed text-ink-500">
              Tautan bayarnya berlaku {Math.ceil(sisaJamUpaya(tertunda))} jam
              lagi. Lewat itu, tagihannya hangus dan kamu perlu membuat yang baru
              dari kartu paket di bawah. Nomor virtual account-nya juga akan
              berbeda.
            </p>
            <a
              href={tertunda.urlBayar}
              className="btn-primary mt-4 inline-flex"
              rel="noopener noreferrer"
            >
              Lanjutkan pembayaran
            </a>
          </div>
        )}

        <AjakTeman
          kode={ajak.kode}
          tautan={tautanAjak(ajak.kode, asalSitus)}
          diajak={ajak.diajak}
          sudahBerlangganan={ajak.sudahBerlangganan}
          bulanGratis={ajak.bulanGratis}
        />

        <div>
          <h2 className="font-semibold text-ink-900">Ganti paket</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {SEMUA_PAKET.map((p) => {
              const current = p.id === plan.id;
              const berbayar = p.pricePerMonth > 0;

              // Hemat per balasan dibanding Starter, DITURUNKAN dari angkanya,
              // bukan diketik "50%". Kalau harga atau jatah suatu hari diubah,
              // persennya ikut benar sendiri. Starter jadi patokan karena dia
              // paket berbayar termurah; Growth dan Pro dua kali lebih murah per
              // balasan, dan itu alasan paling jujur buat naik dari Starter.
              const hematPersen = berbayar
                ? Math.round(
                    (1 - pricePerReply(p) / pricePerReply(getPlan("starter"))) *
                      100,
                  )
                : 0;

              // Perpanjangan paket yang sama tetap boleh, jadi kartu paket yang
              // sedang aktif TIDAK kehilangan tombolnya kalau dia berbayar.
              // Tanpa ini, satu-satunya cara memperpanjang adalah turun paket
              // dulu lalu naik lagi, dan itu berarti kehilangan sisa harinya.
              const bolehDitekan = !current || berbayar;

              /**
               * Paket aktif yang MASIH LAMA habisnya tidak ditawari perpanjangan
               * dengan tombol besar.
               *
               * Bug nyata, ditemukan pemiliknya 9 Agustus 2026: orang yang baru
               * berlangganan Starter langsung disuruh "Perpanjang Starter ·
               * Rp 199.000" padahal masih ada 24 hari. Dua kerugiannya, dan yang
               * kedua soal uang:
               *
               * 1. Terbaca seperti produknya bingung. Tidak ada yang
               *    memperpanjang di hari pertama.
               * 2. Orang yang baru bayar dan melihat tombol berharga di kartu
               *    paketnya sendiri wajar mengira pembayarannya belum sah dan
               *    harus ditekan sekali lagi. Sekali ditekan, dia benar-benar
               *    membuat tagihan kedua. Uangnya tidak hangus (perpanjangan
               *    menumpuk), tapi dia tidak berniat membayar dua bulan.
               *
               * Ambangnya memakai `segeraHabis`, yang diturunkan dari
               * HARI_INGATKAN_SEBELUM_HABIS. Jadi dashboard mulai menawarkan
               * perpanjangan pada hari yang SAMA dengan hari kabar WhatsApp
               * dikirim. Satu angka, dua tempat, tidak bisa berbeda.
               *
               * Perpanjang lebih awal tetap mungkin, tapi lewat tautan kecil,
               * bukan tombol berharga.
               */
              const aktifLama =
                current && berbayar && langganan.aktif && !langganan.segeraHabis;

              const label = current
                ? `Perpanjang ${p.name}`
                : berbayar
                  ? `Ambil ${p.name} · ${formatIDR(p.pricePerMonth)}`
                  : `Pindah ke ${p.name}`;

              return (
                <div
                  key={p.id}
                  className={`card flex flex-col p-5 ${
                    current
                      ? "border-brand-500 ring-1 ring-brand-500"
                      : p.highlight
                        ? "border-ink-950 ring-1 ring-ink-950"
                        : ""
                  }`}
                >
                  <div className="flex h-6 items-center justify-between gap-2">
                    <h3 className="font-semibold text-ink-900">{p.name}</h3>
                    {/* Aktif (biru) menang atas Paling laris (hitam), jadi tidak
                        pernah ada dua lencana di satu kartu. Paling laris dipakai
                        untuk MENGARAHKAN pilihan ke Growth, dan sengaja hitam,
                        bukan biru: satu bidang biru per layar sudah dipakai
                        cincin paket aktif. */}
                    {current ? (
                      <span className="badge bg-brand-600 text-white">Aktif</span>
                    ) : p.highlight ? (
                      <span className="badge bg-ink-950 text-white">Paling laris</span>
                    ) : null}
                  </div>
                  <p className="mt-3 text-2xl font-bold tracking-tight">
                    {p.pricePerMonth === 0 ? "Gratis" : formatIDR(p.pricePerMonth)}
                    {p.pricePerMonth > 0 && (
                      <span className="text-sm font-normal text-ink-500"> /bln</span>
                    )}
                  </p>
                  {/* Harga per balasan, dan ini yang membuat Growth terlihat
                      pilihan waktu disandingkan dengan Starter: Rp 33 lawan
                      Rp 66, separuhnya. Angkanya DITURUNKAN dari harga dan jatah,
                      bukan diketik, jadi tidak bisa berbeda dari yang ditagih. */}
                  <p className="mt-1 text-sm text-ink-500">
                    {p.aiCredits.toLocaleString("id-ID")} balasan
                    {berbayar
                      ? ` · ${formatIDR(pricePerReply(p))}/balasan`
                      : " per bulan"}
                  </p>
                  {/* Penanda hemat, cuma di paket yang benar-benar lebih murah
                      per balasan daripada Starter (Growth dan Pro). Starter
                      sendiri patokannya, jadi tidak dapat penanda. Warna hijau
                      dipakai KHUSUS untuk hemat, sama seperti lencana tahap di
                      tempat lain yang memang boleh berwarna; bukan biru, jadi
                      cincin paket aktif tetap satu-satunya bidang biru. */}
                  {hematPersen > 0 && (
                    <span className="mt-2 inline-flex items-center gap-1 rounded-md bg-green-50 px-2 py-0.5 text-xs font-semibold text-green-700">
                      Hemat {hematPersen}% per balasan
                    </span>
                  )}
                  {/* SEMUA isinya, tanpa dipotong.

                      Dulu di sini ada slice(0, 5), dan itu diam-diam menyembunyikan
                      justru pembeda yang paling menentukan: "Atur jam kerja tim" dan
                      "Info bisnis sampai 200 catatan" hilang dari kartu Growth,
                      "Kendala kamu dilayani duluan" hilang dari Pro, dan batas catatan
                      hilang dari Coba Gratis.

                      Ini layar tempat orang memutuskan mau bayar lebih atau tidak.
                      Halaman jualan menampilkan semuanya, layar ini memotongnya jadi
                      lima, jadi orang yang sudah masuk justru melihat alasan membeli
                      yang LEBIH SEDIKIT daripada orang yang belum kenal. Memotong
                      daftar demi kerapian itu memilih tinggi kartu di atas keputusan
                      orangnya.

                      Tingginya dibiarkan tidak sama. Tombolnya didorong ke bawah pakai
                      mt-auto supaya tetap sebaris walau isinya beda panjang. */}
                  {/* Centangnya HITAM, bukan biru, dan digambar, bukan karakter
                      "✓". Ini keterangan isi paket, bukan sesuatu yang bisa
                      diklik atau yang sedang dipilih — sama aturannya dengan
                      kartu harga di halaman jualan. */}
                  <ul className="mt-4 space-y-2 text-sm text-ink-700">
                    {p.features.map((f) => (
                      <li key={f} className="flex gap-2.5">
                        <span className="mt-0.5 shrink-0 text-ink-900">
                          <Ikon nama="centang" size={15} />
                        </span>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  {/* Paket aktif yang masih lama: keterangan, bukan tawaran.

                      Yang ditampilkan tanggal habisnya, karena itu satu-satunya
                      hal yang benar-benar ingin dia tahu waktu membuka kartu
                      paketnya sendiri. Perpanjang lebih awal tetap ada, tapi
                      sebagai tautan kecil supaya tidak tertukar dengan tagihan
                      yang harus dibayar. */}
                  {aktifLama && (
                    <div className="mt-auto pt-5">
                      <p className="text-sm text-ink-600">
                        Aktif sampai{" "}
                        <span className="font-medium text-ink-900">
                          {langganan.sampai?.toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          })}
                        </span>
                      </p>
                      <p className="mt-0.5 text-xs text-ink-500">
                        Sisa {langganan.sisaHari} hari. Nanti kami kabari sebelum
                        habis, jadi kamu tidak perlu mengingatnya.
                      </p>
                      <details className="group mt-3">
                        <summary className="cursor-pointer list-none text-xs font-medium text-brand-700 hover:underline">
                          Mau perpanjang lebih awal?
                        </summary>
                        <div className="mt-3">
                          <TombolGantiPaket
                            action={changePlanAction}
                            planId={p.id}
                            label={label}
                            akibat={kalimatGantiPaket(langganan, p.id)}
                          />
                        </div>
                      </details>
                    </div>
                  )}

                  {bolehDitekan && !aktifLama && (
                    <TombolGantiPaket
                      action={changePlanAction}
                      planId={p.id}
                      label={label}
                      // Dua sumber, dan dua-duanya perlu.
                      //
                      // kalauAkibat menghitung apa yang HILANG dari pemakaian
                      // yang sebenarnya: nomor yang mati, fitur yang berhenti.
                      // kalimatGantiPaket menghitung soal UANG dan TANGGAL:
                      // kapan berlakunya, dan sisa hari yang hangus kalau naik
                      // paket di tengah periode.
                      //
                      // Yang kedua itu yang paling gampang bikin orang merasa
                      // ditipu, karena dia baru menyadarinya setelah uangnya
                      // keluar.
                      akibat={[
                        ...kalimatGantiPaket(langganan, p.id),
                        ...kalimatAkibat(
                          akibatPindahPaket(plan.id, p.id, {
                            nomor: channelCount,
                            asisten: agentCount,
                            catatan: sourceCount,
                          }),
                        ),
                      ]}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {workspace.bulanGratis > 0 && (
            <p className="mt-4 text-xs leading-relaxed text-ink-500">
              Kamu punya {workspace.bulanGratis} bulan gratis dari ajak teman.
              Bulan itu dipakai lebih dulu, jadi kalau kamu ambil paket berbayar
              sekarang tidak ada yang perlu kamu transfer.
            </p>
          )}

          {!midtransSiap() && (
            <p className="mt-4 text-xs leading-relaxed text-ink-500">
              Pembayaran otomatis belum diatur di server ini. Hubungi kami untuk
              berlangganan dan kami aktifkan manual.
            </p>
          )}

          {/* Peringatan mode uji.
              Sandbox Midtrans menerima nomor kartu contoh dan tidak pernah
              memindahkan uang sungguhan. Tanpa baris ini, "lunas" di halaman ini
              terbaca sama persis di server uji dan di server sungguhan, dan
              itu bentuk kegagalan yang paling mahal: kamu mengira sudah bisa
              menerima uang padahal belum sepeser pun. */}
          {midtransModeUji() && !salahLingkunganKunci() && (
            <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-900">
              Pembayaran masih memakai mode uji Midtrans (sandbox). Transaksi di
              sini TIDAK memindahkan uang sungguhan. Isi MIDTRANS_PRODUCTION=on
              di .env kalau server ini sudah dipakai pelanggan.
            </p>
          )}

          {/* Kunci salah lingkungan. Tanpa baris ini yang terlihat cuma
              "halaman pembayarannya gagal dibuka", dan orang mencari
              kesalahannya di kode, di firewall, di Caddy, di mana-mana kecuali
              di satu baris .env yang benar-benar salah. */}
          {salahLingkunganKunci() && (
            <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-900">
              Pembayaran belum bisa dipakai: {salahLingkunganKunci()}
            </p>
          )}
        </div>

        {/* Riwayat, termasuk yang gagal.
            Yang gagal justru yang paling dibutuhkan waktu ada yang bilang
            "uangnya sudah keluar tapi paketnya tidak naik". Riwayat yang cuma
            memuat yang berhasil bikin percakapan itu jadi saling menebak. */}
        {riwayat.length > 0 && (
          <div>
            <h2 className="font-semibold text-ink-900">Riwayat pembayaran</h2>
            <div className="card mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-ink-100 text-left text-xs text-ink-500">
                    <th className="px-4 py-2.5 font-medium">Tanggal</th>
                    <th className="px-4 py-2.5 font-medium">Paket</th>
                    <th className="px-4 py-2.5 font-medium">Jumlah</th>
                    <th className="px-4 py-2.5 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {riwayat.map((p) => (
                    <tr key={p.id} className="border-b border-ink-100 last:border-0">
                      <td className="whitespace-nowrap px-4 py-2.5 text-ink-700">
                        {tanggalIndo(p.createdAt)}
                      </td>
                      <td className="px-4 py-2.5 text-ink-700">
                        {getPlan(p.planId).name}
                        {p.sumber === SUMBER_BULAN_GRATIS && (
                          <span className="text-ink-500"> · bulan gratis</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-ink-900">
                        {p.jumlah === 0 ? "Gratis" : formatIDR(p.jumlah)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-ink-700">
                        {LABEL_STATUS[p.status] ?? p.status}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-ink-500">
              Butuh bukti bayar resmi atau minta uang kembali? Aturannya ada di{" "}
              <Link href="/pengembalian" className="text-brand-600 hover:underline">
                kebijakan pengembalian dana
              </Link>
              .
            </p>
          </div>
        )}
      </div>
    </>
  );
}
