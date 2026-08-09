"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { addChannelAction, type ChannelState } from "@/app/actions/channel";

function Submit() {
  const { pending } = useFormStatus();
  return (
    // Hitam, bukan biru. Yang biru di halaman ini cuma "Sambungkan", karena
    // itu yang menyelesaikan tujuan halamannya. Menambah slot nomor cuma
    // menyiapkan tempat kosong, dan kalau dua-duanya biru mata bingung mana
    // yang sebenarnya harus ditekan dulu.
    <button type="submit" className="btn-ink" disabled={pending}>
      {pending ? "Sebentar" : "Tambah nomor"}
    </button>
  );
}

export function AddChannel({
  used,
  max,
  planName,
}: {
  used: number;
  max: number;
  planName: string;
}) {
  const [state, formAction] = useActionState(addChannelAction, {} as ChannelState);
  const full = used >= max;

  return (
    <div className="card-pad">
      <h2 className="font-semibold text-ink-900">Tambah nomor WhatsApp</h2>
      <p className="mt-1 text-sm text-ink-500">
        Kamu pakai {used} dari {max} nomor di paket {planName}. Tiap nomor bisa
        dikasih asisten yang beda, misal satu buat jualan dan satu buat keluhan.
      </p>

      {full ? (
        <p className="mt-4 rounded-lg bg-ink-100 px-3 py-2 text-sm text-ink-600">
          Jatah nomor di paket {planName} sudah penuh. Naikkan paket kalau mau
          nambah.
        </p>
      ) : (
        <form action={formAction} className="mt-4 flex flex-wrap items-start gap-2">
          <input
            name="name"
            className="input max-w-xs"
            placeholder="Nama nomor, misal: CS Toko"
          />
          <Submit />
        </form>
      )}

      {state?.error && <p className="mt-3 text-sm text-red-600">{state.error}</p>}
      {state?.message && !state.error && (
        <p className="mt-3 text-sm text-brand-700">{state.message}</p>
      )}
    </div>
  );
}
