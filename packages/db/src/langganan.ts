/**
 * Langganan berbayar: kapan mulai, kapan habis, dan kapan turun sendiri.
 *
 * Ditaruh di packages/db karena DUA proses memakainya dan keduanya harus
 * sepakat. Dashboard memakainya waktu pembayaran lunas, worker memakainya
 * waktu memeriksa siapa yang sudah kedaluwarsa. Kalau logikanya ditulis dua
 * kali, suatu hari yang satu diperbaiki dan yang lain tidak, lalu ada yang
 * dibiarkan memakai paket Pro tanpa pernah bayar lagi.
 *
 * Aturan yang dipegang di sini, semuanya berasal dari halaman ketentuan dan
 * halaman pengembalian dana, bukan dari kenyamanan kode:
 *
 * 1. Dibayar di muka, per bulan. Tidak ada tagihan belakangan.
 * 2. Berhenti kapan saja, tapi layanannya HIDUP sampai tanggal habisnya.
 *    Bulan berjalan tidak dikembalikan sebagian, dan karena itu juga tidak
 *    boleh dipotong sebagian.
 * 3. Jatah balasan tidak dibawa ke bulan berikutnya.
 * 4. Turun paket harus diumumkan sebelum berlaku.
 */

import { getPlan } from "./plans.js";
import { majuSatuBulan } from "./jatah.js";
import { prisma } from "./index.js";

/** Status pembayaran. Satu tempat, supaya tidak ada yang salah ketik. */
export const BAYAR_MENUNGGU = "menunggu";
export const BAYAR_LUNAS = "lunas";
export const BAYAR_GAGAL = "gagal";
export const BAYAR_DIKEMBALIKAN = "dikembalikan";

/** Sumber sebuah baris pembayaran. */
export const SUMBER_MIDTRANS = "midtrans";
export const SUMBER_BULAN_GRATIS = "bulanGratis";

/**
 * Berapa hari sebelum habis pemiliknya diingatkan.
 *
 * Tiga hari, bukan satu. Pembayaran transfer bank di Indonesia bisa perlu
 * semalam, dan mengingatkan orang di hari terakhir berarti sebagian tetap
 * telat walau mereka langsung membayar begitu diberi tahu.
 */
export const HARI_INGATKAN_SEBELUM_HABIS = 3;

/**
 * Berapa lama satu tautan bayar berlaku.
 *
 * ANGKA INI WAJIB DIKIRIM KE MIDTRANS, bukan cuma dipakai di layar kita. Lihat
 * `expiry` di `buatTransaksiSnap`. Dua sistem yang punya dua pendapat berbeda
 * soal satu tenggat yang sama selalu berakhir sama: yang satu menawarkan tautan
 * yang sudah dibuang yang lain.
 *
 * Bug nyata 8 Agustus 2026. Dulu angka ini 24 dan TIDAK pernah dikirim ke
 * Midtrans sama sekali, jadi Midtrans memakai bawaannya sendiri. Bawaan halaman
 * checkout Snap **2 jam**, bukan 24. Akibatnya halaman tagihan menawarkan tombol
 * "Lanjutkan pembayaran" selama 24 jam untuk halaman yang Midtrans sudah buang
 * sesudah 2 jam, dan yang menekannya mendarat di "Transaksi sudah kedaluwarsa".
 * Dari sisi pemilik toko itu terbaca sebagai produk yang rusak, bukan sebagai
 * tagihan yang memang sudah lewat.
 *
 * Dipilih 24 jam, bukan dibiarkan 2 jam bawaan, karena pembeli di Indonesia
 * banyak yang bayar lewat transfer bank atau virtual account. Orang yang memulai
 * jam 11 malam lalu tidur akan kehilangan nomor VA-nya kalau cuma 2 jam, dan
 * besok paginya dia harus membuat tagihan baru dengan nomor VA yang berbeda.
 *
 * Batas Midtrans: minimal 5 menit. GoPay maksimal 7 hari.
 */
export const JAM_UPAYA_BAYAR_KEDALUWARSA = 24;

export interface StatusLangganan {
  /** Paket yang sedang berlaku. */
  planId: string;
  /** Paket berbayar, dan periodenya masih berjalan. */
  aktif: boolean;
  /** Paketnya berbayar tapi tanggalnya sudah lewat. Seharusnya tidak pernah
   *  terlihat lama: penjadwal worker menurunkannya. Kalau ini true di layar,
   *  berarti worker mati, dan itu sendiri kabar penting. */
  kedaluwarsa: boolean;
  sampai: Date | null;
  /** Dibulatkan ke atas. Habis hari ini tetap dihitung 1, bukan 0. */
  sisaHari: number | null;
  /** Paket yang sudah dijadwalkan menggantikan, kalau ada. */
  turunKe: string | null;
  /** Sudah masuk masa pengingat. */
  segeraHabis: boolean;
}

