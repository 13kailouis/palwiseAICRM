import {
  HANYA_PELANGGAN_ASLI,
  bolehPakai,
  parseJsonArray,
  prisma,
  stringifyJson,
  type Agent,
  type Contact,
  type Conversation,
} from "@palwise/db";
import {
  bolehPindahTahap,
  generateReply,
  namaAsisten,
  type AgentReply,
} from "../ai/agent.js";
import { aiMayReplyNow } from "./officeHours.js";
import {
  ambilJatahRuangCoba,
  kembalikanJatahRuangCoba,
  kembalikanKredit,
  pesanJatahRuangCoba,
  pesanKredit,
} from "./quota.js";
import { bus } from "../lib/bus.js";
import { log } from "../lib/log.js";

/**
 * Seberapa jauh AI mengingat percakapan.
 *
 * Dulu angkanya 16 BARIS, dan itu jauh lebih pendek daripada kelihatannya.
 * Satu giliran AI dipecah jadi beberapa bubble, dan tiap bubble satu baris
 * sendiri, jadi rata-rata 2,7 baris per giliran. Enam belas baris berarti cuma
 * sekitar empat tanya-jawab.
 *
 * Akibatnya nyata (2026-08-02): customer menjawab pertanyaan di baris ke-5,
 * lalu di baris ke-50 AI menanyakan hal yang persis sama. Waktu customer
 * protes, AI minta maaf lalu mengulang pertanyaan itu lagi.
 *
 * Sekarang dihitung per GILIRAN CUSTOMER, jadi jumlah bubble tidak lagi
 * memakan ingatan. Batas barisnya tetap ada sebagai pagar biaya: percakapan
 * yang sangat panjang berhenti di situ, dan sisanya ditopang tag CRM yang
 * ikut dibacakan ke model di tiap giliran.
 */
const GILIRAN_DIINGAT = 12;
const MAKS_BARIS_RIWAYAT = 60;

/**
 * Rem kecepatan: berapa giliran AI yang wajar dalam satu rentang waktu.
 *
 * Kejadian nyata 2026-08-05: dua nomor Palwise diarahkan ke satu sama lain
 * untuk diuji, dan keduanya saling membalas basa-basi tanpa henti. Belasan
 * giliran habis dalam dua menit. Tidak ada satu pun bagian sistem yang
 * menghentikannya, karena memang tidak pernah ada yang menghitung.
 *
 * Untuk paket gratis yang jatahnya cuma sepuluhan obrolan, obrolan seperti itu
 * menghabiskan jatah sebulan penuh dalam belasan menit.
 *
 * Angkanya sengaja longgar. Pelanggan sungguhan yang sedang buru-buru memang
 * bisa mengirim banyak pesan beruntun, dan mendiamkan dia jauh lebih merugikan
 * daripada membayar beberapa balasan ekstra. Yang mau ditangkap di sini bukan
 * orang yang cerewet, tapi percakapan yang jelas-jelas tidak dikendalikan
 * manusia.
 */
const MAKS_GILIRAN_AI = 15;
const JENDELA_GILIRAN_MENIT = 10;

/**
 * Berapa lama asisten diam menunggu manusia sesudah dia minta bantuan.
 *
 * Angkanya kompromi antara dua kerugian yang tidak setara. Kalau terlalu
 * pendek, asisten menyahut lebih dulu daripada pemiliknya yang sebentar lagi
 * masuk, dan itu cuma membingungkan sebentar. Kalau terlalu panjang, pelanggan
 * yang bertanya hal baru tidak dijawab sama sekali, dan itu pelanggan hilang.
 *
 * Yang memakai Palwise pemilik warung, klinik, dan bengkel yang memegang HP
 * sendiri, bukan tim jaga bergantian. Eskalasi jam sembilan malam realistis
 * baru dilihat besok pagi. Tiga jam memberi kesempatan yang masuk akal tanpa
 * membiarkan orang menunggu semalaman tanpa satu pun jawaban.
 */
const JEDA_ESKALASI_JAM = 3;

/**
 * Kalimat penenang untuk pelanggan yang mengirim pesan selagi eskalasinya
 * masih menggantung. Sengaja tidak menjanjikan waktu.
 */
export const PESAN_ESKALASI =
  "Pesan kakak sudah masuk ya, dan tim kami sudah dikabari. Mohon ditunggu sebentar 🙏";

/**
 * Berapa giliran AI yang terjadi sejak sebuah waktu.
 *
 * Yang dihitung GILIRAN, bukan baris. Satu giliran bisa jadi beberapa bubble,
 * dan tiap bubble tersimpan sebagai baris sendiri, jadi menghitung baris
 * melebih-lebihkan sampai tiga kali lipat lalu mengerem obrolan yang wajar.
 *
 * Masukannya urut TERBARU DULUAN, sama seperti yang keluar dari kueri riwayat.
 */
export function giliranAiSejak(
  pesan: { role: string; createdAt: Date }[],
  sejak: Date,
): number {
  const dalam = pesan.filter((m) => m.createdAt.getTime() >= sejak.getTime());

  let jumlah = 0;
  let sebelumnyaAi = false;
  // Dibaca dari yang paling lama supaya rentetan bubble yang berurutan
  // terhitung sebagai satu giliran, bukan satu per bubble.
  for (let i = dalam.length - 1; i >= 0; i--) {
    const ai = dalam[i].role === "ai";
    if (ai && !sebelumnyaAi) jumlah++;
    sebelumnyaAi = ai;
  }
  return jumlah;
}

/**
 * Bentuk banding sebuah kalimat: huruf dan angkanya saja.
 *
 * Emoji, tanda baca, besar kecil huruf, dan spasi ganda dibuang. Dua kalimat
 * yang cuma beda emoji tetap kalimat yang sama untuk yang membacanya.
 */
