import Link from "next/link";
import { AuthShell } from "@/components/AuthShell";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { loginAction } from "@/app/actions/auth";
import { getSessionUser } from "@/lib/auth";
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
    <AuthShell mode="login">
      <h1>Selamat datang kembali.</h1>
      <p className="pw-auth-description">Pelanggan, percakapan, dan langkah berikutnya. Lanjutkan dari ruang kerjamu.</p>
      <AuthForm action={loginAction} mode="login" />
      <p className="mt-5 text-center text-xs text-ink-500"><Link href="/lupa" className="underline underline-offset-4">Lupa kata sandi?</Link></p>
    </AuthShell>
  );
}
