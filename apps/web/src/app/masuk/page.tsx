import Link from "next/link";
import { LogoNama } from "@/components/Logo";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { loginAction } from "@/app/actions/auth";
import { getSessionUser } from "@/lib/auth";
import { keSitus } from "@/lib/situs";
import type { Metadata } from "next";
/**
 * Halaman ini ada di alamat dashboard dan tidak perlu muncul di Google.
 * Yang dicari orang di mesin pencari adalah halaman jualannya.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};


export default async function LoginPage() {
  if (await getSessionUser()) redirect("/app");

  return (
    <main className="grid min-h-screen place-items-center bg-ink-50 px-5 py-12">
      <div className="w-full max-w-sm">
        <Link href={keSitus("/")} className="mb-8 flex items-center justify-center gap-2">
          <LogoNama />
        </Link>

        <div className="card p-6">
          <h1 className="text-xl font-semibold tracking-tight">Masuk</h1>
          <p className="mb-6 mt-1 text-sm text-ink-500">
            Lanjut ke halaman kamu.
          </p>
          <AuthForm action={loginAction} mode="login" />

          <p className="mt-4 text-center text-sm">
            <Link href="/lupa" className="text-ink-500 hover:text-ink-900 hover:underline">
              Lupa password?
            </Link>
          </p>
        </div>

        <p className="mt-5 text-center text-sm text-ink-500">
          Belum punya akun?{" "}
          <Link href="/daftar" className="font-medium text-brand-700 hover:underline">
            Daftar gratis
          </Link>
        </p>
      </div>
    </main>
  );
}
