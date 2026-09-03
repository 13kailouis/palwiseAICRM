import { createHash } from "node:crypto";
import { prisma } from "./index.js";

/**
 * Rem pendaftaran per alamat IP.
 *
 * Tempatnya di paket db, sebelah remMasuk.ts, karena alasan yang sama: selftest
 * jalan dari paket worker dan tidak bisa mengimpor apa pun dari apps/web.
 * Aturan pengaman yang cuma hidup di sana berarti aturan yang tidak pernah
 * diuji, dan aturan pengaman yang tidak diuji sama saja dengan tidak ada.
 *
 * KENAPA INI ADA. Konfirmasi email TIDAK menutup pembuatan akun massal, karena
 * alamat sekali pakai gratis dan instan. Yang benar-benar menahannya ongkos
 * mendapatkan alamat IP baru. Ini rem terakhir sesudah dua yang lain: balasan
 * WhatsApp direm kewajiban men-scan QR dengan nomor sungguhan, dan jatah ruang
 * coba direm bentuknya (sekali seumur akun sebelum email dikonfirmasi).
 *
 * ANGKANYA SENGAJA LONGGAR, DAN ITU BUKAN KELALAIAN. Operator seluler di
 * Indonesia memakai CGNAT: ratusan pelanggan Telkomsel atau XL bisa keluar dari
 * satu alamat IP yang sama. Rem yang ketat di sini berarti pemilik warung yang
 * mendaftar dari HP-nya ditolak gara-gara orang lain yang tidak dia kenal
 * mendaftar lebih dulu dari operator yang sama. Yang perlu dihentikan skrip
 * yang membuat ratusan akun, dan skrip seperti itu menabrak angka berapa pun.
 * Kalau nanti Palwise ramai, angka ini yang pertama harus dinaikkan.
 */

/** Pendaftaran baru yang boleh berhasil dari satu IP dalam sejam. */
export const MAKS_DAFTAR_PER_JAM = 5;

/** Dan dalam sehari, supaya lima-per-jam tidak jadi 120 per hari. */
export const MAKS_DAFTAR_PER_HARI = 20;

const SEJAM = 60 * 60 * 1000;
const SEHARI = 24 * SEJAM;

/**
 * Ambil alamat IP pengunjung dari header X-Forwarded-For.
 *
 * YANG DIAMBIL YANG PALING BELAKANG, dan itu menentukan. Caddy MENAMBAHKAN
 * alamat lawan bicaranya ke ujung daftar yang sudah ada, jadi kalau pengunjung
 * mengirim header X-Forwarded-For karangannya sendiri, isinya jadi
 * "karangan-1, karangan-2, alamat-asli". Yang mengambil entri pertama berarti
 * membaca angka yang dikirim orang yang mau ditahan, dan remnya bisa dilewati
 * cukup dengan mengganti satu header tiap pendaftaran.
 *
 * Mengembalikan null kalau tidak ada headernya. Waktu itu terjadi, remnya
 * MEMBUKA, bukan menutup: aplikasi ini selalu jalan di belakang Caddy, jadi
 * header yang hilang berarti ada yang salah di pemasangannya, dan menolak
 * semua pendaftaran karena salah pasang jauh lebih merusak daripada melewatkan
 * satu pendaftar.
 */
export function ipDariHeader(xff: string | null | undefined): string | null {
  if (!xff) return null;
  const bagian = xff
    .split(",")
    .map((b) => b.trim())
    .filter(Boolean);
  return bagian.length > 0 ? bagian[bagian.length - 1] : null;
}

/**
 * Sidik jari alamat IP.
 *
 * Diberi lada rahasia server karena sha256 polos atas IPv4 cuma empat miliar
 * kemungkinan: siapa pun yang mendapat isi tabelnya bisa membalik semuanya
 * dalam hitungan menit. Dengan lada, isi tabel itu tidak berarti apa-apa di
 * luar server ini.
 */
export function sidikIp(ip: string, lada: string): string {
  return createHash("sha256").update(`${lada}:${ip}`).digest("hex");
}

/** Aturan murninya, dipisah supaya bisa diuji tanpa database. */
export function lewatBatas(perJam: number, perHari: number): boolean {
  return perJam >= MAKS_DAFTAR_PER_JAM || perHari >= MAKS_DAFTAR_PER_HARI;
}

export interface HasilRemDaftar {
  boleh: boolean;
  alasan?: string;
}

/**
 * Boleh mendaftar dari alamat ini sekarang?
 *
 * `ip` boleh null (header hilang), dan waktu itu terjadi jawabannya selalu
 * boleh. Lihat catatan di [ipDariHeader].
 */
export async function bolehDaftarDariIp(
  ip: string | null,
  lada: string,
): Promise<HasilRemDaftar> {
  if (!ip) return { boleh: true };

  const sidik = sidikIp(ip, lada);
  const sekarang = Date.now();

  const [perJam, perHari] = await Promise.all([
    prisma.remPendaftaran.count({
      where: { sidik, createdAt: { gte: new Date(sekarang - SEJAM) } },
    }),
    prisma.remPendaftaran.count({
      where: { sidik, createdAt: { gte: new Date(sekarang - SEHARI) } },
    }),
  ]);

  if (!lewatBatas(perJam, perHari)) return { boleh: true };

  // Kalimatnya tidak menuduh dan memberi jalan keluar. Yang paling mungkin
  // membacanya bukan pembuat akun massal (dia tidak membaca apa pun), tapi
  // orang sungguhan yang kebetulan satu alamat IP dengan orang lain lewat
  // CGNAT operatornya. Menuduh dia robot berarti kehilangan dia selamanya.
  return {
    boleh: false,
    alasan:
      "Pendaftaran dari jaringan ini lagi banyak, jadi kami rem sebentar. " +
      "Coba lagi sejam lagi, atau pakai jaringan lain. Kalau kamu memang mau " +
      "daftar sekarang, email kami dan akunmu kami buatkan.",
  };
}

/**
 * Catat satu pendaftaran yang BERHASIL.
 *
 * Sengaja bukan tiap percobaan. Kalau tiap percobaan dihitung, orang yang salah
 * ketik email lalu mengulang tiga kali menghabiskan jatahnya sendiri, dan yang
 * ditahan justru satu-satunya orang yang benar-benar mau mendaftar.
 *
 * Sekalian membuang baris yang sudah lewat jendela terpanjang, supaya tabel ini
 * tidak pernah tumbuh jadi catatan riwayat siapa mendaftar dari mana. Dibuang
 * di sini, bukan lewat penjadwal, karena penjadwal yang mati diam-diam
 * meninggalkan data pribadi yang tidak seharusnya ada.
 */
export async function catatPendaftaran(
  ip: string | null,
  lada: string,
): Promise<void> {
  if (!ip) return;
  await prisma.remPendaftaran.create({ data: { sidik: sidikIp(ip, lada) } });
  await prisma.remPendaftaran.deleteMany({
    where: { createdAt: { lt: new Date(Date.now() - SEHARI) } },
  });
}
