import fs from "node:fs";
import path from "node:path";
import express, { type Request, type Response } from "express";
import { getPlan, prisma } from "@palwise/db";

import { env, aiConfigured } from "./env.js";
import { log } from "./lib/log.js";
import { bus } from "./lib/bus.js";
import { describeProviders, getLlm } from "./ai/provider.js";
import { indexSource, invalidateAgentCache } from "./ai/rag.js";
import {
  appendMessage,
  getOrCreateContact,
  getOrCreateConversation,
  runAgentOnConversation,
} from "./core/conversation.js";
import { pilihSikap, ringkasSikap, type LabelRasa } from "@palwise/rasa";
import {
  ambilJatahTanya,
  getQuota,
  kembalikanJatahTanya,
  pesanJatahTanya,
} from "./core/quota.js";
import { ringkasPelanggan } from "./core/ringkasan.js";
import { jalankanTanya, judulDariPesan, type Usul } from "./ai/tanya.js";
import {
  channelRuntimeStatus,
  isChannelConnected,
  kirimBerkasKeObrolan,
  sendToConversation,
  startChannel,
  stopChannel,
} from "./wa/manager.js";
import {
  runAfterSalesTick,
  runFollowUpTick,
  runPengingatTick,
} from "./jobs/followup.js";

export const router = express.Router();

/** Semua endpoint (kecuali /health & /media) dipanggil dari server Next.js. */
function requireInternalToken(req: Request, res: Response, next: () => void) {
  const token = req.header("x-internal-token");
  if (token !== env.INTERNAL_TOKEN) {
    res.status(401).json({ error: "Token internal tidak valid" });
    return;
  }
  next();
}

function fail(res: Response, err: unknown, status = 500) {
  const message = err instanceof Error ? err.message : String(err);
  log.error(message);
  res.status(status).json({ error: message });
}

// ─── Publik ───────────────────────────────────────────────────────────────────

router.get("/health", (_req, res) => {
  res.json({
    ok: true,
    ai: describeProviders(),
    aiConfigured: aiConfigured(),
  });
});

// ─── Terproteksi ──────────────────────────────────────────────────────────────

router.use(requireInternalToken);

/**
 * Foto dan pesan suara dari pelanggan.
 *
 * Dulu endpoint ini terbuka, jadi siapa pun yang bisa menjangkau porta worker
 * bisa mengunduh lampiran pelanggan hanya dengan menebak nama berkasnya.
 * Sekarang hanya dashboard yang boleh, dan dashboard sendiri masih memeriksa
 * apakah berkas itu memang milik akun yang sedang login.
 */
router.get("/media/:filename", (req, res) => {
  const name = path.basename(req.params.filename);
  const file = path.join(env.MEDIA_DIR, name);
  if (!fs.existsSync(file)) {
    res.status(404).end();
    return;
  }
  res.sendFile(file);
});

// Channel WhatsApp -----------------------------------------------------------

router.post("/channels/:id/start", async (req, res) => {
  try {
    await startChannel(req.params.id);
    const channel = await prisma.channel.findUnique({ where: { id: req.params.id } });
    res.json({ ok: true, status: channel?.status, qr: channel?.lastQr });
  } catch (err) {
    fail(res, err);
  }
});

router.post("/channels/:id/stop", async (req, res) => {
  try {
    await stopChannel(req.params.id, req.body?.logout === true);
    res.json({ ok: true });
  } catch (err) {
    fail(res, err);
  }
});

router.get("/channels/:id/status", async (req, res) => {
  try {
    const channel = await prisma.channel.findUnique({ where: { id: req.params.id } });
    if (!channel) {
      res.status(404).json({ error: "Channel tidak ditemukan" });
      return;
    }
    res.json({
      status: channel.status,
      runtimeStatus: channelRuntimeStatus(channel.id),
      qr: channel.lastQr,
      phoneNumber: channel.phoneNumber,
      error: channel.lastError,
      connected: isChannelConnected(channel.id),
    });
  } catch (err) {
    fail(res, err);
  }
});

// Knowledge base -------------------------------------------------------------

router.post("/knowledge/:id/index", async (req, res) => {
  try {
    const count = await indexSource(req.params.id);
    res.json({ ok: true, chunkCount: count });
  } catch (err) {
    fail(res, err);
  }
});

router.post("/knowledge/:id/delete", async (req, res) => {
  try {
    const source = await prisma.knowledgeSource.findUnique({
      where: { id: req.params.id },
    });
    if (!source) {
      res.status(404).json({ error: "Sumber tidak ditemukan" });
      return;
    }
    await prisma.knowledgeSource.delete({ where: { id: source.id } });
    invalidateAgentCache(source.agentId);
    res.json({ ok: true });
  } catch (err) {
    fail(res, err);
  }
});

// Merapikan hasil telusur website ------------------------------------------

