"use client";

import { useFormStatus } from "react-dom";
import type { FormState } from "@/app/actions/agent";

export function SaveBar({ state, label = "Simpan" }: { state: FormState; label?: string }) {
  const { pending } = useFormStatus();

  return (
    <div className="sticky bottom-0 -mx-5 mt-2 flex items-center justify-end gap-3 border-t border-ink-200 bg-white/90 px-5 py-3 backdrop-blur sm:-mx-6 sm:px-6">
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
