"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RingkasanAI } from "@/components/RingkasanAI";
import { formatJanji } from "@/components/ui";
import { InfoTip } from "@/components/InfoTip";
import { Ikon } from "@/components/Ikon";
import { tampilanRasa } from "@/lib/rasa";

/**
 * Avatar inisial, digambar sendiri.
 *
 * Foto pelanggan tidak pernah ada di WhatsApp lewat jalur ini, jadi yang paling
 * dikenali orang justru inisial dalam lingkaran, sama seperti aplikasi chat
 * yang mereka pakai tiap hari. Warnanya netral (abu di atas abu muda), bukan
 * warna acak per orang: warna acak menarik mata ke hiasan, padahal yang penting
 * namanya, bukan warnanya.
 */
function Avatar({
  nama,
  ukuran = 40,
}: {
  nama: string;
  ukuran?: number;
}) {
  const inisial = (nama.trim()[0] ?? "?").toUpperCase();
  return (
    <span
      aria-hidden
      className="grid shrink-0 place-items-center rounded-full bg-ink-100 font-semibold text-ink-600"
      style={{ height: ukuran, width: ukuran, fontSize: ukuran * 0.42 }}
    >
      {inisial}
    </span>
  );
}

/** Tiga titik "sedang diketik". Warnanya ikut warna teks induknya. */
function TitikKetik() {
  return (
    <span className="titik-ketik inline-flex items-center gap-1">
      <span />
      <span />
      <span />
    </span>
  );
}

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
  // Menu titik-tiga di kepala obrolan (HP dan desktop sama), supaya tombol
  // aksi yang jarang dipakai tidak berdesakan dengan nama di layar sempit.
  const [aksiTerbuka, setAksiTerbuka] = useState(false);
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
      // Auto-pilih obrolan pertama CUMA di layar lebar.
      //
      // Di layar lebar daftar dan obrolan berdampingan, jadi memilihkan yang
      // pertama bikin panel kanan tidak kosong. Di HP obrolan itu layar penuh:
      // kalau dipilihkan otomatis, menekan tombol kembali membuka lagi obrolan
      // pertama seketika, dan orang tidak pernah sampai ke daftarnya. Jadi di HP
      // biarkan kosong (tampilkan daftar) sampai orangnya sendiri yang memilih.
      const layarLebar =
        typeof window !== "undefined" &&
        window.matchMedia("(min-width: 1024px)").matches;
      setSelectedId((cur) =>
        cur ?? (layarLebar ? (data.conversations[0]?.id ?? null) : null),
      );
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
                className={`relative flex w-full gap-3 border-b border-ink-100 px-4 py-3 text-left transition ${
                  selectedId === c.id ? "bg-ink-100" : "hover:bg-ink-50"
                }`}
              >
                {/* Garis penanda di tepi kiri waktu terpilih. Cuma di layar
                    lebar, tempat daftarnya berdampingan dengan obrolannya. */}
                {selectedId === c.id && (
                  <span className="absolute inset-y-0 left-0 hidden w-0.5 bg-ink-900 lg:block" />
                )}
                <Avatar nama={c.name} />
                <div className="min-w-0 flex-1">
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
                </div>
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
          {/* Di HP satu obrolan itu LAYAR PENUH yang menutupi bar menu bawah.

              `fixed inset-0 z-50` menutupi kepala halaman dan bar menu, jadi
              tinggi layar penuh jadi milik obrolannya, sama seperti membuka satu
              chat di WhatsApp. Bar menu tidak perlu di sini: yang lagi di dalam
              obrolan tidak sedang berpindah halaman, dia sedang membalas.
              Tombol kembali di kepala obrolan yang menutupnya lagi.

              Di layar lebar (lg) dia balik jadi panel biasa di sebelah daftar.
              key-nya id percakapan, jadi tiap pindah obrolan animasinya main
              lagi. */}
          <div
            key={detail.conversation.id}
            className="anim-obrolan fixed inset-0 z-50 flex flex-col bg-ink-50 lg:static lg:z-auto lg:min-w-0 lg:flex-1"
          >
            <div className="flex items-center gap-2.5 border-b border-ink-200 bg-white px-3 py-2.5 pt-[max(0.625rem,env(safe-area-inset-top))] sm:px-5 lg:pt-2.5">
              {/* Kembali ke daftar. Cuma di HP; di layar lebar daftarnya tidak
                  pernah hilang. */}
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                aria-label="Kembali ke daftar obrolan"
                className="-ml-1 grid h-9 w-9 shrink-0 place-items-center rounded-lg text-ink-600 transition active:bg-ink-100 lg:hidden"
              >
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 5l-7 7 7 7" />
                </svg>
              </button>

              <Avatar nama={detail.contact.name} ukuran={38} />

              <div className="min-w-0 flex-1">
                <p className="truncate font-medium leading-tight text-ink-900">
                  {detail.contact.name}
                </p>
                <p className="truncate text-xs leading-tight text-ink-500">
                  {detail.conversation.isPlayground
                    ? "Ruang coba, bukan WhatsApp beneran"
                    : (detail.contact.phone ?? "tanpa nomor")}
                  {!detail.conversation.isPlayground &&
                    !detail.conversation.channelConnected &&
                    " · nomornya lagi tidak nyambung"}
                </p>
                {/* Konteks cepat (keluhan / janji) cuma muncul kalau memang ada,
                    dan disembunyikan di xl karena panel kanan sudah memuatnya. */}
                {(detail.contact.masalah ||
                  (detail.contact.janjiPada &&
                    new Date(detail.contact.janjiPada).getTime() > Date.now())) && (
                  <div className="mt-1 flex flex-wrap items-center gap-1.5 xl:hidden">
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
                )}
              </div>

              {/* Ambil alih (yang paling sering) tetap terlihat; sisanya di menu
                  titik-tiga supaya kepala obrolan tidak berdesakan di HP.
                  Labelnya dipendekkan ("Saya balas" / "Ke asisten") supaya muat
                  di layar sempit tanpa mendorong nama pelanggannya. */}
              <button
                onClick={() =>
                  updateSettings({ aiEnabled: !detail.conversation.aiEnabled })
                }
                className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  detail.conversation.aiEnabled
                    ? "border border-ink-200 text-ink-700 hover:bg-ink-50"
                    : "bg-brand-600 text-white hover:bg-brand-700"
                }`}
              >
                {detail.conversation.aiEnabled ? "Saya balas" : "Ke asisten"}
              </button>

              <div className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => setAksiTerbuka((v) => !v)}
                  aria-label="Menu obrolan"
                  aria-expanded={aksiTerbuka}
                  className="grid h-9 w-9 place-items-center rounded-lg text-ink-500 transition hover:bg-ink-100 hover:text-ink-800"
                >
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
                    <circle cx="12" cy="5" r="1.6" />
                    <circle cx="12" cy="12" r="1.6" />
                    <circle cx="12" cy="19" r="1.6" />
                  </svg>
                </button>
                {aksiTerbuka && (
                  <>
                    {/* Sekali klik di luar menutupnya. */}
                    <span
                      aria-hidden
                      onClick={() => setAksiTerbuka(false)}
                      className="fixed inset-0 z-40"
                    />
                    <div className="anim-naik absolute right-0 top-full z-50 mt-1 w-52 overflow-hidden rounded-xl border border-ink-200 bg-white py-1 shadow-[0_8px_24px_-8px_rgba(15,15,15,0.25)]">
                      <button
                        onClick={() => {
                          setAksiTerbuka(false);
                          updateSettings({
                            status:
                              detail.conversation.status === "open"
                                ? "resolved"
                                : "open",
                          });
                        }}
                        className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-ink-700 hover:bg-ink-50"
                      >
                        <Ikon
                          nama="centang"
                          size={16}
                          className="shrink-0 text-ink-500"
                        />
                        {detail.conversation.status === "open"
                          ? "Tandai sudah beres"
                          : "Buka lagi"}
                      </button>
                      <a
                        href={`/app/kontak/${detail.contact.id}`}
                        className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-ink-700 hover:bg-ink-50"
                      >
                        <Ikon
                          nama="pelanggan"
                          size={16}
                          className="shrink-0 text-ink-500"
                        />
                        Lihat profil
                      </a>
                    </div>
                  </>
                )}
              </div>
            </div>

            {detail.conversation.needsHuman && (
              // Diringkas buat HP: alasannya tetap kelihatan, penjelasan
              // "kenapa asisten berhenti" pindah ke lambang info. Dulu
              // penjelasan dua baris itu selalu terpampang dan bikin bilah ini
              // makan tinggi layar yang seharusnya jadi isi obrolan.
              <div className="flex items-center gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2 text-amber-900 sm:px-5">
                {/* Ikon asisten sebagai penanda, ganti tulisan "Asisten minta
                    bantuan:". Alasannya dipotong maksimal dua baris; teks penuh
                    plus penjelasan "kenapa berhenti" di lambang info. */}
                <span className="shrink-0 text-amber-700">
                  <Ikon nama="asisten" size={16} />
                </span>
                <p className="line-clamp-2 min-w-0 flex-1 text-[13px] leading-snug">
                  {detail.conversation.handoffReason ??
                    "Sebaiknya kamu yang lanjutkan obrolan ini."}
                </p>
                <InfoTip label="Selengkapnya" judul="Asisten minta bantuan">
                  <span className="block">
                    {detail.conversation.handoffReason ??
                      "Sebaiknya kamu yang lanjutkan obrolan ini."}
                  </span>
                  <span className="mt-2 block text-ink-500">
                    Dia berhenti sebentar supaya kamu sempat masuk. Kalau
                    dibiarkan, dia lanjut sendiri daripada pelanggannya
                    didiamkan.
                  </span>
                </InfoTip>
                {/* Menurunkan bendera langsung. Ikon centang saja; "Sudah saya
                    tangani" jadi label pembaca layar dan tooltip. */}
                <button
                  onClick={() => updateSettings({ needsHuman: false })}
                  aria-label="Sudah saya tangani"
                  title="Sudah saya tangani"
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-amber-300 bg-white/70 text-amber-900 transition hover:bg-white"
                >
                  <Ikon nama="centang" size={16} />
                </button>
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
                    {/* Warnanya hitam putih, bukan biru.
                        - Pelanggan (mereka): putih bertepi, di kiri.
                        - Kita (kanan): gelap. Balasanmu sendiri paling gelap
                          (ink-950), balasan asisten sedikit lebih muda (ink-800),
                          jadi sekilas kelihatan mana yang kamu ketik dan mana
                          yang asisten, diperkuat labelnya di bawah.
                        Biru sengaja dilepas dari gelembung: dulu tiap balasan AI
                        jadi bidang biru, padahal biru disimpan untuk hal yang
                        bisa diklik. */}
                    <div
                      className={`min-w-0 max-w-[78%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed shadow-sm sm:max-w-[70%] ${
                        m.role === "customer"
                          ? "rounded-bl-sm border border-ink-200 bg-white text-ink-900"
                          : m.role === "human"
                            ? "rounded-br-sm bg-ink-950 text-white"
                            : "rounded-br-sm bg-ink-800 text-white"
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
              {/* "Sedang mengirim" sebagai gelembung titik di sisi kita,
                  muncul sesaat sesudah tombol kirim ditekan. Kecil, hidup,
                  tidak mengganggu. */}
              {sending && (
                <div className="flex justify-end">
                  <div className="rounded-2xl rounded-br-sm bg-ink-950 px-4 py-3 text-white/80 shadow-sm">
                    <TitikKetik />
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Kotak tulis. Di HP menempel di dasar layar penuh (jarak aman
                iPhone dihormati), tombol kirim jadi lingkaran berikon supaya
                hemat lebar dan langsung terbaca sebagai "kirim". */}
            <div className="border-t border-ink-200 bg-white px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-5">
              {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
              <div className="flex items-end gap-2">
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send();
                    }
                  }}
                  rows={1}
                  placeholder="Ketik balasan"
                  className="input max-h-32 min-h-[44px] flex-1 resize-none py-2.5"
                />
                <button
                  onClick={send}
                  disabled={sending || !draft.trim()}
                  aria-label="Kirim"
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand-600 text-white transition hover:bg-brand-700 active:scale-95 disabled:cursor-not-allowed disabled:bg-ink-200 disabled:text-ink-400"
                >
                  <Ikon nama="kirim" size={19} />
                </button>
              </div>
              {/* Cuma diperlihatkan selama asisten masih yang membalas; begitu
                  kamu sudah ambil alih, kalimat ini tidak berlaku lagi. */}
              {detail.conversation.aiEnabled && (
                <p className="mt-2 text-[11px] leading-relaxed text-ink-500">
                  Begitu kamu ikut balas, asisten langsung berhenti di obrolan ini.
                </p>
              )}
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
