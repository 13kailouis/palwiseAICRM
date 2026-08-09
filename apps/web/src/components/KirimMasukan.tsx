"use client";

import { useActionState, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useFormStatus } from "react-dom";
import { Ikon } from "@/components/Ikon";
import type { MasukanState } from "@/app/actions/masukan";

/**
 * Tombol kirim masukan yang ikut di semua halaman dashboard.
 *
 * Kenapa melayang di sudut, bukan satu menu sendiri di sidebar: laporan bug
 * ditulis orang PADA SAAT dia menemukan bugnya, dan menu yang harus dibuka
 * berarti dia keluar dulu dari halaman tempat masalahnya terjadi. Sebagian besar
 * tidak akan kembali, dan yang hilang justru laporan yang paling berguna.
 *
 * Halaman yang sedang dibuka ikut terkirim otomatis. Tanpa itu, hampir semua
 * laporan berbunyi "tombolnya nggak jalan" dan tidak ada yang tahu tombol yang
 * mana.
 */

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary w-full" disabled={pending}>
      {pending ? "Mengirim" : "Kirim"}
    </button>
  );
}

export function KirimMasukan({
  action,
}: {
  action: (state: MasukanState, formData: FormData) => Promise<MasukanState>;
}) {
  const [buka, setBuka] = useState(false);
  const [state, formAction] = useActionState(action, {} as MasukanState);
  const pathname = usePathname();

  // Tutup sendiri sesudah terkirim, tapi beri jeda supaya kalimat "makasih"-nya
  // sempat terbaca. Tanpa jeda, panelnya hilang seketika dan orangnya tidak yakin
  // masukannya benar-benar masuk, lalu mengirim lagi.
  useEffect(() => {
    if (!state?.ok) return;
    const t = setTimeout(() => setBuka(false), 2200);
    return () => clearTimeout(t);
  }, [state?.ok]);

  if (!buka) {
    return (
      <button
        type="button"
        onClick={() => setBuka(true)}
        // Di HP digeser ke atas supaya tidak menabrak bar bawah.
        className="fixed bottom-[calc(var(--bar-bawah)+12px)] right-4 z-30 grid h-11 w-11 place-items-center rounded-full border border-ink-200 bg-white text-ink-700 shadow-lg transition hover:text-ink-950 lg:bottom-5 lg:right-5"
        aria-label="Kirim masukan"
        title="Kirim masukan"
      >
        <Ikon nama="chat" size={20} />
      </button>
    );
  }

  return (
    <div className="fixed bottom-[calc(var(--bar-bawah)+12px)] right-4 z-30 w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-ink-200 bg-white p-5 shadow-xl lg:bottom-5 lg:right-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold text-ink-900">Ada masukan?</p>
          <p className="mt-0.5 text-xs leading-relaxed text-ink-500">
            Bug, saran, atau apa pun yang bikin kamu kesel. Kami baca semuanya.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setBuka(false)}
          className="-mr-1 -mt-1 shrink-0 rounded-lg p-1.5 text-ink-400 hover:text-ink-700"
          aria-label="Tutup"
        >
          <Ikon nama="silang" size={16} />
        </button>
      </div>

      {state?.ok ? (
        <p className="mt-4 rounded-lg bg-ink-50 px-3 py-2.5 text-sm leading-relaxed text-ink-700">
          Makasih, sudah masuk. Kalau ini bug, biasanya yang paling menolong
          justru laporan sependek ini.
        </p>
      ) : (
        <form action={formAction} className="mt-4 space-y-3">
          <input type="hidden" name="halaman" value={pathname} />
          <div>
            <label htmlFor="jenis" className="label">
              Jenisnya
            </label>
            <select id="jenis" name="jenis" className="input" defaultValue="saran">
              <option value="bug">Ada yang error atau nggak jalan</option>
              <option value="saran">Saran atau permintaan fitur</option>
              <option value="lainnya">Lainnya</option>
            </select>
          </div>
          <div>
            <label htmlFor="isi" className="label">
              Ceritain
            </label>
            {/* maxLength dipasang di sini, bukan cuma dipotong di server.

                Server memotong di 2.000 huruf. Kalau batasnya cuma di sana,
                orang yang menulis 2.500 huruf menekan Kirim, dibalas "makasih,
                sudah masuk", dan lima ratus huruf terakhirnya hilang tanpa satu
                pun tanda. Yang hilang bukan fiturnya tapi pekerjaan yang sudah
                dia ketik, dan justru laporan bug yang panjang itu yang paling
                berguna. Batas harus diumumkan sebelum dipakai, bukan diberlakukan
                sesudah. */}
            <textarea
              id="isi"
              name="isi"
              rows={4}
              maxLength={2000}
              className="input"
              placeholder="Nggak usah panjang. Cukup apa yang kamu lakuin dan apa yang terjadi."
            />
          </div>
          {state?.error && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-900">
              {state.error}
            </p>
          )}
          <Submit />
          <p className="text-xs leading-relaxed text-ink-500">
            Yang terkirim cuma tulisanmu, halaman yang sedang kamu buka, dan email
            akunmu. Isi chat pelanggan kamu tidak ikut.
          </p>
        </form>
      )}
    </div>
  );
}
