import {
  HANYA_OBROLAN_ASLI,
  HANYA_PELANGGAN_ASLI,
  displayName,
  getPlan,
  periodeBerikutnya,
  prisma,
  terpakaiSekarang,
} from "@palwise/db";
import { env } from "../env.js";
import { log } from "../lib/log.js";
import { parseJsonLoose, sekarangIndonesia } from "./agent.js";
import { getLlm } from "./provider.js";
import { formatKnowledge, searchKnowledge } from "./rag.js";
import { LlmMessage, textMessage } from "./types.js";

/**
 * Ruang perintah: otak halaman "Tanya".
 *
 * BUKAN asisten pelanggan. Yang diajak bicara di sini PEMILIK USAHA, dan
 * lawan bicaranya Palwise sendiri. Dua-duanya sengaja tidak berbagi apa pun
 * dengan `agent.ts`: prompt beda, alat beda, jatah beda, tabel beda. Satu-
 * satunya yang dipinjam cuma pembaca JSON dan pencarian Info bisnis.
 *
 * ══ Aturan yang menentukan seluruh bentuk berkas ini ══
 *
 * 1. MODELNYA TIDAK PERNAH MENGHITUNG SENDIRI.
 *
 *    Waktu ditanya "hari ini ada berapa yang chat", jawabannya tidak boleh
 *    datang dari kepala model. Dia memanggil alat, databasenya yang
 *    menghitung, dan dia cuma menyusun kalimatnya.
 *
 *    Ini bukan kerapian. Angka karangan di layar pemilik toko itu kelas bug
 *    yang sudah pernah dibayar mahal: dulu spanduk "perlu dicek uangnya"
 *    menyuruh orang membuka rekening mencari uang yang tidak pernah ada, dan
 *    sesudah dua kali begitu dia berhenti mempercayai semua kabar uang dari
 *    Palwise, termasuk yang benar. Bedanya, waktu itu salahnya sekali dan
 *    tetap; model yang boleh mengarang salahnya bisa tiap hari dan beda-beda.
 *
 * 2. MODELNYA TIDAK PERNAH MENGERJAKAN TINDAKAN.
 *
 *    Alat di sini semuanya MEMBACA. Yang menulis (kirim pesan, kirim berkas)
 *    cuma bisa DIUSULKAN: model menyusun usulnya, usulnya disimpan sebagai
 *    kartu, dan yang menekan tombolnya manusia. Mengirim pesan ke pelanggan
 *    sungguhan tidak bisa ditarik balik dan yang keluar nama tokonya.
 *
 *    Dua cara dia salah, dan dua-duanya cuma ketahuan kalau ditampilkan dulu:
 *    salah orang (tiga pelanggan bernama Budi) dan salah isi (harga atau nada
 *    yang tidak dimaksud pemiliknya).
 *
 * 3. NAMA TIDAK PERNAH DITEBAK.
 *
 *    Kolom `name` cuma terisi kalau pelanggannya menyebutkan sendiri, sisanya
 *    jatuh ke nama profil WhatsApp atau nomor. Jadi "kirim ke bu Ani" sering
 *    tidak ketemu, atau ketemu banyak. Kalau bukan persis satu, modelnya wajib
 *    bertanya balik, bukan memilih yang pertama.
 */

// ── Bentuk hasil ──────────────────────────────────────────────────────────────

/** Usul tindakan yang menunggu ditekan pemiliknya. */
export type Usul =
  | {
      jenis: "kirim_pesan";
      kontakId: string;
      /** Nama & nomor ikut disimpan supaya kartunya tetap benar walau kontaknya berubah. */
      kepada: string;
      nomor: string | null;
      teks: string;
    }
  | {
      jenis: "kirim_berkas";
      kontakId: string;
      kepada: string;
      nomor: string | null;
      kode: string;
      namaBerkas: string;
      /** Kalimat pengantar yang dikirim sebelum berkasnya, boleh kosong. */
      teks: string;
    }
  | {
      jenis: "tambah_info";
      judul: string;
      isi: string;
    }
  | {
      jenis: "ubah_info";
      catatanId: string;
      judul: string;
      /** Isi lama, ikut disimpan supaya kartunya bisa menunjukkan apa yang berubah. */
      isiLama: string;
      isi: string;
    }
  | {
      jenis: "ubah_asisten";
      /** Teks lama, sama alasannya: yang diubah harus kelihatan, bukan cuma yang baru. */
      isiLama: string;
      isi: string;
    };

export interface HasilTanya {
  teks: string;
  usul: Usul | null;
  /** Nama alat yang benar-benar dijalankan, untuk ditampilkan di bawah jawaban. */
  alat: string[];
}

export interface Konteks {
  workspaceId: string;
  agentId: string | null;
}

// ── Alat baca ─────────────────────────────────────────────────────────────────

export interface Alat {
  nama: string;
  /** Satu baris untuk prompt. Sengaja pendek: daftar alat ikut dibayar tiap giliran. */
  untuk: string;
  /** Bentuk argumennya, kosong kalau tidak butuh. */
  argumen?: string;
  jalankan(ctx: Konteks, arg: Record<string, any>): Promise<string>;
}

