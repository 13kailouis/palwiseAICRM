/**
 * Program ajak teman.
 *
 * Hadiahnya cair saat temanmu BERLANGGANAN, bukan saat dia mendaftar.
 * Memberi hadiah untuk pendaftaran mengundang akun palsu: satu orang bikin
 * lima email, memanen hadiahnya, lalu tidak pernah membayar, sementara kamu
 * tetap menanggung biaya AI untuk kelima akun itu.
 *
 * Dua sisi sama-sama dapat. Referral satu arah konversinya jauh lebih rendah,
 * karena yang diajak tidak punya alasan tambahan untuk ikut.
 */

/** Huruf yang tidak gampang tertukar saat dibacakan lewat telepon atau chat. */
const HURUF = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function buatKodeAjak(): string {
  let kode = "";
  for (let i = 0; i < 6; i++) {
    kode += HURUF[Math.floor(Math.random() * HURUF.length)];
  }
  return kode;
}

export function rapikanKodeAjak(masukan: string): string {
  return masukan
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 6);
}

/** Berapa bulan gratis yang didapat masing-masing pihak. */
export const BULAN_GRATIS_PENGAJAK = 1;
export const BULAN_GRATIS_YANG_DIAJAK = 1;

export function tautanAjak(kode: string, asal: string): string {
  return `${asal.replace(/\/$/, "")}/daftar?ajak=${kode}`;
}
