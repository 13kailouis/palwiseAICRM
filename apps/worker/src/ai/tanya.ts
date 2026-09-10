import {
  HANYA_OBROLAN_ASLI,
  HANYA_PELANGGAN_ASLI,
  bacaHasilTanya,
  displayName,
  getPlan,
  periodeBerikutnya,
  prisma,
  terpakaiSekarang,
  tanyaStatusWhatsApp,
  muatPusatBisnis,
  teksPusatBisnis,
  type HasilBacaTanya,
} from "@palwise/db";
import { log } from "../lib/log.js";
import { parseJsonLoose, sekarangIndonesia } from "./agent.js";
import { getLlm } from "./provider.js";
import { formatKnowledge, searchKnowledge } from "./rag.js";
import { LlmMessage, textMessage } from "./types.js";
import { hasilUntukChat, hasilDijanjikanTanpaIsi, janjiPemeriksaan, konteksGiliranTanya, permintaanAnalisis, rentangHitunganLangsung, tahapYangDiminta, TAHAP_TANYA, type GiliranTanya } from "./tanyaBacaan.js";
import { koneksiTanya } from "./tanyaKoneksi.js";

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
      /** Which text box of the Asisten page. Missing on older rows means cara_bicara. */
      bagian?: BagianAsisten;
      /** Teks lama, sama alasannya: yang diubah harus kelihatan, bukan cuma yang baru. */
      isiLama: string;
      isi: string;
    }
  | {
      jenis: "atur_asisten";
      /** Only the settings that change, each with its value before and after. */
      ubahan: UbahanAsisten[];
    }
  // ── Managing data: every action a page offers, still as a card the owner presses ──
  | { jenis: "ubah_pelanggan"; kontakId: string; kepada: string; nomor: string | null; ubahan: UbahanPelanggan[] }
  | { jenis: "hapus_pelanggan"; kontakId: string; kepada: string; nomor: string | null }
  | { jenis: "hafalkan_info"; catatanId: string; judul: string }
  | { jenis: "hapus_info"; catatanId: string; judul: string; cuplikan: string }
  | { jenis: "ubah_berkas"; berkasId: string; namaLama: string; keteranganLama: string; nama: string; keterangan: string }
  | { jenis: "baca_berkas"; berkasId: string; nama: string }
  | { jenis: "hapus_berkas"; berkasId: string; nama: string }
  | { jenis: "atur_nomor"; nomorId: string; namaNomor: string; aksi: "matikan" | "nyalakan" | "ganti_nama"; namaBaru?: string }
  | { jenis: "hapus_nomor"; nomorId: string; namaNomor: string }
  /** Payments, email, password and new numbers stay on their own pages; the card is only a link. */
  | { jenis: "buka_halaman"; tujuan: TujuanHalaman; alasan: string };

export type KunciPelanggan = "stage" | "notes" | "janjiPada" | "janjiCatatan" | "bereskanMasalah" | "name" | "businessName" | "industry";
export interface UbahanPelanggan { kunci: KunciPelanggan; lama: string | null; baru: string | null }
export const HALAMAN_TUJUAN = ["tagihan", "akun", "whatsapp", "agent", "knowledge", "galeri", "kontak"] as const;
export type TujuanHalaman = (typeof HALAMAN_TUJUAN)[number];
const TAHAP_PELANGGAN = ["baru", "tertarik", "negosiasi", "closing", "selesai", "batal"];
/** Proposals that change or delete data. Setup threads never get them. */
const USUL_KELOLA = new Set(["ubah_pelanggan", "hapus_pelanggan", "hafalkan_info", "hapus_info", "ubah_berkas", "baca_berkas", "hapus_berkas", "atur_nomor", "hapus_nomor"]);

/**
 * The three free-text boxes of the Asisten page, each its own column. Before this existed every
 * assistant edit landed in behaviorPrompt, so "ubah sapaan pertama" was written into the cara
 * bicara text as a line, while the real greeting stayed unchanged.
 */
export type BagianAsisten = "cara_bicara" | "sapaan" | "serah_manusia";
export const KOLOM_BAGIAN = {
  cara_bicara: "behaviorPrompt",
  sapaan: "welcomeMessage",
  serah_manusia: "handoffCondition",
} as const;

type AturanSetelan =
  | { jenis: "ya_tidak" }
  | { jenis: "angka"; min: number; maks: number }
  | { jenis: "jam" }
  | { jenis: "teks" }
  | { jenis: "pilihan"; pilihan: string[] };

/** Toggles, numbers and short texts of the Asisten page, with the same bounds as its save action. */
export const SETELAN_ASISTEN = {
  isActive: { jenis: "ya_tidak" },
  rasaAktif: { jenis: "ya_tidak" },
  splitBubbles: { jenis: "ya_tidak" },
  watak: { jenis: "pilihan", pilihan: ["hangat", "tenang", "santai", "tegas"] },
  officeHoursEnabled: { jenis: "ya_tidak" },
  officeHoursStart: { jenis: "jam" },
  officeHoursEnd: { jenis: "jam" },
  followUpEnabled: { jenis: "ya_tidak" },
  followUpAfterHours: { jenis: "angka", min: 1, maks: 720 },
  followUpMaxAttempts: { jenis: "angka", min: 1, maks: 5 },
  followUpPrompt: { jenis: "teks" },
  afterSalesEnabled: { jenis: "ya_tidak" },
  afterSalesAfterDays: { jenis: "angka", min: 1, maks: 60 },
  afterSalesPrompt: { jenis: "teks" },
  restockEnabled: { jenis: "ya_tidak" },
  restockAfterDays: { jenis: "angka", min: 3, maks: 365 },
  restockPrompt: { jenis: "teks" },
  pengingatEnabled: { jenis: "ya_tidak" },
  pengingatJamSebelum: { jenis: "angka", min: 1, maks: 168 },
  pengingatPrompt: { jenis: "teks" },
} satisfies Record<string, AturanSetelan>;
export type KunciSetelan = keyof typeof SETELAN_ASISTEN;
export interface UbahanAsisten {
  kunci: KunciSetelan;
  lama: string | number | boolean;
  baru: string | number | boolean;
}

/** A template marker such as "[ISI SAPAAN BARU DI SINI]" or "[nama toko]" would reach customers verbatim. */
const PENANDA_KOSONG = /\[[^\]\n]{2,40}\]/;

