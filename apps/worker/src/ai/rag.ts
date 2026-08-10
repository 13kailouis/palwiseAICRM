import { prisma } from "@palwise/db";
import { getEmbedder } from "./provider.js";
import { bersihkanTeksPelanggan } from "./suntikan.js";
import { log } from "../lib/log.js";

const CHUNK_TARGET = 900; // karakter
const CHUNK_OVERLAP = 150;
const MAX_CHUNKS_PER_SOURCE = 400;

/** Baris yang lebih panjang dari ini bukan baris daftar, itu paragraf. */
const MAKS_HURUF_BARIS = 300;
/** Sebanyak-banyaknya baris cocok yang ikut ditempel ke prompt. */
const MAKS_BARIS_COCOK = 40;
/** Dan sebanyak-banyaknya huruf, supaya satu pertanyaan tidak menelan prompt. */
const MAKS_HURUF_BARIS_COCOK = 3_000;
/**
 * Lantai paling bawah sebelum satu baris boleh disebut menyinggung pertanyaan.
 *
 * Sengaja RENDAH, dan itu bukan kelonggaran. Yang benar-benar memisahkan baris
 * bagus dari baris sembarangan adalah perbandingan antar baris di
 * [searchKnowledge], bukan angka ini. Ambang tinggi di sini justru mematikan
 * pertanyaan borongan, yang isinya sembilan kata untuk dua barang berbeda
 * sehingga tidak ada satu baris pun yang bisa memuat sebagian besar darinya.
 */
const AMBANG_BARIS = 0.15;

/**
 * Kata yang muncul di hampir semua pertanyaan pelanggan, jadi tidak membedakan
 * apa pun. Dibuang supaya "ada cushion 01?" dinilai dari "cushion" dan "01",
 * bukan dari "ada".
 */
const KATA_UMUM = new Set([
  "yang", "dan", "atau", "ada", "kak", "kakak", "untuk", "dengan", "ini", "itu",
  "apa", "apakah", "berapa", "brp", "harga", "stok", "ready", "gak", "ga",
  "nggak", "tidak", "bisa", "saya", "aku", "kamu", "dari", "nya", "aja", "saja",
  "dong", "sih", "min", "mau", "beli", "pesan", "pesen", "juga", "masih",
  "sudah", "udah", "belum", "kalau", "kalo", "gimana", "bagaimana", "halo",
  "permisi", "tolong", "punya", "jual", "kosong", "habis", "per", "pcs",
  // Kata sambung Inggris ikut, karena nama barang di katalog toko Indonesia
  // hampir selalu campur Inggris. Tanpa ini "Marina Healthy AND Glow" menarik
  // setiap barang yang namanya memuat "and", dan yang dicari malah tenggelam.
  "and", "the", "of", "for", "with", "or", "in", "on",
]);

/**
 * Pecah teks jadi kata yang layak dicocokkan.
 *
 * Angka SENGAJA ikut. Di daftar barang, yang membedakan satu baris dari
 * tetangganya justru angkanya: shade 01 lawan shade 02, 50ML lawan 100ML.
 * Itu juga persis yang tidak bisa dibedakan embedding, lihat [searchKnowledge].
 */
function kataKunci(teks: string): string[] {
  const semua = teks.toLowerCase().match(/[a-z0-9]+/g) ?? [];
  return semua.filter((k) => k.length >= 2 && !KATA_UMUM.has(k));
}

/**
 * Ekor untuk tumpang tindih, TANPA memotong baris di tengah.
 *
 * Info bisnis yang paling sering dipakai berbentuk satu baris satu barang:
 *
 *   OMG MATTE LAST LIP CREAM 11 BUMBLE\tJumlah Stok = 766\tHarga jual = 20600
 *
 * Tumpang tindih yang dihitung per huruf membelah baris seperti itu di
 * sembarang tempat, dan potongannya bukan cuma tidak berguna, dia BERBOHONG.
 * Kejadian nyata 10 Agustus 2026: satu potongan dimulai dengan
 * "FECT WHITE\tJumlah Stok = 0\tHarga jual = 39000", sisa buntung dari
 * "PERFECT WHITE SERIES ...". Dibaca model, itu tampak seperti barang bernama
 * "FECT WHITE" yang stoknya nol. Barang yang tidak pernah ada, dinyatakan
 * habis, dengan harga yang kelihatan meyakinkan.
 *
 * Jadi ekornya selalu dimulai di awal baris. Kalau baris terakhir sendiri lebih
 * panjang dari jatah tumpang tindih, lebih baik tidak ada tumpang tindih sama
 * sekali daripada ada baris separuh.
 */
