"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { tambahBerkasAction, type GaleriState } from "@/app/actions/galeri";
import { MAKS_MB, mb, periksaBerkas } from "@/lib/batas";
import { Ikon, type NamaIkon } from "@/components/Ikon";
import { InfoTip } from "@/components/InfoTip";

// Chip contoh: label pendek biar muat satu baris, tapi yang ditulis ke kotak
// tetap kalimat lengkapnya (itu yang dibaca asisten). Ikon kecil bikin tiap
// pilihan cepat dikenali, bukan sekadar pil teks.
const CONTOH: { label: string; nilai: string; ikon: NamaIkon }[] = [
  { label: "Minta lihat produk", nilai: "pelanggan minta lihat produknya", ikon: "gambar" },
  { label: "Tanya daftar harga", nilai: "pelanggan menanyakan daftar harga lengkap", ikon: "catat" },
  { label: "Mau bayar / QRIS", nilai: "pelanggan sudah mau bayar dan butuh nomor rekening atau QRIS", ikon: "qr" },
  { label: "Tanya lokasi toko", nilai: "pelanggan menanyakan alamat atau lokasi toko", ikon: "lokasi" },
];

function Submit({ terkunci }: { terkunci: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending || terkunci}>
      {pending ? "Mengunggah" : "Simpan"}
    </button>
  );
}

type Jenis = "" | "image" | "video" | "pdf";

function jenisDari(file: File): Jenis {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  if (file.type === "application/pdf") return "pdf";
  return "";
}