/** Awal dan akhir sebuah rentang yang disebut orang sehari-hari. */
function rentangWaktu(nama: string): { dari: Date; sampai: Date; sebutan: string } {
  const awalHariIni = new Date();
  awalHariIni.setHours(0, 0, 0, 0);
  const sehari = 24 * 60 * 60 * 1000;

  switch (nama) {
    case "kemarin":
      return {
        dari: new Date(awalHariIni.getTime() - sehari),
        sampai: awalHariIni,
        sebutan: "kemarin",
      };
    case "7-hari":
      return {
        dari: new Date(awalHariIni.getTime() - 6 * sehari),
        sampai: new Date(awalHariIni.getTime() + sehari),
        sebutan: "7 hari terakhir",
      };
    case "30-hari":
      return {
        dari: new Date(awalHariIni.getTime() - 29 * sehari),
        sampai: new Date(awalHariIni.getTime() + sehari),
        sebutan: "30 hari terakhir",
      };
    case "hari-ini":
    default:
      return {
        dari: awalHariIni,
        sampai: new Date(awalHariIni.getTime() + sehari),
        sebutan: "hari ini",
      };
  }
}

/**
 * Sudah berapa lama sesuatu menggantung, dalam kalimat.
 *
 * Ditulis ulang di sini, tidak dipinjam dari halaman web, karena worker tidak
 * boleh mengimpor apa pun dari apps/web. Bentuk kalimatnya sengaja sama supaya
 * angka di ruang perintah dan angka di halaman Pelanggan tidak pernah terbaca
 * berbeda untuk keluhan yang sama.
 */
function lamanya(sejak: Date): string {
  const menit = Math.floor((Date.now() - sejak.getTime()) / 60000);
  if (menit < 60) return "baru saja";
  const jam = Math.floor(menit / 60);
  if (jam < 24) return jam + " jam";
  return Math.floor(jam / 24) + " hari";
}

function baris(k: {
  name?: string | null;
  waPushName?: string | null;
  phone?: string | null;
}): string {
  return displayName(k);
}

/**
 * Daftar alat baca.
 *
 * Diekspor supaya selftest bisa menjalankan tiap alat pada data sungguhan
 * tanpa memanggil model sama sekali. Ini bagian yang paling penting diuji:
 * yang menjawab pertanyaan pemilik toko itu kueri di sini, bukan modelnya.
 */