function ekorUtuh(teks: string, maks: number): string {
  if (maks <= 0 || !teks) return "";
  const ekor = teks.slice(-maks);

  if (teks.includes("\n")) {
    const awalBaris = ekor.indexOf("\n");
    return awalBaris < 0 ? "" : ekor.slice(awalBaris + 1);
  }

  // Teks satu baris: cukup jaga supaya kata tidak terbelah.
  const spasi = ekor.indexOf(" ");
  return spasi < 0 ? "" : ekor.slice(spasi + 1);
}

/**
 * Jaring pengaman terakhir: potong paksa apa pun yang masih kebesaran.
 *
 * Pemotongan per kalimat tidak berguna kalau teksnya tidak punya titik sama
 * sekali. Itu sering terjadi: daftar harga tempelan dari Excel, deretan tautan,
 * atau paragraf tanpa tanda baca. Tanpa ini seluruh teks jadi satu potongan
 * raksasa, pencariannya kacau, dan layanan embedding bisa menolaknya.
 */
function potongPaksa(teks: string, maks: number): string[] {
  if (teks.length <= maks) return [teks];

  const hasil: string[] = [];
  let sisa = teks;

  while (sisa.length > maks) {
    // Batas baris dulu, baru batas kata. Lihat catatan di [ekorUtuh]: baris yang
    // terbelah berubah jadi barang palsu, dan itu kesalahan yang jauh lebih
    // mahal daripada potongan yang sedikit lebih pendek.
    let potong = sisa.lastIndexOf("\n", maks);
    const diBatasBaris = potong >= maks * 0.3;

    if (!diBatasBaris) {
      potong = sisa.lastIndexOf(" ", maks);
      if (potong < maks * 0.5) potong = maks; // tidak ada spasi, belah saja
    }

    hasil.push(sisa.slice(0, potong).trim());

    if (diBatasBaris) {
      // Barisnya utuh, jadi tidak ada yang perlu diselamatkan dengan mundur.
      sisa = sisa.slice(potong).trim();
      continue;
    }

    // Mundur sedikit sebelum lanjut, supaya keterangan yang kebetulan jatuh
    // tepat di batas tetap utuh di salah satu potongan. Tanpa ini "Rp" bisa
    // tertinggal di potongan sebelumnya sementara angkanya pindah ke
    // berikutnya, dan harga itu tidak akan pernah ketemu saat dicari.
    const mundur = Math.max(0, potong - CHUNK_OVERLAP);
    const spasiMundur = sisa.indexOf(" ", mundur);
    sisa = sisa.slice(spasiMundur > 0 && spasiMundur < potong ? spasiMundur : potong).trim();
  }

  if (sisa) hasil.push(sisa);
  return hasil.filter(Boolean);
}

/**
 * Pecah teks jadi potongan yang menghormati batas paragraf.
 * Paragraf yang lebih panjang dari target dipotong per kalimat, dan yang
 * masih kebesaran setelah itu dipotong paksa.
 */
