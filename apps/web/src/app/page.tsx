import { HalamanJualan } from "@/components/HalamanJualan";
import { JUALAN_UMUM } from "@/lib/jualan";

/**
 * Halaman depan: versi UMUM halaman jualan.
 *
 * Susunannya ada di `components/HalamanJualan.tsx` dan dipakai juga oleh
 * halaman per bidang usaha (/klinik, /dealer, /properti, dan seterusnya).
 * Isinya, termasuk judul dan contoh chat, ada di `lib/jualan.ts`.
 *
 * 13 September 2026: halaman depan sempat dikhususkan untuk kursus. Itu
 * dikembalikan jadi umum atas permintaan pemilik produk, dan tiap bidang
 * sekarang punya halamannya sendiri alih-alih merebut halaman depan.
 */
export default function LandingPage() {
  return <HalamanJualan isi={JUALAN_UMUM} />;
}
