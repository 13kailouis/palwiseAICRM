import type { Metadata } from "next";
import { LogoNama } from "@/components/Logo";
import Link from "next/link";
import { redirect } from "next/navigation";
import { MintaResetForm } from "@/components/LupaForm";
import { mintaResetAction } from "@/app/actions/auth";
import { getSessionUser } from "@/lib/auth";
import { keSitus } from "@/lib/situs";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function LupaPage() {
  if (await getSessionUser()) redirect("/app");

  return (
    <main className="grid min-h-screen place-items-center bg-ink-50 px-5 py-12">
      <div className="w-full max-w-sm">
        <Link href={keSitus("/")} className="mb-8 flex items-center justify-center gap-2">
          <LogoNama />
        </Link>

        <div className="card p-6">
          <h1 className="text-xl font-semibold tracking-tight">Lupa password</h1>
          <p className="mb-6 mt-1 text-sm text-ink-500">
            Masukkan emailmu, nanti kami kirim tautan untuk bikin password baru.
          </p>
          <MintaResetForm action={mintaResetAction} />
        </div>

        <p className="mt-5 text-center text-sm text-ink-500">
          Ingat lagi passwordnya?{" "}
          <Link href="/masuk" className="font-medium text-brand-700 hover:underline">
            Masuk
          </Link>
        </p>
      </div>
    </main>
  );
}
