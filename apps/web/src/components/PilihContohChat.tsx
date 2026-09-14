"use client";

import { useState, type ReactNode } from "react";

/**
 * Contoh chat di halaman depan, dengan pilihan bidang usaha di atasnya.
 *
 * Sampai 14 September 2026 halaman depan cuma punya satu contoh, toko kopi.
 * Pemilik hotel, klinik, atau travel yang membuka palwise.id melihat
 * "arabika gayo" di layar pertama lalu menyimpulkan produk ini buat toko,
 * padahal halaman untuk bidangnya sudah ada. Orang mengenali dirinya dari
 * pertanyaan pelanggannya, jadi pertanyaan itu yang dipilih di sini.
 *
 * Isi tiap chat SUDAH digambar server dan dikirim sebagai `panel`. Komponen ini
 * cuma memilih mana yang tampil, jadi data jualan tidak ikut terkirim sebagai
 * JavaScript, dan tanpa JavaScript contoh pertama tetap terlihat.
 */
export function PilihContohChat({
  pilihan,
}: {
  pilihan: { id: string; label: string; panel: ReactNode }[];
}) {
  const [aktif, setAktif] = useState(pilihan[0]?.id);

  return (
    <div className="w-full">
      <p className="text-center text-xs font-medium text-ink-500">Lihat contoh chat untuk bidangmu</p>
      <div
        role="tablist"
        aria-label="Contoh chat per bidang usaha"
        className="thin-scroll -mx-5 mt-3 flex gap-2 overflow-x-auto px-5 pb-1 sm:mx-0 sm:flex-wrap sm:justify-center sm:px-0"
      >
        {pilihan.map((p) => {
          const iniAktif = p.id === aktif;
          return (
            <button
              key={p.id}
              type="button"
              role="tab"
              id={`tab-chat-${p.id}`}
              aria-selected={iniAktif}
              aria-controls={`contoh-chat-${p.id}`}
              onClick={() => setAktif(p.id)}
              className={`tap-aman shrink-0 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-[13px] transition ${
                iniAktif
                  ? "border-ink-900 bg-ink-900 text-white"
                  : "border-ink-200 bg-white text-ink-700 hover:border-ink-400"
              }`}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      {/* Atribut hidden di pembungkus polos, bukan di elemen yang punya kelas
          display. Kelas "flex" mengalahkan [hidden] milik Tailwind, dan
          semua contoh akan tampil bertumpuk. */}
      {pilihan.map((p) => (
        <div
          key={p.id}
          id={`contoh-chat-${p.id}`}
          role="tabpanel"
          aria-labelledby={`tab-chat-${p.id}`}
          hidden={p.id !== aktif}
        >
          <div className="mt-6 flex justify-center">{p.panel}</div>
        </div>
      ))}
    </div>
  );
}