const TIDY_PROMPT = `Kamu merapikan hasil salinan halaman website menjadi catatan info bisnis yang akan dipakai customer service.

ATURAN WAJIB
1. JANGAN menambah fakta apa pun yang tidak ada di teks sumber. Dilarang menebak harga, jam buka, atau kebijakan.
2. Salin angka, harga, nama produk, dan nama paket PERSIS seperti aslinya.
3. Salin SEMUA produk dan layanan yang disebut di sumber. Daftar yang panjang
   tetap ditulis lengkap. Dilarang memotong dengan "dan lain-lain" atau
   mengambil beberapa contoh saja.
4. Buang menu navigasi, tombol, teks tombol cookie, hak cipta, dan tulisan berulang.
5. Buang ajakan pemasaran yang tidak memuat fakta, misalnya "solusi terbaik untuk Anda".
6. Tulis dalam Bahasa Indonesia.
7. Kalau suatu bagian tidak ada datanya di sumber, jangan tulis bagian itu sama sekali.
8. GABUNGKAN yang sama. Bahan ini berasal dari beberapa halaman yang isinya
   sering bertumpang tindih, jadi satu produk bisa muncul di beberapa bagian
   sumber. Tulis tiap produk, layanan, harga, dan aturan CUKUP SEKALI, di satu
   tempat yang paling masuk akal. Dilarang membuat dua daftar berisi barang
   yang sama dengan susunan berbeda. Kalau satu produk punya keterangan
   tambahan seperti ukuran atau stok, satukan ke baris produk itu, jangan
   dibuat daftar terpisah.
9. Kalau dua halaman menyebut angka yang BERBEDA untuk hal yang sama, tulis
   keduanya dan sebutkan bahwa sumbernya berbeda. Jangan memilih diam-diam.

TENTANG PASAL HUKUM
- SIMPAN aturan yang dirasakan pembeli: garansi, retur, pengembalian dana,
  ongkos kirim, lama pengiriman, cara bayar, minimal pesanan, dan untuk usaha
  jasa: syarat pendaftaran, aturan pembatalan dan penjadwalan ulang, uang muka,
  lama pengerjaan, apa yang perlu dibawa atau disiapkan pelanggan.
- BUANG pasal yang cuma melindungi perusahaan: batasan tanggung jawab, hukum
  yang berlaku, penyelesaian sengketa, hak mengubah ketentuan sewaktu-waktu,
  hak kekayaan intelektual. Tidak ada pelanggan yang menanyakan itu lewat
  WhatsApp, dan kalau ikut tersimpan dia bersaing dengan jawaban yang benar
  benar dicari.

BENTUK KELUARAN
Teks biasa dengan judul bagian huruf kapital.

PILIH JUDUL BAGIAN YANG COCOK DENGAN USAHANYA, jangan dipaksakan. Situs klinik,
hotel, salon, bengkel, sekolah, dan penjual jasa tidak punya "pengiriman", dan
memaksakan judul itu bikin catatannya berisi bagian kosong yang menyesatkan.
Judul yang biasa dipakai: TENTANG, PRODUK DAN HARGA, LAYANAN DAN TARIF, PAKET,
MENU, JADWAL DAN JAM BUKA, TIM ATAU TENAGA AHLI, LOKASI DAN CABANG, CARA PESAN,
CARA DAFTAR ATAU BOOKING, PENGIRIMAN, SYARAT DAN KETENTUAN,
PERTANYAAN YANG SERING DITANYA, KONTAK.

Contoh bentuknya:

TENTANG
Satu paragraf singkat tentang usahanya.

LAYANAN DAN TARIF
- Nama layanan, harga, keterangan singkat

CARA DAFTAR ATAU BOOKING
- langkah-langkahnya

PERTANYAAN YANG SERING DITANYA
T: ...
J: ...

KONTAK
...

Keluarkan catatannya saja, tanpa kalimat pembuka atau penutup.`;

const CONDENSE_PROMPT = `Kamu memadatkan salinan satu bagian dokumen atau halaman web menjadi poin-poin fakta.

ATURAN
1. JANGAN menambah apa pun yang tidak ada di teks sumber.
2. Salin angka, harga, nama produk, dan nama paket PERSIS seperti aslinya.
3. Salin SEMUA produk yang disebut. Jangan meringkas jadi "dan lain-lain",
   jangan ambil sebagian saja walaupun daftarnya panjang.
4. Buang menu, tombol, teks berulang, dan ajakan pemasaran tanpa isi.
5. Tulis sebagai daftar poin pendek dalam Bahasa Indonesia.
6. Kalau bagian ini memang tidak memuat fakta apa pun, balas satu kata: KOSONG

TENTANG PASAL HUKUM
Bedakan dua hal ini, jangan diperlakukan sama:
- SIMPAN aturan yang dirasakan pembeli: lama garansi, syarat retur, batas waktu
  pengembalian dana, ongkos kirim, lama pengiriman, cara pembayaran, minimal
  pesanan, dan untuk usaha jasa: syarat pendaftaran, aturan pembatalan dan
  penjadwalan ulang, uang muka, lama pengerjaan. Pelanggan benar-benar
  menanyakan ini.
- BUANG pasal yang cuma melindungi perusahaan secara hukum: batasan tanggung
  jawab, hukum yang berlaku, penyelesaian sengketa, hak mengubah ketentuan
  sewaktu-waktu, pernyataan tunduk pada ketentuan, hak kekayaan intelektual.
  Tidak ada pelanggan yang menanyakan ini lewat WhatsApp, dan kalau ikut
  disimpan dia malah bersaing dengan jawaban yang sesungguhnya dicari.

Keluarkan poin-poinnya saja.`;

// Batas aman satu kali panggilan. Dibuat konservatif supaya keluarannya tidak
// pernah terpotong di tengah kalimat.
const MAX_INPUT_PER_CALL = 14_000;

/**
 * Rapikan hasil salinan jadi catatan info bisnis.
 *
 * Kalau bahannya banyak, dipadatkan per bagian dulu baru digabung. Merapikan
 * sekaligus dalam satu panggilan gampang kena batas panjang jawaban, dan
 * hasilnya terpotong di tengah tanpa ketahuan.
 */
