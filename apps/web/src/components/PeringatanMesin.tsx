import Link from "next/link";
import { workerHealth } from "@/lib/worker";
import { keSitus } from "@/lib/situs";
import { InfoTip } from "@/components/InfoTip";

/** Service problems must be understandable in the product, including previews.
 * An unavailable worker also means WhatsApp synchronization cannot be verified.
 */
export async function PeringatanMesin() {
  const health = await workerHealth();
  if (health?.aiConfigured) return null;

  return (
    <div role="status" className="flex items-center gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs leading-relaxed text-amber-900 sm:px-6">
      <p className="min-w-0 flex-1">Balasan otomatis belum tersedia. Sementara, balas pelanggan langsung di WhatsApp.</p>
      <InfoTip label="Tentang gangguan layanan" judul="Balasan otomatis belum tersedia">
        <p>{health ? "Layanan AI belum tersedia untuk menjawab. Kamu tetap bisa menangani pelanggan langsung melalui WhatsApp." : "Status sambungan dan sinkronisasi WhatsApp belum dapat diperiksa. Percakapan terbaru mungkin belum terlihat di Palwise."}</p>
        <p className="mt-2">Jika berlanjut, <Link href={keSitus("/kontak")} className="underline underline-offset-4">hubungi tim Palwise</Link>.</p>
      </InfoTip>
    </div>
  );
}