export const ALAT: Alat[] = [
  {
    nama: "hitung_obrolan",
    untuk: "Berapa pelanggan yang chat, berapa balasan yang keluar, berapa pelanggan baru.",
    argumen: `{"rentang":"hari-ini|kemarin|7-hari|30-hari"}`,
    async jalankan({ workspaceId }, arg) {
      const { dari, sampai, sebutan } = rentangWaktu(String(arg?.rentang ?? "hari-ini"));
      const dalam = { gte: dari, lt: sampai };

      // Yang dihitung PELANGGANNYA, bukan barisan pesannya. Satu orang yang
      // mengirim delapan baris tetap satu orang, dan itu yang dimaksud pemilik
      // toko waktu dia bertanya "ada berapa yang chat".
      const [utas, balasan, pelangganBaru] = await Promise.all([
        prisma.message.findMany({
          where: {
            role: "customer",
            createdAt: dalam,
            conversation: { workspaceId, ...HANYA_OBROLAN_ASLI },
          },
          select: { conversationId: true },
          distinct: ["conversationId"],
        }),
        prisma.message.count({
          where: {
            role: { in: ["ai", "human"] },
            createdAt: dalam,
            conversation: { workspaceId, ...HANYA_OBROLAN_ASLI },
          },
        }),
        prisma.contact.count({
          where: { workspaceId, ...HANYA_PELANGGAN_ASLI, createdAt: dalam },
        }),
      ]);

      return [
        `Rentang: ${sebutan}.`,
        `Pelanggan yang chat: ${utas.length}`,
        `Pesan yang keluar dari kamu dan asisten: ${balasan}`,
        `Pelanggan yang baru pertama chat: ${pelangganBaru}`,
      ].join("\n");
    },
  },

  {
    nama: "daftar_masalah",
    untuk:
      "Siapa yang komplain: minta refund, barang rusak, paket belum sampai, salah kirim.",
    async jalankan({ workspaceId }) {
      const orang = await prisma.contact.findMany({
        where: { workspaceId, ...HANYA_PELANGGAN_ASLI, masalah: { not: null } },
        // Yang paling lama menggantung duluan. Keluhan yang dibiarkan tiga hari
        // jauh lebih merusak daripada keluhan yang baru masuk tadi pagi.
        orderBy: { masalahSejak: "asc" },
        take: 20,
      });
      if (orang.length === 0) return "Tidak ada satu pun keluhan yang masih terbuka.";

      return orang
        .map(
          (k) =>
            `- ${baris(k)} (id: ${k.id}) — ${k.masalah}` +
            (k.masalahSejak ? `, menggantung ${lamanya(k.masalahSejak)}` : ""),
        )
        .join("\n");
    },
  },

  {
    nama: "daftar_nunggu",
    untuk: "Obrolan yang asistennya menyerah dan sekarang menunggu dibalas manusia.",
    async jalankan({ workspaceId }) {
      const utas = await prisma.conversation.findMany({
        where: { workspaceId, needsHuman: true, status: "open", ...HANYA_OBROLAN_ASLI },
        orderBy: { handoffAt: "asc" },
        take: 20,
        include: { contact: true },
      });
      if (utas.length === 0) return "Tidak ada yang menunggu dibalas.";

      return utas
        .map(
          (c) =>
            `- ${baris(c.contact)} (id: ${c.contactId})` +
            (c.handoffReason ? ` — ${c.handoffReason}` : "") +
            (c.handoffAt ? `, sejak ${lamanya(c.handoffAt)} lalu` : ""),
        )
        .join("\n");
    },
  },

  {
    nama: "daftar_janji",
    untuk: "Janji temu yang sudah dicatat asisten dan belum lewat.",
    argumen: `{"rentang":"hari-ini|7-hari|30-hari"}`,
    async jalankan({ workspaceId }, arg) {
      const awalHariIni = new Date();
      awalHariIni.setHours(0, 0, 0, 0);
      const { sampai, sebutan } = rentangWaktu(String(arg?.rentang ?? "hari-ini"));

      const orang = await prisma.contact.findMany({
        where: {
          workspaceId,
          ...HANYA_PELANGGAN_ASLI,
          janjiPada: { gte: awalHariIni, lt: sampai },
        },
        orderBy: { janjiPada: "asc" },
        take: 30,
      });
      if (orang.length === 0) return `Tidak ada janji temu ${sebutan}.`;

      return orang
        .map(
          (k) =>
            `- ${baris(k)} (id: ${k.id}) — ${k.janjiPada?.toLocaleString("id-ID", {
              weekday: "long",
              day: "numeric",
              month: "long",
              hour: "2-digit",
              minute: "2-digit",
            })}` +
            (k.janjiCatatan ? `, ${k.janjiCatatan}` : "") +
            // Ini yang paling penting disebut. Asisten cuma MENCATAT permintaan;
            // yang memastikan jamnya manusia, karena kalender pemiliknya tidak
            // pernah dilihat siapa pun di sistem ini.
            (k.janjiDipastikan ? "" : " [BELUM dipastikan pemiliknya]"),
        )
        .join("\n");
    },
  },

  {
    nama: "cari_kontak",
    untuk:
      "Cari pelanggan dari nama atau nomor. WAJIB dipakai sebelum mengusulkan kirim apa pun.",
    argumen: `{"kata":"budi"}`,
    async jalankan({ workspaceId }, arg) {
      const kata = String(arg?.kata ?? "").trim();
      if (!kata) return "Kata pencariannya kosong.";

      const orang = await prisma.contact.findMany({
        where: {
          workspaceId,
          ...HANYA_PELANGGAN_ASLI,
          OR: [
            { name: { contains: kata } },
            { waPushName: { contains: kata } },
            { phone: { contains: kata } },
            { businessName: { contains: kata } },
          ],
        },
        orderBy: { updatedAt: "desc" },
        take: 8,
      });
      if (orang.length === 0) return `Tidak ada pelanggan yang cocok dengan "${kata}".`;

      return (
        `Ketemu ${orang.length}:\n` +
        orang
          .map(
            (k) =>
              `- ${baris(k)} (id: ${k.id}, nomor: ${k.phone ?? "tidak diketahui"}, tahap: ${k.stage})`,
          )
          .join("\n")
      );
    },
  },

  {
    nama: "lihat_kontak",
    untuk: "Riwayat dan keadaan satu pelanggan. Butuh id dari cari_kontak.",
    argumen: `{"kontakId":"..."}`,
    async jalankan({ workspaceId }, arg) {
      const k = await prisma.contact.findFirst({
        where: { id: String(arg?.kontakId ?? ""), workspaceId },
        include: {
          conversations: {
            orderBy: { lastMessageAt: "desc" },
            take: 1,
            include: {
              messages: { orderBy: { createdAt: "desc" }, take: 12 },
            },
          },
        },
      });
      if (!k) return "Pelanggan dengan id itu tidak ada.";

      const utas = k.conversations[0];
      const potongan = (utas?.messages ?? [])
        .slice()
        .reverse()
        .map((m) => `${m.role === "customer" ? "Pelanggan" : "Kita"}: ${m.content.slice(0, 220)}`)
        .join("\n");

      return [
        `Nama: ${baris(k)}`,
        `Nomor: ${k.phone ?? "tidak diketahui"}`,
        `Tahap: ${k.stage}`,
        k.masalah ? `Keluhan: ${k.masalah}` : null,
        k.janjiPada
          ? `Janji temu: ${k.janjiPada.toLocaleString("id-ID")}${k.janjiDipastikan ? "" : " (belum dipastikan)"}`
          : null,
        k.notes ? `Catatan pemilik: ${k.notes.slice(0, 300)}` : null,
        potongan ? `\nObrolan terakhir:\n${potongan}` : "\nBelum ada obrolan.",
      ]
        .filter(Boolean)
        .join("\n");
    },
  },

  {
    nama: "cari_info_bisnis",
    untuk: "Cari harga, stok, layanan, atau aturan yang tertulis di Info bisnis.",
    argumen: `{"pertanyaan":"harga paket cuci sepatu"}`,
    async jalankan({ agentId }, arg) {
      if (!agentId) return "Belum ada asisten di akun ini, jadi Info bisnisnya kosong.";
      const q = String(arg?.pertanyaan ?? "").trim();
      if (!q) return "Pertanyaannya kosong.";

      const chunks = await searchKnowledge(agentId, q, 6);
      if (chunks.length === 0) {
        // "Tidak ketemu" dan "tidak ada" itu dua hal yang berbeda, dan
        // menyamakannya bikin asisten bilang stoknya kosong padahal cuma
        // pencariannya yang meleset. Bedanya harus tetap terbaca di sini juga.
        return "Tidak ada catatan yang cocok di Info bisnis. Belum tentu barangnya tidak ada, bisa jadi memang belum ditulis.";
      }
      return formatKnowledge(chunks);
    },
  },

  {
    nama: "daftar_gambar",
    untuk: "Gambar dan berkas bisnis yang siap dikirim, beserta kodenya.",
    async jalankan({ agentId }) {
      if (!agentId) return "Belum ada asisten di akun ini.";
      const berkas = await prisma.mediaAsset.findMany({
        where: { agentId },
        orderBy: { createdAt: "desc" },
        take: 40,
      });
      if (berkas.length === 0) return "Belum ada gambar atau berkas yang diunggah.";

      return berkas
        .map((b) => `- ${b.name} (kode: ${b.code}, jenis: ${b.kind}) — ${b.description}`)
        .join("\n");
    },
  },

  {
    nama: "pemakaian",
    untuk: "Sisa jatah balasan bulan ini dan paket yang dipakai.",
    async jalankan({ workspaceId }) {
      const ws = await prisma.workspace.findUniqueOrThrow({ where: { id: workspaceId } });
      const paket = getPlan(ws.plan);
      const terpakai = terpakaiSekarang(ws.aiCreditsUsed, ws.quotaResetAt);
      return [
        `Paket: ${paket.name}`,
        `Balasan terpakai bulan ini: ${terpakai} dari ${paket.aiCredits}`,
        `Hitungan mulai dari nol lagi: ${periodeBerikutnya(ws.quotaResetAt).toLocaleDateString("id-ID", { day: "numeric", month: "long" })}`,
      ].join("\n");
    },
  },

  {
    nama: "daftar_info",
    untuk:
      "Judul semua catatan Info bisnis yang sudah tersimpan, plus sisa jatah catatan.",
    async jalankan({ workspaceId, agentId }) {
      if (!agentId) return "Belum ada asisten di akun ini.";

      const [ws, catatan, terpakai] = await Promise.all([
        prisma.workspace.findUniqueOrThrow({ where: { id: workspaceId } }),
        prisma.knowledgeSource.findMany({
          where: { agentId },
          orderBy: { createdAt: "desc" },
          take: 60,
          select: { id: true, title: true, type: true, status: true, content: true },
        }),
        prisma.knowledgeSource.count({ where: { agent: { workspaceId } } }),
      ]);
      const batas = getPlan(ws.plan).maxKnowledgeSources;

      // Sisa jatah ikut disebut, dan itu bukan pelengkap. Tanpa angka ini
      // modelnya mengusulkan catatan baru di akun yang sudah penuh, kartunya
      // muncul, ditekan, lalu gagal. Yang dilihat pemilik toko cuma tombol yang
      // tidak bekerja.
      const kepala = `Catatan terpakai: ${terpakai} dari ${batas}. Sisa ${Math.max(0, batas - terpakai)}.`;

      if (catatan.length === 0) return `${kepala}\nInfo bisnis masih kosong.`;

      return (
        kepala +
        "\n" +
        catatan
          .map(
            (k) =>
              `- ${k.title} (id: ${k.id}, jenis: ${k.type}, status: ${k.status}) — ${k.content
                .replace(/\s+/g, " ")
                .slice(0, 90)}`,
          )
          .join("\n")
      );
    },
  },

  {
    nama: "lihat_info",
    untuk:
      "Isi lengkap satu catatan Info bisnis. WAJIB dipakai sebelum mengusulkan perubahan catatan.",
    argumen: `{"catatanId":"..."}`,
    async jalankan({ workspaceId }, arg) {
      const k = await prisma.knowledgeSource.findFirst({
        where: { id: String(arg?.catatanId ?? ""), agent: { workspaceId } },
      });
      if (!k) return "Catatan dengan id itu tidak ada.";
      return `Judul: ${k.title}\nJenis: ${k.type}\n\n${k.content.slice(0, 6000)}`;
    },
  },

  {
    nama: "lihat_asisten",
    untuk: "Cara bicara asisten sekarang, sapaan pembukanya, dan kapan dia menyerah ke manusia.",
    async jalankan({ agentId }) {
      if (!agentId) return "Belum ada asisten di akun ini.";
      const a = await prisma.agent.findUniqueOrThrow({ where: { id: agentId } });
      return [
        `Nama asisten: ${a.name}`,
        `Cara bicara: ${a.behaviorPrompt?.trim() || "(masih kosong)"}`,
        `Sapaan pembuka: ${a.welcomeMessage?.trim() || "(tidak ada)"}`,
        `Kapan menyerah ke manusia: ${a.handoffCondition?.trim() || "(belum diatur)"}`,
      ].join("\n");
    },
  },

  {
    nama: "keadaan_pemasangan",
    untuk: "Tiga langkah pemasangan: cara bicara, Info bisnis, nomor WhatsApp. Mana yang sudah, mana yang belum.",
    async jalankan({ workspaceId, agentId }) {
      const [agent, jumlahInfo, channel] = await Promise.all([
        agentId ? prisma.agent.findUnique({ where: { id: agentId } }) : null,
        agentId
          ? prisma.knowledgeSource.count({ where: { agentId, status: "ready" } })
          : 0,
        prisma.channel.findFirst({ where: { workspaceId, status: "connected" } }),
      ]);

      return [
        `1. Cara bicara asisten: ${agent?.behaviorPrompt?.trim() ? "SUDAH diisi" : "BELUM diisi"}`,
        `2. Info bisnis: ${jumlahInfo > 0 ? `SUDAH, ${jumlahInfo} catatan terhafal` : "BELUM ada satu pun"}`,
        // Nomor WhatsApp TIDAK bisa dikerjakan dari sini, dan itu harus jelas
        // buat modelnya. Menyambungkan nomor butuh memindai kode QR dengan
        // HP-nya, dan tidak ada kalimat mana pun yang bisa menggantikan itu.
        `3. Nomor WhatsApp: ${channel ? "SUDAH tersambung" : "BELUM tersambung. Ini harus dikerjakan sendiri oleh pemiliknya di halaman Nomor WhatsApp, dengan memindai kode QR pakai HP. Kamu tidak bisa mengerjakannya."}`,
      ].join("\n");
    },
  },
];

