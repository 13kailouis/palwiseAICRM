import { prisma } from "@palwise/db";
import { requireUser } from "@/lib/auth";
import { FormDuaKolom, KOLOM_FORM, PageHeader, PanelBantuan } from "@/components/ui";
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
        title="Akun"
        description="Email dan password untuk masuk ke Palwise. Ini terpisah dari data bisnismu."
      />

      <FormDuaKolom
        bantuan={
          <PanelBantuan
            judul="Kenapa ini penting"
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
            <div className="min-w-0">
              <p className="text-sm text-ink-500">Email kamu</p>
              <p className="mt-1 truncate text-lg font-medium text-ink-950">
                {baris.email}
              </p>
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
              . Kalau suatu hari kamu lupa password, tautan pemulihannya dikirim
              ke alamat ini.
            </p>
          ) : (
            <div className="mt-4 space-y-4">
              <p className="text-sm leading-relaxed text-ink-600">
                Kalau suatu hari kamu lupa password, alamat inilah satu-satunya
                jalan kami mengembalikan akunmu. Jadi lebih baik dipastikan
                sekarang, selagi masih gampang dibetulkan.
              </p>
              <TombolVerifikasi action={kirimVerifikasiAction} />
            </div>
          )}
        </div>

        <div className="card-pad">
          <h2 className="font-semibold text-ink-900">Ganti email</h2>
          <p className="mb-5 mt-1 text-sm text-ink-500">
            Alamat lama akan dikabari kalau ini terjadi.
          </p>
          <GantiEmailForm action={gantiEmailAction} />
        </div>

        <div className="card-pad">
          <h2 className="font-semibold text-ink-900">Ganti password</h2>
          <p className="mb-5 mt-1 text-sm text-ink-500">
            Perangkat lain yang masih terbuka akan diminta masuk ulang. Perangkat
            ini tidak.
          </p>
          <GantiSandiForm action={gantiSandiAction} />
        </div>
        </div>
      </FormDuaKolom>
    </>
  );
}
