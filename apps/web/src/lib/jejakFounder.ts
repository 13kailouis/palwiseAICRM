import "server-only";
import fs from "node:fs";
import path from "node:path";
import { AKAR_PROYEK } from "./berkas";

/**
 * Catatan tiap kali orang Palwise membuka obrolan pelanggan.
 *
 * ── KENAPA INI ADA, DAN KENAPA DIA WAJIB ────────────────────────────────────
 *
 * Halaman privasi Palwise berjanji dengan kalimat yang bisa dibaca siapa saja:
 * isi chat cuma dibuka orang yang perlu, untuk menjalankan layanan, membantu,
 * dan memperbaiki produk, dan "tiap bukaan tercatat".
 *
 * Berkas inilah yang membuat kalimat terakhir itu benar. Tanpa dia, janjinya
 * jadi hiasan, dan janji privasi yang tidak ditegakkan lebih berbahaya daripada
 * tidak berjanji sama sekali: dia dipakai orang untuk memutuskan menyambungkan
 * nomor usahanya, jadi dia bukan sekadar kalimat, dia dasar keputusan.
 *
 * Kalau suatu hari ada yang bertanya "siapa yang pernah membuka chat saya",
 * jawabannya harus ada, dan harus ada tanpa perlu menebak.
 *
 * ── KENAPA BERKAS, BUKAN TABEL DATABASE ─────────────────────────────────────
 *
 * Karena catatan pemeriksaan tidak boleh ikut terhapus bersama yang diperiksa.
 * `Workspace` dihapus berantai (`onDelete: Cascade`) ke hampir semua tabel, dan
 * catatan bukaan yang ikut lenyap tepat waktu akunnya dihapus adalah catatan
 * yang paling wajib ada. Pola yang sama dengan tabel `Masukan`, cuma di sini
 * dibuat lebih jauh lagi: keluar dari database sekalian.
 *
 * Bentuknya JSONL, satu baris satu bukaan, ditambahkan di ujung. Tidak ada
 * jalan di aplikasi untuk mengubah atau menghapusnya.
 *
 * YANG DICATAT CUMA PENUNJUKNYA, BUKAN ISINYA. Tidak ada satu kalimat pun dari
 * obrolan yang disalin ke sini. Kalau isinya ikut, berkas ini sendiri jadi
 * salinan kedua data pelanggan yang tidak pernah ikut dihapus waktu orangnya
 * minta datanya dihapus, dan itu justru melanggar hal yang mau dijaga.
 */

const JEJAK_DIR = (() => {
  const dari = process.env.LOG_DIR ?? "./data/log";
  const p = path.isAbsolute(dari) ? dari : path.resolve(AKAR_PROYEK, dari);
  fs.mkdirSync(p, { recursive: true });
  return p;
})();

export const BERKAS_JEJAK = path.join(JEJAK_DIR, "buka-chat.jsonl");

export interface JejakBuka {
  /** Kapan dibuka. */
  waktu: string;
  /** Siapa yang membuka. Email orang Palwise, bukan pemilik akunnya. */
  oleh: string;
  /** Akun siapa yang dibuka. */
  workspaceId: string;
  namaUsaha: string;
  /** Obrolan yang mana. Penunjuk, bukan isi. */
  conversationId: string;
}

/**
 * Catat satu bukaan.
 *
 * Sengaja TIDAK melempar galat kalau penulisannya gagal. Alasannya bukan malas:
 * kalau disk penuh atau izin folder salah, yang benar bukan membuat halaman
 * founder mati total, karena itu justru membuat orang mematikan pencatatannya
 * supaya halamannya jalan lagi. Kegagalannya dicatat ke konsol server, yang
 * masuk ke journald lewat PM2.
 */
export function catatBukaChat(jejak: Omit<JejakBuka, "waktu">): void {
  const baris: JejakBuka = { waktu: new Date().toISOString(), ...jejak };
  try {
    fs.appendFileSync(BERKAS_JEJAK, `${JSON.stringify(baris)}\n`, "utf8");
  } catch (e) {
    console.error("[jejak] gagal mencatat bukaan chat:", e);
  }
}

/**
 * Baca bukaan terakhir, terbaru dulu. Dipakai halaman founder untuk memajang
 * catatannya sendiri.
 *
 * Yang membuka harus bisa melihat catatannya sendiri. Catatan pemeriksaan yang
 * cuma bisa dibaca lewat SSH itu, dalam praktiknya, catatan yang tidak pernah
 * dibaca siapa pun.
 */
export function bacaJejakBuka(batas = 50): JejakBuka[] {
  try {
    if (!fs.existsSync(BERKAS_JEJAK)) return [];
    const isi = fs.readFileSync(BERKAS_JEJAK, "utf8").trim();
    if (!isi) return [];
    const baris = isi.split("\n");
    const ambil = baris.slice(Math.max(0, baris.length - batas));
    const hasil: JejakBuka[] = [];
    for (const b of ambil) {
      try {
        hasil.push(JSON.parse(b) as JejakBuka);
      } catch {
        // Satu baris rusak tidak boleh membuang seluruh catatan.
      }
    }
    return hasil.reverse();
  } catch {
    return [];
  }
}
