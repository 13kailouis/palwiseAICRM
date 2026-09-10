import type { HasilBacaTanya } from "@palwise/db";

export const TAHAP_TANYA = ["baru", "tertarik", "negosiasi", "closing", "selesai", "batal"] as const;

export interface GiliranTanya {
  peran: string;
  teks: string;
  hasilBaca?: HasilBacaTanya[];
  usul?: Record<string, unknown> | null;
  usulStatus?: string | null;
}

/** Advice is a new task, even when an older turn contains a customer draft. */
export function permintaanAnalisis(pesan: string): boolean {
  pesan = pesan.replace(/\b(?:jangan|tidak perlu|tanpa)\s+(?:buat|membuat|susun|menyusun|atau|kirim|mengirim|draf|draft|pesan|pelanggan|dulu|otomatis|\s)+[.!]?/gi, " ");
  if (/\b(?:draf|draft|kirim\w*|tulis\w*|buat\w* pesan|susun\w* pesan|balas\w*)\b/i.test(pesan)) return false;
  return /\b(?:strategi|strateginya|analisis|evaluasi|banding\w*|prioritas|peluang|rencana|rekomendasi|tingkat\w*|meningkat\w*|ningkat\w*|tambah\w* pelanggan|nambah\w* pelanggan|banyak pelanggan|kembangkan|mengembangkan|pertumbuhan|akuisisi|retensi)\b/i.test(pesan);
}

/** A claimed deliverable needs either its actual contents or a validated proposal. */
export function hasilDijanjikanTanpaIsi(teks: string): boolean {
  const pembuka = /\b(?:ini|berikut|inilah)\b.{0,70}\b(?:draf|draft|pesan|daftar|hasil)(?:nya)?\b|\b(?:draf|draft)(?:nya)?\s+(?:sudah|telah)\s+(?:siap|dibuat)/i;
  return pembuka.test(teks) && !/[\n:][\s\S]*\S[\s\S]{20}/.test(teks) && teks.length < 280;
}

/** A final response cannot promise read-only work that no background job will perform. */
export function janjiPemeriksaan(teks: string): boolean {
  if (/\b(mau|bolehkah|boleh|ingin) (aku|saya)|\b(kalau|jika)\b/i.test(teks) && /\?\s*$/.test(teks)) return false;
  return /\b(aku|saya|kami)\s+(?:(?:akan|mau|coba|sedang|lagi)\s+)?(?:cek|periksa|lihat|baca|cari|mengecek|memeriksa|melihat|membaca|mencari)\b/i.test(teks) ||
    /\b(?:sebentar|tunggu)\b.{0,40}\b(?:cek|periksa|lihat|cari|siapkan|susun)\b/i.test(teks) ||
    /\b(?:akan|sedang)\s+(?:saya|aku|kami)\s+(?:cek|periksa|lihat|baca|cari|siapkan|susun)\b|\b(?:saya|aku)\s+(?:akan\s+)?(?:siapkan|susun)\s+(?:dulu|draf|draft|pesan)/i.test(teks);
}

export function rentangHitunganLangsung(pesan: string): string | null {
  const isi = pesan.toLowerCase().trim().replace(/[?.!]+$/, "");
  const waktu = "(hari ini|kemarin|7 hari terakhir|30 hari terakhir)";
  const tanya = "(?:ada )?berapa (?:chat|pesan|pelanggan)(?: yang)?(?: masuk| chat)?(?: whatsapp| wa)?";
  const cocok = new RegExp(`^(?:${waktu} )?${tanya}(?: ${waktu})?$`).exec(isi);
  if (!cocok || (cocok[1] && cocok[2])) return null;
  return ({ "kemarin": "kemarin", "7 hari terakhir": "7-hari", "30 hari terakhir": "30-hari" } as Record<string, string>)[cocok[1] || cocok[2]] ?? "hari-ini";
}

