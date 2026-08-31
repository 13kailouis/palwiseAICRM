import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { Boom } from "@hapi/boom";
import pino from "pino";
import makeWASocket, {
  DisconnectReason,
  downloadMediaMessage,
  fetchLatestBaileysVersion,
  useMultiFileAuthState,
} from "baileys";
import type { WASocket, proto } from "baileys";
import { getPlan, prisma } from "@palwise/db";

import { env } from "../env.js";
import { log } from "../lib/log.js";
import { bus } from "../lib/bus.js";
import {
  alamatKirim,
  appendMessage,
  getOrCreateContact,
  getOrCreateConversation,
  jidToPhone,
  kabariEskalasiSekali,
  runAgentOnConversation,
  tanpaIsi,
  type IncomingMedia,
} from "../core/conversation.js";
import { berurutan } from "../lib/antrian.js";
import { kabariPelangganSekali, periksaDanKabari } from "../core/kabarKuota.js";
import { extensionFor, extractMessage, normalizeMime } from "./extract.js";

const waLogger = pino({ level: "silent" });

const MAX_TYPING_MS = 4_000;
const MIN_TYPING_MS = 700;
const MAX_MEDIA_BYTES = 12 * 1024 * 1024;

/**
 * Sepanjang apa suara atau video yang masih dibacakan ke model.
 *
 * Batas byte SAMA SEKALI tidak menjaga sisi ini. Voice note WhatsApp itu Opus
 * sekitar 8 sampai 16 kbps, jadi 12 MB yang lolos batas ukuran masih muat dua
 * sampai tiga jam suara dalam satu pesan, dan yang ditagih penyedia AI dihitung
 * per detik audio, bukan per byte. Satu pesan begitu bisa ratusan ribu token,
 * dan hampir pasti gagal sendiri sebelum sempat berguna.
 *
 * Dua menit dipilih karena jauh di atas voice note biasa, yang di lapangan
 * hampir selalu di bawah satu menit, tapi masih murah kalau memang dipakai
 * penuh. Berlaku untuk SEMUA paket, termasuk yang berbayar: yang dijaga di sini
 * bukan jatah orangnya, tapi lubang yang tidak punya dasar sama sekali.
 */
const MAKS_DETIK_MEDIA = 120;

/** Kenapa sebuah lampiran tidak sampai ke model. */
export type LampiranMasalah = "besar" | "panjang";

interface Session {
  channelId: string;
  workspaceId: string;
  sock: WASocket | null;
  status: string;
  qr: string | null;
  /** stop manual — jangan reconnect otomatis */
  stopping: boolean;
  retries: number;
}

const sessions = new Map<string, Session>();

// ─── Util ─────────────────────────────────────────────────────────────────────