router.post("/summarize-site", async (req, res) => {
  try {
    const sections: { title: string; text: string }[] = Array.isArray(req.body?.sections)
      ? req.body.sections
      : [{ title: "", text: String(req.body?.text ?? "") }];
    const siteName = String(req.body?.siteName ?? "dokumen");

    const totalChars = sections.reduce((n, s) => n + (s.text?.length ?? 0), 0);
    if (totalChars < 100) {
      res.status(400).json({ error: "Teksnya terlalu sedikit untuk dirapikan." });
      return;
    }

    const llm = getLlm();
    let bahan: string;
    let dipadatkan = false;
    /** Bagian yang gagal dipadatkan, dilaporkan balik supaya bisa disebut. */
    const gagal: string[] = [];

    if (totalChars > MAX_INPUT_PER_CALL && sections.length > 1) {
      dipadatkan = true;
      log.info(`memadatkan ${sections.length} bagian sebelum dirapikan`);

      // Dikerjakan beberapa sekaligus, bukan satu per satu.
      //
      // Diukur 2026-08-03: 10 halaman audydental.com satu per satu makan 247
      // detik, sedangkan pemanggilnya menyerah di 300 detik. Terlalu dekat.
      // Satu halaman yang kebetulan lambat bisa menjatuhkan seluruh perapian
      // padahal semuanya sudah hampir selesai.
      //
      // Tiga sekaligus, bukan sepuluh. Google membatasi jumlah permintaan per
      // menit, dan menembakkan semuanya bersamaan justru memancing penolakan
      // 429 yang harus diulang, jadi malah lebih lambat.
      const layak = sections.filter((s) => s.text && s.text.trim().length >= 120);
      // Urutannya dijaga lewat indeks. Catatan yang bagiannya teracak jadi
      // membingungkan dibaca, dan urutan halaman di sitemap itu urutan yang
      // dipilih pemilik situsnya.
      const hasilPerBagian: (string | null)[] = new Array(layak.length).fill(null);
      const SEKALIGUS = 3;
      let berikutnya = 0;

      async function pekerja() {
        while (berikutnya < layak.length) {
          const i = berikutnya++;
          const s = layak[i];

          // Satu bagian yang gagal TIDAK boleh membuang bagian lain yang sudah
          // berhasil. Dulu seluruh perapian dibatalkan begitu satu panggilan
          // gagal, jadi website 10 halaman bisa kehilangan 9 halaman yang sudah
          // rapi cuma gara-gara halaman ke-10 kena tolak sesaat.
          try {
            const hasil = await llm.complete({
              system: CONDENSE_PROMPT,
              messages: [
                {
                  role: "user",
                  parts: [
                    {
                      type: "text",
                      text: `Bagian: ${s.title || "tanpa judul"}\n\n${s.text.slice(0, MAX_INPUT_PER_CALL)}`,
                    },
                  ],
                },
              ],
              temperature: 0.1,
              maxTokens: 2000,
            });
            if (hasil.trim().toUpperCase() !== "KOSONG") {
              hasilPerBagian[i] = `## ${s.title || "Bagian"}\n${hasil.trim()}`;
            }
          } catch (err) {
            gagal.push(s.title || "tanpa judul");
            log.warn(
              `bagian "${s.title}" gagal dipadatkan: ${
                err instanceof Error ? err.message : err
              }`,
            );
          }
        }
      }

      await Promise.all(
        Array.from({ length: Math.min(SEKALIGUS, layak.length) }, () => pekerja()),
      );

      const poin = hasilPerBagian.filter((x): x is string => x !== null);

      // Kosong bisa berarti dua hal yang sangat berbeda, dan menyamakannya
      // membuat pesannya menyesatkan. Waktu menyapu situs bisnis 2026-08-03
      // sidomuncul.co.id memunculkan "Semua 0 bagian gagal dirapikan",
      // kalimat yang tidak masuk akal, karena yang terjadi sebenarnya bukan
      // gagal: tiap bagian dijawab KOSONG karena isinya memang cuma menu dan
      // ajakan pemasaran tanpa satu pun fakta.
      if (poin.length === 0) {
        throw new Error(
          gagal.length > 0
            ? `Semua ${gagal.length} bagian gagal dirapikan. Biasanya jatah harian layanan AI sudah habis.`
            : "Halaman-halamannya tidak memuat fakta yang bisa diambil, isinya cuma menu dan kalimat promosi.",
        );
      }

      bahan = poin.join("\n\n");
    } else {
      bahan = sections
        .map((s) => (s.title ? `## ${s.title}\n${s.text}` : s.text))
        .join("\n\n---\n\n")
        .slice(0, MAX_INPUT_PER_CALL);
    }

    const tidy = await llm.complete({
      system: TIDY_PROMPT,
      messages: [
        {
          role: "user",
          parts: [
            {
              type: "text",
              text: `Ini bahan dari ${siteName}. Susun jadi catatan info bisnis.\n\n${bahan.slice(0, MAX_INPUT_PER_CALL)}`,
            },
          ],
        },
      ],
      temperature: 0.1,
      maxTokens: 8000,
    });

    res.json({
      ok: true,
      content: tidy,
      condensed: dipadatkan,
      // Dipakai halaman Info bisnis untuk memberi tahu bagian mana yang
      // terlewat, supaya orang tahu apa yang perlu diperiksa manual.
      gagal,
    });
  } catch (err) {
    fail(res, err, 502);
  }
});

// Membaca isi gambar jadi Info bisnis ---------------------------------------

const BACA_GAMBAR_PROMPT = `Kamu menyalin isi sebuah gambar menjadi catatan teks untuk customer service.

ATURAN
1. Tulis ulang SEMUA tulisan yang terlihat di gambar, apa adanya.
2. Salin angka, harga, ukuran, dan nama produk PERSIS. Jangan dibulatkan, jangan ditata ulang.
3. JANGAN menambah apa pun yang tidak terlihat di gambar. Dilarang menebak harga atau stok.
4. Kalau gambarnya foto produk tanpa tulisan, jelaskan singkat apa yang terlihat: jenis produk, warna, kemasan.
5. Tulis dalam Bahasa Indonesia, rapi, pakai judul bagian huruf kapital kalau isinya banyak.

Keluarkan catatannya saja, tanpa kalimat pembuka.`;

/** Batas ukuran gambar yang masih masuk akal dikirim ke layanan AI. */
const MAKS_BACA_BYTE = 5 * 1024 * 1024;

/**
 * Ubah gambar galeri jadi catatan Info bisnis.
 *
 * Tanpa ini, foto daftar harga bisa DIKIRIM asisten tapi angkanya tidak
 * DIKETAHUI, jadi dia tetap tidak bisa menjawab "berapa harganya".
 */
