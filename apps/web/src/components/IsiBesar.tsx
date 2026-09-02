"use client";

import { useEffect, useRef, useState } from "react";
import { Portal } from "@/components/Portal";
import { Ikon } from "@/components/Ikon";
import { setNilaiKotak } from "@/lib/isiKotak";

/**
 * Kotak isi Info bisnis yang dibuka jadi satu layar penuh.
 *
 * Kolom isian di panel Tambah info duduk di kolom kanan yang sempit, dan
 * isinya daftar harga yang panjang. Dua hal itu bertabrakan: baris "Kelola
 * media sosial, mulai Rp 3.500.000 per bulan. 12 konten feed, 20 story,
 * laporan bulanan." terlipat jadi tiga baris di kolom selebar itu, dan
 * daftar yang tiap barisnya terlipat tiga jadi tidak bisa dibaca sebagai
 * daftar sama sekali.
 *
 * Mengecilkan hurufnya menolong sedikit, tapi tidak menyelesaikan: yang kurang
 * LEBARNYA, bukan ukuran hurufnya. Jadi kotaknya bisa dibuka penuh, tempat
 * satu baris benar-benar muat satu baris.
 *
 * Tidak ada tombol simpan di sini, dan itu disengaja. Kotak ini menulis ke
 * kolom yang sama dengan kotak kecilnya, jadi apa pun yang diketik di sini
 * sudah ada di formnya begitu ditutup. Tombol "Simpan" kedua di dalam modal
 * bikin orang mengira ada dua simpanan yang berbeda, lalu ragu yang mana yang
 * benar-benar menyimpan.
 */
export function IsiBesar({
  buka,
  nilai,
  onUbah,
  onTutup,
  judul = "Isi info bisnis",
  placeholder,
  prosa = false,
}: {
  buka: boolean;
  nilai: string;
  onUbah: (v: string) => void;
  onTutup: () => void;
  /** Judul di kepalanya. Kotak ini dipakai beberapa layar yang berbeda. */
  judul?: string;
  placeholder?: string;
  /**
   * Huruf biasa, bukan huruf lebar-tetap.
   *
   * Kotak data (daftar harga) memang lebar-tetap supaya angkanya berbaris
   * lurus. Tapi prompt asisten itu karangan tentang orang, bukan tabel, dan
   * ditulis berhuruf lebar-tetap dia terbaca seperti berkas pengaturan, tepat
   * berlawanan dengan kalimat di atasnya yang menyuruh "tulis kayak lagi
   * ngelatih karyawan baru". Kotak besarnya wajib ikut kotak aslinya.
   */
  prosa?: boolean;
}) {
  const kotak = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!buka) return;
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onTutup();
    };
    document.addEventListener("keydown", esc);
    const simpan = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // Kursornya langsung di kotaknya. Orang menekan tombol perbesar justru
    // karena mau mengetik, jadi menyuruhnya menekan sekali lagi cuma
    // menambah satu langkah yang tidak ada gunanya.
    kotak.current?.focus();
    return () => {
      document.removeEventListener("keydown", esc);
      document.body.style.overflow = simpan;
    };
  }, [buka, onTutup]);

  if (!buka) return null;

  const baris = nilai ? nilai.split("\n").length : 0;
  const huruf = nilai.length;

  return (
    <Portal>
      <div
        className="fixed inset-0 z-[60] flex items-center justify-center bg-ink-950/40 backdrop-blur-sm"
        onClick={onTutup}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-label={judul}
          onClick={(e) => e.stopPropagation()}
          className="flex h-full w-full flex-col bg-white sm:h-[88vh] sm:max-w-5xl sm:rounded-2xl sm:shadow-2xl"
        >
          <div className="flex items-center justify-between gap-3 border-b border-ink-200 px-5 py-3.5">
            <div className="min-w-0">
              <h2 className="font-semibold text-ink-950">{judul}</h2>
              {/* Angkanya ada karena daftar panjang itu yang benar dan orang
                  perlu bukti bahwa tempelannya masuk semua. Yang menempel 842
                  baris dari Excel tidak punya cara lain memastikannya. */}
              <p className="mt-0.5 text-xs text-ink-500">
                {baris.toLocaleString("id-ID")} baris,{" "}
                {huruf.toLocaleString("id-ID")} huruf
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

          {/* Hurufnya sedikit lebih besar daripada di kotak kecilnya. Di sana
              kecil supaya muat, di sini ruangnya ada, jadi tidak ada alasan
              menyuruh orang menyipitkan mata. */}
          <div className="min-h-0 flex-1 p-3 sm:p-4">
            <textarea
              ref={kotak}
              value={nilai}
              onChange={(e) => onUbah(e.target.value)}
              className={`${prosa ? "textarea-prosa" : "textarea"} h-full w-full resize-none text-[13.5px]`}
              placeholder={placeholder}
            />
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-ink-200 px-5 py-3">
            <p className="hidden text-xs text-ink-500 sm:block">
              Yang kamu ketik di sini langsung masuk ke formnya. Tutup lalu tekan
              Simpan.
            </p>
            <button type="button" onClick={onTutup} className="btn-ink ml-auto">
              Selesai
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}

/**
 * Tombol pemicu kotak besar.
 *
 * Diekspor supaya empat layar yang memakainya tidak menyalin markup yang sama
 * empat kali. Yang disalin selalu berakhir berbeda: satu dapat aria-label,
 * yang lain tidak, dan yang tidak itu jadi tombol tanpa nama buat pembaca
 * layar.
 */
export function TombolBesar({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Besarkan kotak isian"
      title="Besarkan"
      className="tap-aman grid h-8 w-8 place-items-center rounded-lg text-ink-500 hover:bg-ink-100 hover:text-ink-900"
    >
      <Ikon nama="perbesar" size={16} />
    </button>
  );
}

/**
 * Varian untuk kotak yang TIDAK dikendalikan React.
 *
 * Kotak "Cara kerja dan gaya bicara" di layar Asisten sengaja tak-terkendali:
 * tingginya menyesuaikan isi lewat ref, dan "Mulai dari contoh" menulis ke
 * dalamnya langsung lewat DOM. Menjadikannya terkendali berarti membongkar
 * dua hal yang sudah jalan, jadi jembatannya dibuat di sini saja.
 *
 * Nilainya dibaca dari kotak aslinya waktu dibuka, dan tiap ketikan ditulis
 * balik lewat penyetel yang sama dengan yang dipakai "Mulai dari contoh".
 * Dengan begitu tinggi kotak aslinya ikut menyesuaikan, dan form mengirimkan
 * nilai yang benar walaupun kotak besarnya sudah ditutup.
 */
export function IsiBesarKotak({
  buka,
  targetId,
  onTutup,
  judul,
  prosa = false,
}: {
  buka: boolean;
  /** id kotak aslinya di halaman. */
  targetId: string;
  onTutup: () => void;
  judul?: string;
  prosa?: boolean;
}) {
  const [nilai, setNilai] = useState("");

  useEffect(() => {
    if (!buka) return;
    const el = document.getElementById(targetId) as HTMLTextAreaElement | null;
    setNilai(el?.value ?? "");
  }, [buka, targetId]);

  return (
    <IsiBesar
      buka={buka}
      nilai={nilai}
      onUbah={(v) => {
        setNilai(v);
        const el = document.getElementById(targetId) as
          | HTMLTextAreaElement
          | null;
        if (el) setNilaiKotak(el, v);
      }}
      onTutup={onTutup}
      judul={judul}
      prosa={prosa}
    />
  );
}