function sessionDir(channelId: string): string {
  const dir = path.join(env.WA_SESSION_DIR, channelId);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

/**
 * Cegah dua proses memakai satu sesi WhatsApp yang sama.
 *
 * Kalau sampai terjadi, WhatsApp menendang salah satunya dan pengguna melihat
 * nomornya "keluar sendiri". Ini gampang terjadi waktu ngoprek: satu worker
 * dari "npm run dev", satu lagi dijalankan manual.
 */
function ambilKunci(channelId: string): boolean {
  const berkas = path.join(sessionDir(channelId), "dipakai.lock");

  try {
    fs.writeFileSync(berkas, String(process.pid), { flag: "wx" });
    return true;
  } catch {
    // Sudah ada kuncinya. Cek apakah pemiliknya masih hidup, karena kunci
    // bisa tertinggal kalau proses sebelumnya mati mendadak.
    try {
      const pid = Number(fs.readFileSync(berkas, "utf8").trim());
      if (pid && pid !== process.pid) {
        try {
          process.kill(pid, 0); // tidak membunuh, cuma menanyakan keberadaan
          return false; // masih hidup, jangan diganggu
        } catch {
          // pemiliknya sudah mati, kuncinya basi
        }
      }
    } catch {
      // isi kunci tidak terbaca, anggap basi
    }
    fs.writeFileSync(berkas, String(process.pid));
    return true;
  }
}

function lepasKunci(channelId: string) {
  try {
    fs.rmSync(path.join(sessionDir(channelId), "dipakai.lock"), { force: true });
  } catch {
    // tidak fatal
  }
}

async function setChannelStatus(
  channelId: string,
  data: {
    status?: string;
    lastQr?: string | null;
    phoneNumber?: string | null;
    lastError?: string | null;
    connectedAt?: Date | null;
    autoStart?: boolean;
  },
) {
  const channel = await prisma.channel
    .update({ where: { id: channelId }, data })
    .catch(() => null);
  if (!channel) return;

  const s = sessions.get(channelId);
  if (s) {
    if (data.status) s.status = data.status;
    if (data.lastQr !== undefined) s.qr = data.lastQr;
  }

  bus.publish({
    type: "channel",
    workspaceId: channel.workspaceId,
    channelId,
    status: channel.status,
    qr: channel.lastQr,
    phoneNumber: channel.phoneNumber,
    error: channel.lastError,
  });
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Balasan yang sudah dikirim tapi belum diakui server WhatsApp.
 *
 * ── KENAPA INI ADA ──────────────────────────────────────────────────────────
 *
 * 10 Agustus 2026, dan ini kejadian yang paling mahal sejauh ini. Nomor Palwise
 * kena batasan kirim dari WhatsApp beberapa jam sesudah disambungkan. Pesan
 * masuk tetap sampai, balasan asisten tetap dibuat, tetap tersimpan, dan tetap
 * tergambar rapi di kotak masuk. Yang tidak terjadi cuma satu: tidak ada satu
 * pun yang benar-benar terkirim. Tidak ada galat, tidak ada tanda, tidak ada
 * apa pun. Berjam-jam dihabiskan mencari bug di kode yang sebenarnya benar.
 *
 * Yang membedakan nomor sehat dan nomor dibatasi cuma satu angka: status
 * pesannya. Yang sehat naik 1 -> 2 (diterima server) -> 3 (sampai HP) -> 4
 * (dibaca) dalam hitungan detik. Yang dibatasi berhenti di 1 selamanya.
 *
 * Jadi angka itu sekarang ditunggu. Kalau dalam 30 detik sebuah balasan tidak
 * pernah diakui server, nomornya diberi keterangan yang muncul di halaman Nomor
 * WhatsApp pemiliknya. Dia berhak tahu asistennya sedang bicara ke tembok,
 * karena dari layar semuanya terlihat normal.
 *
 * SENGAJA CUMA MEMBERI TAHU, tidak menghentikan apa pun. Jaringan yang lambat
 * juga bisa membuat sebuah ack telat, dan mematikan asisten karena satu pesan
 * telat jauh lebih merusak daripada peringatan yang sesekali keliru.
 */
const menungguAck = new Map<string, { channelId: string; timer: NodeJS.Timeout }>();

/** Nomor yang balasannya pernah tidak diakui, supaya kabarnya bisa dicabut. */
const dicurigaiDibatasi = new Set<string>();

const BATAS_ACK_MS = 30_000;

const KABAR_DIBATASI =
  "Balasan asisten tidak diterima WhatsApp. Nomor ini kemungkinan sedang dibatasi: chat masuk tetap sampai, tapi yang keluar didiamkan tanpa pemberitahuan. Istirahatkan dulu dari asisten sekitar sehari, pakai seperti biasa dari HP, dan jangan scan QR berulang karena itu memperpanjang batasannya.";

function tungguAck(
  channelId: string,
  id: string | null | undefined,
  jid: string,
): void {
  if (!id) return;
  const timer = setTimeout(() => {
    menungguAck.delete(id);
    log.warn(
      `pesan ${id} ke ${jid} belum diakui server WhatsApp setelah ${BATAS_ACK_MS / 1000} detik. Nomornya kemungkinan dibatasi.`,
    );
    dicurigaiDibatasi.add(channelId);
    void setChannelStatus(channelId, { lastError: KABAR_DIBATASI });
  }, BATAS_ACK_MS);
  // Jangan menahan proses tetap hidup cuma karena ada penantian yang belum
  // habis waktunya.
  timer.unref?.();
  menungguAck.set(id, { channelId, timer });
}

/** Dipanggil begitu WhatsApp mengakui sebuah pesan (status 2 ke atas). */
function tandaiAck(id: string | null | undefined): void {
  if (!id) return;
  const nunggu = menungguAck.get(id);
  if (!nunggu) return;
  clearTimeout(nunggu.timer);
  menungguAck.delete(id);

  // Nomornya jalan lagi, jadi kabar buruknya dicabut. Peringatan yang tidak
  // pernah hilang sesudah masalahnya lewat akan berhenti dipercaya, dan yang
  // berikutnya ikut diabaikan.
  if (dicurigaiDibatasi.delete(nunggu.channelId)) {
    void setChannelStatus(nunggu.channelId, { lastError: null });
  }
}

// ─── Siklus hidup koneksi ─────────────────────────────────────────────────────

/**
 * Apakah nomor ini masih masuk jatah paket yang sedang aktif.
 *
 * Batas paket dulu cuma dicek waktu MENAMBAH nomor. Akibatnya pengguna bisa
 * berlangganan Growth, memasang 3 nomor, lalu turun ke paket gratis, dan
 * ketiganya tetap jalan selamanya. Yang dipertahankan adalah nomor terlama,
 * karena itu yang paling mungkin nomor utama tokonya.
 */
export async function dalamJatahPaket(channelId: string): Promise<boolean> {
  const channel = await prisma.channel.findUnique({ where: { id: channelId } });
  if (!channel) return false;

  const workspace = await prisma.workspace.findUnique({
    where: { id: channel.workspaceId },
  });
  if (!workspace) return false;

  const batas = getPlan(workspace.plan).maxChannels;
  const urutan = await prisma.channel.findMany({
    where: { workspaceId: channel.workspaceId },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });

  return urutan.findIndex((c) => c.id === channelId) < batas;
}

export async function startChannel(channelId: string): Promise<void> {
  const existing = sessions.get(channelId);
  if (existing && existing.sock && ["connected", "connecting", "qr"].includes(existing.status)) {
    log.info(`channel ${channelId} sudah aktif (${existing.status})`);
    return;
  }

  const channel = await prisma.channel.findUnique({ where: { id: channelId } });
  if (!channel) throw new Error("Channel tidak ditemukan");

  if (!(await dalamJatahPaket(channelId))) {
    const workspace = await prisma.workspace.findUniqueOrThrow({
      where: { id: channel.workspaceId },
    });
    const paket = getPlan(workspace.plan);
    const pesan =
      `Paket ${paket.name} cuma muat ${paket.maxChannels} nomor, dan nomor ini di luar jatah itu. ` +
      `Naikkan paket, atau hapus nomor yang lebih lama supaya yang ini bisa dipakai.`;
    await setChannelStatus(channelId, { status: "disconnected", lastError: pesan });
    throw new Error(pesan);
  }

  if (!ambilKunci(channelId)) {
    const pesan =
      "Nomor ini sedang dipakai proses Palwise lain. Tutup dulu yang satunya, " +
      "kalau tidak WhatsApp akan menendang salah satunya dan nomormu keluar sendiri.";
    await setChannelStatus(channelId, { status: "disconnected", lastError: pesan });
    throw new Error(pesan);
  }

  const session: Session = {
    channelId,
    workspaceId: channel.workspaceId,
    sock: null,
    status: "connecting",
    qr: null,
    stopping: false,
    retries: existing?.retries ?? 0,
  };
  sessions.set(channelId, session);

  // Niat pemiliknya dicatat, bukan cuma dijalankan.
  //
  // `autoStart` menentukan apakah nomor ini dinyalakan lagi waktu worker start.
  // Dulu tidak ada satu pun tempat yang menulisnya, jadi dia selamanya bernilai
  // bawaan `true`. Ditulis di sini supaya "Sambungkan" dan "Matikan sementara"
  // benar-benar berlawanan, dan keduanya bertahan melewati restart.
  //
  // Letaknya SESUDAH pemeriksaan jatah paket dan kunci sesi. Nomor yang ditolak
  // karena dua hal itu tidak boleh ikut menyala sendiri nanti.
  await setChannelStatus(channelId, {
    status: "connecting",
    lastQr: null,
    lastError: null,
    autoStart: true,
  });

  await connect(session);
}

async function connect(session: Session): Promise<void> {
  const { channelId } = session;

  const { state, saveCreds } = await useMultiFileAuthState(sessionDir(channelId));
  const { version } = await fetchLatestBaileysVersion().catch(() => ({
    version: undefined,
  }));

  const sock: WASocket = makeWASocket({
    version,
    auth: state,
    logger: waLogger,
    printQRInTerminal: false,
    browser: ["Palwise", "Chrome", "1.0.0"],
    syncFullHistory: false,
    markOnlineOnConnect: false,
    generateHighQualityLinkPreview: false,
  });

  session.sock = sock;

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async (update: any) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      log.info(`QR baru untuk channel ${channelId}`);
      await setChannelStatus(channelId, { status: "qr", lastQr: qr });
    }

    if (connection === "open") {
      session.retries = 0;
      const phone = jidToPhone(sock.user?.id ?? "");
      log.ok(
        `WhatsApp tersambung: ${phone ?? "nomor tidak terbaca"} (channel ${channelId})`,
      );
      // autoStart ikut dinyalakan DI SINI, bukan cuma waktu tombol ditekan.
      //
      // Kejadian 10 Agustus 2026: nomor Kai jalan normal seharian dan membalas
      // pelanggan, tapi penandanya masih `false` dari entah kapan. Begitu
      // worker direstart untuk deploy, nomor itu tidak ikut dinyalakan lagi dan
      // diam selamanya. Di layar sebelumnya tertulis "Aktif", sesudahnya cuma
      // mati tanpa satu pun keterangan, dan pelanggan yang chat malam itu tidak
      // pernah dibalas siapa pun.
      //
      // Nomor yang BENAR-BENAR tersambung itu bukti niat yang lebih kuat
      // daripada penanda lama: kalau pemiliknya tidak mau nomor ini hidup, dia
      // tidak akan tersambung sekarang. Yang mematikannya lewat "Matikan
      // sementara" tetap aman, karena sambungannya ikut ditutup dan baris ini
      // tidak pernah tercapai lagi.
      await setChannelStatus(channelId, {
        status: "connected",
        lastQr: null,
        lastError: null,
        phoneNumber: phone,
        connectedAt: new Date(),
        autoStart: true,
      });

      // Baru sesudah nomornya benar-benar tersambung, bukan di awal start.
      // Kalau dipanggil lebih dulu, soketnya belum ada dan balasannya gagal
      // kirim, lalu pesannya terhitung sudah dijawab padahal tidak.
      sapuBelumDibalas(session).catch((e) =>
        log.warn(`sapuan pesan belum dibalas gagal: ${e?.message ?? e}`),
      );
    }

    if (connection === "close") {
      const statusCode =
        (lastDisconnect?.error as Boom | undefined)?.output?.statusCode ??
        lastDisconnect?.error?.output?.statusCode;

      const loggedOut = statusCode === DisconnectReason.loggedOut;

      // Soket ini sudah tidak dipakai lagi. Satu putusan bisa memicu beberapa
      // kabar "close" berturut-turut, dan tanpa penjaga ini yang kedua jatuh ke
      // jalur sambung ulang di bawah lalu menghidupkan lagi nomor yang barusan
      // dinyatakan keluar, atau menimpa keterangan "dikeluarkan dari HP" dengan
      // kata "terputus" yang tidak memberi tahu apa-apa.
      if (sessions.get(channelId) !== session) return;

      if (session.stopping) {
        await setChannelStatus(channelId, { status: "disconnected", lastQr: null });
        return;
      }

      const namaAlasan =
        (DisconnectReason as Record<number, string>)[statusCode as number] ??
        "tidak diketahui";
      log.warn(
        `channel ${channelId} terputus. kode ${statusCode ?? "?"} (${namaAlasan})`,
      );

      // Hanya logout sungguhan yang boleh menghapus kredensial. Dulu semua
      // jenis putus diperlakukan sama, jadi gangguan sesaat pun memaksa
      // pengguna scan QR ulang padahal sesinya masih sah.
      if (loggedOut) {
        log.warn(`channel ${channelId} dikeluarkan dari HP, sesi dihapus`);
        fs.rmSync(sessionDir(channelId), { recursive: true, force: true });
        sessions.delete(channelId);
        lepasKunci(channelId);
        batalkanBalasanTertunda(channelId);
        await setChannelStatus(channelId, {
          status: "logged_out",
          lastQr: null,
          phoneNumber: null,
          lastError:
            "Nomor ini dikeluarkan lewat menu Perangkat tertaut di HP. Scan QR lagi kalau mau dipakai.",
        });
        return;
      }

      // Sesi yang sama dibuka di tempat lain. Kredensialnya masih sah, jadi
      // jangan dihapus, tapi juga jangan langsung nyambung lagi karena kedua
      // sesi akan saling menendang tanpa henti.
      if (statusCode === DisconnectReason.connectionReplaced) {
        sessions.delete(channelId);
        lepasKunci(channelId);
        batalkanBalasanTertunda(channelId);
        await setChannelStatus(channelId, {
          status: "disconnected",
          lastQr: null,
          lastError:
            "Sesi ini diambil alih di tempat lain. Biasanya karena ada dua Palwise jalan bersamaan, atau nomornya ditautkan ulang. Pastikan cuma satu yang jalan, lalu klik Sambungkan.",
        });
        return;
      }

      if (
        statusCode === DisconnectReason.forbidden ||
        statusCode === DisconnectReason.multideviceMismatch
      ) {
        sessions.delete(channelId);
        lepasKunci(channelId);
        batalkanBalasanTertunda(channelId);
        await setChannelStatus(channelId, {
          status: "disconnected",
          lastQr: null,
          lastError:
            "WhatsApp menolak sambungan ini. Pastikan HP-nya sudah pakai WhatsApp versi terbaru, lalu coba sambungkan lagi.",
        });
        return;
      }

      // Ini normal, dikirim WhatsApp tepat setelah QR berhasil dipindai.
      // Bukan kegagalan, jadi tidak boleh menghabiskan jatah percobaan.
      if (statusCode === DisconnectReason.restartRequired) {
        log.info(`channel ${channelId} minta mulai ulang setelah scan QR`);
        await setChannelStatus(channelId, { status: "connecting" });
        setTimeout(() => {
          if (!session.stopping) connect(session).catch((e) => log.error(e));
        }, 500);
        return;
      }

      // Sisanya gangguan sesaat: koneksi putus, timeout, layanan sibuk.
      session.retries += 1;
      if (session.retries > 12) {
        sessions.delete(channelId);
        lepasKunci(channelId);
        batalkanBalasanTertunda(channelId);
        await setChannelStatus(channelId, {
          status: "disconnected",
          lastError:
            "Gagal menyambung ulang setelah 12 percobaan. Periksa koneksi internet, lalu klik Sambungkan.",
        });
        return;
      }
      const delay = Math.min(30_000, 2_000 * session.retries);
      log.warn(`coba sambung ulang dalam ${delay / 1000} detik`);
      await setChannelStatus(channelId, { status: "connecting" });
      setTimeout(() => {
        if (!session.stopping) connect(session).catch((e) => log.error(e));
      }, delay);
    }
  });

  /**
   * Kabar dari WhatsApp soal nasib pesan yang KITA kirim.
   *
   * Angkanya: 0 galat, 1 masih di kita, 2 diterima server WhatsApp, 3 sampai
   * ke HP tujuan, 4 dibaca. Yang bikin bug 10 Agustus 2026 mahal adalah kita
   * tidak pernah melihat angka ini sama sekali: pesan yang berhenti di 1
   * kelihatan persis sama dengan pesan yang sampai, karena dua-duanya tidak
   * menghasilkan galat apa pun.
   *
   * Cuma dicatat, tidak dijadikan keputusan. Menahan balasan berikutnya karena
   * status belum 3 akan membuat asisten diam di jaringan yang lambat, dan itu
   * kerusakan yang lebih besar daripada yang sedang dijaga.
   */
  sock.ev.on("messages.update", (updates: any[]) => {
    for (const u of updates) {
      const status = u?.update?.status;
      if (status === undefined || !u?.key?.fromMe) continue;
      // 2 ke atas berarti server WhatsApp sudah memegangnya. Dari titik itu
      // nasibnya bukan urusan kita lagi.
      if (status >= 2) tandaiAck(u.key.id);
      log.info(
        `status pesan ${u.key.id} ke ${u.key.remoteJid}: ${status}${
          status <= 1 ? " (belum diterima server WhatsApp)" : ""
        }`,
      );
    }
  });

  sock.ev.on("messages.upsert", async (upsert: any) => {
    // "notify" = pesan yang datang sekarang, selagi kita hidup.
    // "append" = pesan susulan yang dikirim WhatsApp waktu kita menyambung
    //            lagi, yaitu yang masuk SELAGI KITA MATI.
    //
    // Dulu baris ini cuma menerima "notify", jadi tiap kali worker mati
    // sebentar (deploy, restart, server reboot, listrik mati), semua chat yang
    // masuk selama itu HILANG TOTAL: tidak dibalas, dan tidak tersimpan sama
    // sekali, jadi pemilik usahanya tidak pernah tahu ada yang menghubungi.
    // Itu justru merusak satu-satunya janji produk ini.
    //
    // Menerimanya begitu saja juga berbahaya: waktu nomor baru pertama kali
    // discan, WhatsApp bisa mengirim riwayat lama sekaligus, dan kalau semua
    // dibalas, ratusan orang dapat pesan dari masa lalu. Pengamannya ada di
    // handleIncoming: pesan ganda ditolak, yang terlalu tua disimpan tapi
    // tidak dibalas, dan yang jauh lebih tua tidak disentuh sama sekali.
    if (upsert.type !== "notify" && upsert.type !== "append") return;
    const susulan = upsert.type === "append";

    for (const msg of upsert.messages ?? []) {
      const jid = msg?.key?.remoteJid ?? "?";
      // Saring di sini juga supaya saluran dan grup tidak sempat masuk antrean.
      if (!dariOrangSungguhan(jid)) continue;
      // Pesan dari orang yang sama diproses satu per satu. Kalau dibiarkan
      // berbarengan, kontak dan obrolannya bisa terbuat dua kali karena
      // keduanya sama-sama melihat "belum ada".
      berurutan(`masuk:${session.channelId}:${jid}`, () =>
        handleIncoming(session, msg, susulan),
      ).catch((err) =>
        log.error(`gagal memproses pesan masuk: ${err?.message ?? err}`),
      );
    }
  });
}