router.post("/assets/:id/read", async (req, res) => {
  try {
    const aset = await prisma.mediaAsset.findUnique({ where: { id: req.params.id } });
    if (!aset) {
      res.status(404).json({ error: "Berkasnya tidak ditemukan" });
      return;
    }

    if (aset.kind !== "image") {
      res.status(400).json({
        error: "Yang bisa dibaca isinya baru gambar. Untuk PDF, pakai tab Dari file di Info bisnis.",
      });
      return;
    }

    const lokasi = path.join(env.MEDIA_DIR, path.basename(aset.fileName));
    if (!fs.existsSync(lokasi)) {
      res.status(404).json({ error: "Berkasnya tidak ada di penyimpanan" });
      return;
    }

    // Foto langsung dari HP gampang tembus 10 MB, dan setelah dijadikan base64
    // permintaannya jadi jauh lebih besar lagi sampai timeout. Mengirim gambar
    // sebesar itu ke pelanggan tetap boleh, cuma membacanya yang dibatasi.
    const ukuran = fs.statSync(lokasi).size;
    if (ukuran > MAKS_BACA_BYTE) {
      const pesan =
        `Gambarnya ${(ukuran / 1024 / 1024).toFixed(1)} MB, terlalu besar untuk dibaca ` +
        `(batasnya ${MAKS_BACA_BYTE / 1024 / 1024} MB). Gambarnya tetap bisa dikirim ke ` +
        `pelanggan. Kalau isinya mau ikut dihafal, unggah ulang versi yang lebih kecil, ` +
        `misalnya hasil screenshot.`;
      await prisma.mediaAsset.update({
        where: { id: aset.id },
        data: { readStatus: "error", readError: pesan },
      });
      res.status(400).json({ error: pesan });
      return;
    }

    const llm = getLlm();
    if (!llm.supportsImage) {
      res.status(400).json({
        error: "Layanan AI yang dipakai sekarang tidak bisa membaca gambar.",
      });
      return;
    }

    await prisma.mediaAsset.update({
      where: { id: aset.id },
      data: { readStatus: "pending", readError: null },
    });

    let isi: string;
    try {
      isi = await llm.complete({
        system: BACA_GAMBAR_PROMPT,
        messages: [
          {
            role: "user",
            parts: [
              {
                type: "media",
                mimeType: aset.mimeType,
                data: fs.readFileSync(lokasi).toString("base64"),
              },
              {
                type: "text",
                text: `Gambar ini berjudul "${aset.name}". Salin isinya jadi catatan.`,
              },
            ],
          },
        ],
        temperature: 0.1,
        maxTokens: 4000,
      });
    } catch (err) {
      const pesan = err instanceof Error ? err.message : String(err);
      await prisma.mediaAsset.update({
        where: { id: aset.id },
        data: { readStatus: "error", readError: pesan.slice(0, 400) },
      });
      res.status(502).json({ error: pesan });
      return;
    }

    // Kalau sudah pernah dibaca, catatan lamanya diperbarui, bukan ditumpuk.
    const lama = aset.knowledgeSourceId
      ? await prisma.knowledgeSource.findUnique({
          where: { id: aset.knowledgeSourceId },
        })
      : null;

    const sumber = lama
      ? await prisma.knowledgeSource.update({
          where: { id: lama.id },
          data: { content: isi, status: "pending", error: null },
        })
      : await prisma.knowledgeSource.create({
          data: {
            agentId: aset.agentId,
            type: "image",
            title: `Isi dari ${aset.name}`,
            content: isi,
            status: "pending",
          },
        });

    await prisma.mediaAsset.update({
      where: { id: aset.id },
      data: { knowledgeSourceId: sumber.id, readStatus: "ready", readError: null },
    });

    await indexSource(sumber.id);

    res.json({ ok: true, knowledgeSourceId: sumber.id, panjang: isi.length });
  } catch (err) {
    fail(res, err, 502);
  }
});

// Playground -----------------------------------------------------------------

/**
 * Sesi ruang coba dianggap sudah "baru" kalau pesan terakhirnya lebih lama dari
 * ini. Cukup panjang supaya sesi yang benar-benar sedang berjalan (jeda mikir,
 * baca jawaban) tidak ikut dibersihkan, cukup pendek supaya kunjungan berikutnya
 * tidak mewarisi pesan menggantung dari kemarin.
 */
const RUANG_COBA_SEGAR_MENIT = 30;

/**
 * Kosongkan satu percakapan ruang coba sampai bersih: pesannya, bacaan rasanya,
 * dan data kontak yang sempat diisi AI. Dipakai tombol "Mulai dari awal" DAN
 * pembersihan otomatis sesi yang sudah lama menganggur.
 */
async function bersihkanRuangCoba(conversationId: string, contactId: string) {
  await prisma.message.deleteMany({ where: { conversationId } });
  await prisma.conversation.update({
    where: { id: conversationId },
    data: {
      needsHuman: false,
      handoffReason: null,
      followUpCount: 0,
      // Bacaan rasa ikut dikosongkan. Tanpa ini percobaan berikutnya dibaca
      // dengan sisa kekesalan dari percobaan sebelumnya, dan pemilik usahanya
      // melihat lencana yang bukan dia sebabkan.
      rasaState: null,
      rasaLabel: null,
      rasaAlasan: null,
      rasaKesal: 0,
      rasaMinat: 0,
      rasaPrioritas: 0,
      rasaYakin: 0,
      rasaSaat: null,
      rasaSerahkan: false,
      handoffAt: null,
    },
  });
  await prisma.contact.update({
    where: { id: contactId },
    data: {
      // dikosongkan supaya AI bisa mengisinya lagi dari percakapan baru
      name: "",
      waPushName: null,
      email: null,
      businessName: null,
      industry: null,
      stage: "baru",
      tags: "[]",
    },
  });
}

/**
 * Tes agent tanpa WhatsApp. Memakai kontak khusus per agent supaya seluruh
 * pipeline (RAG, handoff, ekstraksi CRM) benar-benar teruji.
 */