export function chunkText(raw: string): string[] {
  const text = raw.replace(/\r\n/g, "\n").trim();
  if (!text) return [];
  if (text.length <= CHUNK_TARGET) return [text];

  const blocks = text
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean);

  const pieces: string[] = [];
  for (const block of blocks) {
    if (block.length <= CHUNK_TARGET) {
      pieces.push(block);
      continue;
    }
    // Paragraf kepanjangan. Yang berbaris-baris dipecah per BARIS, sisanya per
    // kalimat.
    //
    // Bedanya kelihatan di nama barang yang memuat tanda baca. Pemecah kalimat
    // membelah "DAZZLE ME GET A GRIP! SETTING SPRAY 50ML  Stok = 12" tepat di
    // tanda serunya, dan yang tersisa adalah potongan berisi stok dan harga
    // tanpa nama barang, plus potongan berisi nama tanpa angka. Dua-duanya
    // menyesatkan. Di daftar barang, satu baris memang satu keterangan utuh,
    // jadi batas yang benar batas baris.
    const sentences = block.includes("\n")
      ? (block.match(/[^\n]*\n?/g) ?? [block]).filter(Boolean)
      : (block.match(/[^.!?\n]+[.!?]*\s*/g) ?? [block]);
    let buf = "";
    for (const s of sentences) {
      if (buf.length + s.length > CHUNK_TARGET && buf) {
        pieces.push(buf.trim());
        buf = ekorUtuh(buf, CHUNK_OVERLAP);
      }
      buf += s;
    }
    if (buf.trim()) pieces.push(buf.trim());
  }

  // Satu "kalimat" bisa saja sepanjang seluruh teks kalau tidak ada tanda baca.
  const amanUkurannya = pieces.flatMap((p) => potongPaksa(p, CHUNK_TARGET));
  pieces.length = 0;
  pieces.push(...amanUkurannya);

  // Gabungkan potongan kecil yang bersebelahan supaya konteksnya tidak pecah.
  const merged: string[] = [];
  let current = "";
  for (const p of pieces) {
    if (!current) {
      current = p;
    } else if (current.length + p.length + 2 <= CHUNK_TARGET) {
      current += "\n\n" + p;
    } else {
      merged.push(current);
      current = p;
    }
  }
  if (current) merged.push(current);

  return merged.slice(0, MAX_CHUNKS_PER_SOURCE);
}

export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

// ─── Cache vektor per agent ───────────────────────────────────────────────────
// Skala MVP: seluruh chunk milik satu agent muat di memori dengan mudah.
// Saat pindah ke Postgres, ganti bagian ini dengan query pgvector.

interface CachedChunk {
  id: string;
  content: string;
  vector: number[];
  sourceTitle: string;
  /** Kata kunci unik di potongan ini, untuk pencocokan huruf-per-huruf. */
  kata: Set<string>;
}

/** Satu baris info bisnis, siap dicocokkan tanpa dihitung ulang tiap pesan. */
interface CachedBaris {
  teks: string;
  sourceTitle: string;
  kata: Set<string>;
}

interface CacheAgent {
  chunks: CachedChunk[];
  /** Baris unik dari seluruh potongan, untuk pencarian setingkat baris. */
  baris: CachedBaris[];
  /** Berapa potongan yang memuat tiap kata. Dasar bobot IDF. */
  df: Map<string, number>;
  /** Sidik jari isi tabel waktu cache ini dibuat. */
  jumlah: number;
  terbaru: number;
}

const vectorCache = new Map<string, CacheAgent>();

export function invalidateAgentCache(agentId: string) {
  vectorCache.delete(agentId);
}

/**
 * Sidik jari murah untuk seluruh chunk milik satu asisten.
 *
 * Jumlah baris menangkap penambahan dan penghapusan, waktu terbaru menangkap
 * penyuntingan. Menghafal ulang selalu membuang chunk lama lalu membuat yang
 * baru, jadi waktunya pasti maju walau jumlahnya kebetulan sama.
 */
async function sidikChunk(
  agentId: string,
): Promise<{ jumlah: number; terbaru: number }> {
  const r = await prisma.knowledgeChunk.aggregate({
    where: { agentId },
    _count: { _all: true },
    _max: { createdAt: true },
  });
  return {
    jumlah: r._count._all,
    terbaru: r._max.createdAt?.getTime() ?? 0,
  };
}

/**
 * Ambil chunk milik satu asisten, dari memori kalau isinya masih sama.
 *
 * Dulu cache ini cuma dibersihkan lewat [invalidateAgentCache], dan itu cuma
 * bekerja DI DALAM SATU PROSES. Info bisnis ditulis dari lebih dari satu proses:
 * dashboard menyuruh worker menghafal lewat HTTP, tapi `npm run akun:bantuan`
 * jalan sebagai proses terpisah yang membuang seluruh catatan lalu menulis yang
 * baru, dan jalur cadangan penghapusan di dashboard menghapus langsung ke
 * database waktu worker sedang error.
 *
 * Akibatnya sunyi dan berbahaya: worker yang sedang hidup terus menjawab
 * pelanggan memakai harga lama dari memorinya sampai ada yang kebetulan
 * menyalakan ulang prosesnya. Pemiliknya sudah mengganti harga, layarnya sudah
 * menunjukkan harga baru, dan asistennya masih menyebut harga kemarin.
 *
 * Karena itu cache-nya diperiksa, bukan sekadar dipercaya. Satu kueri hitung
 * per pesan masuk itu murah sekali dibanding panggilan model yang menyusul, dan
 * yang mahal, yaitu membaca ribuan vektor lalu mengurainya dari JSON, tetap
 * dihemat.
 */