/**
 * Matikan sebuah nomor. `logout` berarti sesinya ikut dicabut dari HP.
 *
 * `autoStart` WAJIB ikut dimatikan, dan ini bukan detail kecil.
 *
 * Kejadian nyata 2026-08-05: pemiliknya menekan "Matikan sementara", layarnya
 * memang berubah jadi mati, tapi beberapa saat kemudian nomornya melayani dan
 * membalas pelanggan lagi. Penyebabnya bukan tombolnya gagal. Tombolnya cuma
 * mengakhiri soket yang sedang hidup, sedangkan `restoreChannels` menyalakan
 * ulang semua nomor bertanda `autoStart` setiap worker start. Kolom itu bernilai
 * bawaan `true` dan dulu tidak pernah ditulis oleh siapa pun, jadi tiap deploy,
 * tiap restart, dan di mode dev tiap satu berkas disimpan, nomor yang sudah
 * sengaja dimatikan hidup lagi sendiri.
 *
 * Bentuk kegagalannya persis yang paling merusak kepercayaan: perintah orangnya
 * dijalankan di depan mata, lalu dibatalkan diam-diam oleh sesuatu yang tidak
 * dia lakukan dan tidak dia lihat.
 */
export async function stopChannel(channelId: string, logout = false): Promise<void> {
  const session = sessions.get(channelId);
  if (session) {
    session.stopping = true;
    try {
      if (logout) await session.sock?.logout();
      else session.sock?.end(undefined);
    } catch {
      // socket mungkin sudah mati
    }
    sessions.delete(channelId);
  }
  lepasKunci(channelId);
  batalkanBalasanTertunda(channelId);

  if (logout) {
    fs.rmSync(sessionDir(channelId), { recursive: true, force: true });
    await setChannelStatus(channelId, {
      status: "disconnected",
      lastQr: null,
      phoneNumber: null,
      lastError: null,
      connectedAt: null,
      autoStart: false,
    });
  } else {
    await setChannelStatus(channelId, {
      status: "disconnected",
      lastQr: null,
      autoStart: false,
    });
  }
}

export function channelRuntimeStatus(channelId: string): string | null {
  return sessions.get(channelId)?.status ?? null;
}

/**
 * Dipanggil saat worker dimatikan. Tanpa ini kuncinya tertinggal dan proses
 * berikutnya menolak menyambung padahal tidak ada yang memakai.
 */
export function lepasSemuaKunci() {
  for (const channelId of sessions.keys()) {
    lepasKunci(channelId);
  }
}