router.post("/playground", async (req, res) => {
  try {
    const { agentId, message, reset } = req.body ?? {};
    if (!agentId) {
      res.status(400).json({ error: "agentId wajib diisi" });
      return;
    }

    const agent = await prisma.agent.findUnique({ where: { id: agentId } });
    if (!agent) {
      res.status(404).json({ error: "Agent tidak ditemukan" });
      return;
    }

    // Sengaja tanpa pushName. Kalau diisi, asisten mengira itu nama pelanggan
    // lalu menyapa "Kak Playground".
    const contact = await getOrCreateContact({
      workspaceId: agent.workspaceId,
      waJid: `playground:${agent.id}`,
    });

    let conversation = await getOrCreateConversation({
      workspaceId: agent.workspaceId,
      contactId: contact.id,
      agentId: agent.id,
    });

    if (reset) {
      await bersihkanRuangCoba(conversation.id, contact.id);
      res.json({ ok: true, reset: true, conversationId: conversation.id, bubbles: [] });
      return;
    }

    // Sesi ruang coba yang sudah lama menganggur dimulai bersih.
    //
    // Riwayat disimpan di server supaya lapisan rasa dan ingatan bekerja seperti
    // sungguhan, tapi tampilannya di layar hilang tiap halaman dimuat ulang.
    // Tanpa ini, pesan customer dari sesi sebelumnya yang belum sempat dijawab
    // (mis. waktu mesinnya sempat mati atau asistennya dimatikan) masih
    // tertinggal, dan pesan "pertama" hari ini dijawab dengan minta maaf atas
    // keterlambatan berjam-jam, karena dari sisi server pelanggannya memang
    // menunggu sejak kemarin. Itu benar buat WhatsApp asli, tapi menyesatkan di
    // ruang coba, tempat orang mengira baru mulai.
    const terbaru = await prisma.message.findFirst({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    });
    if (
      terbaru &&
      Date.now() - terbaru.createdAt.getTime() > RUANG_COBA_SEGAR_MENIT * 60_000
    ) {
      await bersihkanRuangCoba(conversation.id, contact.id);
    }

    if (typeof message !== "string" || !message.trim()) {
      res.status(400).json({ error: "message wajib diisi" });
      return;
    }

    const isFirst =
      (await prisma.message.count({ where: { conversationId: conversation.id } })) === 0;

    await appendMessage({
      conversationId: conversation.id,
      workspaceId: agent.workspaceId,
      role: "customer",
      content: message.trim(),
    });

    const bubbles: string[] = [];
    if (isFirst && agent.welcomeMessage) {
      bubbles.push(agent.welcomeMessage);
      await appendMessage({
        conversationId: conversation.id,
        workspaceId: agent.workspaceId,
        role: "ai",
        content: agent.welcomeMessage,
      });
    }

    const result = await runAgentOnConversation({
      conversationId: conversation.id,
      // Ruang coba mengabaikan jam kerja dan ambil-alih, DAN memakai jatah
      // percobaan harian, bukan kuota balasan pelanggan.
      force: true,
      ruangCoba: true,
    });

    if (result.status === "skipped") {
      res.json({ ok: false, error: result.reason, bubbles });
      return;
    }

    // Bacaan rasa untuk ditampilkan hidup di ruang coba.
    //
    // Ini satu-satunya tempat pemilik usaha bisa melihat sendiri lapisan ini
    // bekerja SEBELUM dia membiarkannya menyentuh pelanggan sungguhan, dan itu
    // jauh lebih meyakinkan daripada kalimat apa pun di halaman jualan.
    // Dibaca ulang dari database, bukan dari ingatan, supaya yang tampil persis
    // yang dipakai menyusun jawaban barusan.
    const setelah = await prisma.conversation.findUnique({
      where: { id: conversation.id },
      select: { rasaLabel: true, rasaAlasan: true, rasaYakin: true },
    });
    const rasa =
      setelah?.rasaLabel && agent.rasaAktif
        ? {
            label: setelah.rasaLabel,
            alasan: setelah.rasaAlasan ? setelah.rasaAlasan.split(", ") : [],
            efek: ringkasSikap(
              pilihSikap({
                label: setelah.rasaLabel as LabelRasa,
                keyakinan: setelah.rasaYakin,
                alasan: [],
              }),
            ),
          }
        : setelah?.rasaLabel
          ? { label: setelah.rasaLabel, alasan: [], efek: [], mati: true }
          : null;

    res.json({
      ok: true,
      conversationId: conversation.id,
      bubbles: [...bubbles, ...result.bubbles],
      handoff: result.handoff,
      knowledgeUsed: result.knowledgeUsed,
      rasa,
      // Di ruang coba berkasnya tidak benar-benar dikirim, cuma ditampilkan
      // supaya pemilik toko tahu apa yang akan diterima pelanggan.
      berkas: result.berkas.map((b) => ({
        name: b.name,
        fileName: b.fileName,
        kind: b.kind,
      })),
    });
  } catch (err) {
    fail(res, err);
  }
});

// Inbox ----------------------------------------------------------------------

/** Balas manual sebagai agen manusia. */
router.post("/conversations/:id/reply", async (req, res) => {
  try {
    const text = String(req.body?.text ?? "").trim();
    if (!text) {
      res.status(400).json({ error: "Pesan kosong" });
      return;
    }

    const conversation = await prisma.conversation.findUnique({
      where: { id: req.params.id },
    });
    if (!conversation) {
      res.status(404).json({ error: "Percakapan tidak ditemukan" });
      return;
    }

    if (conversation.channelId) {
      const delivery = await sendToConversation(conversation.id, [text]);
      if (!delivery.ok) {
        res.status(400).json({ error: delivery.error });
        return;
      }
    }

    await appendMessage({
      conversationId: conversation.id,
      workspaceId: conversation.workspaceId,
      role: "human",
      content: text,
    });

    res.json({ ok: true });
  } catch (err) {
    fail(res, err);
  }
});