export function bentukBanding(teks: string): string {
  return (teks ?? "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

/**
 * Panjang minimal sebuah kalimat sebelum pengulangannya dianggap salah.
 *
 * Balasan pendek seperti "baik kak" atau "siap kak" memang wajar diulang
 * berkali-kali dalam satu obrolan, dan membuangnya justru bikin asisten
 * kelihatan mengabaikan orang. Yang tidak wajar itu kalimat panjang yang
 * kembali persis sama.
 */
const PANJANG_MINIMAL_ULANGAN = 25;

/** Berapa pesan AI terakhir yang dipakai membandingkan. */
const ULANGAN_DILIHAT = 10;

/**
 * Buang kalimat yang sama persis dengan yang sudah pernah dikirim.
 *
 * Kejadian nyata 2026-08-05: satu obrolan menerima kalimat "Ada lagi yang bisa
 * Sari bantu hari ini untuk campaign Wefluence atau hal lainnya?" tiga kali
 * persis sama, dan "Sama-sama, Kak Kai! Senang sekali bisa terus mendampingi
 * Kakak." juga tiga kali. Dari sisi penerima itu tidak terbaca sebagai ramah,
 * itu terbaca sebagai spam dari nomor yang rusak.
 *
 * Sengaja cuma kecocokan PERSIS, bukan kemiripan. Sempat dicoba mengukur
 * kemiripan kata, dan "Baik kak, saya cek dulu ya" dengan "Baik kak, saya kirim
 * dulu ya" ikut terjaring padahal artinya jauh berbeda. Membuang balasan yang
 * benar jauh lebih merugikan daripada meloloskan satu kalimat mirip.
 *
 * DUA LAPIS, dan pemanggilnya yang menentukan lapis kedua.
 *
 * Pengulangan DI DALAM satu giliran selalu dibuang, tanpa syarat: model kadang
 * menaruh kalimat yang sama di dua bubble sekaligus, dan itu tidak pernah benar.
 *
 * Pengulangan terhadap RIWAYAT cuma boleh diperiksa kalau pelanggan memang tidak
 * membawa apa-apa yang baru. Kalau dia bertanya ulang, dia berhak mendapat
 * jawaban yang sama lagi, dan mendiamkannya jauh lebih merugikan daripada satu
 * kalimat yang terkirim dua kali. Karena itu `pernahDikirim` dikosongkan oleh
 * pemanggil begitu pesan terakhirnya membawa isi. Ini bukan detail kecil:
 * tanpa syarat itu, pelanggan yang menanyakan harga dua kali akan didiamkan
 * pada pertanyaan keduanya.
 */
export function buangUlangan(bubbles: string[], pernahDikirim: string[]): string[] {
  const sudah = new Set(
    pernahDikirim
      .map(bentukBanding)
      .filter((t) => t.length >= PANJANG_MINIMAL_ULANGAN),
  );

  const hasil: string[] = [];
  for (const b of bubbles) {
    const kunci = bentukBanding(b);
    if (kunci.length >= PANJANG_MINIMAL_ULANGAN) {
      if (sudah.has(kunci)) continue;
      sudah.add(kunci);
    }
    hasil.push(b);
  }
  return hasil;
}

/**
 * Kata yang cuma berfungsi sebagai basa-basi.
 *
 * Sengaja tidak berisi satu pun kata yang membawa maksud: tidak ada nama
 * barang, tidak ada kata kerja transaksi, tidak ada kata tanya. Kalau sebuah
 * pesan hampir seluruhnya tersusun dari daftar ini, dia memang tidak menanyakan
 * apa-apa.
 */
const KATA_BASA_BASI = new Set([
  "a", "aamiin", "aja", "amiin", "amin", "anda", "atas", "baik", "banyak",
  "bapak", "berbagi", "berjalan", "berkah", "bu", "bye", "cerita", "dan",
  "dari", "day", "deh", "di", "doa", "dong", "dukungan", "dukungannya", "good",
  "great", "hangat", "hari", "have", "hormat", "ibu", "ini", "iya", "jaya",
  "juga", "jumpa", "kak", "kakak", "kami", "kamu", "kasih", "ke", "kepada",
  "kesempatan", "keren", "kita", "kok", "lagi", "lain", "lancar", "makasih",
  "mantap", "mas", "mbak", "mengobrol", "menyenangkan", "nice", "ngobrol",
  "noted", "nya", "obrolan", "oke", "okee", "ok", "pak", "pengertian",
  "pengertiannya", "saja", "salam", "sama", "sampai", "saya", "segala", "sehat",
  "sekali", "selalu", "seluruh", "semangat", "semoga", "semuanya", "senang",
  "senangnya", "siap", "siapp", "sip", "sipp", "sukses", "terima", "terus",
  "thank", "thanks", "tim", "to", "untuk", "waktu", "wah", "wonderful", "ya",
  "yaa", "yang", "you",
]);

/**
 * Kata yang benar-benar menandai perpisahan atau ucapan terima kasih.
 *
 * Daftar di atas sebagian besar cuma kata sambung dan sapaan. Tanpa syarat
 * kedua ini, pesan pendek yang isinya kebetulan kata sambung semua ikut
 * terjaring, misalnya "ke saya ya".
 *
 * Kata pembuka SENGAJA tidak ada di sini dan tidak di daftar atas: "halo",
 * "hai", "selamat pagi". Itu tanda orang MEMULAI, bukan mengakhiri, dan
 * mendiamkannya berarti mendiamkan pelanggan yang baru datang. Ketahuan waktu
 * "halo lagi" ikut dianggap salam penutup.
 */
const INTI_SALAM = new Set([
  "aamiin", "amiin", "amin", "bye", "day", "hormat", "jumpa", "kasih",
  "makasih", "salam", "sama", "semoga", "sukses", "terima", "thank", "thanks",
]);

/**
 * Pesan yang isinya cuma sopan santun, tanpa maksud apa pun.
 *
 * Dipakai untuk mengenali obrolan yang sebenarnya sudah selesai tapi terus
 * berjalan karena kedua belah pihak sama-sama sopan. Sengaja dibuat pelit:
 * satu tanda tanya, satu angka, atau satu kata bermakna sudah cukup untuk
 * membuatnya menjawab false. Salah mendiamkan pelanggan sungguhan jauh lebih
 * mahal daripada satu balasan basa-basi yang terlanjur terkirim.
 *
 * Kata yang membawa arti sengaja TIDAK didaftar, termasuk yang kelihatan
 * sepele seperti "sudah", "bisa", "ada", dan "kabar". Semuanya muncul di
 * kalimat yang menunggu jawaban: "sudah dikirim", "bisa hari ini", "ada
 * stoknya", "ada kabar". Waktu "sudah" dan "bisa" sempat masuk daftar,
 * balasan "Sudah bisa dijawab kak" ikut dianggap basa-basi.
 */
export function cumaBasaBasi(teks: string): boolean {
  const bersih = (teks ?? "")
    .toLowerCase()
    // Emoji dan simbol dibuang, tanda baca yang membawa arti dipertahankan.
    .replace(/[^\p{L}\p{N}\s?!.,]/gu, " ")
    .trim();

  if (!bersih) return false;

  // Tawaran penutup dikupas dulu, baru sisanya dinilai.
  //
  // Ini yang membuat rem basa-basi tidak pernah bunyi di obrolan 2026-08-05.
  // Asisten mengakhiri hampir tiap giliran dengan "Ada lagi yang bisa Sari
  // bantu hari ini?", dan karena kalimat itu berisi tanda tanya, seluruh
  // gilirannya dinilai sebagai pertanyaan sungguhan. Padahal itu bukan
  // pertanyaan, itu formula perpisahan yang kebetulan berbentuk tanya, dan
  // justru dialah yang memaksa lawan bicara membalas lagi.
  const tanpaTawaran = bersih
    .replace(
      /\bada\s+(?:lagi\s+)?(?:hal\s+lain\s+)?(?:yang\s+)?(?:bisa|boleh|mau|ingin)\b[^?]{0,40}\b(?:bantu|dibantu|ditanyakan|tanyakan)\b[^?]{0,80}\?/g,
      " ",
    )
    .replace(
      /\bjangan\s+(?:sungkan|ragu)\b[^.!?]{0,80}[.!?]?/g,
      " ",
    )
    // Bentuk PERNYATAAN dari tawaran yang sama, tanpa tanda tanya: "Kalau nanti
    // ada yang ingin ditanyakan lagi, langsung kabari Sari saja ya."
    //
    // Ini kelewat di percobaan 2026-08-05 karena dua pola di atas dua-duanya
    // menuntut tanda tanya. Akibatnya giliran asisten tidak pernah dinilai
    // basa-basi, jadi rem obrolan-selesai tidak pernah bunyi walau kedua belah
    // pihak jelas sudah berpamitan.
    //
    // Syaratnya sengaja dua-duanya: pembuka pengandaian DAN kata menolong.
    // Kalimat bermakna seperti "Kalau bayar hari ini saya bantu proses" memang
    // ikut terkupas, dan itu diterima: rem ini baru bunyi kalau SISI LAWAN juga
    // cuma basa-basi, jadi paling buruk satu "ok" tidak dibalas.
    .replace(
      /\b(?:kalau|jika|bila)\b[^.!?]{0,120}?\b(?:ditanyakan|ditanya|dibantu|bantu|kabari|hubungi|menghubungi)\b[^.!?]{0,80}[.!?]?/g,
      " ",
    )
    .replace(/\s+/g, " ")
    .trim();

  // Isinya memang cuma formula perpisahan, tidak ada yang tersisa.
  if (!tanpaTawaran) return true;

  return nilaiBasaBasi(tanpaTawaran);
}

/** Bagian penilaian, dipisah supaya pengupasan di atas terbaca jelas. */
function nilaiBasaBasi(bersih: string): boolean {
  // Bertanya berarti menunggu jawaban, apa pun kata-katanya.
  if (bersih.includes("?")) return false;
  // Angka hampir selalu berarti harga, jumlah, tanggal, atau jam.
  if (/\d/.test(bersih)) return false;

  const kata = bersih.replace(/[?!.,]/g, " ").split(/\s+/).filter(Boolean);
  // Di bawah tiga kata terlalu sedikit untuk disimpulkan, dan paragraf panjang
  // hampir pasti membawa isi.
  if (kata.length < 3 || kata.length > 24) return false;

  // Harus benar-benar ada ucapan terima kasih atau perpisahan di dalamnya.
  if (!kata.some((k) => INTI_SALAM.has(k))) return false;

  const cocok = kata.filter((k) => KATA_BASA_BASI.has(k)).length;
  // Sisanya ditoleransi untuk nama orang dan nama usaha, yang memang selalu
  // muncul di kalimat perpisahan dan tidak mungkin didaftar di sini.
  return cocok / kata.length >= 0.75;
}

/**
 * Kata yang cuma berarti "saya sudah baca".
 *
 * Beda dari daftar basa-basi: yang ini tidak mengandung ucapan terima kasih
 * atau perpisahan sama sekali, cuma tanda terima. Karena itu dia dinilai lewat
 * jalur sendiri, tanpa syarat panjang minimal dan tanpa syarat kata inti.
 */
const KATA_MENGIYAKAN = new Set([
  "baik", "betul", "deal", "done", "iya", "iyaa", "iyap", "kak", "kakak",
  "mantap", "noted", "ok", "okay", "oke", "okee", "okey", "oke2", "setuju",
  "siap", "siapp", "sip", "sipp", "siip", "wokeh", "ya", "yaa", "yes", "yoi",
  "yup",
]);

/**
 * Pesan yang cuma mengiyakan, tanpa maksud apa pun.
 *
 * Dipisah dari [cumaBasaBasi] karena syaratnya berbeda dan syarat di sana
 * justru menutupinya: basa-basi menuntut minimal tiga kata DAN satu kata inti
 * perpisahan, sedangkan "ok" cuma satu kata dan tidak mengandung salam apa pun.
 *
 * Lubang itu nyata. Percobaan 2026-08-05: pelanggan membalas "ok" berkali-kali,
 * dan tiap "ok" dinilai membawa isi, jadi penyaring kalimat berulang tidak
 * pernah membandingkan riwayat dan asisten mengirim dua bubble yang sama persis
 * berulang-ulang. Satu kata pendek mengalahkan seluruh rangkaian rem.
 */
export function sekadarMengiyakan(teks: string): boolean {
  const asli = (teks ?? "").trim();
  if (!asli) return false;

  const bersih = asli
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s?!.,]/gu, " ")
    .replace(/[?!.,]/g, " ")
    .trim();

  // Habis dibersihkan tidak ada hurufnya sama sekali, berarti isinya cuma
  // emoji. Jempol atau tepuk tangan sendirian juga cuma tanda terima.
  if (!bersih) return true;

  if (asli.includes("?")) return false;
  if (/\d/.test(bersih)) return false;

  const kata = bersih.split(/\s+/).filter(Boolean);
  // Lebih dari tiga kata hampir pasti sudah membawa maksud.
  if (kata.length > 3) return false;

  return kata.every((k) => KATA_MENGIYAKAN.has(k));
}

