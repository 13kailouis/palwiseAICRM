"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";

/**
 * Tombol hapus dua langkah.
 *
 * Sebelum ini semua tombol hapus langsung jalan begitu diklik. Yang paling
 * berbahaya "Hapus asisten": satu klik salah ikut menghapus seluruh info
 * bisnis dan semua gambarnya, karena relasinya cascade. Tidak ada jalan
 * kembali.
 *
 * Dipakai konfirmasi di tempat, bukan kotak dialog bawaan browser, karena
 * dialog itu bisa diblokir dan tidak bisa menjelaskan apa saja yang ikut
 * terhapus.
 */
function Kirim({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-red-700 disabled:opacity-60"
    >
      {pending ? "Menghapus" : label}
    </button>
  );
}

export function TombolHapus({
  action,
  fields,
  label = "Hapus",
  konfirmasi,
  penuh = false,
}: {
  action: (formData: FormData) => Promise<void>;
  /** Kolom tersembunyi yang ikut dikirim, misalnya id. */
  fields: Record<string, string>;
  label?: string;
  /** Apa saja yang ikut hilang. Ditulis apa adanya, jangan diperhalus. */
  konfirmasi: string;
  penuh?: boolean;
}) {
  const [tanya, setTanya] = useState(false);

  if (!tanya) {
    return (
      <button
        type="button"
        onClick={() => setTanya(true)}
        className={`btn-danger px-3 py-1.5 text-xs ${penuh ? "w-full" : ""}`}
      >
        {label}
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-3">
      <p className="text-xs leading-relaxed text-red-900">{konfirmasi}</p>
      <div className="mt-2.5 flex gap-2">
        <form action={action}>
          {Object.entries(fields).map(([nama, nilai]) => (
            <input key={nama} type="hidden" name={nama} value={nilai} />
          ))}
          <Kirim label="Ya, hapus" />
        </form>
        <button
          type="button"
          onClick={() => setTanya(false)}
          className="rounded-lg border border-ink-200 bg-white px-3 py-1.5 text-xs text-ink-700 hover:bg-ink-50"
        >
          Batal
        </button>
      </div>
    </div>
  );
}