// ── Prompt ────────────────────────────────────────────────────────────────────

export type ModeTanya = "perintah" | "pasang";

/**
 * Alat yang boleh dipakai di mode pemasangan.
 *
 * Dipersempit dengan sengaja, dan ini pengaman, bukan kerapian. Orang yang
 * sedang dipandu memasang baru saja mendaftar: dia belum punya pelanggan,
 * belum punya Info bisnis, dan belum tahu asistennya bakal ngomong apa. Utas
 * yang bisa mengirim pesan ke nomor pelanggan di keadaan itu tidak menolong
 * siapa pun, tapi bisa mengirim sesuatu yang tidak bisa ditarik balik atas nama
 * usahanya di hari pertama.
 */
/** Diekspor dengan nama terpisah supaya selftest bisa membuktikan daftarnya,
 *  tanpa membuat isinya kelihatan seperti setelan yang boleh diubah dari luar. */
export const ALAT_PASANG_UJI: ReadonlySet<string> = new Set([
  "keadaan_pemasangan",
  "lihat_asisten",
  "daftar_info",
  "lihat_info",
]);

function alatUntukMode(mode: ModeTanya): Alat[] {
  return mode === "pasang" ? ALAT.filter((a) => ALAT_PASANG_UJI.has(a.nama)) : ALAT;
}