/**
 * Pesan yang tidak menuntut jawaban apa pun.
 *
 * Satu pintu untuk dua bentuk yang berbeda: salam penutup yang panjang dan
 * tanda terima yang pendek. Dipakai di dua tempat yang harus sepakat, yaitu
 * penilaian obrolan-sudah-habis dan keputusan membandingkan riwayat pada
 * penyaring kalimat berulang.
 */
export function tanpaIsi(teks: string): boolean {
  return cumaBasaBasi(teks) || sekadarMengiyakan(teks);
}

/**
 * Apakah obrolannya sudah benar-benar habis.
 *
 * Syaratnya dua sisi sekaligus: giliran pelanggan yang terakhir DAN giliran AI
 * tepat sebelumnya sama-sama cuma basa-basi. Satu sisi saja tidak cukup.
 * Pelanggan yang bilang "makasih kak" sesudah dijawab sungguhan tetap pantas
 * dibalas sekali; yang tidak pantas itu putaran kedua, waktu kedua belah pihak
 * cuma saling mendoakan.
 *
 * Masukannya urut TERBARU DULUAN.
 */
export function obrolanSudahHabis(
  pesan: { role: string; content: string; mediaType?: string }[],
): boolean {
  // Sengaja tidak mengunci siapa yang bicara terakhir.
  //
  // Dua tempat memakai fungsi ini, dan urutannya kebalikan. Waktu pesan masuk,
  // baris terbaru selalu milik pelanggan, karena barusan disimpan. Waktu
  // penjadwal sapaan otomatis memeriksa, baris terbaru justru milik asisten,
  // karena dialah yang menutup obrolannya. Versi pertama fungsi ini cuma
  // mengenali urutan yang pertama, jadi penjadwal tetap membangunkan obrolan
  // yang sudah selesai dengan salam.
  const ambilGiliran = (mulai: number) => {
    if (mulai >= pesan.length) return null;
    const peran = pesan[mulai].role;
    // Baris "human" berarti pemiliknya sudah masuk sendiri, dan "system" bukan
    // ucapan siapa pun. Dua-duanya bukan giliran yang boleh dinilai.
    if (peran !== "ai" && peran !== "customer") return null;

    const isi: typeof pesan = [];
    let i = mulai;
    while (i < pesan.length && pesan[i].role === peran) {
      isi.push(pesan[i]);
      i++;
    }
    return { isi, lanjut: i };
  };

  const terakhir = ambilGiliran(0);
  if (!terakhir) return false;

  // Belum ada giliran sebelumnya berarti ini masih awal obrolan.
  const sebelumnya = ambilGiliran(terakhir.lanjut);
  if (!sebelumnya) return false;

  return [...terakhir.isi, ...sebelumnya.isi].every(
    (m) => (m.mediaType ?? "text") === "text" && tanpaIsi(m.content),
  );
}

/** Berapa baris terakhir yang cukup untuk menilai sebuah obrolan sudah ditutup. */
const BARIS_PENUTUP_DIPERIKSA = 12;

/**
 * Versi [obrolanSudahHabis] yang membaca sendiri dari database.
 *
 * Dipakai penjadwal sapaan otomatis, yang cuma pegang id obrolan.
 */
export async function obrolanDitutupDenganSalam(
  conversationId: string,
): Promise<boolean> {
  const pesan = await prisma.message.findMany({
    // Catatan sistem disaring di kueri. Kalau ikut terbawa, dia jadi baris
    // terbaru dan menutupi giliran asisten di bawahnya, jadi obrolan yang
    // sudah pamit baik-baik terbaca seperti belum selesai lalu disapa lagi.
    where: { conversationId, role: { not: "system" } },
    orderBy: { createdAt: "desc" },
    take: BARIS_PENUTUP_DIPERIKSA,
    select: { role: true, content: true, mediaType: true },
  });
  return obrolanSudahHabis(pesan);
}

export interface IncomingMedia {
  mimeType: string;
  /** base64 tanpa prefix */
  data: string;
  /** path relatif di folder media, untuk ditampilkan di inbox */
  storedPath?: string;
}

// ─── Kontak & percakapan ──────────────────────────────────────────────────────

export async function getOrCreateContact(params: {
  workspaceId: string;
  waJid: string;
  /** Nomor asli, kalau berhasil diketahui. Jangan diisi tebakan. */
  phone?: string | null;
  pushName?: string;
}): Promise<Contact> {
  const { workspaceId, waJid, pushName } = params;
  const phone = params.phone ?? jidToPhone(waJid);

  let existing = await prisma.contact.findUnique({
    where: { workspaceId_waJid: { workspaceId, waJid } },
  });

  // Orang yang sama bisa datang dengan alamat berbeda: kadang nomor telepon,
  // kadang LID. Kalau nomornya cocok, pakai kontak yang sudah ada supaya
  // riwayatnya tidak terpecah jadi dua.
  if (!existing && phone) {
    existing = await prisma.contact.findFirst({
      where: { workspaceId, phone },
    });
    if (existing && existing.waJid !== waJid) {
      existing = await prisma.contact.update({
        where: { id: existing.id },
        data: { waJid },
      });
    }
  }

  if (existing) {
    const perubahan: Record<string, unknown> = {};
    if (pushName && existing.waPushName !== pushName) perubahan.waPushName = pushName;
    // Nomor baru ketahuan belakangan (misalnya awalnya cuma kenal LID-nya).
    if (phone && existing.phone !== phone) perubahan.phone = phone;

    if (Object.keys(perubahan).length > 0) {
      return prisma.contact.update({ where: { id: existing.id }, data: perubahan });
    }
    return existing;
  }

  return prisma.contact.create({
    data: {
      workspaceId,
      waJid,
      phone,
      // `name` sengaja dibiarkan kosong: nama profil WhatsApp bukan data CRM,
      // dan kalau ditaruh di sini ia akan memblokir AI mengisi nama asli.
      waPushName: pushName ?? null,
    },
  });
}

/**
 * Ambil nomor telepon dari alamat WhatsApp.
 *
 * Hanya alamat "@s.whatsapp.net" yang benar-benar berisi nomor. WhatsApp juga
 * memakai LID ("@lid"), yaitu identitas acak yang sengaja menyembunyikan nomor
 * asli, dan alamat internal untuk ruang coba. Keduanya mengembalikan null,
 * karena menampilkannya sebagai nomor cuma menyesatkan.
 */
export function jidToPhone(jid: string): string | null {
  if (!jid.endsWith("@s.whatsapp.net") && !jid.endsWith("@c.us")) return null;

  const user = jid.split("@")[0].split(":")[0];
  if (!/^\d{6,20}$/.test(user)) return null;

  return "+" + user;
}

