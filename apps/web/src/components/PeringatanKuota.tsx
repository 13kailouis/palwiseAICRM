import Link from "next/link";

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
      className={`flex flex-wrap items-center justify-between gap-3 border-b px-6 py-2.5 text-sm ${
        kritis
          ? "border-red-200 bg-red-50 text-red-900"
          : "border-amber-200 bg-amber-50 text-amber-900"
      }`}
    >
      <p>
        {habis ? (
          <>
            <strong>Jatah balasan bulan ini habis.</strong> Chat pelanggan tidak
            dibalas otomatis sampai paketmu dinaikkan atau bulan berikutnya mulai.
          </>
        ) : (
          <>
            Sisa <strong>{sisa.toLocaleString("id-ID")} balasan</strong> di paket{" "}
            {namaPaket}. Kalau habis, asistenmu berhenti membalas pelanggan.
          </>
        )}
      </p>
      <Link
        href="/app/tagihan"
        className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium ${
          kritis ? "bg-red-600 text-white hover:bg-red-700" : "btn-ghost"
        }`}
      >
        {habis ? "Naikkan paket" : "Lihat paket"}
      </Link>
    </div>
  );
}
