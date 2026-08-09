"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { AkunState } from "@/app/actions/akun";

type Aksi = (state: AkunState, formData: FormData) => Promise<AkunState>;

/**
 * `nada` menentukan warnanya, dan itu keputusan yang disengaja.
 *
 * Halaman Akun ini tempat mengurus, bukan alur yang harus diselesaikan. Jadi
 * yang boleh biru cuma satu: konfirmasi email, karena itu yang sedang diminta
 * aplikasi lewat garis peringatan di atas. Ganti email dan ganti password
 * tetap hitam. Bukan karena kurang penting, tapi karena itu tindakan yang kamu
 * lakukan saat butuh, bukan yang sedang kami dorong kamu lakukan.
 */
function Submit({
  label,
  nada = "ink",
}: {
  label: string;
  nada?: "biru" | "ink";
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className={`${nada === "biru" ? "btn-primary" : "btn-ink"} px-5 py-2.5`}
      disabled={pending}
    >
      {pending ? "Sebentar" : label}
    </button>
  );
}

function Kabar({ state }: { state: AkunState }) {
  if (state?.error) {
    return (
      <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>
    );
  }
  if (state?.pesan) {
    return (
      <p className="rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-900">
        {state.pesan}
      </p>
    );
  }
  return null;
}

/** Tombol kirim ulang tautan konfirmasi. */
export function TombolVerifikasi({
  action,
  label = "Kirim tautan konfirmasi",
}: {
  action: Aksi;
  label?: string;
}) {
  const [state, formAction] = useActionState(action, {} as AkunState);

  return (
    <form action={formAction} className="space-y-3">
      <Kabar state={state} />
      <Submit label={label} nada="biru" />
    </form>
  );
}

export function GantiEmailForm({ action }: { action: Aksi }) {
  const [state, formAction] = useActionState(action, {} as AkunState);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label className="label" htmlFor="email-baru">
          Email baru
        </label>
        <input
          id="email-baru"
          name="email"
          type="email"
          autoComplete="email"
          className="input"
          placeholder="kamu@bisnis.com"
        />
      </div>

      <div>
        <label className="label" htmlFor="sandi-konfirmasi">
          Password sekarang
        </label>
        <input
          id="sandi-konfirmasi"
          name="password"
          type="password"
          autoComplete="current-password"
          className="input"
          placeholder="••••••••"
        />
        <p className="hint">
          Diminta supaya orang lain yang kebetulan memakai perangkatmu tidak bisa
          memindahkan akun ini ke alamatnya sendiri.
        </p>
      </div>

      <Kabar state={state} />
      <Submit label="Ganti email" />
    </form>
  );
}

export function GantiSandiForm({ action }: { action: Aksi }) {
  const [state, formAction] = useActionState(action, {} as AkunState);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label className="label" htmlFor="sandi-lama">
          Password sekarang
        </label>
        <input
          id="sandi-lama"
          name="lama"
          type="password"
          autoComplete="current-password"
          className="input"
          placeholder="••••••••"
        />
      </div>

      <div>
        <label className="label" htmlFor="sandi-baru">
          Password baru
        </label>
        <input
          id="sandi-baru"
          name="baru"
          type="password"
          autoComplete="new-password"
          className="input"
          placeholder="Minimal 8 karakter"
        />
      </div>

      <div>
        <label className="label" htmlFor="sandi-ulangi">
          Ulangi password baru
        </label>
        <input
          id="sandi-ulangi"
          name="ulangi"
          type="password"
          autoComplete="new-password"
          className="input"
          placeholder="Ketik lagi yang sama"
        />
      </div>

      <Kabar state={state} />
      <Submit label="Ganti password" />
    </form>
  );
}
