import Link from "next/link";
import { AuthShell } from "@/components/AuthShell";
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
    <AuthShell mode="register">
      <h1>Mulai langkah yang lebih ringan.</h1>
      <p className="pw-auth-description">Buat akun gratis. Kenalkan bisnismu, lalu coba asisten sebelum menyambungkan WhatsApp.</p>
      <AuthForm action={registerAction} mode="register" kodeAjak={kodeAjak} />
      <p className="pw-auth-terms">Dengan membuat akun, kamu menyetujui <Link href={keSitus("/ketentuan")}>syarat layanan</Link> dan telah membaca <Link href={keSitus("/privasi")}>kebijakan privasi</Link>.</p>
    </AuthShell>
  );
}
