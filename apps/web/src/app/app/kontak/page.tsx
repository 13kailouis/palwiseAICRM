import Link from "next/link";
import {
  HANYA_PELANGGAN_ASLI,
  displayName,
  parseJsonArray,
  prisma,
} from "@palwise/db";
import { requireUser } from "@/lib/auth";
import {
  Avatar,
  PageHeader,
  formatJanji,
  formatWaktu,
  menggantung,
} from "@/components/ui";
import { updateContactAction } from "@/app/actions/contact";
import { KontakKartu } from "@/components/KontakKartu";
import { Kosong } from "@/components/Kosong";

export const dynamic = "force-dynamic";

const STAGES = ["baru", "tertarik", "negosiasi", "closing", "selesai", "batal"];

export default async function KontakPage({
  searchParams,
}: {
  searchParams: Promise<{ stage?: string; q?: string }>;
}) {
  const user = await requireUser();
  const { stage, q } = await searchParams;

  const where: any = { workspaceId: user.workspaceId, ...HANYA_PELANGGAN_ASLI };
  if (stage && STAGES.includes(stage)) where.stage = stage;

  // "masalah" bukan tahap, jadi dia saringan terpisah dan bisa dipakai
  // bersamaan dengan tahap mana pun.
  const cumaBermasalah = stage === "masalah";
  if (cumaBermasalah) {
    delete where.stage;
    where.masalah = { not: null };
  }

  // Sama seperti "masalah": janji temu juga bukan tahap. Orang yang Sabtu depan
  // mau datang bisa ada di tahap mana saja, dan yang dicari pemiliknya itu
  // "siapa saja yang mau datang", bukan "siapa yang tahapnya sekian".
  const cumaBerjanji = stage === "janji";
  if (cumaBerjanji) {
    delete where.stage;
    where.janjiPada = { gte: new Date() };
  }

  // Sumbu ketiga yang bukan tahap: yang mengaku sudah bayar. Spanduk uang di
  // Ringkasan mengarah ke sini, dan dia HARUS memakai saringan yang sama
  // dengan yang menghitung angkanya. Dulu spanduknya mengarah ke tahap
  // "selesai", jadi angka di spanduk dan isi halamannya bisa berbeda.
  const cumaKlaimBayar = stage === "klaim-bayar";
  if (cumaKlaimBayar) {
    delete where.stage;
    where.klaimBayarSejak = { not: null };
  }
  if (q) {
    where.OR = [
      { name: { contains: q } },
      { phone: { contains: q } },
      { businessName: { contains: q } },
      { email: { contains: q } },
      // Catatan dan isi janji ikut dicari. Yang paling sering diingat orang itu
      // justru isinya, bukan namanya: "yang alergi seafood siapa ya", "yang
      // survei tipe 36 kemarin". Tanpa dua kolom ini, satu-satunya cara
      // menemukannya adalah menggulir seluruh daftar sambil menebak.
      { notes: { contains: q } },
      { janjiCatatan: { contains: q } },
    ];
  }

  const [contacts, counts, jumlahMasalah, jumlahJanji] = await Promise.all([
    prisma.contact.findMany({
      where,
      // Yang bermasalah paling atas, lalu yang paling lama menggantung.
      // Keluhan yang didiamkan tiga hari jauh lebih merusak daripada
      // keluhan yang ada, jadi urutannya harus memaksa itu kelihatan.
      // Waktu yang dilihat daftar janji, urutannya menurut jam datang. Urutan
      // bawaan menurut keluhan terlama tidak masuk akal di sini: yang dicari
      // "siapa yang datang paling dekat", bukan "siapa yang paling lama kesal".
      orderBy: cumaBerjanji
        ? [{ janjiPada: "asc" }]
        : [{ masalahSejak: "asc" }, { updatedAt: "desc" }],
      take: 200,
      include: {
        conversations: {
          orderBy: { lastMessageAt: "desc" },
          take: 1,
          select: { id: true, lastMessageAt: true },
        },
      },
    }),
    prisma.contact.groupBy({
      by: ["stage"],
      where: { workspaceId: user.workspaceId, ...HANYA_PELANGGAN_ASLI },
      _count: true,
    }),
    prisma.contact.count({
      where: {
        workspaceId: user.workspaceId,
        ...HANYA_PELANGGAN_ASLI,
        masalah: { not: null },
      },
    }),
    prisma.contact.count({
      where: {
        workspaceId: user.workspaceId,
        ...HANYA_PELANGGAN_ASLI,
        janjiPada: { gte: new Date() },
      },
    }),
  ]);

  const countFor = (s: string) =>
    counts.find((c) => c.stage === s)?._count ?? 0;
  const total = counts.reduce((sum, c) => sum + c._count, 0);

  return (
    <>
      <PageHeader
        title="Pelanggan"
        description="Terisi otomatis dari isi obrolan. Yang perlu ditangani duluan muncul paling atas."
      />

      <div className="space-y-5 p-4 sm:p-6">
        {/* Pelanggan bermasalah.

            Sengaja BUKAN tahap ketujuh di deretan bawah. Enam tahap itu
            posisi di jalan menuju membeli. Masalah bukan posisi: dia bisa
            menimpa siapa saja kapan saja, dan paling sering justru menimpa
            yang sudah membayar. Kalau dijadikan tahap, pembeli yang komplain
            hilang dari hitungan pembeli. */}
        {jumlahMasalah > 0 && (
          <Link
            href={cumaBermasalah ? "/app/kontak" : "/app/kontak?stage=masalah"}
            className={`flex flex-wrap items-center gap-3 rounded-xl border px-4 py-3 transition ${
              cumaBermasalah
                ? "border-red-400 bg-red-50 ring-1 ring-red-400"
                : "border-red-200 bg-red-50 hover:border-red-300"
            }`}
          >
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-red-600 text-sm font-semibold text-white">
              {jumlahMasalah}
            </span>
            {/* Kalimatnya netral. Masalahnya apa sudah tertulis di baris
                pelanggannya masing-masing, jadi spanduk ini tidak perlu
                mengulang kata "refund" atau "komplain". Kepala halaman yang
                menyebut-nyebut uang kembali bikin produknya terdengar
                defensif, seolah komplain itu urusan utamanya. */}
            <span className="flex-1 text-sm leading-relaxed text-red-900">
              <span className="font-medium">Perlu ditangani.</span> Ada{" "}
              {jumlahMasalah === 1 ? "pelanggan" : `${jumlahMasalah} pelanggan`}{" "}
              yang keluhannya belum selesai.
            </span>
            <span className="tap-aman shrink-0 text-xs font-medium text-red-700">
              {cumaBermasalah ? "Lihat semua pelanggan" : "Lihat"}
            </span>
          </Link>
        )}

        {/* Yang mau datang.

            Ditaruh sejajar dengan spanduk keluhan, bukan di deretan tahap,
            karena sama seperti keluhan dia bukan posisi di jalan menuju
            membeli. Orang yang Sabtu depan mau datang bisa ada di tahap mana
            saja. */}
        {jumlahJanji > 0 && (
          <Link
            href={cumaBerjanji ? "/app/kontak" : "/app/kontak?stage=janji"}
            className={`flex flex-wrap items-center gap-3 rounded-xl border px-4 py-3 transition ${
              cumaBerjanji
                ? "border-brand-500 bg-brand-50 ring-1 ring-brand-500"
                : "border-brand-200 bg-brand-50 hover:border-brand-400"
            }`}
          >
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-600 text-sm font-semibold text-white">
              {jumlahJanji}
            </span>
            <span className="flex-1 text-sm leading-relaxed text-ink-800">
              <span className="font-medium">Punya janji temu.</span>{" "}
              {jumlahJanji === 1 ? "Ada pelanggan" : `Ada ${jumlahJanji} pelanggan`}{" "}
              yang sudah punya jadwal ke depan.
            </span>
            <span className="tap-aman shrink-0 text-xs font-medium text-brand-700">
              {cumaBerjanji ? "Lihat semua pelanggan" : "Lihat"}
            </span>
          </Link>
        )}

        {/* Saringan tahap: satu baris pil yang bisa digeser, bukan enam kartu
            bertumpuk. Dulu di HP enam kartu penuh ke bawah memakan hampir satu
            layar sebelum daftar pelanggannya kelihatan. Pil rapat menaruh
            semuanya dalam satu baris; kalau tidak muat, digeser (bukan
            dibungkus). Tiap pil sekaligus saringannya, dengan jumlahnya di
            ujung. */}
        <div className="thin-scroll -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
          {[{ id: "", label: "Semua", n: total }, ...STAGES.map((s) => ({ id: s, label: s, n: countFor(s) }))].map(
            (t) => {
              const aktif = t.id ? stage === t.id : !stage;
              return (
                <Link
                  key={t.id || "semua"}
                  href={t.id ? `/app/kontak?stage=${t.id}` : "/app/kontak"}
                  className={`inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-3.5 py-2 text-sm capitalize transition ${
                    aktif
                      ? "bg-ink-900 font-medium text-white"
                      : "border border-ink-200 text-ink-700 hover:bg-ink-50"
                  }`}
                >
                  {t.label}
                  <span
                    className={`text-xs tabular-nums ${
                      aktif ? "text-white/60" : "text-ink-400"
                    }`}
                  >
                    {t.n}
                  </span>
                </Link>
              );
            },
          )}
        </div>

        <form className="flex gap-2">
          {stage && <input type="hidden" name="stage" value={stage} />}
          <input
            name="q"
            defaultValue={q ?? ""}
            className="input flex-1 sm:max-w-sm"
            placeholder="Cari nama, nomor, catatan, atau isi janjinya"
          />
          <button className="btn-ink shrink-0" type="submit">
            Cari
          </button>
          {(q || stage) && (
            <Link href="/app/kontak" className="btn-ghost shrink-0">
              Reset
            </Link>
          )}
        </form>

        <div className="card overflow-hidden">
          {contacts.length === 0 ? (
            total === 0 ? (
              <Kosong
                ikon="pelanggan"
                judul="Belum ada pelanggan"
                kalimat="Nanti terisi otomatis begitu ada yang chat ke nomormu."
              />
            ) : (
              <Kosong
                ikon="pelanggan"
                judul="Tidak ada yang cocok"
                kalimat="Coba kata kunci lain, atau hapus saringannya."
              />
            )
          ) : (
            <>
              {/* HP: kartu. Tabel tujuh kolom di layar 375px memaksa orang
                  menggeser ke samping, dan begitu digeser dia kehilangan kolom
                  nama yang jadi patokannya. */}
              <div className="anim-urut divide-y divide-ink-100 md:hidden">
                {contacts.map((c) => (
                  <KontakKartu key={c.id} contact={c} menggantung={menggantung} />
                ))}
              </div>

              <div className="hidden overflow-x-auto md:block">
              {/* Kolom "Usahanya" dihapus, isinya pindah ke bawah namanya.

                  Kolom tetap yang isinya "-" untuk sebagian besar baris itu
                  bukan cuma boros tempat, dia juga menyesatkan: warung, klinik,
                  dan salon yang pembelinya orang biasa jadi terlihat seolah
                  datanya kurang lengkap, padahal memang tidak ada yang kurang.
                  Sebagai baris kecil di bawah nama, dia muncul kalau ada dan
                  hilang kalau tidak ada. */}
              <table className="w-full min-w-[760px] text-sm">
                <thead className="border-b border-ink-200 bg-ink-50/60 text-left text-xs text-ink-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Nama</th>
                    <th className="px-4 py-3 font-medium">Nomor & email</th>
                    <th className="px-4 py-3 font-medium">Minatnya</th>
                    <th className="px-4 py-3 font-medium">Tahap</th>
                    <th className="px-4 py-3 font-medium">Terakhir chat</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100">
                  {contacts.map((c) => {
                    const tags = parseJsonArray(c.tags);
                    const conv = c.conversations[0];
                    return (
                      <tr key={c.id} className="hover:bg-ink-50/60">
                        <td className="px-4 py-3">
                          <div className="flex items-start gap-3">
                            <Avatar nama={displayName(c)} ukuran={38} fotoPath={c.waFotoPath} />
                            <div className="min-w-0 flex-1">
                          <Link
                            href={`/app/kontak/${c.id}`}
                            className="font-medium text-ink-900 hover:text-brand-700 hover:underline"
                          >
                            {displayName(c)}
                          </Link>
                          {c.businessName && (
                            <p className="text-xs text-ink-500">
                              {c.businessName}
                              {c.industry && ` · ${c.industry}`}
                            </p>
                          )}
                          {!c.name && c.waPushName && (
                            <p className="text-xs text-ink-400">dari profil WA</p>
                          )}
                          {c.janjiPada && c.janjiPada.getTime() > Date.now() && (
                            <p className="mt-1 text-xs text-ink-600">
                              {formatJanji(c.janjiPada)}
                              {c.janjiCatatan && ` · ${c.janjiCatatan}`}
                            </p>
                          )}

                          {c.masalah && (
                            <div className="mt-2 rounded-lg border border-red-200 bg-red-50 px-2.5 py-2">
                              <p className="text-xs leading-relaxed text-red-900">
                                {c.masalah}
                              </p>
                              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                                {c.masalahSejak && (
                                  <span className="text-[11px] text-red-700">
                                    {menggantung(c.masalahSejak)}
                                  </span>
                                )}
                                <form action={updateContactAction}>
                                  <input type="hidden" name="id" value={c.id} />
                                  <input
                                    type="hidden"
                                    name="bereskanMasalah"
                                    value="1"
                                  />
                                  <button
                                    type="submit"
                                    className="text-[11px] font-medium text-red-700 underline hover:text-red-900"
                                  >
                                    Tandai sudah beres
                                  </button>
                                </form>
                              </div>
                            </div>
                          )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-ink-600">
                          {c.phone ? (
                            <p>{c.phone}</p>
                          ) : (
                            <p className="text-xs text-ink-400">
                              {c.waJid?.endsWith("@lid")
                                ? "nomor disembunyikan WhatsApp"
                                : "-"}
                            </p>
                          )}
                          {c.email && (
                            <p className="text-xs text-ink-400">{c.email}</p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {tags.length === 0 ? (
                              <span className="text-ink-400">-</span>
                            ) : (
                              tags.map((t) => (
                                <span
                                  key={t}
                                  className="badge bg-ink-100 text-ink-700"
                                >
                                  {t}
                                </span>
                              ))
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <form action={updateContactAction}>
                            <input type="hidden" name="id" value={c.id} />
                            <select
                              name="stage"
                              defaultValue={c.stage}
                              className="rounded-md border border-ink-200 bg-white px-2 py-1 text-xs capitalize outline-none focus:border-brand-500"
                            >
                              {STAGES.map((s) => (
                                <option key={s} value={s}>
                                  {s}
                                </option>
                              ))}
                            </select>
                            <button
                              type="submit"
                              className="ml-1.5 text-xs text-brand-700 hover:underline"
                            >
                              simpan
                            </button>
                          </form>
                          {/* Tahap saja tidak memberi tahu kapan. "Selesai"
                              yang terjadi tadi pagi dan yang terjadi sebulan
                              lalu kelihatan sama persis, padahal yang satu
                              perlu dicek uangnya sekarang. */}
                          {c.klaimBayarSejak ? (
                            <p className="mt-1 text-[11px] text-ink-400">
                              ngaku bayar {formatWaktu(c.klaimBayarSejak)}
                            </p>
                          ) : (
                            c.stage === "selesai" &&
                            c.closedAt && (
                              <p className="mt-1 text-[11px] text-ink-400">
                                selesai {formatWaktu(c.closedAt)}
                              </p>
                            )
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-ink-500">
                          {formatWaktu(conv?.lastMessageAt ?? c.updatedAt)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right">
                          <Link
                            href={`/app/kontak/${c.id}`}
                            className="text-xs text-brand-700 hover:underline"
                          >
                            Profil
                          </Link>
                          {conv && (
                            <Link
                              href={`/app/inbox?c=${conv.id}`}
                              className="ml-3 text-xs text-brand-700 hover:underline"
                            >
                              Obrolan
                            </Link>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              </div>
            </>
          )}
        </div>

        <p className="text-xs text-ink-500">
          Menampilkan {contacts.length} dari {total} pelanggan.
        </p>
      </div>
    </>
  );
}
