"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Ikon } from "@/components/Ikon";
import { Logo } from "@/components/Logo";
import { KELOMPOK, sedangDibuka } from "@/lib/navigasi";

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
 * Urutannya juga bukan kebetulan. Yang paling atas dan paling bawah paling
 * diperhatikan, yang di tengah paling terabaikan. Asisten dan Info bisnis
 * dulu duduk persis di tengah, padahal berdua itu yang menentukan pengguna
 * baru berhasil atau menyerah. Sekarang keduanya jadi kepala kelompok sendiri.
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

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-ink-800 bg-ink-950 text-ink-300 lg:flex">
      <div className="flex h-16 items-center gap-2 border-b border-ink-800 px-5">
        {/* Latar sidebar gelap, jadi logonya harus yang tembus pandang.
            Logo JPEG akan tampil sebagai kotak putih menyolok di sini. */}
        <Logo ukuran={28} />
        <span className="font-semibold tracking-tight text-white">Palwise</span>
      </div>

      <div className="border-b border-ink-800 px-5 py-4">
        <p className="truncate text-sm font-medium text-white">{workspaceName}</p>
        <p className="truncate text-xs text-ink-500">{userName}</p>
      </div>

      <nav className="thin-scroll flex-1 space-y-5 overflow-y-auto p-3">
        {KELOMPOK.map((kelompok) => (
          <div key={kelompok.judul}>
            {/* Huruf kecil biasa, bukan HURUF BESAR SEMUA. Label bertumpuk
                huruf besar bikin tampilan terasa seperti templat. */}
            <p className="mb-1.5 px-3 text-xs font-medium text-ink-600">
              {kelompok.judul}
            </p>
            <div className="space-y-0.5">
              {kelompok.menu.map((item) => {
                const aktif = sedangDibuka(item.href, pathname);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={aktif ? "page" : undefined}
                    className={`group relative flex items-center gap-3 rounded-lg py-2 pl-3 pr-3 text-sm transition ${
                      aktif
                        ? "bg-ink-800 font-medium text-white"
                        : "text-ink-400 hover:bg-ink-900 hover:text-ink-100"
                    }`}
                    style={{ transitionDuration: "var(--gerak-cepat)" }}
                  >
                    {/* Garis penanda di tepi kiri. Disediakan tempatnya sejak
                        awal (scale-y-0), jadi waktu menyala tidak ada yang
                        bergeser satu piksel pun. Menu yang bergerak sedikit
                        waktu dipilih terasa seperti salah tekan. */}
                    <span
                      className={`absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r bg-brand-500 transition-transform ${
                        aktif ? "scale-y-100" : "scale-y-0"
                      }`}
                      style={{ transitionDuration: "var(--gerak-cepat)" }}
                    />
                    <Ikon nama={item.ikon} size={18} className="shrink-0" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}

        {/* Menu founder, terpisah di bawah dan tidak masuk KELOMPOK.
            Sengaja bukan bagian dari daftar menu bersama, karena daftar itu
            dipakai juga oleh bar bawah HP dan laci menu, dan menu ini tidak
            boleh ikut ke sana. */}
        {founder && (
          <div>
            <p className="mb-1.5 px-3 text-xs font-medium text-ink-600">Internal</p>
            <Link
              href="/app/founder"
              aria-current={
                sedangDibuka("/app/founder", pathname) ? "page" : undefined
              }
              className={`group relative flex items-center gap-3 rounded-lg py-2 pl-3 pr-3 text-sm transition ${
                sedangDibuka("/app/founder", pathname)
                  ? "bg-ink-800 font-medium text-white"
                  : "text-ink-400 hover:bg-ink-900 hover:text-ink-100"
              }`}
              style={{ transitionDuration: "var(--gerak-cepat)" }}
            >
              <span
                className={`absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r bg-brand-500 transition-transform ${
                  sedangDibuka("/app/founder", pathname) ? "scale-y-100" : "scale-y-0"
                }`}
                style={{ transitionDuration: "var(--gerak-cepat)" }}
              />
              <Ikon nama="ringkasan" size={18} className="shrink-0" />
              <span className="flex-1">Founder</span>
              {/* Angkanya, bukan cuma titik.
                  Titik cuma bilang "ada sesuatu", dan itu tidak cukup untuk
                  memutuskan mau dibuka sekarang atau nanti. Tiga masukan baru
                  dan tiga puluh masukan baru itu dua keputusan yang berbeda. */}
              {masukanBelumDibaca > 0 && (
                <span className="grid h-5 min-w-5 place-items-center rounded-full bg-brand-600 px-1.5 text-[11px] font-semibold text-white">
                  {masukanBelumDibaca > 99 ? "99+" : masukanBelumDibaca}
                </span>
              )}
            </Link>
          </div>
        )}
      </nav>

      <form action={logout} className="border-t border-ink-800 p-3">
        <button
          type="submit"
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-ink-400 transition hover:bg-ink-900 hover:text-ink-100"
          style={{ transitionDuration: "var(--gerak-cepat)" }}
        >
          <Ikon nama="keluar" size={18} className="shrink-0" />
          Keluar
        </button>
      </form>
    </aside>
  );
}
