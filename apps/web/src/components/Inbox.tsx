"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RingkasanAI } from "@/components/RingkasanAI";
import { formatJanji } from "@/components/ui";
import { tampilanRasa } from "@/lib/rasa";

interface ConvSummary {
  id: string;
  name: string;
  phone: string | null;
  stage: string;
  aiEnabled: boolean;
  needsHuman: boolean;
  status: string;
  unreadCount: number;
  lastMessageAt: string;
  preview: string;
  lastRole: string | null;
  rasaLabel: string | null;
  rasaAlasan: string | null;
}

interface Msg {
  id: string;
  role: "customer" | "ai" | "human" | "system";
  content: string;
  mediaType: string;
  mediaUrl: string | null;
  mediaSummary: string | null;
  createdAt: string;
}

interface Detail {
  conversation: {
    id: string;
    aiEnabled: boolean;
    needsHuman: boolean;
    handoffReason: string | null;
    status: string;
    channelConnected: boolean;
    isPlayground: boolean;
  };
  contact: {
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
    businessName: string | null;
    industry: string | null;
    stage: string;
    notes: string;
    tags: string[];
    masalah: string | null;
    janjiPada: string | null;
    janjiCatatan: string | null;
    janjiDipastikan: boolean;
    ringkasan: string | null;
    ringkasanAt: string | null;
  };
  messages: Msg[];
}

const FILTERS = [
  { id: "open", label: "Masih jalan" },
  // Bukan saringan, tapi URUTAN: isinya sama dengan "Masih jalan", disusun
  // menurut siapa yang paling mahal kalau ditinggalkan. Lihat catatannya di
  // api/inbox/conversations/route.ts.
  { id: "duluin", label: "Duluin ini" },
  { id: "human", label: "Nunggu kamu" },
  { id: "all", label: "Semua" },
];

/**
 * Ubah tautan jadi bisa diklik, dan pastikan alamat panjang ikut turun baris.
 *
 * Tanpa ini satu tautan panjang mendorong lebar seluruh kolom chat sampai
 * pesannya keluar layar dan harus digeser mendatar.
 */
function TeksPesan({ isi }: { isi: string }) {
  const potongan = isi.split(/(https?:\/\/[^\s]+)/g);

  return (
    <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
      {potongan.map((bagian, i) =>
        /^https?:\/\//.test(bagian) ? (
          <a
            key={i}
            href={bagian}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="underline underline-offset-2 hover:opacity-80"
          >
            {bagian}
          </a>
        ) : (
          <span key={i}>{bagian}</span>
        ),
      )}
    </p>
  );
}

