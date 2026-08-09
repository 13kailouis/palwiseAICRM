import "server-only";
import {
  alamatDariSitemap,
  aturanRobots,
  potongRapi,
  sitemapBerisiSitemap,
  teksDariData,
} from "@palwise/db";

/**
 * Penelusur website sederhana untuk mengisi Info bisnis.
 *
 * Tujuannya bukan menyalin seluruh situs, tapi mengambil halaman yang biasanya
 * memuat fakta yang ditanya pelanggan: harga, produk, layanan, cara pesan, dan
 * kontak. Karena itu jumlah halaman dan ukuran teks sengaja dibatasi ketat.
 */

const UA = "PalwiseBot/0.1 (+pengambil info bisnis)";
const PAGE_TIMEOUT_MS = 20_000;
const MAX_CHARS_PER_PAGE = 9_000;
const MAX_TOTAL_CHARS = 40_000;

/**
 * Kata yang menandakan halaman itu kemungkinan besar berisi fakta berguna.
 *
 * Daftar ini dulu berbentuk toko retail saja: harga, produk, katalog, ongkir,
 * retur. Akibatnya usaha jasa kehilangan halaman yang justru paling ditanya
 * pelanggannya. Ketahuan 2026-08-03 di audydental.com: sitemap-nya memuat
 * /doctors/, /locations/, /promo/, dan /booking/, tapi tidak satu pun kata itu
 * ada di sini, jadi nilainya nol dan tidak pernah terpilih. Padahal "dokternya
 * siapa" dan "cabang terdekat di mana" itu dua pertanyaan pertama yang masuk
 * ke WhatsApp sebuah klinik.
 *
 * Sama masalahnya dengan contoh retail di prompt yang bikin pipeline usaha
 * jasa kelihatan mati. Kalau menambah kata baru, pikirkan salon, klinik,
 * bengkel, dan rumah makan, bukan cuma toko online.
 */
const USEFUL_WORDS: [RegExp, number][] = [
  [/harga|pricelist|price-?list|pricing|price|paket|biaya|tarif|langganan/i, 10],
  [/produk|product|katalog|catalog|menu|layanan|service|jasa|perawatan|treatment/i, 8],
  [/faq|tanya|pertanyaan|bantuan|help/i, 7],
  // Siapa yang mengerjakan. Untuk klinik, salon, bengkel, dan studio, ini
  // sering jadi alasan orang memilih tempatnya.
  [/dokter|doctor|terapis|therapist|teknisi|tim|team|staf|staff|ahli|profil-?kami/i, 7],
  // Di mana dan kapan. Pertanyaan paling sering sesudah harga.
  [/lokasi|location|cabang|branch|outlet|gerai|klinik|store|toko|alamat|maps/i, 7],
  [/jadwal|schedule|jam-?buka|jam-?operasional|booking|reservasi|appointment|janji/i, 6],
  [/cara|panduan|how-?to|pesan|order|beli/i, 6],
  [/promo|diskon|discount|penawaran|voucher/i, 6],
  [/tentang|about|profil/i, 4],
  [/kontak|contact|hubungi/i, 4],
  [/asuransi|insurance|pembayaran|payment|cicilan/i, 4],
  [/kirim|shipping|ongkir|retur|refund|garansi|kebijakan|syarat|terms/i, 4],
];

/**
 * Halaman yang hampir tidak pernah berguna sebagai info bisnis.
 *
 * Artikel dan blog SENGAJA dibuang, dan ini bukan sekadar hemat tempat.
 * Ditemukan di pegadaian.co.id 2026-08-07: dua artikel SEO,
 * /artikel/inspirasi/cara-membuat-paspor dan .../cara-membuat-npwp-online,
 * memakan 16.945 huruf alias 63 persen jatah, sementara halaman aslinya
 * seperti /harga-emas dan /lokasi-cabang cuma memberi 142 dan 224 huruf.
 *
 * Yang lebih berbahaya bukan borosnya, tapi hasilnya: "Syarat Pembuatan
 * Paspor Umum" dan "Syarat Pembuatan Paspor Anak" masuk ke catatan sebagai
 * SYARAT DAN KETENTUAN milik Pegadaian. Pelanggan yang bertanya "syaratnya
 * apa" bisa dijawab dengan syarat bikin paspor. Artikel itu ditulis untuk
 * mesin pencari, bukan untuk menjelaskan usahanya, dan isinya memang tentang
 * hal lain.
 *
 * Fakta usaha ada di halaman produk, layanan, harga, dan kontak. Bukan di blog.
 */
