/**
 * Jadikan berkas bisnis di folder ini satu PDF yang rapi.
 *
 * Jalankan: npm run bisnis:pdf
 *
 * Kenapa skrip, bukan sekali ubah lalu simpan PDF-nya:
 * berkas-berkas ini BERUBAH. Harga berubah, peta jalan bergeser, angka yang
 * tadinya BELUM DIUKUR akhirnya terukur. PDF hasil ubah manual langsung basi
 * begitu sumbernya disunting, dan yang paling berbahaya bukan PDF-nya basi
 * tapi PDF basi itu keburu dikirim ke orang lain. Dengan skrip, memperbaruinya
 * satu perintah, jadi tidak ada alasan untuk mengirim yang lama.
 *
 * Cara kerjanya: markdown diubah jadi satu halaman HTML, lalu HTML itu dicetak
 * jadi PDF oleh peramban yang sudah ada di komputer ini (Edge atau Chrome).
 * Tidak ada paket npm baru yang dipasang untuk ini. Puppeteer akan menarik
 * satu peramban lagi sekitar 200 MB padahal komputernya sudah punya.
 */
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const FOLDER = path.dirname(fileURLToPath(import.meta.url));
const KELUAR = path.join(FOLDER, "pdf");

/** Urutan sengaja: nomornya cara membaca berkasnya, dan itu ikut ke PDF. */
function daftarBerkas() {
  return fs
    .readdirSync(FOLDER)
    .filter((f) => f.endsWith(".md") && f !== "README.md")
    .sort();
}

// --- Markdown ---------------------------------------------------------------
//
// Penerjemah seadanya, cukup untuk yang benar-benar dipakai di folder ini:
// judul, paragraf, daftar, tabel, tebal, kode, garis, dan tautan. Bukan
// markdown lengkap, dan memang tidak perlu. Menambah pustaka markdown demi
// tujuh berkas yang kita tulis sendiri itu ongkos yang tidak dibayar apa pun.

const aman = (s) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

/** Tebal, miring, kode, tautan. Kode diproses lebih dulu supaya isinya utuh. */
function inline(teks) {
  const kode = [];
  let s = aman(teks).replace(/`([^`]+)`/g, (_, isi) => {
    kode.push(isi);
    return `\u0000${kode.length - 1}\u0000`;
  });

  // Tautan antarberkas kehilangan artinya di dalam PDF gabungan: tidak ada
  // berkas .md untuk dibuka. Jadi yang tersisa cuma tulisannya.
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, tujuan) =>
    /^https?:/.test(tujuan) ? `<a href="${tujuan}">${label}</a>` : label,
  );

  s = s
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>");

  return s.replace(/\u0000(\d+)\u0000/g, (_, i) => `<code>${kode[+i]}</code>`);
}

function markdown(sumber) {
  const baris = sumber.replace(/\r\n/g, "\n").split("\n");
  const keluar = [];
  let i = 0;

  const tabel = () => {
    const kepala = baris[i].trim();
    const sel = (b) =>
      b
        .trim()
        .replace(/^\||\|$/g, "")
        .split("|")
        .map((x) => inline(x.trim()));

    i += 2; // lewati baris kepala dan baris pemisah
    const isi = [];
    while (i < baris.length && baris[i].trim().startsWith("|")) {
      isi.push(sel(baris[i]));
      i++;
    }
    keluar.push(
      `<table><thead><tr>${sel(kepala)
        .map((x) => `<th>${x}</th>`)
        .join("")}</tr></thead><tbody>${isi
        .map((r) => `<tr>${r.map((x) => `<td>${x}</td>`).join("")}</tr>`)
        .join("")}</tbody></table>`,
    );
  };

  while (i < baris.length) {
    const b = baris[i];
    const t = b.trim();

    if (!t) {
      i++;
      continue;
    }

    if (t.startsWith("```")) {
      i++;
      const isi = [];
      while (i < baris.length && !baris[i].trim().startsWith("```")) {
        isi.push(baris[i]);
        i++;
      }
      i++;
      keluar.push(`<pre><code>${aman(isi.join("\n"))}</code></pre>`);
      continue;
    }

    if (/^-{3,}$/.test(t)) {
      keluar.push("<hr>");
      i++;
      continue;
    }

    const judul = /^(#{1,4})\s+(.*)$/.exec(t);
    if (judul) {
      const n = judul[1].length;
      keluar.push(`<h${n}>${inline(judul[2])}</h${n}>`);
      i++;
      continue;
    }

    if (t.startsWith("|") && baris[i + 1]?.trim().startsWith("|")) {
      tabel();
      continue;
    }

    const urut = /^\d+\.\s+/.test(t);
    if (urut || /^[-*]\s+/.test(t)) {
      const tag = urut ? "ol" : "ul";
      const isi = [];
      while (i < baris.length) {
        const c = baris[i].trim();
        const cocok = urut ? /^\d+\.\s+(.*)$/.exec(c) : /^[-*]\s+(.*)$/.exec(c);
        if (!cocok) break;
        i++;
        // Baris sambungan: markdown kita membungkus paragraf di 80 kolom, jadi
        // satu butir daftar sering jatuh ke baris berikutnya tanpa penanda.
        let teks = cocok[1];
        while (
          i < baris.length &&
          baris[i].trim() &&
          !/^([-*]|\d+\.)\s+/.test(baris[i].trim()) &&
          !baris[i].trim().startsWith("#") &&
          !baris[i].trim().startsWith("|")
        ) {
          teks += " " + baris[i].trim();
          i++;
        }
        isi.push(`<li>${inline(teks)}</li>`);
      }
      keluar.push(`<${tag}>${isi.join("")}</${tag}>`);
      continue;
    }

    const paragraf = [];
    while (
      i < baris.length &&
      baris[i].trim() &&
      !/^(#{1,4}\s|[-*]\s|\d+\.\s|\||```|-{3,}$)/.test(baris[i].trim())
    ) {
      paragraf.push(baris[i].trim());
      i++;
    }
    if (paragraf.length) keluar.push(`<p>${inline(paragraf.join(" "))}</p>`);
    else i++;
  }

  return keluar.join("\n");
}

