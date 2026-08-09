import Link from "next/link";
import { displayName, parseJsonArray } from "@palwise/db";
import { formatJanji, formatWaktu } from "@/components/ui";
import { updateContactAction } from "@/app/actions/contact";

/**
 * Satu pelanggan dalam bentuk kartu, khusus HP.
 *
 * Tabel tujuh kolom itu bentuk yang benar di layar lebar, dan bentuk yang
 * salah di layar 375px. Memaksakannya di HP berarti orang harus menggeser ke
 * samping untuk membaca satu baris, dan begitu digeser dia kehilangan kolom
 * nama yang jadi patokannya. Bacanya jadi menghafal, bukan melihat.
 *
 * Di kartu, urutannya diatur ulang menurut kepentingan, bukan menurut lebar
 * kolom: nama dan masalahnya duluan, keterangan yang jarang dilihat paling
 * bawah.
 */
export function KontakKartu({
  contact,
  tahapan,
  menggantung,
}: {
  contact: {
    id: string;
    name: string;
    waPushName: string | null;
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
  tahapan: string[];
  menggantung: (sejak: Date) => string;
}) {
  const tags = parseJsonArray(contact.tags);
  const obrolan = contact.conversations[0];

  return (
    <div className="px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            href={`/app/kontak/${contact.id}`}
            className="block truncate font-medium text-ink-900"
          >
            {displayName(contact)}
          </Link>
          <p className="mt-0.5 truncate text-xs text-ink-500">
            {contact.phone ??
              (contact.waJid?.endsWith("@lid")
                ? "nomor disembunyikan WhatsApp"
                : "nomor tidak diketahui")}
          </p>
        </div>
        <span className="shrink-0 text-[11px] text-ink-400">
          {formatWaktu(obrolan?.lastMessageAt ?? contact.updatedAt)}
        </span>
      </div>

      {contact.janjiPada && contact.janjiPada.getTime() > Date.now() && (
        <p className="mt-2 text-xs text-ink-600">
          {formatJanji(contact.janjiPada)}
          {contact.janjiCatatan && ` · ${contact.janjiCatatan}`}
        </p>
      )}

      {contact.masalah && (
        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5">
          <p className="text-xs leading-relaxed text-red-900">{contact.masalah}</p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            {contact.masalahSejak && (
              <span className="text-[11px] text-red-700">
                {menggantung(contact.masalahSejak)}
              </span>
            )}
            <form action={updateContactAction}>
              <input type="hidden" name="id" value={contact.id} />
              <input type="hidden" name="bereskanMasalah" value="1" />
              <button
                type="submit"
                className="tap-aman text-[11px] font-medium text-red-700 underline"
              >
                Tandai sudah beres
              </button>
            </form>
          </div>
        </div>
      )}

      {(contact.businessName || tags.length > 0) && (
        <div className="mt-3 space-y-2">
          {contact.businessName && (
            <p className="text-sm text-ink-600">{contact.businessName}</p>
          )}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {tags.map((t) => (
                <span key={t} className="badge bg-ink-100 text-ink-700">
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tahap saja tidak memberi tahu kapan. "Selesai" yang terjadi tadi pagi
          dan yang terjadi sebulan lalu kelihatan sama persis, padahal yang satu
          perlu dicek uangnya sekarang. */}
      {contact.stage === "selesai" && contact.closedAt && (
        <p className="mt-3 text-xs text-ink-500">
          selesai {formatWaktu(contact.closedAt)}
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <form action={updateContactAction} className="flex items-center gap-2">
          <input type="hidden" name="id" value={contact.id} />
          <select
            name="stage"
            defaultValue={contact.stage}
            aria-label="Tahap pelanggan"
            className="min-h-[40px] rounded-lg border border-ink-200 bg-white px-2.5 text-sm capitalize outline-none focus:border-brand-500"
          >
            {tahapan.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <button type="submit" className="btn-ghost min-h-[40px] px-3 text-sm">
            Simpan
          </button>
        </form>

        <Link
          href={`/app/kontak/${contact.id}`}
          className="tap-aman ml-auto text-sm text-brand-700"
        >
          Profil
        </Link>
        {obrolan && (
          <Link
            href={`/app/inbox?c=${obrolan.id}`}
            className="tap-aman text-sm text-brand-700"
          >
            Obrolan
          </Link>
        )}
      </div>
    </div>
  );
}
