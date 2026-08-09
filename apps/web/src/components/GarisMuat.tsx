"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/**
 * Garis tipis di puncak layar selama halaman berikutnya disiapkan.
 *
 * Kenapa ini perlu padahal sudah ada loading.tsx: waktu orang mengeklik menu,
 * React sengaja MENAHAN halaman lama dan tidak menampilkan kerangka, supaya
 * layar tidak berkedip kosong. Aturan itu bagus untuk perpindahan yang cepat,
 * tapi akibatnya tidak ada satu pun tanda bahwa kliknya diterima. Diukur di
 * sini: perpindahan halaman 214 ms di produksi dan sampai 4 detik waktu
 * halamannya belum pernah dibuka, dan selama itu layar benar-benar diam.
 * Orang membaca diam sebagai macet, lalu mengeklik lagi.
 *
 * loading.tsx tetap dipakai, tapi dia cuma muncul waktu halaman dibuka
 * langsung dari alamatnya atau di-refresh. Garis ini yang menutup sisanya.
 */
export function GarisMuat() {
  const pathname = usePathname();
  const [muat, setMuat] = useState(false);
  const waktu = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function batal() {
      if (waktu.current) clearTimeout(waktu.current);
      waktu.current = null;
      setMuat(false);
    }

    function klik(e: MouseEvent) {
      // Klik kanan, klik tengah, dan Ctrl+klik membuka tab baru. Halaman ini
      // tidak ke mana-mana, jadi garisnya tidak boleh muncul.
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      const a = (e.target as HTMLElement | null)?.closest("a");
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;

      const href = a.getAttribute("href");
      if (!href || !href.startsWith("/") || href.startsWith("/#")) return;

      // Menuju halaman yang sedang dibuka bukan perpindahan.
      if (href.split("?")[0] === pathname) return;

      // Tunda sebentar. Perpindahan yang sudah tersimpan di memori selesai
      // dalam puluhan milidetik, dan garis yang berkedip sekejap justru
      // terasa seperti gangguan, bukan seperti kabar.
      if (waktu.current) clearTimeout(waktu.current);
      waktu.current = setTimeout(() => setMuat(true), 120);
    }

    document.addEventListener("click", klik, true);
    // Tombol kembali dan maju di peramban juga berpindah halaman.
    window.addEventListener("popstate", () => {
      if (waktu.current) clearTimeout(waktu.current);
      waktu.current = setTimeout(() => setMuat(true), 120);
    });

    return () => {
      document.removeEventListener("click", klik, true);
      batal();
    };
  }, [pathname]);

  // Alamat berubah berarti halaman barunya sudah terpasang.
  useEffect(() => {
    if (waktu.current) clearTimeout(waktu.current);
    waktu.current = null;
    setMuat(false);
  }, [pathname]);

  if (!muat) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-50 h-0.5 overflow-hidden"
      role="status"
      aria-live="polite"
    >
      <span className="sr-only">Sedang membuka halaman</span>
      {/* Melaju cepat sampai 80% lalu melambat, tidak pernah sampai ujung.
          Ini bukan tipuan: lamanya memang tidak diketahui, dan garis yang
          berhenti di ujung lalu diam malah terbaca sebagai macet. */}
      <div className="garis-muat h-full bg-brand-600" />
    </div>
  );
}
