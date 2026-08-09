/**
 * Alat bantu teks yang dipakai bersama web dan worker.
 *
 * Letaknya di paket db, sama seperti plans.ts dan balasan.ts, karena ini satu
 * satunya paket yang dilihat kedua aplikasi. Yang lebih penting: dengan di
 * sini, selftest bisa mengujinya tanpa menyalakan browser. Berkas aslinya ada
 * di apps/web/src/lib/scrape.ts yang ditandai "server-only", jadi tidak bisa
 * diuji dari worker.
 */

/**
 * Ambil tulisan yang tersembunyi di dalam data aplikasi sebuah halaman.
 *
 * Kenapa ini ada. Banyak website Indonesia sekarang dibuat dengan Next.js atau
 * sejenisnya. Halamannya dikirim sebagai kerangka kosong plus data, lalu
 * tulisannya baru dipasang oleh browser. Diukur di audydental.com 2026-08-03:
 * berkas HTML-nya 99.866 huruf, 97 persennya isi <script>, dan tulisan yang
 * benar-benar ada sebagai HTML cuma 61 huruf. Pemilik kliniknya melihat
 * halaman penuh tulisan, sedangkan kami melaporkan "hampir tidak ada tulisan".
 * Kami benar secara teknis dan tetap saja tidak berguna.
 *
 * Padahal tulisannya ADA di berkas yang sama, cuma berbentuk data. Jadi
 * diambil dari sana.
 *
 * Yang diambil sengaja dibatasi pada nilai dari kunci yang memang berisi
 * tulisan untuk dibaca orang. Percobaan mengambil semua teks dalam tanda kutip
 * menghasilkan 201 baris yang sebagian besar nama kelas CSS dan jalur gambar
 * SVG. Lebih sedikit tapi benar jauh lebih berguna daripada banyak tapi kotor,
 * karena sampah di sini akan ikut dihafalkan asisten.
 */

/** Kunci yang isinya memang tulisan, bukan pengaturan tampilan. */
const KUNCI_TEKS =
  /"(title|subtitle|heading|subheading|description|desc|text|caption|label|name|alt|question|answer|content|body|excerpt|summary|address|street|city|phone|telephone|price|priceRange|openingHours)"\s*:\s*"([^"\\]{3,600})"/gi;

