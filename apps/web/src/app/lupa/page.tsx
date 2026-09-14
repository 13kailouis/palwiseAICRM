import type { Metadata } from "next";
import { AuthShell } from "@/components/AuthShell";
import Link from "next/link";
import { redirect } from "next/navigation";
import { MintaResetForm } from "@/components/LupaForm";
import { mintaResetAction } from "@/app/actions/auth";
import { getSessionUser } from "@/lib/auth";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function LupaPage() {
  if (await getSessionUser()) redirect("/app");

  return (
    <AuthShell mode="recovery">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Pulihkan akses akun</h1>
          <p className="mb-6 mt-1 text-sm text-ink-500">
            Masukkan email akunmu. Kami akan mengirim tautan untuk membuat kata sandi baru.
          </p>
          <MintaResetForm action={mintaResetAction} />
        </div>

        <p className="mt-5 text-center text-sm text-ink-500">
          Ingat lagi passwordnya?{" "}
          <Link href="/masuk" className="font-medium text-brand-700 hover:underline">
            Masuk
          </Link>
        </p>
    </AuthShell>
  );
}