export function GaleriTambah({ agentId }: { agentId: string }) {
  const [state, formAction] = useActionState(tambahBerkasAction, {} as GaleriState);
  const [namaFile, setNamaFile] = useState("");
  const [keterangan, setKeterangan] = useState("");

  // Keluhan soal berkasnya diperiksa di browser, sebelum apa pun dikirim.
  const [keluhan, setKeluhan] = useState("");
  const [ukuran, setUkuran] = useState("");
  const [jenis, setJenis] = useState<Jenis>("");
  const [pratinjau, setPratinjau] = useState("");
  const [seret, setSeret] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  // Buang alamat pratinjau lama supaya tidak menumpuk di memori.
  useEffect(() => {
    return () => {
      if (pratinjau) URL.revokeObjectURL(pratinjau);
    };
  }, [pratinjau]);

  function pilihBerkas(file: File | undefined) {
    if (pratinjau) URL.revokeObjectURL(pratinjau);
    if (!file) {
      setNamaFile("");
      setKeluhan("");
      setUkuran("");
      setJenis("");
      setPratinjau("");
      return;
    }
    const j = jenisDari(file);
    setNamaFile(file.name);
    setUkuran(mb(file.size));
    setKeluhan(periksaBerkas(file) ?? "");
    setJenis(j);
    setPratinjau(j === "image" ? URL.createObjectURL(file) : "");
  }

  // Menyerahkan berkas yang di-drop ke input asli, supaya form tetap
  // mengirimnya seperti biasa waktu Simpan ditekan.
  function terimaSeret(file: File | undefined) {
    if (!file || !inputRef.current) return;
    const dt = new DataTransfer();
    dt.items.add(file);
    inputRef.current.files = dt.files;
    pilihBerkas(file);
  }

  function kosongkan() {
    if (inputRef.current) inputRef.current.value = "";
    pilihBerkas(undefined);
  }

  const adaFile = !!namaFile;
  // Baca-tulisan cuma masuk akal untuk gambar. Untuk PDF atau video, pilihannya
  // disembunyikan supaya tidak ada teks yang tidak berlaku.
  const bisaOCR = !adaFile || jenis === "image";

  return (
    <div className="card p-5">
      <h2 className="font-semibold text-ink-900">Tambah gambar</h2>
      <p className="mt-1 text-sm text-ink-500">
        Unggah foto produk, daftar harga, QRIS, atau apa pun yang sering kamu kirim
        manual ke pelanggan.
      </p>

      <form action={formAction} className="mt-5 space-y-4">
        <input type="hidden" name="agentId" value={agentId} />

        {/* Kotak seret-dan-lepas. Input aslinya disembunyikan; kotak inilah yang
            memicunya, dan menampilkan pratinjau begitu ada gambar dipilih. */}
        <div>
          <input
            ref={inputRef}
            id="file"
            name="file"
            type="file"
            accept="image/jpeg,image/png,image/webp,video/mp4,application/pdf"
            onChange={(e) => pilihBerkas(e.target.files?.[0])}
            className="sr-only"
          />

          {!adaFile ? (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setSeret(true);
              }}
              onDragLeave={() => setSeret(false)}
              onDrop={(e) => {
                e.preventDefault();
                setSeret(false);
                terimaSeret(e.dataTransfer.files?.[0]);
              }}
              className={`group flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 text-center transition ${
                seret
                  ? "border-brand-500 bg-brand-50"
                  : "border-ink-300 bg-ink-50/50 hover:border-brand-400 hover:bg-brand-50/50"
              }`}
            >
              <span
                className={`grid h-11 w-11 place-items-center rounded-full transition ${
                  seret ? "bg-brand-100 text-brand-700" : "bg-white text-ink-500 group-hover:text-brand-600"
                }`}
              >
                <Ikon nama="unggah" size={22} />
              </span>
              <span className="text-sm font-medium text-ink-800">
                Seret gambar ke sini, atau klik untuk pilih
              </span>
              <span className="text-xs text-ink-400">
                JPG, PNG, WEBP, video MP4, atau PDF · maksimal {MAKS_MB} MB
              </span>
            </button>
          ) : (
            <div
              className={`flex items-center gap-3 rounded-xl border p-3 ${
                keluhan ? "border-red-200 bg-red-50" : "border-ink-200 bg-white"
              }`}
            >
              <span className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-lg bg-ink-100 text-ink-500">
                {pratinjau ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={pratinjau} alt="" className="h-full w-full object-cover" />
                ) : (
                  <Ikon nama={jenis === "video" ? "gambar" : "berkas"} size={22} />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="line-clamp-1 text-sm font-medium text-ink-900">
                  {namaFile}
                </p>
                <p className="text-xs text-ink-400">
                  {jenis === "image"
                    ? "Gambar"
                    : jenis === "video"
                      ? "Video"
                      : jenis === "pdf"
                        ? "PDF"
                        : "Berkas"}
                  {ukuran && ` · ${ukuran}`}
                </p>
              </div>
              <button
                type="button"
                onClick={kosongkan}
                aria-label="Ganti berkas"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-ink-500 transition hover:bg-ink-100 hover:text-ink-800"
              >
                <Ikon nama="silang" size={18} />
              </button>
            </div>
          )}

          {keluhan ? (
            <p className="mt-1.5 text-sm leading-relaxed text-red-600">{keluhan}</p>
          ) : (
            adaFile && (
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="mt-1.5 text-xs font-medium text-brand-700 hover:underline"
              >
                Pilih berkas lain
              </button>
            )
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
            Ini yang dibaca asistenmu untuk memutuskan. Ketuk contoh di bawah, atau
            tulis sendiri.
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {CONTOH.map((c) => {
              const aktif = keterangan.trim() === c.nilai;
              return (
                <button
                  key={c.nilai}
                  type="button"
                  onClick={() => setKeterangan(aktif ? "" : c.nilai)}
                  aria-pressed={aktif}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition ${
                    aktif
                      ? "border-brand-600 bg-brand-600 text-white"
                      : "border-ink-200 text-ink-600 hover:border-brand-400 hover:bg-brand-50/60 hover:text-brand-700"
                  }`}
                >
                  <Ikon
                    nama={c.ikon}
                    size={14}
                    className={`shrink-0 ${aktif ? "text-white" : "text-ink-400"}`}
                  />
                  {c.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Baca-tulisan: satu baris ringkas, alasan panjangnya masuk InfoTip.
            Cuma muncul untuk gambar, karena memang cuma berlaku di gambar. */}
        {bisaOCR && (
          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-ink-200 bg-ink-50/60 p-3">
            <input
              type="checkbox"
              name="bacaIsinya"
              defaultChecked
              className="mt-0.5 h-4 w-4 rounded border-ink-300 text-brand-600 focus:ring-brand-500"
            />
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5">
                <span className="text-sm font-medium text-ink-800">
                  Baca juga tulisan di dalam gambarnya
                </span>
                <InfoTip judul="Baca tulisan di gambar">
                  Tanpa ini asistenmu bisa mengirim gambarnya tapi tidak tahu
                  isinya, jadi tetap tidak bisa menjawab &ldquo;berapa
                  harganya&rdquo;. Kalau dicentang, tulisan di gambar ikut masuk
                  ke Info bisnis. Cuma berlaku untuk gambar.
                </InfoTip>
              </span>
              <span className="mt-0.5 block text-xs leading-relaxed text-ink-500">
                Biar asisten bisa jawab &ldquo;berapa harganya&rdquo; dari tulisan
                di gambar.
              </span>
            </span>
          </label>
        )}

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
