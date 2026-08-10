import { Ikon } from "@/components/Ikon";

/**
 * Gambar tampilan produk untuk halaman jualan.
 *
 * Digambar pakai CSS, bukan tangkapan layar. Tiga alasannya:
 * tangkapan layar jadi buram di layar rapat, ikut membocorkan nomor dan nama
 * pelanggan sungguhan, dan basi tiap kali tampilan aplikasinya berubah sedikit.
 * Yang digambar tetap tajam di ukuran berapa pun dan bisa diedit seperti teks.
 *
 * Semuanya menggambarkan layar yang benar-benar ada di aplikasi. Jangan
 * menggambar fitur yang belum jadi di sini. Halaman jualan yang menjanjikan
 * layar yang tidak ada adalah cara tercepat kehilangan kepercayaan orang di
 * hari pertama mereka masuk.
 */

function Jendela({
  judul,
  children,
  className = "",
}: {
  judul: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`overflow-hidden rounded-xl border border-ink-200 bg-white shadow-sm ${className}`}
    >
      <div className="flex items-center gap-2 border-b border-ink-200 bg-ink-50 px-3.5 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-ink-300" />
        <span className="h-2.5 w-2.5 rounded-full bg-ink-200" />
        <span className="h-2.5 w-2.5 rounded-full bg-ink-200" />
        <span className="ml-2 truncate text-[11px] text-ink-500">{judul}</span>
      </div>
      {children}
    </div>
  );
}

const OBROLAN = [
  { nama: "Bu Ratna", cuplikan: "Kalau kirim ke Bandung ongkirnya…", jam: "23.42", aktif: true },
  { nama: "Pak Deni", cuplikan: "Sudah saya transfer ya kak", jam: "22.10", tandai: true },
  { nama: "Sinta", cuplikan: "Yang sampler isinya apa aja?", jam: "20.55" },
  { nama: "Toko Bu Yuni", cuplikan: "Bisa harga reseller?", jam: "19.30", tandai: true },
];

/** Kotak masuk: daftar obrolan di kiri, percakapan di kanan. */
export function MockupDashboard() {
  return (
    <Jendela judul="app.palwise.id/app/inbox">
      <div className="grid sm:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]">
        {/* Daftar obrolan.
            DISEMBUNYIKAN DI HP. Di layar 375px dua kolom ini masing-masing
            tinggal sekitar 140px dan 190px, jadi tulisan 10px di dalamnya
            terpotong di mana-mana dan gambarnya berhenti menunjukkan apa pun.
            Yang harus terbaca di gambar ini cuma satu hal: asistennya menjawab
            dengan benar. Itu ada di kolom percakapan, jadi daftar obrolannya
            yang dilepas, bukan dikecilkan lagi. */}
        <div className="hidden border-r border-ink-200 sm:block">
          <div className="flex items-center gap-2 border-b border-ink-200 px-3 py-2.5">
            <span className="rounded-md bg-ink-900 px-2 py-1 text-[10px] font-medium text-white">
              Semua
            </span>
            <span className="rounded-md px-2 py-1 text-[10px] text-ink-500">
              Perlu dibalas
            </span>
          </div>
          {OBROLAN.map((o) => (
            <div
              key={o.nama}
              className={`flex gap-2.5 border-b border-ink-100 px-3 py-2.5 ${
                o.aktif ? "bg-ink-50" : ""
              }`}
            >
              <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-ink-100 text-[10px] font-semibold text-ink-600">
                {o.nama[0]}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="truncate text-[11.5px] font-medium text-ink-900">
                    {o.nama}
                  </p>
                  <span className="shrink-0 text-[9.5px] text-ink-400">{o.jam}</span>
                </div>
                <p className="truncate text-[10.5px] text-ink-500">{o.cuplikan}</p>
              </div>
              {o.tandai && (
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />
              )}
            </div>
          ))}
        </div>

        {/* Percakapan */}
        <div className="flex flex-col">
          <div className="flex items-center justify-between border-b border-ink-200 px-3.5 py-2.5">
            <div>
              <p className="text-[11.5px] font-medium text-ink-900">Bu Ratna</p>
              <p className="text-[10px] text-ink-500">+62 812 8834 2210</p>
            </div>
            <span className="rounded-full bg-ink-100 px-2 py-0.5 text-[9.5px] font-medium text-ink-700">
              Dibalas AI
            </span>
          </div>

          <div className="flex-1 space-y-2 bg-ink-50 px-3.5 py-3">
            <div className="flex justify-start">
              <div className="max-w-[85%] rounded-xl rounded-bl-sm border border-ink-200 bg-white px-2.5 py-1.5 text-[10.5px] leading-relaxed text-ink-800">
                Kalau kirim ke Bandung ongkirnya berapa ya
              </div>
            </div>
            <div className="flex justify-end">
              <div className="max-w-[85%] rounded-xl rounded-br-sm bg-[#d9fdd3] px-2.5 py-1.5 text-[10.5px] leading-relaxed text-ink-900">
                Kami kirimnya dari Bandung kak, jadi buat area Bandung bisa COD.
                Di atas Rp 300.000 gratis ongkir.
              </div>
            </div>
            <div className="flex justify-start">
              <div className="max-w-[85%] rounded-xl rounded-bl-sm border border-ink-200 bg-white px-2.5 py-1.5 text-[10.5px] leading-relaxed text-ink-800">
                Oke deh, saya ambil 2 ya
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 border-t border-ink-200 px-3.5 py-2.5">
            <div className="flex-1 rounded-lg border border-ink-200 px-2.5 py-1.5 text-[10.5px] text-ink-400">
              Tulis balasan
            </div>
            <span className="rounded-lg bg-ink-900 px-2.5 py-1.5 text-[10px] font-medium text-white">
              Ambil alih
            </span>
          </div>
        </div>
      </div>
    </Jendela>
  );
}

