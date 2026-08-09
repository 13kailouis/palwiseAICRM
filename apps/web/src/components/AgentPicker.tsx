"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { createAgentAction, type FormState } from "@/app/actions/agent";
import { KOLOM_SEMPIT } from "@/components/ui";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      {pending ? "Sebentar" : "Buat"}
    </button>
  );
}

export function AgentPicker({
  agents,
  activeId,
  used,
  max,
  planName,
}: {
  agents: { id: string; name: string; isActive: boolean }[];
  activeId: string;
  used: number;
  max: number;
  planName: string;
}) {
  const [adding, setAdding] = useState(false);
  const [state, formAction] = useActionState(createAgentAction, {} as FormState);
  const full = used >= max;

  return (
    /* pt-4 wajib ada. Tanpa itu tombolnya menempel persis di garis bawah
       kepala halaman, dan matanya membaca itu sebagai "terpotong", bukan
       sebagai "rapat". Jarak atas dan bawah dibikin sama supaya barisnya
       terlihat berdiri sendiri, bukan menggantung di bawah sesuatu.
       Pinggirannya juga ikut lebar layar, seperti halaman lain. */
    <div className="border-b border-ink-200 bg-white pb-4 pt-4">
      <div className={`flex flex-wrap items-center gap-2 ${KOLOM_SEMPIT}`}>
        {agents.map((a) => (
          <Link
            key={a.id}
            href={`/app/agent?a=${a.id}`}
            className={`tap-aman rounded-lg border px-3 py-1.5 text-sm transition ${
              a.id === activeId
                ? "border-brand-500 bg-brand-50 font-medium text-brand-800"
                : "border-ink-200 text-ink-600 hover:bg-ink-50"
            }`}
          >
            {a.name}
            {!a.isActive && (
              <span className="ml-1.5 text-xs text-ink-400">(mati)</span>
            )}
          </Link>
        ))}

        {!adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            disabled={full}
            className="tap-aman rounded-lg border border-dashed border-ink-300 px-3 py-1.5 text-sm text-ink-500 transition hover:border-brand-400 hover:text-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
            title={
              full
                ? `Paket ${planName} muat ${max} asisten`
                : "Tambah asisten baru"
            }
          >
            + Tambah asisten
          </button>
        )}

        {adding && (
          <form action={formAction} className="flex items-center gap-2">
            <input
              name="name"
              autoFocus
              className="input max-w-[220px] py-1.5"
              placeholder="Nama, misal: Bagian keluhan"
            />
            <Submit />
            <button
              type="button"
              onClick={() => setAdding(false)}
              className="btn-ghost py-1.5"
            >
              Batal
            </button>
          </form>
        )}

        <span className="ml-auto text-xs text-ink-400">
          {used} dari {max} asisten di paket {planName}
        </span>
      </div>

      {state?.error && <p className="mt-2 text-sm text-red-600">{state.error}</p>}

      {agents.length > 1 && (
        <p className="mt-3 text-xs leading-relaxed text-ink-500">
          Tiap nomor WhatsApp bisa dijaga asisten yang beda. Aturannya ada di
          halaman Nomor WhatsApp.
        </p>
      )}
    </div>
  );
}
