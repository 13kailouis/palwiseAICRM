"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { keApp } from "@/lib/situs";

/**
 * Tombol daftar yang nempel di dasar layar HP.
 *
 * Kenapa cuma di HP: halaman jualan ini panjang, dan di layar 375px satu
 * bagian saja sudah memenuhi seluruh layar. Orang yang yakin di tengah halaman
 * harus menggulir jauh ke atas atau ke bawah cuma untuk menemukan tombolnya
 * lagi, dan sebagian besar tidak melakukannya. Di layar lebar masalahnya tidak
 * ada: tombol di kepala halaman selalu kelihatan karena kepalanya menempel.
 *
 * Tiga aturan yang bikin dia tidak mengganggu:
 *
 * 1. Baru muncul setelah layar pertama lewat. Kalau muncul dari awal, dia
 *    bersaing dengan tombol di hero yang sedang dibaca orangnya, dan dua
 *    ajakan sekaligus membuat tidak ada yang jadi utama.
 * 2. Hilang lagi menjelang dasar halaman, supaya tidak menutupi tombol
 *    terakhir dan tautan di kaki halaman. Bar yang menutupi tautan ketentuan
 *    itu bukan cuma jelek, itu menghalangi orang membaca yang wajib dibaca.
 * 3. Tingginya diberi jarak aman iPhone (env safe-area), karena garis home
 *    indicator memakan bagian paling bawah layar dan tombol di bawahnya jadi
 *    susah ditekan.
 *
 * Jatah balasan gratisnya DITERIMA sebagai prop, bukan dibaca dari daftar
 * paket di sini. Berkas ini jalan di browser, dan menarik @palwise/db ke
 * browser berarti menarik seluruh database ikut terbawa.
 */
export function AjakanBawah({ gratis }: { gratis: number }) {
  const [tampil, setTampil] = useState(false);

  useEffect(() => {
    let jeda: ReturnType<typeof setTimeout> | null = null;
    let terakhir = 0;

    const hitung = () => {
      terakhir = Date.now();
      const y = window.scrollY;
      const tinggiHalaman = document.documentElement.scrollHeight;
      const sudahLewatHero = y > 520;
      // 360px terakhir dianggap "hampir dasar": di situ ajakan terakhir dan
      // kaki halaman sudah kelihatan sendiri.
      const hampirDasar = y + window.innerHeight > tinggiHalaman - 360;
      // Bagian harga punya tombolnya sendiri, dan tombol birunya menyala di
      // kartu paket yang ditandai. Dua bidang biru sekaligus di satu layar
      // membuat tidak ada yang jadi utama, dan yang di bawah justru menutupi
      // yang sedang dibaca. Jadi bar ini yang mengalah selama harga kelihatan.
      const harga = document.getElementById("harga");
      let hargaTerlihat = false;
      if (harga) {
        const k = harga.getBoundingClientRect();
        hargaTerlihat = k.top < window.innerHeight && k.bottom > 0;
      }
      setTampil(sudahLewatHero && !hampirDasar && !hargaTerlihat);
    };

    /**
     * Direm 100 ms, pakai jam, BUKAN requestAnimationFrame.
     *
     * rAF terlihat lebih rapi dan memang cuma jalan sekali per gambar, tapi
     * dia berhenti total waktu tabnya tidak digambar (tab latar, jendela
     * tertutup, atau peramban uji yang tidak menampilkan halaman). Waktu itu
     * terjadi, hitungannya membeku di posisi terakhir dan barnya bisa
     * tertinggal tampil di tempat yang salah begitu orangnya kembali.
     *
     * Jam tidak peduli halamannya sedang digambar atau tidak, dan 100 ms itu
     * jauh lebih murah daripada satu gambar penuh.
     */
    const saatGulir = () => {
      const kini = Date.now();
      if (kini - terakhir >= 100) {
        if (jeda) clearTimeout(jeda);
        jeda = null;
        hitung();
        return;
      }
      // Yang terakhir tetap dihitung, jadi posisi berhenti tidak terlewat.
      if (jeda) return;
      jeda = setTimeout(() => {
        jeda = null;
        hitung();
      }, 100);
    };

    hitung();
    window.addEventListener("scroll", saatGulir, { passive: true });
    window.addEventListener("resize", saatGulir);
    return () => {
      if (jeda) clearTimeout(jeda);
      window.removeEventListener("scroll", saatGulir);
      window.removeEventListener("resize", saatGulir);
    };
  }, []);

  return (
    <div
      // aria-hidden waktu tersembunyi, supaya pembaca layar tidak menemukan
      // tombol yang tidak kelihatan dan tidak bisa ditekan.
      aria-hidden={!tampil}
      className={`fixed inset-x-0 bottom-0 z-30 border-t border-ink-200 bg-white/95 px-4 pt-3 backdrop-blur transition-transform duration-200 sm:hidden ${
        tampil ? "translate-y-0" : "translate-y-full"
      } pb-[max(0.75rem,env(safe-area-inset-bottom))]`}
    >
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-medium leading-tight text-ink-900">
            {gratis} balasan gratis tiap bulan
          </p>
          <p className="text-[11.5px] leading-tight text-ink-500">
            Tanpa kartu kredit, berhenti kapan aja
          </p>
        </div>
        <Link
          href={keApp("/daftar")}
          tabIndex={tampil ? undefined : -1}
          className="btn-primary shrink-0 px-5"
        >
          Mulai gratis
        </Link>
      </div>
    </div>
  );
}
