import Link from "next/link";
import { LogoNama } from "@/components/Logo";
import { IDENTITAS, identitasBelumLengkap } from "@/lib/identitas";
import { keApp } from "@/lib/situs";

/**
 * Kerangka untuk halaman berisi tulisan panjang: privasi, ketentuan,
 * pengembalian dana, kontak.
 *
 * Lebar bacanya dibatasi sekitar 70 karakter per baris. Baris yang terlalu
 * panjang bikin mata kehilangan posisi waktu pindah ke baris berikutnya, dan
 * halaman hukum sudah cukup berat tanpa itu.
 */
export function HalamanTeks({
  judul,
  ringkas,
  children,
}: {
  judul: string;
  ringkas?: string;
  children: React.ReactNode;
}) {
  const belum = identitasBelumLengkap();

  return (
    <main className="min-h-screen bg-white">
      <Penanda />

      <div className="mx-auto max-w-2xl px-5 pb-24 pt-12 sm:px-8 sm:pt-16">
        <h1 className="text-[30px] font-bold leading-[1.15] tracking-[-0.03em] text-ink-950 sm:text-[38px]">
          {judul}
        </h1>
        {ringkas && (
          <p className="mt-4 text-[17px] leading-relaxed text-ink-600">{ringkas}</p>
        )}
        <p className="mt-4 text-sm text-ink-500">
          Berlaku sejak {IDENTITAS.berlakuSejak}
        </p>

        {/* Hanya muncul selama pemilik Palwise belum mengisi keterangan
            resminya. Halaman hukum yang isinya masih contoh lebih berbahaya
            daripada halaman hukum yang belum ada, karena kelihatan seperti
            sudah jadi.

            CUMA DI LAPTOP. Sebelum ini dia tampil ke pengunjung umum juga,
            lengkap dengan jalur berkas kodenya, dan pita merah bertuliskan
            "Halaman ini belum siap dipakai" di halaman ketentuan jauh lebih
            merusak kepercayaan daripada satu kolom yang belum terisi. Yang
            perlu ditegur pemiliknya, bukan calon pembelinya. */}
        {process.env.NODE_ENV !== "production" && belum.length > 0 && (
          <div className="mt-8 rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-relaxed text-red-800">
            <p className="font-semibold">Halaman ini belum siap dipakai.</p>
            <p className="mt-1">
              Keterangan resmi berikut masih kosong: {belum.join(", ")}. Isi dulu
              di{" "}
              <code className="rounded bg-red-100 px-1 py-0.5 font-mono text-xs">
                apps/web/src/lib/identitas.ts
              </code>
              . Peringatan ini hilang otomatis begitu semuanya terisi.
            </p>
          </div>
        )}

        <Isi>{children}</Isi>
      </div>

      <KakiHalaman />
    </main>
  );
}

/** Gaya baku untuk tulisan panjang. */
export function Isi({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="mt-10 space-y-6 text-[15px] leading-relaxed text-ink-700
                 [&_a]:font-medium [&_a]:text-brand-700 [&_a]:underline
                 [&_h2]:mb-2 [&_h2]:mt-10 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-ink-950
                 [&_h3]:mb-1.5 [&_h3]:mt-6 [&_h3]:font-semibold [&_h3]:text-ink-900
                 [&_li]:mb-1.5
                 [&_strong]:font-semibold [&_strong]:text-ink-900
                 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5"
    >
      {children}
    </div>
  );
}

/**
 * Kepala halaman sederhana: logo yang membawa pulang.
 *
 * Bentuknya sengaja SAMA PERSIS dengan kepala halaman jualan: menempel di
 * atas, tinggi yang sama, tembus pandang sedikit, tombol hitam di kanan.
 * Halaman ketentuan dan halaman jualan yang kepalanya berbeda bikin orang
 * merasa berpindah ke situs lain tepat waktu dia sedang memeriksa apakah situs
 * ini bisa dipercaya, dan itu waktu yang paling buruk untuk membuatnya ragu.
 */
export function Penanda() {
  return (
    <header className="sticky top-0 z-40 border-b border-ink-200/70 bg-white/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-5 sm:h-16 sm:px-8">
        <Link href="/" className="flex items-center gap-2">
          <LogoNama />
        </Link>
        <Link href={keApp("/daftar")} className="btn-ink">
          Mulai gratis
        </Link>
      </div>
    </header>
  );
}

const TAUTAN: { judul: string; isi: { href: string; label: string }[] }[] = [
  {
    judul: "Produk",
    isi: [
      { href: "/#fitur", label: "Fitur" },
      { href: "/#cara", label: "Cara kerjanya" },
      { href: "/#harga", label: "Harga" },
      { href: "/#tanya", label: "Tanya jawab" },
    ],
  },
  {
    judul: "Bantuan",
    isi: [
      { href: "/panduan", label: "Panduan pemakaian" },
      { href: "/kontak", label: "Hubungi kami" },
      { href: "/pengembalian", label: "Pengembalian dana" },
    ],
  },
  {
    judul: "Ketentuan",
    isi: [
      { href: "/privasi", label: "Kebijakan privasi" },
      { href: "/ketentuan", label: "Syarat dan ketentuan" },
    ],
  },
];

