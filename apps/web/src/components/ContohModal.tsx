"use client";

import { useEffect, useState } from "react";
import { Portal } from "@/components/Portal";
import { CONTOH_INFO } from "@/lib/contohInfo";
import { Ikon } from "@/components/Ikon";

/**
 * Pemilih contoh Info bisnis, berbentuk modal berisi pratinjau.
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
 * KENAPA PRATINJAUNYA DI SINI, BUKAN DI BAWAH FORM.
 *
 * Versi keduanya memilih bidang lalu isinya LANGSUNG masuk ke kolom, tanpa
 * pernah bisa dilihat dulu. Jadi orang menimpa tulisannya sendiri cuma untuk
 * mencari tahu isi contohnya apa, lalu menekan Batal, lalu mencoba bidang
 * lain. Itu yang memunculkan pertanyaannya: "contohnya ditaruh di bawah form
 * saja bagaimana?"
 *
 * Menaruhnya di bawah form menyelesaikan satu hal dan merusak tiga. Di layar
 * 375px contohnya tidak pernah tampil bersamaan dengan kolom isiannya, jadi
 * orang menggulung bolak-balik, padahal contoh gunanya dilihat SAMBIL
 * mengetik. Isinya jadi hidup di tiga tempat: modal, panduan, dan halaman ini.
 * Dan contoh yang cuma bisa dibaca memaksa orang mengetik ulang semuanya,
 * padahal yang bikin tombol ini berguna justru isinya benar-benar masuk ke
 * kolomnya lalu tinggal ditimpa baris per baris.
 *
 * Jadi pratinjaunya ditaruh di sini, tempat ruangnya memang ada. Pilih bidang,
 * lihat isinya, baru tekan Pakai. Yang cuma mau melihat bentuknya tinggal
 * menutup, dan kolomnya tidak pernah tersentuh.
 *
 * Dua kolom cuma di layar lebar. Di HP kolom kiri selebar 240px menyisakan
 * pratinjau selebar 100px, jadi di sana bidangnya jadi deret yang digeser di
 * atas dan pratinjaunya mengisi sisanya.
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
  // Yang sedang DILIHAT belum tentu yang dipakai. Dua hal yang berbeda, dan
  // pemisahan itu seluruh gunanya layar ini.
  const [dilihat, setDilihat] = useState<string>(
    terpakai ?? CONTOH_INFO[0]?.id ?? "",
  );
  const [konfirmasi, setKonfirmasi] = useState(false);

  // Waktu modalnya dibuka lagi, yang ditampilkan yang sedang terpakai. Kalau
  // dia tetap menampilkan bidang terakhir yang cuma DILIHAT, orangnya mengira
  // itu yang ada di kolomnya.
  useEffect(() => {
    if (buka) setDilihat(terpakai ?? CONTOH_INFO[0]?.id ?? "");
  }, [buka, terpakai]);

  useEffect(() => {
    if (!buka) return;
    const esc = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      // Esc menutup konfirmasinya dulu, baru modalnya. Tanpa ini satu tekan
      // Esc membuang dua layar sekaligus dan orangnya kehilangan tempatnya.
      if (konfirmasi) setKonfirmasi(false);
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

  const aktif = CONTOH_INFO.find((c) => c.id === dilihat) ?? CONTOH_INFO[0];
  if (!aktif) return null;

  const pilihan = aktif;

  function pakai() {
    onPilih(pilihan.id, pilihan.isi);
    setKonfirmasi(false);
    onTutup();
  }

  const jumlahBaris = pilihan.isi.split("\n").filter((b) => b.trim()).length;

  return (
    <Portal>
      <div
        className="fixed inset-0 z-[60] flex items-center justify-center bg-ink-950/40 backdrop-blur-sm"
        onClick={() => (konfirmasi ? setKonfirmasi(false) : onTutup())}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Pilih contoh info bisnis"
          onClick={(e) => e.stopPropagation()}
          className="relative flex h-full w-full flex-col bg-white sm:h-[86vh] sm:max-h-[86vh] sm:max-w-4xl sm:rounded-2xl sm:shadow-2xl"
        >
          <div className="flex items-start justify-between gap-3 border-b border-ink-200 px-5 py-3.5">
            <div className="min-w-0">
              <h2 className="font-semibold text-ink-950">Pilih contoh</h2>
              <p className="mt-0.5 text-sm leading-relaxed text-ink-500">
                Lihat dulu isinya. Angkanya karangan, yang ditiru bentuknya.
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
            {/* Daftar bidang: kolom kiri di layar lebar, deret yang digeser di
                HP. Nama dan ikonnya diturunkan dari PRESET, jadi bidang yang ada
                di layar Asisten selalu ada di sini juga, dengan urutan sama. */}
            <div className="thin-scroll flex shrink-0 gap-2 overflow-x-auto border-b border-ink-200 px-4 py-3 sm:w-60 sm:flex-col sm:gap-1 sm:overflow-x-visible sm:overflow-y-auto sm:border-b-0 sm:border-r sm:px-3">
              {CONTOH_INFO.map((c) => {
                const ini = c.id === pilihan.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    aria-pressed={ini}
                    onClick={() => setDilihat(c.id)}
                    className={`tap-aman flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors sm:w-full ${
                      ini
                        ? "bg-ink-900 font-medium text-white"
                        : "text-ink-700 hover:bg-ink-100"
                    }`}
                  >
                    <Ikon
                      nama={c.ikon}
                      size={16}
                      className={ini ? "text-white" : "text-ink-400"}
                    />
                    <span className="whitespace-nowrap sm:truncate">{c.nama}</span>
                    {/* Yang sedang ada di kolom isian ditandai, supaya bedanya
                        dengan yang cuma sedang dilihat tetap jelas. */}
                    {terpakai === c.id && (
                      <Ikon
                        nama="centang"
                        size={14}
                        className={`ml-auto shrink-0 ${
                          ini ? "text-white" : "text-ink-400"
                        }`}
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Pratinjaunya. Huruf lebar-tetap dan latar gelap, sama seperti di
                panduan, supaya terbaca sebagai CONTOH yang dilihat, bukan
                sebagai kolom yang sedang diisi. */}
            {/* min-w-0 WAJIB, dan ini pasangan horizontal dari min-h-0.
                Isi <pre> punya baris yang panjang, jadi lebar alaminya jauh
                lebih besar daripada modalnya. Anak flex bawaannya
                min-width:auto, artinya dia MENOLAK menyusut di bawah lebar
                alami isinya, jadi kotak gelapnya melar keluar dari tepi kanan
                modal alih-alih menggulung di dalamnya. overflow-auto di <pre>
                tidak menolong sama sekali, karena yang kelewat lebar kotak
                pembungkusnya, bukan isinya.

                Cuma kelihatan di layar lebar: di HP susunannya menurun, dan di
                sana lebar itu sumbu silang yang memang mengikuti wadahnya. */}
            <div className="min-h-0 min-w-0 flex-1 p-3 sm:p-4">
              <pre className="thin-scroll h-full overflow-auto rounded-xl bg-ink-950 p-4 font-mono text-[12px] leading-[1.6] text-ink-300">
                {pilihan.isi}
              </pre>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-ink-200 px-5 py-3">
            <p className="hidden text-xs text-ink-500 sm:block">
              {jumlahBaris} baris. Masuk ke kolom isian, lalu tinggal kamu timpa.
            </p>
            <button
              type="button"
              onClick={() => (adaIsi ? setKonfirmasi(true) : pakai())}
              className="btn-ink ml-auto"
            >
              Pakai contoh ini
            </button>
          </div>

          {/* Menimpa tulisan orang tanpa bertanya itu kehilangan data yang tidak
              bisa dibatalkan. Konfirmasinya SAUDARA dari panel, bukan anak dari
              tombolnya. */}
          {konfirmasi && (
            <div className="absolute inset-0 flex items-end bg-ink-950/30 sm:items-center sm:justify-center sm:rounded-2xl">
              <div className="w-full border-t border-ink-200 bg-white p-5 sm:m-6 sm:w-auto sm:max-w-sm sm:rounded-2xl sm:border sm:shadow-xl">
                <p className="font-medium text-ink-950">
                  Ganti yang sudah kamu tulis?
                </p>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-600">
                  Isi kolomnya sekarang akan diganti contoh {pilihan.nama}.
                  Tulisan yang lama nggak bisa dibalikin.
                </p>
                <div className="mt-4 flex gap-2">
                  <button type="button" onClick={pakai} className="btn-ink flex-1">
                    Ganti
                  </button>
                  <button
                    type="button"
                    onClick={() => setKonfirmasi(false)}
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
    </Portal>
  );
}
