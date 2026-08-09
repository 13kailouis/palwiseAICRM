"use client";

import { useState } from "react";
import { Ikon } from "@/components/Ikon";
import { PRESET, type Preset } from "@/lib/preset";

/**
 * Pemilih contoh isian menurut jenis usaha.
 *
 * Isinya cuma mengisi kotak-kotak di formulir yang sama, tidak menyimpan apa
 * pun sendiri dan tidak menyalakan cabang khusus di mana pun. Sesudah dipakai,
 * teksnya jadi milik pemiliknya dan boleh diubah sebebasnya.
 *
 * Kotak yang sudah ada isinya tidak ditimpa diam-diam. Orang yang sudah menulis
 * sendiri lalu penasaran menekan salah satu tombol ini tidak boleh kehilangan
 * tulisannya gara-gara ingin tahu.
 */
export function PresetUsaha() {
  const [dipakai, setDipakai] = useState<string | null>(null);
  const [terlewat, setTerlewat] = useState(0);

  function isi(preset: Preset) {
    const isian: [string, string][] = [
      ["behaviorPrompt", preset.behaviorPrompt],
      ["welcomeMessage", preset.welcomeMessage],
      ["handoffCondition", preset.handoffCondition],
      ["followUpPrompt", preset.followUpPrompt],
      ["afterSalesPrompt", preset.afterSalesPrompt],
      ["restockPrompt", preset.restockPrompt],
      ["pengingatPrompt", preset.pengingatPrompt],
    ];

    const terisi = isian.filter(([id]) => {
      const el = document.getElementById(id) as HTMLTextAreaElement | null;
      return el && el.value.trim() !== "";
    });

    if (terisi.length > 0) {
      const ya = window.confirm(
        `Ada ${terisi.length} kotak yang sudah kamu isi sendiri. Timpa dengan contoh ${preset.nama}?`,
      );
      if (!ya) return;
    }

    let lewat = 0;
    for (const [id, nilai] of isian) {
      const el = document.getElementById(id) as
        | HTMLTextAreaElement
        | HTMLInputElement
        | null;
      // Kotak milik bagian yang sedang dimatikan memang belum digambar. Itu
      // dihitung dan diberitahukan, bukan didiamkan, karena kalau didiamkan
      // orang mengira semuanya sudah terisi lalu menyalakan sapaan otomatis
      // berbulan-bulan kemudian dengan kalimat bawaan yang salah bidang.
      if (!el) {
        lewat++;
        continue;
      }
      setNilai(el, nilai);
    }

    setTerlewat(lewat);
    setDipakai(preset.id);
  }

  return (
    <section className="card-pad">
      <h2 className="font-semibold text-ink-900">Mulai dari contoh</h2>
      <p className="mb-5 mt-1 max-w-prose text-sm leading-relaxed text-ink-500">
        Pilih yang paling dekat dengan usahamu, nanti semua kotak di halaman ini
        terisi contoh yang masuk akal. Sesudah itu ubah sesukamu, ini cuma titik
        mulai supaya kamu tidak menghadap kotak kosong.
      </p>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {PRESET.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => isi(p)}
            className={`flex items-start gap-3 rounded-xl border px-3.5 py-3 text-left transition ${
              dipakai === p.id
                ? "border-brand-500 bg-brand-50"
                : "border-ink-200 hover:border-brand-400 hover:bg-ink-50"
            }`}
          >
            <span className="mt-0.5 shrink-0 text-ink-500">
              <Ikon nama={p.ikon} size={20} />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-medium text-ink-900">
                {p.nama}
              </span>
              {/* Contoh pertanyaan, bukan penjelasan kategori. Orang mengenali
                  dirinya dari pertanyaan pelanggannya, bukan dari nama
                  bidangnya. */}
              <span className="mt-0.5 block text-xs leading-relaxed text-ink-500">
                {p.contoh}
              </span>
            </span>
          </button>
        ))}
      </div>

      {dipakai && (
        <p className="mt-4 text-sm leading-relaxed text-ink-600">
          Contohnya sudah dimasukkan ke kotak-kotak di bawah. Ganti bagian dalam
          tanda kurung siku dengan nama usahamu sendiri, lalu simpan.
          {terlewat > 0 &&
            " Bagian yang sekarang mati belum ikut terisi. Nyalakan dulu bagiannya, lalu tekan tombol ini lagi."}
        </p>
      )}
    </section>
  );
}

/**
 * Isi kotak lewat penyetel bawaan browser, bukan lewat `el.value = ...`.
 *
 * React menyimpan catatan sendiri soal nilai terakhir tiap kotak. Kalau
 * nilainya diubah langsung, catatan itu tidak ikut berubah, jadi React
 * menganggap tidak ada yang terjadi dan kotak yang tingginya menyesuaikan isi
 * tidak pernah memanjang. Lewat penyetel prototipe, catatannya ikut basi dan
 * peristiwa "input" diproses seperti orang mengetik sungguhan.
 */
function setNilai(el: HTMLTextAreaElement | HTMLInputElement, nilai: string) {
  const proto =
    el instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
  if (setter) setter.call(el, nilai);
  else el.value = nilai;
  el.dispatchEvent(new Event("input", { bubbles: true }));
}