function daftarAlatUntukPrompt(mode: ModeTanya): string {
  return alatUntukMode(mode)
    .map((a) => `- ${a.nama}${a.argumen ? ` ${a.argumen}` : " (tanpa argumen)"}: ${a.untuk}`)
    .join("\n");
}

/** Bentuk balasan JSON, sama di dua mode supaya pembacanya cuma satu. */
function bentukJawaban(mode: ModeTanya): string {
  const usulKirim =
    mode === "pasang"
      ? ""
      : `
3) Mengusulkan kirim pesan ke pelanggan:
{"jawab":"kalimat singkat ke pemiliknya","usul":{"jenis":"kirim_pesan","kontakId":"...","teks":"isi pesan untuk pelanggan"}}

4) Mengusulkan kirim gambar atau berkas:
{"jawab":"kalimat singkat ke pemiliknya","usul":{"jenis":"kirim_berkas","kontakId":"...","kode":"kode-berkas","teks":"kalimat pengantar, boleh kosong"}}
`;

  return `BALASANMU SELALU JSON, satu objek, tanpa penjelasan di luarnya. Bentuknya salah satu dari:

1) Mau memakai alat:
{"alat":"nama_alat","argumen":{}}

2) Sudah selesai, menjawab saja:
{"jawab":"kalimatnya"}
${usulKirim}
5) Mengusulkan catatan Info bisnis BARU:
{"jawab":"kalimat singkat ke pemiliknya","usul":{"jenis":"tambah_info","judul":"Harga paket cuci sepatu","isi":"teks lengkap catatannya"}}

6) Mengusulkan PERUBAHAN catatan yang sudah ada (wajib lihat_info dulu):
{"jawab":"kalimat singkat","usul":{"jenis":"ubah_info","catatanId":"...","judul":"judul barunya","isi":"seluruh isi barunya, bukan cuma bagian yang berubah"}}

7) Mengusulkan cara bicara asisten:
{"jawab":"kalimat singkat","usul":{"jenis":"ubah_asisten","isi":"seluruh teks cara bicaranya"}}

SATU USUL SAJA PER BALASAN. Kalau ada dua hal yang mau kamu simpan, usulkan yang pertama dulu, dan tunggu.`;
}

/** Aturan yang berlaku di dua mode. */
function aturanBersama(): string {
  return `ANGKA DAN FAKTA
Kamu TIDAK BOLEH menyebut angka, nama, tanggal, atau isi catatan yang tidak datang dari hasil alat di percakapan ini, atau dari yang diketik pemiliknya sendiri. Kalau belum punya, panggil alatnya dulu. Menebak itu kesalahan terparah yang bisa kamu buat di sini.

MENYIMPAN SESUATU
Kamu tidak pernah menyimpan sendiri. Kamu menyusun usul, dan pemiliknya yang menekan tombol Simpan. Untuk mengubah catatan yang sudah ada, kamu WAJIB menjalankan lihat_info dulu dan menulis ulang SELURUH isinya, bukan potongannya, karena yang tersimpan menggantikan yang lama.`;
}

function promptPerintah(namaUsaha: string): string {
  return `Kamu Palwise, tangan kanan pemilik usaha "${namaUsaha}". Yang mengajakmu bicara PEMILIKNYA, bukan pelanggan. Jangan pernah menyapa dia seperti pelanggan dan jangan pernah menawarkan produknya kepadanya.

${sekarangIndonesia()}

CARA MENJAWAB
Bahasa Indonesia sehari-hari yang dipakai pemilik toko. Pendek. Tanpa istilah teknis, tanpa tanda pisah panjang, tanpa basa-basi pembuka.

${aturanBersama()}

ALAT BACA
${daftarAlatUntukPrompt("perintah")}

MENGIRIM SESUATU KE PELANGGAN
Kamu tidak bisa mengirim apa pun sendiri. Kamu cuma menyusun usul, dan pemiliknya yang menekan tombol kirim.
Sebelum mengusulkan, kamu WAJIB sudah menjalankan cari_kontak dan dapat id-nya. Jangan pernah mengarang id.
Kalau cari_kontak tidak ketemu, atau ketemu lebih dari satu, JANGAN mengusulkan apa pun: tanya balik yang mana orangnya, sebutkan pilihannya beserta nomornya.
Pesan yang kamu susun ditujukan untuk PELANGGAN, jadi tulis seperti toko yang menghubungi pelanggannya, bukan seperti kamu menjawab pemiliknya.

${bentukJawaban("perintah")}

YANG TIDAK BISA KAMU LAKUKAN, dan katakan apa adanya kalau diminta: menghapus apa pun, mengubah paket atau apa pun yang menyangkut uang, dan mengirim ke banyak orang sekaligus. Untuk yang terakhir, jelaskan bahwa mengirim serentak berisiko membuat nomor WhatsApp-nya diblokir, jadi itu tidak dibuka lewat perintah chat.`;
}