export async function getOrCreateConversation(params: {
  workspaceId: string;
  contactId: string;
  channelId?: string | null;
  agentId?: string | null;
}): Promise<Conversation> {
  // Obrolan lama dipakai lagi APA PUN statusnya, lalu dibuka kembali.
  //
  // Dulu yang dicari cuma yang berstatus "open", dan itu membuat tombol "Sudah
  // beres" diam-diam menghapus riwayat. Begitu orang yang sama menghubungi
  // lagi, obrolannya dibuat dari nol: sapaan pembuka terkirim ulang ke orang
  // yang sudah lama dikenal, dan asisten kehilangan seluruh ingatan
  // percakapannya. Tidak ada yang error, jadi tidak ada yang tahu.
  //
  // Efek keduanya lebih halus tapi sama merugikan. Sapaan setelah pembelian dan
  // pengingat janji temu tetap dikirim ke obrolan yang sudah ditandai beres,
  // dan jawaban pelanggannya mendarat di obrolan yang berbeda. Jadi sapaannya
  // ada di satu utas dan jawabannya di utas lain, dan pemilik usahanya membaca
  // dua potongan yang tidak nyambung.
  //
  // "Sudah beres" sekarang berarti "keluarkan dari daftar yang perlu diurus",
  // bukan "buang riwayatnya". Pesan baru membukanya lagi, persis seperti tiket
  // bantuan di mana pun.
  const existing = await prisma.conversation.findFirst({
    where: {
      workspaceId: params.workspaceId,
      contactId: params.contactId,
    },
    orderBy: { lastMessageAt: "desc" },
  });

  if (existing) {
    const perubahan: Record<string, unknown> = {};

    if (existing.status !== "open") {
      perubahan.status = "open";

      // Membuka kembali sekaligus mengakhiri ambil-alih dan eskalasi.
      //
      // Ini bukan tambahan, ini menjaga perilaku yang sudah ada. Dulu menandai
      // "Sudah beres" membuat pesan berikutnya lahir sebagai obrolan baru yang
      // asistennya menyala. Jadi tombol itu memang cara orang menyerahkan
      // kembali pelanggan ke asisten setelah dia tangani sendiri. Kalau
      // pemakaian ulang obrolan dipasang tanpa baris ini, tombol yang sama
      // berubah arti diam-diam: pelanggan yang pernah dibalas manual tidak akan
      // pernah dijawab asisten lagi, selamanya, tanpa ada yang memberi tahu.
      //
      // Artinya jadi utuh: "Sudah beres" menutup urusannya, dan urusan baru
      // dimulai dengan keadaan bawaan, yaitu asisten yang menjawab.
      perubahan.aiEnabled = true;
      perubahan.needsHuman = false;
      perubahan.handoffReason = null;
    }
    // Nomor yang menerima bisa berganti kalau pemiliknya memasang nomor baru.
    // Yang tercatat harus nomor yang benar-benar dipakai sekarang, karena
    // balasan manual dan sapaan otomatis mengirim lewat kolom ini.
    if (params.channelId && existing.channelId !== params.channelId) {
      perubahan.channelId = params.channelId;
    }
    if (Object.keys(perubahan).length === 0) return existing;

    const dibuka = await prisma.conversation.update({
      where: { id: existing.id },
      data: perubahan,
    });
    bus.publish({
      type: "conversation",
      workspaceId: params.workspaceId,
      conversationId: dibuka.id,
    });
    return dibuka;
  }

  const created = await prisma.conversation.create({
    data: {
      workspaceId: params.workspaceId,
      contactId: params.contactId,
      channelId: params.channelId ?? null,
      agentId: params.agentId ?? null,
    },
  });
  bus.publish({
    type: "conversation",
    workspaceId: params.workspaceId,
    conversationId: created.id,
  });
  return created;
}

// ─── Pesan ────────────────────────────────────────────────────────────────────

export async function appendMessage(params: {
  conversationId: string;
  workspaceId: string;
  role: "customer" | "ai" | "human" | "system";
  content: string;
  mediaType?: string;
  mediaPath?: string | null;
  mediaSummary?: string | null;
  waMessageId?: string | null;
}) {
  const message = await prisma.message.create({
    data: {
      conversationId: params.conversationId,
      role: params.role,
      content: params.content,
      mediaType: params.mediaType ?? "text",
      mediaPath: params.mediaPath ?? null,
      mediaSummary: params.mediaSummary ?? null,
      waMessageId: params.waMessageId ?? null,
    },
  });

  const now = new Date();
  await prisma.conversation.update({
    where: { id: params.conversationId },
    data: {
      lastMessageAt: now,
      // Catatan sistem bukan ucapan siapa pun: dia tidak dikirim ke pelanggan
      // dan tidak datang dari pelanggan. Jadi dia cuma menggeser lastMessageAt
      // supaya obrolannya naik di kotak masuk, dan tidak menyentuh penanda lain.
      ...(params.role === "system"
        ? {}
        : params.role === "customer"
        ? {
            lastCustomerAt: now,
            unreadCount: { increment: 1 },
            followUpCount: 0,
            // Pelanggan yang bicara lagi memulai siklus sapaan dari nol.
            //
            // Dulu cuma hitungannya yang direset, bisunya tidak. Itu tidak
            // terasa selama bisunya cuma sepanjang satu periode, tapi obrolan
            // yang ditutup dengan salam sekarang dibisukan berminggu-minggu,
            // dan tanpa baris ini pelanggan yang datang lagi lalu menghilang
            // di tengah jalan tidak akan pernah disapa balik.
            followUpMutedUntil: null,
          }
        : { lastOutboundAt: now }),
    },
  });

  bus.publish({
    type: "message",
    workspaceId: params.workspaceId,
    conversationId: params.conversationId,
  });

  return message;
}

/**
 * Apakah sudah ada catatan sistem yang masih berlaku.
 *
 * "Masih berlaku" berarti belum ada balasan AI sesudahnya. Tanpa pemeriksaan
 * ini, pelanggan yang mengirim tiga salam penutup berturut-turut menghasilkan
 * tiga catatan yang isinya sama, dan kotak masuknya jadi penuh keterangan alih
 * alih percakapan.
 *
 * Masukannya urut TERBARU DULUAN.
 */
export function catatanMasihBerlaku(pesan: { role: string }[]): boolean {
  for (const m of pesan) {
    if (m.role === "system") return true;
    // Ada balasan atau campur tangan manusia sesudah catatan terakhir, jadi
    // keadaannya sudah berubah dan catatan baru memang pantas.
    if (m.role === "ai" || m.role === "human") return false;
  }
  return false;
}

/**
 * Tulis alasan kenapa asisten sengaja tidak membalas.
 *
 * Ini menutup lubang yang paling mudah terlewat dari seluruh rangkaian rem:
 * semuanya berhenti tanpa suara. Dari kotak masuk, obrolan yang asistennya
 * sengaja diam terlihat persis sama dengan obrolan yang asistennya rusak, dan
 * pemilik usahanya tidak punya satu pun cara membedakannya.
 *
 * Barisnya memakai peran "system", jadi dia tidak pernah ikut dikirim ke
 * pelanggan dan tidak pernah masuk ke prompt. Yang membacanya cuma manusia.
 */
async function catatSistem(
  conversationId: string,
  workspaceId: string,
  teks: string,
) {
  await appendMessage({
    conversationId,
    workspaceId,
    role: "system",
    content: teks,
  });
}

/**
 * Kabari pelanggan sekali bahwa pesannya masuk selagi eskalasinya menggantung.
 *
 * Tanpa ini, pelanggan yang menulis lagi selama jendela tunggu tidak menerima
 * apa pun, dan dari sisi dia itu tidak bisa dibedakan dari nomor yang mati.
 * Pola yang sama dengan pemberitahuan kuota habis: sekali saja, supaya dia
 * tahu pesannya sampai tanpa dibanjiri kalimat yang sama.
 *
 * Sekali "per eskalasi", bukan per obrolan, jadi eskalasi berikutnya di bulan
 * depan tetap dapat kabarnya sendiri.
 *
 * @returns kalimat yang harus dikirim pemanggil, atau null kalau sudah pernah.
 */
export async function kabariEskalasiSekali(
  conversationId: string,
): Promise<string | null> {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: { workspaceId: true, handoffAt: true },
  });
  if (!conversation?.handoffAt) return null;

  const sudah = await prisma.message.findFirst({
    where: {
      conversationId,
      role: "ai",
      content: PESAN_ESKALASI,
      createdAt: { gte: conversation.handoffAt },
    },
    select: { id: true },
  });
  if (sudah) return null;

  await appendMessage({
    conversationId,
    workspaceId: conversation.workspaceId,
    role: "ai",
    content: PESAN_ESKALASI,
  });
  return PESAN_ESKALASI;
}

// ─── Menjalankan agent ────────────────────────────────────────────────────────

/**
 * Kenapa AI tidak jadi membalas. `code` untuk logika dan pengujian, `reason`
 * untuk ditampilkan ke pengguna. Jangan pernah mencocokkan teks `reason`,
 * kalimatnya memang bisa berubah sewaktu-waktu.
 */
