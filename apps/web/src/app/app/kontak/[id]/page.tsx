import Link from "next/link";
import { notFound } from "next/navigation";
import { displayName, parseJsonArray, prisma } from "@palwise/db";
import { requireUser } from "@/lib/auth";
import {
  PageHeader,
  formatJanji,
  formatWaktu,
  menggantung,
  untukIsianWaktu,
} from "@/components/ui";
import { deleteContactAction, updateContactAction } from "@/app/actions/contact";
import { TombolHapus } from "@/components/TombolHapus";
import { RingkasanKontak } from "@/components/RingkasanKontak";
import { PastikanJanji } from "@/components/PastikanJanji";
import { draftKabarJanji } from "@/lib/janji";

export const dynamic = "force-dynamic";

const STAGES = ["baru", "tertarik", "negosiasi", "closing", "selesai", "batal"];

/**
 * Profil satu pelanggan.
 *
 * Dulu tidak ada halaman ini sama sekali. Satu pelanggan cuma sebaris di tabel
 * dengan tujuh kolom, dan satu-satunya jalan untuk tahu lebih banyak adalah
 * membuka obrolannya lalu membaca sendiri dari atas. Akibatnya semua yang sudah
 * susah payah dikumpulkan sistem, bacaan AI atas lampiran, keluhan yang
 * tercatat, kapan dia masuk tahap selesai, tidak pernah bertemu di satu tempat.
 *
 * Halaman ini tempat semuanya bertemu, dan sekaligus satu-satunya tempat semua
 * datanya bisa dibetulkan.
 */
