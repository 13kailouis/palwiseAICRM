/**
 * Kapan manusia harus ikut, diputuskan kode dan bukan model.
 *
 * Sekarang `needsHuman` cuma naik kalau model sendiri mengisi `handoff: true`,
 * atau kalau dia menjanjikan pengecekan ke tim. Dua-duanya bergantung pada
 * model menyadari sesuatu, dan yang paling perlu disadari justru yang paling
 * sering luput: pelanggan yang marahnya menumpuk pelan-pelan.
 *
 * DUA TINGKAT, DAN BEDANYA BUKAN DETAIL TEKNIS.
 *
 * `tandai`  → needsHuman: true, handoffAt: null
 *             Kelihatan di dashboard, TAPI rem tiga jam tidak menyala. Asisten
 *             tetap menjawab, dengan sikap tenang. Mendiamkan orang yang sedang
 *             kesal justru menambah marahnya, dan itu persis kejadian yang
 *             sudah dibayar mahal dan ditulis panjang di core/conversation.ts.
 *
 * `serahkan`→ needsHuman: true, handoffAt: sekarang
 *             Rem menyala. Dipakai cuma waktu manusia memang HARUS memegang:
 *             ada tuduhan, ada ancaman, atau uang pelanggan menggantung.
 *
 * Menyeragamkan keduanya jadi satu adalah cara paling cepat merusak fitur ini.
 */

import { Rasa } from "./rasa.js";

export type Eskalasi = "tidak" | "tandai" | "serahkan";

export interface Keputusan {
  eskalasi: Eskalasi;
  /** Alasan untuk tim, bahasa Indonesia, siap masuk ke handoffReason. */
  alasan: string;
}

const TIDAK: Keputusan = { eskalasi: "tidak", alasan: "" };

export function perluManusia(
  rasa: Rasa,
  /** Bacaan pada giliran customer sebelumnya, kalau ada. */
  sebelumnya: Pick<Rasa, "kesal"> | null,
  sinyal: { klaimBayarJam: number | null; masalahHari: number | null },
): Keputusan {
  // Tuduhan dan ancaman: langsung, tanpa menunggu giliran kedua. Kalimat
  // seperti "saya laporkan" tidak punya bacaan kedua, dan menunggu satu
  // giliran lagi untuk memastikannya berarti satu balasan otomatis lagi ke
  // orang yang sedang menyiapkan laporan.
  if (rasa.keras) {
    return {
      eskalasi: "serahkan",
      alasan: `Ada tuduhan atau ancaman dari pelanggan${sisipAlasan(rasa)}`,
    };
  }

  // Uang pelanggan menggantung lebih dari sehari. Ini keluhan yang paling
  // mahal untuk didiamkan, dan satu-satunya yang tidak bisa diselesaikan
  // asisten dengan kalimat apa pun.
  if ((sinyal.klaimBayarJam ?? 0) >= 24) {
    return {
      eskalasi: "serahkan",
      alasan: `Pelanggan sudah bayar ${Math.round(sinyal.klaimBayarJam!)} jam lalu dan urusannya belum beres`,
    };
  }

  if (rasa.kesal >= 0.85) {
    return {
      eskalasi: "serahkan",
      alasan: `Pelanggan sangat kesal${sisipAlasan(rasa)}`,
    };
  }

  // Dua giliran berturut-turut kesal. Satu giliran saja tidak cukup: orang
  // menulis satu kalimat ketus lalu tenang lagi itu biasa, dan menandai
  // semuanya sama saja dengan tidak menandai apa pun.
  if (rasa.kesal >= 0.55 && (sebelumnya?.kesal ?? 0) >= 0.55) {
    return {
      eskalasi: "tandai",
      alasan: `Pelanggan kesal di dua pesan berturut-turut${sisipAlasan(rasa)}`,
    };
  }

  // Keluhan yang menggantung tiga hari. Bukan soal nadanya lagi — ini soal
  // waktu, dan waktu tidak akan membaik sendiri.
  if ((sinyal.masalahHari ?? 0) >= 3) {
    return {
      eskalasi: "tandai",
      alasan: `Keluhan pelanggan sudah ${Math.round(sinyal.masalahHari!)} hari belum dibereskan`,
    };
  }

  return TIDAK;
}

function sisipAlasan(rasa: Rasa): string {
  return rasa.alasan.length > 0 ? ` (${rasa.alasan.join(", ")})` : "";
}