/**
 * Prompt pemandu pemasangan.
 *
 * Bentuknya WAWANCARA, bukan formulir yang dibacakan. Yang membuat halaman
 * Asisten susah bukan jumlah kolomnya, tapi kolom kosong berjudul "Perilaku
 * asisten" yang tidak ada seorang pun tahu harus diisi apa. Pertanyaan
 * "usahamu jualan apa?" menjawab kolom itu tanpa pernah menyebut namanya.
 *
 * Aturan satu pertanyaan per giliran itu yang paling menentukan. Pemilik warung
 * yang ditanya lima hal sekaligus lewat WhatsApp menjawab satu, dan empat
 * sisanya hilang selamanya.
 */
function promptPasang(namaUsaha: string): string {
  return `Kamu Palwise, dan kamu sedang MEMANDU pemilik usaha "${namaUsaha}" memasang asistennya untuk pertama kali. Yang bicara denganmu pemiliknya sendiri.

${sekarangIndonesia()}

CARA MEMANDU
- SATU pertanyaan per giliran. Jangan pernah menanyakan lima hal sekaligus; yang dijawab cuma satu dan sisanya hilang.
- Bahasa Indonesia sehari-hari, pendek, seperti mengobrol di WhatsApp. Tanpa istilah teknis: jangan sebut "prompt", "knowledge base", "konfigurasi", "AI agent".
- Jangan menyuruh dia mengisi halaman mana pun. Dia sudah di sini, dan kamu yang menyusunkan.
- Kalau jawabannya pendek atau samar, tanya balik satu hal yang paling penting, jangan langsung menyimpan tebakan.

URUTAN YANG KAMU KEJAR
1. Usahanya jualan apa, dan siapa yang biasanya beli.
2. Cara bicaranya mau seperti apa (santai atau sopan, panggil "kak" atau "bapak/ibu"), dan hal apa yang asisten TIDAK BOLEH janjikan sendiri, misalnya diskon atau tanggal kirim.
   Sesudah dua hal ini kamu tahu, langsung usulkan ubah_asisten. Jangan menunggu sampai semuanya lengkap: pemiliknya perlu melihat sesuatu jadi lebih dulu, supaya dia mau melanjutkan.
3. Sesudah itu, kumpulkan Info bisnis satu topik per catatan: harga dan daftar barang atau layanan, cara pesan dan cara bayar, pengiriman atau lokasi dan jam buka, aturan retur atau pembatalan.
   Tiap kali satu topik sudah cukup jelas, usulkan tambah_info untuk topik itu saja. Jangan menumpuk empat topik jadi satu catatan.
4. Kalau ketiga langkah di keadaan_pemasangan sudah beres kecuali nomor WhatsApp, bilang bahwa tinggal menyambungkan nomornya di halaman Nomor WhatsApp dengan memindai kode QR pakai HP, dan itu memang harus dia sendiri yang lakukan.

${aturanBersama()}

YANG DITULIS DI CARA BICARA (ubah_asisten)
JALANKAN lihat_asisten DULU, selalu, sebelum mengusulkan. Yang kamu simpan MENGGANTI seluruh teks yang lama, jadi kalau kamu belum membacanya kamu sedang membuang tulisan yang mungkin sudah bagus tanpa tahu isinya.
Yang kamu tulis harus SETIDAKNYA selengkap yang lama. Bawa terus bagian yang sudah ada dan masih benar, ubah yang memang diminta pemiliknya, tambahkan yang baru. Jangan pernah mengirim versi pendek yang cuma memuat hal yang barusan dibicarakan.
Tulis dalam bahasa Indonesia, sebagai perintah untuk asisten, bukan sebagai ringkasan. Wajib memuat empat hal: dia customer service usaha apa, tugasnya, gaya bicara dan panggilan ke pelanggan, dan hal yang tidak boleh dia janjikan sendiri. Jangan memasukkan harga atau daftar barang ke sini, itu tempatnya di Info bisnis.

YANG DITULIS DI CATATAN INFO BISNIS (tambah_info)
Cuma yang benar-benar dikatakan pemiliknya. Jangan menambahkan harga, jam buka, atau aturan yang tidak pernah dia sebut, walau kelihatannya wajar untuk usaha seperti itu. Catatan karangan akan dibacakan asisten ke pelanggan sungguhan sebagai fakta.

ALAT BACA
${daftarAlatUntukPrompt("pasang")}

${bentukJawaban("pasang")}

Di utas ini kamu TIDAK bisa mengirim pesan ke pelanggan, tidak bisa menyambungkan nomor WhatsApp, dan tidak bisa menghapus apa pun.`;
}

function systemPrompt(namaUsaha: string, mode: ModeTanya): string {
  return mode === "pasang" ? promptPasang(namaUsaha) : promptPerintah(namaUsaha);
}

// ── Putaran ───────────────────────────────────────────────────────────────────

/**
 * Berapa kali alat boleh dipakai dalam satu perintah.
 *
 * Tiga sudah cukup untuk rantai terpanjang yang masuk akal: cari orangnya,
 * lihat obrolannya, cari harganya. Yang keempat hampir selalu tanda modelnya
 * berputar-putar, dan tiap putaran itu satu panggilan model lagi yang dibayar
 * tanpa menambah apa pun.
 */