/**
 * Baca status langganan dari kolom mentahnya. Fungsi murni, tidak menulis.
 *
 * Pola yang sama dengan `terpakaiSekarang` di jatah.ts: yang menampilkan cuma
 * ikut menghitung, yang menulis tetap satu tempat. Jadi halaman tagihan tidak
 * pernah menunjukkan angka yang berbeda dari yang dipakai sistem.
 */
export function statusLangganan(
  ws: {
    plan: string;
    langgananSampai: Date | null;
    paketBerikutnya: string | null;
  },
  sekarang: Date = new Date(),
): StatusLangganan {
  const berbayar = getPlan(ws.plan).pricePerMonth > 0;
  const sampai = ws.langgananSampai;

  if (!berbayar || !sampai) {
    return {
      planId: ws.plan,
      aktif: false,
      kedaluwarsa: false,
      sampai: null,
      sisaHari: null,
      turunKe: null,
      segeraHabis: false,
    };
  }

  const sisaMs = sampai.getTime() - sekarang.getTime();
  const sisaHari = Math.ceil(sisaMs / (24 * 60 * 60 * 1000));
  const aktif = sisaMs > 0;

  return {
    planId: ws.plan,
    aktif,
    kedaluwarsa: !aktif,
    sampai,
    sisaHari,
    turunKe: ws.paketBerikutnya,
    segeraHabis: aktif && sisaHari <= HARI_INGATKAN_SEBELUM_HABIS,
  };
}

/**
 * Kapan periode baru berakhir.
 *
 * Perpanjangan paket YANG SAMA menambah dari tanggal habis yang lama, jadi
 * tidak ada hari yang hilang gara-gara orangnya membayar lebih awal. Ganti
 * paket memulai periode dari hari ini, dan itu memang merugikan sisa hari
 * paket lama — karena itu kerugiannya WAJIB diberitahukan sebelum tombolnya
 * ditekan, lihat `kalimatGantiPaket`.
 */
export function akhirPeriodeBaru(
  langgananSampai: Date | null,
  perpanjang: boolean,
  sekarang: Date = new Date(),
): Date {
  const mulai =
    perpanjang && langgananSampai && langgananSampai.getTime() > sekarang.getTime()
      ? langgananSampai
      : sekarang;

  return majuSatuBulan(mulai, mulai.getDate());
}

/**
 * Kalimat peringatan untuk pindah paket sementara langganan masih jalan.
 *
 * Terpisah dari `kalimatAkibat` di plans.ts karena yang ini soal UANG dan
 * TANGGAL, bukan soal fitur. Dua-duanya dipajang di tombol yang sama.
 */
export function kalimatGantiPaket(
  status: StatusLangganan,
  keId: string,
): string[] {
  if (!status.aktif || !status.sampai) return [];

  const keBerbayar = getPlan(keId).pricePerMonth > 0;
  const tanggal = status.sampai.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  // Turun ke gratis, atau ke paket berbayar yang lebih murah: tidak ada yang
  // hilang sekarang, jadi yang perlu dijelaskan justru kapan berlakunya.
  if (!keBerbayar || getPlan(keId).pricePerMonth < getPlan(status.planId).pricePerMonth) {
    return [
      `Paket ${getPlan(status.planId).name} kamu sudah dibayar sampai ${tanggal}, jadi dia tetap jalan sampai tanggal itu.`,
      `Paket ${getPlan(keId).name} baru berlaku ${tanggal}. Sampai hari itu tidak ada yang berubah, dan kamu bisa membatalkannya kapan saja.`,
    ];
  }

  // Naik paket: periodenya mulai dari nol hari ini, jadi sisa hari paket lama
  // memang hangus. Ini yang paling gampang bikin orang merasa ditipu kalau
  // tidak disebut, karena dia baru sadar setelah uangnya keluar.
  if (status.sisaHari && status.sisaHari > 1 && status.planId !== keId) {
    return [
      `Paket ${getPlan(status.planId).name} kamu masih ada ${status.sisaHari} hari lagi, dan sisa hari itu TIDAK dihitung ke paket baru.`,
      `Periode paket ${getPlan(keId).name} dimulai hari ini dan dibayar penuh sebulan.`,
    ];
  }

  return [];
}

export interface HasilAktifkan {
  planId: string;
  sampai: Date;
}

