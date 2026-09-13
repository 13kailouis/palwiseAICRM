"use client";

import { useState } from "react";
import Link from "next/link";

/** Simulasi beban kerja, bukan proyeksi penjualan atau jaminan penghematan. */
export function HitungWaktu({ keDaftar }: { keDaftar: string }) {
  const [chat, setChat] = useState(20);
  const [berulang, setBerulang] = useState(50);
  const [menit, setMenit] = useState(3);
  const [hari, setHari] = useState(22);
  const percakapan = chat * hari * berulang / 100;
  const jam = percakapan * menit / 60;
  const geser = [
    { label: "Percakapan calon peserta per hari", nilai: chat, set: setChat, min: 0, maks: 200, langkah: 1, tampil: `${chat} percakapan` },
    { label: "Yang berisi pertanyaan berulang", nilai: berulang, set: setBerulang, min: 0, maks: 100, langkah: 5, tampil: `${berulang}%` },
    { label: "Waktu admin per percakapan berulang", nilai: menit, set: setMenit, min: 1, maks: 20, langkah: 1, tampil: `${menit} menit` },
    { label: "Hari melayani chat per bulan", nilai: hari, set: setHari, min: 1, maks: 31, langkah: 1, tampil: `${hari} hari` },
  ];

  return (
    <div className="mx-auto grid max-w-5xl overflow-hidden rounded-3xl border border-ink-200 bg-white lg:grid-cols-[1.1fr_1fr]">
      <div className="space-y-6 p-5 sm:p-8">
        <p className="text-xs text-ink-500">Angka awal hanya ilustrasi. Sesuaikan dengan pekerjaan adminmu.</p>
        {geser.map((g) => (
          <label key={g.label} className="block">
            <span className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="text-sm text-ink-700">{g.label}</span>
              <span className="text-base font-bold tabular-nums text-ink-950">{g.tampil}</span>
            </span>
            <input type="range" min={g.min} max={g.maks} step={g.langkah} value={g.nilai}
              onChange={(e) => g.set(Number(e.target.value))}
              className="mt-2 h-11 w-full cursor-pointer accent-brand-600"
              aria-label={g.label} aria-valuetext={g.tampil} />
          </label>
        ))}
      </div>
      <div className="flex flex-col justify-between gap-6 bg-ink-950 p-5 text-white sm:p-8">
        <div aria-live="polite" aria-atomic="true">
          <p className="text-sm text-white/70">Waktu untuk menjawab pertanyaan berulang</p>
          <p className="mt-2 text-[40px] font-bold leading-tight tabular-nums sm:text-[48px]">
            {jam.toLocaleString("id-ID", { maximumFractionDigits: 1 })} jam
          </p>
          <p className="mt-2 text-sm text-white/70">per bulan, dari sekitar {Math.round(percakapan).toLocaleString("id-ID")} percakapan</p>
          <p className="mt-6 text-sm leading-relaxed text-white/85">
            Palwise dapat membantu menjawab dari info programmu. Tim tetap memeriksa jawaban,
            menangani pertanyaan khusus, dan memastikan jadwal.
          </p>
        </div>
        <div>
          <Link href={keDaftar} className="btn-besar inline-flex w-full items-center justify-center rounded-xl bg-white font-semibold text-ink-950 transition hover:bg-ink-100">
            Coba dengan pertanyaan calon peserta
          </Link>
          <p className="mt-3 text-xs leading-relaxed text-white/60">
            Ini perkiraan beban kerja saat ini, bukan jumlah jam yang pasti dihemat. Hitungan hanya di browsermu.
          </p>
        </div>
      </div>
    </div>
  );
}
