import type { proto } from "baileys";

export interface ExtractedMessage {
  text: string;
  mediaType: "text" | "image" | "audio" | "video" | "document" | "sticker";
  mimeType: string | null;
  isMedia: boolean;
  /**
   * Ukuran yang DIAKUI pengirim, dari fileLength di pesannya. Null kalau tidak
   * disebutkan.
   *
   * Gunanya menolak berkas raksasa sebelum diunduh, bukan sesudah. Angkanya
   * datang dari luar jadi bisa saja bohong, dan karena itu pemeriksaan setelah
   * unduh tetap dipertahankan. Tapi yang realistis di lapangan bukan orang yang
   * memalsukan angka, melainkan orang yang mengirim video 200 MB dari HP-nya,
   * dan yang itu tertangkap di sini tanpa satu byte pun masuk memori.
   */
  ukuranBytes: number | null;
  /**
   * Lama suara atau video dalam detik, dari pesannya sendiri. Null untuk yang
   * memang tidak punya durasi (foto, dokumen, stiker).
   *
   * Ukuran berkas TIDAK bisa menggantikan ini. Voice note WhatsApp itu Opus
   * sekitar 8 sampai 16 kbps, jadi 12 MB yang lolos batas ukuran masih muat dua
   * sampai tiga jam suara dalam satu pesan. Yang dibayar ke penyedia AI
   * dihitung per detik audio, bukan per byte, jadi batas byte sama sekali tidak
   * menjaga sisi itu.
   */
  durasiDetik: number | null;
}

/** Durasi datang dari luar, jadi yang tidak masuk akal dianggap tidak diketahui. */
function bacaDurasi(nilai: unknown): number | null {
  const n = typeof nilai === "number" ? nilai : Number(nilai);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

/**
 * fileLength bisa berupa angka, teks, atau objek Long dari protobuf. Yang tidak
 * terbaca dianggap tidak diketahui, bukan nol, supaya berkas tanpa keterangan
 * ukuran tidak lolos hanya karena angkanya gagal dibaca.
 */
function bacaUkuran(nilai: unknown): number | null {
  if (nilai === null || nilai === undefined) return null;
  if (typeof nilai === "number") return Number.isFinite(nilai) ? nilai : null;
  if (typeof nilai === "string") {
    const n = Number(nilai);
    return Number.isFinite(n) ? n : null;
  }
  // Objek Long: { low, high, unsigned }
  const long = nilai as { low?: number; high?: number };
  if (typeof long.low === "number" && typeof long.high === "number") {
    return long.high * 4294967296 + (long.low >>> 0);
  }
  return null;
}

/** Buka lapisan ephemeral / viewOnce supaya isinya bisa dibaca. */
export function unwrap(message: proto.IMessage | null | undefined): proto.IMessage | null {
  let m = message ?? null;
  for (let i = 0; i < 4 && m; i++) {
    if (m.ephemeralMessage?.message) m = m.ephemeralMessage.message;
    else if (m.viewOnceMessage?.message) m = m.viewOnceMessage.message;
    else if (m.viewOnceMessageV2?.message) m = m.viewOnceMessageV2.message;
    else if (m.documentWithCaptionMessage?.message) m = m.documentWithCaptionMessage.message;
    else break;
  }
  return m;
}

export function extractMessage(raw: proto.IMessage | null | undefined): ExtractedMessage {
  const m = unwrap(raw);
  const empty: ExtractedMessage = {
    text: "",
    mediaType: "text",
    mimeType: null,
    isMedia: false,
    ukuranBytes: null,
    durasiDetik: null,
  };
  if (!m) return empty;

  if (m.conversation) return { ...empty, text: m.conversation };

  if (m.extendedTextMessage?.text) {
    return { ...empty, text: m.extendedTextMessage.text };
  }

  if (m.imageMessage) {
    return {
      text: m.imageMessage.caption ?? "",
      mediaType: "image",
      mimeType: m.imageMessage.mimetype ?? "image/jpeg",
      isMedia: true,
      ukuranBytes: bacaUkuran(m.imageMessage.fileLength),
      durasiDetik: null,
    };
  }

  if (m.audioMessage) {
    return {
      text: "",
      mediaType: "audio",
      mimeType: m.audioMessage.mimetype ?? "audio/ogg",
      isMedia: true,
      ukuranBytes: bacaUkuran(m.audioMessage.fileLength),
      durasiDetik: bacaDurasi(m.audioMessage.seconds),
    };
  }

  if (m.videoMessage) {
    return {
      text: m.videoMessage.caption ?? "",
      mediaType: "video",
      mimeType: m.videoMessage.mimetype ?? "video/mp4",
      isMedia: true,
      ukuranBytes: bacaUkuran(m.videoMessage.fileLength),
      durasiDetik: bacaDurasi(m.videoMessage.seconds),
    };
  }

  if (m.documentMessage) {
    return {
      text: m.documentMessage.caption ?? m.documentMessage.fileName ?? "",
      mediaType: "document",
      mimeType: m.documentMessage.mimetype ?? "application/octet-stream",
      isMedia: true,
      ukuranBytes: bacaUkuran(m.documentMessage.fileLength),
      durasiDetik: null,
    };
  }

  if (m.stickerMessage) {
    return {
      text: "",
      mediaType: "sticker",
      mimeType: "image/webp",
      isMedia: true,
      // Stiker tidak pernah diunduh, jadi ukurannya tidak dipakai siapa pun.
      ukuranBytes: null,
      durasiDetik: null,
    };
  }

  // Balasan tombol / list
  const buttonReply =
    m.buttonsResponseMessage?.selectedDisplayText ??
    m.listResponseMessage?.title ??
    m.templateButtonReplyMessage?.selectedDisplayText;
  if (buttonReply) return { ...empty, text: buttonReply };

  if (m.locationMessage) {
    const { degreesLatitude: lat, degreesLongitude: lng } = m.locationMessage;
    return { ...empty, text: `[lokasi] ${lat}, ${lng}` };
  }

  if (m.contactMessage?.displayName) {
    return { ...empty, text: `[kontak] ${m.contactMessage.displayName}` };
  }

  return empty;
}

const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "audio/ogg": "ogg",
  "audio/ogg; codecs=opus": "ogg",
  "audio/mpeg": "mp3",
  "audio/mp4": "m4a",
  "video/mp4": "mp4",
  "application/pdf": "pdf",
};

export function extensionFor(mime: string | null): string {
  if (!mime) return "bin";
  return EXT[mime] ?? EXT[mime.split(";")[0].trim()] ?? "bin";
}

/**
 * WhatsApp mengirim voice note sebagai "audio/ogg; codecs=opus".
 * Gemini menerimanya, tapi lebih aman dinormalkan.
 */
export function normalizeMime(mime: string | null): string {
  if (!mime) return "application/octet-stream";
  return mime.split(";")[0].trim();
}
