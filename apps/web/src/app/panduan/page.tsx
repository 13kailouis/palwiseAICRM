import type { Metadata } from "next";
import Link from "next/link";
import { getPlan } from "@palwise/db";
import { keApp } from "@/lib/situs";
import { Ikon, type NamaIkon } from "@/components/Ikon";
import { KakiHalaman, Penanda } from "@/components/HalamanTeks";
import { ContohChat } from "@/components/ContohChat";
import {
  MockupDashboard,
  MockupInfoBisnis,
  MockupJanji,
} from "@/components/Mockup";
import { PRESET } from "@/lib/preset";
import { IDENTITAS, tautanBantuanWa } from "@/lib/identitas";

/**
 * Panduan pemakaian, untuk umum.
 *
 * KENAPA HALAMAN, BUKAN TULISAN BLOG. Yang butuh panduan itu orang yang sedang
 * macet di tengah pemasangan, dan dia mencarinya lewat satu tautan yang bisa
 * dikirim ke WhatsApp. Tulisan blog bertanggal terbaca sebagai kabar lama begitu
 * umurnya sebulan, sedangkan halaman panduan terbaca sebagai dokumen yang
 * berlaku.
 *
 * KENAPA TERBUKA TANPA LOGIN. Sebagian orang membaca panduan SEBELUM mendaftar,
 * justru untuk mengukur apakah dia mampu memasangnya sendiri. Menyembunyikannya
 * di balik login berarti kehilangan mereka di titik paling awal, dan tautannya
 * juga jadi tidak bisa dibagikan ke rekan atau pegawainya.
 *
 * KENAPA GAMBARNYA MOCKUP, BUKAN TANGKAPAN LAYAR. Ini keputusan, bukan jalan
 * pintas. Tangkapan layar membusuk: begitu satu tombol dipindah atau satu
 * kalimat diubah, gambarnya berbohong, dan panduan yang gambarnya tidak cocok
 * dengan layar sungguhan justru membuat orang mengira dia salah membuka halaman.
 * Mockup di sini digambar dari komponen yang sama dengan yang dipakai halaman
 * jualan, jadi dia ikut berubah bersama produknya, tidak memuat data pelanggan
 * siapa pun, dan tetap terbaca di layar HP.
 *
 * Kalau suatu hari mau menambah tangkapan layar sungguhan, taruh sebagai
 * TAMBAHAN di langkah yang memang rumit (scan QR), jangan menggantikan yang di
 * sini, dan siapkan cara memperbaruinya waktu tampilannya berubah.
 */

export const metadata: Metadata = {
  title: "Panduan pakai Palwise dari awal",
  description:
    "Langkah demi langkah menyambungkan nomor WhatsApp, mengisi info bisnis, mengetes asisten, dan menyalakannya. Termasuk contoh isi info bisnis per bidang usaha.",
};

const SIAPKAN: { ikon: NamaIkon; judul: string; body: string }[] = [
  {
    ikon: "whatsapp",
    judul: "Nomor WhatsApp usaha",
    body: "Bukan nomor pribadi, dan bukan nomor yang baru banget dibeli. Nomor baru belum dikenal WhatsApp jadi lebih gampang kena batasan. Pakai nomor yang udah kamu pakai wajar beberapa hari dari HP.",
  },
  {
    ikon: "info",
    judul: "Daftar harga dan aturanmu",
    body: "Boleh masih berantakan. Boleh dari catatan HP, dari file Excel, dari PDF, atau cukup alamat websitemu. Yang penting angkanya benar, karena asistennya cuma boleh jawab dari sini.",
  },
  {
    ikon: "jam",
    judul: "Sekitar 15 menit",
    body: "Menyambungkan nomornya semenit. Sisanya buat ngisi info bisnis dan ngetes. Nggak usah selesai sekali duduk, yang udah kamu simpan nggak akan hilang.",
  },
];

