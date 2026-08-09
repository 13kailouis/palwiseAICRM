"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Memastikan jadwal, dengan pilihan mengabari pelanggannya sekalian.
 *
 * Pesannya SELALU diperlihatkan dulu dan boleh diubah sebelum terkirim. Ini
 * satu-satunya tempat di Palwise yang mengirim pesan ke pelanggan karena
 * pemiliknya menekan tombol, bukan karena pelanggannya menyapa duluan, jadi
 * tidak boleh ada satu pun kalimat yang keluar tanpa dia baca lebih dulu.
 *
 * "Cukup pastikan" tetap ada karena banyak yang sudah mengabari sendiri lewat
 * telepon, dan memaksa mereka mengirim pesan kedua bikin pelanggannya bingung.
 */
export function PastikanJanji({
  contactId,
  draft,
  bisaKabari,
}: {
  contactId: string;
  draft: string;
  /** false kalau pelanggan ini belum punya obrolan lewat nomor tersambung. */
  bisaKabari: boolean;
}) {
  const router = useRouter();
  const [buka, setBuka] = useState(false);
  const [teks, setTeks] = useState(draft);
  const [jalan, setJalan] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function kirim(kabari: boolean) {
    if (jalan) return;
    setJalan(true);
    setError(null);
    try {
      const res = await fetch(`/api/kontak/${contactId}/pastikan-janji`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kabari, teks }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error ?? "Gagal.");
      } else {
        setBuka(false);
        router.refresh();
      }
    } catch {
      setError("Tidak bisa menghubungi server.");
    } finally {
      setJalan(false);
    }
  }

  if (!buka) {
    return (
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {bisaKabari && (
          <button
            type="button"
            onClick={() => setBuka(true)}
            className="tap-aman text-xs font-medium text-amber-900 underline"
          >
            Pastikan dan kabari
          </button>
        )}
        <button
          type="button"
          onClick={() => kirim(false)}
          disabled={jalan}
          className="tap-aman text-xs text-amber-800 underline disabled:opacity-50"
        >
          {jalan ? "Sebentar" : "Cukup pastikan"}
        </button>
        {error && <p className="w-full text-xs text-red-700">{error}</p>}
      </div>
    );
  }

  return (
    <div className="w-full">
      <label className="text-xs text-ink-600" htmlFor="kabarJanji">
        Pesan yang akan dikirim ke pelanggan
      </label>
      <textarea
        id="kabarJanji"
        value={teks}
        onChange={(e) => setTeks(e.target.value)}
        rows={4}
        className="input mt-1 resize-y"
      />
      {error && <p className="mt-2 text-xs text-red-700">{error}</p>}
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => kirim(true)}
          disabled={jalan || !teks.trim()}
          className="btn-primary px-4 py-1.5 text-xs"
        >
          {jalan ? "Mengirim" : "Kirim dan pastikan"}
        </button>
        <button
          type="button"
          onClick={() => setBuka(false)}
          className="tap-aman text-xs text-ink-600 underline"
        >
          Batal
        </button>
        <span className="text-xs text-ink-400">
          Terkirim lewat WhatsApp seperti kamu membalas sendiri.
        </span>
      </div>
    </div>
  );
}
