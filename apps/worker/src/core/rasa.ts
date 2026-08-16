/**
 * Jembatan lapisan rasa ke percakapan sungguhan.
 *
 * Dua hal yang diputuskan di sini, dan dua-duanya menentukan apakah fiturnya
 * berguna atau cuma hiasan.
 *
 * 1. BACAAN DIHITUNG WAKTU PESANNYA MASUK, BUKAN WAKTU ASISTEN MEMBALAS.
 *
 *    Ini beda yang gampang dianggap sepele dan sebenarnya menentukan segalanya.
 *    Kalau bacaannya ikut jalur balasan, dia berhenti persis di keadaan yang
 *    paling butuh dibaca:
 *      - obrolan yang sedang dipegang manusia (`aiEnabled: false`) tidak pernah
 *        punya bacaan sama sekali, padahal itu justru obrolan yang pemiliknya
 *        sedang kerjakan sendiri;
 *      - obrolan yang sudah dieskalasi membeku di bacaan terakhirnya, jadi
 *        pelanggan yang makin lama makin marah selagi menunggu tim terlihat
 *        sama saja dengan yang sudah tenang;
 *      - jatah balasan habis, di luar jam kerja, kena rem — semuanya bolong.
 *
 *    Jadi tempatnya di [appendMessage], satu-satunya pintu yang dilewati SEMUA
 *    pesan pelanggan, apa pun yang terjadi sesudahnya.
 *
 * 2. SINYAL PERILAKU DIHITUNG DARI DATA YANG SUDAH ADA.
 *
 *    Tidak ada satu pun kolom baru untuk ini. Berapa pesan yang belum dijawab,
 *    berapa lama dia menunggu, keluhan yang menggantung, uang yang sudah
 *    dikirim tapi belum dilayani — semuanya sudah tersimpan sejak dulu, cuma
 *    tidak pernah dibaca bersama-sama.
 */

import { prisma } from "@palwise/db";
import { bacaRasa, perluManusia, prioritas, type Rasa } from "@palwise/rasa";
import { bersihkanTeksPelanggan } from "../ai/suntikan.js";
import { log } from "../lib/log.js";

/** Sebanyak ini pesan terakhir yang dibaca untuk menyusun sinyal perilaku. */
const JENDELA = 12;

/** Ambang kemiripan sebelum dua pertanyaan dianggap pertanyaan yang sama. */
const AMBANG_MIRIP = 0.6;

/** Bentuk ringkas yang disimpan di Message.rasa. Pendek karena ikut tiap baris. */
interface RasaPesan {
  l: string;
  k: number;
  m: number;
  a: string[];
}

export function bacaRasaPesan(json: string | null | undefined): RasaPesan | null {
  if (!json) return null;
  try {
    const isi = JSON.parse(json);
    return isi && typeof isi === "object" && typeof isi.l === "string" ? isi : null;
  } catch {
    return null;
  }
}

function kataPenting(teks: string): Set<string> {
  return new Set(
    teks
      .toLowerCase()
      .match(/[a-z0-9]+/g)
      ?.filter((k) => k.length >= 3) ?? [],
  );
}

/**
 * Apakah sepotong balasan menyebut harga.
 *
 * Sengaja longgar, dan longgar memang arah yang benar di sini: melewatkan
 * harga yang disebut berarti kehilangan satu-satunya cara mengenali orang yang
 * tidak sanggup, sementara salah mengira ada harga cuma membuat satu pesan
 * pendek terbaca sedikit lebih hati-hati. Ongkos kedua kesalahan itu jauh
 * berbeda.
 *
 * "Rp" apa pun bentuknya, atau angka empat digit ke atas dengan atau tanpa
 * pemisah ribuan. Angka empat digit sengaja jadi batas bawah: nomor rumah,
 * ukuran, dan jumlah pesanan hampir selalu di bawah itu, harga hampir selalu
 * di atasnya.
 */
export function menyebutHarga(teks: string): boolean {
  if (/\brp\.?\s?\d/i.test(teks)) return true;
  return /(?<!\d)\d{1,3}(?:[.,]\d{3})+(?!\d)|(?<!\d)\d{4,}(?!\d)/.test(teks);
}

