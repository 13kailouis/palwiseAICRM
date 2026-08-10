import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@palwise/db";
import { requireUser } from "@/lib/auth";
import { bolehLihatFounder } from "@/lib/founder";
import { catatBukaChat } from "@/lib/jejakFounder";
import { PageHeader } from "@/components/ui";
import { Ikon } from "@/components/Ikon";

/**
 * Satu percakapan, dibaca oleh tim Palwise.
 *
 * ── HALAMAN INI YANG DIJANJIKAN DI KEBIJAKAN PRIVASI ────────────────────────
 *
 * Halaman privasi menulis, dan tulisannya diperbarui lebih dulu sebelum halaman
 * ini dibuat: isi chat bisa dibuka oleh sejumlah kecil orang di tim Palwise
 * untuk menjalankan layanan, membantu kalau ada masalah, dan memperbaiki
 * produknya, dan TIAP BUKAAN TERCATAT.
 *
 * `catatBukaChat` di bawah itu yang membuat kalimat terakhir benar. Dia
 * dipanggil SEBELUM isinya digambar, bukan sesudah, supaya tidak ada jalan
 * membaca tanpa tercatat: kalau pencatatannya ditaruh di belakang, satu galat
 * render membuat orangnya tetap sempat membaca sementara catatannya tidak
 * pernah ditulis.
 *
 * Yang dicatat penunjuknya saja (siapa, akun mana, obrolan mana, kapan). Tidak
 * satu kalimat pun dari percakapan disalin ke catatan, karena catatan itu tidak
 * ikut terhapus waktu pemiliknya minta datanya dihapus, dan salinan kedua yang
 * tidak bisa dihapus justru melanggar hal yang sedang dijaga.
 *
 * TIDAK ADA TOMBOL MEMBALAS DI SINI, dan itu disengaja. Membaca untuk membantu
 * itu satu hal; mengirim pesan atas nama toko orang lain hal yang sama sekali
 * berbeda, dan tidak ada satu kalimat pun di halaman privasi yang mengizinkannya.
 * Kalau suatu hari perlu, itu fitur baru dengan izin baru, bukan tombol yang
 * diselipkan ke halaman ini.
 */

export const dynamic = "force-dynamic";

const LABEL_PERAN: Record<string, string> = {
  customer: "Pelanggan",
  ai: "Asisten",
  human: "Diambil alih",
  system: "Sistem",
};

export default async function FounderObrolanPage({
  params,
}: {
  params: Promise<{ id: string; obrolan: string }>;
}) {
  const user = await requireUser();
  // Pintunya dipasang lagi. Halaman induk yang aman tidak menjaga alamat ini
  // kalau seseorang mengetiknya langsung.
  if (!bolehLihatFounder(user.email)) notFound();

  const { id, obrolan } = await params;

  const percakapan = await prisma.conversation.findUnique({
    where: { id: obrolan },
    select: {
      id: true,
      workspaceId: true,
      status: true,
      aiEnabled: true,
      needsHuman: true,
      handoffReason: true,
      createdAt: true,
      lastMessageAt: true,
      contact: { select: { name: true, phone: true, stage: true, tags: true } },
      workspace: { select: { id: true, name: true } },
      agent: { select: { name: true } },
      messages: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          role: true,
          content: true,
          mediaType: true,
          mediaSummary: true,
          createdAt: true,
        },
      },
    },
  });

  // Alamat yang tidak cocok dijawab 404, bukan diperbaiki diam-diam. Kalau id
  // akunnya tidak sesuai dengan obrolannya, yang mengetik alamat itu sedang
  // menebak, dan menebak tidak boleh dibantu.
  if (!percakapan || percakapan.workspaceId !== id) notFound();

  catatBukaChat({
    oleh: user.email,
    workspaceId: percakapan.workspaceId,
    namaUsaha: percakapan.workspace.name,
    conversationId: percakapan.id,
  });

  const nama =
    percakapan.contact.name || percakapan.contact.phone || "tanpa nama";

  return (
    <>
      <PageHeader
        title={nama}
        description={`${percakapan.workspace.name} · ${percakapan.messages.length} pesan`}
      />

      <div className="space-y-5 p-4 sm:p-6">
        <Link
          href={`/app/founder/${percakapan.workspaceId}`}
          className="inline-flex items-center gap-1.5 text-sm text-ink-600 hover:text-ink-900"
        >
          <span className="rotate-180">
            <Ikon nama="kirim" size={16} />
          </span>
          Balik ke akunnya
        </Link>

        <div className="card-pad">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="badge bg-ink-100 text-ink-700">
              {percakapan.status === "open" ? "Berjalan" : "Beres"}
            </span>
            {percakapan.needsHuman && (
              <span className="badge bg-amber-50 text-amber-800">
                Nunggu manusia
              </span>
            )}
            {!percakapan.aiEnabled && (
              <span className="badge bg-ink-100 text-ink-600">Asisten mati</span>
            )}
            {percakapan.contact.stage && (
              <span className="badge bg-ink-100 text-ink-700">
                {percakapan.contact.stage}
              </span>
            )}
            {percakapan.agent && (
              <span className="badge bg-ink-100 text-ink-600">
                {percakapan.agent.name}
              </span>
            )}
          </div>
          {percakapan.handoffReason && (
            <p className="mt-3 text-sm leading-relaxed text-ink-600">
              Dilempar ke manusia karena: {percakapan.handoffReason}
            </p>
          )}
        </div>

        <div className="space-y-2.5">
          {percakapan.messages.map((m) => {
            const dariPelanggan = m.role === "customer";
            const sistem = m.role === "system";
            return (
              <div
                key={m.id}
                className={`flex ${dariPelanggan ? "justify-start" : "justify-end"}`}
              >
                <div
                  className={`max-w-[85%] rounded-xl px-3.5 py-2.5 sm:max-w-[70%] ${
                    sistem
                      ? "bg-ink-100 text-ink-600"
                      : dariPelanggan
                        ? "border border-ink-200 bg-white text-ink-900"
                        : "bg-ink-900 text-white"
                  }`}
                >
                  <p
                    className={`text-[11px] ${
                      dariPelanggan || sistem ? "text-ink-500" : "text-ink-400"
                    }`}
                  >
                    {LABEL_PERAN[m.role] ?? m.role}
                    {m.mediaType !== "text" ? ` · ${m.mediaType}` : ""} ·{" "}
                    {m.createdAt.toLocaleString("id-ID", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                  <p className="mt-1 whitespace-pre-line text-sm leading-relaxed">
                    {m.content || "(tanpa teks)"}
                  </p>
                  {/* Lampirannya sendiri TIDAK digambar, cuma bacaan AI-nya.
                      Menggambar fotonya berarti menyalin berkas pelanggan ke
                      layar ini, dan yang dibutuhkan untuk memperbaiki produk
                      justru apa yang DIBACA asisten dari foto itu. */}
                  {m.mediaSummary && (
                    <p
                      className={`mt-1.5 border-t pt-1.5 text-xs leading-relaxed ${
                        dariPelanggan || sistem
                          ? "border-ink-200 text-ink-500"
                          : "border-ink-700 text-ink-400"
                      }`}
                    >
                      Yang dibaca asisten dari lampirannya: {m.mediaSummary}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <p className="text-xs leading-relaxed text-ink-500">
          Bukaan ini sudah tercatat atas nama {user.email}. Halaman ini cuma bisa
          membaca; membalas pelanggan tetap lewat akun pemiliknya sendiri.
        </p>
      </div>
    </>
  );
}
