import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { log } from "./lib/log.js";

/**
 * Nilai bawaan token internal, sengaja ditulis sekali di satu tempat.
 *
 * Dibandingkan ulang di [periksaTokenInternal] untuk menolak jalan di server.
 * Kalau nilainya ditulis dua kali, suatu hari yang satu diganti dan yang lain
 * tidak, lalu pemeriksaannya lolos padahal tokennya masih bawaan.
 */
const TOKEN_BAWAAN = "palwise-dev-token";

/** Cari root repo dengan menelusuri ke atas sampai ketemu package.json workspace. */
function findRoot(start: string): string {
  let dir = start;
  for (let i = 0; i < 8; i++) {
    const pkg = path.join(dir, "package.json");
    if (fs.existsSync(pkg)) {
      try {
        const json = JSON.parse(fs.readFileSync(pkg, "utf8"));
        if (json.workspaces) return dir;
      } catch {
        // lanjut naik
      }
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return start;
}

const here = path.dirname(fileURLToPath(import.meta.url));
export const ROOT_DIR = findRoot(here);

// .env di root repo dipakai bersama oleh worker dan web.
dotenv.config({ path: path.join(ROOT_DIR, ".env") });

function abs(p: string): string {
  return path.isAbsolute(p) ? p : path.resolve(ROOT_DIR, p);
}

function ensureDir(p: string): string {
  fs.mkdirSync(p, { recursive: true });
  return p;
}

const provider = (process.env.AI_PROVIDER ?? "gemini").toLowerCase();

export const env = {
  ROOT_DIR,

  AI_PROVIDER: (["gemini", "openai", "anthropic"].includes(provider)
    ? provider
    : "gemini") as "gemini" | "openai" | "anthropic",

  GEMINI_API_KEY: process.env.GEMINI_API_KEY?.trim() ?? "",
  // Google menutup model lama untuk key baru, bukan cuma menghapusnya. Jadi
  // nama yang dulu jalan bisa menolak key yang baru dibuat. Cek dengan
  // "npm run models" kalau asisten tiba-tiba berhenti menjawab.
  //
  // Bawaannya kelas LITE, dan itu keputusan harga bukan kualitas. Diukur dari
  // halaman harga resmi Google 8 Agustus 2026: gemini-3.5-flash menagih $9,00
  // per 1 juta token KELUARAN, yang jatuhnya Rp 153 per balasan, sementara
  // paket Growth dijual Rp 33 per balasan. Artinya bawaan yang lama membuat
  // setiap balasan rugi. Flash-Lite $0,25 masuk / $1,50 keluar, jadi Rp 26.
  //
  // Nilai bawaan di sini penting karena dia yang berlaku kalau .env lupa diisi,
  // dan bawaan yang rugi itu bentuk kegagalan yang tidak pernah memunculkan
  // galat apa pun. Jangan naikkan kelasnya tanpa menghitung ulang harga paket.
  GEMINI_MODEL: process.env.GEMINI_MODEL?.trim() || "gemini-3.1-flash-lite",

  // Model unggulan Google kadang penuh dan menjawab 503 berjam-jam. Kalau itu
  // terjadi, pemanggilan dialihkan ke sini supaya pelanggan tetap dibalas.
  // Kosongkan kalau kamu lebih suka gagal daripada dijawab model lebih kecil.
  //
  // WAJIB berbeda dari GEMINI_MODEL. Kalau sama, cadangannya tidak menolong
  // justru di satu-satunya keadaan dia dibutuhkan.
  GEMINI_FALLBACK_MODEL:
    process.env.GEMINI_FALLBACK_MODEL?.trim() ?? "gemini-3.5-flash-lite",
  // Catatan: Google menghentikan text-embedding-004. Kalau suatu saat nama ini
  // ikut hilang, cek daftar model yang masih hidup lewat:
  //   npm run models
  GEMINI_EMBED_MODEL:
    process.env.GEMINI_EMBED_MODEL?.trim() || "gemini-embedding-001",

  // Bawaannya "off" berdasarkan perbandingan langsung: untuk menjawab dari
  // knowledge base, mematikannya menghasilkan jawaban yang sama persis
  // (termasuk soal berhitung total belanja) tapi hemat sekitar 480 token
  // keluaran per balasan, dan token berpikir itu ditagih paling mahal.
  // Setel "on" kalau kasusmu butuh penalaran bertingkat.
  GEMINI_THINKING: (process.env.GEMINI_THINKING?.trim().toLowerCase() === "on"
    ? "on"
    : "off") as "on" | "off",

  OPENAI_API_KEY: process.env.OPENAI_API_KEY?.trim() ?? "",
  OPENAI_MODEL: process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini",

  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY?.trim() ?? "",
  ANTHROPIC_MODEL:
    process.env.ANTHROPIC_MODEL?.trim() || "claude-haiku-4-5-20251001",

  PORT: Number(process.env.WORKER_PORT ?? 4000),

  /**
   * Antarmuka yang didengarkan worker. Bawaannya HANYA jaringan lokal.
   *
   * Dulu tidak disetel sama sekali, dan Express tanpa alamat mendengarkan
   * 0.0.0.0, artinya porta 4000 terbuka ke internet begitu dipasang di VPS.
   * Yang ada di baliknya bukan hal kecil: mengirim pesan WhatsApp atas nama
   * pemilik toko, membaca lampiran pelanggannya, dan menghapus info bisnisnya.
   *
   * Satu-satunya yang perlu menjangkaunya adalah dashboard, dan dashboard
   * jalan di mesin yang sama. Kalau suatu hari benar-benar dipisah mesin, isi
   * WORKER_HOST, tapi jangan lupa pasang firewall sekalian.
   */
  HOST: process.env.WORKER_HOST?.trim() || "127.0.0.1",

  INTERNAL_TOKEN: process.env.INTERNAL_TOKEN?.trim() || TOKEN_BAWAAN,

  WA_SESSION_DIR: ensureDir(abs(process.env.WA_SESSION_DIR ?? "./data/wa-sessions")),
  MEDIA_DIR: ensureDir(abs(process.env.MEDIA_DIR ?? "./data/media")),

  TIMEZONE: process.env.TIMEZONE?.trim() || "Asia/Jakarta",
};

/**
 * Berhenti kalau dipasang di server tapi tokennya masih bawaan.
 *
 * Token internal itu satu-satunya yang memisahkan worker dari siapa pun yang
 * bisa menjangkau portanya. Nilai bawaannya tertulis di dalam kode ini, jadi
 * kalau lupa diganti waktu deploy, dia bukan kunci sama sekali.
 *
 * Sengaja MEMBUNUH prosesnya, bukan sekadar memperingatkan. Peringatan di
 * catatan proses tidak pernah dibaca siapa pun setelah hari pertama, dan
 * kegagalan yang berisik waktu deploy jauh lebih murah daripada kebocoran yang
 * ketahuan berbulan-bulan kemudian.
 */
export function periksaTokenInternal(): void {
  if (process.env.NODE_ENV !== "production") {
    if (env.INTERNAL_TOKEN === TOKEN_BAWAAN) {
      log.warn(
        "INTERNAL_TOKEN masih bawaan. Aman untuk di laptop, tapi WAJIB diganti sebelum dipasang di server.",
      );
    }
    return;
  }

  if (env.INTERNAL_TOKEN === TOKEN_BAWAAN) {
    throw new Error(
      "INTERNAL_TOKEN masih memakai nilai bawaan yang tertulis di dalam kode. " +
        "Isi INTERNAL_TOKEN di .env dengan tebakan acak yang panjang, samakan " +
        "dengan yang dipakai dashboard, lalu jalankan lagi.",
    );
  }
}

export function aiConfigured(): boolean {
  if (env.AI_PROVIDER === "openai") return !!env.OPENAI_API_KEY;
  if (env.AI_PROVIDER === "anthropic") return !!env.ANTHROPIC_API_KEY;
  return !!env.GEMINI_API_KEY;
}
