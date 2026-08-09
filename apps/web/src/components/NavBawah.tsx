"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Ikon } from "@/components/Ikon";
import { KELOMPOK, MENU_BAWAH, sedangDibuka } from "@/lib/navigasi";

/**
 * Menu bawah untuk HP.
 *
 * Ditaruh di dasar layar, bukan di atas, karena di situ jempol sampai tanpa
 * memindahkan pegangan tangan. Bagian atas layar HP besar itu daerah yang
 * paling susah dijangkau, dan menaruh menu utama di sana memaksa orang
 * menggeser genggamannya belasan kali sehari.
 *
 * Tiap petak minimal 44px tinggi dan sekitar 70px lebar. Angka itu bukan
 * selera: makin kecil sasarannya dan makin jauh dari posisi jempol, makin lama
 * dan makin sering meleset. Empat menu plus satu tombol Menu pas di layar
 * 360px tanpa berdesakan.
 */
export function NavBawah({ logout }: { logout: () => Promise<void> }) {
  const pathname = usePathname();
  const [laciTerbuka, setLaciTerbuka] = useState(false);

  const adaDiBawah = MENU_BAWAH.some((m) => sedangDibuka(m.href, pathname));

  return (
    <>
      <nav
        className="fixed inset-x-0 bottom-0 z-30 border-t border-ink-200 bg-white/95 backdrop-blur lg:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="grid grid-cols-5">
          {MENU_BAWAH.map((m) => {
            const aktif = sedangDibuka(m.href, pathname);
            return (
              <Link
                key={m.href}
                href={m.href}
                aria-current={aktif ? "page" : undefined}
                className="relative flex h-[60px] flex-col items-center justify-center gap-1"
              >
                {/* Penanda yang sedang dibuka: garis pendek di atas petaknya.
                    Sengaja garis, bukan seluruh petak diwarnai. Bidang warna
                    sebesar petak menarik mata lebih kuat daripada bobot
                    informasinya, dan lima petak jadi saling berebut. */}
                <span
                  className={`absolute inset-x-4 top-0 h-0.5 rounded-full bg-brand-600 transition-opacity ${
                    aktif ? "opacity-100" : "opacity-0"
                  }`}
                  style={{ transitionDuration: "var(--gerak-cepat)" }}
                />
                <Ikon
                  nama={m.ikon}
                  size={21}
                  className={aktif ? "text-brand-700" : "text-ink-500"}
                />
                <span
                  className={`text-[10.5px] leading-none ${
                    aktif ? "font-medium text-brand-700" : "text-ink-500"
                  }`}
                >
                  {m.pendek ?? m.label}
                </span>
              </Link>
            );
          })}

          <button
            type="button"
            onClick={() => setLaciTerbuka(true)}
            aria-label="Buka menu lainnya"
            className="relative flex h-[60px] flex-col items-center justify-center gap-1"
          >
            <span
              className={`absolute inset-x-4 top-0 h-0.5 rounded-full bg-brand-600 transition-opacity ${
                adaDiBawah ? "opacity-0" : "opacity-100"
              }`}
              style={{ transitionDuration: "var(--gerak-cepat)" }}
            />
            <span
              className={`flex h-[21px] w-[21px] flex-col items-center justify-center gap-[3px] ${
                adaDiBawah ? "text-ink-500" : "text-brand-700"
              }`}
            >
              <span className="h-[2px] w-[17px] rounded-full bg-current" />
              <span className="h-[2px] w-[17px] rounded-full bg-current" />
              <span className="h-[2px] w-[17px] rounded-full bg-current" />
            </span>
            <span
              className={`text-[10.5px] leading-none ${
                adaDiBawah ? "text-ink-500" : "font-medium text-brand-700"
              }`}
            >
              Menu
            </span>
          </button>
        </div>
      </nav>

      {laciTerbuka && (
        <Laci
          pathname={pathname}
          tutup={() => setLaciTerbuka(false)}
          logout={logout}
        />
      )}
    </>
  );
}

/** Laci menu lengkap, muncul dari bawah. */
function Laci({
  pathname,
  tutup,
  logout,
}: {
  pathname: string;
  tutup: () => void;
  logout: () => Promise<void>;
}) {
  return (
    <div className="fixed inset-0 z-40 lg:hidden">
      {/* Latar gelap. Diklik berarti tutup, dan itu perilaku yang orang coba
          duluan sebelum mencari tombol silang. */}
      <button
        type="button"
        aria-label="Tutup menu"
        onClick={tutup}
        className="anim-muncul absolute inset-0 bg-ink-950/40"
      />

      <div
        className="absolute inset-x-0 bottom-0 max-h-[82vh] overflow-y-auto rounded-t-2xl border-t border-ink-200 bg-white pb-[env(safe-area-inset-bottom)]"
        style={{
          animation: "naik-muncul var(--gerak-pelan) var(--lengkung-masuk) both",
        }}
      >
        {/* Pegangan. Bentuk ini sudah dipahami orang sebagai "bisa ditutup". */}
        <div className="flex justify-center py-3">
          <span className="h-1 w-10 rounded-full bg-ink-200" />
        </div>

        <div className="space-y-6 px-4 pb-4">
          {KELOMPOK.map((k) => (
            <div key={k.judul}>
              <p className="mb-1.5 px-2 text-xs font-medium text-ink-500">
                {k.judul}
              </p>
              <div className="space-y-0.5">
                {k.menu.map((m) => {
                  const aktif = sedangDibuka(m.href, pathname);
                  return (
                    <Link
                      key={m.href}
                      href={m.href}
                      onClick={tutup}
                      className={`flex min-h-[46px] items-center gap-3 rounded-xl px-3 text-[15px] ${
                        aktif
                          ? "bg-ink-100 font-medium text-ink-950"
                          : "text-ink-700 active:bg-ink-50"
                      }`}
                    >
                      <Ikon nama={m.ikon} size={20} className="shrink-0" />
                      {m.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}

          <form action={logout} className="border-t border-ink-200 pt-3">
            <button
              type="submit"
              className="flex min-h-[46px] w-full items-center gap-3 rounded-xl px-3 text-left text-[15px] text-ink-600 active:bg-ink-50"
            >
              <Ikon nama="keluar" size={20} className="shrink-0" />
              Keluar
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
