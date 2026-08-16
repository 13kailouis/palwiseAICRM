/**
 * @palwise/rasa — lapisan afektif Palwise.
 *
 * Membaca perasaan PELANGGAN dari pesannya dan dari perilakunya, lalu memilih
 * SIKAP asisten untuk giliran itu. Asisten sendiri tidak punya suasana hati:
 * yang tetap padanya cuma watak, dan watak dipilih pemilik usaha sekali.
 *
 * Murni matematika. Tidak memanggil API apa pun, tidak butuh dependency, dan
 * tidak menambah satu token pun ke tagihan kecuali waktu bacaannya memang
 * tidak netral.
 *
 * Rancangan lengkap dan alasannya: bisnis/08-lapisan-rasa.md
 */

export { PAD, IntiRasa, jepit, jepit01 } from "./pad.js";
export type { Appraisal, KeadaanTersimpan } from "./pad.js";
export { APPRAISAL_KOSONG } from "./pad.js";

export { baca, rapikan, SINYAL_KOSONG } from "./baca.js";
export type { Bacaan, SinyalPerilaku } from "./baca.js";

export { FRASA, KATA, EMOJI, SERUAN, PENGUAT, NEGASI, TANDA_TERIMA } from "./leksikon.js";
export type { Isyarat, Tanda } from "./leksikon.js";

export { bacaRasa, prioritas, AMBANG_MENAMBAH, RASA_NETRAL } from "./rasa.js";
export type { Rasa, LabelRasa, HasilBaca } from "./rasa.js";

export {
  pilihSikap,
  ringkasSikap,
  suhuAkhir,
  aturanWatak,
  aturanKetenangan,
  watakSah,
  SIKAP_DIAM,
  WATAK,
} from "./sikap.js";
export type { Sikap, Watak } from "./sikap.js";

export { perluManusia } from "./eskalasi.js";
export type { Eskalasi, Keputusan } from "./eskalasi.js";
