import type { Metadata } from "next";
import { HalamanJualan } from "@/components/HalamanJualan";
import { jualanUntuk, metadataJualan } from "@/lib/jualan";

/** Halaman jualan khusus bidang ini. Isinya di lib/jualan.ts, kerangkanya di HalamanJualan. */
const isi = jualanUntuk("klinik");

export const metadata: Metadata = metadataJualan(isi);

export default function Page() {
  return <HalamanJualan isi={isi} />;
}
