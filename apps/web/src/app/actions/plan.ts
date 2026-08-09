"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  BAYAR_GAGAL,
  BAYAR_MENUNGGU,
  PLANS,
  SUMBER_MIDTRANS,
  getPlan,
  pakaiBulanGratis,
  prisma,
  statusLangganan,
} from "@palwise/db";
import { requireUser } from "@/lib/auth";
import { buatTransaksiSnap, midtransSiap } from "@/lib/midtrans";
import { asalApp } from "@/lib/situs";
import { callWorker } from "@/lib/worker";

export interface PlanState {
  error?: string;
  /** Kabar baik atau kabar netral. Bukan galat, jadi warnanya beda di layar. */
  info?: string;
}

/**
 * Matikan nomor yang tidak muat lagi di paket baru, SEKARANG.
 *
 * Batas jumlah nomor sebenarnya sudah lama ditegakkan, tapi cuma di dua tempat:
 * waktu sebuah nomor disambungkan, dan waktu worker menyalakan ulang semua
 * nomor saat start. Tidak ada yang memeriksa nomor yang sedang jalan.
 *
 * Akibatnya bentuk kegagalan yang paling membingungkan: sesudah turun paket,
 * nomor kedua dan ketiga TETAP membalas pelanggan, kadang berhari-hari, lalu
 * mati mendadak pada deploy berikutnya tanpa ada yang menyentuh apa pun. Dari
 * sisi pemiliknya itu terbaca sebagai produk yang rusak sendiri, bukan sebagai
 * batas paket yang memang dia pilih.
 *
 * `autoStart` ikut dimatikan supaya nomornya juga tidak dihidupkan lagi oleh
 * worker berikutnya. Yang dipertahankan nomor TERLAMA, sama persis dengan
 * aturan di `dalamJatahPaket` milik worker.
 *
 * Gagalnya worker tidak menggagalkan pindah paketnya. Pakainya sudah berubah di
 * database, dan `restoreChannels` akan menegakkan batas yang sama nanti.
 */
async function rapikanNomorLewatJatah(workspaceId: string, planId: string) {
  const batas = getPlan(planId).maxChannels;

  const nomor = await prisma.channel.findMany({
    where: { workspaceId },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });

  for (const c of nomor.slice(batas)) {
    await prisma.channel
      .update({ where: { id: c.id }, data: { autoStart: false } })
      .catch(() => null);
    try {
      await callWorker(`/channels/${c.id}/stop`, {
        method: "POST",
        body: {},
        timeoutMs: 15_000,
      });
    } catch {
      // Worker mati. Batasnya tetap ditegakkan waktu dia hidup lagi.
    }
  }
}

/**
 * Pilih paket.
 *
 * Empat jalan keluar, dan yang menentukan bukan mahal atau murahnya paket
 * tujuan, tapi apakah orangnya sedang punya periode yang SUDAH DIBAYAR:
 *
 * 1. Ke paket gratis, tanpa periode berbayar → langsung, seketika.
 * 2. Ke paket lebih murah, periode masih jalan → DIJADWALKAN di akhir periode.
 *    Halaman pengembalian dana menjanjikan layanan tetap hidup sampai tanggal
 *    habisnya, jadi memotongnya sekarang bukan cuma tidak ramah, tapi
 *    melanggar yang sudah kami tulis sendiri.
 * 3. Ke paket berbayar, punya bulan gratis dari ajak teman → dipotong dari
 *    situ, tanpa lewat Midtrans sama sekali.
 * 4. Ke paket berbayar → dibuat tagihan, lalu orangnya dibawa ke halaman bayar.
 *    Paketnya TIDAK berubah di sini. Yang menaikkannya notifikasi dari
 *    Midtrans di /api/pembayaran/midtrans.
 *
 * Yang paling penting soal nomor 4: sebelum ada berkas ini, tombolnya langsung
 * menulis `plan` ke database. Artinya siapa pun yang sudah mengonfirmasi
 * emailnya bisa mengambil paket Pro beserta seluruh jatahnya, gratis, sekali
 * klik. Halamannya memang menulis "sistem pembayarannya belum dipasang", tapi
 * itu kalimat, bukan pengaman.
 */