export function KakiHalaman() {
  return (
    <footer className="border-t border-ink-200 bg-white">
      {/* Di HP kolom tautannya berdua-dua, bukan bertiga ke bawah.
          Diukur di layar 375px: kaki halaman ini sendirian setinggi 848px,
          satu layar penuh berisi tautan yang hampir tidak pernah ditekan. Dua
          kolom memotongnya hampir separuh tanpa menghilangkan satu tautan pun,
          dan tautan hukum wajib tetap bisa ditemukan. */}
      <div className="mx-auto w-full max-w-6xl px-5 py-12 sm:px-8 sm:py-16">
        <div className="grid grid-cols-2 gap-x-6 gap-y-9 sm:gap-10 lg:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))]">
          <div className="col-span-2 lg:col-span-1">
            <div className="flex items-center gap-2">
              <LogoNama />
            </div>
            {/* Kalimat "ini produk apa" tidak digambar di HP. Di layar lebar
                dia mengisi kolom pertama yang memang kosong; di HP dia jadi
                tiga baris tambahan di dasar halaman, menjelaskan lagi hal yang
                baru saja dijelaskan seluruh halaman di atasnya. */}
            <p className="mt-4 hidden max-w-xs text-sm leading-relaxed text-ink-600 sm:block">
              Sales WhatsApp yang membalas chat pelanggan 24 jam dan mencatat
              calon pembeli, buat usaha di Indonesia.
            </p>
            {/* Alamat suratnya ditaruh di kaki halaman, bukan cuma di halaman
                ketentuan. Orang yang menimbang membayar mencari tanda bahwa di
                balik situs ini ada tempat yang bisa didatangi, dan dia
                mencarinya di dasar halaman, bukan di dokumen hukum. */}
            <p className="mt-4 hidden text-sm leading-relaxed text-ink-500 sm:block">
              <a
                href={`mailto:${IDENTITAS.email}`}
                className="text-ink-600 hover:text-ink-900"
              >
                {IDENTITAS.email}
              </a>
              <br />
              {IDENTITAS.jamLayanan}
            </p>
          </div>

          {TAUTAN.map((kolom) => (
            <div key={kolom.judul}>
              <p className="kicker">{kolom.judul}</p>
              {/* space-y dilepas di HP: luas sentuhnya yang jadi jaraknya.
                  Tautan setinggi 19px itu separuh ujung jari, dan tiga tautan
                  hukum yang salah tekan bikin orang menyerah mencarinya. */}
              <ul className="mt-2 text-sm sm:mt-4 sm:space-y-2.5">
                {kolom.isi.map((t) => (
                  <li key={t.href}>
                    <Link
                      href={t.href}
                      className="tap-aman py-1.5 text-ink-600 transition hover:text-ink-900 sm:py-0"
                    >
                      {t.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* max-w-3xl bukan hiasan: tanpa itu dua baris ini membentang 1112px,
            sekitar 185 huruf per baris di layar 1280. Yang mahal bukan panjang
            kalimatnya, tapi lompatan balik matanya ke awal baris berikutnya,
            dan itu paling sering meleset ke baris yang salah. */}
        <div className="mt-12 flex flex-col gap-3 border-t border-ink-200 pt-6 text-xs leading-relaxed text-ink-500 sm:mt-16 sm:flex-row sm:items-start sm:justify-between sm:gap-10">
          {/* Nama produk duluan, badan usahanya menyusul.
              Yang dikenali orang "Palwise", bukan nama PT-nya. Tapi badan
              usahanya tetap harus tertulis, karena dialah yang menandatangani
              ketentuan dan menerima pembayaran. */}
          <p className="max-w-sm">
            Palwise. Sales WhatsApp untuk usaha di Indonesia.
            {IDENTITAS.dioperasikanOleh
              ? ` Dioperasikan oleh ${IDENTITAS.dioperasikanOleh}.`
              : ""}
          </p>
          {/* Wajib ada dan wajib jelas. Palwise memakai WhatsApp lewat
              perangkat tertaut, bukan lewat kerja sama resmi dengan Meta.
              Menyamarkan itu bikin orang salah mengira ini produk resmi
              WhatsApp. */}
          <p className="max-w-md sm:text-right">
            Palwise bukan produk resmi WhatsApp dan tidak berafiliasi dengan
            Meta. WhatsApp adalah merek dagang milik Meta Platforms, Inc.
          </p>
        </div>
      </div>
    </footer>
  );
}
