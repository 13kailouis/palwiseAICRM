"use client";

import { useState } from "react";
import { CONTOH_INFO } from "@/lib/contohInfo";
import { Ikon } from "@/components/Ikon";

/**
 * Contoh isi Info bisnis di halaman panduan, bisa diganti per bidang usaha.
 *
 * Dulu di sini ada contoh toko kopi yang DIKETIK ULANG di berkas panduan,
 * terpisah dari contoh yang benar-benar dipakai tombol "Pakai contoh" di
 * dalam aplikasi. Dua salinan contoh yang sama itu selalu berakhir sama:
 * satu diperbaiki, satu tertinggal, dan yang tertinggal justru yang dibaca
 * orang sebelum mendaftar.
 *
 * Sekarang keduanya membaca `CONTOH_INFO`. Panduan jadi ikut berubah sendiri
 * tiap contohnya diperbaiki, dan yang dilihat calon pengguna di panduan sama
 * persis dengan yang nanti dia dapat di dalam aplikasi.
 *
 * Deret pilihannya digeser di HP dan dibiarkan membungkus di layar lebar.
 * Di sini kotaknya boleh tampil terbuka, tidak seperti di dalam aplikasi:
 * halaman panduan memang halaman untuk dibaca, tidak ada kolom isian yang
 * terdorong keluar layar.
 */
export function ContohPanduan() {
  const [pilih, setPilih] = useState(CONTOH_INFO[0]?.id ?? "");
  const aktif = CONTOH_INFO.find((c) => c.id === pilih) ?? CONTOH_INFO[0];
  if (!aktif) return null;

  return (
    <div>
      <div className="thin-scroll -mx-5 flex gap-2 overflow-x-auto px-5 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
        {CONTOH_INFO.map((c) => {
          const ini = c.id === aktif.id;
          return (
            <button
              key={c.id}
              type="button"
              aria-pressed={ini}
              onClick={() => setPilih(c.id)}
              className={`tap-aman inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-2 text-sm transition-colors ${
                ini
                  ? "border-ink-900 bg-ink-900 font-medium text-white"
                  : "border-ink-200 bg-white text-ink-700 hover:border-ink-300"
              }`}
            >
              <Ikon
                nama={c.ikon}
                size={15}
                className={ini ? "text-white" : "text-ink-400"}
              />
              <span className="whitespace-nowrap">{c.nama}</span>
            </button>
          );
        })}
      </div>

      <pre className="mt-5 overflow-x-auto rounded-2xl border border-ink-200 bg-ink-950 p-5 text-[13px] leading-relaxed text-ink-300">
        {aktif.isi}
      </pre>
    </div>
  );
}