/** Sambungkan ulang semua channel yang ditandai autoStart saat worker start. */
export async function restoreChannels(): Promise<void> {
  const channels = await prisma.channel.findMany({ where: { autoStart: true } });
  for (const c of channels) {
    // Nomor di luar jatah paket tidak ikut dinyalakan, kalau tidak turun paket
    // jadi percuma karena semua nomornya tetap hidup setelah worker restart.
    //
    // Statusnya ikut dibetulkan, bukan cuma dicatat di log. Dulu barisnya cuma
    // `continue`, jadi nomor yang tidak pernah dinyalakan tetap tersimpan
    // "connected" dari sesi sebelumnya, dan layarnya terus berkata "Nomor ini
    // sudah jalan, chat yang masuk otomatis dibalas" untuk nomor yang sudah
    // mati berminggu-minggu. Pemiliknya tidak punya satu pun petunjuk bahwa
    // pelanggannya sedang tidak dilayani.
    if (!(await dalamJatahPaket(c.id))) {
      log.info(`nomor "${c.name}" di luar jatah paket, tidak dinyalakan`);
      if (c.status !== "disconnected") {
        await setChannelStatus(c.id, {
          status: "disconnected",
          lastQr: null,
          lastError:
            "Nomor ini di luar jatah paketmu sekarang, jadi tidak dinyalakan. Naikkan paket, atau hapus nomor yang lebih lama.",
        });
      }
      continue;
    }

    // Hanya sambungkan yang kredensialnya masih ada di disk.
    const hasCreds = fs.existsSync(path.join(sessionDir(c.id), "creds.json"));
    if (!hasCreds) {
      if (c.status !== "disconnected") {
        await setChannelStatus(c.id, { status: "disconnected", lastQr: null });
      }
      continue;
    }
    log.info(`menyambung ulang channel "${c.name}"…`);
    startChannel(c.id).catch((e) =>
      log.error(`gagal menyambung ulang ${c.name}: ${e?.message ?? e}`),
    );
  }
}

// ─── Pesan masuk ──────────────────────────────────────────────────────────────

/**
 * Balasan sengaja ditunda sebentar. Orang sering mengetik satu maksud jadi
 * beberapa pesan pendek ("halo", "kak", "arabika ada?"). Tanpa jeda ini, tiap
 * pesan dijawab sendiri-sendiri: tiga balasan, tiga kali potong kuota, dan
 * jawabannya saling tumpang tindih.
 *
 * HARUS lebih besar daripada MAX_TYPING_MS, dan itu bukan pilihan gaya.
 *
 * Dulu angkanya 1.800 ms, padahal tiap bubble yang KITA kirim menunggu
 * `panjang × typingSpeedMs` sampai 4 detik. Dengan kecepatan bawaan 25 ms per
 * huruf, bubble yang lebih panjang dari 72 huruf tiba dengan jarak lebih dari
 * 1,8 detik. Jadi lawan bicara yang memakai Palwise juga mengirim bubble-nya
 * terlalu berjauhan untuk terkumpul, dan tiap bubble memicu balasannya sendiri.
 *
 * Akibatnya berlipat, bukan bertambah: dua bubble masuk jadi dua panggilan
 * model, keluar bisa empat bubble, lalu lawan bicara membalas empat. Terlihat
 * jelas pada 2026-08-05, waktu dua nomor Palwise diuji saling chat.
 *
 * Ongkosnya sekitar 2,7 detik tambahan sebelum asisten mulai mengetik. Untuk
 * chat WhatsApp itu justru terasa lebih wajar daripada balasan yang menyambar.
 */
const JEDA_KUMPUL_MS = 4_500;

interface Tertunda {
  timer: NodeJS.Timeout;
  jid: string;
  media: IncomingMedia | null;
  typingSpeedMs: number;
  /**
   * Diisi kalau lampirannya ditolak karena ukurannya.
   *
   * Tanpa ini, pelanggan yang mengirim video 200 MB dapat balasan "boleh
   * diulangi pertanyaannya?" karena dari sisi asisten pesannya memang kosong.
   * Dia akan mengulang mengirim berkas yang sama, dan gagal lagi, tanpa pernah
   * tahu apa yang salah.
   */
  lampiranMasalah?: LampiranMasalah;
  /** Berapa kali balasan ini sudah ditunda karena nomornya sedang menyambung. */
  percobaanUlang?: number;
}

const menungguBalasan = new Map<string, Tertunda & { channelId: string }>();

/**
 * Buang balasan yang masih mengantre untuk sebuah nomor.
 *
 * Dipanggil begitu nomornya lepas. Tanpa ini, jadwal yang sudah terlanjur
 * dipasang tetap meletus beberapa detik kemudian, memanggil model, memotong
 * jatah balasan pelanggan, lalu gagal mengirim karena soketnya sudah mati.
 * Yang dibayar tetap dibayar, dan yang menerima tidak ada.
 */
function batalkanBalasanTertunda(channelId: string) {
  let n = 0;
  for (const [conversationId, t] of menungguBalasan) {
    if (t.channelId !== channelId) continue;
    clearTimeout(t.timer);
    menungguBalasan.delete(conversationId);
    n++;
  }
  if (n > 0) log.warn(`${n} balasan yang mengantre dibatalkan, nomornya lepas`);
}

/**
 * Gabungkan jadwal balasan yang baru dengan yang masih mengantre.
 *
 * Lampiran dari pesan sebelumnya di jendela pengumpul yang sama TIDAK boleh
 * hilang, dan dulu selalu hilang.
 *
 * Orang mengirim foto lalu mengetik keterangannya sebagai pesan terpisah, dan
 * itu urutan yang paling wajar: foto bukti transfer lalu "ini kak buktinya",
 * atau foto barang lalu "yang ini ada?". Pesan kedua menjadwalkan ulang dengan
 * lampiran kosong, dan seluruh isi yang dijadwalkan sebelumnya ditimpa. Jadi
 * fotonya tersimpan di kotak masuk, terlihat wajar, tapi TIDAK PERNAH sampai ke
 * model sama sekali. Asistennya menjawab tanpa pernah melihat gambarnya.
 *
 * Peluangnya membesar 2,5 kali waktu jeda pengumpul dinaikkan dari 1,8 detik ke
 * 4,5 detik untuk menghentikan balasan berlipat.
 *
 * Lampiran yang baru tetap menang kalau memang ada, karena itu yang paling
 * mungkin sedang dia tanyakan. Yang lama cuma dipakai kalau yang baru kosong.
 */
export function gabungTertunda<
  T extends {
    media: IncomingMedia | null;
    lampiranMasalah?: LampiranMasalah;
  },
>(baru: T, lama: T | undefined): T {
  if (!lama) return baru;
  return {
    ...baru,
    media: baru.media ?? lama.media,
    // Lampiran yang tidak terbaca juga tidak boleh hilang. Kalau hilang,
    // pelanggan yang mengirim video kebesaran lalu mengetik sesuatu tidak
    // pernah diberi tahu bahwa berkasnya tidak terbaca.
    lampiranMasalah: baru.lampiranMasalah ?? lama.lampiranMasalah,
  };
}

function jadwalkanBalasan(
  session: Session,
  conversationId: string,
  data: Omit<Tertunda, "timer">,
) {
  const lama = menungguBalasan.get(conversationId);
  if (lama) clearTimeout(lama.timer);

  const gabungan = gabungTertunda(data, lama);

  const timer = setTimeout(() => {
    menungguBalasan.delete(conversationId);
    // Ikut antrean obrolan yang sama supaya tidak menyalip pesan yang
    // barusan masuk dan belum sempat tersimpan.
    berurutan(`balas:${conversationId}`, () =>
      balasSekarang(session, conversationId, gabungan),
    ).catch((err) => log.error(`gagal membalas: ${err?.message ?? err}`));
  }, JEDA_KUMPUL_MS);

  menungguBalasan.set(conversationId, {
    ...gabungan,
    timer,
    channelId: session.channelId,
  });
}

/**
 * Seberapa lama sebuah pesan masih pantas dijawab lewat sapuan ini.
 *
 * Bukan 24 jam seperti pesan susulan dari WhatsApp. Yang disapu di sini pesan
 * yang gagal dijawab karena worker-nya mati di detik yang salah, dan itu selalu
 * soal menit, bukan jam. Balasan yang datang sehari kemudian untuk pertanyaan
 * yang sudah lewat justru bikin canggung.
 */
const SAPUAN_MENIT = 30;

/**
 * Apakah sebuah obrolan memang tertinggal tanpa jawaban.
 *
 * Dipisah sebagai fungsi murni dengan alasan yang sama seperti
 * [perluDiingatkan] di penjadwal sapaan: pekerjaan aslinya butuh sambungan
 * WhatsApp yang hidup, jadi tidak bisa dijalankan ujung ke ujung di selftest,
 * dan aturan yang cuma hidup di dalam kueri berarti aturan yang tidak pernah
 * diuji.
 */
