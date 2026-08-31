"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Logo } from "@/components/Logo";
import { halamanSekunder, judulHalaman } from "@/lib/navigasi";

/**
 * Kepala halaman khusus HP.
 *
 * Dua wajah, tergantung halamannya:
 *
 * - Di empat tab utama (Ringkasan, Chat, Pelanggan, Asisten): cuma merek,
 *   lambang plus "Palwise", satu baris tipis. Nama bisnis SENGAJA tidak
 *   ditampilkan (pemiliknya sudah tahu, dan barisnya cuma memakan tinggi).
 *
 * - Di halaman yang dibuka dari tombol Menu (Info bisnis, Gambar, Nomor
 *   WhatsApp, Paket, Akun): jadi kepala layar dorongan ala app, tombol kembali
 *   plus judul halaman, dan bar bawahnya disembunyikan. Ini yang bikin halaman
 *   sekunder terasa seperti layar yang "didorong masuk" di app populer, bukan
 *   tab yang setara.
 *
 * Menandai `data-dorong` di <html> supaya CSS bisa menyembunyikan PageHeader
 * yang judulnya sudah ada di bar ini (biar tidak dobel) dan menolkan jarak
 * bawah karena bar bawahnya memang tidak ada di halaman ini.
 *
 * Tidak perlu `sticky`: bar ini ada DI LUAR <main>, dan yang menggulir cuma
 * <main>, jadi bar ini memang selalu diam di atas.
 *
 * Argumen namaWorkspace tetap diterima supaya pemanggilnya tidak perlu diubah.
 */
export function BarAtas({ namaWorkspace: _namaWorkspace }: { namaWorkspace: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const sekunder = halamanSekunder(pathname);

  useEffect(() => {
    const el = document.documentElement;
    if (sekunder) el.dataset.dorong = "1";
    else delete el.dataset.dorong;
    return () => {
      delete el.dataset.dorong;
    };
  }, [sekunder]);

  if (sekunder) {
    const judul = judulHalaman(pathname);
    return (
      <header className="flex items-center gap-1 border-b border-ink-200 bg-white px-2 py-2 lg:hidden">
        <button
          type="button"
          aria-label="Kembali"
          onClick={() =>
            window.history.length > 1 ? router.back() : router.push("/app")
          }
          className="tap-aman grid h-10 w-10 place-items-center rounded-lg text-ink-700 transition hover:bg-ink-100 active:bg-ink-100"
        >
          {/* Panah kembali, digambar sejalan dengan ikon lain: grid 24, garis 2,
              ujung membulat. */}
          <svg
            viewBox="0 0 24 24"
            width="22"
            height="22"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M15 5l-7 7 7 7" />
          </svg>
        </button>
        <span className="truncate text-[15px] font-semibold tracking-tight text-ink-950">
          {judul}
        </span>
      </header>
    );
  }

  return (
    <header className="flex items-center gap-2 border-b border-ink-200 bg-white px-4 py-2.5 lg:hidden">
      {/* Logo sungguhan, bukan huruf "P" di kotak biru: latar putih di sini
          jadi lambang berwarna aslinya tampil benar, sama dengan sidebar
          laptop. */}
      <Logo ukuran={26} className="shrink-0" />
      <span className="text-[15px] font-semibold tracking-tight text-ink-950">
        Palwise
      </span>
    </header>
  );
}