/** Jaccard. Cukup untuk "apakah ini pertanyaan yang itu-itu juga". */
function mirip(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let sama = 0;
  for (const k of a) if (b.has(k)) sama++;
  return sama / (a.size + b.size - sama);
}

/**
 * Baca satu pesan pelanggan, simpan hasilnya, dan putuskan apakah manusia
 * perlu ikut.
 *
 * Tidak pernah melempar. Lapisan ini pelengkap, dan pelengkap yang bisa
 * menjatuhkan balasan ke pelanggan lebih merugikan daripada tidak ada.
 */
export async function catatRasa(params: {
  conversationId: string;
  messageId: string;
  teks: string;
}): Promise<Rasa | null> {
  try {
    const percakapan = await prisma.conversation.findUnique({
      where: { id: params.conversationId },
      include: { contact: true },
    });
    if (!percakapan) return null;

    const riwayat = await prisma.message.findMany({
      where: { conversationId: params.conversationId },
      orderBy: { createdAt: "desc" },
      take: JENDELA,
      select: { id: true, role: true, content: true, createdAt: true, rasa: true },
    });

    const sekarang = Date.now();

    // Deret pesan customer paling belakang yang belum dijawab. Catatan sistem
    // dilewati: dia tidak pernah sampai ke pelanggan, jadi dari sisi pelanggan
    // dia sama saja dengan tidak ada.
    const beruntunPesan: typeof riwayat = [];
    for (const m of riwayat) {
      if (m.role === "system") continue;
      if (m.role !== "customer") break;
      beruntunPesan.push(m);
    }
    const beruntun = Math.max(1, beruntunPesan.length);

    // Yang dihitung: sejak pesan PERTAMA yang belum dijawab, bukan sejak yang
    // barusan. Yang bikin orang merasa didiamkan itu jarak sejak dia mulai
    // menunggu, bukan sejak kalimat terakhirnya.
    const paling = beruntunPesan[beruntunPesan.length - 1];
    const menungguDetik =
      beruntun >= 2 && paling
        ? Math.max(0, Math.round((sekarang - paling.createdAt.getTime()) / 1000))
        : 0;

    const pesanDiaSebelumnya = riwayat
      .filter((m) => m.role === "customer" && m.id !== params.messageId)
      .slice(0, 5);
    const rataPanjang =
      pesanDiaSebelumnya.length > 0
        ? pesanDiaSebelumnya.reduce((t, m) => t + m.content.length, 0) /
          pesanDiaSebelumnya.length
        : 0;
    const rasioPanjang = rataPanjang > 0 ? params.teks.length / rataPanjang : 1;

    const kunciSekarang = kataPenting(params.teks);
    const ulangPertanyaan = pesanDiaSebelumnya.filter(
      (m) => mirip(kunciSekarang, kataPenting(m.content)) >= AMBANG_MIRIP,
    ).length;

    const kontak = percakapan.contact;
    const masalahHari =
      kontak.masalah && kontak.masalahSejak
        ? (sekarang - kontak.masalahSejak.getTime()) / 86_400_000
        : null;
    const klaimBayarJam = kontak.klaimBayarSejak
      ? (sekarang - kontak.klaimBayarSejak.getTime()) / 3_600_000
      : null;

    const sejakDetik = percakapan.rasaSaat
      ? Math.max(0, Math.round((sekarang - percakapan.rasaSaat.getTime()) / 1000))
      : 0;

    // Balasan terakhir dari pihak kita menyebut harga?
    //
    // Sinyal kecil dengan akibat besar: "oh gitu ya kak" tidak berarti apa-apa
    // sendirian, tapi kalimat yang sama tepat sesudah angka disebut adalah
    // bentuk paling umum dari orang yang mundur karena kemahalan dan sungkan
    // mengatakannya. Lihat `setelahAngka` di packages/rasa.
    const balasanTerakhir = riwayat.find((m) => m.role === "ai" || m.role === "human");
    const setelahAngka = !!balasanTerakhir && menyebutHarga(balasanTerakhir.content);

    // Dibaca dari teks yang SUDAH dibersihkan, bukan dari yang mentah.
    //
    // Yang dibersihkan cuma struktur penanda, bukan kata-katanya, jadi tidak
    // ada isyarat perasaan yang hilang. Yang didapat: tidak ada satu pun jalur
    // di mana huruf dari luar bisa mempengaruhi blok yang nanti ditempel ke
    // dalam KONTEKS INTERNAL. Lihat ai/suntikan.ts.
    const { rasa, keadaan } = bacaRasa({
      teks: bersihkanTeksPelanggan(params.teks),
      sinyal: {
        beruntun,
        menungguDetik,
        rasioPanjang,
        ulangPertanyaan,
        masalahHari,
        klaimBayarJam,
        tahap: kontak.stage,
        setelahAngka,
      },
      keadaan: percakapan.rasaState,
      sejakDetik,
    });

    const ringkas: RasaPesan = {
      l: rasa.label,
      k: +rasa.kesal.toFixed(2),
      m: +rasa.minat.toFixed(2),
      a: rasa.alasan,
    };

    await prisma.message.update({
      where: { id: params.messageId },
      data: { rasa: JSON.stringify(ringkas) },
    });

    await prisma.conversation.update({
      where: { id: params.conversationId },
      data: {
        rasaState: keadaan,
        rasaLabel: rasa.label,
        rasaKesal: rasa.kesal,
        rasaMinat: rasa.minat,
        rasaPrioritas: prioritas(rasa),
        rasaAlasan: rasa.alasan.join(", ") || null,
        rasaYakin: rasa.keyakinan,
        rasaSaat: new Date(sekarang),
      },
    });

    // Bacaan pada giliran customer SEBELUMNYA, dipakai memastikan kesalnya
    // memang bertahan dan bukan satu kalimat ketus yang lewat. Diambil dari
    // baris pesannya sendiri, jadi tidak perlu kolom kedua di percakapan.
    const sebelumnya = bacaRasaPesan(
      riwayat.find((m) => m.role === "customer" && m.id !== params.messageId)?.rasa,
    );

    await terapkanEskalasi(percakapan, rasa, sebelumnya, {
      klaimBayarJam,
      masalahHari,
    });

    return rasa;
  } catch (err) {
    // Sengaja cuma dicatat. Bacaan rasa itu pelengkap; kegagalannya tidak boleh
    // menghalangi pesan pelanggan tersimpan atau dibalas.
    log.warn(`bacaan rasa gagal: ${err instanceof Error ? err.message : err}`);
    return null;
  }
}

