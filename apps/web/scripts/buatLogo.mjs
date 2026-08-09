/**
 * Bikin semua turunan logo dari satu berkas sumber.
 *
 * Jalankan: npm run logo
 *
 * Sumbernya aseet/logo.jpg: tanda "P" biru di atas latar hampir putih, 1080x1350,
 * dengan ruang kosong yang sangat lebar. Dipakai apa adanya, dia jelek di mana-mana:
 * jadi titik kecil di tab browser, dan kotak putih di atas latar gelap.
 *
 * Yang dikerjakan skrip ini:
 * 1. Memangkas ruang kosongnya.
 * 2. Membuang latar putihnya jadi tembus pandang, dengan tepi yang tetap halus.
 * 3. Menyimpan beberapa ukuran untuk keperluan yang berbeda.
 *
 * Latar putih dibuang bukan demi cantik. Header dashboard berlatar gelap, dan
 * logo JPEG akan tampil sebagai kotak putih menyolok di situ.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const AKAR = path.resolve(fileURLToPath(import.meta.url), "../../../..");
const SUMBER = path.join(AKAR, "aseet/logo.jpg");
const PUBLIC = path.join(AKAR, "apps/web/public");
const APP = path.join(AKAR, "apps/web/src/app");

/** Biru Palwise. Dipakai untuk latar ikon Apple dan kartu bagikan. */
const BIRU = { r: 26, g: 92, b: 232 };

/**
 * Ubah latar hampir putih jadi tembus pandang.
 *
 * Bukan ambang batas keras "putih dibuang, sisanya disimpan". Itu menghasilkan
 * tepi bergerigi yang kelihatan sekali di ukuran besar. Yang dipakai: jarak tiap
 * titik dari warna latar dibandingkan dengan jarak warna tandanya sendiri, jadi
 * titik setengah jalan di tepi huruf ikut jadi setengah tembus pandang.
 */
async function tembusPandang(masuk) {
  const { data, info } = await sharp(masuk)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const lat = { r: 248, g: 248, b: 248 };
  const jarakPenuh = Math.hypot(BIRU.r - lat.r, BIRU.g - lat.g, BIRU.b - lat.b);

  for (let i = 0; i < data.length; i += info.channels) {
    const jarak = Math.hypot(
      data[i] - lat.r,
      data[i + 1] - lat.g,
      data[i + 2] - lat.b,
    );
    let a = Math.round((jarak / jarakPenuh) * 255);

    // Ambang bawah, kalau tidak latarnya menyisakan kabut abu tipis.
    //
    // Latar sumbernya JPEG, dan JPEG tidak pernah menyimpan warna rata persis:
    // tiap titik meleset satu dua angka dari 248 karena cara kompresinya. Tanpa
    // ambang ini tiap titik latar dapat alpha kecil tapi bukan nol, dan
    // hasilnya kotak abu samar yang justru paling kelihatan di kartu bagikan
    // yang latarnya putih bersih.
    if (a < 40) a = 0;
    else if (a > 240) a = 255;

    data[i + 3] = Math.max(0, Math.min(255, a));
  }

  return sharp(data, { raw: info }).png().toBuffer();
}

