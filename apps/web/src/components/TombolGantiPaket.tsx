"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import type { PlanState } from "@/app/actions/plan";

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button className="btn-ghost w-full" type="submit" disabled={pending}>
      {pending ? "Sebentar" : label}
    </button>
  );
}

function Galat({ pesan }: { pesan: string }) {
  return (
    <p className="rounded-lg bg-amber-50 px-3 py-2 text-left text-xs leading-relaxed text-amber-900">
      {pesan}
    </p>
  );
}

/**
 * Kabar yang BUKAN kegagalan, misalnya "penurunan paket sudah dijadwalkan".
 *
 * Sengaja beda warna dari Galat. Dulu semua balasan aksi ini cuma punya satu
 * bentuk, kuning, dan kuning dibaca sebagai "ada yang salah". Memberi tahu
 * orang bahwa pilihannya berhasil dicatat dengan warna peringatan membuat dia
 * mengira justru gagal, lalu mengklik lagi.
 *
 * Abu, bukan biru. Biru cuma untuk yang bisa diklik, dan kotak ini cuma
 * memberi tahu.
 */
function Kabar({ pesan }: { pesan: string }) {
  return (
    <p className="rounded-lg bg-ink-50 px-3 py-2 text-left text-xs leading-relaxed text-ink-700">
      {pesan}
    </p>
  );
}

export function TombolGantiPaket({
  action,
  planId,
  label,
  akibat = [],
  turun = false,
}: {
  action: (state: PlanState, formData: FormData) => Promise<PlanState>;
  planId: string;
  label: string;
  /**
   * Apa yang hilang kalau pindah ke paket ini, dihitung di server dari
   * pemakaian yang sebenarnya. Isinya beda tiap akun, dan kosong kalau memang
   * tidak ada yang hilang.
   */
  akibat?: string[];
  /** Paket tujuannya lebih murah dari yang sekarang: ini turun, bukan beli.
   *  Cuma mengubah kata-kata konfirmasinya biar jelas dijadwalkan, tidak
   *  menagih sekarang. */
  turun?: boolean;
}) {
  const [state, formAction] = useActionState(action, {} as PlanState);
  const [tanya, setTanya] = useState(false);

  /* mt-auto, bukan mt-5. Kartu paketnya berisi daftar yang panjangnya
     berbeda-beda, dan tanpa ini tombolnya menempel tepat di bawah daftar
     masing-masing, jadi empat tombol berjajar di empat ketinggian yang
     berbeda dan matanya tidak menemukan barisnya. */
  const bungkus = "mt-auto space-y-3 pt-5";

  // Tidak ada yang hilang, jadi tidak perlu ditanya dulu.
  //
  // Menanyakan hal yang tidak berkonsekuensi cuma melatih orang menekan
  // "lanjut" tanpa membaca, dan itu justru melemahkan konfirmasi di kartu
  // sebelahnya yang memang penting. Naik paket tetap satu klik.
  if (akibat.length === 0) {
    return (
      <form action={formAction} className={bungkus}>
        <input type="hidden" name="plan" value={planId} />
        <Submit label={label} />
        {state?.error && <Galat pesan={state.error} />}
        {state?.info && <Kabar pesan={state.info} />}
      </form>
    );
  }

  if (!tanya) {
    return (
      <div className={bungkus}>
        <button
          type="button"
          onClick={() => setTanya(true)}
          className="btn-ghost w-full"
        >
          {label}
        </button>
        {state?.error && <Galat pesan={state.error} />}
        {state?.info && <Kabar pesan={state.info} />}
      </div>
    );
  }

  return (
    <form action={formAction} className={bungkus}>
      <input type="hidden" name="plan" value={planId} />
      <div className="rounded-lg bg-amber-50 px-3 py-2.5 text-left text-xs leading-relaxed text-amber-900">
        <p className="font-semibold">
          {turun ? "Kalau turun ke sini:" : "Yang berubah kalau pindah ke sini:"}
        </p>
        <ul className="mt-1.5 space-y-1">
          {akibat.map((a) => (
            <li key={a} className="flex gap-1.5">
              <span aria-hidden>·</span>
              <span>{a}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setTanya(false)}
          className="btn-ghost flex-1"
        >
          Batal
        </button>
        <div className="flex-1">
          <Submit label={turun ? "Ya, jadwalkan" : "Ya, pindah"} />
        </div>
      </div>
      {state?.error && <Galat pesan={state.error} />}
    </form>
  );
}
