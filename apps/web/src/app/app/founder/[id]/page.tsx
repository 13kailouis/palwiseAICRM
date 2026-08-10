import Link from "next/link";
import { notFound } from "next/navigation";
import { formatIDR, getPlan, hitungBalasan, prisma } from "@palwise/db";
import { requireUser } from "@/lib/auth";
import { bolehLihatFounder } from "@/lib/founder";
import { PageHeader } from "@/components/ui";
import { Ikon } from "@/components/Ikon";

/**
 * Satu akun, dibuka dari daftar di halaman founder.
 *
 * ── APA YANG BOLEH DIBUKA DI SINI, DAN KENAPA GARISNYA DI SITU ──────────────
 *
 * Kebijakan privasi Palwise berbunyi: "Karyawan kami tidak membaca isi chat
 * kamu, KECUALI kamu sendiri yang meminta bantuan dan mengizinkannya."
 *
 * Kalimat itu bukan hiasan. Dia yang membuat pemilik toko mau menyambungkan
 * nomor WhatsApp usahanya ke produk yang belum punya reputasi, dan dia juga
 * yang mengikat kita di depan UU 27/2022: di sana pemilik tokonya pengendali
 * data, kita cuma pemroses.
 *
 * Jadi halaman ini dibagi dua, dan pembatasnya BUKAN selera:
 *
 * BOLEH — punya akunnya sendiri, yang dia ketik sendiri tentang usahanya
 * sendiri: nama usaha, email, paket, pemakaian, setelan asisten, dan isi Info
 * bisnis. Itu yang dibutuhkan waktu dia bertanya "kenapa asisten saya jawabnya
 * begitu?", dan tidak satu pun di antaranya milik pelanggan dia.
 *
 * TIDAK BOLEH — apa pun milik PELANGGAN DIA: nama kontak, nomor WhatsApp, isi
 * pesan, catatan CRM. Yang ditampilkan cuma hitungan dan waktu terakhir, karena
 * hitungan menjawab "hidup atau tidak" tanpa membuka satu kalimat pun.
 *
 * Kalau suatu hari isi chat memang perlu dibuka untuk membantu yang komplain,
 * urutannya sudah jelas dan tidak boleh dipotong: minta izin pemiliknya, catat
 * siapa membuka apa dan kapan, dan ubah dulu kalimat di halaman privasi kalau
 * izinnya mau dibuat berlaku umum. Jangan diselipkan diam-diam ke halaman ini.
 */

export const dynamic = "force-dynamic";

function Baris({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-ink-100 py-2.5 last:border-0">
      <span className="text-sm text-ink-500">{label}</span>
      <span className="text-sm text-ink-900">{children}</span>
    </div>
  );
}

const LABEL_SUMBER: Record<string, string> = {
  text: "Ditulis sendiri",
  file: "Dari berkas",
  website: "Dari website",
  qna: "Tanya jawab",
};