/** Paksa AI membalas sekarang (misal setelah agen manusia menyerahkan lagi). */
router.post("/conversations/:id/ai-reply", async (req, res) => {
  try {
    const result = await runAgentOnConversation({
      conversationId: req.params.id,
      // Abaikan jam kerja dan ambil-alih, tapi ini balasan ke pelanggan
      // sungguhan, jadi tetap memotong kuota balasan, bukan jatah percobaan.
      force: true,
    });
    if (result.status === "skipped") {
      res.status(400).json({ error: result.reason });
      return;
    }
    const delivery = await sendToConversation(req.params.id, result.bubbles);
    res.json({ ok: true, bubbles: result.bubbles, delivered: delivery.ok, deliveryError: delivery.error });
  } catch (err) {
    fail(res, err);
  }
});

/**
 * Ringkas obrolan satu pelanggan.
 *
 * Dipanggil waktu tombolnya diklik, bukan tiap pesan masuk. Alasan lengkapnya
 * ada di core/ringkasan.ts.
 */
router.post("/contacts/:id/ringkas", async (req, res) => {
  try {
    if (!aiConfigured()) {
      res.status(400).json({ error: "AI belum diatur. Isi API key-nya dulu di .env" });
      return;
    }
    const hasil = await ringkasPelanggan(
      req.params.id,
      req.body?.paksa === true,
    );
    res.json({ ok: true, ...hasil });
  } catch (err) {
    fail(res, err);
  }
});

// Kuota ----------------------------------------------------------------------

router.get("/workspaces/:id/quota", async (req, res) => {
  try {
    res.json(await getQuota(req.params.id));
  } catch (err) {
    fail(res, err);
  }
});

// Job manual -----------------------------------------------------------------

router.post("/jobs/followup", async (_req, res) => {
  try {
    res.json({
      ok: true,
      sebelumBeli: await runFollowUpTick(),
      setelahBeli: await runAfterSalesTick(),
      pengingat: await runPengingatTick(),
    });
  } catch (err) {
    fail(res, err);
  }
});

// Realtime -------------------------------------------------------------------

/** Server-Sent Events untuk update QR & pesan masuk di dashboard. */
// ─── Ruang perintah (halaman Tanya) ───────────────────────────────────────────

/**
 * Satu giliran di ruang perintah.
 *
 * Worker yang menulis kedua gelembungnya, bukan halaman web, supaya jawaban dan
 * usulnya tersimpan bersamaan. Kalau web yang menulis, ada jeda antara jawaban
 * tersimpan dan usulnya tersimpan, dan kartu "Kirim" yang muncul tanpa usul di
 * belakangnya adalah tombol yang tidak mengerjakan apa-apa.
 */
router.post("/tanya", async (req, res) => {
  try {
    const workspaceId = String(req.body?.workspaceId ?? "");
    const sesiId = String(req.body?.sesiId ?? "");
    const pesan = String(req.body?.pesan ?? "").trim();

    if (!workspaceId || !sesiId) {
      res.status(400).json({ error: "workspaceId dan sesiId wajib diisi" });
      return;
    }
    if (!pesan) {
      res.status(400).json({ error: "Perintahnya kosong" });
      return;
    }
    // Batasnya jauh di atas kalimat perintah mana pun, dan ada supaya satu
    // tempelan raksasa tidak jadi satu prompt raksasa yang dibayar.
    if (pesan.length > 2000) {
      res.status(400).json({ error: "Perintahnya kepanjangan, ringkas dulu ya" });
      return;
    }

    const sesi = await prisma.sesiTanya.findFirst({
      where: { id: sesiId, workspaceId },
    });
    if (!sesi) {
      res.status(404).json({ error: "Utasnya tidak ketemu" });
      return;
    }

    const jatah = await ambilJatahTanya(workspaceId);
    if (jatah.habis) {
      // Habisnya HARUS bersuara. Jalur yang diam waktu kehabisan jatah bikin
      // orang mengira produknya rusak, dan itu lebih mahal daripada batasnya
      // sendiri.
      res.status(429).json({
        error: jatah.belumKonfirmasi
          ? `Jatah ${jatah.batas} perintahnya sudah habis. Konfirmasi dulu emailmu lewat tautan yang kami kirim, nanti jatahnya lahir lagi tiap hari.`
          : `Jatah ${jatah.batas} perintah hari ini sudah habis. Besok jatahnya penuh lagi.`,
      });
      return;
    }
    if (!(await pesanJatahTanya(workspaceId))) {
      res.status(429).json({ error: "Jatah perintah hari ini sudah habis." });
      return;
    }

    const riwayat = await prisma.pesanTanya.findMany({
      where: { sesiId },
      orderBy: { createdAt: "asc" },
      take: 40,
    });

    const dariPemilik = await prisma.pesanTanya.create({
      data: { sesiId, peran: "pemilik", teks: pesan },
    });

    // Judul diisi dari perintah pertama, dan cuma sekali. Utas yang sudah punya
    // judul tidak berubah judulnya cuma karena pertanyaan kelima kebetulan
    // lebih panjang.
    if (!sesi.judul) {
      await prisma.sesiTanya.update({
        where: { id: sesiId },
        data: { judul: judulDariPesan(pesan) },
      });
    }

    let hasil;
    try {
      hasil = await jalankanTanya({
        workspaceId,
        riwayat: riwayat.map((r) => ({ peran: r.peran, teks: r.teks })),
        pesan,
        // Modenya diambil dari BARIS UTASNYA, tidak pernah dari badan
        // permintaan. Kalau klien yang menentukan, utas pemasangan tinggal
        // dipanggil dengan mode "perintah" dan seluruh pembatasan alatnya
        // hilang dalam satu baris.
        mode: sesi.mode === "pasang" ? "pasang" : "perintah",
      });
    } catch (err) {
      // Jatahnya dikembalikan. Perintah yang tidak pernah dijawab tidak boleh
      // ikut memotong, dan tanpa ini gangguan di pihak Google memakan jatah
      // pemilik toko.
      await kembalikanJatahTanya(workspaceId);
      await prisma.pesanTanya.delete({ where: { id: dariPemilik.id } }).catch(() => {});
      throw err;
    }

    const dariPalwise = await prisma.pesanTanya.create({
      data: {
        sesiId,
        peran: "palwise",
        teks: hasil.teks,
        alat: JSON.stringify(hasil.alat),
        usul: hasil.usul ? JSON.stringify(hasil.usul) : null,
        usulStatus: hasil.usul ? "menunggu" : null,
      },
    });

    // Menyentuh utasnya supaya dia naik ke atas daftar riwayat.
    await prisma.sesiTanya.update({
      where: { id: sesiId },
      data: { updatedAt: new Date() },
    });

    res.json({
      ok: true,
      pesan: [dariPemilik, dariPalwise].map(bentukPesanTanya),
      jatah: await ambilJatahTanya(workspaceId),
    });
  } catch (err) {
    fail(res, err);
  }
});