/**
 * Nyalakan langganan berbayar. Dipanggil HANYA sesudah uangnya benar-benar
 * masuk, atau sesudah satu bulan gratis benar-benar dipotong.
 *
 * Jatah balasan ditolkan di sini, dan ini SATU-SATUNYA tempat selain penolan
 * bulanan milik worker yang boleh melakukannya. Alasannya bukan kenyamanan:
 * orang yang baru membayar paket Growth berhak atas 15.000 balasan penuh mulai
 * hari itu, dan kalau hitungannya diteruskan dari paket gratis dia mulai
 * dengan 100 yang sudah terpakai. Yang paling merugikan justru yang naik paket
 * KARENA jatahnya habis: dia bayar, lalu asistennya tetap diam.
 *
 * `quotaResetAt` dipasang sama dengan tanggal habis langganan, jadi tanggal
 * tagihan dan tanggal jatah tidak bisa berpisah. Dua tanggal yang berbeda di
 * satu halaman selalu dibaca sebagai salah satunya bohong.
 */
export async function aktifkanLangganan(opts: {
  workspaceId: string;
  planId: string;
  perpanjang: boolean;
  sekarang?: Date;
}): Promise<HasilAktifkan> {
  const sekarang = opts.sekarang ?? new Date();

  const ws = await prisma.workspace.findUniqueOrThrow({
    where: { id: opts.workspaceId },
    select: { langgananSampai: true },
  });

  const sampai = akhirPeriodeBaru(ws.langgananSampai, opts.perpanjang, sekarang);

  await prisma.workspace.update({
    where: { id: opts.workspaceId },
    data: {
      plan: opts.planId,
      langgananSampai: sampai,
      // Pembayaran membatalkan penurunan yang terjadwal. Orang yang sudah
      // menekan "berhenti" lalu berubah pikiran dan membayar lagi tidak boleh
      // tetap diturunkan di akhir bulan.
      paketBerikutnya: null,
      langgananDiingatkanPada: null,
      aiCreditsUsed: 0,
      quotaResetAt: sampai,
      quotaWarnedAt: null,
      quotaExhaustedAt: null,
    },
  });

  // Pelanggan boleh dikabari lagi kalau kuotanya habis lagi nanti. Sama dengan
  // yang dikerjakan penolan bulanan di worker.
  await prisma.conversation.updateMany({
    where: { workspaceId: opts.workspaceId, quotaNoticeSentAt: { not: null } },
    data: { quotaNoticeSentAt: null },
  });

  return { planId: opts.planId, sampai };
}

/**
 * Pakai satu bulan gratis dari ajak teman.
 *
 * Pemotongannya dan pengecekannya jadi satu perintah, pola yang sama dengan
 * `pesanKredit`. Dua klik cepat di tombol yang sama akan sama-sama melihat
 * "bulanGratis: 1" kalau dipisah, lalu dua-duanya lolos dan orangnya dapat
 * dua bulan dari satu hadiah.
 *
 * @returns null kalau bulan gratisnya ternyata sudah habis.
 */
export async function pakaiBulanGratis(opts: {
  workspaceId: string;
  planId: string;
  perpanjang: boolean;
}): Promise<{ pembayaranId: string; sampai: Date } | null> {
  const terpotong = await prisma.workspace.updateMany({
    where: { id: opts.workspaceId, bulanGratis: { gt: 0 } },
    data: { bulanGratis: { decrement: 1 } },
  });
  if (terpotong.count !== 1) return null;

  const bayar = await prisma.pembayaran.create({
    data: {
      workspaceId: opts.workspaceId,
      planId: opts.planId,
      jumlah: 0,
      sumber: SUMBER_BULAN_GRATIS,
      status: BAYAR_LUNAS,
      perpanjang: opts.perpanjang,
      lunasPada: new Date(),
    },
  });

  const hasil = await aktifkanLangganan({
    workspaceId: opts.workspaceId,
    planId: opts.planId,
    perpanjang: opts.perpanjang,
  });

  return { pembayaranId: bayar.id, sampai: hasil.sampai };
}

/**
 * Turunkan satu workspace karena periodenya habis.
 *
 * TIDAK mematikan nomor WhatsApp yang lewat jatah — itu tugas pemanggilnya,
 * karena cuma worker yang memegang sambungannya. Fungsi ini cuma mengurus
 * angka di database, supaya bisa diuji tanpa WhatsApp sama sekali.
 */
export async function turunkanLangganan(workspaceId: string): Promise<{
  dari: string;
  ke: string;
} | null> {
  const ws = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { plan: true, paketBerikutnya: true, langgananSampai: true },
  });
  if (!ws) return null;

  const ke = ws.paketBerikutnya ?? "free";
  if (ke === ws.plan) {
    // Tidak ada yang berubah, tapi tanggalnya tetap harus dibersihkan supaya
    // penjadwal tidak memeriksa baris ini lagi tiap setengah jam selamanya.
    await prisma.workspace.update({
      where: { id: workspaceId },
      data: { paketBerikutnya: null, langgananSampai: null },
    });
    return null;
  }

  await prisma.workspace.update({
    where: { id: workspaceId },
    data: {
      plan: ke,
      paketBerikutnya: null,
      // Paket berbayar yang baru dijadwalkan tanpa dibayar tidak boleh ikut
      // membawa tanggal habis yang lama. Yang berhak mengisi tanggal ini cuma
      // pembayaran yang lunas.
      langgananSampai: null,
      langgananDiingatkanPada: null,
    },
  });

  return { dari: ws.plan, ke };
}