export async function changePlanAction(
  _prev: PlanState,
  formData: FormData,
): Promise<PlanState> {
  const user = await requireUser();
  const plan = String(formData.get("plan") ?? "");

  if (!(plan in PLANS)) return {};

  const ws = await prisma.workspace.findUniqueOrThrow({
    where: { id: user.workspaceId },
  });
  const status = statusLangganan(ws);
  const tujuan = getPlan(plan);
  const sekarang = getPlan(ws.plan);

  // Sudah di paket ini dan tidak sedang berbayar. Tidak ada yang perlu
  // dikerjakan, dan menagih orang untuk paket gratis itu jelas keliru.
  if (plan === ws.plan && tujuan.pricePerMonth === 0) return {};

  // ── 1 & 2. Turun paket ────────────────────────────────────────────────────
  if (tujuan.pricePerMonth < sekarang.pricePerMonth) {
    if (status.aktif && status.sampai) {
      const tanggal = status.sampai.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });

      await prisma.workspace.update({
        where: { id: user.workspaceId },
        data: { paketBerikutnya: plan },
      });

      revalidatePath("/app/tagihan");
      revalidatePath("/app");
      return {
        info:
          `Sudah dicatat. Paket ${sekarang.name} kamu tetap jalan sampai ${tanggal}, ` +
          `karena bulan itu sudah kamu bayar. Sesudah tanggal itu paketmu jadi ` +
          `${tujuan.name}. Kamu bisa membatalkan ini kapan saja sebelum tanggalnya.`,
      };
    }

    // Tidak sedang punya periode berbayar, jadi tidak ada yang dirugikan kalau
    // berlaku sekarang. Ini juga jalan yang dipakai akun yang paketnya berbayar
    // tapi tanggalnya sudah lewat, misalnya kalau worker mati beberapa jam.
    await prisma.workspace.update({
      where: { id: user.workspaceId },
      data: { plan, paketBerikutnya: null, langgananSampai: null },
    });
    await rapikanNomorLewatJatah(user.workspaceId, plan);

    revalidatePath("/app/tagihan");
    revalidatePath("/app");
    return {};
  }

  // ── Mulai dari sini semuanya paket berbayar ───────────────────────────────

  // Satu-satunya tempat konfirmasi email diwajibkan.
  //
  // Sengaja bukan saat mendaftar. Menghadang orang tepat setelah daftar
  // membuat sebagian tidak pernah kembali. Di sini beda: dia sudah mencoba,
  // sudah yakin, dan sebentar lagi ada tagihan serta bukti bayar yang harus
  // sampai ke alamat itu. Alamat yang salah mulai betulan merugikan di sini.
  const akun = await prisma.user.findUniqueOrThrow({
    where: { id: user.id },
    select: { emailVerifiedAt: true, email: true, name: true },
  });
  if (!akun.emailVerifiedAt) {
    return {
      error:
        "Konfirmasi emailmu dulu sebelum pindah ke paket berbayar. Tagihan " +
        "dan pemulihan akun dikirim ke alamat itu. Buka halaman Akun.",
    };
  }

  // Perpanjangan paket yang sama menambah dari tanggal habis yang lama, jadi
  // orang yang membayar lebih awal tidak kehilangan hari.
  const perpanjang = plan === ws.plan && status.aktif;

  // ── 3. Bulan gratis dari ajak teman ───────────────────────────────────────
  if (ws.bulanGratis > 0) {
    const hasil = await pakaiBulanGratis({
      workspaceId: user.workspaceId,
      planId: plan,
      perpanjang,
    });

    if (hasil) {
      const tanggal = hasil.sampai.toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
      revalidatePath("/app/tagihan");
      revalidatePath("/app");
      return {
        info:
          `Paket ${tujuan.name} aktif sampai ${tanggal}, dibayar pakai satu bulan ` +
          `gratis dari ajak teman. Tidak ada yang perlu kamu transfer.`,
      };
    }
    // Bulan gratisnya ternyata sudah habis (dua klik cepat). Lanjut ke jalur
    // bayar seperti biasa, bukan gagal.
  }

  // ── 4. Bayar ──────────────────────────────────────────────────────────────
  if (!midtransSiap()) {
    return {
      error:
        "Pembayaran belum diatur di server ini, jadi paketnya belum bisa " +
        "dinaikkan sendiri. Hubungi kami dan kami bantu aktifkan manual.",
    };
  }

  // Upaya lama yang masih menggantung untuk paket yang sama ditandai gagal
  // dulu. Kalau tidak, halaman tagihan menampilkan dua tagihan "menunggu"
  // untuk satu hal, dan orangnya tidak tahu yang mana yang harus dibayar.
  await prisma.pembayaran.updateMany({
    where: { workspaceId: user.workspaceId, status: BAYAR_MENUNGGU },
    data: { status: BAYAR_GAGAL, catatan: "Ditinggalkan, ada upaya baru." },
  });

  const bayar = await prisma.pembayaran.create({
    data: {
      workspaceId: user.workspaceId,
      planId: plan,
      jumlah: tujuan.pricePerMonth,
      sumber: SUMBER_MIDTRANS,
      status: BAYAR_MENUNGGU,
      perpanjang,
    },
  });

  // Harus alamat LENGKAP dengan http/https. Midtrans memakainya sebagai tujuan
  // kembali dari halaman bayar mereka, jadi jalur pendek seperti "/app/tagihan"
  // akan mendarat di app.midtrans.com, bukan di dashboard kita. `keApp` tidak
  // bisa dipakai di sini karena waktu belum dipisah dia memang mengembalikan
  // jalur pendek.
  const kepala = await headers();
  const urlSelesai = `${asalApp(kepala.get("host") ?? undefined)}/app/tagihan?bayar=selesai`;

  let urlBayar: string;
  try {
    const snap = await buatTransaksiSnap({
      orderId: bayar.id,
      jumlah: tujuan.pricePerMonth,
      namaPaket: tujuan.name,
      email: akun.email,
      nama: akun.name || ws.name,
      urlSelesai,
    });
    urlBayar = snap.urlBayar;
    await prisma.pembayaran.update({
      where: { id: bayar.id },
      data: { urlBayar },
    });
  } catch (err) {
    // Barisnya WAJIB ditandai gagal. Kalau dibiarkan "menunggu", halaman
    // tagihan akan menawarkan "Lanjutkan pembayaran" untuk tagihan yang tidak
    // punya tautan, dan tombolnya tidak akan pernah membawa ke mana-mana.
    const pesan = err instanceof Error ? err.message : String(err);
    console.error(`Gagal membuat transaksi Midtrans ${bayar.id}: ${pesan}`);
    await prisma.pembayaran.update({
      where: { id: bayar.id },
      data: { status: BAYAR_GAGAL, catatan: pesan.slice(0, 900) },
    });
    return {
      error:
        "Halaman pembayarannya gagal dibuka. Coba lagi sebentar, dan kalau " +
        "masih begitu hubungi kami.",
    };
  }

  revalidatePath("/app/tagihan");

  // DI LUAR try. redirect() bekerja dengan melempar galat khusus yang ditangani
  // Next.js, jadi kalau dia dipanggil di dalam try tadi, catch-nya akan
  // menelannya dan orangnya tidak pernah sampai ke halaman bayar — sementara
  // tagihannya sudah dibuat dan dicap gagal oleh catch-nya sendiri.
  redirect(urlBayar);
}

/**
 * Batalkan penurunan paket yang sudah dijadwalkan.
 *
 * Ada karena tanpa ini, satu klik "Pindah ke Coba Gratis" tidak bisa ditarik
 * kembali sampai tanggalnya tiba. Orang yang salah tekan harus menunggu
 * berminggu-minggu, atau menghubungi kami untuk sesuatu yang seharusnya cuma
 * satu tombol.
 */
export async function batalkanJadwalTurunAction(): Promise<void> {
  const user = await requireUser();

  await prisma.workspace.update({
    where: { id: user.workspaceId },
    data: { paketBerikutnya: null },
  });

  revalidatePath("/app/tagihan");
  revalidatePath("/app");
}
