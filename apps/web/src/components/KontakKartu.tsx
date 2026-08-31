import Link from "next/link";
import { displayName } from "@palwise/db";
import { Avatar, StageBadge, formatJanji, formatWaktu } from "@/components/ui";

/**
 * Satu pelanggan dalam bentuk baris, khusus HP.
 *
 * Tabel tujuh kolom itu bentuk yang benar di layar lebar dan bentuk yang salah
 * di layar 375px: memaksakannya berarti orang harus menggeser ke samping untuk
 * membaca satu baris, dan begitu digeser dia kehilangan kolom nama yang jadi
 * patokannya. Bacanya jadi menghafal, bukan melihat.
 *
 * Dulu tiap kartu memuat pilihan tahap, tombol simpan, dan dua tautan langsung
 * di badannya. Itu membuat satu pelanggan setinggi setengah layar, jadi daftar
 * sepuluh orang perlu digulir berkali-kali cuma untuk dilihat sekilas. Sekarang
 * bentuknya baris ringkas seperti daftar kontak di app chat: foto, nama, nomor,
 * dan beberapa lencana keadaan. Seluruh barisnya satu ketukan menuju profil,
 * dan di sanalah tahap diubah, keluhan dibereskan, dan obrolan dibuka. Yang
 * sering dilakukan tidak hilang, cuma pindah satu ketukan, dan sepuluh
 * pelanggan kini muat dalam satu layar.
 */
export function KontakKartu({
  contact,
  menggantung,
}: {
  contact: {
    id: string;
    name: string;
    waPushName: string | null;
    waFotoPath: string | null;
    waJid: string | null;
    phone: string | null;
    email: string | null;
    businessName: string | null;
    industry: string | null;
    tags: string;
    stage: string;
    masalah: string | null;
    masalahSejak: Date | null;
    closedAt: Date | null;
    janjiPada: Date | null;
    janjiCatatan: string | null;
    updatedAt: Date;
    conversations: { id: string; lastMessageAt: Date }[];
  };
  menggantung: (sejak: Date) => string;
}) {
  const obrolan = contact.conversations[0];
  const janjiMendatang =
    contact.janjiPada && contact.janjiPada.getTime() > Date.now();

  return (
    <Link
      href={`/app/kontak/${contact.id}`}
      className="flex items-center gap-3 px-4 py-3 transition active:bg-ink-50"
    >
      <Avatar nama={displayName(contact)} ukuran={44} fotoPath={contact.waFotoPath} />

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className="truncate font-medium text-ink-900">
            {displayName(contact)}
          </p>
          <span className="shrink-0 text-[11px] text-ink-400">
            {formatWaktu(obrolan?.lastMessageAt ?? contact.updatedAt)}
          </span>
        </div>

        <p className="truncate text-xs text-ink-500">
          {contact.phone ??
            (contact.waJid?.endsWith("@lid")
              ? "nomor disembunyikan WhatsApp"
              : "nomor tidak diketahui")}
        </p>

        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          {/* Kalau selesai dan ada tanggalnya, lencana "selesai 1 Agu" di bawah
              sudah menyebut tahapnya, jadi lencana tahap polos di sini cuma
              mengulang kata yang sama. */}
          {!(contact.stage === "selesai" && contact.closedAt) && (
            <StageBadge stage={contact.stage} />
          )}
          {/* Keluhan itu yang paling mendesak, jadi lencananya merah dan ikut
              membawa sudah berapa lama menggantung. Tombol "sudah beres"-nya
              ada di profil. */}
          {contact.masalah && (
            <span className="badge bg-red-50 text-red-700">
              keluhan
              {contact.masalahSejak ? ` · ${menggantung(contact.masalahSejak)}` : ""}
            </span>
          )}
          {janjiMendatang && (
            <span className="badge bg-amber-50 text-amber-800">
              {formatJanji(contact.janjiPada!)}
            </span>
          )}
          {/* Tahap saja tidak memberi tahu KAPAN selesainya. Yang beres tadi
              pagi dan yang beres sebulan lalu kelihatan sama, padahal yang satu
              perlu dicek uangnya sekarang. */}
          {contact.stage === "selesai" && contact.closedAt && (
            <span className="badge bg-ink-100 text-ink-500">
              selesai {formatWaktu(contact.closedAt)}
            </span>
          )}
        </div>
      </div>

      {/* Tanda "bisa dibuka", seperti baris kontak di app biasa. */}
      <svg
        viewBox="0 0 24 24"
        width="18"
        height="18"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="shrink-0 text-ink-300"
        aria-hidden="true"
      >
        <path d="M9 6l6 6-6 6" />
      </svg>
    </Link>
  );
}
