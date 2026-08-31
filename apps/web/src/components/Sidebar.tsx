"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Ikon } from "@/components/Ikon";
import { Logo } from "@/components/Logo";
import { KELOMPOK, sedangDibuka } from "@/lib/navigasi";

const KUNCI_CIUT = "palwise-sidebar-ciut";

/**
 * Menu samping, khusus desktop.
 *
 * Di bawah 1024px dia disembunyikan dan digantikan bar bawah plus laci menu.
 * Alasannya diukur, bukan selera: dengan lebar tetap 240px, di layar HP 375px
 * isi halamannya cuma kebagian 135px. Dashboardnya praktis tidak bisa dipakai.
 *
 * Dikelompokkan jadi tiga, bukan dipangkas. Yang bikin daftar sepuluh terasa
 * lambat bukan jumlahnya, tapi ratanya: mata harus menyapu sepuluh-duanya tiap
 * kali. Dengan tiga kelompok, orang memilih kelompok dulu baru isinya, dan dua
 * langkah pendek selalu lebih cepat dari satu langkah panjang.
 *
 * Bisa DICIUTKAN jadi rel ikon (64px), seperti app kerja pada umumnya, supaya
 * layar kerja yang butuh lebar (terutama kotak masuk) dapat ruang lebih. Waktu
 * ciut, labelnya jadi tooltip lewat `title`, dan pilihannya diingat di
 * localStorage supaya bertahan lewat muat ulang. Rel-nya cuma soal desktop;
 * di HP menu ini memang sudah tidak ada.
 */
