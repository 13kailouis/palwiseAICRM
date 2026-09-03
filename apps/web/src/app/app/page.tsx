import Link from "next/link";
import {
  HANYA_OBROLAN_ASLI,
  HANYA_PELANGGAN_ASLI,
  displayName,
  getPlan,
  hitungBalasan,
  periodeBerikutnya,
  prisma,
  terpakaiSekarang,
} from "@palwise/db";
import { requireUser } from "@/lib/auth";
import {
  PageHeader,
  Stat,
  ChannelBadge,
  formatJanji,
  formatWaktu,
} from "@/components/ui";
import { Ikon } from "@/components/Ikon";
import { SpandukTutup } from "@/components/SpandukTutup";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireUser();
  const workspaceId = user.workspaceId;

  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const awalHariIni = new Date();
  awalHariIni.setHours(0, 0, 0, 0);

  // Semuanya sekaligus, bukan satu per satu. Kalau "recent" ditunggu setelah
  // yang lain selesai, waktunya bertambah sebesar kueri itu sendiri padahal
  // dia tidak butuh hasil siapa pun.
  const [
    workspace,
    agent,
    channels,
    knowledgeCount,
    contacts,
    openConvs,
    needsHuman,
    balasanMingguIni,
    baruSelesai,
    recent,
    janji,
    totalJanji,
  ] = await Promise.all([
      prisma.workspace.findUniqueOrThrow({ where: { id: workspaceId } }),
      prisma.agent.findFirst({
        where: { workspaceId },
        orderBy: { createdAt: "asc" },
      }),
      prisma.channel.findMany({ where: { workspaceId }, orderBy: { createdAt: "asc" } }),
      prisma.knowledgeSource.count({
        where: { agent: { workspaceId }, status: "ready" },
      }),
      prisma.contact.count({ where: { workspaceId, ...HANYA_PELANGGAN_ASLI } }),
      prisma.conversation.count({
        where: { workspaceId, status: "open", ...HANYA_OBROLAN_ASLI },
      }),
      prisma.conversation.count({
        where: {
          workspaceId,
          needsHuman: true,
          status: "open",
          ...HANYA_OBROLAN_ASLI,
        },
      }),
      // Dihitung per BALASAN, satuan yang sama dengan kartu jatah di bawah.
      // Menghitung baris pesan berarti menghitung bubble, dan satu balasan
      // bisa jadi tiga bubble.
      hitungBalasan(workspaceId, since),
      // Pelanggan yang MENGAKU sudah bayar, bukan yang tahapnya "selesai".
      //
      // Bug 10 Agustus 2026: dulu yang dihitung `stage: "selesai"`. Tahap itu
      // punya dua arti, dan yang satunya sama sekali bukan soal uang. Seorang
      // pelanggan yang cuma menjawab "tidak kak, terima kasih" masuk "selesai"
      // karena urusannya memang beres, lalu muncul di sini sebagai orang yang
      // mengaku sudah bayar, lengkap dengan ajakan mengecek rekening.
      //
      // Yang rusak bukan cuma satu spanduk: pemiliknya membuka rekening
      // mencari uang yang tidak pernah ada, dan sesudah dua kali begitu dia
      // berhenti mempercayai kabar uang dari Palwise, termasuk yang benar.
      // Sekarang sumbernya `klaimBayarSejak`, yang cuma terisi kalau
      // pelanggannya benar-benar bilang sudah transfer atau kirim buktinya.
      prisma.contact.count({
        where: {
          workspaceId,
          ...HANYA_PELANGGAN_ASLI,
          klaimBayarSejak: { gte: since },
        },
      }),
      prisma.conversation.findMany({
        where: { workspaceId, ...HANYA_OBROLAN_ASLI },
        orderBy: { lastMessageAt: "desc" },
        take: 5,
        include: { contact: true },
      }),
      // Janji temu yang belum lewat.
      //
      // Batasnya awal hari ini, bukan "sekarang". Janji jam 9 pagi yang dibuka
      // jam 11 siang tetap perlu kelihatan: pemiliknya justru sedang mencari
      // tahu siapa yang tadi seharusnya datang.
      // Dibatasi 6 supaya kartunya tidak jadi halaman sendiri, TAPI jumlah
      // seluruhnya ikut dihitung di bawah. Daftar yang dipotong tanpa memberi
      // tahu itu yang paling berbahaya di kartu ini: klinik dengan dua puluh
      // janji hari ini melihat enam, menyimpulkan cuma itu yang ada, lalu
      // empat belas orang datang tanpa dia siapkan.
      prisma.contact.findMany({
        where: {
          workspaceId,
          ...HANYA_PELANGGAN_ASLI,
          janjiPada: { gte: awalHariIni },
        },
        orderBy: { janjiPada: "asc" },
        take: 6,
        include: {
          conversations: {
            orderBy: { lastMessageAt: "desc" },
            take: 1,
            select: { id: true },
          },
        },
      }),
      prisma.contact.count({
        where: {
          workspaceId,
          ...HANYA_PELANGGAN_ASLI,
          janjiPada: { gte: awalHariIni },
        },
      }),
    ]);

  const plan = getPlan(workspace.plan);
  // Bukan aiCreditsUsed mentah. Penolannya malas dan dikerjakan worker waktu
  // pesan pertama masuk, jadi tanpa ini kartu jatah masih menunjukkan angka
  // bulan lalu di tanggal 1.
  const terpakai = terpakaiSekarang(
    workspace.aiCreditsUsed,
    workspace.quotaResetAt,
  );
  const quotaPct = Math.min(100, Math.round((terpakai / plan.aiCredits) * 100));

  const connectedChannel = channels.find((c) => c.status === "connected");

  const steps = [
    {
      done: !!agent?.behaviorPrompt,
      label: "Atur cara asisten kamu bicara",
      href: "/app/agent",
    },
    {
      done: knowledgeCount > 0,
      // "Usahamu", bukan "toko". Ini kalimat pertama yang dibaca semua orang
      // yang baru daftar, dan klinik atau penjual jasa yang membaca "aturan
      // toko" di langkah pertama langsung merasa salah masuk produk.
      label: "Isi harga, layanan, dan aturan usahamu",
      href: "/app/knowledge",
    },
    {
      done: !!connectedChannel,
      label: "Sambungkan nomor WhatsApp",
      href: "/app/whatsapp",
    },
  ];
  const remaining = steps.filter((s) => !s.done);

  return (
    <>
      <PageHeader
        title={`Halo, ${user.name.split(" ")[0]}`}
        description="Sekilas apa yang terjadi di WhatsApp kamu."
      />

      <div className="space-y-6 p-4 sm:p-6">
        {remaining.length > 0 && (
          <div className="card p-4 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold text-ink-900">
                  Tinggal {remaining.length} langkah lagi
                </h2>
                {/* Kalimat ini cuma di layar lebar.
                    Judulnya sendiri sudah menyuruh: "Tinggal 1 langkah lagi"
                    tidak butuh satu kalimat lagi untuk bilang kerjakan dulu.
                    Di layar 360px kalimat itu jadi dua baris penuh tepat di
                    tempat yang paling mahal, yaitu di atas langkah-langkahnya
                    sendiri. Di layar lebar dia tidak mengorbankan apa pun,
                    dan buat yang baru pertama masuk dia menjelaskan kenapa
                    kotak ini ada. */}
                <p className="mt-1 hidden text-sm text-ink-500 sm:block">
                  Selesaikan ini dulu supaya chat pelanggan bisa mulai dibalas
                  otomatis.
                </p>
              </div>
              <span className="shrink-0 text-sm text-ink-500">
                <span className="font-semibold tabular-nums text-ink-900">
                  {steps.length - remaining.length}
                </span>
                /{steps.length} selesai
              </span>
            </div>

            {/* Bilah kemajuan, dan juga cuma di layar lebar.
                Dia mengatakan hal yang PERSIS SAMA dengan "2/3 selesai" yang
                berdiri di sebelah judulnya, cuma dalam bentuk gambar. Dua
                penanda untuk satu keadaan itu boros di mana pun, dan di HP
                yang dibayar bukan cuma tingginya sendiri tapi juga jarak
                atasnya. Yang dipertahankan angkanya, bukan gambarnya, karena
                angka memberi tahu SISA berapa dan gambar cuma memberi kesan
                kira-kira. */}
            <div className="mt-4 hidden h-1.5 overflow-hidden rounded-full bg-ink-100 sm:block">
              <div
                className="h-full rounded-full bg-brand-500"
                style={{
                  width: `${((steps.length - remaining.length) / steps.length) * 100}%`,
                  transition: "width var(--gerak-pelan) var(--lengkung-masuk)",
                }}
              />
            </div>

            {/* DUA WAJAH, dan yang di HP bukan sekadar versi menumpuk.
                Di layar lebar tiga langkah berdiri sejajar biar kelihatan
                seperti pemasangan app populer, bukan daftar ceklis panjang ke
                bawah. Yang sedang giliran ditandai "Sekarang" dan diberi tepi
                biru supaya matanya berhenti di sana lebih dulu.

                Di HP bentuk itu berubah jadi tiga KARTU tinggi bertumpuk yang
                memakan hampir seluruh layar, dan yang dimakan itu ruang milik
                angka-angka di bawahnya. Jadi di HP tiap langkah dipadatkan
                jadi SATU BARIS: lingkaran, judulnya, panah. Label statusnya
                ("Selesai", "Sekarang", "Nanti") disembunyikan karena
                lingkaran dan coretannya sudah mengatakan hal yang sama, dan
                kata "Lanjutkan" ikut disembunyikan karena seluruh barisnya
                memang sudah bisa ditekan. Yang tersisa per langkah tinggal
                satu baris setinggi lingkarannya. */}
            <ol className="mt-3 grid gap-2 sm:mt-4 sm:grid-cols-3 sm:gap-3">
              {steps.map((s, i) => {
                const berikut = !s.done && steps.slice(0, i).every((x) => x.done);
                return (
                  <li key={s.label}>
                    <Link
                      href={s.href}
                      className={`group flex items-center gap-3 rounded-xl border p-3 transition sm:h-full sm:flex-col sm:items-start sm:gap-3 sm:p-4 ${
                        s.done
                          ? "border-ink-200 bg-ink-50/60"
                          : berikut
                            ? "border-brand-300 bg-brand-50/40 hover:-translate-y-0.5 hover:border-brand-500 hover:shadow-md"
                            : "border-ink-200 hover:-translate-y-0.5 hover:border-ink-300 hover:shadow-sm"
                      }`}
                      style={{ transitionDuration: "var(--gerak)" }}
                    >
                      <div className="flex shrink-0 items-center gap-2.5">
                        <span
                          className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-semibold tabular-nums ${
                            s.done
                              ? "bg-brand-600 text-white"
                              : berikut
                                ? "border-2 border-brand-500 text-brand-700"
                                : "border-2 border-ink-300 text-ink-400"
                          }`}
                        >
                          {s.done ? <Ikon nama="centang" size={13} /> : i + 1}
                        </span>
                        {s.done ? (
                          <span className="hidden text-xs font-medium text-brand-700 sm:inline">
                            Selesai
                          </span>
                        ) : berikut ? (
                          <span className="hidden text-xs font-medium text-brand-700 sm:inline">
                            Sekarang
                          </span>
                        ) : (
                          <span className="hidden text-xs text-ink-400 sm:inline">
                            Nanti
                          </span>
                        )}
                      </div>
                      <p
                        className={`min-w-0 flex-1 text-sm sm:flex-none ${
                          s.done
                            ? "text-ink-400 line-through"
                            : "font-medium text-ink-800"
                        }`}
                      >
                        {s.label}
                      </p>
                      {berikut && (
                        <span className="ml-auto inline-flex shrink-0 items-center gap-1 text-sm font-medium text-brand-700 sm:ml-0 sm:mt-auto">
                          <span className="hidden sm:inline">Lanjutkan</span>
                          <svg
                            viewBox="0 0 24 24"
                            width="15"
                            height="15"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="transition-transform group-hover:translate-x-0.5"
                            aria-hidden="true"
                          >
                            <path d="M5 12h14M13 6l6 6-6 6" />
                          </svg>
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ol>
            {/* Tautan panduan CUMA di sini, dan cuma selama langkahnya belum
                selesai.

                Ini tempat satu-satunya di dalam dashboard yang isinya orang yang
                belum jalan, dan justru dia yang butuh panduan. Sesudah nomornya
                tersambung dan info bisnisnya keisi, seluruh kotak ini hilang, dan
                tautannya ikut hilang bersamanya. Menaruh "Panduan" permanen di
                menu samping berarti memberi menu kesembilan kepada orang yang
                sudah lancar, dan menu yang tidak pernah dibuka membuat menu di
                sebelahnya lebih lambat ditemukan.

                Dibuka di tab baru, karena orangnya sedang di tengah pemasangan.
                Menariknya keluar dari halaman ini berarti dia kehilangan
                tempatnya. */}
            <a
              href="/panduan"
              target="_blank"
              rel="noreferrer"
              className="tap-aman mt-4 inline-block text-sm text-brand-700 hover:underline"
            >
              Baru pertama kali? Baca panduannya dulu
            </a>
          </div>
        )}

        {/* Uang duluan, sebelum angka-angka lain.

            Dulu satu-satunya tanda pelanggan sudah kirim bukti transfer adalah
            angka "Selesai" di halaman Pelanggan naik satu, tanpa nominal, tanpa
            waktu, tanpa apa pun. Bukti bayarnya sendiri cuma bisa dilihat kalau
            pemilik toko kebetulan membuka obrolannya. */}
        {baruSelesai > 0 && (
          /* Tandanya memakai jumlahnya, jadi begitu ada satu lagi yang mengaku
             sudah bayar, tandanya berubah dan spanduknya muncul lagi walau
             yang kemarin sudah kamu tutup. Kabar soal uang tidak boleh hilang
             cuma karena pernah ditutup sekali. */
          <SpandukTutup tanda={`bayar:${baruSelesai}`}>
          <Link
            href="/app/kontak?stage=klaim-bayar"
            className="flex flex-wrap items-center gap-3 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 pr-12 transition hover:border-brand-400"
          >
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-brand-600 text-sm font-semibold text-white">
              {baruSelesai}
            </span>
            {/* "Mengaku", bukan "sudah". Tahap ini naik dari omongan pelanggan
                dan foto yang dia kirim, dan foto bisa saja bukan punya dia.
                Kalimat yang bilang uangnya sudah masuk bikin orang berhenti
                mengecek rekening, dan itu justru yang paling mahal. */}
            <span className="flex-1 text-sm leading-relaxed text-ink-800">
              <span className="font-medium">Perlu dicek uangnya.</span>{" "}
              {baruSelesai === 1 ? "Ada pelanggan" : `Ada ${baruSelesai} pelanggan`}{" "}
              yang mengaku sudah bayar minggu ini. Bukti transfernya ada di
              obrolan masing-masing.
            </span>
            <span className="tap-aman shrink-0 text-xs font-medium text-brand-700">
              Lihat
            </span>
          </Link>
          </SpandukTutup>
        )}

        {/* Dua kolom di HP, bukan satu.

            Empat kartu yang menumpuk ke bawah di layar 360px itu empat layar
            penuh yang harus digulir cuma untuk empat angka. Dijejer dua-dua
            (2x2) tingginya jadi separuh, dan angka-angka yang memang saling
            dibandingkan (balasan vs obrolan, nunggu vs total) berdiri
            bersebelahan, bukan berjauhan. */}
        <div className="anim-urut grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {/* "Balasan", bukan "Chat dibalas". Satuannya harus sama persis
              dengan kartu jatah, karena dua angka bersatuan beda di satu layar
              bikin orang mengira salah satunya bohong. */}
          <Stat
            label="Balasan minggu ini"
            value={balasanMingguIni.toLocaleString("id-ID")}
            ikon="kirim"
          />
          <Stat label="Obrolan yang masih jalan" value={openConvs} ikon="chat" />
          {/* Satu-satunya kartu yang bisa ditindaklanjuti, jadi dia yang
              dinyalakan dan dijadikan tautan langsung ke kotak masuk. */}
          <Stat
            label="Nunggu kamu balas"
            value={needsHuman}
            ikon="kendali"
            nyala={needsHuman > 0}
            sub={needsHuman > 0 ? "Cek sekarang" : "Aman, tidak ada"}
            href={needsHuman > 0 ? "/app/inbox" : undefined}
          />
          <Stat
            label="Total pelanggan"
            value={contacts.toLocaleString("id-ID")}
            ikon="pelanggan"
          />
        </div>

        {/* Janji temu.

            Muncul cuma kalau memang ada. Toko yang jualan barang tidak pernah
            punya janji temu, dan kartu kosong yang menetap tiap hari mengajari
            orang untuk berhenti melihat bagian itu. Buat klinik, salon,
            bengkel, dan properti, ini justru daftar yang dibuka paling pagi. */}
        {janji.length > 0 && (
          <div className="anim-urut card-pad">
            <div className="flex items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 font-semibold text-ink-900">
                <Ikon nama="kalender" size={16} className="text-ink-400" />
                Janji temu{totalJanji > janji.length && ` (${totalJanji})`}
              </h2>
              {totalJanji > janji.length ? (
                <Link
                  href="/app/kontak?stage=janji"
                  className="tap-aman text-sm text-brand-700 hover:underline"
                >
                  Lihat semua
                </Link>
              ) : (
                <span className="text-xs text-ink-500">
                  terisi otomatis dari obrolan
                </span>
              )}
            </div>
            <ul className="mt-3 divide-y divide-ink-100">
              {janji.map((k, i) => {
                // Bentrok = ada janji lain dalam 30 menit.
                //
                // Palwise cuma tahu janji yang dicatatnya sendiri, jadi ini
                // bukan jaminan jadwalmu aman. Tapi bentrok yang dia MEMANG
                // tahu tidak boleh dibiarkan lewat begitu saja, karena yang
                // menanggung malunya kamu di depan orang.
                const sebelum = janji[i - 1];
                const sesudah = janji[i + 1];
                const dekat = (lain: typeof k | undefined) =>
                  !!lain?.janjiPada &&
                  !!k.janjiPada &&
                  Math.abs(lain.janjiPada.getTime() - k.janjiPada.getTime()) <
                    30 * 60 * 1000;
                const bentrok = dekat(sebelum) || dekat(sesudah);

                return (
                  <li key={k.id}>
                    <Link
                      href={`/app/kontak/${k.id}`}
                      className="-mx-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-lg px-2 py-3 hover:bg-ink-50"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-ink-900">
                          {displayName(k)}
                        </p>
                        {k.janjiCatatan && (
                          <p className="truncate text-xs text-ink-500">
                            {k.janjiCatatan}
                          </p>
                        )}
                        <div className="mt-1 flex flex-wrap gap-2">
                          {!k.janjiDipastikan && (
                            <span className="badge bg-amber-50 text-amber-800">
                              belum kamu pastikan
                            </span>
                          )}
                          {bentrok && (
                            <span className="badge bg-red-50 text-red-700">
                              bentrok jamnya
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="shrink-0 text-sm text-ink-700">
                        {k.janjiPada && formatJanji(k.janjiPada)}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
            <p className="mt-3 text-xs leading-relaxed text-ink-400">
              {totalJanji > janji.length &&
                `Menampilkan ${janji.length} yang paling dekat dari ${totalJanji}. `}
              Asisten cuma mencatat permintaan, dia tidak bisa melihat kalendermu.
              Pastikan sendiri jamnya sebelum pelanggan dikabari.
            </p>
          </div>
        )}

        <div className="anim-urut grid gap-6 lg:grid-cols-3">
          <div className="card-pad lg:col-span-2">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-semibold text-ink-900">
                <Ikon nama="chat" size={16} className="text-ink-400" />
                Obrolan terbaru
              </h2>
              <Link
                href="/app/inbox"
                className="tap-aman text-sm text-brand-700 hover:underline"
              >
                Lihat semua
              </Link>
            </div>
            {recent.length === 0 ? (
              <p className="mt-4 text-sm text-ink-500">
                Belum ada obrolan. Begitu nomor WhatsApp tersambung, chat yang masuk
                muncul di sini.
              </p>
            ) : (
              <ul className="mt-4 divide-y divide-ink-100">
                {recent.map((c) => (
                  <li key={c.id}>
                    <Link
                      href={`/app/inbox?c=${c.id}`}
                      className="-mx-2 flex items-center justify-between gap-3 rounded-lg px-2 py-3 hover:bg-ink-50"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-ink-900">
                          {displayName(c.contact)}
                        </p>
                        <p className="truncate text-xs text-ink-500">
                          {c.contact.phone ?? "ruang coba"}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {c.needsHuman && (
                          <span className="badge bg-amber-50 text-amber-700">
                            nunggu kamu
                          </span>
                        )}
                        <span className="text-xs text-ink-400">
                          {formatWaktu(c.lastMessageAt)}
                        </span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="space-y-6">
            <div className="card-pad">
              <h2 className="flex items-center gap-2 font-semibold text-ink-900">
                <Ikon nama="paket" size={16} className="text-ink-400" />
                Pemakaian bulan ini
              </h2>
              <p className="mt-3 text-sm text-ink-600">
                <span className="text-2xl font-semibold text-ink-950">
                  {terpakai.toLocaleString("id-ID")}
                </span>
                <span className="text-ink-400">
                  {" "}
                  dari {plan.aiCredits.toLocaleString("id-ID")} balasan
                </span>
              </p>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-ink-100">
                <div
                  className={`h-full rounded-full ${
                    quotaPct > 90 ? "bg-red-500" : "bg-brand-500"
                  }`}
                  style={{ width: `${quotaPct}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-ink-500">
                Paket {plan.name}. Hitungan mulai dari nol lagi tanggal{" "}
                {periodeBerikutnya(workspace.quotaResetAt).toLocaleDateString(
                  "id-ID",
                  { day: "numeric", month: "long" },
                )}
              </p>
            </div>

            <div className="card-pad">
              <h2 className="flex items-center gap-2 font-semibold text-ink-900">
                <Ikon nama="whatsapp" size={16} className="text-ink-400" />
                Nomor WhatsApp
              </h2>
              <ul className="mt-3 space-y-3">
                {channels.length === 0 && (
                  <li className="text-sm text-ink-500">Belum ada nomor.</li>
                )}
                {channels.map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm text-ink-800">{c.name}</p>
                      {c.phoneNumber && (
                        <p className="truncate text-xs text-ink-500">{c.phoneNumber}</p>
                      )}
                    </div>
                    <ChannelBadge status={c.status} />
                  </li>
                ))}
              </ul>
              <Link
                href="/app/whatsapp"
                className="tap-aman mt-4 text-sm text-brand-700 hover:underline"
              >
                Atur nomor
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
