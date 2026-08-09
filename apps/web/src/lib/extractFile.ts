import "server-only";

/**
 * Ambil tulisan dari berkas yang diunggah pengguna.
 *
 * PDF dan Word dibaca isinya, bukan sekadar ditolak. Hasilnya berupa
 * bagian-bagian terpisah supaya perapiannya bisa dilakukan bertahap dan tidak
 * kena batas panjang jawaban.
 */

// Angkanya tinggal di lib/batas.ts supaya formulir di browser ikut memakainya
// dan tidak ada dua angka yang bisa berbeda diam-diam.
import { MAKS_BACA_BYTE } from "./batas";
export const MAX_FILE_BYTES = MAKS_BACA_BYTE;

export interface ExtractedSection {
  title: string;
  text: string;
}

export interface ExtractResult {
  sections: ExtractedSection[];
  totalChars: number;
  /** Keterangan singkat untuk ditampilkan ke pengguna. */
  note: string;
}

export type ProgressFn = (event: {
  type: "step" | "page";
  text: string;
  chars?: number;
  ok?: boolean;
  note?: string;
}) => void;

function bersihkan(s: string): string {
  return s
    .replace(/\r\n/g, "\n")
    .replace(/[ \t ]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function jenisBerkas(namaFile: string): string {
  const m = /\.([a-z0-9]+)$/i.exec(namaFile.trim());
  return m ? m[1].toLowerCase() : "";
}

export const JENIS_DIDUKUNG = ["pdf", "docx", "txt", "md", "csv", "json"];

/**
 * Gabungkan halaman PDF jadi beberapa bagian yang ukurannya masuk akal.
 * Satu halaman PDF sering cuma beberapa baris, jadi kalau tiap halaman jadi
 * satu bagian, jumlah panggilan ke AI meledak tanpa guna.
 */
function kelompokkanHalaman(halaman: string[], maxPerBagian = 9000): ExtractedSection[] {
  const bagian: ExtractedSection[] = [];
  let buffer = "";
  let mulai = 1;

  halaman.forEach((isi, i) => {
    const teks = bersihkan(isi);
    if (!teks) return;

    if (buffer && buffer.length + teks.length > maxPerBagian) {
      bagian.push({
        title: mulai === i ? `Halaman ${mulai}` : `Halaman ${mulai} sampai ${i}`,
        text: buffer,
      });
      buffer = "";
      mulai = i + 1;
    }
    buffer += (buffer ? "\n\n" : "") + teks;
  });

  if (buffer.trim()) {
    bagian.push({
      title:
        mulai === halaman.length
          ? `Halaman ${mulai}`
          : `Halaman ${mulai} sampai ${halaman.length}`,
      text: buffer,
    });
  }

  return bagian;
}

/** Pecah teks panjang tanpa halaman jadi beberapa bagian di batas paragraf. */
function pecahTeks(teks: string, maxPerBagian = 9000): ExtractedSection[] {
  const bersih = bersihkan(teks);
  if (bersih.length <= maxPerBagian) {
    return [{ title: "", text: bersih }];
  }

  const paragraf = bersih.split(/\n\s*\n/);
  const bagian: ExtractedSection[] = [];
  let buffer = "";
  let nomor = 1;

  for (const p of paragraf) {
    if (buffer && buffer.length + p.length > maxPerBagian) {
      bagian.push({ title: `Bagian ${nomor++}`, text: buffer });
      buffer = "";
    }
    buffer += (buffer ? "\n\n" : "") + p;
  }
  if (buffer.trim()) bagian.push({ title: `Bagian ${nomor}`, text: buffer });

  return bagian;
}

export async function extractFile(
  file: File,
  onProgress: ProgressFn,
): Promise<ExtractResult> {
  const jenis = jenisBerkas(file.name);

  if (!JENIS_DIDUKUNG.includes(jenis)) {
    throw new Error(
      `File ${jenis ? "." + jenis : "ini"} belum bisa dibaca. Yang didukung: ${JENIS_DIDUKUNG.map((j) => "." + j).join(", ")}.`,
    );
  }
  if (file.size > MAX_FILE_BYTES) {
    throw new Error(
      `Ukuran file ${(file.size / 1024 / 1024).toFixed(1)} MB, batasnya ${MAX_FILE_BYTES / 1024 / 1024} MB.`,
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  if (jenis === "pdf") {
    onProgress({ type: "step", text: `Membuka ${file.name}` });

    const { extractText, getDocumentProxy } = await import("unpdf");
    const pdf = await getDocumentProxy(new Uint8Array(buffer));
    const { totalPages, text } = await extractText(pdf, { mergePages: false });

    const halaman = (Array.isArray(text) ? text : [String(text)]).map(String);
    const berisi = halaman.filter((h) => bersihkan(h).length > 20).length;

    onProgress({
      type: "step",
      text: `PDF berisi ${totalPages} halaman, ${berisi} ada tulisannya`,
    });

    const sections = kelompokkanHalaman(halaman);
    const totalChars = sections.reduce((n, s) => n + s.text.length, 0);

    if (totalChars < 100) {
      throw new Error(
        "PDF ini tidak punya tulisan yang bisa dibaca. Kemungkinan isinya hasil scan atau foto. " +
          "Coba buka PDF-nya, salin tulisannya, lalu tempel di tab Ketik sendiri.",
      );
    }

    for (const s of sections) {
      onProgress({ type: "page", text: s.title, chars: s.text.length, ok: true });
    }

    return {
      sections,
      totalChars,
      note: `${totalPages} halaman PDF`,
    };
  }

  if (jenis === "docx") {
    onProgress({ type: "step", text: `Membuka ${file.name}` });

    const mammoth = await import("mammoth");
    const hasil = await mammoth.extractRawText({ buffer });
    const teks = bersihkan(hasil.value ?? "");

    if (teks.length < 100) {
      throw new Error("Dokumen Word ini hampir tidak ada tulisannya.");
    }

    const sections = pecahTeks(teks);
    for (const s of sections) {
      onProgress({
        type: "page",
        text: s.title || "Isi dokumen",
        chars: s.text.length,
        ok: true,
      });
    }

    return {
      sections,
      totalChars: teks.length,
      note: "dokumen Word",
    };
  }

  // txt, md, csv, json
  onProgress({ type: "step", text: `Membaca ${file.name}` });
  const teks = bersihkan(buffer.toString("utf8"));

  if (teks.length < 20) throw new Error("Isi filenya terlalu sedikit.");

  const sections = pecahTeks(teks);
  for (const s of sections) {
    onProgress({
      type: "page",
      text: s.title || "Isi file",
      chars: s.text.length,
      ok: true,
    });
  }

  return { sections, totalChars: teks.length, note: `file .${jenis}` };
}