// --- Halaman ----------------------------------------------------------------

const GAYA = `
  @page { size: A4; margin: 20mm 18mm 18mm 18mm; }
  * { box-sizing: border-box; }
  body {
    font-family: "Segoe UI", system-ui, -apple-system, Arial, sans-serif;
    font-size: 10.5pt; line-height: 1.65; color: #14181f; margin: 0;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  h1, h2, h3, h4 { line-height: 1.3; color: #0b1220; }
  h1 { font-size: 20pt; margin: 0 0 4mm; letter-spacing: -0.01em; }
  h2 {
    font-size: 13pt; margin: 9mm 0 3mm; padding-top: 3mm;
    border-top: 1px solid #e4e8ee; break-after: avoid;
  }
  h3 { font-size: 11pt; margin: 6mm 0 2mm; break-after: avoid; }
  p { margin: 0 0 3mm; }
  ul, ol { margin: 0 0 3mm; padding-left: 6mm; }
  li { margin-bottom: 1.5mm; }
  strong { color: #0b1220; }
  a { color: #1a5ce8; text-decoration: none; }
  code {
    font-family: Consolas, "Courier New", monospace; font-size: 9pt;
    background: #f2f4f8; padding: 0.5mm 1.2mm; border-radius: 2px;
  }
  pre {
    background: #f7f8fa; border: 1px solid #e4e8ee; border-left: 2px solid #1a5ce8;
    padding: 3mm 4mm; border-radius: 3px; overflow: hidden; break-inside: avoid;
    margin: 0 0 4mm;
  }
  pre code { background: none; padding: 0; font-size: 8.5pt; line-height: 1.5; }
  table {
    width: 100%; border-collapse: collapse; margin: 0 0 4mm;
    font-size: 9.5pt; break-inside: avoid;
  }
  th, td { border: 1px solid #e0e5ec; padding: 2mm 2.5mm; text-align: left; vertical-align: top; }
  th { background: #f2f4f8; font-weight: 600; }
  hr { border: 0; border-top: 1px solid #e4e8ee; margin: 6mm 0; }

  /* Tiap berkas mulai di halaman baru, supaya bisa dicetak sebagian. */
  .bab { break-before: page; }
  .bab:first-of-type { break-before: auto; }

  .sampul {
    height: 247mm; display: flex; flex-direction: column; justify-content: center;
    break-after: page;
  }
  .sampul .merek { font-size: 34pt; font-weight: 700; letter-spacing: -0.02em; color: #0b1220; }
  .sampul .garis { width: 22mm; height: 3px; background: #1a5ce8; margin: 5mm 0 6mm; }
  .sampul .anak { font-size: 13pt; color: #4a5568; margin-bottom: 2mm; }
  .sampul .kecil { font-size: 9.5pt; color: #7a8595; margin-top: 12mm; line-height: 1.8; }

  .isi { break-after: page; }
  .isi h2 { border-top: 0; padding-top: 0; margin-top: 0; }
  .isi ol { padding-left: 5mm; }
  .isi li { margin-bottom: 3mm; }
  .isi li span { color: #55606f; display: block; font-size: 9.5pt; }
`;

/** Kalimat pengantar tiap berkas, untuk daftar isi. Diambil dari README. */
function ringkasanDariReadme() {
  const peta = new Map();
  const teks = fs.readFileSync(path.join(FOLDER, "README.md"), "utf8");
  for (const baris of teks.split("\n")) {
    const m = /^\|\s*\[([^\]]+\.md)\][^|]*\|\s*([^|]+?)\s*\|/.exec(baris.trim());
    if (m) peta.set(m[1], m[2]);
  }
  return peta;
}

