import Link from "next/link";
import { InfoTip } from "@/components/InfoTip";

/**
 * Pengingat kuota di atas halaman.
 *
 * Sengaja diam sampai pemakaian lewat 70 persen. Kalau muncul terus sejak
 * balasan pertama, orang berhenti membacanya dan justru buta saat benar-benar
 * mau habis.
 */
export function PeringatanKuota({
  terpakai,
  batas,
  namaPaket,
}: {
  terpakai: number;
  batas: number;
  namaPaket: string;
}) {
  if (batas <= 0) return null;

  const sisa = Math.max(0, batas - terpakai);
  const rasio = terpakai / batas;
  if (rasio < 0.7) return null;

  const habis = sisa === 0;
  const kritis = habis || rasio >= 0.9;

  return (
    <div
      className={`flex items-center gap-2 border-b px-4 py-2 text-sm sm:px-6 ${
        kritis
          ? "border-red-200 bg-red-50 text-red-900"
          : "border-amber-200 bg-amber-50 text-amber-900"
      }`}
    >
      <p className="min-w-0 flex-1 truncate">
        {habis ? (
          <strong>Jatah balasan bulan ini habis.</strong>
        ) : (
          <>
            Sisa <strong>{sisa.toLocaleString("id-ID")} balasan</strong> di paket{" "}
            {namaPaket}.
          </>
        )}
      </p>
      <InfoTip label="Apa artinya" judul="Apa artinya">
        {habis
          ? "Chat pelanggan nggak dibalas otomatis sampai paketmu dinaikkan atau bulan berikutnya mulai. Chatnya tetap masuk dan bisa kamu balas sendiri."
          : "Kalau jatahnya habis, asisten berhenti bales pelanggan otomatis sampai paket dinaikkan atau bulan berikutnya mulai."}
      </InfoTip>
      <Link
        href="/app/tagihan"
        className={`shrink-0 rounded-lg px-3 py-1 text-xs font-medium ${
          kritis
            ? "bg-red-600 text-white hover:bg-red-700"
            : "border border-amber-300 bg-white/70 text-amber-900 hover:bg-white"
        }`}
      >
        {habis ? "Naikkan paket" : "Lihat paket"}
      </Link>
    </div>
  );
}