/** Tanda di tengah kanvas persegi, dengan sedikit ruang napas di tepinya. */
async function persegi(tanda, sisi, latar = { r: 0, g: 0, b: 0, alpha: 0 }) {
  const isi = Math.round(sisi * 0.76);
  const kecil = await sharp(tanda)
    .resize(isi, isi, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  return sharp({
    create: { width: sisi, height: sisi, channels: 4, background: latar },
  })
    .composite([{ input: kecil, gravity: "center" }])
    .png()
    .toBuffer();
}

/**
 * Kartu yang muncul waktu tautannya dibagikan.
 *
 * Tulisannya digambar sebagai SVG, bukan diketik di atas gambar, supaya tetap
 * tajam dan tidak bergantung pada berkas font yang mungkin tidak ada di mesin
 * yang menjalankan skrip ini. Kalau mesinnya tidak bisa menggambar teks sama
 * sekali, kartunya tetap jadi, cuma berisi logonya saja: kartu tanpa tulisan
 * masih jauh lebih baik daripada kotak abu kosong.
 */
async function kartuBagikan(tanda) {
  const L = 1200;
  const T = 630;

  const logo = await sharp(tanda)
    .resize(190, 190, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  const teks = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${L}" height="${T}">
  <style>
    .judul { font-family: Segoe UI, Arial, Helvetica, sans-serif; font-weight: 700; fill: #0b1220; }
    .anak  { font-family: Segoe UI, Arial, Helvetica, sans-serif; font-weight: 400; fill: #4a5568; }
  </style>
  <text x="96" y="400" class="judul" font-size="62">Admin WhatsApp yang</text>
  <text x="96" y="472" class="judul" font-size="62">tidak pernah tidur.</text>
  <text x="96" y="536" class="anak" font-size="30">Palwise, sepertujuh harga platform sebelah.</text>
</svg>`);

  // SATU panggilan composite untuk semuanya.
  //
  // Di sharp, memanggil composite() dua kali TIDAK menumpuk: yang kedua
  // mengganti daftar yang pertama. Versi awal skrip ini menaruh pita dan logo
  // di panggilan pertama lalu tulisannya di panggilan kedua, dan hasilnya
  // kartu berisi tulisan saja tanpa logo sama sekali.
  const lapisan = [
    // Pita biru tipis di kiri, penanda merek tanpa menutupi tulisannya.
    {
      input: {
        create: { width: 14, height: T, channels: 4, background: { ...BIRU, alpha: 1 } },
      },
      left: 0,
      top: 0,
    },
    { input: logo, left: 96, top: 108 },
  ];

  const dasar = () =>
    sharp({
      create: {
        width: L,
        height: T,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      },
    });

  try {
    return await dasar()
      .composite([...lapisan, { input: teks, left: 0, top: 0 }])
      .png()
      .toBuffer();
  } catch {
    return dasar().composite(lapisan).png().toBuffer();
  }
}

async function main() {
  if (!fs.existsSync(SUMBER)) {
    console.error(`Logo sumber tidak ketemu di ${SUMBER}`);
    process.exit(1);
  }
  fs.mkdirSync(PUBLIC, { recursive: true });

  const dipangkas = await sharp(SUMBER).trim({ threshold: 20 }).toBuffer();
  const tanda = await tembusPandang(dipangkas);

  const hasil = [];

  // Dipakai di kepala halaman dan sidebar. 256 cukup untuk layar padat.
  const logo = await sharp(tanda)
    .resize(256, 256, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  fs.writeFileSync(path.join(PUBLIC, "logo.png"), logo);
  hasil.push(["public/logo.png", logo.length]);

  // Favicon. Next.js memungutnya otomatis dari src/app/icon.png.
  const ikon = await persegi(tanda, 512);
  fs.writeFileSync(path.join(APP, "icon.png"), ikon);
  hasil.push(["src/app/icon.png", ikon.length]);

  // TIDAK ada salinan di public/.
  //
  // Sempat ada, dan itu menabrak: src/app/icon.png sudah dilayani Next.js di
  // alamat /icon.png, jadi berkas dengan nama sama di public/ membuat dua hal
  // berebut satu alamat. Next.js menolak dengan "A conflicting public file and
  // page file was found", dan /icon.png balas 500. Akibatnya ikon tabnya hilang
  // dan manifest-nya gagal memuat ikon, padahal salinan itu justru ditambahkan
  // supaya manifest bisa memakainya.
  //
  // manifest.webmanifest tetap menunjuk /icon.png, dan yang melayaninya berkas
  // di src/app.

  // iOS memasang ikon di layar depan TANPA latar, jadi bagian yang tembus
  // pandang berubah jadi hitam pekat dan tandanya hilang di dalamnya. Yang ini
  // diberi latar putih sendiri, bukan biru, karena tandanya sendiri biru.
  const apple = await persegi(tanda, 180, { r: 255, g: 255, b: 255, alpha: 1 });
  fs.writeFileSync(path.join(APP, "apple-icon.png"), apple);
  hasil.push(["src/app/apple-icon.png", apple.length]);

  // Kartu yang muncul waktu tautannya dibagikan di WhatsApp, Facebook, dan X.
  // Ukurannya 1200x630, ketentuan Open Graph.
  //
  // Tanpa ini, tautan Palwise yang dibagikan orang muncul sebagai kotak abu
  // kosong, dan tautan tanpa gambar hampir tidak pernah diklik.
  const og = await kartuBagikan(tanda);
  fs.writeFileSync(path.join(APP, "opengraph-image.png"), og);
  hasil.push(["src/app/opengraph-image.png", og.length]);

  console.log("");
  for (const [nama, ukuran] of hasil) {
    console.log(`  ${nama.padEnd(28)} ${(ukuran / 1024).toFixed(1)} KB`);
  }
  console.log("");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