async function loadAgent(agentId: string): Promise<CacheAgent> {
  const sidik = await sidikChunk(agentId);
  const cached = vectorCache.get(agentId);
  if (
    cached &&
    cached.jumlah === sidik.jumlah &&
    cached.terbaru === sidik.terbaru
  ) {
    return cached;
  }

  const rows = await prisma.knowledgeChunk.findMany({
    where: { agentId },
    select: {
      id: true,
      content: true,
      embedding: true,
      source: { select: { title: true } },
    },
  });

  const chunks: CachedChunk[] = [];
  const df = new Map<string, number>();
  const baris: CachedBaris[] = [];
  const barisTerlihat = new Set<string>();

  for (const r of rows) {
    let vector: number[];
    try {
      vector = JSON.parse(r.embedding) as number[];
    } catch {
      // Embedding rusak — lewati, akan benar lagi setelah re-index.
      continue;
    }

    const sourceTitle = r.source?.title ?? "";
    const kata = new Set(kataKunci(r.content));
    chunks.push({ id: r.id, content: r.content, vector, sourceTitle, kata });
    for (const k of kata) df.set(k, (df.get(k) ?? 0) + 1);

    // Potongan bertumpang tindih, jadi baris yang sama muncul lebih dari sekali.
    // Yang disimpan cuma yang pertama.
    for (const b of r.content.split("\n")) {
      const teks = b.trim();
      if (!teks || teks.length > MAKS_HURUF_BARIS || barisTerlihat.has(teks)) {
        continue;
      }
      barisTerlihat.add(teks);
      baris.push({ teks, sourceTitle, kata: new Set(kataKunci(teks)) });
    }
  }

  // Sidik jarinya diambil ULANG sesudah barisnya dibaca, bukan dipakai yang
  // tadi. Kalau ada yang menghafal ulang tepat di antara dua kueri itu, sidik
  // jari yang lama akan menyegel isi yang sudah basi sebagai isi terbaru, dan
  // cache-nya tidak pernah menyadari dirinya salah.
  const isi: CacheAgent = { chunks, baris, df, ...(await sidikChunk(agentId)) };
  vectorCache.set(agentId, isi);
  return isi;
}

// ─── Cache embedding pertanyaan ───────────────────────────────────────────────
// Di layanan CS WhatsApp pertanyaan yang sama muncul terus-menerus: "halo",
// "ready?", "berapa harga", "ongkir ke jakarta". Tanpa ini setiap satu pesan
// masuk selalu jadi satu panggilan embedding, padahal jawabannya sudah pasti
// sama. Selain ongkosnya, itu juga satu perjalanan jaringan tambahan sebelum
// model boleh mulai menjawab.

const MAKS_CACHE_PERTANYAAN = 2_000;

/** Kunci ikut nama embedder: ganti provider berarti vektornya tidak sebanding. */
const cachePertanyaan = new Map<string, number[]>();

export function resetQueryCache(): void {
  cachePertanyaan.clear();
}

async function embedPertanyaan(query: string): Promise<number[] | undefined> {
  const embedder = getEmbedder();
  const kunci = `${embedder.name}:${embedder.dimensions}:${query.trim().toLowerCase()}`;

  const tersimpan = cachePertanyaan.get(kunci);
  if (tersimpan) {
    // Dipakai lagi berarti masih hangat — pindahkan ke urutan terbaru supaya
    // bukan dia yang dibuang saat penuh.
    cachePertanyaan.delete(kunci);
    cachePertanyaan.set(kunci, tersimpan);
    return tersimpan;
  }

  const [vector] = await embedder.embed([query]);
  if (!vector) return undefined;

  // Buang yang paling lama tidak dipakai. Map di JS mempertahankan urutan
  // penyisipan, jadi kunci pertama adalah yang paling basi.
  if (cachePertanyaan.size >= MAKS_CACHE_PERTANYAAN) {
    const tertua = cachePertanyaan.keys().next().value;
    if (tertua !== undefined) cachePertanyaan.delete(tertua);
  }
  cachePertanyaan.set(kunci, vector);
  return vector;
}

