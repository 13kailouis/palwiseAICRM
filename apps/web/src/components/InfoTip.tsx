"use client";

import { useEffect, useId, useRef, useState } from "react";

/**
 * Ikon info kecil yang membuka keterangan tambahan.
 *
 * Ini pengganti tombol teks "Selengkapnya". Keterangan panjang tidak lagi
 * memakan baris di dalam formulir; yang tampil cuma satu lambang bulat, dan
 * isinya keluar waktu diminta.
 *
 * Dua perilaku, sesuai alat yang dipakai orang:
 *
 * - Di layar SENTUH (HP), diketuk membuka lembar kecil dari bawah dengan latar
 *   gelap. Lembar penuh lebih gampang dibaca dan ditutup pakai jempol daripada
 *   gelembung mungil yang nempel di ikonnya.
 * - Di layar dengan TETIKUS, cukup diarahkan kursornya (hover) dan gelembungnya
 *   muncul di dekat ikon. Diklik juga membuka, supaya yang memakai papan ketik
 *   atau layar sentuh di laptop tetap bisa.
 *
 * Yang membedakan bukan lebar layar, tapi `(hover: hover)` dan `(pointer:
 * coarse)`: tablet lebar tetap dipakai jari, dan jendela sempit di laptop tetap
 * dipakai tetikus. Mengukur lebar akan salah di dua-duanya.
 *
 * Aksesibilitas bukan tambahan: tombolnya `<button>` sungguhan, punya
 * `aria-expanded` dan label, bisa dibuka dari papan ketik, ditutup dengan Esc,
 * dan menutup sendiri waktu yang lain diklik. Keterangan yang cuma bisa dilihat
 * dengan tetikus sama saja dengan keterangan yang hilang buat sebagian orang.
 */
export function InfoTip({
  children,
  label = "Lihat keterangan",
  judul,
}: {
  children: React.ReactNode;
  /** Dibaca pembaca layar dan jadi tooltip tombolnya. */
  label?: string;
  /** Judul kecil di atas isi, dipakai terutama di lembar HP. */
  judul?: string;
}) {
  const [buka, setBuka] = useState(false);
  // Di layar lebar gelembungnya keluar dari sisi ikon. Kalau ikonnya ada di
  // panel kanan (Info bisnis, pita peringatan), membukanya ke kanan bikin
  // isinya terpotong keluar layar. Jadi sisinya dipilih menurut ruang yang
  // tersisa: ikon di paruh kanan layar membuka ke kiri, selebihnya ke kanan.
  const [sisi, setSisi] = useState<"kiri" | "kanan">("kiri");
  // Arah vertikal gelembung di layar lebar. Kalau ikonnya dekat dasar layar,
  // membuka ke bawah bikin isinya terpotong tepi bawah, jadi dibalik ke atas.
  const [arah, setArah] = useState<"bawah" | "atas">("bawah");
  const bungkus = useRef<HTMLSpanElement>(null);
  const id = useId();

  // Cuma buka lewat hover kalau alatnya memang punya kursor. Di HP, hover
  // "palsu" dari satu ketukan bikin gelembungnya kedip-kedip.
  const adaHover = () =>
    typeof window !== "undefined" &&
    window.matchMedia?.("(hover: hover)").matches;

  // Diukur tepat sebelum dibuka, bukan sekali di awal: lebar layar dan posisi
  // ikonnya bisa berubah (putar layar, panel yang bergeser).
  function buka1() {
    const r = bungkus.current?.getBoundingClientRect();
    if (r && typeof window !== "undefined") {
      setSisi(r.left > window.innerWidth / 2 ? "kanan" : "kiri");
      // Buka ke atas cuma kalau ruang di bawah ikon sempit DAN di atasnya lebih
      // lega. Angka 260 kira-kira setinggi gelembung terpanjang.
      const ruangBawah = window.innerHeight - r.bottom;
      setArah(ruangBawah < 260 && r.top > ruangBawah ? "atas" : "bawah");
    }
    setBuka(true);
  }

  useEffect(() => {
    if (!buka) return;

    const saatTekan = (e: KeyboardEvent) => {
      if (e.key === "Escape") setBuka(false);
    };
    const saatKlikLuar = (e: Event) => {
      if (bungkus.current && !bungkus.current.contains(e.target as Node)) {
        setBuka(false);
      }
    };

    document.addEventListener("keydown", saatTekan);
    document.addEventListener("mousedown", saatKlikLuar);
    document.addEventListener("touchstart", saatKlikLuar);
    return () => {
      document.removeEventListener("keydown", saatTekan);
      document.removeEventListener("mousedown", saatKlikLuar);
      document.removeEventListener("touchstart", saatKlikLuar);
    };
  }, [buka]);

  return (
    <span ref={bungkus} className="relative inline-flex align-middle">
      <button
        type="button"
        aria-label={label}
        aria-expanded={buka}
        aria-controls={id}
        onClick={() => (buka ? setBuka(false) : buka1())}
        onMouseEnter={() => adaHover() && buka1()}
        onMouseLeave={() => adaHover() && setBuka(false)}
        className="grid h-[18px] w-[18px] place-items-center rounded-full border border-ink-300 text-ink-400 transition hover:border-ink-500 hover:text-ink-700 focus-visible:text-ink-700"
      >
        {/* Lambang "i" digambar sendiri, sejalan dengan ikon lain di app. */}
        <svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true">
          <circle
            cx="12"
            cy="7"
            r="1.4"
            fill="currentColor"
          />
          <rect
            x="11"
            y="10.5"
            width="2"
            height="7"
            rx="1"
            fill="currentColor"
          />
        </svg>
      </button>

      {buka && (
        <>
          {/* Latar gelap, CUMA di HP. Diketuk berarti tutup. */}
          <span
            aria-hidden
            onClick={() => setBuka(false)}
            className="anim-muncul fixed inset-0 z-40 bg-ink-950/40 sm:hidden"
          />
          <span
            id={id}
            role="dialog"
            className={`anim-naik fixed inset-x-4 bottom-4 z-50 block rounded-2xl border border-ink-200 bg-white p-4 text-left text-sm leading-relaxed text-ink-600 shadow-xl
                       sm:absolute sm:inset-x-auto sm:z-30 sm:w-72 sm:max-w-[calc(100vw-2rem)] sm:rounded-xl sm:p-3.5 sm:shadow-[0_8px_24px_-8px_rgba(15,15,15,0.25)] ${
              arah === "atas"
                ? "sm:top-auto sm:bottom-full sm:mb-2"
                : "sm:bottom-auto sm:top-full sm:mt-2"
            } ${sisi === "kanan" ? "sm:right-0" : "sm:left-0"}`}
          >
            {judul && (
              <span className="mb-1.5 block text-[13px] font-semibold text-ink-900">
                {judul}
              </span>
            )}
            {children}
          </span>
        </>
      )}
    </span>
  );
}