/** Only unambiguous stage lookups take the direct read path. Other requests stay conversational. */
export function tahapYangDiminta(pesan: string, riwayat: GiliranTanya[] = []): string | null {
  let isi = pesan.toLowerCase().trim().replace(/[?.!]+$/, "");
  if (/^(mana|yang mana|mana daftarnya|tampilkan daftarnya|kok (tidak|nggak|gak) (ada|muncul)|daftarnya mana)$/.test(isi)) {
    const sebelumnya = [...riwayat].reverse().find(r => r.peran === "pemilik" &&
      !/^(mana|yang mana|mana daftarnya|tampilkan daftarnya|kok (tidak|nggak|gak) (ada|muncul)|daftarnya mana)[?.!]*$/i.test(r.teks.trim()));
    return sebelumnya ? tahapYangDiminta(sebelumnya.teks) : null;
  }
  if (!/\b(cek|cari|lihat|tampil\w*|daftar|siapa|berapa|ada)\b/.test(isi)) return null;
  if (!/\b(siapa|pelanggan|customer|kontak|prospek)\b/.test(isi) && !/\b(yg|yang)\s+(tertarik|berminat|negosiasi|closing)\b/.test(isi)) return null;
  if (/\b(kirim\w*|balas|hubungi|hapus|ubah|pindah\w*|buat\w*|susun|tulis|siapkan|pesankan)\b/.test(isi)) return null;
  // Do not silently discard an extra filter, comparison, exclusion, or requested explanation.
  if (/\b(hari|kemarin|minggu|bulan|tahun|tanggal|sejak|sebelum|setelah|kenapa|mengapa|alasan|banding\w*|selain|bukan|belum|tidak|nggak|gak|komplain|komplen|nunggu|menunggu|bernama|nama|nomor|dari)\b/.test(isi)) return null;
  const tahap = TAHAP_TANYA.filter(t => new RegExp(`\\b${t}\\b`).test(isi));
  if (tahap.length === 0 && /\bberminat\b/.test(isi)) return "tertarik";
  return tahap.length === 1 ? tahap[0] : null;
}

const JUDUL: Record<string, string> = {
  ringkasan_bisnis: "Kondisi bisnis", prioritas_bisnis: "Prioritas kerja", peluang_follow_up: "Peluang follow up",
  status_whatsapp: "Status WhatsApp", daftar_nomor: "Nomor WhatsApp",
  hitung_obrolan: "Ringkasan chat", daftar_pelanggan: "Daftar pelanggan",
  daftar_masalah: "Keluhan yang masih terbuka", daftar_nunggu: "Menunggu balasan tim",
  daftar_janji: "Janji temu", cari_kontak: "Hasil pencarian pelanggan",
  lihat_kontak: "Detail pelanggan", cari_info_bisnis: "Info bisnis yang ditemukan",
  daftar_gambar: "Gambar dan berkas", pemakaian: "Paket dan pemakaian",
  daftar_info: "Catatan info bisnis", lihat_info: "Isi catatan", lihat_asisten: "Asisten kamu",
  keadaan_pemasangan: "Progres pemasangan",
};

export function hasilUntukChat(alat: string, isi: string, argumen: Record<string, unknown>, gagal = false): HasilBacaTanya {
  const tahap = typeof argumen.tahap === "string" && TAHAP_TANYA.some(t => t === argumen.tahap) ? argumen.tahap : "";
  return {
    alat,
    judul: alat === "daftar_pelanggan" && tahap ? `Pelanggan ${tahap}` : JUDUL[alat] ?? "Hasil pemeriksaan",
    // Internal record IDs are for subsequent tool calls, not customer-facing copy.
    isi: isi.replace(/\s*\(id:\s*[^,\s)]+\)/g, "").replace(/\(id:\s*[^,\s)]+,\s*/g, "("),
    gagal,
  };
}

export function konteksGiliranTanya(r: GiliranTanya): string {
  const hasil = (r.hasilBaca ?? []).map(h => `${h.judul}${h.gagal ? " (gagal dibaca)" : ""}:\n${h.isi}`).join("\n\n");
  // Put the draft before potentially long tool transcripts so truncation keeps the edit target.
  const usul = r.usul ? `\n\nUsulan sebelumnya (${r.usulStatus ?? "status tidak diketahui"}; bukan izin mengirim):\n${JSON.stringify(r.usul).slice(0, 2200)}` : "";
  return r.teks + usul + (hasil ? `\n\nData yang ditampilkan saat itu (baca ulang untuk keadaan terbaru):\n${hasil.slice(0, 6000)}` : "");
}
