"use client";

import { useRouter } from "next/navigation";
import { RingkasanAI } from "@/components/RingkasanAI";

/**
 * Pembungkus [RingkasanAI] untuk halaman yang digambar di server.
 *
 * Halaman profil pelanggan tidak menyegarkan datanya sendiri seperti kotak
 * masuk, jadi sesudah ringkasannya jadi, halamannya yang perlu dimuat ulang.
 */
export function RingkasanKontak({
  contactId,
  isi,
  dibuatPada,
  pesanTerakhir,
}: {
  contactId: string;
  isi: string | null;
  dibuatPada: string | null;
  pesanTerakhir: string | null;
}) {
  const router = useRouter();

  return (
    <RingkasanAI
      contactId={contactId}
      isi={isi}
      dibuatPada={dibuatPada}
      pesanTerakhir={pesanTerakhir}
      onSelesai={() => router.refresh()}
    />
  );
}
