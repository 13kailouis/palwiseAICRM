import type { Metadata } from "next";
import Link from "next/link";
import { KakiHalaman, Penanda } from "@/components/HalamanTeks";
import { Ikon, type NamaIkon } from "@/components/Ikon";
import { IDENTITAS, tautanBantuanWa } from "@/lib/identitas";
import { keApp } from "@/lib/situs";

export const metadata: Metadata = {
  title: "Hubungi Palwise",
  description:
    "Chat WhatsApp atau email kami. Dibalas manusia, bukan asisten otomatis.",
};

/**
 * Halaman kontak.
 *
 * SENGAJA TIDAK memakai kerangka HalamanTeks seperti ketentuan dan privasi.
 * Kerangka itu untuk dokumen yang dibaca berurutan dari atas ke bawah, dan dia
 * membawa dua hal yang salah di sini: lebar baca sempit yang memaksa segalanya
 * jadi satu kolom paragraf, dan baris "Berlaku sejak ..." yang tidak masuk akal
 * untuk halaman kontak.
 *
 * Orang membuka halaman ini dalam keadaan berbeda dengan waktu dia membuka
 * ketentuan. Dia tidak membaca, dia MENCARI: satu cara menghubungi, secepatnya,
 * sering kali sambil kesal. Jadi jalur kontaknya jadi kartu besar yang bisa
 * ditekan, bukan tautan yang tenggelam di tengah paragraf.
 */

function KartuJalur({
  ikon,
  judul,
  isi,
  keterangan,
  href,
  ajakan,
  baru = false,
}: {
  ikon: NamaIkon;
  judul: string;
  isi: string;
  keterangan: string;
  href: string;
  ajakan: string;
  baru?: boolean;
}) {
  return (
    <a
      href={href}
      {...(baru ? { target: "_blank", rel: "noreferrer" } : {})}
      className="group flex flex-col rounded-2xl border border-ink-200 bg-white p-6 transition hover:border-brand-400 hover:shadow-sm"
    >
      <span className="grid h-11 w-11 place-items-center rounded-xl bg-ink-900 text-white">
        <Ikon nama={ikon} size={22} />
      </span>
      <h2 className="mt-4 font-semibold text-ink-950">{judul}</h2>
      <p className="mt-1 break-words text-[15px] font-medium text-ink-900">
        {isi}
      </p>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-ink-600">
        {keterangan}
      </p>
      <span className="mt-4 text-sm font-medium text-brand-700 group-hover:underline">
        {ajakan}
      </span>
    </a>
  );
}

const SENDIRI: { judul: string; isi: React.ReactNode }[] = [
  {
    judul: "Lupa password",
    isi: (
      <>
        Minta tautan barunya di{" "}
        <Link href={keApp("/lupa")} className="text-brand-700 hover:underline">
          halaman lupa password
        </Link>
        . Tautannya sampai dalam hitungan menit.
      </>
    ),
  },
  {
    judul: "Ganti email atau password",
    isi: <>Ada di halaman Akun setelah kamu masuk, tidak perlu lewat kami.</>,
  },
  {
    judul: "Asisten menjawab tidak sesuai",
    isi: (
      <>
        Biasanya karena info bisnisnya kurang lengkap. Tambahkan di halaman Info
        bisnis, lalu uji lagi di Coba dulu.
      </>
    ),
  },
  {
    judul: "Asisten berhenti membalas",
    isi: (
      <>
        Cek jatah balasan di halaman Paket &amp; pemakaian, dan status nomor di
        halaman Nomor WhatsApp.
      </>
    ),
  },
];