export type SkipCode =
  | "no_conversation"
  | "human_takeover"
  | "handoff_pending"
  | "no_agent"
  | "office_hours"
  | "obrolan_selesai"
  | "terlalu_ramai"
  | "balasan_berulang"
  | "kesalip_pesan_baru"
  | "quota_exhausted"
  | "playground_limit"
  | "ai_error";

export interface BerkasDikirim {
  id: string;
  code: string;
  name: string;
  fileName: string;
  mimeType: string;
  kind: string;
}

export type RunResult =
  | {
      status: "replied";
      bubbles: string[];
      handoff: boolean;
      knowledgeUsed: number;
      /** Gambar/berkas yang harus ikut dikirim ke pelanggan. */
      berkas: BerkasDikirim[];
    }
  | { status: "skipped"; code: SkipCode; reason: string };

/**
 * Jalankan AI untuk sebuah percakapan dan simpan hasilnya.
 * Pemanggil bertanggung jawab mengirim `bubbles` ke channel (WhatsApp/playground).
 */
export async function runAgentOnConversation(params: {
  conversationId: string;
  media?: IncomingMedia | null;
  /**
   * Lewati pengecekan jam kerja dan ambil-alih manual. Dipakai ruang coba, dan
   * juga tombol "Serahkan ke AI" di kotak masuk.
   */
  force?: boolean;
  /**
   * Pakai jatah harian ruang coba, bukan kuota balasan pelanggan.
   *
   * Sengaja terpisah dari `force`. Waktu keduanya masih satu penanda, tombol
   * "Serahkan ke AI" ikut memotong jatah percobaan, lalu berhenti jalan begitu
   * jatah itu habis padahal yang dibalas pelanggan sungguhan.
   */
  ruangCoba?: boolean;
  systemHint?: string;
}): Promise<RunResult> {
  const conversation = await prisma.conversation.findUnique({
    where: { id: params.conversationId },
    include: { contact: true },
  });
  if (!conversation) {
    return {
      status: "skipped",
      code: "no_conversation",
      reason: "obrolannya tidak ketemu",
    };
  }

  if (!params.force && !conversation.aiEnabled) {
    return {
      status: "skipped",
      code: "human_takeover",
      reason: "obrolan ini sedang kamu pegang sendiri",
    };
  }

  // Eskalasi yang belum ditangani berarti AI HARUS diam.
  //
  // Dulu bendera ini cuma dinaikkan lalu dilupakan: `needsHuman` ditulis di
  // applySideEffects, ditampilkan di kotak masuk, dan tidak pernah dibaca lagi
  // oleh yang membalas. Jadi asisten berkata "tim kami akan segera menghubungi"
  // lalu meneruskan obrolannya sendiri seperti tidak terjadi apa-apa, dan
  // pemilik usahanya masuk ke percakapan yang sudah berjalan tanpa dia.
  //
  // Yang membatalkannya: pemiliknya membalas manual, atau menekan "Balik ke
  // asisten" di kotak masuk. Dua-duanya mengosongkan `needsHuman`.
  if (!params.force && conversation.needsHuman) {
    const menggantung = conversation.handoffAt
      ? Date.now() - conversation.handoffAt.getTime()
      : // Eskalasi lama dari sebelum kolom ini ada. Diperlakukan sebagai sudah
        // lewat jendela, supaya obrolan yang terlanjur membeku ikut cair.
        Number.POSITIVE_INFINITY;

    if (menggantung < JEDA_ESKALASI_JAM * 60 * 60 * 1000) {
      return {
        status: "skipped",
        code: "handoff_pending",
        reason: "asisten sudah minta bantuan kamu, jadi dia berhenti dulu di sini",
      };
    }

    // Jendelanya habis. Asisten melanjutkan, benderanya TETAP naik.
    //
    // Diam selamanya bukan pilihan. Semua rem lain di sistem ini pulih
    // sendiri: obrolan selesai pulih waktu ada pertanyaan baru, rem kecepatan
    // pulih dalam sepuluh menit, kuota habis pulih tiap bulan dan pelanggannya
    // dikabari. Cuma eskalasi yang dulu tidak pernah pulih tanpa manusia, dan
    // itu bikin pelanggan yang bertanya hal baru berjam-jam kemudian tidak
    // dijawab sama sekali. Untuk produk yang menjual "chat dibalas otomatis",
    // itu kegagalan yang lebih besar daripada asisten yang menyahut sedikit
    // lebih cepat dari pemiliknya.
    if (conversation.handoffAt) {
      await prisma.conversation.update({
        where: { id: conversation.id },
        // Dikosongkan supaya keterangan di bawah cuma ditulis sekali, bukan
        // tiap pesan yang masuk sesudahnya.
        data: { handoffAt: null },
      });
      await catatSistem(
        conversation.id,
        conversation.workspaceId,
        `Sudah ${JEDA_ESKALASI_JAM} jam sejak asisten minta bantuan dan belum ada yang menangani, jadi dia lanjut menjawab supaya pelanggannya tidak didiamkan. Tandanya sengaja dibiarkan menyala.`,
      );
    }
    log.info(
      `eskalasi pada obrolan ${conversation.id} sudah lewat ${JEDA_ESKALASI_JAM} jam, asisten melanjutkan`,
    );
  }

  const agent = await resolveAgent(conversation);
  if (!agent) {
    return {
      status: "skipped",
      code: "no_agent",
      reason: "belum ada asisten yang menjaga nomor ini",
    };
  }

  const workspacePaket = await prisma.workspace.findUnique({
    where: { id: conversation.workspaceId },
    select: { plan: true },
  });

  if (!params.force && !aiMayReplyNow(agent, workspacePaket?.plan)) {
    return {
      status: "skipped",
      code: "office_hours",
      reason: "masih jam kerja, chat dibiarkan buat tim kamu",
    };
  }

  // Riwayatnya diambil SEBELUM jatah dipesan.
  //
  // Dua rem di bawah memutuskan berdasarkan isi riwayat, dan keduanya harus
  // sempat memutuskan sebelum ada satu kredit pun yang terpotong. Kalau
  // urutannya dibalik, percakapan yang direm tetap membayar.
  const mentah = await prisma.message.findMany({
    where: { conversationId: conversation.id },
    orderBy: { createdAt: "desc" },
    take: MAKS_BARIS_RIWAYAT,
  });

  // Catatan sistem dikeluarkan dari yang menilai alur percakapan.
  //
  // Dia catatan untuk manusia, bukan giliran bicara. Kalau ikut dibaca, dia
  // memutus rentetan giliran dan membatalkan rem yang barusan menulisnya:
  // pelanggan yang mengirim salam penutup kedua akan dibalas lagi, cuma karena
  // ada satu baris keterangan di antaranya.
  const alur = mentah.filter((m) => m.role !== "system");

  // Rem 1: obrolannya sudah habis, tinggal saling berterima kasih.
  //
  // Sapaan otomatis dan tombol manual sengaja dikecualikan lewat `force` dan
  // `systemHint`: keduanya memang bermaksud memulai obrolan baru, bukan
  // meneruskan yang sudah selesai.
  if (!params.force && !params.systemHint && obrolanSudahHabis(alur)) {
    log.info(`obrolan ${conversation.id} sudah selesai, tidak dibalas lagi`);
    if (!catatanMasihBerlaku(mentah)) {
      await catatSistem(
        conversation.id,
        conversation.workspaceId,
        "Asisten berhenti di sini karena obrolannya sudah sampai salam penutup. Dia akan menjawab lagi begitu ada pertanyaan baru.",
      );
    }
    return {
      status: "skipped",
      code: "obrolan_selesai",
      reason: "obrolannya sudah sampai salam penutup, jadi tidak dibalas lagi",
    };
  }

  // Rem 2: terlalu banyak giliran dalam waktu terlalu singkat.
  //
  // Ini jaring untuk hal yang tidak bisa dikenali dari kata-katanya: dua robot
  // yang saling membalas, atau apa pun yang membuat obrolan berjalan tanpa
  // manusia. Benderanya ikut dinaikkan supaya pemilik usahanya benar-benar
  // melihat ada yang tidak beres, bukan cuma menemukan obrolan yang mendadak
  // berhenti tanpa keterangan.
  if (!params.force) {
    const sejak = new Date(Date.now() - JENDELA_GILIRAN_MENIT * 60 * 1000);
    const giliranAi = giliranAiSejak(alur, sejak);
    if (giliranAi >= MAKS_GILIRAN_AI) {
      log.warn(
        `obrolan ${conversation.id} sudah ${giliranAi} giliran AI dalam ${JENDELA_GILIRAN_MENIT} menit, direm`,
      );
      if (!catatanMasihBerlaku(mentah)) {
        await catatSistem(
          conversation.id,
          conversation.workspaceId,
          `Asisten dihentikan di sini: sudah ${giliranAi} balasan dalam ${JENDELA_GILIRAN_MENIT} menit, terlalu cepat untuk obrolan yang digerakkan orang. Ini menjaga jatah balasanmu. Tekan "Balik ke asisten" kalau memang wajar.`,
        );
      }
      if (!conversation.needsHuman) {
        await prisma.conversation.update({
          where: { id: conversation.id },
          data: {
            needsHuman: true,
            // Yang ini memang dimatikan penuh, beda dengan eskalasi biasa.
            //
            // Eskalasi biasa itu obrolan sehat yang perlu manusia, jadi
            // asistennya cuma menunggu sebentar. Yang ini malfungsi: obrolan
            // berjalan tanpa manusia dan menghabiskan jatah. Melanjutkannya
            // sendiri sesudah beberapa jam berarti mengulangi kerusakannya,
            // jadi yang ini menunggu keputusan orang.
            aiEnabled: false,
            handoffAt: new Date(),
            handoffReason:
              "Obrolan ini berjalan terlalu cepat dan terlalu lama tanpa berhenti. Asisten dihentikan supaya jatah balasan tidak habis. Cek dulu, baru serahkan lagi ke asisten kalau memang wajar.",
          },
        });
        bus.publish({
          type: "conversation",
          workspaceId: conversation.workspaceId,
          conversationId: conversation.id,
        });
      }
      return {
        status: "skipped",
        code: "terlalu_ramai",
        reason: "obrolannya berjalan terlalu cepat, asisten dihentikan dulu",
      };
    }
  }

  // Jatahnya DIPESAN sekarang, bukan dipotong setelah AI menjawab. Kalau
  // dipotong belakangan, beberapa pelanggan yang chat pada detik yang sama
  // sama-sama melihat "jatah masih ada" dan semuanya ikut dibalas.
  // Kalau AI-nya gagal, jatah ini dikembalikan di bawah.
  if (params.ruangCoba) {
    const jatah = await ambilJatahRuangCoba(conversation.workspaceId);
    if (!(await pesanJatahRuangCoba(conversation.workspaceId))) {
      return {
        status: "skipped",
        code: "playground_limit",
        reason: `Jatah mencoba hari ini sudah habis (${jatah.batas} kali). Besok penuh lagi. Kuota balasan ke pelanggan tidak terpakai sama sekali.`,
      };
    }
  } else if (!(await pesanKredit(conversation.workspaceId))) {
    log.warn(`kuota AI habis untuk workspace ${conversation.workspaceId}`);
    return {
      status: "skipped",
      code: "quota_exhausted",
      reason: "jatah balasan bulan ini sudah habis. Naikkan paket kalau mau nambah.",
    };
  }

  // Dipotong mundur dari yang terbaru, berhenti begitu sudah cukup giliran
  // customer ATAU sudah kena pagar baris, mana pun yang lebih dulu.
  //
  // Dihitung dari `alur`, bukan `mentah`. Catatan sistem tidak pernah ikut ke
  // model, jadi kalau dia ikut dihitung di sini dia cuma memakan jatah baris
  // dan memperpendek ingatan percakapan tanpa memberi apa pun.
  let giliran = 0;
  let ambil = alur.length;
  for (let i = 0; i < alur.length; i++) {
    if (alur[i].role === "customer") giliran++;
    if (giliran > GILIRAN_DIINGAT) {
      ambil = i;
      break;
    }
  }

  const history = alur.slice(0, ambil).reverse();

  // Pesan terakhir sudah masuk ke history; ambil teksnya sebagai input terbaru
  // lalu keluarkan dari history supaya tidak dobel.
  const last = history[history.length - 1];
  const incomingText =
    last && last.role === "customer" ? last.content : "";
  const priorHistory =
    last && last.role === "customer" ? history.slice(0, -1) : history;

  // Galeri cuma ditawarkan ke model kalau paketnya memang berhak. Kalau tidak,
  // daftarnya kosong, jadi model tidak pernah tahu ada gambar yang bisa
  // dikirim, dan tidak akan menjanjikan sesuatu yang tidak bisa dia lakukan.
  const paketSekarang = workspacePaket?.plan ?? "free";
  const bolehKirimMedia = bolehPakai(paketSekarang, "kirimMedia");
  const bolehBacaMedia = bolehPakai(paketSekarang, "bacaMedia");
  const semuaAsset = bolehKirimMedia
    ? await prisma.mediaAsset.findMany({
        where: { agentId: agent.id },
        orderBy: { createdAt: "asc" },
      })
    : [];

  // Semua berkas tetap ditawarkan, cuma yang sudah dikirim diberi tanda. Kalau
  // disembunyikan, model mengira dirinya tidak bisa mengirim gambar sama sekali.
  const pernahDikirim = new Set(
    history
      .filter((m) => m.role === "ai" && m.mediaPath)
      .map((m) => m.mediaPath as string),
  );

  // Pengaman terhadap pengulangan: berkas yang dikirim di beberapa pesan
  // terakhir tidak boleh dikirim lagi, apa pun kata model.
  const barusanDikirim = new Set(
    history
      .slice(-5)
      .filter((m) => m.role === "ai" && m.mediaPath)
      .map((m) => m.mediaPath as string),
  );

  let reply: AgentReply;
  try {
    reply = await generateReply({
      agent,
      contact: conversation.contact,
      history: priorHistory,
      incomingText,
      // Lampiran cuma dikirim ke model kalau paketnya berhak membacanya.
      // Ini juga menghemat biaya: token gambar dan suara jauh lebih mahal
      // daripada teks, dan paket gratis tidak membayarnya.
      incomingMedia: bolehBacaMedia && params.media
        ? { mimeType: params.media.mimeType, data: params.media.data }
        : null,
      systemHint: params.systemHint,
      jadwalTerisi: await jadwalTerisi(conversation.workspaceId, conversation.contactId),
      assets: semuaAsset.map((a) => ({
        code: a.code,
        name: a.name,
        description: a.description,
        kind: a.kind,
        sudahDikirim: pernahDikirim.has(a.fileName),
      })),
    });
  } catch (err) {
    // Jatahnya sudah dipesan di atas. Karena tidak ada balasan yang terkirim,
    // kembalikan supaya pelanggan tidak kehilangan jatah gara-gara gangguan.
    if (params.ruangCoba) {
      await kembalikanJatahRuangCoba(conversation.workspaceId);
    } else {
      await kembalikanKredit(conversation.workspaceId);
    }

    const message = err instanceof Error ? err.message : String(err);
    log.error(`AI gagal membalas: ${message}`);
    return {
      status: "skipped",
      code: "ai_error",
      reason: `Asisten gagal menjawab. ${message}`,
    };
  }

  // Pelanggan menulis lagi SELAGI jawabannya sedang disusun.
  //
  // Riwayat dibaca sekali di awal, lalu model dipanggil. Panggilan itu biasanya
  // satu dua detik, tapi bisa jadi belasan detik kalau layanannya sedang penuh
  // dan permintaannya diulang lalu dialihkan ke model cadangan. Dalam rentang
  // itu pelanggan bisa mengirim beberapa pesan lagi.
  //
  // Jawaban yang sudah terlanjur disusun menjawab keadaan yang sudah lewat.
  // Kejadian nyata 2026-08-05: pelanggan menulis "ok", lalu "hallo", lalu "ehh
  // sy mau nanya", dan yang terkirim "Sama-sama, Kak Kai!" — jawaban untuk
  // "ok". Dia lalu bertanya "apanya sama2?", dan asistennya minta maaf sudah
  // salah merespons. Semuanya benar menurut potret riwayat yang dia pegang,
  // dan semuanya salah menurut layar pelanggannya.
  //
  // Jadi jawaban yang kesalip dibuang, bukan dikirim. Pesan yang baru masuk
  // sudah menjadwalkan gilirannya sendiri, dan giliran itu membaca riwayat yang
  // lengkap termasuk yang barusan. Jatahnya dikembalikan karena tidak ada yang
  // terkirim.
  const patokan = mentah[0]?.createdAt;
  if (patokan) {
    const menyusul = await prisma.message.count({
      where: {
        conversationId: conversation.id,
        role: "customer",
        createdAt: { gt: patokan },
      },
    });
    if (menyusul > 0) {
      if (params.ruangCoba) {
        await kembalikanJatahRuangCoba(conversation.workspaceId);
      } else {
        await kembalikanKredit(conversation.workspaceId);
      }
      log.info(
        `balasan untuk obrolan ${conversation.id} dibuang: ${menyusul} pesan baru masuk selagi disusun`,
      );
      return {
        status: "skipped",
        code: "kesalip_pesan_baru",
        reason: "pelanggan menulis lagi selagi jawabannya disusun",
      };
    }
  }

  // Balasan yang isinya cuma permintaan maaf tidak ditagihkan.
  //
  // Pelanggannya tetap menerima kalimat, jadi ini bukan balasan yang batal.
  // Tapi yang dia terima bukan jawaban, melainkan kabar bahwa sistem kami
  // sedang tersendat. Menagih jatah untuk itu berarti pemilik usaha membayar
  // gangguan yang bukan dia sebabkan, dan di paket gratis yang cuma 100
  // balasan sebulan itu langsung terasa.
  if (reply.gagal) {
    if (params.ruangCoba) {
      await kembalikanJatahRuangCoba(conversation.workspaceId);
    } else {
      await kembalikanKredit(conversation.workspaceId);
    }
  }

  // Yang dipelajari dari giliran ini ditulis DULUAN, sebelum diputuskan apakah
  // kalimatnya jadi dikirim.
  //
  // Urutannya sempat terbalik, dan akibatnya halus tapi nyata: begitu balasannya
  // dibatalkan karena pengulangan, tahap, tag, janji temu, dan permintaan
  // eskalasi dari giliran itu ikut hangus. Yang dipelajari sistem dari sebuah
  // percakapan tidak ada hubungannya dengan apakah kalimatnya layak dikirim.
  await applySideEffects(
    conversation,
    reply,
    incomingText,
    namaAsisten(agent.behaviorPrompt),
  );

  // Simpan ringkasan lampiran ke pesan aslinya. Lampiran tidak dikirim ulang
  // ke model di pesan berikutnya demi hemat token, jadi tanpa catatan ini
  // asisten lupa isi fotonya begitu pelanggan lanjut mengetik.
  //
  // Barisnya dicari lewat nama berkasnya, BUKAN diasumsikan pesan terakhir.
  // Orang mengirim foto lalu mengetik keterangannya sebagai pesan terpisah,
  // dan keduanya terkumpul jadi satu giliran. Waktu ringkasannya ditempel ke
  // pesan terakhir, dia mendarat di baris teks, dan baris teks tidak pernah
  // dibacakan ringkasannya ke model. Jadi bacaan AI atas foto itu hilang, lalu
  // giliran berikutnya fotonya terbaca "(tidak terbaca)".
  if (params.media && reply.mediaNote) {
    const jalur = params.media.storedPath;
    const barisLampiran = jalur
      ? alur.find((m) => m.mediaPath === jalur)
      : alur.find((m) => m.mediaType !== "text");

    if (barisLampiran) {
      await prisma.message.update({
        where: { id: barisLampiran.id },
        data: { mediaSummary: reply.mediaNote },
      });
    }
  }

  // Kalimat yang sudah pernah dikirim tidak dikirim lagi.
  //
  // Aturan 16 di prompt sudah melarangnya, tapi larangan di prompt itu imbauan,
  // bukan jaminan. Pada 2026-08-05 satu obrolan menerima kalimat yang sama
  // persis tiga kali. Yang begini harus dijaga di kode, bukan diserahkan ke
  // kepatuhan model.
  //
  // Riwayat cuma dibandingkan kalau pelanggan tidak membawa apa-apa yang baru.
  //
  // Kalau dia bertanya lagi, dia berhak mendapat jawaban yang sama sekali lagi.
  // Pelanggan yang menanyakan harga dua kali lalu didiamkan pada pertanyaan
  // keduanya adalah kegagalan yang jauh lebih parah daripada satu kalimat yang
  // terkirim dua kali. Lampiran juga selalu dihitung membawa isi, karena
  // `cumaBasaBasi` cuma membaca teks.
  const pelangganBawaIsi = !!params.media || !tanpaIsi(incomingText);

  const kalimatAiSebelumnya = pelangganBawaIsi
    ? []
    : mentah
        .filter((m) => m.role === "ai" && m.mediaType === "text")
        .slice(0, ULANGAN_DILIHAT)
        .map((m) => m.content);

  const bubblesBaru = buangUlangan(reply.bubbles, kalimatAiSebelumnya);

  if (bubblesBaru.length === 0) {
    // Semuanya pengulangan, jadi tidak ada satu pun kalimat baru untuk dikirim.
    // Jatahnya dikembalikan: pelanggan tidak menerima apa-apa, jadi tidak ada
    // yang pantas ditagih. Pesan pelanggannya sendiri tetap tersimpan dan tetap
    // terhitung belum dibaca, jadi pemilik usahanya tetap melihat ada yang
    // menunggu dijawab.
    if (params.ruangCoba) {
      await kembalikanJatahRuangCoba(conversation.workspaceId);
    } else {
      await kembalikanKredit(conversation.workspaceId);
    }
    log.warn(
      `balasan untuk obrolan ${conversation.id} seluruhnya pengulangan, tidak dikirim`,
    );
    if (!catatanMasihBerlaku(mentah)) {
      await catatSistem(
        conversation.id,
        conversation.workspaceId,
        "Asisten cuma mengulang kalimat yang sudah pernah dia kirim, jadi balasannya tidak dikirim dan jatahnya dikembalikan. Kalau ini terus terjadi, biasanya info bisnisnya belum cukup untuk menjawab.",
      );
    }
    return {
      status: "skipped",
      code: "balasan_berulang",
      reason: "asisten cuma mengulang kalimat yang sudah pernah dia kirim",
    };
  }

  if (bubblesBaru.length < reply.bubbles.length) {
    log.info(
      `${reply.bubbles.length - bubblesBaru.length} kalimat berulang dibuang dari balasan`,
    );
  }
  reply.bubbles = bubblesBaru;

  for (const bubble of reply.bubbles) {
    await appendMessage({
      conversationId: conversation.id,
      workspaceId: conversation.workspaceId,
      role: "ai",
      content: bubble,
    });
  }

  // Catat berkas yang akan dikirim. Pencatatannya di sini, bukan setelah
  // terkirim, supaya giliran berikutnya tahu bahwa foto ini sudah ditawarkan.
  const berkas: BerkasDikirim[] = [];
  for (const code of reply.kirimBerkas) {
    const aset = semuaAsset.find((a) => a.code === code);
    if (!aset) continue;

    if (barusanDikirim.has(aset.fileName)) {
      log.info(`berkas "${aset.name}" barusan dikirim, tidak diulang`);
      continue;
    }

    berkas.push({
      id: aset.id,
      code: aset.code,
      name: aset.name,
      fileName: aset.fileName,
      mimeType: aset.mimeType,
      kind: aset.kind,
    });

    await appendMessage({
      conversationId: conversation.id,
      workspaceId: conversation.workspaceId,
      role: "ai",
      content: aset.name,
      mediaType: aset.kind,
      mediaPath: aset.fileName,
      mediaSummary: aset.description,
    });

    await prisma.mediaAsset.update({
      where: { id: aset.id },
      data: { sentCount: { increment: 1 } },
    });
  }

  return {
    status: "replied",
    bubbles: reply.bubbles,
    handoff: reply.handoff,
    knowledgeUsed: reply.knowledgeUsed,
    berkas,
  };
}