export default async function KontakDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();

  const contact = await prisma.contact.findFirst({
    where: { id, workspaceId: user.workspaceId },
    include: {
      conversations: {
        orderBy: { lastMessageAt: "desc" },
        select: {
          id: true,
          lastMessageAt: true,
          status: true,
          needsHuman: true,
          // Obrolan ruang coba tidak punya channel, jadi tidak ada nomor yang
          // bisa dikirimi apa pun. Tanpa penanda ini, tombol "kabari" muncul
          // untuk pelanggan yang mustahil dikabari.
          channelId: true,
        },
      },
    },
  });
  if (!contact) notFound();

  const [lampiran, totalLampiran, jumlahPesan, pertama] = await Promise.all([
    prisma.message.findMany({
      where: { conversation: { contactId: contact.id }, mediaPath: { not: null } },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: {
        id: true,
        role: true,
        content: true,
        mediaType: true,
        mediaPath: true,
        mediaSummary: true,
        createdAt: true,
      },
    }),
    // Jumlah sesungguhnya, terpisah dari yang ditampilkan.
    //
    // Judulnya dulu memakai panjang daftar yang sudah dipotong, jadi pelanggan
    // dengan 87 lampiran tetap tertulis "Lampiran (30)". Angka yang salah lebih
    // buruk daripada tidak ada angka: orang berhenti menggulir karena merasa
    // sudah melihat semuanya.
    prisma.message.count({
      where: { conversation: { contactId: contact.id }, mediaPath: { not: null } },
    }),
    prisma.message.count({ where: { conversation: { contactId: contact.id } } }),
    prisma.message.findFirst({
      where: { conversation: { contactId: contact.id } },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
    }),
  ]);

  const tags = parseJsonArray(contact.tags);
  const obrolan = contact.conversations[0];

  return (
    <>
      <PageHeader
        title={displayName(contact)}
        description={
          contact.phone ??
          (contact.waJid?.endsWith("@lid")
            ? "nomor disembunyikan WhatsApp"
            : "nomor tidak diketahui")
        }
        action={
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/app/kontak" className="btn-ghost">
              Semua pelanggan
            </Link>
            {/* Hitam, bukan biru. Biru disimpan untuk tombol yang
                MENYELESAIKAN tujuan halaman ini, dan tujuan halaman ini
                membetulkan data orangnya, bukan pindah ke layar lain. */}
            {obrolan && (
              <Link href={`/app/inbox?c=${obrolan.id}`} className="btn-ink">
                Buka obrolan
              </Link>
            )}
          </div>
        }
      />

      <div className="space-y-5 p-4 sm:p-6">
        {/* Keluhan paling atas, mendahului apa pun.

            Ini satu-satunya hal di halaman ini yang merugikan pelanggan selama
            didiamkan. Apa pun yang menyalipnya ke atas berarti menyuruh orang
            membaca hal lain dulu sebelum tahu ada yang sedang marah. */}
        {contact.masalah && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
            <p className="text-sm font-medium text-red-900">Keluhan belum beres</p>
            <p className="mt-1 text-sm leading-relaxed text-red-900">
              {contact.masalah}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              {contact.masalahSejak && (
                <span className="text-xs text-red-700">
                  {menggantung(contact.masalahSejak)}
                </span>
              )}
              <form action={updateContactAction}>
                <input type="hidden" name="id" value={contact.id} />
                <input type="hidden" name="bereskanMasalah" value="1" />
                <button
                  type="submit"
                  className="tap-aman text-xs font-medium text-red-700 underline"
                >
                  Tandai sudah beres
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Janji yang belum lewat ditaruh setinggi keluhan, karena dua-duanya
            punya tenggat. Bedanya keluhan merugikan selama didiamkan, janji
            merugikan kalau kelewat. */}
        {contact.janjiPada && contact.janjiPada.getTime() > Date.now() && (
          <div
            className={`flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border px-4 py-3 ${
              contact.janjiDipastikan
                ? "border-brand-200 bg-brand-50"
                : "border-amber-300 bg-amber-50"
            }`}
          >
            <p className="flex-1 text-sm text-ink-800">
              <span className="font-medium">{formatJanji(contact.janjiPada)}</span>
              {contact.janjiCatatan && ` · ${contact.janjiCatatan}`}
            </p>
            {contact.janjiDipastikan ? (
              <span className="text-xs text-ink-600">
                sudah dipastikan
                {/* Pengingat cuma dikirim untuk janji yang persis ini. Kalau
                    jadwalnya digeser, penandanya tidak cocok lagi dan
                    pengingatnya terpasang ulang sendiri. */}
                {contact.pengingatUntuk &&
                contact.janjiPada &&
                contact.pengingatUntuk.getTime() === contact.janjiPada.getTime()
                  ? " · pengingat sudah dikirim"
                  : ""}
              </span>
            ) : (
              <>
                {/* Kalimatnya menyebut siapa yang belum melakukan apa, bukan
                    cuma "menunggu". Asisten tidak pernah tahu kalendermu, jadi
                    yang menutup jarak itu kamu, sekali klik. */}
                <span className="text-xs text-amber-800">
                  Baru dicatat dari obrolan, belum kamu pastikan
                </span>
                <PastikanJanji
                  contactId={contact.id}
                  draft={draftKabarJanji(
                    contact.name || contact.waPushName || "",
                    contact.janjiPada,
                    contact.janjiCatatan,
                  )}
                  bisaKabari={contact.conversations.some((o) => !!o.channelId)}
                />
              </>
            )}
          </div>
        )}

        <div className="grid gap-5 lg:grid-cols-3">
          <div className="space-y-5 lg:col-span-2">
            {/* Tombol ringkasnya cuma muncul kalau memang ada obrolannya.
                Kalau tidak, sekali klik dia pasti gagal dengan "belum punya
                obrolan", dan tombol yang sudah pasti gagal itu jebakan, bukan
                fitur. */}
            <div className="card-pad">
              {obrolan ? (
                <RingkasanKontak
                  contactId={contact.id}
                  isi={contact.ringkasan}
                  dibuatPada={contact.ringkasanAt?.toISOString() ?? null}
                  pesanTerakhir={obrolan.lastMessageAt.toISOString()}
                />
              ) : (
                <>
                  <h4 className="text-sm font-semibold text-ink-900">Ringkasan AI</h4>
                  <p className="mt-2 text-xs leading-relaxed text-ink-500">
                    Belum ada obrolan yang bisa diringkas.
                  </p>
                </>
              )}
            </div>

            <div className="card-pad">
              <h2 className="text-sm font-semibold text-ink-900">
                Lampiran {totalLampiran > 0 && `(${totalLampiran})`}
              </h2>
              {totalLampiran > lampiran.length && (
                <p className="mt-1 text-xs text-ink-500">
                  Yang ditampilkan {lampiran.length} terbaru. Sisanya ada di
                  obrolannya.
                </p>
              )}
              {lampiran.length === 0 ? (
                <p className="mt-2 text-sm text-ink-500">
                  Belum ada foto atau berkas di obrolan ini.
                </p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {lampiran.map((m) => (
                    <li key={m.id}>
                      <a
                        href={`/api/media/${encodeURIComponent(m.mediaPath ?? "")}`}
                        target="_blank"
                        rel="noreferrer"
                        className="block rounded-lg border border-ink-200 px-3 py-2.5 transition hover:border-brand-400"
                      >
                        {/* Bacaan AI duluan, jenis berkasnya belakangan.
                            "bukti transfer Rp 7.475.000" itu yang dicari
                            orang; "image/jpeg" tidak pernah dicari siapa
                            pun. */}
                        <p className="text-sm leading-relaxed text-ink-800">
                          {m.mediaSummary ||
                            m.content ||
                            `Lampiran ${m.mediaType}`}
                        </p>
                        <p className="mt-1 text-xs text-ink-400">
                          {m.role === "customer" ? "dari pelanggan" : "kita kirim"} ·{" "}
                          {m.mediaType} · {formatWaktu(m.createdAt)}
                        </p>
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="card-pad">
              <h2 className="text-sm font-semibold text-ink-900">Riwayat</h2>
              <dl className="mt-3 grid gap-3 sm:grid-cols-2">
                <div>
                  <dt className="text-xs text-ink-500">Pertama chat</dt>
                  <dd className="text-sm text-ink-900">
                    {pertama ? formatWaktu(pertama.createdAt) : "-"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-500">Terakhir chat</dt>
                  <dd className="text-sm text-ink-900">
                    {obrolan ? formatWaktu(obrolan.lastMessageAt) : "-"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-500">Jumlah pesan</dt>
                  <dd className="text-sm text-ink-900">{jumlahPesan}</dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-500">Masuk tahap selesai</dt>
                  <dd className="text-sm text-ink-900">
                    {contact.closedAt ? formatWaktu(contact.closedAt) : "belum"}
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          <div className="space-y-5">
            <div className="card-pad">
              <h2 className="text-sm font-semibold text-ink-900">Tahap</h2>
              <form
                action={updateContactAction}
                className="mt-3 flex flex-wrap items-center gap-2"
              >
                <input type="hidden" name="id" value={contact.id} />
                <select
                  name="stage"
                  defaultValue={contact.stage}
                  aria-label="Tahap pelanggan"
                  className="input min-h-[40px] flex-1 capitalize"
                >
                  {STAGES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <button className="btn-ghost min-h-[40px]" type="submit">
                  Simpan
                </button>
              </form>
              {/* Yang menentukan kalimat soal uang itu pengakuan bayarnya,
                  BUKAN tahapnya. Tahap "selesai" juga dipakai untuk urusan yang
                  rampung tanpa ada uang yang berpindah, dan kalimat ini pernah
                  menuduh pelanggan mengaku bayar padahal dia tidak pernah
                  menyebut apa pun soal itu. */}
              {contact.klaimBayarSejak && (
                <p className="mt-2 text-xs text-ink-500">
                  Dia mengaku sudah bayar {formatWaktu(contact.klaimBayarSejak)}.
                  Bukti transfernya, kalau ada, muncul di daftar lampiran.
                </p>
              )}
            </div>

            {/* Janji temu.

                Dua kolom, bukan sistem booking: tidak ada pengecekan bentrok
                dan tidak ada kalender. Ini catatan bertanggal yang diisi AI
                dari obrolan, dan kalimat di bawahnya sengaja mengaku begitu.
                Kalau produknya berlagak sebagai sistem booking, orang berhenti
                mencatat di buku mereka sendiri, lalu kehilangan janji waktu AI
                salah dengar. */}
            <form action={updateContactAction} className="card-pad space-y-4">
              <input type="hidden" name="id" value={contact.id} />
              <h2 className="text-sm font-semibold text-ink-900">Janji temu</h2>

              <div>
                <label className="text-xs text-ink-500" htmlFor="janjiPada">
                  Kapan
                </label>
                <input
                  id="janjiPada"
                  name="janjiPada"
                  type="datetime-local"
                  defaultValue={untukIsianWaktu(contact.janjiPada)}
                  className="input mt-1"
                />
              </div>

              <div>
                <label className="text-xs text-ink-500" htmlFor="janjiCatatan">
                  Untuk apa
                </label>
                <input
                  id="janjiCatatan"
                  name="janjiCatatan"
                  defaultValue={contact.janjiCatatan ?? ""}
                  placeholder="kontrol gigi, survei unit, meeting online"
                  className="input mt-1"
                />
                <p className="mt-1 text-xs text-ink-400">
                  Boleh tatap muka, boleh online. Tulis sekalian caranya, misalnya
                  &ldquo;meeting lewat Google Meet&rdquo;, biar kamu tidak salah
                  siap-siap.
                </p>
              </div>

              <button className="btn-ghost w-full" type="submit">
                Simpan janji
              </button>
              <p className="text-xs leading-relaxed text-ink-400">
                Terisi otomatis dari obrolan, tapi asisten tidak tahu isi
                kalendermu, jadi yang dia catat selalu berstatus permintaan
                sampai kamu pastikan. Dia juga tidak pernah menghapus janji yang
                sudah ada, cuma menggantinya kalau ada kesepakatan baru.
                Kosongkan tanggalnya untuk membatalkan.
              </p>
            </form>

            {/* Satu formulir untuk semua data, bukan satu formulir per baris.
                Yang dibetulkan orang biasanya lebih dari satu sekaligus, dan
                menyimpan enam kali untuk satu koreksi bikin orang menyerah di
                tengah jalan. */}
            <form action={updateContactAction} className="card-pad space-y-4">
              <input type="hidden" name="id" value={contact.id} />
              <h2 className="text-sm font-semibold text-ink-900">Data pelanggan</h2>

              <div>
                <label className="text-xs text-ink-500" htmlFor="nama">
                  Nama
                </label>
                <input
                  id="nama"
                  name="name"
                  defaultValue={contact.name}
                  placeholder={contact.waPushName ?? "belum tahu"}
                  className="input mt-1"
                />
              </div>

              <div>
                <label className="text-xs text-ink-500" htmlFor="email">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  defaultValue={contact.email ?? ""}
                  className="input mt-1"
                />
              </div>

              {/* Dua kolom usaha ini sengaja dibiarkan boleh kosong dan
                  keterangannya jujur.

                  Palwise bukan cuma untuk jualan antar perusahaan. Warung,
                  klinik, salon, dan hotel pembelinya orang biasa yang tidak
                  punya "nama usaha", dan dulu dua kolom ini selalu tampil
                  dengan tulisan "belum tahu" seolah datanya kurang lengkap
                  padahal memang tidak ada yang kurang. */}
              <div>
                <label className="text-xs text-ink-500" htmlFor="usaha">
                  Nama usaha
                </label>
                <input
                  id="usaha"
                  name="businessName"
                  defaultValue={contact.businessName ?? ""}
                  className="input mt-1"
                />
              </div>

              <div>
                <label className="text-xs text-ink-500" htmlFor="bidang">
                  Bidang usaha
                </label>
                <input
                  id="bidang"
                  name="industry"
                  defaultValue={contact.industry ?? ""}
                  className="input mt-1"
                />
                <p className="mt-1 text-xs text-ink-400">
                  Kosongkan saja kalau pembelinya orang biasa, bukan mewakili
                  usaha lain.
                </p>
              </div>

              <div>
                <label className="text-xs text-ink-500" htmlFor="minat">
                  Minatnya
                </label>
                <input
                  id="minat"
                  name="tags"
                  defaultValue={tags.join(", ")}
                  placeholder="pisahkan dengan koma"
                  className="input mt-1"
                />
              </div>

              <div>
                <label className="text-xs text-ink-500" htmlFor="catatan">
                  Catatan kamu
                </label>
                <textarea
                  id="catatan"
                  name="notes"
                  defaultValue={contact.notes}
                  rows={4}
                  placeholder="Hal yang cuma kamu tahu tentang dia."
                  className="input mt-1"
                />
              </div>

              <button className="btn-primary w-full" type="submit">
                Simpan
              </button>
            </form>

            {/* Hapus pelanggan.

                Fungsinya sudah lama ada tapi tidak pernah dipasang di layar
                mana pun, jadi selama ini tidak ada satu pun cara menghapus
                pelanggan dari dalam produk. Padahal ini yang dicari orang waktu
                ada yang salah masuk, waktu ada spam, dan waktu pelanggannya
                sendiri minta datanya dihapus.

                Kalimat konfirmasinya menyebut angka nyata, bukan ancaman samar.
                Orang perlu tahu persis apa yang hilang sebelum menekan
                tombolnya. */}
            <div className="card-pad">
              <h2 className="text-sm font-semibold text-ink-900">Hapus pelanggan</h2>
              <p className="mb-3 mt-1 text-xs leading-relaxed text-ink-500">
                Semua jejaknya ikut hilang dan tidak bisa dikembalikan.
              </p>
              <TombolHapus
                action={deleteContactAction}
                fields={{ id: contact.id }}
                label="Hapus pelanggan ini"
                penuh
                konfirmasi={`Menghapus ${displayName(contact)} juga menghapus ${jumlahPesan} pesan, ${lampiran.length} lampiran, catatanmu, dan janji temunya. Tidak bisa dikembalikan.`}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