/** Contoh isi Info bisnis yang benar-benar bisa ditempel. */
const CONTOH_ISI = `HARGA DAN STOK
Arabika Gayo 200gr Rp 85.000 stok 12
Arabika Gayo 500gr Rp 190.000 stok 4
Robusta Temanggung 200gr Rp 55.000 stok 0
Paket sampler 3 x 50gr Rp 75.000 stok 8

PENGIRIMAN
Dikirim dari Bandung pakai JNE dan J&T.
Area Bandung bisa COD.
Gratis ongkir untuk belanja di atas Rp 300.000.
Pesanan sebelum jam 2 siang dikirim hari yang sama.

CARA PESAN DAN BAYAR
Transfer BCA atau QRIS. Nomor rekening dikirim setelah total dihitung.
Pesanan diproses setelah bukti transfer diterima.

JAM BUKA
Senin sampai Sabtu jam 9 pagi sampai 5 sore. Minggu tutup.

RETUR
Kemasan rusak diganti penuh. Lapor maksimal 3 hari dengan foto.
Kopi yang sudah dibuka tidak bisa ditukar.`;

const SALAH_BENAR: { salah: string; benar: string; kenapa: string }[] = [
  {
    salah: "Harga bervariasi, chat aja buat nanya",
    benar: "Arabika Gayo 200gr Rp 85.000",
    kenapa:
      "Asisten cuma boleh menjawab dari yang tertulis. Kalau harganya nggak ada angkanya, dia nggak akan pernah bisa menjawab pertanyaan yang paling sering masuk.",
  },
  {
    salah: "Ongkir sesuai wilayah",
    benar:
      "Dikirim dari Bandung pakai JNE dan J&T. Area Bandung bisa COD. Gratis ongkir di atas Rp 300.000",
    kenapa:
      "“Sesuai wilayah” bukan aturan yang bisa dipakai. Yang bisa dipakai: dikirim dari mana, pakai apa, dan batas gratis ongkirnya berapa.",
  },
  {
    salah: "Buka setiap hari",
    benar: "Senin sampai Sabtu jam 9 sampai 17. Minggu tutup",
    kenapa:
      "Pelanggan menanyakan jam, bukan hari. Dan kalau Minggu sebenarnya tutup, “setiap hari” bikin asistenmu menjanjikan yang nggak ada.",
  },
  {
    salah: "Stoknya banyak kok, ready semua",
    benar:
      "Arabika Gayo 200gr Rp 85.000 stok 12. Robusta Temanggung 200gr Rp 55.000 stok 0",
    kenapa:
      "“Ready semua” besok jadi bohong. Tulis stoknya per barang, dan tulis 0 buat yang lagi habis. Asistenmu cuma boleh bilang sesuatu kosong kalau catatanmu memang menulis begitu, jadi barang yang nggak kamu tulis bakal dijawab “saya cek dulu ke tim”, bukan dijawab kosong.",
  },
  {
    salah: "Nulis 5 barang yang paling laku aja, sisanya nanti",
    benar: "Semua barangmu, satu baris satu barang, walaupun jadi ratusan baris",
    kenapa:
      "Barang yang nggak kamu tulis nggak akan pernah bisa dia jawab, dan yang nanya barang itu bakal dilempar ke kamu terus. Daftar panjang nggak bikin dia bingung, dia nyari per baris. Kalau datamu udah ada di Excel, salin kolomnya terus tempel apa adanya.",
  },
];

const SERING_BINGUNG: { t: string; j: string }[] = [
  {
    t: "QR-nya nggak mau kescan",
    j: "Pastikan kamu buka menu Perangkat tertaut di WhatsApp, bukan kamera biasa. Kalau QR-nya kelihatan pudar atau kedaluwarsa, muat ulang halamannya biar keluar QR baru. Satu QR cuma berlaku sebentar.",
  },
  {
    t: "Nomornya nyambung, tapi chat pelanggan nggak dibalas",
    j: "Tiga yang paling sering. Satu, info bisnisnya masih kosong jadi nggak ada yang bisa dia jawab. Dua, jatah balasan bulan ini habis, cek di halaman Paket & pemakaian. Tiga, kamu masih pegang obrolannya sendiri, karena begitu kamu ikut membalas asistennya otomatis minggir di obrolan itu.",
  },
  {
    t: "Jawabannya kurang pas atau kaku",
    j: "Yang paling menentukan bukan pengaturannya, tapi isi info bisnismu. Tambahkan yang kurang, lalu tes lagi di halaman Coba dulu. Kalau gaya bahasanya yang kurang cocok, ubah di halaman Asisten bagian cara bicara, misalnya minta dia lebih singkat atau nggak pakai emoji.",
  },
  {
    t: "Asistennya bilang nggak tahu padahal ada di info bisnis",
    j: "Cek dulu catatannya sudah bertanda selesai dihafal di halaman Info bisnis. Kalau baru ditempel, tunggu sebentar. Daftar harga yang panjang nggak masalah, dia nyari per baris. Yang bikin susah ketemu itu catatan yang isinya cerita panjang tentang usahamu, jadi pisahin yang begitu dari daftar harganya.",
  },
  {
    t: "Aku mau pegang sendiri satu pelanggan",
    j: "Balas aja langsung dari Chat masuk. Begitu kamu mengetik, asistennya berhenti di obrolan itu. Kalau mau dia jalan lagi, tekan Serahkan ke AI.",
  },
  {
    t: "Nomorku aman dari blokir?",
    j: "Palwise cuma membalas orang yang chat duluan dan nggak pernah menyebar pesan, dan itu penyebab pemblokiran yang paling sering. Tapi Palwise bukan produk resmi WhatsApp, jadi risikonya nggak bisa kami hilangkan. Jangan pakai buat blast promo, dan jangan ngetes dengan menyuruh dua nomor saling balas.",
  },
];

