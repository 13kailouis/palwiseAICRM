"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { tambahBerkasAction, type GaleriState } from "@/app/actions/galeri";
import { MAKS_MB, mb, periksaBerkas } from "@/lib/batas";

const CONTOH = [
  "pelanggan minta lihat produknya",
  "pelanggan menanyakan daftar harga lengkap",
  "pelanggan sudah mau bayar dan butuh nomor rekening atau QRIS",
  "pelanggan menanyakan alamat atau lokasi toko",
];

function Submit({ terkunci }: { terkunci: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending || terkunci}>
      {pending ? "Mengunggah" : "Simpan"}
    </button>
  );
}

export function GaleriTambah({ agentId }: { agentId: string }) {
  const [state, formAction] = useActionState(tambahBerkasAction, {} as GaleriState);
  const [namaFile, setNamaFile] = useState("");
  const [keterangan, setKeterangan] = useState("");

  // Keluhan soal berkasnya diperiksa di browser, sebelum apa pun dikirim.
  const [keluhan, setKeluhan] = useState("");
  const [ukuran, setUkuran] = useState("");

  function pilihBerkas(file: File | undefined) {
    if (!file) {
      setNamaFile("");
      setKeluhan("");
      setUkuran("");
      return;
    }
    setNamaFile(file.name);
    setUkuran(mb(file.size));
    setKeluhan(periksaBerkas(file) ?? "");
  }

  return (
    <div className="card p-5">
      <h2 className="font-semibold text-ink-900">Tambah gambar</h2>
      <p className="mt-1 text-sm text-ink-500">
        Unggah foto produk, daftar harga, QRIS, atau apa pun yang sering kamu kirim
        manual ke pelanggan.
      </p>

      <form action={formAction} className="mt-5 space-y-4">
        <input type="hidden" name="agentId" value={agentId} />

        <div>
          <label className="label" htmlFor="file">
            Gambarnya
          </label>
          <input
            id="file"
            name="file"
            type="file"
            accept="image/jpeg,image/png,image/webp,video/mp4,application/pdf"
            onChange={(e) => pilihBerkas(e.target.files?.[0])}
            className="input file:mr-3 file:rounded file:border-0 file:bg-ink-100 file:px-3 file:py-1.5 file:text-sm"
          />
          {keluhan ? (
            <p className="mt-1.5 text-sm leading-relaxed text-red-600">{keluhan}</p>
          ) : (
            <p className="hint">
              JPG, PNG, WEBP, video MP4, atau PDF. Maksimal {MAKS_MB} MB.
              {ukuran && ` Punyamu ${ukuran}.`}
            </p>
          )}
        </div>

        <div>
          <label className="label" htmlFor="name">
            Judul
          </label>
          <input
            id="name"
            name="name"
            className="input"
            placeholder="Foto Arabika Gayo 200gr"
            defaultValue={namaFile ? namaFile.replace(/\.[a-z0-9]+$/i, "") : ""}
            key={namaFile}
          />
          <p className="hint">Ini yang muncul sebagai keterangan di WhatsApp pelanggan.</p>
        </div>

        <div>
          <label className="label" htmlFor="description">
            Kapan ini pantas dikirim
          </label>
          <textarea
            id="description"
            name="description"
            rows={3}
            value={keterangan}
            onChange={(e) => setKeterangan(e.target.value)}
            className="input resize-y"
            placeholder="pelanggan menanyakan bentuk atau kemasan Arabika Gayo"
          />
          <p className="hint">
            Ini yang dibaca asistenmu untuk memutuskan. Makin jelas, makin jarang
            salah kirim.
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {CONTOH.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setKeterangan(c)}
                className="rounded-full border border-ink-200 px-2.5 py-1 text-xs text-ink-600 transition hover:border-brand-400 hover:text-brand-700"
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-ink-200 bg-ink-50/60 p-3">
          <input
            type="checkbox"
            name="bacaIsinya"
            defaultChecked
            className="mt-0.5 h-4 w-4 rounded border-ink-300 text-brand-600 focus:ring-brand-500"
          />
          <span>
            <span className="text-sm font-medium text-ink-800">
              Baca juga tulisan di dalam gambarnya
            </span>
            <span className="mt-0.5 block text-xs leading-relaxed text-ink-500">
              Tanpa ini asistenmu bisa mengirim gambarnya tapi tidak tahu isinya,
              jadi tetap tidak bisa menjawab &ldquo;berapa harganya&rdquo;. Kalau
              dicentang, tulisan di gambar ikut masuk ke Info bisnis. Cuma berlaku
              untuk gambar.
            </span>
          </span>
        </label>

        <div className="flex items-center gap-3">
          <Submit terkunci={!!keluhan} />
          {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
          {state?.message && !state.error && (
            <p className="text-sm text-brand-700">{state.message}</p>
          )}
        </div>
      </form>
    </div>
  );
}