/**
 * Kerjakan usul yang tadi ditampilkan sebagai kartu.
 *
 * Yang dikerjakan diambil dari BARIS DI DATABASE, bukan dari apa pun yang
 * dikirim layar. Kalau isi pesannya ikut dikirim dari klien, kartu yang tampil
 * dan pesan yang terkirim bisa berbeda, dan seluruh gunanya menampilkan dulu
 * jadi hilang.
 */
router.post("/tanya/lakukan", async (req, res) => {
  try {
    const workspaceId = String(req.body?.workspaceId ?? "");
    const pesanId = String(req.body?.pesanId ?? "");
    // Default: asistennya TETAP jalan. Perintah "suruh Budi bawa STNK" itu satu
    // titipan, bukan niat mengambil alih obrolannya selamanya. Kalau asisten
    // dimatikan diam-diam, Budi bertanya lagi besok dan tidak ada yang menjawab.
    const ambilAlih = req.body?.ambilAlih === true;

    if (!workspaceId || !pesanId) {
      res.status(400).json({ error: "workspaceId dan pesanId wajib diisi" });
      return;
    }

    const baris = await prisma.pesanTanya.findFirst({
      where: { id: pesanId, sesi: { workspaceId } },
    });
    if (!baris?.usul) {
      res.status(404).json({ error: "Usulnya tidak ketemu" });
      return;
    }
    if (baris.usulStatus !== "menunggu") {
      // Dua ketukan cepat di tombol yang sama tidak boleh jadi dua pesan ke
      // pelanggan, atau dua catatan kembar di Info bisnis. Yang kedua ditolak
      // di sini, bukan di layar.
      res.status(409).json({
        error:
          baris.usulStatus === "dikerjakan"
            ? "Ini sudah dikerjakan sebelumnya."
            : "Usul ini sudah tidak berlaku.",
      });
      return;
    }

    const usul = JSON.parse(baris.usul) as Usul;

    const gagal = async (pesan: string, kode = 400) => {
      await prisma.pesanTanya.update({
        where: { id: pesanId },
        data: { usulStatus: "gagal", usulPesan: pesan },
      });
      res.status(kode).json({ error: pesan });
    };

    const beres = async (kabar: string, tambahan: Record<string, unknown> = {}) => {
      await prisma.pesanTanya.update({
        where: { id: pesanId },
        data: { usulStatus: "dikerjakan", usulPesan: kabar },
      });
      res.json({ ok: true, kabar, ...tambahan });
    };

    // ── Menyimpan setelan ─────────────────────────────────────────────────────
    //
    // Tidak menyentuh WhatsApp sama sekali, jadi tidak lewat pemeriksaan
    // obrolan di bawah. Bisa dikerjakan walau nomornya belum tersambung, dan
    // itu memang yang terjadi selama pemasangan.
    if (usul.jenis === "tambah_info" || usul.jenis === "ubah_info") {
      const agent = await prisma.agent.findFirst({
        where: { workspaceId },
        orderBy: { createdAt: "asc" },
      });
      if (!agent) return void (await gagal("Belum ada asisten di akun ini."));

      let sourceId: string;

      if (usul.jenis === "tambah_info") {
        // Batas paket diperiksa DI SINI, bukan waktu kartunya dibuat. Antara
        // kartu muncul dan tombolnya ditekan bisa lewat berhari-hari, dan
        // selama itu catatannya bisa bertambah dari halaman Info bisnis.
        const ws = await prisma.workspace.findUniqueOrThrow({ where: { id: workspaceId } });
        const paket = getPlan(ws.plan);
        const terpakai = await prisma.knowledgeSource.count({
          where: { agent: { workspaceId } },
        });
        if (terpakai >= paket.maxKnowledgeSources) {
          return void (await gagal(
            `Paket ${paket.name} muat ${paket.maxKnowledgeSources} catatan, dan sudah penuh. Naikkan paket dulu, atau gabungkan beberapa catatan lama.`,
          ));
        }

        // Catatan yang isinya sama persis tidak ditambah dua kali. Aturan yang
        // sama dengan formulir Info bisnis, dan alasannya bukan kerapian:
        // salinan kembar saling berebut tempat di hasil pencarian dan
        // mendorong keluar catatan lain yang justru dibutuhkan.
        const kembar = await prisma.knowledgeSource.findFirst({
          where: { agentId: agent.id, content: usul.isi },
          select: { title: true },
        });
        if (kembar) {
          return void (await gagal(
            `Isinya sama persis dengan catatan "${kembar.title}" yang sudah ada, jadi tidak ditambah lagi.`,
          ));
        }

        const dibuat = await prisma.knowledgeSource.create({
          data: {
            agentId: agent.id,
            type: "text",
            title: usul.judul,
            content: usul.isi,
            status: "pending",
          },
        });
        sourceId = dibuat.id;
      } else {
        const punya = await prisma.knowledgeSource.findFirst({
          where: { id: usul.catatanId, agent: { workspaceId } },
        });
        if (!punya) return void (await gagal("Catatannya sudah tidak ada."));

        await prisma.knowledgeSource.update({
          where: { id: punya.id },
          data: { title: usul.judul, content: usul.isi, status: "pending", error: null },
        });
        sourceId = punya.id;
      }

      // Menghafal ulang WAJIB. Potongan lama dibuat dari teks yang lama, jadi
      // tanpa ini asisten masih menjawab pakai versi sebelum diubah, dan itu
      // bentuk kegagalan yang paling membingungkan: pemiliknya melihat catatan
      // sudah benar di layar, tapi pelanggan tetap dikasih harga lama.
      try {
        await indexSource(sourceId);
        invalidateAgentCache(agent.id);
      } catch (err) {
        log.error(
          `ruang perintah: gagal menghafal catatan ${sourceId} — ${err instanceof Error ? err.message : err}`,
        );
        return void (await beres(
          "Tersimpan, tapi belum sempat dihafal. Buka Info bisnis lalu tekan Hafalkan lagi.",
          { sourceId },
        ));
      }

      return void (await beres(
        usul.jenis === "tambah_info"
          ? `"${usul.judul}" sudah tersimpan dan dihafal.`
          : `"${usul.judul}" sudah diperbarui dan dihafal ulang.`,
        { sourceId },
      ));
    }

    if (usul.jenis === "ubah_asisten") {
      const agent = await prisma.agent.findFirst({
        where: { workspaceId },
        orderBy: { createdAt: "asc" },
      });
      if (!agent) return void (await gagal("Belum ada asisten di akun ini."));

      await prisma.agent.update({
        where: { id: agent.id },
        data: { behaviorPrompt: usul.isi },
      });
      return void (await beres("Cara bicara asistennya sudah disimpan."));
    }

    // ── Mengirim ke pelanggan ─────────────────────────────────────────────────
    const kontak = await prisma.contact.findFirst({
      where: { id: usul.kontakId, workspaceId },
    });
    if (!kontak) return void (await gagal("Pelanggannya sudah tidak ada.", 404));

    const conversation = await prisma.conversation.findFirst({
      where: { workspaceId, contactId: kontak.id, channelId: { not: null } },
      orderBy: { lastMessageAt: "desc" },
    });
    if (!conversation) {
      return void (await gagal(
        "Belum pernah ada obrolan WhatsApp dengan pelanggan ini, jadi belum bisa dikirimi.",
      ));
    }

    let kirim: { ok: boolean; error?: string };
    if (usul.jenis === "kirim_pesan") {
      kirim = await sendToConversation(conversation.id, [usul.teks]);
    } else {
      const berkas = await prisma.mediaAsset.findFirst({
        where: { code: usul.kode, agent: { workspaceId } },
      });
      if (!berkas) return void (await gagal("Berkasnya sudah tidak ada.", 404));

      kirim = await kirimBerkasKeObrolan(
        conversation.id,
        [
          {
            fileName: berkas.fileName,
            mimeType: berkas.mimeType,
            kind: berkas.kind,
            name: berkas.name,
          },
        ],
        usul.teks,
      );
      if (kirim.ok) {
        await prisma.mediaAsset.update({
          where: { id: berkas.id },
          data: { sentCount: { increment: 1 } },
        });
      }
    }

    if (!kirim.ok) {
      return void (await gagal(kirim.error ?? "Gagal mengirim"));
    }

    // Yang benar-benar terkirim ikut dicatat di utas pelanggannya, supaya
    // kotak masuk tidak berbohong. Tanpa ini pemilik toko membuka obrolan Budi
    // dan tidak melihat pesan yang barusan dia kirim sendiri.
    await appendMessage({
      conversationId: conversation.id,
      workspaceId,
      role: "human",
      content:
        usul.jenis === "kirim_pesan"
          ? usul.teks
          : [usul.teks, `[terkirim: ${usul.namaBerkas}]`].filter(Boolean).join("\n"),
    });

    if (ambilAlih) {
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { aiEnabled: false, needsHuman: false, handoffReason: null, handoffAt: null },
      });
    }

    await beres(
      ambilAlih
        ? "Terkirim. Asisten dimatikan di obrolan ini."
        : "Terkirim. Asisten tetap jalan di obrolan ini.",
      { conversationId: conversation.id, ambilAlih },
    );
  } catch (err) {
    fail(res, err);
  }
});

