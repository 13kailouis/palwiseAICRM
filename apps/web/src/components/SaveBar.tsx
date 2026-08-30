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
    <div className="sticky bottom-[calc(var(--bar-bawah)+env(safe-area-inset-bottom))] z-20 -mx-5 mt-2 flex items-center justify-end gap-3 border-t border-ink-200 bg-white/90 px-5 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:bottom-0">
      {state?.error && <p className="mr-auto text-sm text-red-600">{state.error}</p>}
      {state?.message && !state.error && (
        <p className="mr-auto text-sm text-brand-700">{state.message}</p>
      )}
      <button type="submit" className="btn-primary" disabled={pending}>
        {pending ? "Menyimpan" : label}
      </button>
    </div>
  );
}
