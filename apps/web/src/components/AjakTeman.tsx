"use client";

import { useState } from "react";
import { salinTeks } from "@/lib/salin";

export function AjakTeman({
  kode,
  tautan,
  diajak,
  sudahBerlangganan,
  bulanGratis,
}: {
  kode: string;
  tautan: string;
  diajak: number;
  sudahBerlangganan: number;
  bulanGratis: number;
}) {
  const [tersalin, setTersalin] = useState<"kode" | "tautan" | null>(null);
  const [gagalSalin, setGagalSalin] = useState(false);

  async function salin(teks: string, mana: "kode" | "tautan") {
    const berhasil = await salinTeks(teks);
    setGagalSalin(!berhasil);
    setTersalin(berhasil ? mana : null);
    // Gagalnya TIDAK ikut hilang sendiri. Kalau pesannya lenyap sesudah dua
    // detik, orangnya melihat kotak yang berkedip lalu kembali seperti semula,
    // dan itu sama membingungkannya dengan tidak ada tanda sama sekali.
    if (berhasil) setTimeout(() => setTersalin(null), 2500);
  }

  const pesanWa = encodeURIComponent(
    `Aku pakai Palwise buat bales chat WhatsApp toko otomatis, lumayan ngebantu. ` +
      `Kalau kamu daftar lewat link ini, kita berdua dapat 1 bulan gratis:\n${tautan}`,
  );

  return (
    <div className="card-pad">
      <h2 className="font-semibold text-ink-900">Ajak teman</h2>
      <p className="mt-1 text-sm leading-relaxed text-ink-500">
        Kalau temanmu daftar lewat kodemu lalu berlangganan, kalian berdua dapat
        1 bulan gratis. Hadiahnya cair saat dia mulai berlangganan, bukan saat
        dia mendaftar.
      </p>

      <dl className="mt-5 grid grid-cols-3 gap-4 border-y border-ink-100 py-4 text-sm">
        <div>
          <dt className="text-ink-500">Sudah diajak</dt>
          <dd className="mt-0.5 text-xl font-semibold text-ink-950">{diajak}</dd>
        </div>
        <div>
          <dt className="text-ink-500">Berlangganan</dt>
          <dd className="mt-0.5 text-xl font-semibold text-ink-950">
            {sudahBerlangganan}
          </dd>
        </div>
        <div>
          <dt className="text-ink-500">Bulan gratis</dt>
          <dd className="mt-0.5 text-xl font-semibold text-brand-700">
            {bulanGratis}
          </dd>
        </div>
      </dl>

      <div className="mt-5 space-y-3">
        <div>
          <label className="label" htmlFor="kode-ajak">
            Kode kamu
          </label>
          <div className="flex gap-2">
            <input
              id="kode-ajak"
              readOnly
              value={kode}
              onFocus={(e) => e.currentTarget.select()}
              className="input max-w-[160px] font-mono text-lg tracking-widest"
            />
            <button
              type="button"
              onClick={() => salin(kode, "kode")}
              className="btn-ghost"
            >
              {tersalin === "kode" ? "Tersalin" : "Salin"}
            </button>
          </div>
        </div>

        <div>
          <label className="label" htmlFor="tautan-ajak">
            Tautannya
          </label>
          <div className="flex gap-2">
            <input
              id="tautan-ajak"
              readOnly
              value={tautan}
              onFocus={(e) => e.currentTarget.select()}
              className="input"
            />
            <button
              type="button"
              onClick={() => salin(tautan, "tautan")}
              className="btn-ghost shrink-0"
            >
              {tersalin === "tautan" ? "Tersalin" : "Salin"}
            </button>
          </div>
        </div>

        {/* Kegagalan menyalin harus kelihatan, bukan didiamkan.
            Seluruh guna tombolnya memang menyalin, jadi kalau gagal tanpa
            tanda, orangnya cuma mengira dirinya salah pencet. */}
        {gagalSalin && (
          <p className="w-full text-xs text-amber-700">
            Browsernya tidak mengizinkan menyalin otomatis. Blok teksnya lalu
            salin manual ya.
          </p>
        )}
        <a
          href={`https://wa.me/?text=${pesanWa}`}
          target="_blank"
          rel="noreferrer"
          className="btn-primary"
        >
          Kirim lewat WhatsApp
        </a>
      </div>

      {bulanGratis > 0 && (
        <p className="mt-4 rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-900">
          Kamu punya {bulanGratis} bulan gratis. Ini dipotong otomatis dari
          tagihan begitu sistem pembayaran aktif.
        </p>
      )}
    </div>
  );
}