async function resolveAgent(conversation: Conversation): Promise<Agent | null> {
  if (conversation.agentId) {
    const a = await prisma.agent.findUnique({ where: { id: conversation.agentId } });
    if (a?.isActive) return a;
  }

  // Nomor WhatsApp yang punya channel: keputusan pemiliknya dihormati apa
  // adanya. Kalau dia memilih "Tidak ada", jangan diam-diam dilempar ke asisten
  // lain. Dulu begitu, padahal layarnya berjanji chatnya TIDAK dibalas
  // otomatis, jadi nomor yang sengaja dipegang manual tetap dijawab AI dengan
  // persona yang salah.
  if (conversation.channelId) {
    const channel = await prisma.channel.findUnique({
      where: { id: conversation.channelId },
      include: { agent: true },
    });
    if (!channel?.agentId) return null;
    return channel.agent?.isActive ? channel.agent : null;
  }

  // Tanpa channel berarti ruang coba, yang memang tidak punya penugasan nomor.
  return prisma.agent.findFirst({
    where: { workspaceId: conversation.workspaceId, isActive: true },
    orderBy: { createdAt: "asc" },
  });
}

/**
 * Alamat email pertama di dalam sepotong teks, atau null.
 *
 * Ada karena mengandalkan model untuk ini terbukti tidak cukup. Pada
 * 2026-08-03 pelanggan mengirim "Ini email sy: 13kailouis@gmail.com", model
 * menjawab "emailnya sudah Sari catat ya" dengan benar, tapi field
 * "contact.email" di JSON-nya dibiarkan kosong. Hasilnya pelanggan diberi tahu
 * datanya tersimpan padahal kolomnya null, dan tidak ada yang error sehingga
 * tidak ada yang tahu.
 *
 * Email itu pola yang pasti. Yang pasti tidak boleh digantungkan pada
 * kepatuhan model.
 */