/** Workspace yang periodenya sudah lewat dan masih memakai paket berbayar. */
export async function langgananKedaluwarsa(sekarang: Date = new Date()) {
  return prisma.workspace.findMany({
    where: {
      langgananSampai: { not: null, lte: sekarang },
      NOT: { plan: "free" },
    },
    select: { id: true, name: true, plan: true, paketBerikutnya: true },
  });
}

/**
 * Workspace yang perlu diingatkan bahwa langganannya mau habis.
 *
 * Yang sudah menjadwalkan turun sendiri TIDAK diingatkan. Dia sudah tahu, dan
 * mengingatkannya terbaca seperti membujuk orang yang sudah memutuskan.
 */
export async function langgananSegeraHabis(sekarang: Date = new Date()) {
  const batas = new Date(
    sekarang.getTime() + HARI_INGATKAN_SEBELUM_HABIS * 24 * 60 * 60 * 1000,
  );

  return prisma.workspace.findMany({
    where: {
      langgananSampai: { gt: sekarang, lte: batas },
      paketBerikutnya: null,
      langgananDiingatkanPada: null,
      NOT: { plan: "free" },
    },
    select: { id: true, name: true, plan: true, langgananSampai: true },
  });
}

/** Upaya bayar yang masih menggantung dan tautannya kemungkinan masih hidup. */
export function upayaMasihHidup(
  bayar: { status: string; createdAt: Date; urlBayar: string | null },
  sekarang: Date = new Date(),
): boolean {
  if (bayar.status !== BAYAR_MENUNGGU) return false;
  if (!bayar.urlBayar) return false;
  return sisaJamUpaya(bayar, sekarang) > 0;
}

/** Berapa jam lagi tautan bayarnya berlaku. Nol atau kurang berarti mati. */
export function sisaJamUpaya(
  bayar: { createdAt: Date },
  sekarang: Date = new Date(),
): number {
  const umurJam = (sekarang.getTime() - bayar.createdAt.getTime()) / 3_600_000;
  return JAM_UPAYA_BAYAR_KEDALUWARSA - umurJam;
}

/**
 * Tandai gagal semua upaya bayar yang tenggatnya sudah lewat.
 *
 * KENAPA INI PERLU, padahal Midtrans mengirim notifikasi `expire` yang sudah
 * ditangani webhook: karena notifikasi itu bisa TIDAK PERNAH DATANG, dan itu
 * bukan kasus langka.
 *
 * Tiga cara notifikasi hilang, dua di antaranya sudah terjadi:
 *
 * 1. Payment Notification URL di dashboard Midtrans belum diisi. Panduan
 *    pemasangan sendiri menyebut ini sebagai langkah yang paling gampang
 *    terlewat.
 * 2. Dijalankan di laptop. Midtrans tidak bisa memanggil `localhost:3000`, jadi
 *    di komputer pengembang notifikasi TIDAK PERNAH ada. Terjadi 8 Agustus 2026:
 *    satu tagihan menggantung 7,7 jam dengan status "menunggu" dan
 *    `midtransId` kosong.
 * 3. Server sedang mati waktu notifikasinya dikirim.
 *
 * Tanpa penyapu ini, baris "menunggu" itu menggantung SELAMANYA, dan halaman
 * tagihan terus menawarkan tombol "Lanjutkan pembayaran" ke halaman yang sudah
 * mati. Jangan pernah mengandalkan pihak lain memberi tahu kita soal tenggat
 * yang kita sendiri yang tentukan.
 *
 * Aman dipanggil berkali-kali, dan sengaja TIDAK menyentuh yang sudah lunas.
 */
export async function sapuUpayaKedaluwarsa(sekarang: Date = new Date()) {
  const batas = new Date(
    sekarang.getTime() - JAM_UPAYA_BAYAR_KEDALUWARSA * 3_600_000,
  );

  const hasil = await prisma.pembayaran.updateMany({
    where: { status: BAYAR_MENUNGGU, createdAt: { lt: batas } },
    data: {
      status: BAYAR_GAGAL,
      catatan: `Tenggat ${JAM_UPAYA_BAYAR_KEDALUWARSA} jam lewat tanpa notifikasi dari Midtrans.`,
    },
  });

  return hasil.count;
}