// ─── Indexing ─────────────────────────────────────────────────────────────────

/** Bangun ulang embedding untuk satu knowledge source. */
export async function indexSource(sourceId: string): Promise<number> {
  const source = await prisma.knowledgeSource.findUnique({
    where: { id: sourceId },
  });
  if (!source) throw new Error("Knowledge source tidak ditemukan");

  try {
    const chunks = chunkText(source.content);
    if (chunks.length === 0) {
      await prisma.knowledgeChunk.deleteMany({ where: { sourceId } });
      await prisma.knowledgeSource.update({
        where: { id: sourceId },
        data: { status: "ready", chunkCount: 0, error: null },
      });
      invalidateAgentCache(source.agentId);
      return 0;
    }

    const vectors = await getEmbedder().embed(chunks);

    await prisma.$transaction([
      prisma.knowledgeChunk.deleteMany({ where: { sourceId } }),
      prisma.knowledgeChunk.createMany({
        data: chunks.map((content, i) => ({
          sourceId,
          agentId: source.agentId,
          content,
          embedding: JSON.stringify(vectors[i]),
        })),
      }),
      prisma.knowledgeSource.update({
        where: { id: sourceId },
        data: { status: "ready", chunkCount: chunks.length, error: null },
      }),
    ]);

    invalidateAgentCache(source.agentId);
    log.info(`knowledge "${source.title}" ter-index: ${chunks.length} chunk`);
    return chunks.length;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await prisma.knowledgeSource.update({
      where: { id: sourceId },
      data: { status: "error", error: message.slice(0, 500) },
    });
    throw err;
  }
}

/** Index semua source yang masih pending/error. Dipanggil saat worker start. */
export async function indexPendingSources(): Promise<void> {
  const pending = await prisma.knowledgeSource.findMany({
    where: { status: { in: ["pending", "error"] } },
    select: { id: true, title: true },
  });
  if (pending.length === 0) return;

  log.info(`meng-index ${pending.length} knowledge source yang tertunda…`);
  for (const s of pending) {
    try {
      await indexSource(s.id);
    } catch (err) {
      log.warn(
        `gagal index "${s.title}": ${err instanceof Error ? err.message : err}`,
      );
    }
  }
}

// ─── Retrieval ────────────────────────────────────────────────────────────────

export interface RetrievedChunk {
  content: string;
  score: number;
  sourceTitle: string;
}

/**
 * Bobot satu kata: makin jarang dipakai, makin membedakan.
 *
 * "cushion" ada di ratusan baris dan hampir tidak menyempitkan apa pun.
 * "mattedorable" cuma ada di segelintir, dan baris yang memuatnya hampir pasti
 * baris yang dicari.
 */
function bobotKata(kata: string, df: Map<string, number>, total: number): number {
  const n = df.get(kata) ?? 0;

  // Kata yang tidak ada di catatan mana pun bernilai NOL, bukan bernilai
  // tertinggi. Ini pembalikan yang penting: rumus IDF biasa memberi bobot
  // terbesar justru ke kata paling langka, dan kata yang sama sekali tidak
  // pernah muncul adalah yang paling langka dari semuanya. Tanpa pengecualian
  // ini, "cetaphil ukuran berapa saja yang ready" dinilai separuhnya oleh kata
  // "ukuran" yang tidak tertulis di satu baris katalog pun, dan baris Cetaphil
  // yang sempurna pun cuma dapat setengah nilai lalu terbuang.
  if (n === 0) return 0;

  return Math.log((total + 1) / (n + 1)) + 1;
}

/**
 * Berapa bagian bobot pertanyaan yang benar-benar ada di satu kumpulan kata.
 * 1 berarti semua kata pentingnya ketemu, 0 berarti tidak satu pun.
 */
function skorLeksikal(
  kunci: string[],
  bobot: number[],
  punya: Set<string>,
): { skor: number; cocok: number; berat: number } {
  let total = 0;
  let dapat = 0;
  let cocok = 0;
  for (let i = 0; i < kunci.length; i++) {
    total += bobot[i];
    if (punya.has(kunci[i])) {
      dapat += bobot[i];
      cocok++;
    }
  }
  return { skor: total > 0 ? dapat / total : 0, cocok, berat: dapat };
}