/** Lapisan escape bisa bertumpuk, misalnya \\\" di dalam data Next.js. */
function bukaEscape(s: string): string {
  let out = s;
  for (let i = 0; i < 4; i++) {
    const sebelum = out;
    out = out
      .replace(/\\u([0-9a-fA-F]{4})/g, (_, c) => String.fromCharCode(parseInt(c, 16)))
      .replace(/\\"/g, '"')
      .replace(/\\n/g, "\n")
      .replace(/\\t/g, " ")
      .replace(/\\\//g, "/")
      .replace(/\\\\/g, "\\");
    if (out === sebelum) break;
  }
  return out;
}

/**
 * Buang yang jelas bukan kalimat: alamat berkas, jalur SVG, nama kelas CSS.
 *
 * `adaKunci` artinya nilai ini datang dari kunci yang sudah kita percaya,
 * misalnya "telephone" atau "price". Untuk yang begitu syarat "harus ada
 * huruf" TIDAK berlaku, karena nomor telepon dan harga memang cuma angka.
 * Aturan itu sempat membuang "+628123456789" dari data terstruktur sebuah
 * klinik, padahal nomor telepon justru fakta paling dicari di aplikasi yang
 * kerjanya membalas WhatsApp.
 */
function layakDibaca(v: string, adaKunci = false): boolean {
  const t = v.trim();
  if (t.length < 3 || t.length > 600) return false;
  if (!adaKunci && !/[a-zA-Z]/.test(t)) return false;
  if (/^https?:\/\//i.test(t)) return false;
  if (/^[/.]/.test(t)) return false;
  if (/\.(webp|png|jpe?g|gif|svg|css|js|woff2?|ico|mp4|avif)(\?|$)/i.test(t)) return false;
  // Jalur gambar SVG: diawali perintah gambar lalu angka.
  if (/^[MmZzLlHhVvCcSsQqTtAa][\d\s.,-]/.test(t)) return false;
  // Nama kelas CSS: potongannya semua huruf kecil bertanda hubung atau kurung siku.
  const potong = t.split(/\s+/);
  if (potong.length > 2 && potong.every((p) => /^[a-z0-9:[\]/.%\-]+$/.test(p))) return false;
  if (/^[a-f0-9]{16,}$/i.test(t)) return false;
  return true;
}

/** Kumpulkan semua teks dari sebuah nilai JSON, apa pun bentuknya. */
function jelajahJson(nilai: unknown, keluar: string[], dalam = 0): void {
  if (dalam > 8 || keluar.length > 400) return;
  if (typeof nilai === "string") {
    if (layakDibaca(nilai)) keluar.push(nilai.trim());
    return;
  }
  if (typeof nilai === "number") return;
  if (Array.isArray(nilai)) {
    for (const v of nilai) jelajahJson(v, keluar, dalam + 1);
    return;
  }
  if (nilai && typeof nilai === "object") {
    for (const [k, v] of Object.entries(nilai)) {
      if (typeof v === "string" || typeof v === "number") {
        if (layakDibaca(String(v), true)) keluar.push(`${k}: ${String(v).trim()}`);
      } else {
        jelajahJson(v, keluar, dalam + 1);
      }
    }
  }
}

export function teksDariData(html: string): string {
  const skrip = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)];
  if (skrip.length === 0) return "";

  const keluar: string[] = [];

  // 1. Data terstruktur resmi. Kalau ada, ini yang paling berharga: nama
  //    usaha, alamat, telepon, jam buka, kisaran harga, sudah rapi dari sananya.
  for (const [, atribut, isi] of skrip) {
    if (!/ld\+json/i.test(atribut)) continue;
    try {
      jelajahJson(JSON.parse(isi.trim()), keluar);
    } catch {
      // Data terstruktur yang rusak dilewati, sisanya tetap diambil.
    }
  }

  // 2. Data aplikasi biasa.
  const gabung = bukaEscape(skrip.map(([, , isi]) => isi).join("\n"));
  for (const m of gabung.matchAll(KUNCI_TEKS)) {
    const v = m[2].trim();
    // Sama seperti data terstruktur: kuncinya sudah dipercaya, jadi nilai yang
    // cuma angka (harga, nomor, jam) tetap diambil.
    if (layakDibaca(v, true)) keluar.push(v);
    if (keluar.length > 400) break;
  }

  // 3. Nomor WhatsApp dari tautan. Ini yang paling sering dicari pelanggan,
  //    dan letaknya di dalam alamat tautan, bukan di nilai bertanda kutip.
  const nomor = new Set<string>();
  for (const m of gabung.matchAll(
    /(?:wa\.me\/|api\.whatsapp\.com\/send\?phone=|whatsapp:\/\/send\?phone=)(\d{8,15})/gi,
  )) {
    nomor.add(m[1]);
  }
  for (const n of nomor) keluar.push(`Nomor WhatsApp: ${n}`);

  const unik = [...new Set(keluar)];
  return unik.join("\n");
}

/**
 * Ambil daftar alamat dari sitemap.
 *
 * Kenapa perlu. Penelusur kita mencari halaman lain lewat tag <a href> di
 * halaman depan. Di situs yang dibuat Next.js, tautan menunya juga digambar
 * oleh browser, jadi jumlah tag <a> di berkasnya NOL dan kita menyimpulkan
 * "tidak ada halaman lain yang menjanjikan". Diukur di audydental.com
 * 2026-08-03: nol tautan ketemu, padahal situsnya punya halaman About,
 * Doctors, Services, Locations, dan sitemap-nya memuat 24 alamat.
 *
 * Sitemap justru cara yang paling pantas: itu berkas yang sengaja disediakan
 * pemilik situs supaya robot tahu halaman apa saja yang ada.
 *
 * Menerima sitemap biasa maupun sitemap index yang isinya sitemap lain.
 */
/**
 * Apakah isi berkas ini benar-benar sitemap.
 *
 * Wajib diperiksa, tidak cukup melihat kode 200. Diukur 2026-08-03:
 * indofood.com menjawab 200 untuk /sitemap.xml, /wp-sitemap.xml, DAN
 * /sitemap_index.xml, padahal ketiganya halaman error ASP.NET yang bertuliskan
 * "The resource cannot be found". Server yang menjawab 200 untuk berkas yang
 * tidak ada itu biasa, dan kalau cuma melihat kodenya kita mengira punya tiga
 * sitemap padahal tidak punya satu pun.
 */
export function terlihatSitemap(xml: string): boolean {
  const awal = xml.slice(0, 2000);
  if (/<html|<!doctype html/i.test(awal)) return false;
  return /<urlset|<sitemapindex/i.test(awal) || /<loc>/i.test(xml);
}

export function alamatDariSitemap(xml: string): string[] {
  if (!terlihatSitemap(xml)) return [];
  const keluar: string[] = [];
  for (const m of xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)) {
    const v = m[1].trim().replace(/&amp;/g, "&");
    if (/^https?:\/\//i.test(v)) keluar.push(v);
    if (keluar.length >= 500) break;
  }
  return [...new Set(keluar)];
}

/** Apakah xml ini daftar sitemap lain, bukan daftar halaman. */
export function sitemapBerisiSitemap(xml: string): boolean {
  return /<sitemapindex/i.test(xml);
}

/**
 * Ambil alamat sitemap yang disebut di robots.txt.
 *
 * Baris Disallow SENGAJA TIDAK dipakai untuk membatasi penelusuran, dan itu
 * keputusan produk, bukan kelalaian. Jangan "diperbaiki" tanpa membaca ini.
 *
 * Alasannya, yang mengimpor sebuah website di Palwise adalah pemilik website
 * itu sendiri, ke dalam catatan bisnisnya sendiri. Yang diambil paling banyak
 * enam halaman, sekali jalan, waktu dia menekan tombol. Itu setara orang
 * membuka enam tab, bukan penjelajahan massal yang jadi alasan robots.txt ada.
 *
 * Dan menurutinya menghukum orang yang salah. Ditemukan 2026-08-03:
 * audydental.com menulis "User-agent: * / Disallow: /" tepat di bawah komentar
 * "Allow all crawlers access to everything else". Perintahnya bertentangan
 * dengan maksudnya sendiri, hampir pasti salah ketik. Kalau kita menurutinya,
 * pemilik kliniknya harus menghubungi tim IT atau agensi pembuat situsnya cuma
 * supaya bisa mengisi catatan bisnisnya sendiri.
 *
 * Yang tetap dijaga: jumlah halaman dibatasi, permintaannya satu per satu,
 * ada batas waktu, penyebutan diri tetap jujur sebagai PalwiseBot, dan jalur
 * yang tidak pantas disentuh (admin, login, keranjang, akun) sudah dibuang
 * oleh SKIP_WORDS milik kita sendiri, tanpa bergantung pada robots.txt.
 */
export function aturanRobots(txt: string): { sitemap: string[] } {
  const sitemap: string[] = [];

  for (const barisMentah of txt.split(/\r?\n/)) {
    const baris = barisMentah.replace(/#.*$/, "").trim();
    if (!baris) continue;
    const [kunciMentah, ...sisa] = baris.split(":");
    if (kunciMentah.trim().toLowerCase() !== "sitemap") continue;
    const nilai = sisa.join(":").trim();
    if (/^https?:\/\//i.test(nilai)) sitemap.push(nilai);
  }

  return { sitemap: [...new Set(sitemap)] };
}

/**
 * Potong teks tanpa memutus kata.
 *
 * `slice` biasa memotong tepat di huruf ke sekian, jadi halaman panjang
 * berakhir seperti "PT Wefluence Media G". Itu terbaca sebagai isi yang rusak,
 * bukan sebagai isi yang dibatasi, dan orang mengira penelusurannya gagal.
 *
 * Urutan pencarian batas: paragraf, lalu akhir kalimat, lalu spasi. Kalau
 * batas terdekat lebih dari 15 persen ke belakang, potongannya dibiarkan apa
 * adanya, karena membuang seperlima isi demi kerapian itu tukar untung yang
 * salah. Selalu ditutup keterangan supaya jelas ini dibatasi, bukan segitu
 * isinya.
 */
export function potongRapi(teks: string, batas: number): string {
  if (teks.length <= batas) return teks;

  const kasar = teks.slice(0, batas);
  const minimal = Math.floor(batas * 0.85);

  let potong = kasar.lastIndexOf("\n\n");
  if (potong < minimal) {
    const kalimat = Math.max(
      kasar.lastIndexOf(". "),
      kasar.lastIndexOf(".\n"),
      kasar.lastIndexOf("! "),
      kasar.lastIndexOf("? "),
    );
    potong = kalimat >= minimal ? kalimat + 1 : kasar.lastIndexOf(" ");
  }
  if (potong < minimal) potong = batas;

  return `${kasar.slice(0, potong).trimEnd()}\n\n[Halaman ini terlalu panjang, sisanya tidak ikut terbaca.]`;
}
