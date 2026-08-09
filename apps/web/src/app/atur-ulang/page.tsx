import type { Metadata } from "next";
import { LogoNama } from "@/components/Logo";
import Link from "next/link";
import { tokenResetMasihBerlaku } from "@palwise/db";
import { AturUlangForm } from "@/components/LupaForm";
import { aturUlangAction } from "@/app/actions/auth";
import { keSitus } from "@/lib/situs";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AturUlangPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  // Diperiksa sebelum formulirnya muncul. Kalau tidak, orang mengetik password
  // baru dua kali, menekan simpan, baru diberi tahu tautannya sudah basi.
  const berlaku = token ? await tokenResetMasihBerlaku(token) : false;

  return (
    <main className="grid min-h-screen place-items-center bg-ink-50 px-5 py-12">
      <div className="w-full max-w-sm">
        <Link href={keSitus("/")} className="mb-8 flex items-center justify-center gap-2">
          <LogoNama />
        </Link>

        <div className="card p-6">
          {berlaku ? (
            <>
              <h1 className="text-xl font-semibold tracking-tight">Password baru</h1>
              <p className="mb-6 mt-1 text-sm text-ink-500">
                Setelah disimpan, kamu langsung masuk. Perangkat lain yang masih
                terbuka akan diminta masuk ulang.
              </p>
              <AturUlangForm action={aturUlangAction} token={token!} />
            </>
          ) : (
            <>
              <h1 className="text-xl font-semibold tracking-tight">
                Tautannya sudah tidak berlaku
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-ink-600">
                Tautan ganti password cuma berlaku 1 jam dan sekali pakai. Kalau
                tadi sudah dipakai atau sudah lewat waktu, minta yang baru.
              </p>
              <Link href="/lupa" className="btn-primary mt-6 w-full py-2.5">
                Minta tautan baru
              </Link>
            </>
          )}
        </div>

        <p className="mt-5 text-center text-sm text-ink-500">
          <Link href="/masuk" className="font-medium text-brand-700 hover:underline">
            Kembali ke halaman masuk
          </Link>
        </p>
      </div>
    </main>
  );
}