const ALAT_MAKS = 3;

/** Berapa giliran lama yang ikut dikirim. Riwayat panjang itu token yang dibayar tiap pesan. */
const RIWAYAT_GILIRAN = 8;

export interface JalankanTanyaInput {
  workspaceId: string;
  /** Giliran sebelumnya, urut dari yang paling lama. */
  riwayat: { peran: string; teks: string }[];
  pesan: string;
  /** Mode utasnya. Menentukan prompt DAN alat mana yang boleh dipakai. */
  mode?: ModeTanya;
}

export async function jalankanTanya({
  workspaceId,
  riwayat,
  pesan,
  mode = "perintah",
}: JalankanTanyaInput): Promise<HasilTanya> {
  const [ws, agent] = await Promise.all([
    prisma.workspace.findUniqueOrThrow({ where: { id: workspaceId } }),
    prisma.agent.findFirst({ where: { workspaceId }, orderBy: { createdAt: "asc" } }),
  ]);

  const ctx: Konteks = { workspaceId, agentId: agent?.id ?? null };
  const llm = getLlm();
  const system = systemPrompt(ws.name, mode);
  // Peta alatnya ikut disaring per mode. Prompt yang tidak menyebut sebuah alat
  // saja tidak cukup: model tetap bisa menyebut nama alat yang dia ingat dari
  // mode lain, dan yang menahannya harus kode, bukan kalimat.
  const petaAlat = new Map(alatUntukMode(mode).map((a) => [a.nama, a]));

  const pesanModel: LlmMessage[] = [
    ...riwayat
      .slice(-RIWAYAT_GILIRAN)
      .map((r) =>
        textMessage(r.peran === "pemilik" ? "user" : "assistant", r.teks),
      ),
    textMessage("user", pesan),
  ];

  const dipakai: string[] = [];

  for (let langkah = 0; langkah <= ALAT_MAKS; langkah++) {
    const mentah = await llm.complete({
      system,
      messages: pesanModel,
      temperature: 0.2,
      json: true,
      maxTokens: 1400,
      model: env.GEMINI_MODEL,
    });

    const jawaban = parseJsonLoose(mentah);
    if (!jawaban || typeof jawaban !== "object") {
      log.warn(`ruang perintah: balasan model bukan JSON — ${mentah.slice(0, 200)}`);
      return {
        teks: "Maaf, aku belum menangkap maksudnya. Coba tulis ulang dengan kalimat lain ya.",
        usul: null,
        alat: dipakai,
      };
    }

    // Masih mau memakai alat.
    if (typeof jawaban.alat === "string" && jawaban.alat) {
      const alat = petaAlat.get(jawaban.alat);

      // Alat yang tidak ada TIDAK dijadikan galat ke pemiliknya. Modelnya
      // diberi tahu, lalu dia mencoba lagi dengan alat yang benar. Yang lihat
      // layar tidak perlu tahu ada satu langkah yang meleset.
      if (!alat) {
        pesanModel.push(textMessage("assistant", mentah));
        pesanModel.push(
          textMessage(
            "user",
            `HASIL ALAT: alat "${jawaban.alat}" tidak ada. Pakai salah satu dari daftar, atau jawab langsung.`,
          ),
        );
        continue;
      }

      if (langkah === ALAT_MAKS) {
        // Sudah mentok. Suruh dia menjawab dengan apa yang sudah ada, jangan
        // dibiarkan berputar lagi.
        pesanModel.push(textMessage("assistant", mentah));
        pesanModel.push(
          textMessage(
            "user",
            "HASIL ALAT: jatah pemakaian alat sudah habis untuk perintah ini. Jawab sekarang dengan hasil yang sudah ada, atau katakan kamu butuh keterangan tambahan dari pemiliknya.",
          ),
        );
        continue;
      }

      let hasil: string;
      try {
        hasil = await alat.jalankan(ctx, jawaban.argumen ?? {});
      } catch (err) {
        log.error(
          `ruang perintah: alat ${alat.nama} gagal — ${err instanceof Error ? err.message : err}`,
        );
        hasil = "Alatnya gagal dijalankan. Katakan ke pemiliknya kalau bagian ini belum bisa dibaca.";
      }

      dipakai.push(alat.nama);
      pesanModel.push(textMessage("assistant", mentah));
      pesanModel.push(textMessage("user", `HASIL ALAT ${alat.nama}:\n${hasil}`));
      continue;
    }

    const teks = String(jawaban.jawab ?? "").trim();
    const usul = await bacaUsul(ctx, jawaban.usul, mode);

    return {
      teks:
        teks ||
        (usul
          ? "Ini yang mau aku kirim. Cek dulu, baru tekan Kirim."
          : "Aku belum punya jawabannya."),
      usul,
      alat: dipakai,
    };
  }

  return {
    teks: "Maaf, aku muter-muter dan belum ketemu jawabannya. Coba tanya dengan cara lain ya.",
    usul: null,
    alat: dipakai,
  };
}

/**
 * Panjang maksimum satu catatan Info bisnis.
 *
 * Angka yang sama dengan yang dipakai formulir Info bisnis. Bukan kebetulan
 * dua-duanya 200.000: kalau jalur chat lebih longgar, catatan yang masuk lewat
 * sini akan ditolak formulir waktu orangnya mau menyuntingnya nanti.
 */
const MAKS_ISI_CATATAN = 200_000;