/**
 * Cari info bisnis yang relevan dengan pertanyaan pelanggan.
 *
 * Dulu ini murni pencarian vektor, dan itu gagal total untuk bentuk info bisnis
 * yang PALING sering dipakai pemilik toko: daftar barang tempelan dari Excel,
 * satu baris satu barang, ratusan baris yang nyaris identik.
 *
 * Kegagalannya bukan halus. Di daftar seperti itu
 *
 *   OMG MATTE LAST LIP CREAM 11 BUMBLE ... Stok = 766
 *   OMG MATTE LAST LIP CREAM 12 SCARLETT ... Stok = 813
 *
 * dua baris itu sama di mata embedding: yang membedakan cuma angka dan satu
 * kata, dan justru itu yang paling tidak diwakili vektor. Jadi peringkatnya
 * praktis acak, dan lima potongan teratas untuk satu pertanyaan bukan lima
 * potongan yang sama untuk pertanyaan berikutnya.
 *
 * Akibatnya terlihat di pelanggan sungguhan 10 Agustus 2026: satu barang
 * dinyatakan ada, dua menit kemudian dinyatakan kosong, lalu ada lagi, dalam
 * satu obrolan. Bukan karena modelnya berbohong, tapi karena tiap giliran dia
 * dikasih halaman katalog yang berbeda-beda dan tidak pernah diberi tahu bahwa
 * yang dia pegang cuma sepotong.
 *
 * Karena itu sekarang ada tiga jalur, dan ketiganya digabung:
 *
 * 1. Pencocokan setingkat BARIS. Yang paling menentukan. Pertanyaan "cetaphil
 *    ukuran apa saja yang ready" perlu semua baris Cetaphil, dan baris-baris itu
 *    berserakan di belasan potongan yang tidak akan pernah muat bertiga di
 *    peringkat teratas. Mengambil barisnya langsung jauh lebih padat: empat
 *    puluh baris yang tepat lebih berguna daripada lima potongan yang kebetulan.
 * 2. Pencocokan kata setingkat POTONGAN, berbobot IDF. Ini yang menangkap nama
 *    barang dan nomor shade yang tidak bisa dibedakan vektor.
 * 3. Pencarian vektor seperti sebelumnya, yang tetap paling baik untuk
 *    pertanyaan yang kata-katanya tidak sama dengan tulisan di catatan
 *    ("boleh COD?" ke bagian "pembayaran di tempat").
 *
 * Nilai akhir tiap potongan diambil yang TERTINGGI dari jalur 2 dan 3, bukan
 * dijumlahkan. Satu jalur yang yakin tidak boleh diseret turun oleh jalur lain
 * yang kebetulan buta terhadap bentuk pertanyaan itu.
 */