function tanggal(d: Date): string {
  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function jamTanggal(d: Date): string {
  return d.toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function FounderAkunPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  if (!bolehLihatFounder(user.email)) notFound();

  const { id } = await params;

  const ws = await prisma.workspace.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      plan: true,
      createdAt: true,
      langgananSampai: true,
      paketBerikutnya: true,
      aiCreditsUsed: true,
      quotaResetAt: true,
      bulanGratis: true,
      diajakOleh: true,
      imporTerakhir: true,
      users: {
        orderBy: { createdAt: "asc" },
        select: {
          email: true,
          name: true,
          role: true,
          createdAt: true,
          emailVerifiedAt: true,
        },
      },
      channels: {
        select: {
          id: true,
          name: true,
          status: true,
          phoneNumber: true,
          connectedAt: true,
          autoStart: true,
          lastError: true,
        },
      },
      agents: {
        select: {
          id: true,
          name: true,
          behaviorPrompt: true,
          welcomeMessage: true,
          handoffCondition: true,
          knowledgeSources: {
            orderBy: { createdAt: "desc" },
            select: {
              id: true,
              type: true,
              title: true,
              content: true,
              status: true,
              error: true,
              chunkCount: true,
              updatedAt: true,
            },
          },
          _count: { select: { mediaAssets: true } },
        },
      },
      _count: { select: { contacts: true, conversations: true } },
    },
  });

  if (!ws) notFound();

  // Hitungan saja, tanpa satu pun isi. Yang dijawab: hidup atau tidak, dan
  // kapan terakhir ada tanda kehidupan.
  const [obrolanTerbuka, perluManusia, terakhirChat, balasan30] =
    await Promise.all([
      prisma.conversation.count({
        where: { workspaceId: ws.id, status: "open" },
      }),
      prisma.conversation.count({
        where: { workspaceId: ws.id, needsHuman: true },
      }),
      prisma.conversation.findFirst({
        where: { workspaceId: ws.id },
        orderBy: { lastMessageAt: "desc" },
        // HANYA tanggalnya. Bukan id kontaknya, bukan cuplikan pesannya.
        select: { lastMessageAt: true },
      }),
      hitungBalasan(
        ws.id,
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      ),
    ]);

  const paket = getPlan(ws.plan);
  const pemilik = ws.users.find((u) => u.role === "owner") ?? ws.users[0];
  const aktifBerbayar =
    ws.plan !== "free" &&
    ws.langgananSampai !== null &&
    ws.langgananSampai.getTime() > Date.now();

  return (
    <>
      <PageHeader
        title={ws.name}
        description={`${pemilik?.email ?? "tanpa pemilik"} · daftar ${tanggal(ws.createdAt)}`}
      />

      <div className="space-y-6 p-4 sm:p-6">
        <Link
          href="/app/founder"
          className="inline-flex items-center gap-1.5 text-sm text-ink-600 hover:text-ink-900"
        >
          <span className="rotate-180">
            <Ikon nama="kirim" size={16} />
          </span>
          Balik ke daftar
        </Link>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="card-pad">
            <h2 className="font-semibold text-ink-900">Akun</h2>
            <div className="mt-2">
              <Baris label="Paket">
                {paket.name}
                {aktifBerbayar ? "" : ws.plan === "free" ? "" : " (tanggal lewat)"}
              </Baris>
              <Baris label="Langganan sampai">
                {ws.langgananSampai ? tanggal(ws.langgananSampai) : "—"}
              </Baris>
              {ws.paketBerikutnya && (
                <Baris label="Turun ke">
                  {getPlan(ws.paketBerikutnya).name} begitu tanggalnya lewat
                </Baris>
              )}
              <Baris label="Harga paket">
                {paket.pricePerMonth === 0
                  ? "Gratis"
                  : `${formatIDR(paket.pricePerMonth)} per bulan`}
              </Baris>
              <Baris label="Bulan gratis belum kepakai">{ws.bulanGratis}</Baris>
              <Baris label="Diajak orang lain">
                {ws.diajakOleh ? "Ya" : "Tidak"}
              </Baris>
            </div>
          </div>

          <div className="card-pad">
            <h2 className="font-semibold text-ink-900">Pemakaian</h2>
            <div className="mt-2">
              <Baris label="Balasan periode ini">
                {ws.aiCreditsUsed.toLocaleString("id-ID")} dari{" "}
                {paket.aiCredits.toLocaleString("id-ID")}
              </Baris>
              <Baris label="Jatah ditolkan lagi">
                {tanggal(ws.quotaResetAt)}
              </Baris>
              <Baris label="Balasan 30 hari">
                {balasan30.toLocaleString("id-ID")}
              </Baris>
              <Baris label="Obrolan">
                {ws._count.conversations.toLocaleString("id-ID")} total,{" "}
                {obrolanTerbuka} belum beres
              </Baris>
              <Baris label="Nunggu dijawab manusia">{perluManusia}</Baris>
              <Baris label="Pelanggan tercatat">
                {ws._count.contacts.toLocaleString("id-ID")}
              </Baris>
              <Baris label="Chat terakhir masuk">
                {terakhirChat ? jamTanggal(terakhirChat.lastMessageAt) : "belum pernah"}
              </Baris>
            </div>
          </div>
        </div>

        <div className="card-pad">
          <h2 className="font-semibold text-ink-900">Orang di akun ini</h2>
          <div className="mt-2">
            {ws.users.map((u) => (
              <Baris key={u.email} label={u.name || u.email}>
                {u.email}
                {u.role !== "owner" ? ` · ${u.role}` : ""}
                {u.emailVerifiedAt ? "" : " · email belum diverifikasi"}
              </Baris>
            ))}
          </div>
        </div>

        <div className="card-pad">
          <h2 className="font-semibold text-ink-900">Nomor WhatsApp</h2>
          {ws.channels.length === 0 ? (
            <p className="mt-2 text-sm leading-relaxed text-ink-500">
              Belum pernah menambahkan nomor. Ini titik berhentinya, dan ini yang
              paling pantas ditanyakan ke orangnya.
            </p>
          ) : (
            <div className="mt-2">
              {ws.channels.map((c) => (
                <Baris key={c.id} label={c.name}>
                  {c.status}
                  {c.phoneNumber ? ` · ${c.phoneNumber}` : ""}
                  {c.connectedAt ? ` · sejak ${tanggal(c.connectedAt)}` : ""}
                  {c.autoStart ? "" : " · nyala otomatis dimatikan"}
                  {c.lastError ? ` · galat: ${c.lastError}` : ""}
                </Baris>
              ))}
            </div>
          )}
        </div>

        {/* Setelan asisten dan Info bisnis: dua-duanya tulisan pemilik akunnya
            sendiri tentang usahanya sendiri, dan dua-duanya yang menentukan
            kenapa asistennya menjawab begitu. Tanpa ini, pertanyaan "kok
            jawabannya salah?" cuma bisa dijawab dengan tebakan. */}
        {ws.agents.map((a) => (
          <div key={a.id} className="card-pad">
            <h2 className="font-semibold text-ink-900">Asisten: {a.name}</h2>

            <div className="mt-3 space-y-3">
              <div>
                <p className="text-xs font-medium text-ink-500">Sifat dan aturan</p>
                <p className="mt-1 whitespace-pre-line rounded-lg bg-ink-50 p-3 text-[13px] leading-relaxed text-ink-800">
                  {a.behaviorPrompt || "kosong"}
                </p>
              </div>
              {a.welcomeMessage && (
                <div>
                  <p className="text-xs font-medium text-ink-500">Sapaan pertama</p>
                  <p className="mt-1 whitespace-pre-line rounded-lg bg-ink-50 p-3 text-[13px] leading-relaxed text-ink-800">
                    {a.welcomeMessage}
                  </p>
                </div>
              )}
              {a.handoffCondition && (
                <div>
                  <p className="text-xs font-medium text-ink-500">
                    Kapan dilempar ke manusia
                  </p>
                  <p className="mt-1 whitespace-pre-line rounded-lg bg-ink-50 p-3 text-[13px] leading-relaxed text-ink-800">
                    {a.handoffCondition}
                  </p>
                </div>
              )}
            </div>

            <h3 className="mt-5 text-sm font-semibold text-ink-900">
              Info bisnis ({a.knowledgeSources.length} catatan, {a._count.mediaAssets}{" "}
              gambar dan berkas)
            </h3>
            {a.knowledgeSources.length === 0 ? (
              <p className="mt-2 text-sm leading-relaxed text-ink-500">
                Belum mengisi apa pun. Asistennya belum punya bahan untuk
                menjawab, jadi hampir semua pertanyaan akan dilempar ke dia.
              </p>
            ) : (
              <div className="mt-2 space-y-2">
                {a.knowledgeSources.map((k) => (
                  <details key={k.id} className="rounded-lg border border-ink-100">
                    <summary className="tap-aman flex cursor-pointer list-none flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-sm font-medium text-ink-900">
                      <span className="min-w-0">{k.title}</span>
                      <span className="flex shrink-0 items-center gap-2 text-xs font-normal text-ink-500">
                        <span>{LABEL_SUMBER[k.type] ?? k.type}</span>
                        <span
                          className={`badge ${
                            k.status === "ready"
                              ? "bg-ink-100 text-ink-700"
                              : k.status === "error"
                                ? "bg-red-50 text-red-700"
                                : "bg-amber-50 text-amber-800"
                          }`}
                        >
                          {k.status === "ready"
                            ? `${k.chunkCount} potongan`
                            : k.status}
                        </span>
                      </span>
                    </summary>
                    {k.error && (
                      <p className="border-t border-ink-100 px-3 py-2 text-xs text-red-700">
                        {k.error}
                      </p>
                    )}
                    <p className="whitespace-pre-line border-t border-ink-100 px-3 py-3 text-[13px] leading-relaxed text-ink-700">
                      {k.content}
                    </p>
                  </details>
                ))}
              </div>
            )}
          </div>
        ))}

        {/* Yang TIDAK ada di halaman ini, ditulis terang-terangan supaya orang
            berikutnya tidak menambahkannya tanpa berpikir. */}
        <div className="card-pad bg-ink-50">
          <h2 className="font-semibold text-ink-900">
            Isi chat pelanggannya tidak bisa dibuka dari sini
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-600">
            Kebijakan privasi kita menulis: karyawan Palwise tidak membaca isi
            chat kamu, kecuali kamu sendiri yang meminta bantuan dan
            mengizinkannya. Jadi yang muncul di atas cuma hitungan dan waktu
            terakhir, bukan nama, nomor, atau kalimat pelanggannya.
          </p>
          <p className="mt-2 text-sm leading-relaxed text-ink-600">
            Kalau ada yang komplain dan chatnya memang perlu dibuka, mintanya ke
            orangnya langsung, dan bukaannya harus tercatat. Menambahkannya
            diam-diam di sini membuat kalimat di halaman privasi jadi bohong,
            dan kalimat itu salah satu alasan orang mau menyambungkan nomor
            usahanya.
          </p>
        </div>
      </div>
    </>
  );
}