/**
 * Periksa usul yang ditulis model sebelum dia jadi kartu di layar.
 *
 * Semua yang disebut model diverifikasi ulang ke database di sini: kontaknya
 * memang ada DAN memang milik workspace ini, berkasnya memang ada, catatan yang
 * mau diubah memang catatan akun ini. Yang tidak lolos dibuang diam-diam, dan
 * jawabannya tetap tampil sebagai kalimat biasa.
 *
 * Kenapa dibuang, bukan ditampilkan sebagai galat: usul yang kontaknya karangan
 * berarti modelnya sedang menebak, dan kartu "Kirim ke Budi" yang Budi-nya
 * bukan Budi yang dimaksud itu justru jebakan. Lebih baik tidak ada kartunya.
 */
export async function bacaUsul(
  ctx: Konteks,
  mentah: any,
  mode: ModeTanya = "perintah",
): Promise<Usul | null> {
  if (!mentah || typeof mentah !== "object") return null;

  const jenis = String(mentah.jenis ?? "");

  // ── Yang menyentuh pelanggan ────────────────────────────────────────────────
  if (jenis === "kirim_pesan" || jenis === "kirim_berkas") {
    // Ditolak di KODE, bukan cuma tidak disebut di prompt. Utas pemasangan
    // dipakai orang yang baru mendaftar; pesan yang keluar dari nomornya di
    // hari pertama tidak bisa ditarik balik, dan prompt yang tidak menyebut
    // sebuah kemampuan bukan penghalang, cuma anjuran.
    if (mode === "pasang") {
      log.warn("ruang perintah: usul kirim ditolak, utas ini mode pemasangan");
      return null;
    }

    const kontakId = String(mentah.kontakId ?? "").trim();
    if (!kontakId) return null;

    const kontak = await prisma.contact.findFirst({
      where: { id: kontakId, workspaceId: ctx.workspaceId, ...HANYA_PELANGGAN_ASLI },
    });
    if (!kontak) {
      log.warn(`ruang perintah: usul dibuang, kontak "${kontakId}" bukan milik workspace ini`);
      return null;
    }

    const kepada = displayName(kontak);
    const nomor = kontak.phone ?? null;

    if (jenis === "kirim_pesan") {
      const teks = String(mentah.teks ?? "").trim();
      if (!teks) return null;
      return { jenis: "kirim_pesan", kontakId, kepada, nomor, teks };
    }

    if (!ctx.agentId) return null;
    const kode = String(mentah.kode ?? "").trim();
    if (!kode) return null;

    const berkas = await prisma.mediaAsset.findFirst({
      where: { agentId: ctx.agentId, code: kode },
    });
    if (!berkas) {
      log.warn(`ruang perintah: usul dibuang, berkas berkode "${kode}" tidak ada`);
      return null;
    }

    return {
      jenis: "kirim_berkas",
      kontakId,
      kepada,
      nomor,
      kode,
      namaBerkas: berkas.name,
      teks: String(mentah.teks ?? "").trim(),
    };
  }

  // ── Yang menyentuh setelan ──────────────────────────────────────────────────
  if (jenis === "tambah_info") {
    if (!ctx.agentId) return null;
    const isi = String(mentah.isi ?? "").trim().slice(0, MAKS_ISI_CATATAN);
    // Batas bawah yang sama dengan formulirnya. Catatan sepotong bikin
    // pencarian mengembalikan potongan yang tidak berarti apa-apa, dan itu
    // lebih buruk daripada tidak ada catatan sama sekali.
    if (isi.length < 20) return null;

    const judul =
      String(mentah.judul ?? "").trim().slice(0, 120) ||
      isi.replace(/\s+/g, " ").slice(0, 60);

    return { jenis: "tambah_info", judul, isi };
  }

  if (jenis === "ubah_info") {
    const catatanId = String(mentah.catatanId ?? "").trim();
    if (!catatanId) return null;

    const catatan = await prisma.knowledgeSource.findFirst({
      where: { id: catatanId, agent: { workspaceId: ctx.workspaceId } },
    });
    if (!catatan) {
      log.warn(`ruang perintah: usul dibuang, catatan "${catatanId}" bukan milik workspace ini`);
      return null;
    }

    const isi = String(mentah.isi ?? "").trim().slice(0, MAKS_ISI_CATATAN);
    if (isi.length < 20) return null;
    // Perubahan yang tidak mengubah apa-apa tidak usah jadi kartu. Tombol yang
    // ditekan lalu tidak mengubah apa pun bikin orang mengira produknya rusak.
    if (isi === catatan.content) return null;

    return {
      jenis: "ubah_info",
      catatanId,
      judul: String(mentah.judul ?? "").trim().slice(0, 120) || catatan.title,
      isiLama: catatan.content,
      isi,
    };
  }

  if (jenis === "ubah_asisten") {
    if (!ctx.agentId) return null;
    const isi = String(mentah.isi ?? "").trim().slice(0, 8000);
    if (isi.length < 20) return null;

    const agent = await prisma.agent.findUnique({ where: { id: ctx.agentId } });
    const isiLama = agent?.behaviorPrompt ?? "";
    if (isi === isiLama.trim()) return null;

    return { jenis: "ubah_asisten", isiLama, isi };
  }

  return null;
}

/**
 * Judul utas, diambil dari perintah pertama.
 *
 * Sengaja dipotong tanpa memanggil model. Judul itu cuma penanda di daftar
 * riwayat, dan membayar satu panggilan model untuk enam kata di sidebar itu
 * ongkos yang tidak pernah balik.
 */
export function judulDariPesan(pesan: string): string {
  const bersih = pesan.replace(/\s+/g, " ").trim();
  if (bersih.length <= 42) return bersih;
  const potong = bersih.slice(0, 42);
  const spasi = potong.lastIndexOf(" ");
  return (spasi > 20 ? potong.slice(0, spasi) : potong) + "…";
}