export function cariEmail(teks: string): string | null {
  const m = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+/.exec(teks ?? "");
  if (!m) return null;
  // Titik atau koma yang menempel di akhir kalimat bukan bagian alamatnya.
  return m[0].replace(/[.,;:]+$/, "").toLowerCase();
}

/**
 * Jam janji temu yang sudah terisi, untuk diberitahukan ke asisten.
 *
 * Yang dikembalikan cuma waktunya. Nama pelanggan lain sengaja tidak ikut:
 * model tidak butuh itu untuk menghindari bentrok, tapi kalau dikasih, dia
 * punya kesempatan menyebutnya ke orang yang salah.
 *
 * Janji milik lawan bicara sendiri dikeluarkan, supaya jadwalnya sendiri tidak
 * dilaporkan balik ke dia sebagai "jam itu sudah terisi".
 *
 * DIBATASI 12 baris dan 21 hari ke depan. Ini ikut terkirim tiap pesan, jadi
 * daftar yang panjang bukan cuma tidak berguna, dia dibayar berulang-ulang.
 */
async function jadwalTerisi(
  workspaceId: string,
  kecualiContactId: string,
): Promise<Date[]> {
  const baris = await prisma.contact.findMany({
    where: {
      workspaceId,
      id: { not: kecualiContactId },
      // Ruang coba tidak ikut. Percobaan di ruang coba bisa menghasilkan janji
      // temu juga, dan tanpa saringan ini jadwal karangan dari sesi latihan
      // ikut terkirim ke pelanggan sungguhan sebagai jam yang "sudah terisi",
      // lalu asisten menolak jam yang sebenarnya kosong.
      ...HANYA_PELANGGAN_ASLI,
      janjiPada: {
        gte: new Date(),
        lte: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
      },
    },
    orderBy: { janjiPada: "asc" },
    take: 12,
    select: { janjiPada: true },
  });
  return baris.map((b) => b.janjiPada!).filter(Boolean);
}