function jam(iso: string) {
  return new Date(iso).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function relatif(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "baru";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}j`;
  return `${Math.floor(h / 24)}h`;
}

export function Inbox({ initialId }: { initialId: string | null }) {
  const [filter, setFilter] = useState("open");
  const [list, setList] = useState<ConvSummary[]>([]);
  const [ringkas, setRingkas] = useState<{
    siapBeli: number;
    perluDitenangkan: number;
  } | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(initialId);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastCount = useRef(0);

  // Tab tersembunyi tidak ditanyai sama sekali.
  //
  // Kotak masuk itu halaman yang PALING sering ditinggal terbuka seharian di
  // tab belakang. Tanpa pemeriksaan ini, tiap tab seperti itu mengirim dua
  // permintaan tiap beberapa detik, selamanya, untuk layar yang tidak sedang
  // dilihat siapa pun, ke server yang juga menjalankan mesin WhatsApp dan AI.
  const sedangDilihat = () =>
    typeof document === "undefined" || !document.hidden;

  const loadList = useCallback(async () => {
    if (!sedangDilihat()) return;
    try {
      const res = await fetch(`/api/inbox/conversations?filter=${filter}`, {
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = await res.json();
      setList(data.conversations);
      setRingkas(data.ringkas ?? null);
      setSelectedId((cur) => cur ?? data.conversations[0]?.id ?? null);
    } catch {
      /* biarkan, coba lagi nanti */
    }
  }, [filter]);

  const loadDetail = useCallback(async (id: string, paksa = false) => {
    // Yang dipanggil tangan (kirim pesan, ubah setelan, selesai meringkas)
    // memakai paksa: hasilnya harus terlihat sekarang, bukan menunggu tab
    // dianggap sedang dilihat.
    if (!paksa && !sedangDilihat()) return;
    try {
      const res = await fetch(`/api/inbox/conversations/${id}`, { cache: "no-store" });
      if (!res.ok) return;
      setDetail(await res.json());
    } catch {
      /* idem */
    }
  }, []);

  useEffect(() => {
    loadList();
    const t = setInterval(loadList, 5000);
    // Begitu tabnya dibuka lagi setelah lama ditinggal, isinya bisa sudah basi
    // berjam-jam. Muat sekali langsung, jangan menunggu putaran berikutnya.
    const saatKembali = () => {
      if (!document.hidden) {
        loadList();
        if (selectedId) loadDetail(selectedId, true);
      }
    };
    document.addEventListener("visibilitychange", saatKembali);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", saatKembali);
    };
  }, [loadList, loadDetail, selectedId]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    loadDetail(selectedId, true);
    const t = setInterval(() => loadDetail(selectedId), 4000);
    return () => clearInterval(t);
  }, [selectedId, loadDetail]);

  // Gulir ke bawah hanya kalau memang ada pesan baru.
  useEffect(() => {
    const n = detail?.messages.length ?? 0;
    if (n !== lastCount.current) {
      lastCount.current = n;
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [detail?.messages.length]);

  async function send() {
    const text = draft.trim();
    if (!text || !selectedId || sending) return;

    setSending(true);
    setError(null);
    try {
      const res = await fetch(`/api/inbox/conversations/${selectedId}/reply`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error ?? "Gagal mengirim.");
      } else {
        setDraft("");
        await loadDetail(selectedId, true);
        await loadList();
      }
    } catch {
      setError("Tidak bisa menghubungi server.");
    } finally {
      setSending(false);
    }
  }

  async function updateSettings(patch: Record<string, unknown>) {
    if (!selectedId) return;
    await fetch(`/api/inbox/conversations/${selectedId}/settings`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(patch),
    });
    await loadDetail(selectedId, true);
    await loadList();
  }

  return (
    <div className="flex h-full min-h-0">
      {/* Daftar percakapan */}
      {/* Daftar obrolan.

          Di HP hanya SATU panel yang tampil sekaligus. Dengan lebar tetap
          320px, layar 375px cuma menyisakan 55px untuk isi obrolannya, dan
          itu bukan sempit tapi tidak bisa dipakai. Jadi di HP daftarnya
          memenuhi layar, lalu digantikan isi obrolan begitu ada yang
          dipilih, dengan tombol kembali. Di layar lebar dua-duanya tetap
          berdampingan seperti biasa. */}
      <div
        className={[
          "flex flex-col border-r border-ink-200 bg-white",
          "w-full lg:w-80 lg:shrink-0",
          selectedId ? "hidden lg:flex" : "flex",
        ].join(" ")}
      >
        <div className="flex gap-1 border-b border-ink-200 p-3">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => {
                setFilter(f.id);
                setSelectedId(null);
              }}
              className={`tap-aman justify-center rounded-md px-3 py-1.5 text-xs transition ${
                filter === f.id
                  ? "bg-ink-900 font-medium text-white"
                  : "text-ink-600 hover:bg-ink-100"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Hitungan singkat, yang BAIK disebut duluan.
            Alasannya ditulis lengkap di api/inbox/conversations/route.ts:
            lencana merah menarik mata jauh lebih kuat daripada lencana hitam,
            jadi tanpa baris ini hal pertama yang dibaca pemilik toko tiap pagi
            selalu kemarahan. */}
        {ringkas && (ringkas.siapBeli > 0 || ringkas.perluDitenangkan > 0) && (
          <p className="border-b border-ink-100 px-4 py-2 text-xs text-ink-500">
            {ringkas.siapBeli > 0 && (
              <span className="font-medium text-ink-900">
                {ringkas.siapBeli} siap beli
              </span>
            )}
            {ringkas.siapBeli > 0 && ringkas.perluDitenangkan > 0 && " · "}
            {ringkas.perluDitenangkan > 0 && (
              <span>{ringkas.perluDitenangkan} perlu ditenangkan</span>
            )}
          </p>
        )}

        <div className="thin-scroll min-h-0 flex-1 overflow-y-auto">
          {list.length === 0 ? (
            <p className="p-5 text-sm leading-relaxed text-ink-500">
              Tidak ada obrolan di sini.
            </p>
          ) : (
            list.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedId(c.id)}
                className={`w-full border-b border-ink-100 px-4 py-3 text-left transition ${
                  selectedId === c.id ? "bg-brand-50/70" : "hover:bg-ink-50"
                }`}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-sm font-medium text-ink-900">
                    {c.name}
                  </span>
                  <span className="shrink-0 text-[11px] text-ink-400">
                    {relatif(c.lastMessageAt)}
                  </span>
                </div>
                <p className="mt-0.5 truncate text-xs text-ink-500">
                  {c.lastRole === "customer" ? "" : "↩ "}
                  {c.preview || "belum ada pesan"}
                </p>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  {/* Lencana rasa duluan, karena inilah yang menentukan urutan
                      kerja. "Nunggu kamu" menerangkan STATUS obrolannya;
                      lencana ini menerangkan KEADAAN orangnya, dan yang kedua
                      itu yang menjawab "mulai dari mana". */}
                  {(() => {
                    const r = tampilanRasa(c.rasaLabel);
                    return r ? <span className={`badge ${r.kelas}`}>{r.teks}</span> : null;
                  })()}
                  {c.needsHuman && (
                    <span className="badge bg-amber-100 text-amber-800">
                      nunggu kamu
                    </span>
                  )}
                  {!c.aiEnabled && (
                    <span className="badge bg-ink-100 text-ink-600">kamu pegang</span>
                  )}
                  {c.unreadCount > 0 && (
                    <span className="badge bg-brand-600 text-white">
                      {c.unreadCount}
                    </span>
                  )}
                </div>
                {/* Alasannya, apa adanya.
                    Tanpa ini lencananya cuma tebakan yang tidak bisa dibantah,
                    dan tebakan yang tidak bisa dijelaskan akan dimatikan orang
                    di minggu kedua. Cuma ditampilkan kalau lencananya memang
                    muncul, supaya baris ini tidak jadi kebisingan tetap. */}
                {c.rasaAlasan && tampilanRasa(c.rasaLabel) && (
                  <p className="mt-1 truncate text-[11px] text-ink-400">
                    {c.rasaAlasan}
                  </p>
                )}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Thread */}
      {!detail ? (
        <div className="hidden flex-1 place-items-center text-sm text-ink-500 lg:grid">
          Pilih obrolan di sebelah kiri.
        </div>
      ) : (
        <>
          <div className="flex min-w-0 flex-1 flex-col bg-ink-50">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-200 bg-white px-4 py-3 sm:px-5">
              <div className="flex min-w-0 flex-1 items-center gap-2">
                {/* Kembali ke daftar. Cuma ada di HP, karena di layar lebar
                    daftarnya tidak pernah hilang. */}
                <button
                  type="button"
                  onClick={() => setSelectedId(null)}
                  aria-label="Kembali ke daftar obrolan"
                  className="-ml-1 grid h-9 w-9 shrink-0 place-items-center rounded-lg text-ink-600 active:bg-ink-100 lg:hidden"
                >
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 5l-7 7 7 7" />
                  </svg>
                </button>
                <div className="min-w-0">
                <p className="truncate font-medium text-ink-900">
                  {detail.contact.name}
                </p>
                <p className="truncate text-xs text-ink-500">
                  {detail.conversation.isPlayground
                    ? "Ruang coba, bukan WhatsApp beneran"
                    : (detail.contact.phone ?? "tanpa nomor")}
                  {!detail.conversation.isPlayground &&
                    !detail.conversation.channelConnected &&
                    " · nomornya lagi tidak nyambung"}
                </p>

                {/* Jalan menuju profil, khusus layar di bawah xl.

                    Panel kanan yang memuat ringkasan, lampiran, janji temu,
                    dan tautan profil baru muncul di 1280px ke atas. Di HP dan
                    tablet dia hilang seluruhnya, dan dulu itu berarti tidak ada
                    satu pun jalan dari obrolan menuju profil pelanggannya.
                    Orang yang membalas dari HP kehilangan semua yang sudah
                    dikumpulkan sistem tentang lawan bicaranya. */}
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 xl:hidden">
                  <a
                    href={`/app/kontak/${detail.contact.id}`}
                    className="tap-aman text-xs font-medium text-brand-700"
                  >
                    Lihat profil
                  </a>
                  {detail.contact.masalah && (
                    <span className="badge bg-red-50 text-red-700">
                      ada keluhan
                    </span>
                  )}
                  {detail.contact.janjiPada &&
                    new Date(detail.contact.janjiPada).getTime() > Date.now() && (
                      <span className="badge bg-brand-50 text-brand-700">
                        {formatJanji(detail.contact.janjiPada)}
                      </span>
                    )}
                </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    updateSettings({ aiEnabled: !detail.conversation.aiEnabled })
                  }
                  className={
                    detail.conversation.aiEnabled ? "btn-ghost" : "btn-primary"
                  }
                >
                  {detail.conversation.aiEnabled
                    ? "Saya yang balas"
                    : "Balik ke asisten"}
                </button>
                <button
                  onClick={() =>
                    updateSettings({
                      status:
                        detail.conversation.status === "open" ? "resolved" : "open",
                    })
                  }
                  className="btn-ghost"
                >
                  {detail.conversation.status === "open" ? "Sudah beres" : "Buka lagi"}
                </button>
              </div>
            </div>

            {detail.conversation.needsHuman && (
              <div className="border-b border-amber-200 bg-amber-50 px-5 py-2 text-sm text-amber-900">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <strong>Asisten minta bantuan:</strong>{" "}
                    {detail.conversation.handoffReason ??
                      "sebaiknya kamu yang lanjutkan"}
                    <span className="block text-amber-800">
                      Dia berhenti sebentar supaya kamu sempat masuk. Kalau
                      dibiarkan, dia lanjut sendiri daripada pelanggannya
                      didiamkan.
                    </span>
                  </div>
                  {/* Menurunkan bendera langsung, tanpa harus mematikan lalu
                      menghidupkan lagi asistennya. Dulu tombolnya memang tidak
                      ada: satu-satunya jalan adalah menekan "Saya yang balas"
                      lalu "Balik ke asisten", dua klik untuk satu maksud. */}
                  <button
                    onClick={() => updateSettings({ needsHuman: false })}
                    className="btn-ghost shrink-0"
                  >
                    Sudah saya tangani
                  </button>
                </div>
              </div>
            )}

            <div className="thin-scroll min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-5">
              {detail.messages.map((m) => {
                // Catatan sistem: keterangan kenapa asisten sengaja tidak
                // membalas. Sengaja TIDAK berbentuk bubble dan tidak menempel
                // ke sisi mana pun, supaya tidak sedetik pun terbaca sebagai
                // pesan yang terkirim ke pelanggan.
                if (m.role === "system") {
                  return (
                    <div key={m.id} className="flex justify-center">
                      <div className="max-w-[85%] rounded-lg bg-ink-100 px-3 py-1.5 text-center text-xs leading-relaxed text-ink-600">
                        {m.content}
                      </div>
                    </div>
                  );
                }

                const mine = m.role !== "customer";
                return (
                  <div
                    key={m.id}
                    className={`flex ${mine ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`min-w-0 max-w-[70%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
                        m.role === "customer"
                          ? "rounded-bl-sm border border-ink-200 bg-white text-ink-900"
                          : m.role === "human"
                            ? "rounded-br-sm bg-ink-800 text-white"
                            : "rounded-br-sm bg-brand-600 text-white"
                      }`}
                    >
                      {m.mediaUrl && m.mediaType === "image" && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={m.mediaUrl}
                          alt="lampiran"
                          className="mb-2 max-h-64 rounded-lg"
                        />
                      )}
                      {m.mediaUrl && m.mediaType === "audio" && (
                        <audio controls src={m.mediaUrl} className="mb-2 w-56" />
                      )}
                      {m.mediaUrl &&
                        !["image", "audio"].includes(m.mediaType) && (
                          <a
                            href={m.mediaUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="mb-2 block underline"
                          >
                            Buka lampiran ({m.mediaType})
                          </a>
                        )}
                      {/* Bacaan AI atas lampirannya. Ditaruh menempel di bawah
                          lampirannya, bukan di baris terpisah, supaya jelas dia
                          keterangan gambar dan bukan ucapan pelanggan.

                          Yang dicari orang dari bukti transfer itu nominalnya,
                          dan nominal di struk hasil screenshot sering kekecilan
                          untuk dibaca di HP. Ini sudah tersimpan sejak pesannya
                          masuk, cuma dulu tidak pernah ditampilkan. */}
                      {m.mediaSummary && (
                        <p
                          className={`mb-2 text-[11px] leading-relaxed ${
                            mine ? "text-white/70" : "text-ink-500"
                          }`}
                        >
                          {m.mediaSummary}
                        </p>
                      )}
                      {m.content && <TeksPesan isi={m.content} />}
                      <p
                        className={`mt-1 text-[10px] ${
                          mine ? "text-white/60" : "text-ink-400"
                        }`}
                      >
                        {m.role === "human"
                          ? "kamu · "
                          : m.role === "ai"
                            ? "asisten · "
                            : ""}
                        {jam(m.createdAt)}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            <div className="border-t border-ink-200 bg-white p-4">
              {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
              <div className="flex gap-2">
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send();
                    }
                  }}
                  rows={2}
                  placeholder="Ketik balasan. Enter untuk kirim, Shift+Enter buat ganti baris."
                  className="input resize-none"
                />
                <button
                  onClick={send}
                  disabled={sending || !draft.trim()}
                  className="btn-primary self-end"
                >
                  Kirim
                </button>
              </div>
              <p className="mt-2 text-xs text-ink-500">
                Begitu kamu ikut balas, asisten langsung berhenti di obrolan ini.
              </p>
            </div>
          </div>

          {/* Panel kontak.

              Urutannya menurut seberapa sering dipakai, bukan menurut rapinya
              tabel: ringkasan dulu karena itu yang menjawab "ada apa dengan
              orang ini", lalu keluhan, lalu lampiran yang dia kirim, baru
              identitasnya. Nama dan nomor sudah tertulis di kepala obrolan,
              jadi mengulangnya di urutan pertama cuma memakan tempat. */}
          <div className="thin-scroll hidden w-72 shrink-0 overflow-y-auto border-l border-ink-200 bg-white p-5 xl:block">
            <RingkasanAI
              contactId={detail.contact.id}
              isi={detail.contact.ringkasan}
              dibuatPada={detail.contact.ringkasanAt}
              pesanTerakhir={
                detail.messages[detail.messages.length - 1]?.createdAt ?? null
              }
              onSelesai={() => loadDetail(detail.conversation.id, true)}
            />

            {detail.contact.janjiPada &&
              new Date(detail.contact.janjiPada).getTime() > Date.now() && (
                <div
                  className={`mt-5 rounded-lg border px-3 py-2.5 ${
                    detail.contact.janjiDipastikan
                      ? "border-brand-200 bg-brand-50"
                      : "border-amber-300 bg-amber-50"
                  }`}
                >
                  <p className="text-xs font-medium text-ink-900">
                    {formatJanji(detail.contact.janjiPada)}
                  </p>
                  {detail.contact.janjiCatatan && (
                    <p className="mt-0.5 text-xs text-ink-600">
                      {detail.contact.janjiCatatan}
                    </p>
                  )}
                  {!detail.contact.janjiDipastikan && (
                    <p className="mt-1 text-[11px] text-amber-800">
                      Belum kamu pastikan. Asisten cuma mencatat permintaannya.
                    </p>
                  )}
                </div>
              )}

            {detail.contact.masalah && (
              <div className="mt-5 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5">
                <p className="text-xs font-medium text-red-900">Keluhan</p>
                <p className="mt-1 text-xs leading-relaxed text-red-900">
                  {detail.contact.masalah}
                </p>
              </div>
            )}

            {/* Lampiran dikumpulkan jadi satu.

                Bukti transfer, foto barang rusak, dan PDF penawaran itu yang
                paling sering dicari ulang, dan mencarinya berarti menggulir
                obrolan panjang ke atas sambil menebak-nebak. Di sini semuanya
                berderet dengan bacaan AI-nya, jadi nominalnya kebaca tanpa
                membuka gambarnya. */}
            {(() => {
              const lampiran = detail.messages.filter(
                (m) => m.mediaUrl && m.mediaType !== "text",
              );
              if (lampiran.length === 0) return null;
              return (
                <div className="mt-6">
                  <h4 className="text-sm font-semibold text-ink-900">
                    Lampiran ({lampiran.length})
                  </h4>
                  <ul className="mt-2 space-y-2">
                    {lampiran
                      .slice()
                      .reverse()
                      .map((m) => (
                        <li key={m.id}>
                          <a
                            href={m.mediaUrl ?? "#"}
                            target="_blank"
                            rel="noreferrer"
                            className="block rounded-lg border border-ink-200 px-2.5 py-2 transition hover:border-brand-400"
                          >
                            <p className="text-xs leading-relaxed text-ink-800">
                              {m.mediaSummary ??
                                m.content ??
                                `Lampiran ${m.mediaType}`}
                            </p>
                            <p className="mt-1 text-[11px] text-ink-400">
                              {m.role === "customer" ? "dari pelanggan" : "kita kirim"}
                              {" · "}
                              {m.mediaType} · {jam(m.createdAt)}
                            </p>
                          </a>
                        </li>
                      ))}
                  </ul>
                </div>
              );
            })()}

            <h3 className="mt-6 text-sm font-semibold text-ink-900">Data pelanggan</h3>
            <dl className="mt-3 space-y-3 text-sm">
              {(
                [
                  ["Nama", detail.contact.name],
                  ["Nomor", detail.contact.phone],
                  ["Email", detail.contact.email],
                  ["Tahap", detail.contact.stage],
                  // Dua ini cuma muncul kalau memang terisi. Menampilkan
                  // "Nama usaha: belum tahu" ke warung yang pembelinya orang
                  // biasa bikin produknya kelihatan salah alamat, seolah cuma
                  // untuk jualan antar perusahaan.
                  ["Nama usaha", detail.contact.businessName],
                  ["Bidang usaha", detail.contact.industry],
                ] as [string, string | null][]
              )
                .filter(
                  ([label, value]) =>
                    value ||
                    label === "Nama" ||
                    label === "Nomor" ||
                    label === "Tahap",
                )
                .map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-xs text-ink-500">{label}</dt>
                    <dd className="break-words text-ink-900">
                      {value || "belum tahu"}
                    </dd>
                  </div>
                ))}
            </dl>

            {detail.contact.tags.length > 0 && (
              <>
                <h4 className="mt-5 text-xs text-ink-500">Minatnya</h4>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {detail.contact.tags.map((t) => (
                    <span key={t} className="badge bg-ink-100 text-ink-700">
                      {t}
                    </span>
                  ))}
                </div>
              </>
            )}

            <a
              href={`/app/kontak/${detail.contact.id}`}
              className="tap-aman mt-6 block text-xs font-medium text-brand-700 hover:underline"
            >
              Buka profil lengkapnya
            </a>
            <p className="mt-3 text-xs leading-relaxed text-ink-400">
              Data ini terisi otomatis dari isi obrolan. Yang salah bisa dibetulkan
              di profilnya.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
