"use client";

import { useEffect, useState } from "react";
import { Ikon } from "@/components/Ikon";
import {
  NAMA_KOTAK,
  PRESET,
  isiPenanda,
  isiPreset,
  type Preset,
} from "@/lib/preset";

/**
 * Pemilih contoh isian menurut jenis usaha.
 *
 * Isinya cuma mengisi kotak-kotak di formulir yang sama, tidak menyimpan apa
 * pun sendiri dan tidak menyalakan cabang khusus di mana pun. Sesudah dipakai,
 * teksnya jadi milik pemiliknya dan boleh diubah sebebasnya.
 *
 * DIROMBAK 3 September 2026, dan tiga hal diperbaiki sekaligus.
 *
 * 1. ISINYA BISA DILIHAT DULU. Sebelum ini, menekan satu bidang usaha langsung
 *    menimpa TUJUH kotak sekaligus, termasuk seluruh watak dan aturan
 *    asistennya, tanpa isinya pernah bisa dilihat. Jadi satu-satunya cara tahu
 *    isi contohnya apa adalah menimpanya dulu. Ini tombol yang sama yang dulu
 *    pernah MENURUNKAN mutu asisten orang, jadi taruhannya bukan kenyamanan.
 *
 * 2. TIDAK LAGI MEMBUKA DI DALAM HALAMAN. Dulu <details> yang kalau dibuka
 *    memajang sepuluh kartu dan mendorong "Cara dia bicara" jauh ke bawah,
 *    padahal bagian itu yang paling menentukan. Sekarang modal: memilih contoh
 *    jadi satu pekerjaan yang punya layarnya sendiri, lalu halaman kembali
 *    seperti semula.
 *
 * 3. KONFIRMASINYA DI DALAM APLIKASI. Dulu window.confirm bawaan browser, satu-
 *    satunya dialog bawaan yang tersisa. Sekarang kotak yang sama dengan yang
 *    dipakai modal contoh Info bisnis.
 *
 * Kotak yang sudah ada isinya tetap tidak ditimpa diam-diam. Orang yang sudah
 * menulis sendiri lalu penasaran menekan salah satu tombol ini tidak boleh
 * kehilangan tulisannya gara-gara ingin tahu.
 */
export function PresetUsaha({ namaBisnis }: { namaBisnis: string }) {
  const [buka, setBuka] = useState(false);
  const [dipakai, setDipakai] = useState<string | null>(null);
  const [terlewat, setTerlewat] = useState(0);

  return (
    <>
      {/* Pemicunya satu baris, bukan kartu yang bisa mekar. Baris ini duduk
          tepat di atas kotak yang paling menentukan di halaman Asisten, jadi
          apa pun yang tumbuh di sini membayar ongkosnya dengan mendorong kotak
          itu ke bawah. */}
      <button
        type="button"
        onClick={() => setBuka(true)}
        className="card tap-aman flex w-full items-center justify-between gap-3 p-4 text-left transition hover:border-ink-300 sm:p-5"
      >
        <span className="min-w-0">
          <span className="block font-semibold text-ink-900">
            Mulai dari contoh
          </span>
          <span className="mt-0.5 block text-sm text-ink-500">
            {dipakai
              ? "Contohnya sudah masuk. Buka lagi kalau mau ganti bidang."
              : "Baru pertama? Isi semua kotak otomatis sesuai jenis usahamu."}
          </span>
        </span>
        <span className="shrink-0 text-ink-400" aria-hidden="true">
          <Ikon nama="perbesar" size={18} />
        </span>
      </button>

      {dipakai && (
        <p className="mt-3 text-sm leading-relaxed text-ink-600">
          Contohnya sudah dimasukkan ke kotak-kotak di bawah, lengkap dengan
          nama usahamu. Baca sekali, ubah yang perlu, lalu simpan.
          {terlewat > 0 &&
            " Bagian yang sekarang mati belum ikut terisi. Nyalakan dulu bagiannya, lalu buka lagi contohnya."}
        </p>
      )}

      <PresetModal
        buka={buka}
        namaBisnis={namaBisnis}
        terpakai={dipakai}
        onTutup={() => setBuka(false)}
        onPakai={(id, lewat) => {
          setDipakai(id);
          setTerlewat(lewat);
        }}
      />
    </>
  );
}