/** Tulis balik hasil ekstraksi AI ke CRM + tandai handoff. */
async function applySideEffects(
  conversation: Conversation,
  reply: AgentReply,
  incomingText = "",
  namaPersona: string | null = null,
) {
  const contactData: Record<string, unknown> = {};
  const u = reply.contactUpdates;

  const current = await prisma.contact.findUnique({
    where: { id: conversation.contactId },
  });
  if (!current) return;

  // Hanya isi field yang masih kosong — jangan menimpa data yang sudah
  // dikoreksi manual oleh tim.
  //
  // Nama yang sama dengan nama asisten sendiri ditolak. Nama persona diketik
  // bebas di dalam behaviorPrompt, dan dua prompt bawaan kita dua-duanya
  // memakai "Sari". Waktu dua asisten Palwise saling chat (2026-08-05), yang
  // satu memungut nama lawan sebagai nama pelanggan lalu memanggil dia "Kak
  // Sari", padahal itu namanya sendiri. Sekali tersimpan, nama itu permanen,
  // karena kolomnya cuma diisi kalau masih kosong.
  const namaSamaDenganPersona =
    !!u.name &&
    !!namaPersona &&
    u.name.trim().toLowerCase() === namaPersona.trim().toLowerCase();
  if (namaSamaDenganPersona) {
    log.info(
      `nama "${u.name}" ditolak untuk ${current.id}: itu nama asistennya sendiri`,
    );
  }
  if (u.name && !current.name && !namaSamaDenganPersona) contactData.name = u.name;
  if (u.email && !current.email) contactData.email = u.email;

  // Jaring pengaman: kalau model lupa mengisinya, ambil sendiri dari pesan
  // pelanggan. Lihat alasannya di [cariEmail].
  if (!contactData.email && !current.email) {
    const dariPesan = cariEmail(incomingText);
    if (dariPesan) contactData.email = dariPesan;
  }
  if (u.businessName && !current.businessName) contactData.businessName = u.businessName;
  if (u.industry && !current.industry) contactData.industry = u.industry;

  // Hanya boleh maju. Model kadang menilai ulang seluruh percakapan dan
  // menaruh pelanggan yang sudah mau bayar kembali ke "baru".
  if (reply.stage && bolehPindahTahap(current.stage, reply.stage)) {
    contactData.stage = reply.stage;

    // Titik mulai hitung mundur tanya kabar dan ajakan beli lagi.
    if (reply.stage === "selesai") {
      contactData.closedAt = new Date();
    }
  } else if (reply.stage && reply.stage !== current.stage) {
    log.info(
      `tahap "${current.stage}" tidak diturunkan ke "${reply.stage}" untuk ${current.id}`,
    );
  }

  // Masalah pelanggan.
  //
  // Cuma DIISI di sini, tidak pernah dikosongkan. Yang berhak menyatakan
  // masalahnya sudah beres itu pemilik toko, bukan AI. Kalau AI boleh
  // mengosongkannya, satu pesan santai dari pelanggan yang masih kesal
  // ("oke ditunggu ya") akan menghapus keluhannya dari daftar, dan pemilik
  // toko tidak pernah tahu ada yang menunggu.
  //
  // Waktunya juga cuma dicatat sekali, waktu masalahnya pertama muncul,
  // supaya "sudah menggantung berapa lama" tidak ikut ter-reset tiap balasan.
  if (reply.masalah) {
    contactData.masalah = reply.masalah;
    if (!current.masalahSejak) contactData.masalahSejak = new Date();
  }

  // Janji temu.
  //
  // Boleh menimpa yang lama, karena janji yang baru disepakati memang
  // menggantikan yang sebelumnya: orang menjadwalkan ulang, dan yang berlaku
  // selalu yang terakhir disepakati. Tapi cuma ditulis kalau tanggalnya lolos
  // pemeriksaan di [bacaJanji]; kalau tidak, yang lama dibiarkan utuh, bukan
  // dihapus. Menghapus janji gara-gara satu pesan yang tidak menyebut tanggal
  // berarti pemiliknya kehilangan jadwal yang sudah benar.
  if (reply.janjiPada) {
    contactData.janjiPada = reply.janjiPada;
    if (reply.janjiCatatan) contactData.janjiCatatan = reply.janjiCatatan;

    // Selalu kembali ke "belum dipastikan". AI tidak tahu isi kalender
    // pemiliknya, jadi apa pun yang dia catat masih berstatus permintaan.
    // Termasuk waktu pelanggan menjadwalkan ulang janji yang tadinya sudah
    // dipastikan: yang dipastikan itu jam yang lama, bukan jam yang baru.
    contactData.janjiDipastikan = false;
  }

  if (reply.tags.length) {
    const merged = Array.from(
      new Set([...parseJsonArray(current.tags), ...reply.tags]),
    ).slice(0, 10);
    contactData.tags = stringifyJson(merged);
  }

  if (Object.keys(contactData).length > 0) {
    await prisma.contact.update({
      where: { id: current.id },
      data: contactData,
    });
  }

  if (reply.handoff && !conversation.needsHuman) {
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        needsHuman: true,
        // `aiEnabled` SENGAJA tidak disentuh di sini.
        //
        // Sempat ikut dimatikan supaya tombol di kotak masuk cukup ditekan
        // sekali. Itu keliru: mematikannya membuat eskalasi tidak bisa
        // dibedakan dari ambil-alih manual, dan ambil-alih manual memang
        // berlaku selamanya. Jadi satu eskalasi yang tidak sempat ditangani
        // mendiamkan pelanggan tanpa batas waktu.
        //
        // Sekarang dua penanda itu punya arti masing-masing: `aiEnabled: false`
        // berarti manusia mengambil alih dan itu keputusannya, `needsHuman`
        // berarti eskalasi menggantung dan asisten cuma menunggu sebentar.
        // Tombolnya diselesaikan di kotak masuk, bukan dengan menumpangi kolom
        // yang artinya lain.
        handoffAt: new Date(),
        handoffReason: reply.handoffReason ?? "AI meminta bantuan manusia",
      },
    });
    log.info(`handoff diminta pada percakapan ${conversation.id}`);
    bus.publish({
      type: "conversation",
      workspaceId: conversation.workspaceId,
      conversationId: conversation.id,
    });
  }
}
