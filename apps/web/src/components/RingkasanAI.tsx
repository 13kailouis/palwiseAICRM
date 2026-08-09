"use client";

import { useState } from "react";

/**
 * Ringkasan obrolan yang ditulis AI, dengan tombolnya sekalian.
 *
 * Sengaja dibuat waktu diklik, bukan otomatis tiap pesan masuk. Obrolan yang
 * ramai bisa puluhan pesan sehari, dan meringkas ulang tiap pesan berarti
 * membayar model puluhan kali untuk paragraf yang mungkin tidak pernah dibuka.
 *
 * Komponennya tidak menyimpan salinan isinya. Isinya selalu datang dari yang
 * memanggil, dan sesudah selesai dia cuma bilang "sudah, muat ulang". Kalau dia
 * menyimpan salinan sendiri, di kotak masuk yang menyegarkan datanya tiap empat
 * detik akan ada dua sumber kebenaran yang bisa berbeda.
 */
export function RingkasanAI({
  contactId,
  isi,
  dibuatPada,
  pesanTerakhir,
  onSelesai,
}: {
  contactId: string;
  isi: string | null;
  dibuatPada: string | null;
  /** Waktu pesan terakhir, untuk menandai ringkasan yang sudah ketinggalan. */
  pesanTerakhir: string | null;
  onSelesai: () => void | Promise<void>;
}) {
  const [jalan, setJalan] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Ringkasan lama yang dibaca sebagai kabar terbaru lebih berbahaya daripada
  // tidak ada ringkasan sama sekali, jadi ketinggalannya harus kelihatan.
  const basi =
    !!isi &&
    !!dibuatPada &&
    !!pesanTerakhir &&
    new Date(pesanTerakhir).getTime() > new Date(dibuatPada).getTime();

  async function buat(paksa: boolean) {
    if (jalan) return;
    setJalan(true);
    setError(null);
    try {
      const res = await fetch(`/api/kontak/${contactId}/ringkas`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ paksa }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error ?? "Gagal meringkas.");
      } else {
        await onSelesai();
      }
    } catch {
      setError("Tidak bisa menghubungi server.");
    } finally {
      setJalan(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-sm font-semibold text-ink-900">Ringkasan AI</h4>
        <button
          type="button"
          onClick={() => buat(!!isi)}
          disabled={jalan}
          className="tap-aman shrink-0 text-xs font-medium text-brand-700 hover:underline disabled:text-ink-400"
        >
          {jalan ? "Membaca obrolan..." : isi ? "Buat ulang" : "Buat"}
        </button>
      </div>

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

      {isi ? (
        <>
          <div className="mt-2 space-y-1 text-sm leading-relaxed text-ink-700">
            {isi.split("\n").map((baris, i) => (
              <p key={i}>{baris.replace(/^[-•]\s*/, "· ")}</p>
            ))}
          </div>
          {basi && (
            <p className="mt-2 text-[11px] text-amber-700">
              Ada pesan baru setelah ringkasan ini dibuat.
            </p>
          )}
        </>
      ) : (
        <p className="mt-2 text-xs leading-relaxed text-ink-500">
          Belum diringkas. Sekali klik, AI membaca obrolannya dan menuliskan
          intinya. Tidak memotong jatah balasan kamu.
        </p>
      )}
    </div>
  );
}
