import Link from "next/link";
import { LogoNama, Logo } from "./Logo";
import { Ikon } from "./Ikon";
import { keSitus } from "@/lib/situs";

export function AuthShell({
  children,
  mode = "login",
}: {
  children: React.ReactNode;
  mode?: "login" | "register" | "recovery";
}) {
  return (
    <main className="pw-auth">
      <aside className="pw-auth-story">
        <Link href={keSitus("/")} aria-label="Kembali ke Palwise">
          <LogoNama />
        </Link>
        <div className="pw-auth-story-content">
          <p className="pw-eyebrow">REKAN KERJA AI UNTUK BISNISMU</p>
          <h2>
            Lebih dekat dengan pelanggan.
            <br />
            <span>Lebih tenang menjalankan bisnis.</span>
          </h2>
          <p>
            WhatsApp pelanggan dan bantuan AI untuk pemilik, dalam satu ruang
            kerja yang mudah kamu kendalikan.
          </p>
          <div className="pw-auth-proof">
            <div>
              <Logo ukuran={24} />
              <strong>Palwise AI</strong>
              <small className="ml-auto text-ink-500">Contoh penggunaan</small>
            </div>
            <p>
              “Bantu aku lihat pelanggan yang perlu ditindaklanjuti hari ini.”
            </p>
            <span>
              <Ikon nama="kendali" size={16} />
              Lihat konteks. Periksa draf. Tentukan langkah.
            </span>
          </div>
        </div>
        <div className="pw-auth-story-footer">
          <span>Palwise · Untuk bisnis Indonesia</span>
          <Link href={keSitus("/privasi")}>Privasi</Link>
        </div>
      </aside>
      <div className="pw-auth-main">
        <Link href={keSitus("/")} className="pw-auth-mobile-brand">
          <LogoNama />
        </Link>
        <p className="pw-auth-switch">
          {mode === "register" ? (
            <>
              Sudah punya akun? <Link href="/masuk">Masuk</Link>
            </>
          ) : mode === "recovery" ? (
            <Link href="/masuk">← Kembali ke masuk</Link>
          ) : (
            <>
              Baru di Palwise? <Link href="/daftar">Buat akun gratis</Link>
            </>
          )}
        </p>
        <div className="pw-auth-form-wrap">{children}</div>
        <p className="pw-auth-help">
          Butuh bantuan?{" "}
          <Link
            href={keSitus("/kontak")}
            className="underline underline-offset-4"
          >
            Hubungi tim Palwise
          </Link>
        </p>
      </div>
    </main>
  );
}
