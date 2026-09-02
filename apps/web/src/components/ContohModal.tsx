"use client";

import { useEffect, useState } from "react";
import { CONTOH_INFO } from "@/lib/contohInfo";
import { Ikon } from "@/components/Ikon";

/**
 * Pemilih contoh Info bisnis, berbentuk modal.
 *
 * KENAPA MODAL, BUKAN KOTAK YANG MEMBUKA DI TEMPAT.
 *
 * Versi pertamanya deret kotak bidang usaha yang muncul persis di atas kolom
 * isian. Sepuluh nama bidang itu tiga baris di layar lebar dan lebih banyak
 * lagi di HP, dan semuanya mendorong kolom isian ke bawah. Padahal kolom isian
 * itu satu-satunya alasan orang membuka layar ini. Ini pola yang sama dengan
 * catatan yang dulu memanjang di dalam daftar Info bisnis: apa pun yang tinggi
 * dan membuka DI DALAM halaman mendorong isi halamannya sendiri keluar layar.
 *
 * Sebagai modal, memilih contoh jadi satu pekerjaan utuh yang punya layarnya
 * sendiri, lalu halaman kembali seperti semula. Dan karena punya ruang
 * sendiri, tiap bidang bisa diberi keterangan isinya, jadi orang memilih
 * sambil tahu apa yang akan masuk ke kolomnya, bukan menebak dari namanya.
 *
 * Bentuknya mengikuti modal yang sudah dipakai di daftar Info bisnis: penuh
 * layar di HP, kartu di tengah pada layar lebar, Esc dan klik latar menutup.
 */
export function ContohModal({
  buka,
  onTutup,
  onPilih,
  adaIsi,
  terpakai,
}: {
  buka: boolean;
  onTutup: () => void;
  onPilih: (id: string, isi: string) => void;
  /** Kolomnya sudah ada tulisannya? Kalau iya, mengganti harus ditanya dulu. */
  adaIsi: boolean;
  terpakai: string | null;
}) {
  // Bidang yang sedang ditunggu jawabannya sebelum menimpa tulisan orang.
  const [konfirmasi, setKonfirmasi] = useState<string | null>(null);

  useEffect(() => {
    if (!buka) return;
    const esc = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      // Esc menutup konfirmasinya dulu, baru modalnya. Tanpa ini satu tekan
      // Esc membuang dua layar sekaligus dan orangnya kehilangan tempatnya.
      if (konfirmasi) setKonfirmasi(null);
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

  function pilih(id: string) {
    const c = CONTOH_INFO.find((x) => x.id === id);
    if (!c) return;
    onPilih(c.id, c.isi);
    setKonfirmasi(null);
    onTutup();
  }

  const namaKonfirmasi = CONTOH_INFO.find((c) => c.id === konfirmasi)?.nama;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-ink-950/40 backdrop-blur-sm"
      onClick={() => (konfirmasi ? setKonfirmasi(null) : onTutup())}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Pilih contoh info bisnis"
        onClick={(e) => e.stopPropagation()}
        className="relative flex h-full w-full flex-col bg-white sm:h-auto sm:max-h-[86vh] sm:max-w-2xl sm:rounded-2xl sm:shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-ink-200 px-5 py-4">
          <div className="min-w-0">
            <h2 className="font-semibold text-ink-950">Pilih contoh</h2>
            <p className="mt-1 text-sm leading-relaxed text-ink-500">
              Ambil yang paling dekat sama usahamu. Isinya cuma contoh bentuk
              dan angkanya karangan, jadi timpa dengan datamu sendiri.
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

        {/* Tiap bidang jadi satu baris yang bisa ditekan, bukan kotak kecil
            berisi nama saja. Keterangan blok di bawah namanya yang bikin orang
            memilih sambil tahu isinya, dan keterangan itu diturunkan dari
            contohnya sendiri jadi tidak bisa basi. */}
        <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4">
          <div className="grid gap-2 sm:grid-cols-2">
            {CONTOH_INFO.map((c) => {
              const aktif = terpakai === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  aria-pressed={aktif}
                  onClick={() => (adaIsi ? setKonfirmasi(c.id) : pilih(c.id))}
                  className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-colors ${
                    aktif
                      ? "border-brand-600 bg-brand-50"
                      : "border-ink-200 bg-white hover:border-ink-300 hover:bg-ink-50"
                  }`}
                >
                  <span
                    className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${
                      aktif
                        ? "bg-brand-600 text-white"
                        : "bg-ink-100 text-ink-600"
                    }`}
                  >
                    <Ikon nama={c.ikon} size={17} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-ink-900">
                      {c.nama}
                    </span>
                    {/* TANPA "block", walaupun kelihatannya perlu. line-clamp
                        butuh display:-webkit-box, dan "block" di sebelahnya
                        mengembalikan display:block lalu mematikan clamp-nya.
                        Kerusakannya cuma kelihatan di HP, karena di layar lebar
                        keterangannya kebetulan sudah muat dua baris. */}
                    <span className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-ink-500">
                      {c.blok.join(" · ")}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Menimpa tulisan orang tanpa bertanya itu kehilangan data yang tidak
            bisa dibatalkan, dan modal justru bikin tombolnya lebih gampang
            tertekan tidak sengaja. Konfirmasinya SAUDARA dari panel, bukan
            anak dari tombolnya. */}
        {konfirmasi && (
          <div className="absolute inset-0 flex items-end bg-ink-950/30 sm:items-center sm:justify-center sm:rounded-2xl">
            <div className="w-full border-t border-ink-200 bg-white p-5 sm:m-6 sm:w-auto sm:max-w-sm sm:rounded-2xl sm:border sm:shadow-xl">
              <p className="font-medium text-ink-950">
                Ganti yang sudah kamu tulis?
              </p>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-600">
                Isi kolomnya sekarang akan diganti contoh {namaKonfirmasi}.
                Tulisan yang lama nggak bisa dibalikin.
              </p>
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => pilih(konfirmasi)}
                  className="btn-ink flex-1"
                >
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
