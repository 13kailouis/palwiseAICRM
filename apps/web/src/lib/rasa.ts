/**
 * Bagaimana bacaan rasa ditampilkan ke pemilik usaha.
 *
 * DUA ATURAN YANG MENAHAN FITUR INI SUPAYA TIDAK JADI HIASAN.
 *
 * 1. TIDAK SEMUA BACAAN DAPAT LENCANA. Yang berlencana cuma yang mengubah apa
 *    yang harus dia kerjakan sekarang: marah, kesal, mau beli, ragu, mau
 *    mundur. Hangat, dingin, dan netral tidak. Daftar yang tiap barisnya
 *    berlencana sama saja dengan daftar tanpa lencana — matanya berhenti
 *    membedakan setelah baris ketiga.
 *
 * 2. TIDAK ADA WARNA BARU. Kosakata warna aplikasi ini sudah ditetapkan di
 *    tailwind.config.ts: hitam putih untuk informasi, biru HANYA untuk yang
 *    bisa diklik, dan amber/merah untuk status yang perlu perhatian. Jadi
 *    "mau beli" tidak dapat warna hijau — dia dapat lencana hitam pekat, yang
 *    di sistem ini justru berarti "ini informasi penting".
 */

export type LabelRasa =
  | "marah"
  | "kesal"
  | "malu"
  | "mundur"
  | "ragu"
  | "panas"
  | "hangat"
  | "dingin"
  | "netral";

export interface TampilanRasa {
  teks: string;
  kelas: string;
}

const TAMPILAN: Partial<Record<LabelRasa, TampilanRasa>> = {
  marah: { teks: "marah", kelas: "bg-red-50 text-red-700" },
  kesal: { teks: "kesal", kelas: "bg-amber-50 text-amber-800" },
  panas: { teks: "mau beli", kelas: "bg-ink-900 text-white" },
  // Tulisannya "di luar budget", bukan "malu".
  //
  // Yang membaca lencana ini pemilik toko, dan sesekali layarnya kelihatan
  // orang lain. Menempelkan kata "malu" pada seorang pelanggan itu penilaian
  // tentang orangnya; "di luar budget" itu keterangan tentang keadaannya, dan
  // justru lebih berguna karena langsung memberi tahu apa yang bisa dilakukan.
  malu: { teks: "di luar budget", kelas: "bg-ink-100 text-ink-700" },
  ragu: { teks: "ragu", kelas: "bg-ink-100 text-ink-700" },
  mundur: { teks: "mau mundur", kelas: "bg-ink-100 text-ink-700" },
};

export function tampilanRasa(label: string | null | undefined): TampilanRasa | null {
  if (!label) return null;
  return TAMPILAN[label as LabelRasa] ?? null;
}