export function perluDisapu(
  c: { lastCustomerAt: Date | null; lastOutboundAt: Date | null },
  sedangMengantre: boolean,
  sekarang: Date = new Date(),
): boolean {
  if (!c.lastCustomerAt) return false;

  // Sudah ada jadwal yang mengantre untuk obrolan ini. Membiarkan keduanya
  // jalan berarti dua balasan untuk satu pesan.
  if (sedangMengantre) return false;

  // Terlalu lama. Balasan yang datang sehari kemudian untuk pertanyaan yang
  // sudah lewat justru bikin canggung.
  if (
    c.lastCustomerAt.getTime() <
    sekarang.getTime() - SAPUAN_MENIT * 60 * 1000
  ) {
    return false;
  }

  // Pelanggan harus yang bicara terakhir. `lastOutboundAt` bergerak tiap kali
  // asisten atau pemiliknya mengirim sesuatu, jadi perbandingan ini yang
  // membedakan "belum dijawab" dari "sudah dijawab lalu dia diam".
  return !c.lastOutboundAt || c.lastCustomerAt > c.lastOutboundAt;
}

/**
 * Jawab pesan pelanggan yang tertinggal tanpa balasan.
 *
 * Menutup lubang yang cuma muncul pada waktu yang sangat sempit tapi nyata.
 * Balasan sengaja ditunda beberapa detik supaya beberapa pesan pendek terkumpul
 * jadi satu jawaban, dan jadwal itu cuma hidup di memori. Kalau worker mati di
 * dalam jeda tersebut, entah karena deploy, restart, atau listrik, jadwalnya
 * hilang bersama prosesnya.
 *
 * Pesannya sendiri sudah tersimpan, dan justru itu yang membuatnya tidak pernah
 * dijawab: waktu WhatsApp mengirim ulang pesan yang sama sesudah tersambung
 * lagi, penjaga anti-dobel mengenalinya sebagai pesan lama lalu berhenti di
 * situ. Jadi pesannya ada di kotak masuk, terlihat wajar, dan tidak ada
 * satu pun yang pernah menjawabnya.
 *
 * Jendelanya melebar 2,5 kali waktu jeda pengumpul dinaikkan dari 1,8 detik ke
 * 4,5 detik untuk menghentikan balasan berlipat, jadi sapuan ini bagian dari
 * ongkos perubahan itu.
 */
async function sapuBelumDibalas(session: Session): Promise<void> {
  const sock = session.sock;
  if (!sock) return;

  const batas = new Date(Date.now() - SAPUAN_MENIT * 60 * 1000);

  const calon = await prisma.conversation.findMany({
    where: {
      channelId: session.channelId,
      status: "open",
      aiEnabled: true,
      needsHuman: false,
      lastCustomerAt: { not: null, gte: batas },
    },
    include: { contact: true },
    orderBy: { lastCustomerAt: "asc" },
    take: 20,
  });

  const channel = await prisma.channel.findUnique({
    where: { id: session.channelId },
    include: { agent: true },
  });
  const kecepatan = channel?.agent?.typingSpeedMs ?? 25;

  for (const c of calon) {
    if (!perluDisapu(c, menungguBalasan.has(c.id))) continue;
    // Nomor asli yang dipakai mengirim, bukan LID yang tersimpan. Sama dengan
    // jalur balasan biasa; kalau di sini masih memakai waJid, sapuan ini
    // "berhasil" tanpa satu pun pesan sampai.
    const tujuan = alamatKirim(c.contact.waJid, c.contact.phone);
    if (!tujuan) continue;

    const hasil = await runAgentOnConversation({ conversationId: c.id });
    if (hasil.status !== "replied") {
      log.info(`sapuan melewati ${c.id}: ${hasil.reason}`);
      continue;
    }

    log.info(`pesan yang tertinggal tanpa jawaban di ${c.id} dibalas`);
    await sendBubbles(sock, tujuan, hasil.bubbles, kecepatan, session.channelId);
    if (hasil.berkas.length > 0) {
      await sendAssets(sock, tujuan, hasil.berkas);
    }
  }
}

async function balasSekarang(
  session: Session,
  conversationId: string,
  data: Omit<Tertunda, "timer">,
) {
  // Periksa sambungannya DULU, sebelum memanggil model.
  //
  // Antrean per obrolan bisa menahan sebuah balasan sampai puluhan detik, dan
  // dalam rentang itu nomornya bisa saja sudah lepas. Kalau tidak diperiksa di
  // sini, model tetap dipanggil, tokennya tetap ditagih, jatah balasan
  // pelanggan tetap dipotong, lalu pengirimannya gagal dengan "Connection
  // Closed". Pernah terjadi berturut-turut: enam balasan dibuat dan dibayar
  // sesudah nomornya keluar, tidak satu pun sampai ke pelanggan.
  //
  // Pesannya sendiri sudah tersimpan di kotak masuk, jadi tidak ada yang
  // hilang. Pemiliknya membalas sendiri sesudah nomornya disambung lagi.
  if (!isChannelConnected(session.channelId)) {
    // "connecting" berarti putusnya sesaat dan sedang disambung lagi. Gangguan
    // internet dua detik tidak boleh membuang balasan pelanggan, jadi yang ini
    // ditunggu, bukan dibuang. Batasnya tiga kali supaya nomor yang benar-benar
    // mati tidak menggantung antrean selamanya.
    const percobaan = data.percobaanUlang ?? 0;
    if (channelRuntimeStatus(session.channelId) === "connecting" && percobaan < 3) {
      log.warn(
        `balasan untuk obrolan ${conversationId} ditunda, nomornya sedang menyambung ulang (${percobaan + 1}/3)`,
      );
      setTimeout(() => {
        berurutan(`balas:${conversationId}`, () =>
          balasSekarang(session, conversationId, {
            ...data,
            percobaanUlang: percobaan + 1,
          }),
        ).catch((err) => log.error(`gagal membalas: ${err?.message ?? err}`));
      }, 10_000);
      return;
    }

    log.warn(
      `balasan untuk obrolan ${conversationId} dibatalkan: nomornya tidak tersambung`,
    );
    return;
  }

  // Kalimat penolakannya TIDAK disusun di sini.
  //
  // Alasannya saja yang diteruskan, dan yang menyusun kalimatnya
  // `runAgentOnConversation`, supaya semua sebab lampiran-tidak-terbaca punya
  // satu tempat. Waktu kalimatnya disusun di dua tempat, yang satu ikut
  // diperbarui dan yang lain tertinggal, dan yang tertinggal itu tidak akan
  // ketahuan sampai ada pelanggan yang kena.
  const result = await runAgentOnConversation({
    conversationId,
    media: data.media,
    lampiranMasalah: data.lampiranMasalah,
  });

  const sock = session.sock;

  if (result.status === "skipped") {
    log.info(`AI tidak membalas (${result.reason})`);

    // Eskalasi yang menggantung juga tidak boleh berarti pelanggan didiamkan.
    // Selama jendela tunggu, dia dikabari sekali bahwa pesannya sampai. Tanpa
    // ini, dari sisi pelanggan diamnya asisten tidak bisa dibedakan dari nomor
    // yang mati.
    if (result.code === "handoff_pending" && sock) {
      const pesan = await kabariEskalasiSekali(conversationId);
      if (pesan)
        await sendBubbles(
          sock,
          data.jid,
          [pesan],
          data.typingSpeedMs,
          session.channelId,
        );
      return;
    }

    // Kuota habis tidak boleh berarti pelanggan didiamkan. Sekali saja per
    // obrolan, supaya dia tahu pesannya masuk tanpa dibanjiri.
    if (result.code === "quota_exhausted" && sock) {
      const pesan = await kabariPelangganSekali(conversationId);
      if (pesan) await sendBubbles(sock, data.jid, [pesan], 0, session.channelId);

      await periksaDanKabari(session.workspaceId, async (jid, teks) => {
        await sock.sendMessage(jid, { text: teks });
      });
    }
    return;
  }

  if (!sock) return;
  await sendBubbles(
    sock,
    data.jid,
    result.bubbles,
    data.typingSpeedMs,
    session.channelId,
  );

  // Peringatan menipis dikirim setelah balasannya sampai, bukan sebelum.
  await periksaDanKabari(session.workspaceId, async (jid, teks) => {
    await sock.sendMessage(jid, { text: teks });
  });

  if (result.berkas.length > 0) {
    await sendAssets(sock, data.jid, result.berkas);
  }
}

/**
 * Alamat yang benar-benar berasal dari satu orang.
 *
 * Sengaja daftar putih, bukan daftar hitam. Dulu dipakai daftar hitam dan
 * Saluran WhatsApp ("@newsletter") lolos: tiap postingan promo dari saluran
 * yang diikuti pemilik toko dianggap pelanggan baru, dapat sapaan, dan
 * memotong kuota. WhatsApp juga bisa menambah jenis alamat baru kapan saja,
 * dan daftar hitam selalu ketinggalan.
 */