async function terapkanEskalasi(
  percakapan: { id: string; needsHuman: boolean; aiEnabled: boolean; workspaceId: string },
  rasa: Rasa,
  sebelumnya: RasaPesan | null,
  sinyal: { klaimBayarJam: number | null; masalahHari: number | null },
) {
  // Sudah ditandai: jangan disentuh. Menimpanya berarti menghapus alasan yang
  // ditulis model atau yang ditulis eskalasi sebelumnya, dan pemilik toko
  // kehilangan keterangan yang justru dia butuhkan untuk memutuskan.
  if (percakapan.needsHuman) return;

  // Manusia memang sedang memegang obrolan ini. Menandainya "nunggu kamu" ke
  // orang yang sedang mengetik di layar itu bukan bantuan, itu gangguan.
  // Lencana di kotak masuk tetap terbarui, dan itu yang dia butuhkan.
  if (!percakapan.aiEnabled) return;

  const keputusan = perluManusia(rasa, sebelumnya ? { kesal: sebelumnya.k } : null, sinyal);
  if (keputusan.eskalasi === "tidak") return;

  await prisma.conversation.update({
    where: { id: percakapan.id },
    data: {
      needsHuman: true,
      // `handoffAt` SENGAJA dibiarkan kosong, bahkan untuk `serahkan`.
      //
      // Rem tiga jam dibaca di awal runAgentOnConversation, sebelum balasan
      // disusun. Kalau dinyalakan di sini, pelanggan yang barusan menuduh
      // tidak dijawab sama sekali — dan didiamkan tepat sesudah menuduh itu
      // tanggapan paling buruk yang bisa diberikan. Remnya dinyalakan di
      // applySideEffects, SESUDAH satu balasan tenang keluar.
      handoffAt: null,
      rasaSerahkan: keputusan.eskalasi === "serahkan",
      handoffReason: keputusan.alasan,
    },
  });

  log.info(
    `rasa mengeskalasi percakapan ${percakapan.id} (${keputusan.eskalasi}): ${keputusan.alasan}`,
  );
}
