import type { Metadata } from "next";
import { LogoNama } from "@/components/Logo";
import Link from "next/link";
import { pakaiTokenVerifikasi } from "@palwise/db";
import { keSitus } from "@/lib/situs";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/**
 * Halaman yang dibuka dari tautan di email.
 *
 * Sengaja tidak minta login dulu. Orang sering membuka emailnya di HP sementara
 * dashboardnya terbuka di laptop, dan memaksa masuk lebih dulu di situ membuat
 * sebagian orang berhenti di tengah jalan.
 */
export default async function VerifikasiPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const hasil = await pakaiTokenVerifikasi(token ?? "");

  const pesan = hasil.ok
    ? null
    : hasil.alasan === "kedaluwarsa"
      ? "Tautannya sudah lewat waktu. Masuk ke Palwise, buka halaman Akun, lalu minta tautan baru."
      : hasil.alasan === "sudah_dipakai"
        ? "Tautan ini sudah dipakai. Kalau emailmu sudah bertanda dikonfirmasi di halaman Akun, berarti tidak ada lagi yang perlu dilakukan."
        : hasil.alasan === "email_berubah"
          ? "Emailmu sudah diganti lagi setelah tautan ini dibuat, jadi tautannya tidak berlaku lagi. Minta yang baru dari halaman Akun."
          : "Tautannya tidak berlaku. Minta yang baru dari halaman Akun.";

  return (
    <main className="grid min-h-screen place-items-center bg-ink-50 px-5 py-12">
      <div className="w-full max-w-sm">
        <Link href={keSitus("/")} className="mb-8 flex items-center justify-center gap-2">
          <LogoNama />
        </Link>

        <div className="card p-6">
          {hasil.ok ? (
            <>
              <h1 className="text-xl font-semibold tracking-tight">Email dikonfirmasi</h1>
              <p className="mt-2 text-sm leading-relaxed text-ink-600">
                <span className="font-medium text-ink-900">{hasil.email}</span>{" "}
                sudah dipastikan milikmu. Kalau suatu hari kamu lupa password,
                tautan pemulihannya dikirim ke sana.
              </p>
              <Link href="/app" className="btn-primary mt-6 w-full py-2.5">
                Buka dashboard
              </Link>
            </>
          ) : (
            <>
              <h1 className="text-xl font-semibold tracking-tight">
                Tautannya tidak berlaku
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-ink-600">{pesan}</p>
              <Link href="/app/akun" className="btn-primary mt-6 w-full py-2.5">
                Buka halaman Akun
              </Link>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