export function dariOrangSungguhan(jid: string): boolean {
  return (
    jid.endsWith("@s.whatsapp.net") || jid.endsWith("@c.us") || jid.endsWith("@lid")
  );
}

/**
 * Batas untuk pesan susulan, yaitu yang masuk selagi worker mati.
 *
 * Dua angka, karena MENYIMPAN dan MEMBALAS itu keputusan yang berbeda.
 *
 * Pesan yang tertinggal harus tetap masuk kotak masuk walau sudah lama, supaya
 * pemilik usahanya tahu ada yang pernah menghubungi. Tapi membalas otomatis
 * pesan yang sudah lewat sehari itu justru bikin canggung: pelanggannya sudah
 * pindah ke tempat lain, dan tiba-tiba dibalas seperti tidak terjadi apa-apa.
 *
 * Angka 24 jam bukan tebakan. Itu batas yang sama dengan jendela percakapan
 * WhatsApp: chat yang dimulai pelanggan bebas dibalas selama 24 jam.
 */
const SIMPAN_SUSULAN_JAM = 72;
const BALAS_SUSULAN_JAM = 24;

/** Stempel waktu WhatsApp bisa angka, teks, atau objek Long. */
function bacaStempel(nilai: unknown): number | null {
  if (typeof nilai === "number") return nilai;
  if (typeof nilai === "string") {
    const n = Number(nilai);
    return Number.isFinite(n) ? n : null;
  }
  const long = nilai as { low?: number; high?: number } | null;
  if (long && typeof long.low === "number" && typeof long.high === "number") {
    return long.high * 4294967296 + (long.low >>> 0);
  }
  return null;
}

/**
 * Berapa lama foto profil dianggap masih segar sebelum boleh dicek lagi.
 *
 * Panjang dengan sengaja. Foto profil jarang ganti, dan yang paling penting:
 * meminta foto ke WhatsApp terlalu sering, apalagi borongan, kelihatan seperti
 * bot dan bisa memancing pembatasan pada nomornya. Nomor itu urat nadi produk
 * ini, jadi hiasan avatar tidak boleh mempertaruhkannya.
 */
const FOTO_CEK_ULANG_HARI = 7;

/**
 * Ambil foto profil WhatsApp satu kontak, kalau ada dan publik, lalu simpan
 * berkasnya.
 *
 * Dipanggil TANPA di-await (di latar belakang) dari alur pesan masuk: kalaupun
 * gagal, balasan ke pelanggan tidak boleh ikut tertahan. Dan hanya sesekali per
 * kontak (lihat [FOTO_CEK_ULANG_HARI]), bukan tiap pesan.
 *
 * URL foto WA bertanda tangan dan kedaluwarsa, jadi yang disimpan berkasnya,
 * bukan tautannya. Kalau fotonya disembunyikan ("kontak saya saja", dan nomor
 * bisnis biasanya belum jadi kontak pelanggan baru) atau memang tidak ada,
 * `profilePictureUrl` melempar; itu bukan galat, cuma berarti tidak ada foto.
 * Yang penting: waktu ceknya tetap dicatat supaya tidak ditanyakan lagi tiap
 * pesan.
 */
