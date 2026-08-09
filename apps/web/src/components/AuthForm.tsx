"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { AuthState } from "@/app/actions/auth";

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary w-full py-2.5" disabled={pending}>
      {pending ? "Sebentar" : label}
    </button>
  );
}

export function AuthForm({
  action,
  mode,
  kodeAjak,
}: {
  action: (state: AuthState, formData: FormData) => Promise<AuthState>;
  mode: "login" | "register";
  kodeAjak?: string;
}) {
  const [state, formAction] = useActionState(action, {} as AuthState);

  return (
    <form action={formAction} className="space-y-4">
      {mode === "register" && (
        <>
          <div>
            <label className="label" htmlFor="name">
              Nama kamu
            </label>
            <input id="name" name="name" className="input" placeholder="Budi Santoso" />
          </div>
          <div>
            <label className="label" htmlFor="businessName">
              Nama bisnis
            </label>
            <input
              id="businessName"
              name="businessName"
              className="input"
              placeholder="Kopi Nusantara"
            />
          </div>
        </>
      )}

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
      </div>

      <div>
        <label className="label" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          className="input"
          placeholder={mode === "register" ? "Minimal 8 karakter" : "••••••••"}
        />
      </div>

      {mode === "register" && (
        <div>
          <label className="label" htmlFor="ajak">
            Kode ajakan{" "}
            <span className="font-normal text-ink-400">(kalau ada)</span>
          </label>
          <input
            id="ajak"
            name="ajak"
            defaultValue={kodeAjak ?? ""}
            className="input font-mono tracking-widest"
            placeholder="ABC123"
          />
          {kodeAjak && (
            <p className="hint text-brand-700">
              Kamu diajak teman. Kalau nanti berlangganan, kalian berdua dapat 1
              bulan gratis.
            </p>
          )}
        </div>
      )}

      {state?.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <Submit label={mode === "login" ? "Masuk" : "Buat akun"} />
    </form>
  );
}
