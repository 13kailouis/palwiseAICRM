import { PlatformNav } from "@/components/PlatformNav";
import { prisma } from "@palwise/db";
import { requireUser } from "@/lib/auth";
import {
  FormDuaKolom,
  KOLOM_FORM,
  PageHeader,
  PanelBantuan,
} from "@/components/ui";
import { Ikon } from "@/components/Ikon";
import {
  GantiEmailForm,
  GantiSandiForm,
  TombolVerifikasi,
} from "@/components/AkunForm";
import {
  gantiEmailAction,
  gantiSandiAction,
  kirimVerifikasiAction,
} from "@/app/actions/akun";

export const dynamic = "force-dynamic";

export default async function AkunPage() {
  const user = await requireUser();
  const baris = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
  const terkonfirmasi = !!baris.emailVerifiedAt;

  return (
    <>
      <PageHeader
        kolom={KOLOM_FORM}
        title="Akun & keamanan"
        description="Kelola akses masuk dan email pemulihan akunmu."
      />

      <PlatformNav active="/app/akun" kind="account" />

      <FormDuaKolom
        bantuan={
          <PanelBantuan
            judul="Akses akunmu"
            poin={[
              {
                ikon: "akun",
                teks: "Email dan password ini cuma buat kamu masuk, bukan yang dilihat pelanggan.",
              },
              {
                ikon: "info",
                teks: "Kalau lupa password, email inilah satu-satunya jalan kami balikin akunmu. Pastikan sudah dikonfirmasi.",
              },
            ]}
          />
        }
      >
        <div className="space-y-6">
          <div className="card-pad">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-ink-100 text-ink-600">
                  <Ikon nama="amplop" size={18} />
                </span>
                <div className="min-w-0">
                  <p className="text-sm text-ink-500">Email kamu</p>
                  <p className="mt-0.5 break-all text-base font-medium text-ink-950">
                    {baris.email}
                  </p>
                </div>
              </div>
              <span
                className={`badge ${
                  terkonfirmasi
                    ? "bg-brand-50 text-brand-700"
                    : "bg-amber-50 text-amber-800"
                }`}
              >
                {terkonfirmasi ? "Sudah dikonfirmasi" : "Belum dikonfirmasi"}
              </span>
            </div>

            {terkonfirmasi ? (
              <p className="mt-4 text-sm leading-relaxed text-ink-500">
                Dikonfirmasi{" "}
                {baris.emailVerifiedAt!.toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
                . Kalau suatu hari kamu lupa password, tautan pemulihannya
                dikirim ke alamat ini.
              </p>
            ) : (
              <div className="mt-4 space-y-4">
                <p className="text-sm leading-relaxed text-ink-600">
                  Verifikasi email agar kamu bisa memulihkan akses saat lupa
                  password.
                </p>
                <TombolVerifikasi action={kirimVerifikasiAction} />
              </div>
            )}
          </div>

          <details className="pw-settings-section">
            <summary>
              <span className="min-w-0 flex-1">
                <span className="pw-settings-title">Ganti email</span>
                <span className="pw-settings-description">
                  Gunakan alamat yang selalu bisa kamu akses. Alamat lama akan
                  menerima pemberitahuan.
                </span>
              </span>
              <span className="pw-disclosure-arrow" aria-hidden="true">
                ⌄
              </span>
            </summary>
            <div className="pw-settings-content">
              <GantiEmailForm action={gantiEmailAction} />
            </div>
          </details>

          <details className="pw-settings-section">
            <summary>
              <span className="min-w-0 flex-1">
                <span className="pw-settings-title">Ganti password</span>
                <span className="pw-settings-description">
                  Perangkat lain akan diminta masuk ulang. Perangkat ini tetap
                  terhubung.
                </span>
              </span>
              <span className="pw-disclosure-arrow" aria-hidden="true">
                ⌄
              </span>
            </summary>
            <div className="pw-settings-content">
              <GantiSandiForm action={gantiSandiAction} />
            </div>
          </details>
        </div>
      </FormDuaKolom>
    </>
  );
}
