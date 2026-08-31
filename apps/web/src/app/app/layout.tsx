import { Suspense } from "react";
import { getPlan, prisma, terpakaiSekarang } from "@palwise/db";
import { requireUser } from "@/lib/auth";
import { PeringatanKuota } from "@/components/PeringatanKuota";
import { PeringatanEmail } from "@/components/PeringatanEmail";
import { PeringatanMesin } from "@/components/PeringatanMesin";
import { GarisMuat } from "@/components/GarisMuat";
import { logoutAction } from "@/app/actions/auth";
import { Sidebar } from "@/components/Sidebar";
import { NavBawah } from "@/components/NavBawah";
import { BarAtas } from "@/components/BarAtas";
import { KirimMasukan } from "@/components/KirimMasukan";
import { kirimMasukanAction } from "@/app/actions/masukan";
import { bolehLihatFounder } from "@/lib/founder";
import type { Metadata } from "next";
/**
 * Halaman ini ada di alamat dashboard dan tidak perlu muncul di Google.
 * Yang dicari orang di mesin pencari adalah halaman jualannya.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};


export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  // Cuma dua kueri database di sini, keduanya berjalan bersamaan. Pengecekan
  // mesin TIDAK ikut ditunggu: dia lewat HTTP ke worker dan bisa memakan
  // sampai 4 detik, sementara hasilnya cuma pita peringatan. Lihat
  // PeringatanMesin.
  const [workspace, akun] = await Promise.all([
    prisma.workspace.findUniqueOrThrow({ where: { id: user.workspaceId } }),
    prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      select: { emailVerifiedAt: true },
    }),
  ]);

  // Dihitung HANYA untuk founder, dan itu bukan soal kerapian.
  //
  // Layout ini digambar ulang di setiap halaman dashboard yang dibuka SIAPA PUN,
  // jadi satu kueri tambahan di sini jatuh ke seluruh pelanggan sekaligus, di
  // satu VPS yang juga menjalankan mesin WhatsApp dan AI. Yang dibayar bukan
  // kuerinya, tapi jumlah kalinya.
  const founder = bolehLihatFounder(user.email);
  const masukanBelumDibaca = founder
    ? await prisma.masukan.count({ where: { dibacaPada: null } })
    : 0;

  return (
    <div className="flex h-screen overflow-hidden">
      <GarisMuat />

      <Sidebar
        workspaceName={workspace.name}
        userName={user.email}
        logout={logoutAction}
        founder={founder}
        masukanBelumDibaca={masukanBelumDibaca}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <BarAtas namaWorkspace={workspace.name} />

        {/* Pakai hitungan yang sudah memperhitungkan pergantian periode.
            Tanpa itu, pita "jatahmu habis" masih menempel di tanggal 1 sampai
            ada pesan pertama yang memicu worker menolkan hitungannya. */}
        <PeringatanKuota
          terpakai={terpakaiSekarang(
            workspace.aiCreditsUsed,
            workspace.quotaResetAt,
          )}
          batas={getPlan(workspace.plan).aiCredits}
          namaPaket={getPlan(workspace.plan).name}
        />

        {!akun.emailVerifiedAt && <PeringatanEmail email={user.email} />}

        {/* Tanpa penampung sementara. Pita ini biasanya tidak muncul sama
            sekali, jadi menaruh kerangka di sini justru bikin halaman
            berkedip tiap kali dibuka padahal tidak ada apa-apa. */}
        <Suspense fallback={null}>
          <PeringatanMesin />
        </Suspense>

        {/* Jarak aman di dasar halaman supaya isi terakhir tidak tertutup bar
            bawah. Tanpa ini, tombol terakhir di halaman panjang selalu
            setengah tertutup dan orang mengira halamannya rusak.

            Cuma di HP. Di desktop bar bawahnya tidak ada, jadi jarak ini cuma
            jadi ruang kosong 60px yang tidak ada gunanya di dasar tiap
            halaman. */}
        <main className="isi-utama thin-scroll min-h-0 flex-1 overflow-y-auto bg-ink-50 pb-[var(--bar-bawah)] lg:pb-0">
          {children}
        </main>
      </div>

      {/* Melayang di semua halaman dashboard. Laporan bug ditulis orang PADA SAAT
          dia menemukan bugnya; menu yang harus dibuka dulu berarti dia keluar
          dari halaman tempat masalahnya terjadi, dan sebagian besar tidak
          kembali. */}
      <KirimMasukan action={kirimMasukanAction} />

      <NavBawah logout={logoutAction} />
    </div>
  );
}