const SKIP_WORDS =
  /\/(login|masuk|daftar|register|signin|signup|cart|keranjang|checkout|akun|account|admin|wp-admin|privacy|kebijakan-privasi|karir|career|lowongan|search|pencarian|artikel|article|blog|berita|news|press|siaran-pers|inspirasi|tips|tag|category|author)\b/i;

const SKIP_EXT = /\.(pdf|jpe?g|png|gif|webp|svg|zip|rar|mp4|mp3|docx?|xlsx?|pptx?|css|js)(\?|$)/i;

export interface ScrapedPage {
  url: string;
  title: string;
  text: string;
  chars: number;
}

/**
 * Alamat yang menunjuk ke dalam jaringan sendiri.
 *
 * Termasuk 169.254.169.254, alamat metadata di hampir semua penyedia cloud,
 * yang biasanya menyimpan kredensial server.
 */
function alamatDalamJaringan(host: string): boolean {
  const h = host.toLowerCase().replace(/^\[|\]$/g, "");

  if (h === "localhost" || h.endsWith(".localhost") || h.endsWith(".internal")) {
    return true;
  }
  // IPv6 loopback dan alamat lokal.
  if (h === "::1" || h.startsWith("fc") || h.startsWith("fd") || h.startsWith("fe80")) {
    return true;
  }

  return /^(127\.|10\.|0\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(h);
}

/**
 * Pastikan nama domainnya benar-benar mengarah ke internet, bukan ke jaringan
 * sendiri. Nama domain publik bisa saja sengaja diarahkan ke 127.0.0.1.
 */
async function pastikanBukanJaringanSendiri(hostname: string): Promise<void> {
  if (alamatDalamJaringan(hostname)) {
    throw new Error("Alamat itu menunjuk ke jaringan sendiri, tidak bisa diambil.");
  }

  try {
    const dns = await import("node:dns/promises");
    const alamat = await dns.lookup(hostname, { all: true });
    if (alamat.some((a) => alamatDalamJaringan(a.address))) {
      throw new Error("Alamat itu menunjuk ke jaringan sendiri, tidak bisa diambil.");
    }
  } catch (err) {
    // Kalau memang alamatnya terlarang, teruskan pesannya.
    if (err instanceof Error && err.message.includes("jaringan sendiri")) throw err;
    // Gagal mencari nama domain ditangani oleh fetch di bawah.
  }
}

/** Terima "namatokokamu.com" maupun "https://namatokokamu.com/harga". */
export function normalizeUrl(input: string): URL {
  const raw = input.trim();
  if (!raw) throw new Error("Alamat websitenya belum diisi.");

  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;

  let url: URL;
  try {
    url = new URL(withProtocol);
  } catch {
    throw new Error(`"${raw}" bukan alamat website yang benar.`);
  }

  if (!url.hostname.includes(".")) {
    throw new Error(`"${raw}" bukan alamat website yang benar.`);
  }
  if (alamatDalamJaringan(url.hostname)) {
    throw new Error("Alamat itu menunjuk ke jaringan sendiri, tidak bisa diambil.");
  }

  url.hash = "";
  return url;
}

const MAKS_PENGALIHAN = 5;

/**
 * Ambil isi halaman, dengan pengalihan diikuti SATU PER SATU.
 *
 * Dulu dipakai redirect "follow", jadi alamat awalnya saja yang diperiksa.
 * Situs publik bisa mengalihkan ke 127.0.0.1 atau ke alamat metadata cloud,
 * dan isinya ikut ditampilkan ke pengguna. Sekarang tiap perpindahan diperiksa
 * ulang seperti alamat baru.
 */
async function fetchHtml(url: string): Promise<string> {
  let sekarang = url;

  for (let lompat = 0; lompat <= MAKS_PENGALIHAN; lompat++) {
    const tujuan = new URL(sekarang);
    if (tujuan.protocol !== "http:" && tujuan.protocol !== "https:") {
      throw new Error("hanya alamat http dan https yang bisa dibuka");
    }
    await pastikanBukanJaringanSendiri(tujuan.hostname);

    // JANGAN mengutak-atik header untuk menembus penolakan. Sudah dicoba
    // 2026-08-07 di jago.com dan hasilnya menyesatkan: percobaan pertama
    // menunjukkan tanpa "accept" dapat 200 dan dengan "accept" dapat 403,
    // jadi sempat disimpulkan header itu penyebabnya. Diulang beberapa menit
    // kemudian hasilnya justru terbalik, lalu berubah lagi. Penjaga situs
    // seperti itu memutuskan berdasarkan reputasi dan kekerapan, bukan bentuk
    // permintaan, jadi percobaan sekali jalan gampang menipu. Kalau sebuah
    // situs menolak, sampaikan apa adanya dan tawarkan jalan lain.
    const res = await fetch(sekarang, {
      headers: { "user-agent": UA, accept: "text/html,application/xhtml+xml" },
      signal: AbortSignal.timeout(PAGE_TIMEOUT_MS),
      redirect: "manual",
    });

    if (res.status >= 300 && res.status < 400) {
      const berikutnya = res.headers.get("location");
      if (!berikutnya) throw new Error(`halaman menjawab ${res.status} tanpa tujuan`);

      // Situs yang diblokir penyedia internet dialihkan ke halaman
      // pemberitahuan. Tanpa dikenali, orangnya menyalin isi halaman blokir itu
      // ke Info bisnis dan asistennya menjawab pakai isi halaman itu.
      const tujuanBaru = new URL(berikutnya, sekarang);
      if (/internet-positif|trustpositif|lamanuntukmu/i.test(tujuanBaru.hostname)) {
        throw new Error(
          "alamat ini diblokir oleh penyedia internet yang kamu pakai, bukan oleh websitenya",
        );
      }

      sekarang = tujuanBaru.toString();
      continue;
    }

    if (res.status === 403 || res.status === 401) {
      // Kami TIDAK menyamar jadi peramban untuk menembus ini. Pemilik situsnya
      // memang sengaja menutup pintu buat robot, dan menyamar berarti melanggar
      // keputusan itu. Yang benar: bilang terus terang dan tawarkan jalan lain.
      throw new Error(
        "websitenya menolak dibaca oleh robot (kode 403). Salin tempel isinya manual, atau unggah berkasnya",
      );
    }
    if (res.status === 404) throw new Error("halamannya tidak ada (404)");
    if (res.status === 429) {
      throw new Error("websitenya minta jeda karena terlalu sering dibuka (429). Coba lagi beberapa menit lagi");
    }
    if (res.status >= 500) {
      throw new Error(`websitenya sedang bermasalah (kode ${res.status})`);
    }
    if (!res.ok) throw new Error(`halaman menjawab ${res.status}`);

    const type = res.headers.get("content-type") ?? "";
    if (!type.includes("html")) throw new Error("isinya bukan halaman web");

    return res.text();
  }

  throw new Error("terlalu banyak pengalihan");
}

/**
 * Buka halaman depan, dan kalau https-nya rusak coba http.
 *
 * Ditemukan waktu menyapu situs bisnis Indonesia 2026-08-03: santika.com sama
 * sekali tidak menjawab di https, tapi di http dia menjawab 301 ke
 * https://www.mysantika.com yang sehat. Pola ini biasa di usaha kecil:
 * sertifikat cuma dipasang di alamat "www", sedangkan alamat polosnya tidak.
 * Karena kita selalu menambahkan https di depan, alamat yang sebenarnya hidup
 * jadi terbaca mati.
 *
 * Cadangan http cuma dipakai untuk MEMBUKA pintu. Hampir semua situs langsung
 * mengalihkan ke https-nya sendiri, dan pengalihan itu tetap diikuti satu per
 * satu dengan pemeriksaan yang sama. Kalau ternyata isinya benar-benar
 * disajikan lewat http polos, itu risiko yang sudah ada di websitenya sendiri,
 * bukan yang kita buat.
 */
async function bukaHalamanDepan(
  url: string,
): Promise<{ html: string; galatAwal?: string }> {
  try {
    return { html: await fetchHtml(url) };
  } catch (err) {
    const pesan = err instanceof Error ? err.message : String(err);
    const alamat = new URL(url);

    // Cuma untuk kegagalan sambungan. Kalau websitenya menjawab 403 atau
    // diblokir penyedia internet, mengulang lewat http tidak mengubah apa pun
    // dan cuma menunda pesan yang sudah benar.
    const layakDicoba =
      alamat.protocol === "https:" &&
      !/403|401|404|429|diblokir|robot|bukan halaman web/i.test(pesan);
    if (!layakDicoba) throw err;

    alamat.protocol = "http:";
    try {
      return { html: await fetchHtml(alamat.toString()), galatAwal: pesan };
    } catch {
      // Pesan yang dilaporkan tetap yang dari https, karena itu yang
      // seharusnya jalan. Kegagalan http cuma menutup kemungkinan terakhir.
      throw err;
    }
  }
}

/**
 * Terjemahkan kegagalan jaringan jadi kalimat yang bisa ditindaklanjuti.
 *
 * `serverHidup` artinya server itu terbukti menjawab permintaan lain dari kita
 * (robots.txt), jadi kemungkinan "situsnya sedang mati" sudah gugur.
 */
export function jelaskanGagalBuka(
  hostname: string,
  pesan: string,
  serverHidup = false,
): string {
  // Penolakan paling menyusahkan bukan yang menjawab 403, tapi yang tidak
  // menjawab APA PUN. Ditemukan di tokopedia.com 2026-08-07: dengan
  // PalwiseBot sambungannya digantung sampai batas waktu habis, sedangkan
  // dengan user-agent peramban dia menjawab 200 dalam 0,25 detik. Tapi
  // robots.txt-nya tetap menjawab 200 untuk kita.
  //
  // Bedanya penting buat orangnya. "Websitenya mungkin sedang mati" bikin dia
  // pergi memeriksa situsnya, menemukan situsnya baik-baik saja, lalu
  // menyimpulkan Palwise yang rusak. Padahal yang perlu dia tahu cuma satu:
  // pakai jalan lain.
  if (serverHidup && /ECONNRESET|ETIMEDOUT|timeout|aborted|fetch failed/i.test(pesan)) {
    return `${hostname} hidup, tapi menolak dibaca robot dengan cara menggantung sambungannya. Biasanya ini pengaturan keamanan di websitenya. Salin tempel isinya lewat "Ketik sendiri", atau unggah berkasnya lewat "Berkas".`;
  }
  return jelaskanApaAdanya(hostname, pesan);
}

function jelaskanApaAdanya(hostname: string, pesan: string): string {
  if (/EAI_AGAIN|ENOTFOUND|getaddrinfo/i.test(pesan)) {
    return `Nama website "${hostname}" tidak ditemukan. Periksa ejaannya, atau coba tambahkan "www." di depan.`;
  }
  if (/certificate|TLS|SSL|self.signed|ERR_CERT/i.test(pesan)) {
    return `Sertifikat keamanan ${hostname} bermasalah, jadi isinya tidak bisa diambil dengan aman.`;
  }
  if (/ECONNREFUSED|ECONNRESET|ETIMEDOUT|timeout|aborted/i.test(pesan)) {
    return `${hostname} tidak menjawab. Mungkin sedang mati, atau memblokir dari luar negeri.`;
  }
  if (/diblokir oleh penyedia internet/i.test(pesan)) {
    return `Alamat ini diblokir oleh penyedia internet yang kamu pakai, bukan oleh websitenya. Coba dari jaringan lain.`;
  }
  if (/menolak dibaca oleh robot/i.test(pesan)) {
    return `${hostname} menolak dibaca robot. Ini pengaturan di websitenya sendiri. Salin tempel isinya lewat "Ketik sendiri", atau unggah berkasnya lewat "Berkas".`;
  }
  if (/fetch failed/i.test(pesan)) {
    return `Tidak bisa menyambung ke ${hostname}. Periksa alamatnya, atau coba tambahkan "www." di depan.`;
  }
  return `Gagal membuka ${hostname}: ${pesan}`;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;|&rsquo;/g, "'")
    .replace(/&mdash;|&ndash;/g, "-")
    .replace(/&hellip;/g, "...")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

export function htmlToText(html: string): string {
  let body = html;

  // Buang bagian yang tidak pernah berisi fakta bisnis.
  for (const tag of ["script", "style", "noscript", "svg", "iframe", "nav", "header", "footer", "form"]) {
    body = body.replace(new RegExp(`<${tag}[\\s\\S]*?<\\/${tag}>`, "gi"), " ");
  }

  // Kalau ada <main> atau <article>, biasanya itu isi aslinya.
  const main = body.match(/<(main|article)[^>]*>([\s\S]*?)<\/\1>/i);
  if (main && main[2].length > 400) body = main[2];

  return decodeEntities(
    body
      .replace(/<\/(p|div|li|h[1-6]|tr|section|article|td)>/gi, "\n")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<li[^>]*>/gi, "- ")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/[ \t ]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Ambil tulisan halaman, dan kalau HTML-nya memang kerangka kosong, ambil dari
 * datanya.
 *
 * Cadangan ini SENGAJA cuma dipakai kalau HTML biasanya tipis. Data aplikasi
 * selalu memuat sisa-sisa pengaturan tampilan walau sudah disaring, jadi
 * memakainya di situs biasa cuma menambah sampah tanpa menambah pengetahuan.
 * Ambangnya 400 huruf, sama dengan ambang "panen tipis" di crawlSite, supaya
 * tidak ada halaman yang lolos di satu tempat lalu ditandai di tempat lain.
 */
export function tulisanHalaman(html: string): string {
  const biasa = htmlToText(html);
  if (biasa.length >= 400) return biasa;

  const dariData = teksDariData(html);
  if (dariData.length <= biasa.length) return biasa;

  // Judul halaman tetap dipakai sebagai pembuka, karena isi data jarang
  // memuatnya dan itu satu-satunya penanda halaman ini tentang apa.
  const judul = extractTitle(html);
  return [judul, biasa, dariData].filter(Boolean).join("\n").trim();
}

export function extractTitle(html: string): string {
  const t = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (t) return decodeEntities(t[1]).replace(/\s+/g, " ").trim().slice(0, 120);
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (h1) return decodeEntities(h1[1].replace(/<[^>]+>/g, "")).trim().slice(0, 120);
  return "";
}

interface Candidate {
  url: string;
  score: number;
}

/** Cari tautan sehalaman-situs yang layak ditelusuri, urut dari yang paling menjanjikan. */
export function pickInternalLinks(html: string, base: URL, limit: number): string[] {
  const found = new Map<string, Candidate>();
  const anchor = /<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;

  let m: RegExpExecArray | null;
  while ((m = anchor.exec(html)) !== null) {
    const href = m[1];
    const text = m[2].replace(/<[^>]+>/g, " ").slice(0, 120);

    if (/^(mailto:|tel:|javascript:|#)/i.test(href)) continue;

    let url: URL;
    try {
      url = new URL(href, base);
    } catch {
      continue;
    }

    if (url.hostname !== base.hostname) continue;
    if (url.protocol !== "http:" && url.protocol !== "https:") continue;
    if (SKIP_EXT.test(url.pathname)) continue;
    if (SKIP_WORDS.test(url.pathname)) continue;

    url.hash = "";
    url.search = "";
    const key = url.toString().replace(/\/$/, "");
    if (key === base.toString().replace(/\/$/, "")) continue;

    // Halaman yang terlalu dalam biasanya artikel, bukan info bisnis.
    const depth = url.pathname.split("/").filter(Boolean).length;
    if (depth > 3) continue;

    const haystack = `${url.pathname} ${text}`;
    let score = 0;
    for (const [re, weight] of USEFUL_WORDS) {
      if (re.test(haystack)) score += weight;
    }
    if (depth === 1) score += 2;

    if (score <= 0) continue;

    const prev = found.get(key);
    if (!prev || prev.score < score) found.set(key, { url: url.toString(), score });
  }

  return [...found.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((c) => c.url);
}

export interface CrawlEvent {
  (event:
    | { type: "step"; text: string }
    | { type: "page"; url: string; title: string; chars: number; ok: boolean; note?: string }): void;
}

/** Ambil berkas biasa (robots.txt, sitemap.xml). Gagal bukan hal fatal. */
async function ambilTeks(url: string, batasMs = PAGE_TIMEOUT_MS): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { "user-agent": UA },
      signal: AbortSignal.timeout(batasMs),
      redirect: "follow",
    });
    if (!res.ok) return null;
    const isi = await res.text();
    return isi.length > 3_000_000 ? isi.slice(0, 3_000_000) : isi;
  } catch {
    return null;
  }
}

/**
 * Cari halaman lain lewat sitemap, dipakai kalau tag <a> tidak menghasilkan apa
 * apa.
 *
 * Urutannya: robots.txt dulu, karena di situ pemilik situs menyebutkan sendiri
 * di mana sitemap-nya, sekaligus menyebutkan halaman apa yang tidak boleh
 * disentuh. Kalau tidak disebut, dicoba /sitemap.xml yang jadi kebiasaan umum.
 */
async function halamanDariSitemap(
  base: URL,
  sitemapDariRobots: string[],
): Promise<string[]> {
  // Urutan: yang disebut sendiri di robots.txt lebih dulu, karena itu jawaban
  // dari pemilik situsnya. Sisanya jalur yang jadi kebiasaan. /wp-sitemap.xml
  // dan /sitemap_index.xml perlu ada: WordPress dan Yoast memakai keduanya dan
  // dua-duanya sangat umum di usaha Indonesia. satudental.com misalnya
  // mengalihkan /sitemap.xml tapi punya /wp-sitemap.xml.
  const dicoba = [
    ...sitemapDariRobots.slice(0, 3),
    new URL("/sitemap.xml", base).toString(),
    new URL("/wp-sitemap.xml", base).toString(),
    new URL("/sitemap_index.xml", base).toString(),
  ];

  const alamat: string[] = [];

  for (const s of [...new Set(dicoba)]) {
    const xml = await ambilTeks(s);
    if (!xml) continue;

    let daftar = alamatDariSitemap(xml);
    if (daftar.length === 0) continue;

    // Sitemap yang isinya sitemap lain: buka satu lapis, jangan lebih.
    if (sitemapBerisiSitemap(xml)) {
      const dalam: string[] = [];
      for (const anak of daftar.slice(0, 3)) {
        const isi = await ambilTeks(anak);
        if (isi) dalam.push(...alamatDariSitemap(isi));
      }
      daftar = dalam;
    }

    alamat.push(...daftar);
    if (alamat.length >= 200) break;
  }

  return [...new Set(alamat)].filter((u) => {
    let url: URL;
    try {
      url = new URL(u);
    } catch {
      return false;
    }
    if (url.hostname.replace(/^www\./, "") !== base.hostname.replace(/^www\./, "")) {
      return false;
    }
    if (url.pathname === "/" || url.pathname === base.pathname) return false;
    if (SKIP_EXT.test(url.pathname) || SKIP_WORDS.test(url.pathname)) return false;
    return true;
  });
}

/** Urutkan alamat: yang namanya menjanjikan fakta bisnis didahulukan. */
function urutkanMenurutJanji(alamat: string[]): string[] {
  return alamat
    .map((u) => {
      let nilai = 0;
      const jalur = decodeURIComponent(new URL(u).pathname).toLowerCase();
      for (const [pola, poin] of USEFUL_WORDS) if (pola.test(jalur)) nilai += poin;
      // Halaman yang terlalu dalam biasanya artikel, bukan info bisnis.
      nilai -= (jalur.split("/").filter(Boolean).length - 1) * 2;
      return { u, nilai };
    })
    .sort((a, b) => b.nilai - a.nilai)
    .map((x) => x.u);
}

export interface CrawlResult {
  siteTitle: string;
  pages: ScrapedPage[];
  totalChars: number;
  /** Panennya terlalu tipis untuk dipercaya, biasanya situs yang butuh browser. */
  tipis: boolean;
  rataRataHuruf: number;
}

/**
 * Ambil halaman utama lalu beberapa halaman turunannya yang paling menjanjikan.
 * `onEvent` dipanggil di tiap langkah supaya pengguna melihat prosesnya jalan.
 */
export async function crawlSite(
  input: string,
  onEvent: CrawlEvent,
  // Naik dari 6 ke 10 waktu penemuan lewat sitemap dipasang (2026-08-03).
  // Sebelumnya halaman lain cuma ketemu dari tag <a> di halaman depan, dan
  // jarang ada lebih dari beberapa yang layak. Sekarang sitemap bisa menyodorkan
  // puluhan: audydental.com punya 24, dan dengan jatah 6 halaman Dokter,
  // Lokasi, dan Promo tidak pernah kebagian tempat.
  //
  // Yang membatasi biaya sebenarnya bukan angka ini tapi MAX_TOTAL_CHARS 40.000
  // di atas, yang tetap berlaku. Angka ini cuma menentukan seberapa banyak
  // halaman berbeda yang boleh ikut mengisi jatah huruf itu.
  maxPages = 10,
): Promise<CrawlResult> {
  const base = normalizeUrl(input);
  const pages: ScrapedPage[] = [];
  let totalChars = 0;
  /** Berapa alamat yang ternyata mengembalikan halaman depan yang sama. */
  let kembaranDepan = 0;

  onEvent({ type: "step", text: `Membuka ${base.hostname}` });

  let homeHtml: string;
  try {
    const dibuka = await bukaHalamanDepan(base.toString());
    homeHtml = dibuka.html;
    if (dibuka.galatAwal) {
      onEvent({
        type: "step",
        text: `Alamat https-nya tidak menjawab, dibuka lewat http dan berhasil`,
      });
    }
  } catch (err) {
    // Sebelum menyimpulkan situsnya mati, ketuk pintu yang lain. robots.txt
    // berkas kecil dan hampir selalu ada; kalau DIA menjawab, servernya jelas
    // hidup dan yang terjadi adalah halamannya sengaja tidak diberikan ke
    // robot. Cuma dijalankan di jalur gagal, jadi tidak menambah beban
    // penelusuran yang berhasil.
    const serverHidup =
      (await ambilTeks(new URL("/robots.txt", base).toString(), 8_000)) !== null;

    throw new Error(
      jelaskanGagalBuka(
        base.hostname,
        err instanceof Error ? err.message : "tidak bisa dibuka",
        serverHidup,
      ),
    );
  }

  const siteTitle = extractTitle(homeHtml) || base.hostname;
  const homeText = potongRapi(tulisanHalaman(homeHtml), MAX_CHARS_PER_PAGE);

  pages.push({
    url: base.toString(),
    title: siteTitle,
    text: homeText,
    chars: homeText.length,
  });
  totalChars += homeText.length;

  onEvent({
    type: "page",
    url: base.toString(),
    title: siteTitle,
    chars: homeText.length,
    ok: homeText.length > 100,
    note: homeText.length <= 100 ? "hampir tidak ada tulisan" : undefined,
  });

  // robots.txt dibaca CUMA untuk mengambil alamat sitemapnya. Baris Disallow
  // sengaja tidak membatasi penelusuran; alasan lengkapnya ada di aturanRobots
  // di packages/db/src/teks.ts.
  const robotsTxt = await ambilTeks(new URL("/robots.txt", base).toString());
  const { sitemap } = robotsTxt ? aturanRobots(robotsTxt) : { sitemap: [] as string[] };

  let links = pickInternalLinks(homeHtml, base, maxPages - 1);

  // Sitemap dipakai sebagai PENAMBAL, bukan pengganti.
  //
  // Kenapa tidak sitemap saja. Tautan di halaman depan itu pilihan pemilik
  // situs sendiri tentang halaman mana yang penting, dan mengambilnya tidak
  // perlu permintaan tambahan. Sitemap sering memuat ratusan artikel blog yang
  // justru menenggelamkan halaman harga.
  //
  // Kenapa sitemap tetap perlu. Situs yang menunya digambar browser tidak
  // punya satu pun tag <a> di berkasnya. Diukur di audydental.com 2026-08-03:
  // nol tautan ketemu, padahal sitemap-nya memuat 24 halaman termasuk About,
  // Services, dan Locations. Dan sitemap tidak selalu ada: dari 9 situs yang
  // diperiksa, cuma 4 yang menyebutnya di robots.txt, indofood.com menjawab
  // 200 untuk tiga jalur sitemap yang semuanya halaman error, dan pik2.com
  // menjawab 500. Jadi dua-duanya dipakai, dan tidak ada yang diandalkan
  // sendirian.
  if (links.length < maxPages - 1) {
    if (links.length === 0) {
      onEvent({ type: "step", text: "Tidak ada tautan di halamannya, mencoba sitemap" });
    }
    const dariSitemap = await halamanDariSitemap(base, sitemap);
    const baru = urutkanMenurutJanji(dariSitemap).filter((u) => !links.includes(u));
    if (baru.length) {
      const sebelum = links.length;
      links = [...links, ...baru].slice(0, maxPages - 1);
      onEvent({
        type: "step",
        text: `Sitemap memuat ${dariSitemap.length} halaman, ${links.length - sebelum} di antaranya ikut dibaca`,
      });
    }
  }

  if (links.length === 0) {
    onEvent({
      type: "step",
      text: "Tidak ada halaman lain yang menjanjikan, pakai halaman utama saja",
    });
  } else {
    onEvent({
      type: "step",
      text: `${links.length} halaman lain akan dibaca`,
    });
  }

  for (const link of links) {
    if (totalChars >= MAX_TOTAL_CHARS) {
      onEvent({ type: "step", text: "Sudah cukup banyak, penelusuran dihentikan" });
      break;
    }

    const short = new URL(link).pathname || "/";
    onEvent({ type: "step", text: `Membaca ${short}` });

    try {
      const html = await fetchHtml(link);
      const text = potongRapi(tulisanHalaman(html), MAX_CHARS_PER_PAGE);

      // Halaman yang sama di dua alamat berbeda: lewati.
      //
      // Ditemukan di midtrans.com 2026-08-07. Halaman Payment Link ada di
      // /id/produk/payment-link (Indonesia) DAN di /product/payment-link
      // (Inggris), judulnya sama persis. Yang bahasa Inggris memakan 8.692
      // huruf, hampir seperlima jatah, lalu penelusurannya berhenti di 6
      // halaman karena jatah hurufnya habis. Jadi halaman lain yang belum
      // pernah dibaca kehilangan tempat gara-gara isi yang sudah kita punya.
      //
      // Yang dipakai JUDUL, bukan penanda bahasa. Sempat dicoba menyaring
      // lewat <html lang>, dan itu keliru besar di situs Indonesia: midtrans
      // /pricing menulis lang="en" padahal isinya Indonesia, begitu juga
      // haraldbarbershop.com, audydental.com, dan kopikenangan.com yang
      // semuanya lang="en-US" karena bawaan WordPress tidak pernah diganti.
      // Menyaring dengan penanda itu justru membuang halaman harga, halaman
      // paling berharga di situs mana pun.
      //
      // Dua halaman yang benar-benar berbeda hampir tidak pernah berjudul
      // sama, jadi risiko salah buang kecil. Tetap diberitahukan, tidak
      // dibuang diam-diam.
      const judulHalaman = extractTitle(html) || short;
      const kembar = pages.find(
        (p) => p.title && p.title.toLowerCase() === judulHalaman.toLowerCase(),
      );
      if (kembar) {
        // Kembaran halaman DEPAN dihitung terpisah. Satu dua halaman kembar
        // itu biasa (alamat lama, versi bahasa lain). Tapi kalau hampir semua
        // alamat mengembalikan halaman depan yang sama, artinya servernya
        // mengirim kerangka yang sama untuk alamat apa pun, dan seluruh isinya
        // baru digambar browser.
        if (kembar.url === base.toString()) kembaranDepan++;
        onEvent({
          type: "page",
          url: link,
          title: judulHalaman,
          chars: text.length,
          ok: false,
          note: `isinya sama dengan ${new URL(kembar.url).pathname}, dilewati`,
        });
        continue;
      }

      if (text.length < 120) {
        onEvent({
          type: "page",
          url: link,
          title: extractTitle(html) || short,
          chars: text.length,
          ok: false,
          note: "hampir kosong, dilewati",
        });
        continue;
      }

      pages.push({
        url: link,
        title: extractTitle(html) || short,
        text,
        chars: text.length,
      });
      totalChars += text.length;

      onEvent({
        type: "page",
        url: link,
        title: extractTitle(html) || short,
        chars: text.length,
        ok: true,
      });
    } catch (err) {
      onEvent({
        type: "page",
        url: link,
        title: short,
        chars: 0,
        ok: false,
        note: err instanceof Error ? err.message : "gagal dibuka",
      });
    }
  }

  // Panen yang terlalu tipis harus disebut, bukan diterima diam-diam.
  //
  // Ditemukan waktu menyapu situs bisnis Indonesia 2026-08-03:
  // sepatucompass.com memberi 6 halaman tapi cuma 1.361 huruf, sekitar 227
  // huruf per halaman. Itu ciri situs yang isinya baru digambar oleh browser,
  // jadi yang terbaca cuma kerangkanya. Prosesnya kelihatan sukses, catatannya
  // tersimpan, dan asistennya diam-diam tidak tahu apa-apa soal produknya.
  // Tiga tanda, dan ketiganya perlu karena masing-masing menangkap kasus yang
  // lolos dari yang lain.
  const rataRata = pages.length ? Math.round(totalChars / pages.length) : 0;

  // 1. Rata-rata tipis. Menangkap situs yang halamannya banyak tapi isinya
  //    cuma kerangka.
  const rataTipis = pages.length > 0 && rataRata < 400;

  // 2. Panen keseluruhan tipis. Ditemukan di sociolla.com 2026-08-07: setelah
  //    kembarannya dibuang cuma tersisa SATU halaman berisi 409 huruf, dan 409
  //    lolos dari ambang rata-rata karena cuma lebih 9 huruf. Untuk sebuah
  //    website utuh, empat ratus huruf itu jelas tidak cukup apa pun
  //    rata-ratanya.
  const totalTipis = pages.length > 0 && totalChars < 2_000;

  // 3. Hampir semua alamat mengembalikan halaman depan. Ini tanda paling
  //    meyakinkan dan tidak bergantung ambang angka sama sekali: servernya
  //    memang mengirim kerangka yang sama untuk alamat apa pun.
  const semuaKerangka = kembaranDepan >= 3;

  const tipis = rataTipis || totalTipis || semuaKerangka;
  if (tipis) {
    const sebab = semuaKerangka
      ? `${kembaranDepan} halaman yang dibuka isinya sama persis dengan halaman depan, jadi websitenya mengirim kerangka yang sama untuk alamat apa pun`
      : `yang terbaca cuma ${totalChars.toLocaleString("id-ID")} huruf dari ${pages.length} halaman`;
    onEvent({
      type: "step",
      text: `Isi websitenya hampir tidak terbaca: ${sebab}. Website yang isinya baru muncul setelah dijalankan di browser memang tidak bisa diambil dari luar. Periksa hasilnya baik-baik, kalau kosong salin tempel manual lewat "Ketik sendiri".`,
    });
  }

  return { siteTitle, pages, totalChars, tipis, rataRataHuruf: rataRata };
}

/** Gabungkan hasil telusur jadi satu teks mentah, siap dirapikan AI. */
export function combinePages(pages: ScrapedPage[]): string {
  const gabung = pages
    .map((p) => `## ${p.title}\n(${p.url})\n\n${p.text}`)
    .join("\n\n---\n\n");
  return potongRapi(gabung, MAX_TOTAL_CHARS);
}