function halaman(berkas, tanggal) {
  const ringkas = ringkasanDariReadme();
  const judul = (f) => {
    const baris = fs.readFileSync(path.join(FOLDER, f), "utf8").split("\n")[0];
    return baris.replace(/^#\s*/, "").trim();
  };

  const daftarIsi = berkas
    .map(
      (f, n) =>
        `<li><strong>${aman(judul(f))}</strong>${
          ringkas.get(f) ? `<span>${aman(ringkas.get(f))}</span>` : ""
        }</li>`,
    )
    .join("");

  const bab = berkas
    .map(
      (f) =>
        `<section class="bab">${markdown(fs.readFileSync(path.join(FOLDER, f), "utf8"))}</section>`,
    )
    .join("\n");

  return `<!doctype html>
<html lang="id"><head><meta charset="utf-8">
<title>Palwise — Berkas Bisnis</title><style>${GAYA}</style></head>
<body>
<section class="sampul">
  <div class="merek">Palwise</div>
  <div class="garis"></div>
  <div class="anak">Berkas bisnis</div>
  <div class="anak" style="font-size:10.5pt">Produk, pasar, harga, peta jalan, cara jualan, dan cara memasang.</div>
  <div class="kecil">
    Disusun ${tanggal}.<br>
    Dokumen internal. Angka yang belum terukur ditandai <strong>BELUM DIUKUR</strong>
    dan tidak boleh dipakai di materi jualan.
  </div>
</section>
<section class="isi">
  <h2>Isi</h2>
  <ol>${daftarIsi}</ol>
</section>
${bab}
</body></html>`;
}

// --- Cetak ------------------------------------------------------------------

function cariPeramban() {
  const calon = [
    process.env.CHROME_PATH,
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  ].filter(Boolean);
  return calon.find((p) => fs.existsSync(p)) ?? null;
}

function cetak(peramban, html, tujuan) {
  // Profil sementara sendiri, kalau tidak peramban yang sedang terbuka
  // menolak menjalankan sesi kedua di profil yang sama dan skripnya menggantung
  // tanpa pesan apa pun.
  const profil = fs.mkdtempSync(path.join(os.tmpdir(), "palwise-pdf-"));
  return new Promise((selesai, gagal) => {
    const anak = spawn(
      peramban,
      [
        "--headless=new",
        "--disable-gpu",
        "--no-sandbox",
        `--user-data-dir=${profil}`,
        "--no-pdf-header-footer",
        `--print-to-pdf=${tujuan}`,
        `file:///${html.replace(/\\/g, "/")}`,
      ],
      { stdio: "ignore" },
    );
    anak.on("error", gagal);
    anak.on("exit", (kode) => {
      fs.rmSync(profil, { recursive: true, force: true });
      if (fs.existsSync(tujuan)) selesai();
      else gagal(new Error(`peramban keluar dengan kode ${kode}, PDF tidak jadi`));
    });
  });
}

async function main() {
  const peramban = cariPeramban();
  if (!peramban) {
    console.error(
      "\nTidak menemukan Chrome atau Edge untuk mencetak PDF-nya.\n" +
        "Kalau perambanmu terpasang di tempat lain, setel CHROME_PATH ke berkas .exe-nya.\n",
    );
    process.exit(1);
  }

  const berkas = daftarBerkas();
  if (!berkas.length) {
    console.error("Tidak ada berkas .md di folder bisnis.");
    process.exit(1);
  }

  const tanggal = new Date().toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  fs.mkdirSync(KELUAR, { recursive: true });
  const sementara = path.join(os.tmpdir(), `palwise-bisnis-${process.pid}.html`);

  // Satu PDF berisi semuanya.
  fs.writeFileSync(sementara, halaman(berkas, tanggal), "utf8");
  const gabungan = path.join(KELUAR, "Palwise-Berkas-Bisnis.pdf");
  await cetak(peramban, sementara, gabungan);

  const hasil = [[path.basename(gabungan), fs.statSync(gabungan).size]];

  // Dan satu PDF per berkas, karena yang dikirim ke orang biasanya cuma satu
  // bagian: calon investor tidak butuh cara pasang di VPS, dan orang yang
  // membantu memasang tidak perlu tahu marginnya.
  for (const f of berkas) {
    const isi = fs.readFileSync(path.join(FOLDER, f), "utf8");
    fs.writeFileSync(
      sementara,
      `<!doctype html><html lang="id"><head><meta charset="utf-8">
<title>${aman(isi.split("\n")[0].replace(/^#\s*/, ""))}</title>
<style>${GAYA}</style></head><body>${markdown(isi)}</body></html>`,
      "utf8",
    );
    const tujuan = path.join(KELUAR, f.replace(/\.md$/, ".pdf"));
    await cetak(peramban, sementara, tujuan);
    hasil.push([path.basename(tujuan), fs.statSync(tujuan).size]);
  }

  fs.rmSync(sementara, { force: true });

  console.log(`\n  bisnis/pdf/  (${path.basename(peramban)})\n`);
  for (const [nama, ukuran] of hasil) {
    console.log(`  ${nama.padEnd(34)} ${(ukuran / 1024).toFixed(0)} KB`);
  }
  console.log("");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
