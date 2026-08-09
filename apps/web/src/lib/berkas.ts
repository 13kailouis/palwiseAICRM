import "server-only";
import fs from "node:fs";
import path from "node:path";

/**
 * Folder tempat lampiran disimpan.
 *
 * Harus persis sama dengan yang dipakai worker, karena web yang menulis
 * berkasnya dan worker yang mengirimnya ke WhatsApp. Dihitung dengan cara yang
 * sama: relatif terhadap akar proyek, bukan terhadap folder kerja.
 */
function cariAkarProyek(mulai: string): string {
  let dir = mulai;
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
    const naik = path.dirname(dir);
    if (naik === dir) break;
    dir = naik;
  }
  return mulai;
}

const AKAR = cariAkarProyek(process.cwd());

export const MEDIA_DIR = (() => {
  const dari = process.env.MEDIA_DIR ?? "./data/media";
  const p = path.isAbsolute(dari) ? dari : path.resolve(AKAR, dari);
  fs.mkdirSync(p, { recursive: true });
  return p;
})();

// Batas dan pengenalan jenis pindah ke lib/batas.ts supaya formulir di browser
// ikut memakainya. Diteruskan dari sini supaya pemanggil lama tidak perlu tahu.
export { JENIS_BERKAS, MAKS_BYTE, kenaliJenis, periksaBerkas } from "./batas";

/** Ubah judul jadi kode pendek yang dipakai AI untuk memilih berkas. */
export function buatKode(nama: string): string {
  const dasar =
    nama
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "berkas";
  return dasar;
}

export function simpanBerkas(isi: Buffer, ext: string): string {
  const nama = `${crypto.randomUUID()}.${ext}`;
  fs.writeFileSync(path.join(MEDIA_DIR, nama), isi);
  return nama;
}

export function hapusBerkas(namaFile: string) {
  try {
    fs.rmSync(path.join(MEDIA_DIR, path.basename(namaFile)), { force: true });
  } catch {
    // tidak fatal, catatannya tetap dihapus
  }
}