function PresetModal({
  buka,
  namaBisnis,
  terpakai,
  onTutup,
  onPakai,
}: {
  buka: boolean;
  namaBisnis: string;
  terpakai: string | null;
  onTutup: () => void;
  onPakai: (id: string, terlewat: number) => void;
}) {
  const [dilihat, setDilihat] = useState<string>(
    terpakai ?? PRESET[0]?.id ?? "",
  );
  // Berapa kotak yang sudah ada tulisannya. Angkanya dipakai di kalimat
  // konfirmasi, jadi orangnya tahu seberapa banyak yang akan hilang.
  const [konfirmasi, setKonfirmasi] = useState<number | null>(null);

  useEffect(() => {
    if (buka) setDilihat(terpakai ?? PRESET[0]?.id ?? "");
  }, [buka, terpakai]);

  useEffect(() => {
    if (!buka) return;
    const esc = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (konfirmasi !== null) setKonfirmasi(null);
      else onTutup();
    };
    document.addEventListener("keydown", esc);
    const simpan = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", esc);
      document.body.style.overflow = simpan;
    };
  }, [buka, konfirmasi, onTutup]);

  if (!buka) return null;

  const aktif = PRESET.find((p) => p.id === dilihat) ?? PRESET[0];
  if (!aktif) return null;

  const pilihan: Preset = aktif;

  // Nama usahanya sudah diisikan DI PRATINJAU, bukan cuma waktu dipakai.
  // Pratinjau yang masih memperlihatkan [nama toko] bukan pratinjau isi yang
  // akan masuk, dan penanda yang lolos ke sapaan pembuka sampai ke pelanggan.
  const isian = isiPreset(pilihan).map(
    ([id, teks]) => [id, isiPenanda(teks, namaBisnis)] as [string, string],
  );

  function hitungTerisi() {
    return isian.filter(([id]) => {
      const el = document.getElementById(id) as HTMLTextAreaElement | null;
      return el && el.value.trim() !== "";
    }).length;
  }

  function pakai() {
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
    onPakai(pilihan.id, lewat);
    setKonfirmasi(null);
    onTutup();
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-ink-950/40 backdrop-blur-sm"
      onClick={() => (konfirmasi !== null ? setKonfirmasi(null) : onTutup())}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Pilih contoh jenis usaha"
        onClick={(e) => e.stopPropagation()}
        className="relative flex h-full w-full flex-col bg-white sm:h-[86vh] sm:max-h-[86vh] sm:max-w-4xl sm:rounded-2xl sm:shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-ink-200 px-5 py-3.5">
          <div className="min-w-0">
            <h2 className="font-semibold text-ink-950">Mulai dari contoh</h2>
            <p className="mt-0.5 text-sm leading-relaxed text-ink-500">
              Lihat dulu tulisan yang akan masuk ke kotak-kotakmu.
            </p>
          </div>
          <button
            type="button"
            onClick={onTutup}
            aria-label="Tutup"
            className="tap-aman -mr-1 grid h-9 w-9 shrink-0 place-items-center rounded-lg text-ink-500 hover:bg-ink-100 hover:text-ink-900"
          >
            <Ikon nama="silang" size={18} />
          </button>
        </div>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col sm:flex-row">
          <div className="thin-scroll flex shrink-0 gap-2 overflow-x-auto border-b border-ink-200 px-4 py-3 sm:w-64 sm:flex-col sm:gap-1 sm:overflow-x-visible sm:overflow-y-auto sm:border-b-0 sm:border-r sm:px-3">
            {PRESET.map((p) => {
              const ini = p.id === pilihan.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  aria-pressed={ini}
                  onClick={() => setDilihat(p.id)}
                  className={`tap-aman flex shrink-0 items-start gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors sm:w-full ${
                    ini
                      ? "bg-ink-900 font-medium text-white"
                      : "text-ink-700 hover:bg-ink-100"
                  }`}
                >
                  <Ikon
                    nama={p.ikon}
                    size={16}
                    className={`mt-0.5 shrink-0 ${
                      ini ? "text-white" : "text-ink-400"
                    }`}
                  />
                  <span className="min-w-0">
                    <span className="block whitespace-nowrap sm:whitespace-normal">
                      {p.nama}
                    </span>
                    {/* Contoh pertanyaan, bukan penjelasan kategori. Orang
                        mengenali dirinya dari pertanyaan pelanggannya, bukan
                        dari nama bidangnya. Disembunyikan di HP karena di sana
                        deretnya digeser menyamping dan tiap kartu jadi terlalu
                        lebar untuk dijangkau ibu jari. */}
                    <span
                      className={`mt-0.5 hidden text-xs leading-relaxed sm:block ${
                        ini ? "text-white/70" : "text-ink-500"
                      }`}
                    >
                      {p.contoh}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          {/* Pratinjaunya per kotak, bukan satu gumpalan teks. Yang mau
              diketahui orang bukan cuma "tulisannya apa", tapi "yang mana yang
              akan ketimpa", dan tujuh kotak yang disambung tanpa label tidak
              menjawab itu. */}
          <div className="thin-scroll min-h-0 min-w-0 flex-1 space-y-3 overflow-y-auto p-3 sm:p-4">
            {isian.map(([id, teks]) => (
              <div key={id}>
                <p className="text-xs font-medium text-ink-700">
                  {NAMA_KOTAK[id] ?? id}
                </p>
                <pre className="thin-scroll mt-1 overflow-x-auto whitespace-pre-wrap break-words rounded-lg bg-ink-50 p-3 font-mono text-[11.5px] leading-[1.6] text-ink-700">
                  {teks}
                </pre>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-ink-200 px-5 py-3">
          <p className="hidden text-xs text-ink-500 sm:block">
            {isian.length} kotak akan diisi, lengkap dengan nama usahamu.
          </p>
          <button
            type="button"
            onClick={() => {
              const n = hitungTerisi();
              if (n > 0) setKonfirmasi(n);
              else pakai();
            }}
            className="btn-ink ml-auto"
          >
            Pakai contoh ini
          </button>
        </div>

        {konfirmasi !== null && (
          <div className="absolute inset-0 flex items-end bg-ink-950/30 sm:items-center sm:justify-center sm:rounded-2xl">
            <div className="w-full border-t border-ink-200 bg-white p-5 sm:m-6 sm:w-auto sm:max-w-sm sm:rounded-2xl sm:border sm:shadow-xl">
              <p className="font-medium text-ink-950">
                Ganti yang sudah kamu tulis?
              </p>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-600">
                Ada {konfirmasi} kotak yang sudah kamu isi sendiri. Isinya akan
                diganti contoh {pilihan.nama}, dan tulisan yang lama nggak bisa
                dibalikin.
              </p>
              <div className="mt-4 flex gap-2">
                <button type="button" onClick={pakai} className="btn-ink flex-1">
                  Ganti
                </button>
                <button
                  type="button"
                  onClick={() => setKonfirmasi(null)}
                  className="btn-ghost flex-1"
                >
                  Batal
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
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
