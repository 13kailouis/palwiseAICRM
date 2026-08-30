"use client";

import { useFormStatus } from "react-dom";
import type { FormState } from "@/app/actions/agent";

export function SaveBar({ state, label = "Simpan" }: { state: FormState; label?: string }) {
  const { pending } = useFormStatus();

  return (
    // Di HP bilah ini nempel DI ATAS bar menu bawah, bukan di dasar layar.
    //
    // Bar menu bawah (NavBawah) melayang tetap di dasar layar setinggi
    // --bar-bawah plus jarak aman iPhone. Kalau bilah Simpan nempel di
    // bottom-0, dia mendarat persis di belakang bar menu itu dan tombol
    // Simpan-nya kepotong separuh. Terukur di iPhone. Jadi di HP dia diangkat
    // setinggi bar menu; di laptop bar menunya tidak ada, jadi bottom-0 lagi.
    //
    // Di HP bilahnya SOLID dan tombolnya SELEBAR bilah, bukan tombol biru
    // mengambang di kanan. Dulu latarnya tembus pandang dan tombolnya rata
    // kanan, jadi yang kelihatan cuma satu tombol biru melayang, bukan bilah
    // simpan. Tombol selebar bilah langsung terbaca sebagai "ini tombol
    // simpannya". Di laptop tetap rata kanan dengan latar tembus pandang.
    <div className="sticky bottom-[calc(var(--bar-bawah)+env(safe-area-inset-bottom))] z-20 -mx-5 mt-2 border-t border-ink-200 bg-white px-5 py-3 sm:-mx-6 sm:px-6 lg:bottom-0 lg:bg-white/90 lg:backdrop-blur">
      {/* pr-16 di HP menyisakan tempat buat tombol "Kirim masukan" yang
          melayang di pojok kanan bawah, supaya tidak saling menimpa dengan
          tombol Simpan. Di laptop tombol itu ada di bawah sekali, jadi tidak
          perlu disisakan. */}
      <div className="flex flex-col gap-2 pr-16 sm:flex-row sm:items-center sm:justify-end sm:gap-3 sm:pr-0">
        {state?.error && (
          <p className="text-sm text-red-600 sm:mr-auto">{state.error}</p>
        )}
        {state?.message && !state.error && (
          <p className="text-sm text-brand-700 sm:mr-auto">{state.message}</p>
        )}
        <button
          type="submit"
          className="btn-primary w-full sm:w-auto"
          disabled={pending}
        >
          {pending ? "Menyimpan" : label}
        </button>
      </div>
    </div>
  );
}
