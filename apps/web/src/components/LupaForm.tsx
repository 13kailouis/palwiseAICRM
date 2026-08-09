"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { ResetState } from "@/app/actions/auth";

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary w-full py-2.5" disabled={pending}>
      {pending ? "Sebentar" : label}
    </button>
  );
}

/** Formulir minta tautan ganti password. */
export function MintaResetForm({
  action,
}: {
  action: (state: ResetState, formData: FormData) => Promise<ResetState>;
}) {
  const [state, formAction] = useActionState(action, {} as ResetState);

  // Pesan ini sengaja tidak memberi tahu apakah emailnya terdaftar. Kalau
  // dibedakan, orang bisa memakai halaman ini untuk mengecek email siapa saja
  // yang punya akun di sini.
  if (state?.selesai) {
    return (
      <div className="rounded-lg bg-brand-50 px-4 py-3.5 text-sm leading-relaxed text-brand-900">
        <p className="font-medium">Kalau emailnya terdaftar, tautannya sudah dikirim.</p>
        <p className="mt-1.5 text-brand-800">
          Cek kotak masuk, dan lihat juga folder spam. Tautannya berlaku 1 jam.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label className="label" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          className="input"
          placeholder="kamu@bisnis.com"
        />
        <p className="hint">Email yang kamu pakai waktu daftar.</p>
      </div>

      {state?.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <Submit label="Kirim tautan" />
    </form>
  );
}

/** Formulir password baru, dibuka dari tautan di email. */
export function AturUlangForm({
  action,
  token,
}: {
  action: (state: ResetState, formData: FormData) => Promise<ResetState>;
  token: string;
}) {
  const [state, formAction] = useActionState(action, {} as ResetState);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="token" value={token} />

      <div>
        <label className="label" htmlFor="password">
          Password baru
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          className="input"
          placeholder="Minimal 8 karakter"
        />
      </div>

      <div>
        <label className="label" htmlFor="ulangi">
          Ulangi password baru
        </label>
        <input
          id="ulangi"
          name="ulangi"
          type="password"
          autoComplete="new-password"
          className="input"
          placeholder="Ketik lagi yang sama"
        />
      </div>

      {state?.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <Submit label="Simpan password baru" />
    </form>
  );
}