async function ambilFotoProfil(
  sock: WASocket,
  contact: { id: string; waJid: string | null; waFotoDicekPada: Date | null },
) {
  if (!contact.waJid) return;
  if (
    contact.waFotoDicekPada &&
    Date.now() - contact.waFotoDicekPada.getTime() <
      FOTO_CEK_ULANG_HARI * 86_400_000
  ) {
    return;
  }
  try {
    const url = await sock.profilePictureUrl(contact.waJid, "image");
    if (!url) {
      await prisma.contact.update({
        where: { id: contact.id },
        data: { waFotoDicekPada: new Date() },
      });
      return;
    }
    const res = await fetch(url);
    if (!res.ok) throw new Error(`unduh foto ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    // Foto profil WA kecil; batas ini cuma jaring pengaman.
    if (buf.length > 2_000_000) throw new Error("foto profil kebesaran");

    const lama = (
      await prisma.contact.findUnique({
        where: { id: contact.id },
        select: { waFotoPath: true },
      })
    )?.waFotoPath;

    const filename = `${randomUUID()}.jpg`;
    fs.writeFileSync(path.join(env.MEDIA_DIR, filename), buf);
    await prisma.contact.update({
      where: { id: contact.id },
      data: { waFotoPath: filename, waFotoDicekPada: new Date() },
    });
    // Foto lama dibuang supaya tidak menumpuk di penyimpanan.
    if (lama && lama !== filename) {
      try {
        fs.unlinkSync(path.join(env.MEDIA_DIR, lama));
      } catch {
        // sudah tidak ada, tidak apa-apa
      }
    }
  } catch {
    // Tidak ada foto / disembunyikan / gagal. Waktu ceknya tetap dicatat supaya
    // tidak ditanyakan lagi tiap pesan; foto yang mungkin sudah ada dari cek
    // sebelumnya dibiarkan apa adanya.
    try {
      await prisma.contact.update({
        where: { id: contact.id },
        data: { waFotoDicekPada: new Date() },
      });
    } catch {
      // kontaknya keburu hilang, abaikan
    }
  }
}

async function handleIncoming(
  session: Session,
  msg: proto.IWebMessageInfo,
  susulan = false,
) {
  const jid = msg.key?.remoteJid;
  if (!jid) return;
  if (msg.key.fromMe) return;

  if (!dariOrangSungguhan(jid)) {
    log.info(`pesan dari ${jid} diabaikan, bukan chat pribadi`);
    return;
  }

  // Pesan siaran tetap datang lewat alamat pribadi, jadi harus dicek terpisah.
  if ((msg as { broadcast?: boolean }).broadcast) {
    log.info(`pesan siaran dari ${jid} diabaikan`);
    return;
  }

  if (!msg.message) return;

  const extracted = extractMessage(msg.message);
  if (!extracted.text && !extracted.isMedia) return;

  // Pesan yang sama tidak boleh masuk dua kali.
  //
  // WhatsApp bisa mengirim ulang pesan yang sama waktu kita menyambung lagi,
  // dan tanpa pemeriksaan ini satu chat pelanggan tersimpan dobel lalu dibalas
  // dua kali. Kolomnya sudah lama disimpan, cuma tidak pernah diperiksa.
  const idWa = msg.key.id ?? null;
  if (idWa) {
    const sudahAda = await prisma.message.findFirst({
      where: { waMessageId: idWa, conversation: { channelId: session.channelId } },
      select: { id: true },
    });
    if (sudahAda) return;
  }

  // Umur pesannya, untuk memutuskan disimpan saja atau ikut dibalas.
  const detik = bacaStempel(msg.messageTimestamp);
  const umurJam = detik ? (Date.now() - detik * 1000) / 3_600_000 : 0;

  if (susulan && umurJam > SIMPAN_SUSULAN_JAM) {
    // Terlalu tua bahkan untuk disimpan. Ini yang menahan banjir riwayat lama
    // waktu sebuah nomor baru pertama kali discan.
    return;
  }

  const bolehBalas = !susulan || umurJam <= BALAS_SUSULAN_JAM;

  const channel = await prisma.channel.findUnique({
    where: { id: session.channelId },
  });
  if (!channel) return;

  // WhatsApp mulai memakai LID, alamat acak yang menyembunyikan nomor asli.
  // Nomor sebenarnya dikirim terpisah di senderPn, jadi harus diambil dari
  // sana. Kalau tidak, yang tersimpan cuma angka LID yang bukan nomor siapa pun.
  const kunci = msg.key as { senderPn?: string; participantPn?: string };
  const jidNomor = kunci.senderPn ?? kunci.participantPn ?? null;
  const nomor = jidToPhone(jidNomor ?? jid);

  const contact = await getOrCreateContact({
    workspaceId: channel.workspaceId,
    waJid: jid,
    phone: nomor,
    pushName: msg.pushName ?? undefined,
  });

  // Foto profil diambil di latar belakang, tidak menahan balasan, dan cuma
  // sesekali per kontak. Sengaja tidak di-await.
  if (session.sock) void ambilFotoProfil(session.sock, contact);

  const conversation = await getOrCreateConversation({
    workspaceId: channel.workspaceId,
    contactId: contact.id,
    channelId: channel.id,
    agentId: channel.agentId,
  });

  const isFirstMessage =
    (await prisma.message.count({ where: { conversationId: conversation.id } })) === 0;

  // Unduh media kalau ada.
  let media: { mimeType: string; data: string; storedPath?: string } | null = null;
  let mediaPath: string | null = null;

  // Ditolak SEBELUM diunduh kalau pengirimnya sendiri sudah mengaku besar.
  //
  // Pemeriksaan setelah unduh tetap ada di bawah, tapi dia terlambat: berkasnya
  // sudah utuh di memori waktu ditolak. Satu VPS 8 GB yang menjalankan
  // dashboard, worker, dan model sekaligus tidak punya ruang untuk video 200 MB
  // yang ujungnya dibuang. Angka ini datang dari luar jadi bisa bohong, dan
  // itulah kenapa pemeriksaan kedua tidak dihapus.
  const terlaluBesarDiakui =
    extracted.ukuranBytes !== null && extracted.ukuranBytes > MAX_MEDIA_BYTES;
  if (terlaluBesarDiakui) {
    log.warn(
      `media diakui ${extracted.ukuranBytes} byte, lewat batas — tidak diunduh`,
    );
  }

  // Terlalu panjang TETAP DIUNDUH DAN DISIMPAN, cuma tidak dibacakan ke model.
  //
  // Bedanya dengan terlalu besar disengaja. Yang kebesaran ditolak sebelum
  // diunduh karena memang tidak muat di memori; yang kepanjangan ukurannya
  // masih di bawah batas byte, jadi menyimpannya murah, dan pemilik usahanya
  // justru paling butuh bisa mendengarkan sendiri voice note panjang itu.
  const terlaluPanjang =
    extracted.durasiDetik !== null && extracted.durasiDetik > MAKS_DETIK_MEDIA;
  if (terlaluPanjang) {
    log.info(
      `lampiran ${extracted.mediaType} ${extracted.durasiDetik} detik, lewat batas ${MAKS_DETIK_MEDIA} — disimpan tapi tidak dibacakan ke AI`,
    );
  }

  if (extracted.isMedia && extracted.mediaType !== "sticker" && !terlaluBesarDiakui) {
    try {
      const buffer = (await downloadMediaMessage(
        msg,
        "buffer",
        {},
        { logger: waLogger, reuploadRequest: session.sock!.updateMediaMessage },
      )) as Buffer;

      if (buffer.length <= MAX_MEDIA_BYTES) {
        const ext = extensionFor(extracted.mimeType);
        const filename = `${randomUUID()}.${ext}`;
        fs.writeFileSync(path.join(env.MEDIA_DIR, filename), buffer);
        mediaPath = filename;
        // Yang kepanjangan berhenti di sini: berkasnya tersimpan dan bisa
        // dibuka pemilik usahanya, tapi isinya tidak ikut ke model.
        if (!terlaluPanjang) {
          media = {
            mimeType: normalizeMime(extracted.mimeType),
            data: buffer.toString("base64"),
            storedPath: filename,
          };
        }
      } else {
        log.warn(`media terlalu besar (${buffer.length} byte) — dilewati`);
      }
    } catch (err) {
      log.warn(`gagal unduh media: ${err instanceof Error ? err.message : err}`);
    }
  }

  await appendMessage({
    conversationId: conversation.id,
    workspaceId: channel.workspaceId,
    role: "customer",
    content: extracted.text,
    mediaType: extracted.mediaType,
    mediaPath,
    waMessageId: msg.key.id ?? null,
  });

  // Tandai sudah dibaca supaya customer melihat centang biru.
  try {
    await session.sock?.readMessages([msg.key]);
  } catch {
    // tidak fatal
  }

  const sock = session.sock;
  if (!sock) return;

  // Sapaan pembuka hanya untuk chat pertama kali.
  const agent = channel.agentId
    ? await prisma.agent.findUnique({ where: { id: channel.agentId } })
    : null;

  // Pesan yang tertinggal terlalu lama tetap tersimpan supaya kelihatan di
  // kotak masuk, tapi berhenti di sini. Yang membalasnya pemiliknya sendiri,
  // dengan kalimat yang pantas untuk keterlambatan itu.
  if (!bolehBalas) {
    log.info(
      `pesan susulan dari ${jid} umur ${Math.round(umurJam)} jam: disimpan, tidak dibalas otomatis`,
    );
    return;
  }

  // Alamat KIRIM, yang belum tentu sama dengan alamat masuknya.
  //
  // Pesan dari WhatsApp versi baru datang dari `...@lid`, angka acak yang
  // menyembunyikan nomor asli. Membalas ke alamat itu diterima Baileys tanpa
  // galat sedikit pun, tapi tidak pernah sampai ke HP orangnya.
  //
  // NOMORNYA DIAMBIL DARI KONTAK, BUKAN DARI PESAN INI SAJA. `senderPn` cuma
  // ikut di sebagian pesan, dan itu yang bikin perbaikan pertama cuma separuh
  // jalan: pesan pertama terkirim benar karena nomornya kebetulan ikut, pesan
  // berikutnya balik lagi ke LID karena `senderPn` tidak ada, dan gagalnya
  // tetap diam-diam. Kontak menyimpan nomor yang sudah pernah dikenali, jadi
  // dia yang jadi patokan; `nomor` dari pesan ini cuma cadangan untuk kontak
  // yang benar-benar baru.
  const jidKirim = alamatKirim(jid, contact.phone ?? nomor) ?? jid;

  // "Pertama" di sini artinya pertama BAGI PALWISE, bukan pertama bagi mereka
  // berdua.
  //
  // Nomor yang baru disambungkan mewarisi seluruh isi WhatsApp yang sudah
  // berjalan bertahun-tahun. Orang yang sudah kenal pemiliknya menulis "ok om"
  // sebagai penutup obrolan kemarin, lalu dibalas "Halo kak! Ini Klastuning.
  // Ada yang perlu dikerjakan?" seperti belum pernah ketemu. Kejadian nyata 11
  // Agustus 2026, dan dari sisi penerima itu bukan ramah, itu tanda nomornya
  // rusak.
  //
  // Jadi sapaan pembuka cuma dikirim kalau pesannya memang terbaca seperti
  // pembuka. Tanda terima dan salam penutup jelas bukan.
  // Lampiran selalu dihitung pembuka: foto tanpa keterangan itu jelas ada
  // maksudnya, dan `tanpaIsi` cuma bisa membaca teks.
  const pembukaSungguhan = extracted.isMedia || !tanpaIsi(extracted.text);

  // `isActive` DIPERIKSA DI SINI JUGA, bukan cuma di yang menyusun balasan.
  //
  // Dulu tidak, dan akibatnya justru lebih buruk daripada bug yang diam-diam.
  // Pemilik usaha yang mematikan asistennya tetap mengirim sapaan otomatis ke
  // setiap orang baru, lalu tidak ada satu pun jawaban sesudahnya, karena yang
  // menyusun balasan memang menghormati tombol matinya. Dari sisi pelanggan itu
  // bukan sunyi, itu disapa robot lalu ditinggal.
  //
  // Kejadian nyata 11 Agustus 2026: pemiliknya mematikan asisten di tengah
  // hari, lalu pelanggan berikutnya menulis "Baleno next g 2004 pak", dibalas
  // "Halo kak! Ada yang bisa saya bantu?", dan sesudah itu tidak pernah dijawab
  // siapa pun.
  if (
    isFirstMessage &&
    pembukaSungguhan &&
    agent?.isActive &&
    agent.welcomeMessage &&
    conversation.aiEnabled
  ) {
    await sendBubbles(
      sock,
      jidKirim,
      [agent.welcomeMessage],
      agent.typingSpeedMs,
      session.channelId,
    );
    await appendMessage({
      conversationId: conversation.id,
      workspaceId: channel.workspaceId,
      role: "ai",
      content: agent.welcomeMessage,
    });
  }

  // Balasannya dijadwalkan, bukan dijalankan sekarang. Kalau pesan berikutnya
  // datang sebelum jedanya habis, jadwalnya diundur dan semuanya dijawab sekali.
  jadwalkanBalasan(session, conversation.id, {
    jid: jidKirim,
    media,
    typingSpeedMs: agent?.typingSpeedMs ?? 25,
    // Ditolak karena ukurannya, entah dari angka yang diakui pengirim atau
    // dari ukuran sesungguhnya setelah diunduh. Dua-duanya berakhir sama dari
    // sisi asisten: dia tidak punya isinya sama sekali.
    // Stiker sengaja tidak dihitung: dia memang tidak pernah diunduh, dan
    // memberitahu orang bahwa stikernya tidak terbaca cuma bikin bingung.
    lampiranMasalah:
      extracted.isMedia && extracted.mediaType !== "sticker" && !media
        ? terlaluPanjang
          ? "panjang"
          : "besar"
        : undefined,
  });
}

// ─── Kirim pesan ──────────────────────────────────────────────────────────────

/**
 * Nama berkas yang dilihat pelanggan di WhatsApp.
 *
 * Nama di disk sengaja acak (UUID) supaya dua orang yang mengunggah
 * "katalog.pdf" tidak saling menimpa. Tapi untuk dokumen, WhatsApp menampilkan
 * NAMA BERKAS besar-besar dan keterangannya kecil di bawah, jadi yang sampai ke
 * pelanggan dulu adalah "3592a0d8-75d4-43a5-9ff9-925439720ffc.pdf". Kelihatan
 * seperti berkas nyasar, dan orang ragu membuka lampiran yang namanya begitu.
 *
 * Jadi nama di disk tetap acak, tapi yang dikirim memakai judul yang diketik
 * pemilik toko. Akhirannya diambil dari berkas aslinya, bukan dari judul,
 * karena judul bisa saja mengandung titik.
 */
export function namaTampilan(judul: string, fileName: string): string {
  const ext = path.extname(fileName) || "";
  const bersih = judul
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    // Karakter yang dilarang sebagai nama berkas di Windows dan Android.
    // Tanda hubung sengaja dibiarkan, itu sah dan sering dipakai di judul.
    .replace(/[\\/:*?"<>|]/g, " ")
    // Karakter kendali ikut dibuang; ini bisa masuk lewat tempel-salin.
    .replace(/[\u0000-\u001f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60)
    .replace(/[. ]+$/, "");

  return bersih ? `${bersih}${ext}` : path.basename(fileName);
}

/**
 * Kirim gambar, video, atau berkas milik bisnis ke pelanggan.
 *
 * Lewat jalur QR ini tidak ada biaya tambahan per lampiran, jadi mengirim foto
 * produk tidak menaikkan ongkos sama sekali.
 */
export async function sendAssets(
  sock: WASocket,
  jid: string,
  berkas: { fileName: string; mimeType: string; kind: string; name: string }[],
): Promise<void> {
  for (const b of berkas) {
    const lokasi = path.join(env.MEDIA_DIR, path.basename(b.fileName));
    if (!fs.existsSync(lokasi)) {
      log.warn(`berkas "${b.name}" tidak ada di disk, dilewati`);
      continue;
    }

    try {
      const isi = fs.readFileSync(lokasi);
      if (b.kind === "image") {
        await sock.sendMessage(jid, { image: isi, caption: b.name });
      } else if (b.kind === "video") {
        await sock.sendMessage(jid, { video: isi, caption: b.name });
      } else {
        await sock.sendMessage(jid, {
          document: isi,
          mimetype: b.mimeType,
          fileName: namaTampilan(b.name, b.fileName),
          caption: b.name,
        });
      }
      log.info(`berkas "${b.name}" dikirim ke ${jid}`);
    } catch (err) {
      log.error(
        `gagal kirim berkas "${b.name}": ${err instanceof Error ? err.message : err}`,
      );
    }
  }
}

/** Kirim beberapa bubble dengan indikator "mengetik" supaya terasa natural. */
export async function sendBubbles(
  sock: WASocket,
  jid: string,
  bubbles: string[],
  typingSpeedMs = 25,
  /**
   * Nomor pengirimnya. Dipakai menunggu pengakuan server WhatsApp, dan itu
   * satu-satunya cara membedakan nomor yang sehat dari nomor yang dibatasi.
   * Boleh kosong untuk pemanggil yang memang tidak punya channel.
   */
  channelId?: string,
): Promise<void> {
  for (const text of bubbles) {
    if (!text.trim()) continue;
    const delay = Math.min(
      MAX_TYPING_MS,
      Math.max(MIN_TYPING_MS, text.length * typingSpeedMs),
    );
    try {
      await sock.presenceSubscribe(jid);
      await sock.sendPresenceUpdate("composing", jid);
      await sleep(delay);
      await sock.sendPresenceUpdate("paused", jid);
      const hasil = await sock.sendMessage(jid, { text });
      // Dicatat SELALU, bukan cuma waktu ada galat.
      //
      // 10 Agustus 2026: empat balasan "terkirim" tanpa satu pun galat dan
      // tidak satu pun sampai. Yang bikin itu makan waktu berjam-jam adalah
      // tidak ada catatan apa pun soal ke alamat mana pesannya pergi dan apa
      // jawaban WhatsApp. Satu baris ini yang membedakan "kita tahu" dari
      // "kita menebak", dan ongkosnya satu baris log per balasan.
      log.info(
        `kirim ke ${jid}: id=${hasil?.key?.id ?? "?"} status=${hasil?.status ?? "?"}`,
      );
      if (channelId) tungguAck(channelId, hasil?.key?.id, jid);
    } catch (err) {
      log.error(`gagal kirim pesan ke ${jid}: ${err instanceof Error ? err.message : err}`);
      throw err;
    }
  }
}

/** Dipakai inbox (balas manual) & follow-up otomatis. */
export async function sendToConversation(
  conversationId: string,
  bubbles: string[],
): Promise<{ ok: boolean; error?: string }> {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: { contact: true, channel: true },
  });
  if (!conversation) return { ok: false, error: "Obrolannya tidak ketemu" };
  if (!conversation.channelId) {
    return { ok: false, error: "Ini obrolan di ruang coba, bukan WhatsApp beneran" };
  }

  const session = sessions.get(conversation.channelId);
  if (!session?.sock || session.status !== "connected") {
    return { ok: false, error: "Nomor WhatsApp-nya lagi tidak nyambung" };
  }
  // Nomor asli yang menang, LID cuma cadangan. Jalur ini dipakai balasan manual
  // dari kotak masuk DAN semua sapaan otomatis, jadi sebelum diperbaiki
  // dua-duanya melaporkan "terkirim" untuk pesan yang tidak pernah sampai.
  const tujuan = alamatKirim(
    conversation.contact.waJid,
    conversation.contact.phone,
  );
  if (!tujuan) {
    return { ok: false, error: "Pelanggan ini tidak punya nomor WhatsApp" };
  }

  try {
    await sendBubbles(session.sock, tujuan, bubbles, 25, conversation.channelId);

    // Mengirim sesuatu berarti obrolannya hidup lagi.
    //
    // Sapaan setelah pembelian dan pengingat janji temu sengaja tidak menyaring
    // status, karena pengingat tetap harus sampai walau obrolannya sudah
    // ditandai beres. Tapi kalau statusnya dibiarkan, pesannya terkirim ke utas
    // yang tersembunyi dari daftar: pelanggannya menerima sapaan, pemilik
    // usahanya tidak melihat apa pun, dan jawabannya nanti masuk ke utas yang
    // tidak pernah dia buka. Yang mengirim harus ikut memunculkannya kembali.
    if (conversation.status !== "open") {
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { status: "open" },
      });
      bus.publish({
        type: "conversation",
        workspaceId: conversation.workspaceId,
        conversationId: conversation.id,
      });
    }

    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export function isChannelConnected(channelId: string): boolean {
  return sessions.get(channelId)?.status === "connected";
}

/**
 * Kirim pesan ke nomor toko ITU SENDIRI, jadi muncul di WhatsApp pemiliknya.
 *
 * Dipakai untuk kabar yang harus sampai hari itu juga: jatah habis, dan
 * langganan yang mau atau sudah habis. Kelebihannya dibanding email besar:
 * pemilik toko membaca WhatsApp sepanjang hari, dan kita tidak perlu tahu nomor
 * pribadinya sama sekali.
 *
 * Sengaja MENGEMBALIKAN false, bukan melempar galat. Nomor yang sedang tidak
 * tersambung itu keadaan normal, bukan kerusakan, dan pemanggilnya perlu tahu
 * bedanya supaya tidak mencap "sudah diberitahu" untuk pesan yang tidak pernah
 * terkirim.
 */
export async function kirimKeNomorToko(
  workspaceId: string,
  teks: string,
): Promise<boolean> {
  const channel = await prisma.channel.findFirst({
    where: { workspaceId, status: "connected", phoneNumber: { not: null } },
    orderBy: { createdAt: "asc" },
  });
  if (!channel?.phoneNumber) return false;

  const session = sessions.get(channel.id);
  if (!session?.sock || session.status !== "connected") return false;

  // Nomor sendiri, tanpa tanda plus. Ini bukan LID: yang disimpan di
  // phoneNumber memang nomor telepon, dan chat ke diri sendiri memakai jid
  // biasa.
  const jid = channel.phoneNumber.replace(/^\+/, "").replace(/\D/g, "") + "@s.whatsapp.net";

  try {
    await session.sock.sendMessage(jid, { text: teks });
    return true;
  } catch (err) {
    log.warn(
      `gagal kirim kabar ke nomor toko ${workspaceId}: ${err instanceof Error ? err.message : err}`,
    );
    return false;
  }
}
