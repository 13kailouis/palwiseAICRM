import { requireUser } from "@/lib/auth";
import { Tanya } from "@/components/Tanya";

export const dynamic = "force-dynamic";

/**
 * Ruang perintah.
 *
 * Tanpa PageHeader, sengaja. Halaman ini setinggi layar dan isinya kotak
 * obrolan; kepala halaman setinggi 80px di atasnya cuma memotong ruang baca
 * tanpa mengatakan apa pun yang tidak sudah ditulis di kepala kotaknya sendiri.
 * Pola yang sama dengan Kotak masuk.
 */
export default async function TanyaPage({
  searchParams,
}: {
  searchParams: Promise<{ s?: string; q?: string }>;
}) {
  await requireUser();
  const { s, q } = await searchParams;

  return (
    <div className="h-full">
      <Tanya key={q || "tanya"} sesiAwal={q ? null : s ?? null} pesanAwal={typeof q === "string" ? q.slice(0, 2000) : ""} />
    </div>
  );
}
