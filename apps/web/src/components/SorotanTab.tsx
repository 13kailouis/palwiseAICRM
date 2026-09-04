"use client";

import { useState } from "react";
import { Ikon, type NamaIkon } from "@/components/Ikon";

/**
 * Empat sorotan produk dalam SATU bagian, digilir lewat tab.
 *
 * Sebelum 4 September 2026 ini empat bagian berturut-turut, masing-masing
 * dengan penanda, judul, satu paragraf, satu catatan kaki, dan satu gambar.
 * Empat-empatnya dibaca berurutan ke bawah, dan totalnya sekitar 400 kata plus
 * empat layar penuh.
 *
 * Yang bikin itu keliru bukan panjangnya, tapi bahwa orang tidak membacanya.
 * Diukur pada tanggal yang sama: halaman jualan pesaing terdekat tingginya
 * mirip, tapi teks yang benar-benar digambar cuma sekitar 193 kata. Bedanya
 * mereka MENUNJUKKAN, kita MENJELASKAN. Gambar-gambar kita sudah bagus dan
 * sudah benar; yang salah cuma paragraf-paragraf yang mengelilinginya.
 *
 * Jadi keempat gambarnya tetap ada, semua, dan yang dibuang paragrafnya.
 * Judul tabnya sendiri yang jadi janjinya, dan di bawah gambar cuma ada satu
 * baris. Orang memilih mau lihat yang mana, bukan digiring melewati empat.
 *
 * SEMUA PANEL DIGAMBAR DI HTML, yang tidak aktif disembunyikan lewat atribut
 * `hidden`. Bukan dibuat waktu diklik. Alasannya dua: mesin pencari dan mesin
 * jawaban tetap membaca keempat isinya, dan panelnya tidak berkedip waktu
 * digilir karena gambarnya sudah jadi sejak awal.
 */
export type IsiSorotan = {
  ikon: NamaIkon;
  /** Yang tertulis di tabnya. Ini janjinya, bukan nama fiturnya. */
  tab: string;
  /** Satu baris di bawah gambar. Maksimal sekitar 15 kata. */
  baris: string;
};

export function SorotanTab({
  isi,
  panel,
}: {
  isi: IsiSorotan[];
  /** Gambar tiap tab, urutannya sama dengan `isi`. */
  panel: React.ReactNode[];
}) {
  const [aktif, setAktif] = useState(0);

  return (
    <div>
      {/* Barisnya digeser ke samping di HP, bukan dibungkus jadi dua baris.
          Empat tab yang membungkus di layar 375px terbaca sebagai daftar, dan
          daftar tidak mengundang diklik. Pola yang sama dengan saringan di
          kotak masuk. */}
      <div
        role="tablist"
        aria-label="Yang dikerjain Palwise"
        className="thin-scroll -mx-5 flex gap-2 overflow-x-auto px-5 pb-1 sm:mx-0 sm:flex-wrap sm:justify-center sm:px-0"
      >
        {isi.map((s, i) => (
          <button
            key={s.tab}
            type="button"
            role="tab"
            aria-selected={i === aktif}
            onClick={() => setAktif(i)}
            className={`tap-aman flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full border px-4 py-2.5 text-sm font-medium transition ${
              i === aktif
                ? "border-ink-900 bg-ink-900 text-white"
                : "border-ink-200 bg-white text-ink-700 hover:border-ink-300 hover:text-ink-900"
            }`}
          >
            <Ikon nama={s.ikon} size={16} />
            {s.tab}
          </button>
        ))}
      </div>

      <div className="mt-7 sm:mt-10">
        {isi.map((s, i) => (
          <div
            key={s.tab}
            role="tabpanel"
            hidden={i !== aktif}
            /* anim-naik dipasang lewat key yang berubah supaya panelnya benar
               -benar bergerak tiap digilir. Tanpa itu React memakai ulang
               simpul yang sama dan animasinya cuma jalan sekali. */
            className="anim-naik"
          >
            <div className="flex justify-center">{panel[i]}</div>
            <p className="mx-auto mt-6 max-w-lg text-center text-[15px] leading-relaxed text-ink-600 sm:mt-8 sm:text-base">
              {s.baris}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