export function Sidebar({
  workspaceName,
  userName,
  logout,
  founder = false,
  masukanBelumDibaca = 0,
}: {
  workspaceName: string;
  userName: string;
  logout: () => Promise<void>;
  /**
   * Menu founder cuma digambar untuk yang emailnya terdaftar di FOUNDER_EMAILS.
   *
   * Menyembunyikan menu BUKAN pengamannya. Yang menjaga halamannya pemeriksaan
   * di sisi server di dalam halaman itu sendiri; ini cuma supaya menu yang tidak
   * bisa dibuka tidak muncul di layar pelanggan. Jangan pernah memindahkan
   * pengamanan ke sini.
   */
  founder?: boolean;
  masukanBelumDibaca?: number;
}) {
  const pathname = usePathname();
  const [ciut, setCiut] = useState(false);

  // Dibaca sesudah render pertama, bukan saat render, supaya HTML server dan
  // klien sama (default lebar) dan tidak ada peringatan hydration. Kedipan satu
  // frame kalau ternyata pilihannya ciut itu harga yang murah.
  useEffect(() => {
    try {
      if (localStorage.getItem(KUNCI_CIUT) === "1") setCiut(true);
    } catch {
      // localStorage bisa diblokir; biarkan lebar.
    }
  }, []);

  function togel() {
    setCiut((v) => {
      const baru = !v;
      try {
        localStorage.setItem(KUNCI_CIUT, baru ? "1" : "0");
      } catch {
        // diblokir, tidak apa-apa
      }
      return baru;
    });
  }

  const barisMenu = (
    href: string,
    ikon: React.ComponentProps<typeof Ikon>["nama"],
    label: string,
    lencana?: number,
  ) => {
    const aktif = sedangDibuka(href, pathname);
    return (
      <Link
        key={href}
        href={href}
        aria-current={aktif ? "page" : undefined}
        title={ciut ? label : undefined}
        className={`group relative flex items-center rounded-lg py-2 text-sm transition ${
          ciut ? "justify-center px-0" : "gap-3 px-3"
        } ${
          aktif
            ? "bg-ink-800 font-medium text-white"
            : "text-ink-400 hover:bg-ink-900 hover:text-ink-100"
        }`}
        style={{ transitionDuration: "var(--gerak-cepat)" }}
      >
        {/* Garis penanda di tepi kiri. Tempatnya disediakan sejak awal
            (scale-y-0), jadi waktu menyala tidak ada yang bergeser. */}
        <span
          className={`absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r bg-brand-500 transition-transform ${
            aktif ? "scale-y-100" : "scale-y-0"
          }`}
          style={{ transitionDuration: "var(--gerak-cepat)" }}
        />
        <span className="relative shrink-0">
          <Ikon nama={ikon} size={18} />
          {/* Waktu ciut, labelnya hilang, jadi lencana angka tidak muat. Diganti
              titik kecil supaya "ada yang baru" tetap kelihatan. */}
          {ciut && lencana !== undefined && lencana > 0 && (
            <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-brand-500 ring-2 ring-ink-950" />
          )}
        </span>
        {!ciut && <span className="flex-1 truncate">{label}</span>}
        {!ciut && lencana !== undefined && lencana > 0 && (
          <span className="grid h-5 min-w-5 place-items-center rounded-full bg-brand-600 px-1.5 text-[11px] font-semibold text-white">
            {lencana > 99 ? "99+" : lencana}
          </span>
        )}
      </Link>
    );
  };

  return (
    <aside
      className={`hidden shrink-0 flex-col border-r border-ink-800 bg-ink-950 text-ink-300 lg:flex ${
        ciut ? "lg:w-16" : "lg:w-60"
      }`}
      style={{ transition: "width var(--gerak) var(--lengkung-masuk)" }}
    >
      {/* Kepala: waktu lebar, logo + nama + tombol ciutkan; waktu ciut, logonya
          sendiri jadi tombol lebarkan. */}
      {ciut ? (
        <button
          type="button"
          onClick={togel}
          title="Lebarkan menu"
          aria-label="Lebarkan menu"
          className="group grid h-16 w-full shrink-0 place-items-center border-b border-ink-800 transition hover:bg-ink-900"
          style={{ transitionDuration: "var(--gerak-cepat)" }}
        >
          {/* Diam: logo (merek tetap kelihatan). Diarahkan kursor: berubah jadi
              panah lebarkan, jadi jelas logonya bisa diklik untuk membuka menu,
              bukan cuma hiasan. Dua-duanya di sel grid yang sama, gantian. */}
          <Logo ukuran={28} className="group-hover:hidden" />
          <svg
            viewBox="0 0 24 24"
            width="22"
            height="22"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="hidden text-white group-hover:block"
            aria-hidden="true"
          >
            <path d="M9 6l6 6-6 6" />
          </svg>
        </button>
      ) : (
        <div className="flex h-16 shrink-0 items-center gap-2 border-b border-ink-800 px-4">
          {/* Latar sidebar gelap, jadi logonya harus yang tembus pandang. */}
          <Logo ukuran={28} />
          <span className="font-semibold tracking-tight text-white">Palwise</span>
          <button
            type="button"
            onClick={togel}
            title="Ciutkan menu"
            aria-label="Ciutkan menu"
            className="ml-auto grid h-8 w-8 shrink-0 place-items-center rounded-lg text-ink-400 transition hover:bg-ink-900 hover:text-white"
            style={{ transitionDuration: "var(--gerak-cepat)" }}
          >
            <svg
              viewBox="0 0 24 24"
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M15 6l-6 6 6 6" />
            </svg>
          </button>
        </div>
      )}

      {!ciut && (
        <div className="border-b border-ink-800 px-5 py-4">
          <p className="truncate text-sm font-medium text-white">{workspaceName}</p>
          <p className="truncate text-xs text-ink-500">{userName}</p>
        </div>
      )}

      <nav className="thin-scroll flex-1 space-y-5 overflow-y-auto p-3">
        {KELOMPOK.map((kelompok) => (
          <div key={kelompok.judul}>
            {/* Judul kelompok hilang waktu ciut (tidak muat), tapi jaraknya tetap
                jadi kelompoknya masih terbaca sebagai kelompok. */}
            {!ciut && (
              <p className="mb-1.5 px-3 text-xs font-medium text-ink-600">
                {kelompok.judul}
              </p>
            )}
            <div className="space-y-0.5">
              {kelompok.menu.map((item) =>
                barisMenu(item.href, item.ikon, item.label),
              )}
            </div>
          </div>
        ))}

        {/* Menu founder, terpisah di bawah dan tidak masuk KELOMPOK. Sengaja
            bukan bagian dari daftar menu bersama, karena daftar itu dipakai juga
            oleh bar bawah HP dan laci menu, dan menu ini tidak boleh ke sana. */}
        {founder && (
          <div>
            {!ciut && (
              <p className="mb-1.5 px-3 text-xs font-medium text-ink-600">
                Internal
              </p>
            )}
            <div className="space-y-0.5">
              {barisMenu(
                "/app/founder",
                "ringkasan",
                "Founder",
                masukanBelumDibaca,
              )}
            </div>
          </div>
        )}
      </nav>

      <form action={logout} className="border-t border-ink-800 p-3">
        <button
          type="submit"
          title={ciut ? "Keluar" : undefined}
          className={`flex w-full items-center rounded-lg py-2 text-sm text-ink-400 transition hover:bg-ink-900 hover:text-ink-100 ${
            ciut ? "justify-center px-0" : "gap-3 px-3 text-left"
          }`}
          style={{ transitionDuration: "var(--gerak-cepat)" }}
        >
          <Ikon nama="keluar" size={18} className="shrink-0" />
          {!ciut && "Keluar"}
        </button>
      </form>
    </aside>
  );
}