function Langkah({
  nomor,
  judul,
  children,
  gambar,
}: {
  nomor: number;
  judul: string;
  children: React.ReactNode;
  gambar?: React.ReactNode;
}) {
  return (
    <section className="border-t border-ink-200 py-14">
      <div className="mx-auto max-w-5xl px-5">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-start">
          <div>
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-ink-900 text-sm font-semibold text-white">
                {nomor}
              </span>
              <p className="text-sm font-semibold text-ink-400">
                Langkah {nomor}
              </p>
            </div>
            <h2 className="mt-4 text-2xl font-semibold tracking-tight text-ink-950">
              {judul}
            </h2>
            <div className="mt-4 space-y-4 text-[15px] leading-relaxed text-ink-600">
              {children}
            </div>
          </div>
          {gambar && <div className="flex justify-center">{gambar}</div>}
        </div>
      </div>
    </section>
  );
}

function Catatan({ children }: { children: React.ReactNode }) {
  return (
    <p className="border-l-2 border-ink-300 pl-4 text-[15px] leading-relaxed text-ink-500">
      {children}
    </p>
  );
}

export default function PanduanPage() {
  const gratis = getPlan("free");
  const wa = tautanBantuanWa("Halo, saya butuh dibantu pasang Palwise.");
  const bidang = PRESET.filter((p) => p.diHalamanDepan);

  return (
    <main className="min-h-screen bg-white">
      <Penanda />

      {/* Kepala halaman */}
      <section className="mx-auto max-w-5xl px-5 pb-4 pt-12">
        <p className="text-sm font-semibold text-ink-400">Panduan</p>
        <h1 className="mt-3 max-w-2xl text-3xl font-bold leading-tight tracking-tight text-ink-950 sm:text-4xl">
          Dari daftar sampai asistenmu jualan sendiri
        </h1>
        <p className="mt-4 max-w-2xl text-lg leading-relaxed text-ink-600">
          Lima langkah, sekitar 15 menit. Nggak perlu ngerti teknis apa pun, dan
          nggak ada yang perlu diinstal. Kalau di tengah jalan macet, bagian
          terakhir halaman ini isinya yang paling sering bikin bingung.
        </p>

        {/* Daftar isi. Panduan yang panjang tanpa daftar isi memaksa orang
            menggulir mencari bagian yang dia butuh, dan orang yang sedang macet
            paling nggak sabar. */}
        <nav className="mt-8 rounded-2xl border border-ink-200 bg-ink-50 p-5">
          <p className="text-sm font-semibold text-ink-900">Isi panduan</p>
          <ol className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
            {[
              ["#siapkan", "Yang perlu disiapkan dulu"],
              ["#daftar", "1. Daftar akun"],
              ["#nomor", "2. Sambungin nomor WhatsApp"],
              ["#info", "3. Isi info bisnis"],
              ["#tes", "4. Tes dulu sebelum dipakai"],
              ["#jalan", "5. Nyalakan dan pantau"],
              ["#contoh", "Contoh isi info bisnis"],
              ["#bingung", "Yang sering bikin bingung"],
            ].map(([href, label]) => (
              <li key={href}>
                <a href={href} className="text-ink-600 hover:text-ink-900">
                  {label}
                </a>
              </li>
            ))}
          </ol>
        </nav>
      </section>

      {/* Yang perlu disiapkan */}
      <section id="siapkan" className="mx-auto max-w-5xl px-5 py-14">
        <h2 className="text-2xl font-semibold tracking-tight text-ink-950">
          Siapin tiga ini dulu
        </h2>
        <p className="mt-3 max-w-2xl leading-relaxed text-ink-600">
          Kalau tiga ini udah ada, sisanya gampang. Yang paling sering bikin
          orang berhenti di tengah itu yang kedua.
        </p>
        <div className="mt-8 grid gap-8 sm:grid-cols-3">
          {SIAPKAN.map((s) => (
            <div key={s.judul}>
              <div className="mb-4 grid h-11 w-11 place-items-center rounded-xl border border-ink-200 text-ink-900">
                <Ikon nama={s.ikon} size={22} />
              </div>
              <h3 className="font-semibold text-ink-900">{s.judul}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-600">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      <Langkah nomor={1} judul="Daftar akun" gambar={<MockupDashboard />}>
        <p>
          Buka halaman daftar, isi nama, nama usaha, dan email. Nggak ada kartu
          kredit, nggak ada masa percobaan yang habis. Kamu langsung masuk paket
          gratis: {gratis.aiCredits} balasan per bulan, selamanya.
        </p>
        <p>
          Pakai email yang beneran kamu buka. Kalau suatu hari kamu lupa
          password, alamat itu satu-satunya jalan kami mengembalikan akunmu, dan
          kalau salah ketik kami nggak bisa nolong.
        </p>
        <Catatan>
          Konfirmasi emailnya nggak dipaksa waktu daftar, tapi wajib kalau nanti
          kamu mau pindah ke paket berbayar. Tagihan dikirim ke situ.
        </Catatan>
      </Langkah>

      <Langkah nomor={2} judul="Sambungin nomor WhatsApp">
        <p>
          Buka <strong>Nomor WhatsApp</strong>, tekan Tambah nomor, lalu QR-nya
          muncul di layar. Di HP: buka WhatsApp, masuk menu{" "}
          <strong>Perangkat tertaut</strong>, tekan Tautkan perangkat, dan scan
          QR di layar komputermu. Persis seperti WhatsApp Web.
        </p>
        <p>
          Chat lamamu nggak ke mana-mana dan nomornya tetap bisa kamu pakai di HP
          seperti biasa. Palwise cuma nebeng, sama seperti WhatsApp Web.
        </p>
        <div className="rounded-xl border border-ink-200 bg-ink-50 p-4">
          <p className="text-sm font-semibold text-ink-900">
            Tiga hal yang jangan dilakukan
          </p>
          <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-ink-600">
            <li>
              Jangan pakai nomor yang baru banget dibeli. WhatsApp belum kenal
              nomor baru, jadi kegiatan yang wajar pun bisa kebaca mencurigakan.
            </li>
            <li>
              Jangan pakai buat kirim promo massal ke orang yang belum pernah
              chat kamu. Ini cara paling cepat bikin nomor kena batasan.
            </li>
            <li>
              Jangan ngetes dengan menyuruh dua nomor saling balas. Pola itu
              kebaca WhatsApp sebagai spam otomatis. Buat ngetes, pakai halaman{" "}
              <strong>Coba dulu</strong>.
            </li>
          </ul>
        </div>
      </Langkah>

      <Langkah
        nomor={3}
        judul="Isi info bisnis, dan ini bagian yang paling menentukan"
        gambar={<MockupInfoBisnis />}
      >
        <p>
          Asistenmu cuma boleh menjawab dari sini. Kalau sesuatu nggak ada di
          info bisnis, dia bilang belum tahu dan melempar obrolannya ke kamu,
          bukan mengarang. Jadi mutu jawabannya hampir seluruhnya ditentukan
          isian ini, bukan pengaturan lain.
        </p>
        <p>Ada lima cara ngisinya, pilih yang paling gampang buat kamu:</p>
        <ul className="space-y-1.5">
          <li>
            <strong>Ketik sendiri.</strong> Tempel daftar harga dan aturanmu apa
            adanya. Nggak perlu rapi.
          </li>
          <li>
            <strong>Dari website.</strong> Masukin alamat websitemu, biar dia
            baca sendiri.
          </li>
          <li>
            <strong>Dari berkas.</strong> Unggah PDF, Word, txt, atau csv.
          </li>
          <li>
            <strong>Tanya jawab.</strong> Buat pasangan pertanyaan dan jawaban
            yang sering ditanya.
          </li>
          <li>
            <strong>Dari AI lain.</strong> Kalau kamu udah lama cerita soal
            bisnismu ke ChatGPT, Claude, atau Gemini, itu bisa dipindahin.
          </li>
        </ul>
        <Catatan>
          Paket gratis muat sampai {gratis.maxKnowledgeSources} catatan. Pecah
          menurut topik, jangan satu catatan raksasa: harga sendiri, ongkir
          sendiri, aturan retur sendiri. Asistennya jadi lebih gampang menemukan
          yang tepat.
        </Catatan>
      </Langkah>

      {/* Salah vs benar. Ini bagian yang paling sering menyelamatkan orang,
          karena "isi info bisnis" itu perintah yang terlalu kabur sampai dia
          melihat contoh yang salah di sebelah yang benar. */}
      <section className="border-t border-ink-200 bg-ink-50/60 py-14">
        <div className="mx-auto max-w-5xl px-5">
          <h2 className="text-2xl font-semibold tracking-tight text-ink-950">
            Cara nulis yang bikin asistenmu pinter
          </h2>
          <p className="mt-3 max-w-2xl leading-relaxed text-ink-600">
            Bedanya bukan panjang atau rapinya, tapi apakah tulisanmu bisa
            dipakai menjawab. Tiga contoh yang paling sering keliru:
          </p>
          <div className="mt-8 space-y-4">
            {SALAH_BENAR.map((s) => (
              <div key={s.salah} className="card-pad">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-semibold text-ink-500">
                      Kurang kepakai
                    </p>
                    <p className="mt-1.5 text-sm leading-relaxed text-ink-500 line-through decoration-ink-300">
                      {s.salah}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-ink-900">
                      Kepakai
                    </p>
                    <p className="mt-1.5 text-sm font-medium leading-relaxed text-ink-900">
                      {s.benar}
                    </p>
                  </div>
                </div>
                <p className="mt-4 border-t border-ink-100 pt-3 text-sm leading-relaxed text-ink-600">
                  {s.kenapa}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Langkah
        nomor={4}
        judul="Tes dulu sebelum pelanggan asli kena"
        gambar={<ContohChat />}
      >
        <p>
          Buka <strong>Coba dulu</strong> dan ngobrol sama asistenmu seolah kamu
          pelanggan yang paling rewel. Tanya harga, tanya yang nggak ada di
          daftar, minta diskon, minta ngomong sama owner. Lihat jawabannya.
        </p>
        <p>
          Halaman ini punya jatah harian sendiri dan{" "}
          <strong>nggak motong jatah balasan pelangganmu</strong>, jadi tes
          sepuasnya. Ini juga tempat yang benar buat ngetes, bukan dengan chat
          dari nomor lain.
        </p>
        <p className="font-medium text-ink-900">Empat hal yang wajib kamu cek:</p>
        <ul className="space-y-1.5">
          <li>Harga yang dia sebut sama persis dengan daftarmu.</li>
          <li>
            Yang nggak ada di info bisnis dijawab &ldquo;belum tahu&rdquo;, bukan
            dikarang.
          </li>
          <li>Gaya bahasanya cocok sama caramu jualan.</li>
          <li>
            Waktu kamu minta ngomong sama manusia, obrolannya ditandai perlu
            dibalas.
          </li>
        </ul>
      </Langkah>

      <Langkah nomor={5} judul="Nyalakan dan pantau" gambar={<MockupJanji />}>
        <p>
          Nggak ada tombol &ldquo;luncurkan&rdquo;. Begitu nomornya nyambung dan
          info bisnisnya keisi, chat yang masuk langsung dibalas. Yang perlu kamu
          buka tiap hari cuma tiga halaman:
        </p>
        <ul className="space-y-1.5">
          <li>
            <strong>Chat masuk.</strong> Semua obrolan di satu layar. Yang butuh
            kamu ditandai. Begitu kamu ikut mengetik, asistennya minggir di
            obrolan itu.
          </li>
          <li>
            <strong>Pelanggan.</strong> Nama, nomor, dan apa yang dia cari
            tercatat sendiri, plus tahapnya sampai mana.
          </li>
          <li>
            <strong>Paket &amp; pemakaian.</strong> Sisa jatah balasan bulan ini.
          </li>
        </ul>
        <Catatan>
          Janji temu yang disepakati di chat tercatat sendiri, tapi statusnya{" "}
          <strong>belum dipastikan</strong> sampai kamu menekan Pastikan.
          Asistenmu nggak bisa lihat kalendermu, jadi dia nggak pernah berani
          menjanjikan jam ke pelanggan. Kamu yang memastikan, dan pelanggannya
          bisa dikabari sekalian.
        </Catatan>
      </Langkah>

      {/* Contoh yang bisa ditempel */}
      <section id="contoh" className="border-t border-ink-200 py-14">
        <div className="mx-auto max-w-5xl px-5">
          <h2 className="text-2xl font-semibold tracking-tight text-ink-950">
            Contoh isi info bisnis
          </h2>
          <p className="mt-3 max-w-2xl leading-relaxed text-ink-600">
            Ini contoh toko kopi. Bentuknya yang penting, bukan isinya: judul
            besar per topik, lalu angka dan aturan yang jelas di bawahnya. Tiru
            bentuknya, ganti isinya sama jualanmu.
          </p>
          <pre className="mt-6 overflow-x-auto rounded-2xl border border-ink-200 bg-ink-950 p-5 text-[13px] leading-relaxed text-ink-300">
            {CONTOH_ISI}
          </pre>

          <h3 className="mt-12 font-semibold text-ink-900">
            Bidang usahamu udah ada contohnya di dalam
          </h3>
          <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-ink-600">
            Di halaman Asisten ada pilihan bidang usaha. Pilih yang paling deket,
            dan cara bicara, aturan eskalasi, serta kalimat sapaan langsung keisi
            sesuai bidangmu. Kamu tinggal betulin yang perlu.
          </p>
          <div className="mt-6 grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
            {bidang.map((b) => (
              <div key={b.nama} className="flex gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-ink-200 text-ink-900">
                  <Ikon nama={b.ikon} size={20} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink-900">{b.nama}</p>
                  <p className="mt-0.5 text-sm leading-relaxed text-ink-500">
                    {b.contoh}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-6 text-sm leading-relaxed text-ink-500">
            Bidangmu nggak ada di daftar? Pilih{" "}
            <strong>Usaha lain</strong>, terus isi info bisnismu seperti biasa.
            Mesinnya sama, yang beda cuma contohnya.
          </p>
        </div>
      </section>

      {/* Yang sering bikin bingung */}
      <section id="bingung" className="border-t border-ink-200 bg-ink-50/60 py-14">
        <div className="mx-auto max-w-3xl px-5">
          <h2 className="text-2xl font-semibold tracking-tight text-ink-950">
            Yang sering bikin bingung
          </h2>
          <p className="mt-3 leading-relaxed text-ink-600">
            Termasuk yang jawabannya kurang enak didenger. Mending kamu tahu
            sekarang.
          </p>
          <div className="mt-8 divide-y divide-ink-200 border-y border-ink-200">
            {SERING_BINGUNG.map((qa) => (
              <details key={qa.t} className="group py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium text-ink-950">
                  {qa.t}
                  <span className="shrink-0 text-ink-400 transition group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mt-3 text-[15px] leading-relaxed text-ink-600">
                  {qa.j}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Masih macet */}
      <section className="border-t border-ink-200 py-16">
        <div className="mx-auto max-w-2xl px-5 text-center">
          <h2 className="text-2xl font-semibold tracking-tight text-ink-950">
            Masih macet? Jangan didiemin
          </h2>
          <p className="mt-3 leading-relaxed text-ink-600">
            Lebih cepat ditanyain daripada ditebak sendiri. Kalau kamu udah masuk
            dashboard, ada tombol kirim masukan di sudut kanan bawah tiap halaman,
            dan itu kebaca semuanya.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href={keApp("/daftar")}
              className="btn-primary px-6 py-3 text-base"
            >
              Mulai gratis
            </Link>
            {/* Tombol WhatsApp cuma muncul kalau nomornya benar-benar ada.
                Tombol chat yang nggak ada yang bales lebih merusak daripada
                nggak ada tombolnya. */}
            {wa ? (
              <a
                href={wa}
                target="_blank"
                rel="noreferrer"
                className="btn-ghost px-6 py-3 text-base"
              >
                Tanya lewat WhatsApp
              </a>
            ) : (
              <a
                href={`mailto:${IDENTITAS.email}`}
                className="btn-ghost px-6 py-3 text-base"
              >
                Email kami
              </a>
            )}
          </div>
          <p className="mt-4 text-sm text-ink-500">
            Dijawab {IDENTITAS.jamLayanan.toLowerCase()}.
          </p>
        </div>
      </section>

      <KakiHalaman />
    </main>
  );
}