export interface HasilTanya {
  teks: string;
  usul: Usul | null;
  /** Nama alat yang benar-benar dijalankan, untuk ditampilkan di bawah jawaban. */
  alat: string[];
  hasilBaca: HasilBacaTanya[];
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
export function rentangWaktu(nama: string, sekarang = new Date()): { dari: Date; sampai: Date; sebutan: string } {
  const awalHariIni = new Date(sekarang);
  // Calendar days use Jakarta time on both Windows and the UTC production host.
  const jakarta = new Date(awalHariIni.getTime() + 7 * 60 * 60 * 1000);
  awalHariIni.setTime(Date.UTC(jakarta.getUTCFullYear(), jakarta.getUTCMonth(), jakarta.getUTCDate()) - 7 * 60 * 60 * 1000);
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
  ...["ringkasan_bisnis", "prioritas_bisnis", "peluang_follow_up"].map(nama => ({
    nama,
    untuk: nama === "ringkasan_bisnis" ? "Perbandingan 7/30 hari, pesan, pelanggan, klaim pembayaran, tahap CRM dan kesiapan bisnis. Gunakan sebelum memberi strategi pertumbuhan. Tidak memuat omzet." : nama === "prioritas_bisnis" ? "Brief kerja: obrolan yang membutuhkan manusia/keluhan, janji mulai hari ini, dan peluang follow up beserta alasan." : "Cari peluang follow up dari prospek yang tidak aktif 1–30 hari, tanpa masalah atau jeda. Bukan izin mengirim; baca kontak sebelum membuat draf.",
    argumen: "{ hari?: 7 | 30 }",
    jalankan: async (ctx: Konteks, arg: Record<string, unknown>) => teksPusatBisnis(await muatPusatBisnis(ctx.workspaceId, arg.hari === 30 ? 30 : 7)),
  })),
  {
    nama: "status_whatsapp",
    untuk: "Status sambungan WhatsApp saat ini, termasuk nomor yang putus. Baca ini saat ditanya apakah WhatsApp sudah tersambung; riwayat lama bukan bukti koneksi aktif.",
    async jalankan({ workspaceId }) { return (await koneksiTanya(workspaceId)).teks; },
  },
  {
    nama: "daftar_nomor",
    untuk: "Nomor WhatsApp di akun ini beserta id, nama, dan keadaannya. Wajib sebelum mengusulkan atur_nomor atau hapus_nomor.",
    async jalankan({ workspaceId }) {
      const nomor = await prisma.channel.findMany({
        where: { workspaceId }, orderBy: { createdAt: "asc" },
        select: { id: true, name: true, status: true, phoneNumber: true, autoStart: true },
      });
      if (!nomor.length) return "Belum ada nomor WhatsApp di akun ini.";
      const label: Record<string, string> = { connected: "tersambung", connecting: "sedang menyambungkan", qr: "menunggu scan QR", logged_out: "tautan dicabut dari WhatsApp", disconnected: "terputus" };
      return nomor.map(c => `- ${c.name} (id: ${c.id}, nomor: ${c.phoneNumber ?? "belum ditautkan"}, ${label[c.status] ?? "belum tersambung"}${c.autoStart ? "" : ", sedang dimatikan"})`).join("\n");
    },
  },
  {
    nama: "daftar_pelanggan",
    untuk: "Daftar dan jumlah pelanggan menurut tahap CRM. Pakai tahap tertarik untuk pelanggan berminat; ini BERBEDA dari menunggu balasan atau komplain.",
    argumen: `{"tahap":"baru|tertarik|negosiasi|closing|selesai|batal"}`,
    async jalankan({ workspaceId }, arg) {
      const tahap = String(arg?.tahap ?? "");
      if (!TAHAP_TANYA.some(t => t === tahap)) return "Sebutkan tahap pelanggan: baru, tertarik, negosiasi, closing, selesai, atau batal.";
      const where = { workspaceId, ...HANYA_PELANGGAN_ASLI, stage: tahap };
      const [jumlah, orang] = await prisma.$transaction([
        prisma.contact.count({ where }),
        prisma.contact.findMany({ where, orderBy: [{ updatedAt: "desc" }, { id: "asc" }], take: 20,
          select: { id: true, name: true, waPushName: true, phone: true, stage: true } }),
      ]);
      if (!jumlah) return `Belum ada pelanggan yang tercatat di tahap ${tahap}.`;
      return `Ada ${jumlah} pelanggan yang tercatat di tahap ${tahap}.` +
        (jumlah > orang.length ? ` Menampilkan ${orang.length} dari ${jumlah}; daftar lengkap tersedia di halaman Pelanggan.` : "") + "\n\n" +
        orang.map(k => `- ${baris(k)} (id: ${k.id}${k.phone ? `, nomor: ${k.phone}` : ""}) — tahap ${k.stage}`).join("\n");
    },
  },
  {
    nama: "hitung_obrolan",
    untuk: "Berapa pelanggan yang chat, berapa balasan yang keluar, berapa pelanggan baru.",
    argumen: `{"rentang":"hari-ini|kemarin|7-hari|30-hari"}`,
    async jalankan({ workspaceId }, arg) {
      const { dari, sampai, sebutan } = rentangWaktu(String(arg?.rentang ?? "hari-ini"));
      const dalam = { gte: dari, lt: sampai };

      // Show message count and unique customers separately, including across channels.
      const [utas, balasan, pelangganBaru, masuk, koneksi] = await Promise.all([
        prisma.message.findMany({
          where: {
            role: "customer",
            createdAt: dalam,
            conversation: { workspaceId, ...HANYA_OBROLAN_ASLI },
          },
          select: { conversation: { select: { contactId: true } } },
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
        prisma.message.count({ where: { role: "customer", createdAt: dalam, conversation: { workspaceId, ...HANYA_OBROLAN_ASLI } } }),
        koneksiTanya(workspaceId),
      ]);

      return [
        ...(koneksi.catatan ? [koneksi.catatan, ""] : []),
        `Tercatat ${sebutan} (WIB):`,
        `Pesan masuk: ${masuk}`,
        `Pelanggan yang chat: ${new Set(utas.map(u => u.conversation.contactId)).size}`,
        `Pesan yang keluar dari kamu dan asisten: ${balasan}`,
        `Pelanggan yang baru pertama chat: ${pelangganBaru}`,
        ...(koneksi.catatan ? ["", "Angka ini bukan jumlah seluruh chat di WhatsApp. Tautkan kembali untuk menerima chat berikutnya."] : []),
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
      "Baca catatan Info bisnis. WAJIB sebelum mengubah catatan. Tambahkan argumen bagian (kata/judul seperti KONTAK) untuk mencari bagian dalam catatan panjang.",
    argumen: `{"catatanId":"..."}`,
    async jalankan({ workspaceId }, arg) {
      const k = await prisma.knowledgeSource.findFirst({
        where: { id: String(arg?.catatanId ?? ""), agent: { workspaceId } },
      });
      if (!k) return "Catatan dengan id itu tidak ada.";
      const bagian = String(arg.bagian ?? "").trim();
      const posisi = bagian ? k.content.toLowerCase().indexOf(bagian.toLowerCase()) : 0;
      if (posisi < 0) return `Bagian "${bagian}" tidak ditemukan. Coba kata lain atau lihat dari awal.`;
      const mulai = Math.max(0, posisi - 200);
      const potongan = k.content.slice(mulai, mulai + 6000);
      return `Judul: ${k.title}\nJenis: ${k.type}\nPanjang: ${k.content.length} karakter. Menampilkan ${mulai + 1}–${mulai + potongan.length}. Untuk edit sebagian gunakan ubah_bagian_info dengan cari yang disalin PERSIS dari teks; bagian lain dipertahankan server.\n\n${potongan}`;
    },
  },

  {
    nama: "lihat_asisten",
    untuk: "Semua isi halaman Asisten: cara kerja dan gaya bicara, sapaan pertama, kapan harus panggil kamu, nada bicara, jam kerja, dan sapa otomatis (follow up, tanya kabar, ajak beli lagi, pengingat janji).",
    async jalankan({ agentId }) {
      if (!agentId) return "Belum ada asisten di akun ini.";
      const a = await prisma.agent.findUniqueOrThrow({ where: { id: agentId } });
      const nyala = (b: boolean) => (b ? "nyala" : "mati");
      // Labels match the Asisten page, so what the owner reads here is what they see there.
      return [
        `Nama asisten: ${a.name}`,
        `Asisten sedang bekerja: ${a.isActive ? "ya" : "tidak"}`,
        `Cara kerja dan gaya bicara: ${a.behaviorPrompt?.trim() || "(masih kosong)"}`,
        `Sapaan pertama: ${a.welcomeMessage?.trim() || "(tidak ada)"}`,
        `Kapan harus panggil kamu: ${a.handoffCondition?.trim() || "(belum diatur)"}`,
        `Nada bicara: ${a.watak}. Baca perasaan pelanggan: ${nyala(a.rasaAktif)}. Pecah jawaban panjang: ${nyala(a.splitBubbles)}.`,
        `Ikut jam kerja tim: ${a.officeHoursEnabled ? `nyala, ${a.officeHoursStart}-${a.officeHoursEnd}` : "mati"}`,
        `Follow up otomatis: ${a.followUpEnabled ? `nyala, setelah ${a.followUpAfterHours} jam, paling banyak ${a.followUpMaxAttempts} kali` : "mati"}. Pesannya: ${a.followUpPrompt}`,
        `Tanya kabar setelah beli: ${a.afterSalesEnabled ? `nyala, setelah ${a.afterSalesAfterDays} hari` : "mati"}. Pesannya: ${a.afterSalesPrompt}`,
        `Ajak beli lagi: ${a.restockEnabled ? `nyala, setelah ${a.restockAfterDays} hari` : "mati"}. Pesannya: ${a.restockPrompt}`,
        `Pengingat janji temu: ${a.pengingatEnabled ? `nyala, ${a.pengingatJamSebelum} jam sebelumnya` : "mati"}. Pesannya: ${a.pengingatPrompt}`,
      ].join("\n");
    },
  },

  {
    nama: "sambungkan_whatsapp",
    untuk: "Tampilkan kartu QR untuk menautkan nomor WhatsApp pemilik lewat Perangkat tertaut langsung di chat. Bukan gambar galeri atau QR pembayaran.",
    async jalankan() {
      return "Kartu sambungan WhatsApp ditampilkan di bawah obrolan. Pemilik memilih nomor lalu menekan Tampilkan QR, dan memindai dari WhatsApp > Perangkat tertaut > Tautkan perangkat. Status dan QR diambil langsung oleh kartu. Jangan mengaku nomor sudah tersambung; kartu memeriksa statusnya. Jangan mencari QR ini di daftar_gambar. Kalau memakai HP yang sama, tampilkan chat ini di komputer atau perangkat lain lalu scan dari HP WhatsApp.";
    },
  },
  {
    nama: "keadaan_pemasangan",
    untuk: "Tiga langkah pemasangan: cara bicara, Info bisnis, nomor WhatsApp. Mana yang sudah, mana yang belum.",
    async jalankan({ workspaceId, agentId }) {
      const [agent, jumlahInfo, koneksi] = await Promise.all([
        agentId ? prisma.agent.findUnique({ where: { id: agentId } }) : null,
        agentId
          ? prisma.knowledgeSource.count({ where: { agentId, status: "ready" } })
          : 0,
        koneksiTanya(workspaceId),
      ]);

      return [
        `1. Cara bicara asisten: ${agent?.behaviorPrompt?.trim() ? "SUDAH diisi" : "BELUM diisi"}`,
        `2. Info bisnis: ${jumlahInfo > 0 ? `SUDAH, ${jumlahInfo} catatan terhafal` : "BELUM ada satu pun"}`,
        `3. Nomor WhatsApp: ${koneksi.aktif ? koneksi.teks : "BELUM tersambung. Jalankan sambungkan_whatsapp untuk membuka kartu QR di chat ini. Pemilik tetap harus menekan Tampilkan QR dan memindainya lewat Perangkat tertaut di HP sendiri."}`,
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
  "status_whatsapp",
  "keadaan_pemasangan",
  "sambungkan_whatsapp",
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
  const usulHalaman = `
13) Yang HARUS lewat halaman resminya (ganti paket atau pembayaran, ganti email atau sandi, menambah nomor WhatsApp baru): jangan cuma menolak. Jelaskan singkat, lalu beri tombol ke halamannya:
{"jawab":"kalimat singkat","usul":{"jenis":"buka_halaman","tujuan":"tagihan|akun|whatsapp|agent|knowledge|galeri|kontak","alasan":"apa yang bisa dia lakukan di sana"}}
`;
  const usulKelola = mode === "pasang" ? usulHalaman : `
8) Mengubah data SATU pelanggan (wajib cari_kontak dulu). Hanya kunci yang berubah:
{"jawab":"kalimat singkat","usul":{"jenis":"ubah_pelanggan","kontakId":"...","ubahan":{"stage":"tertarik","notes":"catatan pemilik","janjiPada":"2026-09-12T14:00:00+07:00","janjiCatatan":"keperluan janjinya","bereskanMasalah":true,"name":"nama","businessName":"nama usahanya","industry":"bidang usahanya"}}}
stage: baru|tertarik|negosiasi|closing|selesai|batal. janjiPada ISO dengan +07:00 (WIB); null berarti menghapus janjinya. bereskanMasalah true = keluhannya ditandai beres. notes MENGGANTI seluruh catatan pemilik, jadi bawa catatan lama yang masih benar (baca lihat_kontak dulu).

9) Info bisnis: hafalkan ulang satu catatan, atau HAPUS satu catatan (wajib daftar_info dulu untuk id-nya):
{"jawab":"kalimat singkat","usul":{"jenis":"hafalkan_info","catatanId":"..."}}
{"jawab":"kalimat singkat","usul":{"jenis":"hapus_info","catatanId":"..."}}

10) Gambar & berkas (wajib daftar_gambar dulu untuk kodenya): ubah judul atau keterangan kapan dikirim, baca isi gambar jadi Info bisnis, atau HAPUS:
{"jawab":"kalimat singkat","usul":{"jenis":"ubah_berkas","kode":"...","nama":"judul baru","keterangan":"dikirim kalau pelanggan ... (minimal 10 huruf)"}}
{"jawab":"kalimat singkat","usul":{"jenis":"baca_berkas","kode":"..."}}
{"jawab":"kalimat singkat","usul":{"jenis":"hapus_berkas","kode":"..."}}

11) Nomor WhatsApp (wajib daftar_nomor dulu untuk id-nya): matikan sementara, nyalakan lagi, ganti nama, atau lepas dan HAPUS dari Palwise:
{"jawab":"kalimat singkat","usul":{"jenis":"atur_nomor","nomorId":"...","aksi":"matikan|nyalakan|ganti_nama","namaBaru":"hanya untuk ganti_nama"}}
{"jawab":"kalimat singkat","usul":{"jenis":"hapus_nomor","nomorId":"..."}}

12) HAPUS satu pelanggan beserta seluruh obrolannya (wajib cari_kontak dulu):
{"jawab":"kalimat singkat","usul":{"jenis":"hapus_pelanggan","kontakId":"..."}}
Menghapus selalu SATU hal per usul, dan hanya kalau pemilik memintanya dengan jelas. Sebutkan di jawab apa yang akan hilang.
${usulHalaman}`;
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

6b) Utamakan ini untuk MENAMBAH, MENGGANTI atau MENGHAPUS BAGIAN dalam catatan, termasuk hasil impor website panjang:
{"jawab":"Ringkas perubahan yang diminta","usul":{"jenis":"ubah_bagian_info","catatanId":"...","cari":"kutipan persis yang muncul satu kali pada catatan","ganti":"teks pengganti untuk kutipan itu saja"}}
Untuk MENAMBAH email, cari berisi baris kontak lama, ganti berisi baris lama + email baru. Untuk MENGHAPUS bagian, ganti boleh string kosong. Server mempertahankan seluruh bagian lain. Jika kutipan muncul beberapa kali, sertakan baris di sekitarnya agar unik. lihat_info menerima argumen bagian untuk mencari judul/kata dalam catatan panjang.

7) Mengusulkan perubahan TEKS asisten (wajib lihat_asisten dulu). bagian: "cara_bicara" (Cara kerja dan gaya bicara), "sapaan" (Sapaan pertama, dikirim otomatis saat orang chat pertama kali; boleh "" untuk mematikan), atau "serah_manusia" (Kapan harus panggil kamu):
{"jawab":"kalimat singkat","usul":{"jenis":"ubah_asisten","bagian":"sapaan","isi":"seluruh teks baru untuk bagian itu saja"}}

7b) Mengusulkan SETELAN asisten, hanya kunci yang berubah (wajib lihat_asisten dulu):
{"jawab":"kalimat singkat","usul":{"jenis":"atur_asisten","ubahan":{"officeHoursEnabled":true,"officeHoursStart":"09:00","officeHoursEnd":"17:00"}}}
Kunci yang boleh: isActive (asisten sedang bekerja, true/false), rasaAktif (baca perasaan pelanggan), watak (hangat|tenang|santai|tegas), splitBubbles (pecah jawaban panjang jadi beberapa pesan), officeHoursEnabled/officeHoursStart/officeHoursEnd (ikut jam kerja tim, HH:mm), followUpEnabled/followUpAfterHours (1-720)/followUpMaxAttempts (1-5)/followUpPrompt, afterSalesEnabled/afterSalesAfterDays (1-60)/afterSalesPrompt, restockEnabled/restockAfterDays (3-365)/restockPrompt, pengingatEnabled/pengingatJamSebelum (1-168)/pengingatPrompt.

${usulKelola}
SATU USUL SAJA PER BALASAN. Kalau ada dua hal yang mau kamu simpan, usulkan yang pertama dulu, dan tunggu.`;
}

/** Aturan yang berlaku di dua mode. */
function aturanBersama(): string {
  return `ANGKA DAN FAKTA
Kamu TIDAK BOLEH menyebut angka, nama, tanggal, atau isi catatan yang tidak datang dari hasil alat di percakapan ini, atau dari yang diketik pemiliknya sendiri. Kalau belum punya, panggil alatnya dulu. Menebak itu kesalahan terparah yang bisa kamu buat di sini.

HASIL YANG DILIHAT PEMILIK
Hasil alat baca ditampilkan sebagai kartu data di bawah jawabanmu. Jangan menaruh daftar di properti JSON lain seperti data, daftar, atau pelanggan: properti itu bukan jawaban. Tulis narasi hanya di jawab. Kalau hasil kosong, katakan belum ada data yang cocok; jangan berkata "ini daftarnya" atau mengajak memilih pelanggan yang tidak ada. Kalau alat gagal, katakan gagal membaca, BUKAN tidak ada pelanggan.
Pelanggan tertarik adalah tahap tertarik di CRM: pakai daftar_pelanggan. daftar_nunggu hanya untuk obrolan yang meminta bantuan manusia. Menunggu balasan TIDAK berarti kesal, komplain, atau tertarik. Jangan menyimpulkan perasaan tanpa bukti. Jika pemilik berkata "mana?" atau daftar belum tampil, baca ulang data yang diminta semula, bukan mengulang kalimat jawabanmu.

MENYIMPAN SESUATU
Kamu tidak pernah menyimpan sendiri. Kamu menyusun usul, dan pemiliknya yang menekan tombol Simpan. Untuk mengubah catatan, jalankan lihat_info dulu. Utamakan ubah_bagian_info untuk perubahan sebagian; bagian lain otomatis dipertahankan. ubah_info hanya untuk penggantian seluruh catatan yang sudah terbaca lengkap. Perintah tambah email, hapus bagian, rubah harga, edit bagian X merujuk catatan yang sedang dibahas, BUKAN draf pelanggan. Jika target belum jelas, tanyakan catatan mana. Mengedit hasil impor hanya mengubah salinan Palwise, bukan website asal.

MENGUBAH ASISTEN
Halaman Asisten punya kotak terpisah: Cara kerja dan gaya bicara (bagian cara_bicara), Sapaan pertama (bagian sapaan), Kapan harus panggil kamu (bagian serah_manusia), dan setelan nyala/mati serta angka (atur_asisten). Ubah HANYA kotak yang diminta. Permintaan soal sapaan, salam pembuka, atau pesan pertama SELALU bagian sapaan, bukan cara bicara, dan jangan pernah menulis baris "Sapaan pembuka:" ke cara bicara. Jalankan lihat_asisten dulu. Kalau pemilik minta saran tanpa menyebut isinya, usulkan satu contoh jadi yang lengkap; jangan pernah memakai penanda kosong seperti [ISI DI SINI].

MENYAMBUNGKAN WHATSAPP
Kalau pemilik meminta QR, scan WhatsApp, atau Perangkat tertaut, pakai sambungkan_whatsapp. QR penautan BUKAN gambar yang disimpan di galeri; jangan pakai daftar_gambar atau mengarang kode QR. Kartu akan menampilkan QR dan status langsung di chat, tanpa harus pindah halaman. Pemilik yang menekan Tampilkan QR lalu memindai dari WhatsApp di HP-nya.`;
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
Untuk follow up atau draf balasan, WAJIB baca lihat_kontak agar isinya sesuai obrolan terakhir pelanggan itu. Sebutkan kebutuhan yang benar-benar dibahas. Jangan membuat pesan generik ke "pelanggan", mengarang nama, penawaran, atau diskon. Jika riwayat belum ada, katakan konteksnya belum tersedia dan minta satu hal yang diperlukan.

${bentukJawaban("perintah")}

YANG TIDAK BISA KAMU LAKUKAN, dan katakan apa adanya kalau diminta: menghapus seluruh akun, menghapus atau mengubah banyak data sekaligus, mengubah paket atau pembayaran, mengganti email atau sandi, dan mengirim ke banyak orang sekaligus. Untuk paket, pembayaran, email, sandi, dan menambah nomor baru, beri usul buka_halaman. Untuk kirim serentak, jelaskan bahwa mengirim serentak berisiko membuat nomor WhatsApp-nya diblokir, jadi itu tidak dibuka lewat perintah chat.`;
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
  return `Kamu Palwise, dan kamu sedang MEMANDU pemilik usaha "${namaUsaha}" melengkapi pemasangan asistennya. Yang bicara denganmu pemiliknya sendiri.

${sekarangIndonesia()}

CARA MEMANDU
- SATU pertanyaan per giliran. Jangan pernah menanyakan lima hal sekaligus; yang dijawab cuma satu dan sisanya hilang.
- Bahasa Indonesia sehari-hari, pendek, seperti mengobrol di WhatsApp. Tanpa istilah teknis: jangan sebut "prompt", "knowledge base", "konfigurasi", "AI agent".
- Jangan menyuruh dia mengisi halaman mana pun. Dia sudah di sini, dan kamu yang menyusunkan.
- Kalau jawabannya pendek atau samar, tanya balik satu hal yang paling penting, jangan langsung menyimpan tebakan.

URUTAN YANG KAMU KEJAR
Mulai dari STATUS PEMASANGAN SAAT INI yang disertakan, bukan selalu dari langkah pertama. Pengaturan bisa sudah diisi di halaman lain. Jangan mengulang pertanyaan jenis usaha, target pelanggan, atau gaya bicara kalau cara bicara dan Info bisnis sudah diisi. Baca lihat_asisten atau daftar_info bila perlu konteksnya. Jika tinggal nomor WhatsApp, langsung jalankan sambungkan_whatsapp. Pengguna boleh memilih menyambungkan nomor kapan saja tanpa mengulang wawancara.
1. Usahanya jualan apa, dan siapa yang biasanya beli.
2. Cara bicaranya mau seperti apa (santai atau sopan, panggil "kak" atau "bapak/ibu"), dan hal apa yang asisten TIDAK BOLEH janjikan sendiri, misalnya diskon atau tanggal kirim.
   Sesudah dua hal ini kamu tahu, langsung usulkan ubah_asisten. Jangan menunggu sampai semuanya lengkap: pemiliknya perlu melihat sesuatu jadi lebih dulu, supaya dia mau melanjutkan.
3. Sesudah itu, kumpulkan Info bisnis satu topik per catatan: harga dan daftar barang atau layanan, cara pesan dan cara bayar, pengiriman atau lokasi dan jam buka, aturan retur atau pembatalan.
   Tiap kali satu topik sudah cukup jelas, usulkan tambah_info untuk topik itu saja. Jangan menumpuk empat topik jadi satu catatan.
4. Kalau cara bicara dan Info bisnis sudah beres, jalankan sambungkan_whatsapp untuk menampilkan kartu QR di chat ini. Kalau semuanya sudah beres, sampaikan bahwa pemasangan selesai dan tanyakan apakah ada yang ingin diperbarui.

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

Di utas ini kamu TIDAK bisa mengirim pesan ke pelanggan atau menghapus seluruh catatan. Menghapus bagian catatan boleh diusulkan melalui ubah_bagian_info. Kamu bisa menampilkan kartu sambungan WhatsApp; pemilik sendiri yang mengizinkan penautannya lewat scan QR.`;
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

/** Bound every model request, including long tool output and saved history. */
export function batasiKonteksTanya(messages: LlmMessage[], permintaan?: LlmMessage): LlmMessage[] {
  const awal = permintaan ? [textMessage("user", permintaan.parts.map(p => p.text ?? "").join("\n").slice(0, 2000))] : [];
  let sisa = 24_000 - (awal[0]?.parts[0].text?.length ?? 0);
  const keluar: LlmMessage[] = [];
  for (const message of [...messages].reverse()) {
    if (message === permintaan) { keluar.unshift(...awal); continue; }
    if (sisa <= 0) continue;
    const teks = message.parts.map(p => p.text ?? "").join("\n");
    const batas = Math.min(sisa, 8000);
    const penanda = "\n[Data dipotong; persempit pencarian]";
    const isi = teks.length > batas ? (batas >= penanda.length ? teks.slice(0, batas - penanda.length) + penanda : teks.slice(0, batas)) : teks;
    sisa -= isi.length;
    keluar.unshift(textMessage(message.role, isi));
  }
  return keluar;
}

export async function muatRiwayatTanya(sesiId: string, workspaceId: string): Promise<GiliranTanya[]> {
  const terbaru = await prisma.pesanTanya.findMany({
    where: { sesiId, sesi: { workspaceId } },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 40,
  });
  return terbaru.reverse().map(r => {
    const usul = r.usul ? parseJsonLoose(r.usul) : null;
    return { peran: r.peran, teks: r.teks, hasilBaca: bacaHasilTanya(r.hasilBaca), usul: usul && typeof usul === "object" && !Array.isArray(usul) ? usul : null, usulStatus: r.usulStatus };
  });
}

/** Live progress sent to a streaming caller. */
export type KabarTanya =
  | { jenis: "status"; teks: string }
  | { jenis: "teks"; teks: string }
  | { jenis: "ulang" };

/**
 * The `jawab` string from a model reply that is still arriving as JSON, decoded as far as it goes.
 * Null while the reply is a tool call or has not reached `jawab` yet.
 */
export function jawabSebagian(mentah: string): string | null {
  if (/"alat"\s*:\s*"[^"\s]/.test(mentah)) return null;
  const awal = /"jawab"\s*:\s*"/.exec(mentah);
  if (!awal) return null;
  const lolos: Record<string, string> = { n: "\n", t: "\t", r: "", b: "", f: "", '"': '"', "\\": "\\", "/": "/" };
  let hasil = "";
  for (let i = awal.index + awal[0].length; i < mentah.length;) {
    const c = mentah[i];
    if (c === '"') break;
    if (c !== "\\") { hasil += c; i++; continue; }
    const berikut = mentah[i + 1];
    if (berikut === undefined) break;
    if (berikut === "u") {
      const hex = mentah.slice(i + 2, i + 6);
      if (hex.length < 4) break;
      hasil += String.fromCharCode(parseInt(hex, 16));
      i += 6;
      continue;
    }
    hasil += lolos[berikut] ?? berikut;
    i += 2;
  }
  // Never hand out half of a surrogate pair (an emoji split across chunks).
  return /[\uD800-\uDBFF]$/.test(hasil) ? hasil.slice(0, -1) : hasil;
}

export interface JalankanTanyaInput {
  workspaceId: string;
  /** Giliran sebelumnya, urut dari yang paling lama. */
  riwayat: GiliranTanya[];
  pesan: string;
  /** Mode utasnya. Menentukan prompt DAN alat mana yang boleh dipakai. */
  mode?: ModeTanya;
  /** Reservasi hanya jika jalur ini benar-benar membutuhkan model. */
  sebelumModel?: () => Promise<void>;
  /** Streaming callers get status lines, the answer text as it is written, and resets. */
  kabar?: (kabar: KabarTanya) => void;
}

export async function jalankanTanya({
  workspaceId,
  riwayat,
  pesan,
  mode = "perintah",
  sebelumModel,
  kabar,
}: JalankanTanyaInput): Promise<HasilTanya> {
  const [ws, agent] = await Promise.all([
    prisma.workspace.findUniqueOrThrow({ where: { id: workspaceId } }),
    prisma.agent.findFirst({ where: { workspaceId }, orderBy: { createdAt: "asc" } }),
  ]);

  const ctx: Konteks = { workspaceId, agentId: agent?.id ?? null };
  if (tanyaStatusWhatsApp(pesan)) {
    const isi = await ALAT.find(a => a.nama === "status_whatsapp")!.jalankan(ctx, {});
    return { teks: isi.split("\n")[0], usul: null, alat: ["status_whatsapp"], hasilBaca: [hasilUntukChat("status_whatsapp", isi, {})] };
  }
  const rentang = mode === "perintah" ? rentangHitunganLangsung(pesan) : null;
  if (rentang) {
    const isi = await ALAT.find(a => a.nama === "hitung_obrolan")!.jalankan(ctx, { rentang });
    return { teks: isi.split("\n")[0], usul: null, alat: ["hitung_obrolan"], hasilBaca: [hasilUntukChat("hitung_obrolan", isi, { rentang })] };
  }
  // A clear stage lookup reads the exact CRM filter, even if the model would pick another tool.
  const tahap = mode === "perintah" ? tahapYangDiminta(pesan, riwayat) : null;
  if (tahap) {
    const alat = ALAT.find(a => a.nama === "daftar_pelanggan")!;
    const isi = await alat.jalankan(ctx, { tahap });
    return {
      teks: isi.split("\n")[0], usul: null, alat: [alat.nama],
      hasilBaca: [hasilUntukChat(alat.nama, isi, { tahap })],
    };
  }
  await sebelumModel?.();
  const analisis = mode === "perintah" && permintaanAnalisis(pesan);
  const llm = getLlm();
  let system = systemPrompt(ws.name, mode);
  system += "\n\nUntuk hitungan chat, selalu sebut data yang TERCATAT di Palwise. Bila hasil alat menyebut WhatsApp terputus, sampaikan bahwa data belum lengkap; angka nol bukan bukti tidak ada chat di WhatsApp. Status tersambung di riwayat lama harus diperiksa ulang dengan status_whatsapp.";
  system += "\nJangan mengakhiri giliran dengan janji seperti 'saya lihat dulu', 'sebentar saya cek', atau 'akan saya siapkan'. Tidak ada pekerjaan latar belakang setelah jawaban dikirim. Jika perlu membaca, panggil alat sekarang, lalu berikan hasil dan langkah konkret dalam giliran yang sama. Jika data kurang, tanyakan satu hal spesifik. Untuk permintaan saran bisnis, berikan saran yang dapat dikerjakan sesuai data yang tersedia.";
  system += "\nUTAMAKAN PERMINTAAN TERBARU. Riwayat hanya konteks, bukan tugas yang harus diteruskan. Pertanyaan strategi, analisis atau topik baru harus dijawab sesuai pertanyaannya; jangan tiba-tiba membuat draf untuk penerima dari riwayat. Hanya jika pemilik benar-benar meminta REVISI atau merujuk hasil sebelumnya ('jangan gitu', 'lebih santai', 'mana/mna'), gunakan draf terdahulu dan sertakan isi revisi lengkap. Usulan lama bukan izin mengirim ulang. Jangan mengarang keadaan pelanggan. Jika penerima belum jelas, tanyakan namanya.";
  if (analisis) system += "\nTUGAS SAAT INI: analisis/saran bisnis, BUKAN revisi draf. usul harus null. Jawab pertanyaan terbaru dengan temuan, 2–3 langkah konkret, dan ukuran keberhasilan yang bisa dicatat. Jangan menjanjikan penjualan atau mengarang omzet. Jangan menyapa penerima dari draf lama. Gunakan laporan yang disertakan; cari info bisnis jika relevansi produk dibutuhkan.";
  if (mode === "pasang") {
    const pemasangan = ALAT.find(a => a.nama === "keadaan_pemasangan")!;
    system += "\n\nSTATUS PEMASANGAN SAAT INI (dibaca dari data tersimpan, utamakan ini daripada sapaan lama):\n" + await pemasangan.jalankan(ctx, {});
  }
  // Peta alatnya ikut disaring per mode. Prompt yang tidak menyebut sebuah alat
  // saja tidak cukup: model tetap bisa menyebut nama alat yang dia ingat dari
  // mode lain, dan yang menahannya harus kode, bukan kalimat.
  const petaAlat = new Map(alatUntukMode(mode).map((a) => [a.nama, a]));

  const pesanModel: LlmMessage[] = [
    ...riwayat
      .slice(-RIWAYAT_GILIRAN)
      .map((r) =>
        textMessage(r.peran === "pemilik" ? "user" : "assistant", (analisis ? r.teks : konteksGiliranTanya(r)).slice(0, 3000)),
      ),
    textMessage("user", pesan),
  ];
  const permintaan = pesanModel[pesanModel.length - 1];

  const dipakai: string[] = [];
  const hasilBaca: HasilBacaTanya[] = [];
  const kontakDibaca = new Set<string>();
  let janjiDiperbaiki = false;
  let hasilDiperbaiki = false;
  if (analisis) {
    try {
      kabar?.({ jenis: "status", teks: "Membaca kondisi bisnis" });
      const isi = await teksPusatBisnis(await muatPusatBisnis(workspaceId, /30|bulan/i.test(pesan) ? 30 : 7));
      dipakai.push("ringkasan_bisnis");
      hasilBaca.push(hasilUntukChat("ringkasan_bisnis", isi, {}));
      pesanModel.push(textMessage("user", `DATA UNTUK PERMINTAAN TERBARU:\n${isi}\nPertanyaan yang wajib dijawab: ${pesan}`));
    } catch {
      pesanModel.push(textMessage("user", "Data bisnis belum bisa dibaca. Tetap jawab pertanyaan terbaru dengan saran umum yang jelas ditandai, jangan mengarang angka atau pelanggan."));
    }
  }

  // Answer text already streamed to the screen for the current attempt. When a guard below rejects
  // the attempt and the loop runs again, the screen is told to clear it first, never left stale.
  let tampil = "";
  const bersihkanTampil = () => { if (tampil) { kabar?.({ jenis: "ulang" }); tampil = ""; } };
  const saatTeks = (mentahSejauh: string) => {
    const jawab = jawabSebagian(mentahSejauh);
    if (jawab === null) return;
    if (!jawab.startsWith(tampil)) bersihkanTampil();
    const baru = jawab.slice(tampil.length);
    if (baru) { kabar?.({ jenis: "teks", teks: baru }); tampil = jawab; }
  };

  for (let langkah = 0; langkah <= ALAT_MAKS; langkah++) {
    if (tampil) { bersihkanTampil(); kabar?.({ jenis: "status", teks: "Memeriksa ulang jawaban" }); }
    else kabar?.({ jenis: "status", teks: hasilBaca.length ? "Menyusun jawaban" : "Memahami pertanyaan" });
    const opsiModel = {
      system,
      messages: batasiKonteksTanya(pesanModel, permintaan),
      temperature: 0.2,
      json: true,
      maxTokens: 1400,
      // Use the configured provider's default; a Gemini model ID is invalid for other providers.
    };
    let mentah: string;
    try { mentah = await (kabar && llm.stream ? llm.stream(opsiModel, saatTeks) : llm.complete(opsiModel)); } catch (error) {
      if (!hasilBaca.length || (analisis && langkah === 0)) throw error;
      return { teks: "Ringkasan belum selesai dibuat. Hasil pemeriksaan tetap ada di bawah.", usul: null, alat: dipakai, hasilBaca };
    }

    const jawaban = parseJsonLoose(mentah);
    if (!jawaban || typeof jawaban !== "object") {
      log.warn(`ruang perintah: balasan model bukan JSON — ${mentah.slice(0, 200)}`);
      return {
        teks: hasilBaca.length ? "Berikut hasil yang sudah diperiksa." : "Maaf, aku belum menangkap maksudnya. Coba tulis ulang dengan kalimat lain ya.",
        usul: null,
        alat: dipakai,
        hasilBaca,
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
      let gagal = false;
      const judulBaca = hasilUntukChat(alat.nama, "", jawaban.argumen ?? {}).judul;
      kabar?.({ jenis: "status", teks: `Membaca ${judulBaca.charAt(0).toLowerCase()}${judulBaca.slice(1)}` });
      try {
        hasil = await alat.jalankan(ctx, jawaban.argumen ?? {});
      } catch (err) {
        log.error(
          `ruang perintah: alat ${alat.nama} gagal — ${err instanceof Error ? err.message : err}`,
        );
        gagal = true;
        hasil = "Data ini belum bisa dibaca karena koneksi bermasalah. Coba lagi sebentar ya.";
      }

      dipakai.push(alat.nama);
      if (!gagal && alat.nama === "lihat_kontak") kontakDibaca.add(String(jawaban.argumen?.kontakId ?? ""));
      if (alat.nama !== "sambungkan_whatsapp") {
        hasilBaca.push(hasilUntukChat(alat.nama, hasil, jawaban.argumen ?? {}, gagal));
      }
      pesanModel.push(textMessage("assistant", mentah));
      pesanModel.push(textMessage("user", `HASIL ALAT ${alat.nama}:\n${hasil}`));
      continue;
    }

    // Count claims are grounded in the returned counts and their sync caveat, never a model's 'no chats' inference.
    const hitungan = hasilBaca.find(h => h.alat === "hitung_obrolan" && !h.gagal);
    const teks = hitungan ? hitungan.isi.split("\n")[0] : String(jawaban.jawab ?? "").trim();
    if (analisis && (jawaban.usul || /\b(?:ini|berikut)\b.{0,40}\b(?:draf|draft)\b/i.test(teks))) {
      if (langkah === ALAT_MAKS) return { teks: "Saran bisnisnya belum berhasil disusun. Data yang sudah diperiksa tersedia di bawah; coba ulangi analisisnya.", usul: null, alat: dipakai, hasilBaca };
      pesanModel.push(textMessage("assistant", mentah));
      pesanModel.push(textMessage("user", `Jawaban melenceng. Pemilik bertanya: ${pesan}. Jawab pertanyaan ini dengan langkah bisnis konkret berdasarkan laporan. Jangan membuat draf atau usul tindakan dan jangan melanjutkan pelanggan dari riwayat. usul: null.`));
      continue;
    }
    const usul = await bacaUsul(ctx, jawaban.usul, mode);

    // Invalid proposals used to disappear silently while their announcement remained.
    const hasilHilang = !usul && (jawaban.usul ||
      (hasilDijanjikanTanpaIsi(teks) && (!hasilBaca.length || /\b(?:draf|draft)(?:nya)?\b/i.test(teks))));
    if (hasilHilang) {
      if (hasilDiperbaiki || langkah === ALAT_MAKS) return {
        teks: /info|catatan|bagian|email|kontak.*@/i.test(pesan) || /info|asisten/.test(String(jawaban.usul?.jenis ?? "")) ? "Perubahan belum berhasil disusun. Sebutkan judul catatan dan bagian yang ingin diubah; isi yang tersimpan belum berubah." : "Draf atau hasilnya belum berhasil dibuat. Coba ulangi permintaan dengan nama pelanggan dan perubahan yang kamu inginkan.",
        usul: null, alat: dipakai, hasilBaca,
      };
      hasilDiperbaiki = true;
      pesanModel.push(textMessage("assistant", mentah));
      pesanModel.push(textMessage("user", "Hasil yang dijanjikan belum ada atau usul tidak valid. Jawab permintaan semula sampai selesai sekarang. Jika permintaan menyangkut info bisnis, jangan meminta nama pelanggan. Jalankan lihat_info dengan bagian yang diminta, lalu gunakan ubah_bagian_info dengan cari persis dan ganti sesuai permintaan. Untuk draf pelanggan, keluarkan usul kirim_pesan berisi kontakId yang sudah diverifikasi dan teks lengkap. Gunakan draf terdahulu untuk revisi, baca pelanggan bila perlu. Untuk jawaban langsung, tulis isi sebenarnya. Jika data belum cukup, tanyakan satu hal spesifik; jangan mengulang pengantar tanpa isi."));
      continue;
    }

    if (!usul && janjiPemeriksaan(String(jawaban.jawab ?? ""))) {
      if (janjiDiperbaiki || langkah === ALAT_MAKS) return {
        teks: hasilBaca.length ? "Berikut hasil pemeriksaan yang tersedia. Saran lanjutannya belum berhasil disusun; coba tanyakan langkah yang ingin kamu bahas." : "Pemeriksaannya belum berhasil dijalankan. Coba sebutkan data pelanggan yang ingin diperiksa, misalnya pelanggan tertarik.",
        usul: null, alat: dipakai, hasilBaca,
      };
      janjiDiperbaiki = true;
      pesanModel.push(textMessage("assistant", mentah));
      pesanModel.push(textMessage("user", "Jawaban itu baru janji, bukan hasil. Lanjutkan sekarang: panggil alat baca yang diperlukan, kemudian jawab permintaan awal dengan hasil dan langkah konkret. Jika data sudah diperiksa, langsung simpulkan. Jangan menjanjikan proses yang akan berjalan setelah giliran berakhir."));
      continue;
    }

    // A personalized draft cannot skip the customer's actual conversation.
    if (usul && "kontakId" in usul && !kontakDibaca.has(usul.kontakId)) {
      const alat = petaAlat.get("lihat_kontak")!;
      let isi: string;
      kabar?.({ jenis: "status", teks: "Membaca obrolan pelanggan" });
      try { isi = await alat.jalankan(ctx, { kontakId: usul.kontakId }); }
      catch {
        hasilBaca.push(hasilUntukChat(alat.nama, "Obrolan pelanggan belum bisa dibaca. Coba lagi sebentar ya.", {}, true));
        return { teks: "Aku belum bisa menyiapkan draf yang sesuai karena obrolan pelanggan belum terbaca.", alat: dipakai, hasilBaca, usul: null };
      }
      kontakDibaca.add(usul.kontakId);
      dipakai.push(alat.nama);
      hasilBaca.push(hasilUntukChat(alat.nama, isi, {}));
      pesanModel.push(textMessage("assistant", mentah));
      pesanModel.push(textMessage("user", `HASIL ALAT lihat_kontak:\n${isi}\n\nPerbaiki draf dengan konteks obrolan ini, tetapi UTAMAKAN arahan terbaru pemilik pada permintaan awal. Riwayat produk bukan kewajiban untuk menyebut produk lagi. Jika pemilik meminta menjaga hubungan atau melarang jualan, cukup sapa dengan hangat tanpa penawaran, stok, atau ajakan belanja. Jangan mengarang keadaan pribadi pelanggan. Jika konteks yang diperlukan kosong, tanyakan satu hal spesifik.`));
      continue;
    }

    return {
      teks:
        (hasilBaca.length && hasilBaca.every(h => h.gagal) ? "Data belum bisa dibaca. Coba lagi sebentar ya." :
        !usul && hasilBaca.length && hasilBaca.every(h => /^(Tidak ada|Belum ada)/.test(h.isi)) ? "Belum ada data yang cocok dengan permintaan ini." : teks) ||
        (usul
          ? "Ini yang mau aku kirim. Cek dulu, baru tekan Kirim."
          : "Aku belum punya jawabannya."),
      usul,
      alat: dipakai,
      hasilBaca,
    };
  }

  return {
    teks: hasilBaca.length ? "Berikut hasil yang sudah diperiksa. Bagian lainnya belum selesai diperiksa." : "Maaf, aku belum ketemu jawabannya. Coba tanya dengan cara lain ya.",
    usul: null,
    alat: dipakai,
    hasilBaca,
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

  if (jenis === "ubah_bagian_info") {
    const catatanId = String(mentah.catatanId ?? "").trim();
    const catatan = await prisma.knowledgeSource.findFirst({ where: { id: catatanId, agent: { workspaceId: ctx.workspaceId } } });
    const cari = typeof mentah.cari === "string" ? mentah.cari : "";
    const ganti = typeof mentah.ganti === "string" ? mentah.ganti : null;
    if (!catatan || !cari.trim() || ganti === null || cari === ganti) return null;
    const posisi = catatan.content.indexOf(cari);
    if (posisi < 0 || catatan.content.indexOf(cari, posisi + 1) !== -1) return null;
    const isi = catatan.content.slice(0, posisi) + ganti + catatan.content.slice(posisi + cari.length);
    // Never truncate a long imported source while editing a small section.
    if (isi.trim().length < 20 || isi.length > Math.max(catatan.content.length, MAKS_ISI_CATATAN) + 6000) return null;
    return { jenis: "ubah_info", catatanId, judul: catatan.title, isiLama: catatan.content, isi };
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

    const isi = String(mentah.isi ?? "").trim();
    if (isi.length < 20 || isi.length > MAKS_ISI_CATATAN || catatan.content.length > 6000) return null;
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
    const bagian: BagianAsisten =
      mentah.bagian === "sapaan" || mentah.bagian === "serah_manusia" ? mentah.bagian : "cara_bicara";
    const isi = String(mentah.isi ?? "").trim().slice(0, bagian === "cara_bicara" ? 8000 : 1500);
    // Cara bicara needs substance. A greeting may be emptied to switch it off; the handoff rule may not.
    if (bagian === "cara_bicara" ? isi.length < 20 : bagian === "serah_manusia" && isi.length < 5) return null;
    if (PENANDA_KOSONG.test(isi)) return null;

    const agent = await prisma.agent.findUnique({ where: { id: ctx.agentId } });
    const isiLama = agent?.[KOLOM_BAGIAN[bagian]] ?? "";
    if (isi === isiLama.trim()) return null;

    return { jenis: "ubah_asisten", bagian, isiLama, isi };
  }

  if (jenis === "atur_asisten") {
    if (!ctx.agentId) return null;
    const agent = await prisma.agent.findUnique({ where: { id: ctx.agentId } });
    if (!agent) return null;
    const minta = mentah.ubahan && typeof mentah.ubahan === "object" ? (mentah.ubahan as Record<string, unknown>) : {};
    const ubahan: UbahanAsisten[] = [];
    for (const [kunci, nilai] of Object.entries(minta)) {
      if (!Object.hasOwn(SETELAN_ASISTEN, kunci)) continue;
      const k = kunci as KunciSetelan;
      const aturan: AturanSetelan = SETELAN_ASISTEN[k];
      let baru: string | number | boolean;
      if (aturan.jenis === "ya_tidak") {
        if (typeof nilai !== "boolean") continue;
        baru = nilai;
      } else if (aturan.jenis === "angka") {
        const n = Math.round(Number(nilai));
        if (!Number.isFinite(n) || n < aturan.min || n > aturan.maks) continue;
        baru = n;
      } else if (aturan.jenis === "jam") {
        const s = String(nilai).trim();
        if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(s)) continue;
        baru = s;
      } else if (aturan.jenis === "pilihan") {
        const s = String(nilai).trim().toLowerCase();
        if (!aturan.pilihan.includes(s)) continue;
        baru = s;
      } else {
        const s = String(nilai ?? "").trim().slice(0, 1500);
        if (s.length < 10 || PENANDA_KOSONG.test(s)) continue;
        baru = s;
      }
      const lama = agent[k] as string | number | boolean;
      if (lama !== baru) ubahan.push({ kunci: k, lama, baru });
    }
    return ubahan.length ? { jenis: "atur_asisten", ubahan } : null;
  }

  if (jenis === "buka_halaman") {
    const tujuan = String(mentah.tujuan ?? "");
    if (!(HALAMAN_TUJUAN as readonly string[]).includes(tujuan)) return null;
    return { jenis: "buka_halaman", tujuan: tujuan as TujuanHalaman, alasan: String(mentah.alasan ?? "").trim().slice(0, 200) };
  }

  // Rejected in CODE for setup threads, same reason as sending: a new account's first day is
  // not the moment to delete or rearrange anything, and a prompt that omits a power does not remove it.
  if (USUL_KELOLA.has(jenis) && mode === "pasang") {
    log.warn(`ruang perintah: usul ${jenis} ditolak, utas ini mode pemasangan`);
    return null;
  }

  if (jenis === "ubah_pelanggan" || jenis === "hapus_pelanggan") {
    const kontak = await prisma.contact.findFirst({
      where: { id: String(mentah.kontakId ?? "").trim(), workspaceId: ctx.workspaceId, ...HANYA_PELANGGAN_ASLI },
    });
    if (!kontak) return null;
    const kepada = displayName(kontak);
    const nomor = kontak.phone ?? null;
    if (jenis === "hapus_pelanggan") return { jenis, kontakId: kontak.id, kepada, nomor };

    const minta = mentah.ubahan && typeof mentah.ubahan === "object" ? (mentah.ubahan as Record<string, unknown>) : {};
    const sekarang = kontak as unknown as Record<string, string | null>;
    const ubahan: UbahanPelanggan[] = [];
    for (const [kunci, nilai] of Object.entries(minta)) {
      if (kunci === "stage") {
        const s = String(nilai);
        if (TAHAP_PELANGGAN.includes(s) && s !== kontak.stage) ubahan.push({ kunci, lama: kontak.stage, baru: s });
      } else if (kunci === "janjiPada") {
        const lama = kontak.janjiPada?.toISOString() ?? null;
        if (nilai === null || nilai === "") { if (lama) ubahan.push({ kunci, lama, baru: null }); continue; }
        const d = new Date(String(nilai));
        if (Number.isNaN(d.getTime()) || d.toISOString() === lama) continue;
        ubahan.push({ kunci, lama, baru: d.toISOString() });
      } else if (kunci === "bereskanMasalah") {
        if (nilai === true && kontak.masalah) ubahan.push({ kunci, lama: kontak.masalah, baru: null });
      } else if (kunci === "notes" || kunci === "janjiCatatan" || kunci === "name" || kunci === "businessName" || kunci === "industry") {
        const baru = String(nilai ?? "").trim().slice(0, kunci === "notes" ? 2000 : 200) || null;
        if (baru && PENANDA_KOSONG.test(baru)) continue;
        if (kunci === "name" && !baru) continue;
        const lama = sekarang[kunci] ?? null;
        if ((baru ?? "") !== (lama ?? "")) ubahan.push({ kunci, lama, baru });
      }
    }
    return ubahan.length ? { jenis: "ubah_pelanggan", kontakId: kontak.id, kepada, nomor, ubahan } : null;
  }

  if (jenis === "hafalkan_info" || jenis === "hapus_info") {
    const catatan = await prisma.knowledgeSource.findFirst({
      where: { id: String(mentah.catatanId ?? "").trim(), agent: { workspaceId: ctx.workspaceId } },
    });
    if (!catatan) return null;
    return jenis === "hafalkan_info"
      ? { jenis, catatanId: catatan.id, judul: catatan.title }
      : { jenis, catatanId: catatan.id, judul: catatan.title, cuplikan: catatan.content.replace(/\s+/g, " ").slice(0, 180) };
  }

  if (jenis === "ubah_berkas" || jenis === "baca_berkas" || jenis === "hapus_berkas") {
    const berkas = await prisma.mediaAsset.findFirst({
      where: { code: String(mentah.kode ?? "").trim(), agent: { workspaceId: ctx.workspaceId } },
    });
    if (!berkas) return null;
    if (jenis === "baca_berkas") return berkas.kind === "image" ? { jenis, berkasId: berkas.id, nama: berkas.name } : null;
    if (jenis === "hapus_berkas") return { jenis, berkasId: berkas.id, nama: berkas.name };
    // Same rules as the Gambar page: a title, and a "send when" of at least 10 characters.
    const nama = String(mentah.nama ?? berkas.name).trim().slice(0, 100) || berkas.name;
    const keterangan = String(mentah.keterangan ?? berkas.description).trim().slice(0, 300);
    if (keterangan.length < 10 || PENANDA_KOSONG.test(nama + keterangan)) return null;
    if (nama === berkas.name && keterangan === berkas.description) return null;
    return { jenis, berkasId: berkas.id, namaLama: berkas.name, keteranganLama: berkas.description, nama, keterangan };
  }

  if (jenis === "atur_nomor" || jenis === "hapus_nomor") {
    const nomor = await prisma.channel.findFirst({ where: { id: String(mentah.nomorId ?? "").trim(), workspaceId: ctx.workspaceId } });
    if (!nomor) return null;
    if (jenis === "hapus_nomor") return { jenis, nomorId: nomor.id, namaNomor: nomor.name };
    const aksi = String(mentah.aksi ?? "");
    if (aksi === "ganti_nama") {
      const namaBaru = String(mentah.namaBaru ?? "").trim().slice(0, 60);
      return namaBaru && namaBaru !== nomor.name ? { jenis, nomorId: nomor.id, namaNomor: nomor.name, aksi, namaBaru } : null;
    }
    return aksi === "matikan" || aksi === "nyalakan" ? { jenis, nomorId: nomor.id, namaNomor: nomor.name, aksi } : null;
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
