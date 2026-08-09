import Link from "next/link";
import { LogoNama } from "@/components/Logo";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { registerAction } from "@/app/actions/auth";
import { getSessionUser } from "@/lib/auth";
import { keSitus } from "@/lib/situs";
import { rapikanKodeAjak } from "@palwise/db";
import type { Metadata } from "next";
/**
 * Halaman ini ada di alamat dashboard dan tidak perlu muncul di Google.
 * Yang dicari orang di mesin pencari adalah halaman jualannya.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};


export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ ajak?: string }>;
}) {
  if (await getSessionUser()) redirect("/app");

  const { ajak } = await searchParams;
  const kodeAjak = ajak ? rapikanKodeAjak(ajak) : undefined;

  return (
    <main className="grid min-h-screen place-items-center bg-ink-50 px-5 py-12">
      <div className="w-full max-w-sm">
        <Link href={keSitus("/")} className="mb-8 flex items-center justify-center gap-2">
          <LogoNama />
        </Link>

        <div className="card p-6">
          <h1 className="text-xl font-semibold tracking-tight">Buat akun</h1>
          <p className="mb-6 mt-1 text-sm text-ink-500">
            Asisten pertama kamu langsung disiapkan sekalian.
          </p>
          <AuthForm action={registerAction} mode="register" kodeAjak={kodeAjak} />
        </div>

        <p className="mt-5 text-center text-sm text-ink-500">
          Sudah punya akun?{" "}
          <Link href="/masuk" className="font-medium text-brand-700 hover:underline">
            Masuk
          </Link>
        </p>
      </div>
    </main>
  );
}