/** Halaman Info bisnis: sumber pengetahuan yang sudah terbaca. */
export function MockupInfoBisnis() {
  const sumber = [
    { judul: "Katalog & harga", asal: "Ditempel manual", potongan: 14, siap: true },
    { judul: "kopinusantara.id", asal: "Dibaca dari website", potongan: 26, siap: true },
    { judul: "Aturan retur & ongkir", asal: "Ditempel manual", potongan: 6, siap: true },
    { judul: "Dari ChatGPT", asal: "Dipindahkan dari AI lain", potongan: 0, siap: false },
  ];

  return (
    <Jendela judul="app.palwise.id/app/knowledge">
      <div className="divide-y divide-ink-100">
        {sumber.map((s) => (
          <div key={s.judul} className="flex items-center gap-3 px-4 py-3">
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-ink-200 text-ink-700">
              <Ikon nama="info" size={16} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12px] font-medium text-ink-900">{s.judul}</p>
              <p className="truncate text-[10.5px] text-ink-500">{s.asal}</p>
            </div>
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-[9.5px] font-medium ${
                s.siap ? "bg-ink-100 text-ink-700" : "bg-brand-50 text-brand-700"
              }`}
            >
              {s.siap ? `${s.potongan} potongan` : "Sedang dibaca"}
            </span>
          </div>
        ))}
      </div>
      <div className="border-t border-ink-200 bg-ink-50 px-4 py-2.5 text-[10.5px] leading-relaxed text-ink-500">
        Asisten cuma boleh menjawab dari sini. Kalau tidak ada di daftar ini, dia
        bilang tidak tahu, bukan mengarang.
      </div>
    </Jendela>
  );
}

/** Sapaan setelah pembelian dan ajakan beli lagi. */
/**
 * Daftar janji temu di Ringkasan.
 *
 * Sengaja memakai tiga bidang usaha yang berbeda dalam satu gambar: klinik,
 * properti, dan meeting online. Satu contoh saja bikin bidang lain merasa
 * gambar ini bukan tentang mereka, padahal mesinnya sama persis.
 */
export function MockupJanji() {
  const janji = [
    {
      nama: "Bu Ratna",
      untuk: "kontrol gigi dengan dokter Rina",
      kapan: "Hari ini jam 14.00",
      pasti: true,
    },
    {
      nama: "Pak Anwar",
      untuk: "survei unit tipe 36",
      kapan: "Besok jam 09.30",
      pasti: true,
    },
    {
      // Bukan "Kai" lagi: nama itu sekarang tanda tangan pendirinya di halaman
      // yang sama, dan nama yang sama muncul dua kali sebagai dua orang berbeda
      // bikin gambar ini terbaca sebagai contoh yang asal comot.
      nama: "Pak Arif",
      untuk: "meeting online lewat Google Meet",
      kapan: "Sabtu jam 10.00",
      pasti: false,
    },
  ];

  return (
    <Jendela judul="app.palwise.id/app">
      <div className="px-4 py-3">
        <p className="text-[11px] font-semibold text-ink-900">Janji temu</p>
        <ul className="mt-2 divide-y divide-ink-100">
          {janji.map((j) => (
            <li key={j.nama} className="flex items-start justify-between gap-3 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-[12px] font-medium text-ink-900">
                  {j.nama}
                </p>
                <p className="truncate text-[10.5px] text-ink-500">{j.untuk}</p>
                {!j.pasti && (
                  <span className="mt-1 inline-block rounded-full bg-amber-50 px-2 py-0.5 text-[9.5px] font-medium text-amber-800">
                    belum kamu pastikan
                  </span>
                )}
              </div>
              <span className="shrink-0 text-[11px] text-ink-700">{j.kapan}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="border-t border-ink-200 bg-ink-50 px-4 py-2.5 text-[10.5px] leading-relaxed text-ink-500">
        Terisi sendiri dari obrolan. Yang belum kamu pastikan ditandai, bukan
        diam-diam dianggap beres.
      </div>
    </Jendela>
  );
}

export function MockupSapaLagi() {
  const baris = [
    { hari: "Hari ke-0", teks: "Pesanan selesai, paket dikirim", jenis: "netral" },
    { hari: "Hari ke-3", teks: "“Paketnya sudah sampai kak? Kopinya cocok?”", jenis: "kirim" },
    { hari: "Hari ke-30", teks: "“Kira-kira kopinya sudah habis ya kak? Mau saya siapkan lagi?”", jenis: "kirim" },
  ];

  return (
    <Jendela judul="Tanya kabar & ajak beli lagi">
      <div className="space-y-0 px-4 py-4">
        {baris.map((b, i) => (
          <div key={b.hari} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span
                className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${
                  b.jenis === "kirim" ? "bg-ink-900" : "border-2 border-ink-300 bg-white"
                }`}
              />
              {i < baris.length - 1 && <span className="w-px flex-1 bg-ink-200" />}
            </div>
            <div className={i < baris.length - 1 ? "pb-5" : ""}>
              <p className="text-[10px] font-medium text-ink-500">{b.hari}</p>
              <p
                className={`mt-0.5 text-[12px] leading-relaxed ${
                  b.jenis === "kirim" ? "text-ink-900" : "text-ink-600"
                }`}
              >
                {b.teks}
              </p>
            </div>
          </div>
        ))}
      </div>
      <div className="border-t border-ink-200 bg-ink-50 px-4 py-2.5 text-[10.5px] leading-relaxed text-ink-500">
        Dua jalur terpisah. Yang satu memastikan pelanggan puas, yang satu
        membawanya belanja lagi.
      </div>
    </Jendela>
  );
}