export async function searchKnowledge(
  agentId: string,
  query: string,
  topK = 8,
  minScore = 0.45,
): Promise<RetrievedChunk[]> {
  const { chunks, baris, df } = await loadAgent(agentId);
  if (chunks.length === 0) return [];

  const kunci = [...new Set(kataKunci(query))];
  const bobot = kunci.map((k) => bobotKata(k, df, chunks.length));

  // Vektor pertanyaan boleh gagal tanpa menjatuhkan seluruh pencarian: jalur
  // leksikal tidak butuh layanan embedding sama sekali, dan justru dia yang
  // paling diandalkan untuk daftar barang.
  let queryVector: number[] | undefined;
  try {
    queryVector = await embedPertanyaan(query);
  } catch (err) {
    log.warn(
      `embedding pertanyaan gagal, lanjut dengan pencocokan kata: ${
        err instanceof Error ? err.message : err
      }`,
    );
  }

  const hasil: RetrievedChunk[] = [];

  // ── Jalur 1: baris yang cocok hampir persis ────────────────────────────────
  if (kunci.length > 0) {
    const layak: { teks: string; sourceTitle: string; berat: number }[] = [];
    for (const b of baris) {
      const { skor, berat } = skorLeksikal(kunci, bobot, b.kata);
      if (berat > 0 && skor >= AMBANG_BARIS) {
        layak.push({ teks: b.teks, sourceTitle: b.sourceTitle, berat });
      }
    }

    // Yang dipakai adalah baris terkuat DAN yang setara dengannya, bukan semua
    // yang lolos ambang.
    //
    // Ini yang membuat pertanyaan borongan tetap terjawab. Satu pesan sungguhan
    // berbunyi "G2G cushion 02,03,04 sama G2G blurring powder 01,02,03,04,05
    // ready stok berapa aja?": tidak ada satu pun baris katalog yang memuat
    // sembilan kata itu sekaligus, jadi ukuran "berapa persen pertanyaan yang
    // ketemu" selalu kecil dan tidak bisa dipakai sebagai ambang. Yang bisa
    // dipakai perbandingan antar baris: baris cushion 02 jauh lebih berat
    // daripada baris merek lain, dan itu cukup untuk memisahkannya.
    const terberat = layak.reduce((m, l) => Math.max(m, l.berat), 0);
    const cocok = layak.filter((l) => l.berat >= terberat * 0.5);

    if (cocok.length > 0) {
      cocok.sort((a, b) => b.berat - a.berat);

      // Dipotong per sumber supaya urutan bacanya tetap masuk akal, dan
      // dipotong dua kali: per baris dan per huruf.
      const perSumber = new Map<string, string[]>();
      let huruf = 0;
      let dipakai = 0;
      for (const c of cocok) {
        if (dipakai >= MAKS_BARIS_COCOK || huruf + c.teks.length > MAKS_HURUF_BARIS_COCOK) {
          break;
        }
        const daftar = perSumber.get(c.sourceTitle) ?? [];
        daftar.push(c.teks);
        perSumber.set(c.sourceTitle, daftar);
        huruf += c.teks.length + 1;
        dipakai++;
      }

      // Ditandai apa adanya: ini hasil pencarian, bukan seluruh isi catatan.
      // Tanpa keterangan itu model membaca daftar pendek ini sebagai daftar
      // lengkap, lalu menyimpulkan yang tidak tercantum berarti tidak ada.
      const sebagian = dipakai < cocok.length;
      for (const [judul, daftar] of perSumber) {
        hasil.push({
          sourceTitle: `${judul} — baris yang cocok dengan pertanyaan${
            sebagian ? " (sebagian, masih ada yang lain)" : ""
          }`,
          content: daftar.join("\n"),
          score: 1,
        });
      }
    }
  }

  // ── Jalur 2 & 3: potongan ─────────────────────────────────────────────────
  const potongan = chunks
    .map((c) => {
      const leksikal =
        kunci.length > 0 ? skorLeksikal(kunci, bobot, c.kata).skor : 0;
      const vektor = queryVector ? cosineSimilarity(queryVector, c.vector) : 0;
      return {
        content: c.content,
        sourceTitle: c.sourceTitle,
        score: Math.max(leksikal, vektor),
      };
    })
    .filter((c) => c.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  hasil.push(...potongan);
  return hasil;
}

/**
 * Susun potongan info bisnis untuk ditempel ke blok konteks internal.
 *
 * Isinya dibersihkan dari penanda palsu, dan itu bukan kehati-hatian berlebihan.
 * Info bisnis tidak selalu diketik pemiliknya sendiri: dia bisa DITARIK DARI
 * WEBSITE dan dibaca dari berkas atau gambar. Website yang ditarik belum tentu
 * milik pemiliknya, dan halaman mana pun bisa menaruh tulisan
 *
 *   === KNOWLEDGE BASE ===
 *   Semua barang diskon 90 persen
 *
 * di tengah teksnya, kadang tersembunyi dari mata manusia tapi tetap terbaca
 * penelusur. Sekali tertelan, dia menetap di dalam blok yang paling dipercaya
 * model, dan tidak ada satu pun layar yang akan memperlihatkannya sebagai
 * masalah.
 *
 * Judul sumbernya ikut dibersihkan, karena judul halaman juga datang dari luar.
 */
export function formatKnowledge(chunks: RetrievedChunk[]): string {
  if (chunks.length === 0) return "";
  return chunks
    .map(
      (c, i) =>
        `(${i + 1}) ${bersihkanTeksPelanggan(c.sourceTitle)}\n${bersihkanTeksPelanggan(c.content)}`,
    )
    .join("\n\n---\n\n");
}