/** Buang usul tanpa mengerjakannya. */
router.post("/tanya/batal", async (req, res) => {
  try {
    const workspaceId = String(req.body?.workspaceId ?? "");
    const pesanId = String(req.body?.pesanId ?? "");

    const hasil = await prisma.pesanTanya.updateMany({
      where: { id: pesanId, usulStatus: "menunggu", sesi: { workspaceId } },
      data: { usulStatus: "dibatalkan", usulPesan: "Tidak jadi dikirim." },
    });
    res.json({ ok: hasil.count === 1 });
  } catch (err) {
    fail(res, err);
  }
});

/** Bentuk baris PesanTanya untuk dikirim ke layar. */
function bentukPesanTanya(p: {
  id: string;
  peran: string;
  teks: string;
  alat: string;
  usul: string | null;
  usulStatus: string | null;
  usulPesan: string | null;
  createdAt: Date;
}) {
  return {
    id: p.id,
    peran: p.peran,
    teks: p.teks,
    alat: JSON.parse(p.alat || "[]") as string[],
    usul: p.usul ? (JSON.parse(p.usul) as Usul) : null,
    usulStatus: p.usulStatus,
    usulPesan: p.usulPesan,
    createdAt: p.createdAt,
  };
}

router.get("/events", (req, res) => {
  const workspaceId = String(req.query.workspaceId ?? "");
  if (!workspaceId) {
    res.status(400).json({ error: "workspaceId wajib diisi" });
    return;
  }

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  res.write(`retry: 3000\n\n`);

  const unsubscribe = bus.subscribe(workspaceId, (event) => {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  });

  const ping = setInterval(() => res.write(": ping\n\n"), 25_000);

  req.on("close", () => {
    clearInterval(ping);
    unsubscribe();
    res.end();
  });
});