export default function KontakPage() {
  const wa = tautanBantuanWa("Halo, saya mau tanya soal Palwise.");

  return (
    <main className="min-h-screen bg-white">
      <Penanda />

      <div className="mx-auto max-w-4xl px-5 pb-20 pt-14">
        <h1 className="text-3xl font-bold tracking-tight text-ink-950 sm:text-4xl">
          Hubungi kami
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-ink-600">
          Dibalas manusia, bukan asisten otomatis. Kami sadar itu lucu untuk
          perusahaan yang jualan asisten otomatis, tapi urusan akun dan uang
          pantas ditangani orang.
        </p>

        {/* Jalur kontaknya duluan, sebelum apa pun.

            Yang membuka halaman ini sedang mencari satu cara menghubungi,
            sering kali sambil kesal. Menaruh penjelasan lebih dulu berarti
            memaksa orang yang sedang buru-buru membaca dulu. */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {/* Kartunya hilang seluruhnya kalau nomornya belum ada. Judul
              "WhatsApp" tanpa nomor apa pun sama saja menjanjikan jalur yang
              tidak ada. */}
          {wa && (
            <KartuJalur
              ikon="whatsapp"
              judul="WhatsApp"
              isi="Chat kami langsung"
              keterangan={`Cara paling cepat. Dijawab ${IDENTITAS.jamLayanan.toLowerCase()}.`}
              href={wa}
              ajakan="Buka WhatsApp"
              baru
            />
          )}
          <KartuJalur
            ikon="info"
            judul="Email"
            isi={IDENTITAS.email}
            keterangan="Untuk yang perlu jejak tertulis: tagihan, pengembalian dana, permintaan data, atau laporan masalah keamanan. Dibalas paling lambat 2 hari kerja."
            href={`mailto:${IDENTITAS.email}`}
            ajakan="Kirim email"
          />
        </div>

        {/* Bisa diselesaikan sendiri.

            Ditaruh SESUDAH jalur kontaknya, bukan sebelum. Menyodorkan daftar
            "coba dulu sendiri" sebelum menunjukkan cara menghubungi terbaca
            seperti menghindar, dan itu kesan terakhir yang kami inginkan di
            halaman yang dibuka orang waktu ada masalah. */}
        <section className="mt-14">
          <h2 className="text-lg font-semibold text-ink-950">
            Lebih cepat kalau kamu selesaikan sendiri
          </h2>
          <p className="mt-1 text-sm text-ink-600">
            Empat hal ini biasanya beres lebih cepat daripada menunggu balasan
            kami.
          </p>
          <dl className="mt-5 grid gap-x-8 gap-y-5 sm:grid-cols-2">
            {SENDIRI.map((s) => (
              <div key={s.judul}>
                <dt className="text-sm font-medium text-ink-900">{s.judul}</dt>
                <dd className="mt-1 text-sm leading-relaxed text-ink-600">
                  {s.isi}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="mt-14 rounded-2xl border border-ink-200 bg-ink-50 p-6">
          <h2 className="font-semibold text-ink-950">Menemukan celah keamanan?</h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-600">
            Tolong kabari kami lewat email dulu sebelum diumumkan, dan beri kami
            waktu memperbaikinya. Kami tidak akan mempersoalkan siapa pun yang
            melaporkan dengan itikad baik.
          </p>
        </section>

        {/* Keterangan badan usaha paling bawah dan paling kecil.

            Wajib ada, karena orang berhak tahu dia berurusan dengan siapa
            sebelum membayar. Tapi bukan itu yang dicari orang waktu membuka
            halaman ini, jadi dia tidak boleh menyalip jalur kontaknya. */}
        <section className="mt-14 border-t border-ink-200 pt-6 text-sm leading-relaxed text-ink-500">
          <p className="font-medium text-ink-700">{IDENTITAS.badanUsaha}</p>
          <p className="mt-1">{IDENTITAS.alamat}</p>
          <p className="mt-3 max-w-2xl">
            Palwise adalah produk yang dioperasikan oleh {IDENTITAS.badanUsaha}.
            Untuk semua urusan Palwise, hubungi lewat jalur di halaman ini.
          </p>
        </section>
      </div>

      <KakiHalaman />
    </main>
  );
}
