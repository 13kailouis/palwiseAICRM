"use client";

import { useEffect, useState } from "react";

/**
 * Pembungkus spanduk yang bisa ditutup, TAPI muncul lagi kalau ada yang baru.
 *
 * Tombol tutup yang menyembunyikan selamanya itu berbahaya untuk spanduk
 * seperti "perlu dicek uangnya": sekali ditutup, pembayaran berikutnya lewat
 * tanpa ada yang memberi tahu. Sebaliknya, spanduk yang tidak bisa ditutup akan
 * menempel berhari-hari sesudah urusannya beres, dan orang berhenti melihatnya
 * justru sebelum ada kabar yang benar-benar penting.
 *
 * Jalan tengahnya: yang disimpan BUKAN "sudah pernah ditutup", tapi APA yang
 * ditutup. Begitu isinya berubah, penandanya tidak cocok lagi dan spanduknya
 * muncul kembali dengan sendirinya.
 *
 * Disimpan di browser, bukan di database. Ini urusan tampilan satu orang di
 * satu perangkat, bukan keadaan usahanya.
 */
export function SpandukTutup({
  /** Berubah tiap isi spanduknya berubah. Itu yang bikin dia muncul lagi. */
  tanda,
  children,
}: {
  tanda: string;
  children: React.ReactNode;
}) {
  // Mulai dari null, bukan true.
  //
  // Server tidak tahu isi localStorage, jadi kalau langsung digambar lalu
  // disembunyikan sesudahnya, spanduk yang sudah ditutup tetap berkedip sekali
  // tiap halaman dibuka. Null berarti "belum tahu", dan belum tahu tidak
  // menggambar apa-apa.
  const [tampil, setTampil] = useState<boolean | null>(null);

  useEffect(() => {
    try {
      setTampil(window.localStorage.getItem(KUNCI) !== tanda);
    } catch {
      // Mode penyamaran atau penyimpanan penuh. Lebih baik spanduknya tampil
      // daripada kabar soal uang hilang gara-gara penyimpanan browser.
      setTampil(true);
    }
  }, [tanda]);

  if (!tampil) return null;

  return (
    <div className="relative">
      {children}
      <button
        type="button"
        aria-label="Tutup pemberitahuan ini"
        onClick={() => {
          try {
            window.localStorage.setItem(KUNCI, tanda);
          } catch {
            // Tidak bisa disimpan bukan alasan menolak menutupnya sekarang.
          }
          setTampil(false);
        }}
        className="tap-aman absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-lg text-ink-400 transition hover:bg-white/70 hover:text-ink-700"
      >
        <svg
          viewBox="0 0 24 24"
          width="15"
          height="15"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.2}
          strokeLinecap="round"
        >
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
    </div>
  );
}

const KUNCI = "palwise:spanduk-ditutup";
