import Link from "next/link";
import { Ikon, type NamaIkon } from "@/components/Ikon";

/**
 * Layar kosong bergambar.
 *
 * Sebelumnya layar kosong isinya tiga baris kalimat. Itu memaksa orang membaca
 * untuk tahu tempat ini buat apa, padahal bentuknya bisa memberi tahu lebih
 * cepat. Gambar dikenali mata dalam sepersekian detik; kalimat harus dieja dulu
 * satu per satu.
 *
 * Aturannya: SATU kalimat saja. Kalau butuh tiga kalimat untuk menjelaskan
 * sebuah halaman kosong, yang salah biasanya bukan penjelasannya, tapi
 * halamannya.
 */
export function Kosong({
  ikon,
  judul,
  kalimat,
  aksi,
}: {
  ikon: NamaIkon;
  judul: string;
  /** Satu kalimat. Kalau terasa kurang, taruh sisanya di Rincian. */
  kalimat: string;
  aksi?: { href: string; label: string };
}) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      {/* Bentuk kosong yang menggambarkan isi halamannya. Sengaja
          bergaris putus-putus: itu lambang yang sudah dipahami orang sebagai
          "tempat ini menunggu diisi", bukan "ada yang rusak". */}
      <div className="grid h-16 w-16 place-items-center rounded-2xl border-2 border-dashed border-ink-200 text-ink-300">
        <Ikon nama={ikon} size={28} />
      </div>

      <p className="mt-4 font-medium text-ink-900">{judul}</p>
      <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-ink-500">
        {kalimat}
      </p>

      {aksi && (
        <Link href={aksi.href} className="btn-ink mt-5">
          {aksi.label}
        </Link>
      )}
    </div>
  );
}

/**
 * Penjelasan panjang yang terlipat.
 *
 * Halaman Gambar & berkas dulu menampilkan empat paragraf aturan kepada orang
 * yang belum mengunggah apa pun. Dia belum punya pertanyaannya, jadi
 * jawabannya cuma jadi tembok. Yang belum bertanya tidak boleh dipaksa membaca
 * jawabannya.
 *
 * Tetap ada, tetap bisa dicari, cuma tidak menghalangi.
 */
export function Rincian({
  judul,
  children,
}: {
  judul: string;
  children: React.ReactNode;
}) {
  return (
    <details className="card group">
      <summary className="tap-aman flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3.5 text-sm font-medium text-ink-800 sm:px-5">
        {judul}
        <span
          className="shrink-0 text-ink-400 transition-transform group-open:rotate-180"
          style={{ transitionDuration: "var(--gerak-cepat)" }}
          aria-hidden="true"
        >
          <svg
            viewBox="0 0 24 24"
            width="16"
            height="16"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </span>
      </summary>
      <div className="border-t border-ink-100 px-4 py-4 sm:px-5">{children}</div>
    </details>
  );
}
