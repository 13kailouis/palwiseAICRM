"use client";

import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { Avatar, formatJanji } from "@/components/ui";
import { InfoTip } from "@/components/InfoTip";
import { Ikon } from "@/components/Ikon";
import { tampilanRasa } from "@/lib/rasa";

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
  waFotoPath: string | null;
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
    waFotoPath: string | null;
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

/**
 * Saringan, plus kunci angka yang dipajang di pilnya.
 *
 * Angka dipajang karena dia menggantikan kalimat: "Nunggu kamu 3" sudah
 * menjawab "ada yang perlu saya pegang?" tanpa satu baris keterangan pun.
 * "Duluin ini" TIDAK punya angka: isinya sama dengan "Masih jalan", cuma
 * urutannya beda, dan angka kembar di dua pil bersebelahan bikin orang mengira
 * dua-duanya daftar yang berbeda.
 */
const FILTERS: {
  id: string;
  label: string;
  hitung?: "open" | "human" | "all" | "panas" | "tenangkan";
}[] = [
  { id: "open", label: "Masih jalan", hitung: "open" },
  { id: "human", label: "Nunggu kamu", hitung: "human" },
  // Dua ini dulu cuma chip angka di barisnya sendiri di atas daftar: memakan
  // satu baris penuh dan tidak bisa diapa-apakan. Sebagai saringan mereka
  // menyatu ke baris ini, dan angkanya sekalian jadi jalan masuk.
  //
  // Tulisannya sengaja SAMA dengan lencana di baris daftar ("mau beli",
  // "kesal"), jadi pil dan lencana saling menjelaskan tanpa keterangan
  // tambahan. Yang baik tetap ditulis sebelum yang buruk: kotak masuk yang
  // tiap pagi menyodorkan kemarahan duluan lama-lama tidak dibuka lagi.
  { id: "panas", label: "Mau beli", hitung: "panas" },
  { id: "tenangkan", label: "Kesal", hitung: "tenangkan" },
  // Bukan saringan, tapi URUTAN: isinya sama dengan "Masih jalan", disusun
  // menurut siapa yang paling mahal kalau ditinggalkan. Lihat catatannya di
  // api/inbox/conversations/route.ts. Ditaruh sesudah yang menyaring karena
  // empat pil pertama yang dipakai tiap hari.
  { id: "duluin", label: "Duluin ini" },
  { id: "all", label: "Semua", hitung: "all" },
];

/** Lencana rasa yang cukup mendesak sehingga alasannya ikut ditulis di daftar. */
const RASA_MENDESAK = new Set(["marah", "kesal", "mundur", "ragu"]);

/** Awal hari untuk sebuah waktu, dipakai memisah pesan per tanggal. */
function hariDari(iso: string): number {
  const d = new Date(iso);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/**
 * Label pemisah hari di dalam obrolan.
 *
 * Obrolan yang berjalan berminggu-minggu tanpa pemisah terbaca sebagai satu
 * dinding pesan, dan jam saja ("09.15") tidak memberi tahu itu jam sembilan
 * hari ini atau bulan lalu.
 */
function labelHari(waktu: number): string {
  const selisih = Math.round((hariDari(new Date().toISOString()) - waktu) / 86_400_000);
  if (selisih === 0) return "Hari ini";
  if (selisih === 1) return "Kemarin";
  const d = new Date(waktu);
  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    ...(d.getFullYear() === new Date().getFullYear() ? {} : { year: "numeric" }),
  });
}

/**
 * Format ala WhatsApp: *tebal*, _miring_, ~coret~.
 *
 * Pelanggan dan asisten menulis dengan tanda ini karena itu yang mereka pakai
 * di WhatsApp, jadi menampilkan bintangnya mentah ("*Total*") bukan cuma jelek,
 * tapi bikin pesan yang di WhatsApp rapi jadi berantakan di sini. Penandanya
 * harus menempel ke huruf (bukan spasi), sama seperti aturan WhatsApp, supaya
 * "2 * 3" atau "snake_case" tidak ikut terformat. Boleh bersarang, jadi
 * fungsinya memanggil dirinya sendiri untuk isi di dalam penanda.
 */
function formatWA(teks: string, kunci: string): React.ReactNode[] {
  // Isi penanda diawali DAN diakhiri huruf/tanda (bukan spasi) lewat pola
  // `\S(?:...\S)?`, bukan lookbehind: lookbehind belum jalan di Safari iOS lama
  // dan galat sintaksnya menjatuhkan seluruh bundel, bukan cuma fitur ini.
  const re = /([*_~])(\S(?:[\s\S]*?\S)?)\1/g;
  const keluar: React.ReactNode[] = [];
  let akhir = 0;
  let m: RegExpExecArray | null;
  let n = 0;
  while ((m = re.exec(teks))) {
    if (m.index > akhir) keluar.push(teks.slice(akhir, m.index));
    const [utuh, tanda, dalam] = m;
    const anak = formatWA(dalam, `${kunci}.${n}`);
    if (tanda === "*") keluar.push(<strong key={`${kunci}.${n}`}>{anak}</strong>);
    else if (tanda === "_") keluar.push(<em key={`${kunci}.${n}`}>{anak}</em>);
    else
      keluar.push(
        <span key={`${kunci}.${n}`} className="line-through">
          {anak}
        </span>,
      );
    akhir = m.index + utuh.length;
    n++;
  }
  if (akhir < teks.length) keluar.push(teks.slice(akhir));
  return keluar;
}

/**
 * Ubah tautan jadi bisa diklik (dan pastikan alamat panjang ikut turun baris),
 * lalu format sisanya ala WhatsApp.
 *
 * Tanpa linkify, satu tautan panjang mendorong lebar seluruh kolom chat sampai
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
          <span key={i}>{formatWA(bagian, `f${i}`)}</span>
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

/**
 * Satu gelembung pesan.
 *
 * Dipisah dari daftarnya supaya dua urusan tidak bercampur: di daftar tinggal
 * urutan dan pemisah hari, di sini bentuk gelembung, lampiran, dan jamnya.
 */
function PesanBaris({
  m,
  rapat,
  tampilkanJam,
}: {
  m: Msg;
  /** Menempel ke pesan di atasnya: pengirim sama, jarak dekat. */
  rapat: boolean;
  /** Pesan terakhir di kelompoknya, jadi dia yang membawa jam. */
  tampilkanJam: boolean;
}) {
  // Catatan sistem: keterangan kenapa asisten sengaja tidak
  // membalas. Sengaja TIDAK berbentuk bubble dan tidak menempel
  // ke sisi mana pun, supaya tidak sedetik pun terbaca sebagai
  // pesan yang terkirim ke pelanggan.
  if (m.role === "system") {
    return (
      <div className="mt-3 flex justify-center">
        <div className="max-w-[85%] rounded-lg bg-ink-200 px-3 py-1.5 text-center text-xs leading-relaxed text-ink-700">
          {m.content}
        </div>
      </div>
    );
  }

  const mine = m.role !== "customer";
  return (
    <div
      className={`flex ${mine ? "justify-end" : "justify-start"} ${
        rapat ? "mt-[3px]" : "mt-3"
      }`}
    >
      {/* Tiap gelembung harus BEDA dari latarnya DAN dari gelembung
          sebelahnya.
          - Latar obrolan: abu sangat muda (ink-50).
          - Pelanggan (kiri): biru sangat muda (brand-50) bergaris tipis.
            Sempat PUTIH, dan putih di atas latar yang hampir putih itu
            hampir tidak terbaca sebagai gelembung sama sekali.
          - Kamu (kanan): biru penuh (brand-600).
          - Asisten (kanan): gelap (ink-900).
          Jadi kiri selalu terang dan kanan selalu pekat, dan di sisi
          kanan biru berarti kamu sementara gelap berarti asisten. */}
      <div
        className={`min-w-0 max-w-[82%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed sm:max-w-[70%] ${
          m.role === "customer"
            ? `border border-brand-200/70 bg-brand-50 text-ink-900 ${rapat ? "rounded-tl-md" : "rounded-bl-md"}`
            : m.role === "human"
              ? `bg-brand-600 text-white ${rapat ? "rounded-tr-md" : "rounded-br-md"}`
              : `bg-ink-900 text-white ${rapat ? "rounded-tr-md" : "rounded-br-md"}`
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
        {/* Jam cuma di pesan TERAKHIR tiap kelompok. Lima pesan pendek
            berturut-turut dulu membawa lima baris jam, dan barisan jam itu
            memakan tempat sebanyak isinya sendiri. */}
        {tampilkanJam && (
          <p
            className={`mt-1 text-[10px] ${
              mine ? "text-white/60" : "text-ink-400"
            }`}
          >
            {m.role === "human" ? "kamu · " : m.role === "ai" ? "asisten · " : ""}
            {jam(m.createdAt)}
          </p>
        )}
      </div>
    </div>
  );
}

export function Inbox({ initialId }: { initialId: string | null }) {
  const [filter, setFilter] = useState("open");
  const [list, setList] = useState<ConvSummary[]>([]);
  /** Angka per saringan, dihitung server. Lihat api/inbox/conversations. */
  const [jumlah, setJumlah] = useState<Record<string, number>>({});
  // Pencarian di daftar. Kotaknya TERTUTUP sampai ikonnya diketuk: kolom yang
  // selalu terpampang memakan satu baris penuh di layar yang isinya memang
  // daftar, bukan formulir.
  const [cari, setCari] = useState("");
  const [cariBuka, setCariBuka] = useState(false);
  // Tombol "turun ke pesan terbaru" cuma muncul kalau memang sedang menggulir
  // jauh ke atas. Tanpa penanda ini dia mengambang terus di atas obrolan.
  const [jauhDariBawah, setJauhDariBawah] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(initialId);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Menu titik-tiga di kepala obrolan (HP dan desktop sama), supaya tombol
  // aksi yang jarang dipakai tidak berdesakan dengan nama di layar sempit.
  const [aksiTerbuka, setAksiTerbuka] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const gulungRef = useRef<HTMLDivElement>(null);
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
      setJumlah(data.jumlah ?? {});
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

  /**
   * Apakah sedang jauh dari pesan terbaru.
   *
   * Waktu orang menggulir ke atas membaca riwayat, pesan baru yang masuk tidak
   * terlihat sama sekali: halamannya sengaja TIDAK ikut turun, karena bacaan
   * yang lompat sendiri lebih mengganggu. Jadi tombol kecil ini yang jadi
   * satu-satunya jalan kembali, dan dia cuma ada waktu memang dibutuhkan.
   */
  useEffect(() => {
    const el = gulungRef.current;
    if (!el) return;
    const lihat = () => {
      setJauhDariBawah(el.scrollHeight - el.scrollTop - el.clientHeight > 240);
    };
    lihat();
    el.addEventListener("scroll", lihat, { passive: true });
    return () => el.removeEventListener("scroll", lihat);
  }, [detail?.conversation.id]);

  /**
   * Daftar yang benar-benar digambar.
   *
   * Pencariannya di sisi layar, bukan tanya server: daftarnya sudah ada di
   * memori (paling banyak 100 baris), jadi hasilnya muncul seketika sambil
   * mengetik, tanpa satu pun permintaan tambahan ke server yang juga sedang
   * menjalankan mesin WhatsApp.
   */
  const kunciCari = cari.trim().toLowerCase();
  const tampil = kunciCari
    ? list.filter((c) =>
        [c.name, c.phone ?? "", c.preview].some((t) =>
          t.toLowerCase().includes(kunciCari),
        ),
      )
    : list;

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
          // 23rem, bukan 21rem: saringannya sekarang enam (dua di antaranya
          // lahir dari baris hitungan yang dibuang), dan yang paling perlu
          // kelihatan tanpa digeser adalah angka "siap beli".
          "w-full lg:w-[23rem] lg:shrink-0",
          selectedId ? "hidden lg:flex" : "flex",
        ].join(" ")}
      >
        {/* Saringan: satu baris yang bisa digeser, JANGAN membungkus.
            Dulu `flex` biasa bikin empat tab membungkus jadi dua baris di layar
            360px dan tiap tab jadi dua baris tulisan, terbaca berantakan. Pil
            `whitespace-nowrap shrink-0` + `overflow-x-auto` menjaga satu baris;
            kalau tidak muat, digeser, bukan dibungkus. */}
        {/* Satu baris untuk dua pekerjaan: menyaring dan mencari.

            Kolom pencarian yang selalu terpampang memakan satu baris penuh di
            layar yang isinya memang daftar, jadi dia tertutup dan menempati
            baris yang sama begitu ikonnya diketuk. */}
        <div className="flex shrink-0 items-center gap-1.5 border-b border-ink-200 px-2.5 py-2.5">
          {cariBuka ? (
            <div className="anim-muncul flex min-w-0 flex-1 items-center gap-2 rounded-full bg-ink-100 px-3 py-1.5">
              <Ikon nama="cari" size={15} className="shrink-0 text-ink-500" />
              <input
                autoFocus
                value={cari}
                onChange={(e) => setCari(e.target.value)}
                placeholder="Cari nama atau nomor"
                aria-label="Cari obrolan"
                className="min-w-0 flex-1 bg-transparent text-sm text-ink-900 outline-none placeholder:text-ink-400"
              />
              <button
                type="button"
                onClick={() => {
                  setCari("");
                  setCariBuka(false);
                }}
                aria-label="Tutup pencarian"
                className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-ink-500 transition hover:bg-white hover:text-ink-800"
              >
                <Ikon nama="silang" size={14} />
              </button>
            </div>
          ) : (
            <>
              {/* Saringan: satu baris yang bisa digeser, JANGAN membungkus.
                  Dulu `flex` biasa bikin empat tab membungkus jadi dua baris di
                  layar 360px dan tiap tab jadi dua baris tulisan, terbaca
                  berantakan. Pil `whitespace-nowrap shrink-0` +
                  `overflow-x-auto` menjaga satu baris; kalau tidak muat,
                  digeser, bukan dibungkus. */}
              <div className="thin-scroll flex min-w-0 flex-1 gap-1 overflow-x-auto">
                {FILTERS.map((f) => {
                  const n = f.hitung ? (jumlah[f.hitung] ?? 0) : 0;
                  const aktif = filter === f.id;
                  return (
                    <button
                      key={f.id}
                      onClick={() => {
                        setFilter(f.id);
                        setSelectedId(null);
                      }}
                      className={`flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1.5 text-[11px] transition ${
                        aktif
                          ? "bg-ink-900 font-medium text-white"
                          : "text-ink-600 hover:bg-ink-100"
                      }`}
                    >
                      {f.label}
                      {n > 0 && (
                        <span
                          className={`text-[11px] tabular-nums ${
                            aktif ? "text-white/70" : "text-ink-400"
                          }`}
                        >
                          {n}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={() => setCariBuka(true)}
                aria-label="Cari obrolan"
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-ink-500 transition hover:bg-ink-100 hover:text-ink-800"
              >
                <Ikon nama="cari" size={17} />
              </button>
            </>
          )}
        </div>

        {/* Hitungan singkat, yang BAIK disebut duluan.
            Alasannya ditulis lengkap di api/inbox/conversations/route.ts:
            lencana merah menarik mata jauh lebih kuat daripada lencana hitam,
            jadi tanpa baris ini hal pertama yang dibaca pemilik toko tiap pagi
            selalu kemarahan. */}
        {/* anim-urut: baris masuk berurutan sekali waktu daftar dibuka, dan
            obrolan baru yang datang belakangan ikut muncul lembut. Karena
            key-nya id percakapan, baris lama tidak dianimasikan ulang tiap
            putaran polling. */}
        <div className="thin-scroll anim-urut min-h-0 flex-1 overflow-y-auto">
          {tampil.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border-2 border-dashed border-ink-200 text-ink-300">
                <Ikon nama={cari ? "cari" : "chat"} size={26} />
              </div>
              <p className="mt-4 text-sm leading-relaxed text-ink-500">
                {cari ? "Tidak ada yang cocok." : "Belum ada obrolan di sini."}
              </p>
            </div>
          ) : (
            tampil.map((c) => {
              const rasa = tampilanRasa(c.rasaLabel);
              const belumDibaca = c.unreadCount > 0;
              /**
               * SATU lencana saja yang tampil, sisanya pindah ke keterangan
               * sorot.
               *
               * Dulu tiap baris bisa memuat tiga lencana plus satu baris alasan,
               * dan empat puluh baris seperti itu berubah jadi dinding tulisan
               * yang justru tidak terbaca. Yang dipilih tampil selalu yang
               * paling menentukan tindakan: obrolan yang menunggu kamu lebih
               * mendesak daripada perasaan pelanggannya, dan perasaannya lebih
               * menentukan daripada siapa yang sedang memegang obrolan.
               */
              const lencana = c.needsHuman
                ? { teks: "nunggu kamu", kelas: "bg-amber-100 text-amber-800" }
                : rasa
                  ? { teks: rasa.teks, kelas: rasa.kelas }
                  : !c.aiEnabled
                    ? { teks: "kamu pegang", kelas: "bg-ink-100 text-ink-600" }
                    : null;
              // Keterangan lengkapnya, dipakai kotak sorot di layar lebar.
              const rinci = [
                rasa?.teks,
                c.needsHuman ? "nunggu kamu" : null,
                !c.aiEnabled ? "kamu yang pegang" : null,
                c.rasaAlasan && rasa ? c.rasaAlasan : null,
              ].filter(Boolean);
              return (
                <button
                  key={c.id}
                  onClick={() => setSelectedId(c.id)}
                  // Keterangan lengkapnya lewat tooltip bawaan browser: dia
                  // muncul di dekat kursor, hilang sendiri, dan tidak memakan
                  // satu piksel pun tata letak. Kotak hitam buatan sendiri
                  // sempat dicoba dan justru menutupi baris yang sedang
                  // diterangkannya.
                  title={rinci.length > 0 ? rinci.join(" · ") : undefined}
                  className={`relative flex w-full items-start gap-3 px-3 pt-2 text-left transition ${
                    selectedId === c.id ? "bg-ink-100" : "hover:bg-ink-50 active:bg-ink-100"
                  }`}
                >
                  {/* Garis penanda tepi kiri waktu terpilih, cuma di layar lebar
                      tempat daftar dan obrolan berdampingan. */}
                  {selectedId === c.id && (
                    <span className="absolute inset-y-0 left-0 hidden w-0.5 bg-ink-900 lg:block" />
                  )}
                  <Avatar nama={c.name} ukuran={38} fotoPath={c.waFotoPath} />
                  {/* Pemisah baris ditaruh di kolom isi, bukan di seluruh
                      baris, jadi garisnya mulai sejajar nama seperti aplikasi
                      chat. Garis penuh dari tepi ke tepi bikin daftar terbaca
                      seperti tabel, bukan seperti daftar orang. */}
                  <div className="min-w-0 flex-1 border-b border-ink-100 pb-2">
                    <div className="flex items-baseline justify-between gap-2">
                      <span
                        className={`truncate text-sm text-ink-900 ${
                          belumDibaca ? "font-semibold" : "font-medium"
                        }`}
                      >
                        {c.name}
                      </span>
                      {/* Lencananya duduk di baris nama, bukan di baris
                          sendiri. Satu baris daftar jadi cukup dua baris. */}
                      {lencana && (
                        <span className={`badge shrink-0 ${lencana.kelas}`}>
                          {lencana.teks}
                        </span>
                      )}
                      <span
                        className={`ml-auto shrink-0 text-[11px] ${
                          belumDibaca ? "font-medium text-brand-700" : "text-ink-400"
                        }`}
                      >
                        {relatif(c.lastMessageAt)}
                      </span>
                    </div>
                    {/* Cuplikan + jumlah belum dibaca di kanan, seperti aplikasi
                        chat pada umumnya. Yang belum dibaca dibuat sedikit lebih
                        gelap supaya menonjol tanpa warna tambahan. */}
                    <div className="mt-0.5 flex items-center gap-2">
                      <p
                        className={`min-w-0 flex-1 truncate text-xs ${
                          belumDibaca ? "text-ink-700" : "text-ink-500"
                        }`}
                      >
                        {c.lastRole === "customer" ? "" : "↩ "}
                        {c.preview || "belum ada pesan"}
                      </p>
                      {belumDibaca && (
                        <span className="grid h-[18px] min-w-[18px] shrink-0 place-items-center rounded-full bg-brand-600 px-1.5 text-[11px] font-semibold text-white">
                          {c.unreadCount > 99 ? "99+" : c.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Thread */}
      {!detail ? (
        // Satu kalimat telanjang di tengah layar besar terbaca seperti halaman
        // yang gagal dimuat. Lambang di dalam pelat membuatnya terbaca sebagai
        // keadaan yang wajar, bukan galat.
        <div className="hidden flex-1 flex-col items-center justify-center gap-3 bg-ink-50 lg:flex">
          <div className="grid h-16 w-16 place-items-center rounded-2xl bg-white text-ink-300 shadow-sm">
            <Ikon nama="chat" size={28} />
          </div>
          <p className="text-sm text-ink-500">Pilih obrolan di daftar kiri.</p>
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
            className="anim-obrolan layar-penuh fixed inset-0 z-50 flex flex-col bg-white lg:static lg:z-auto lg:min-w-0 lg:flex-1"
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

              {/* Ketuk avatar/nama = buka profil pelanggannya, seperti aplikasi
                  chat pada umumnya (di WhatsApp pun kepala obrolan yang diketuk
                  membuka info kontak). Cuma bagian ini yang jadi tautan; tombol
                  aksi di kanan tetap di luar. */}
              <a
                href={`/app/kontak/${detail.contact.id}`}
                className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg transition hover:opacity-80"
              >
                <Avatar nama={detail.contact.name} ukuran={38} fotoPath={detail.contact.waFotoPath} />

                <div className="min-w-0 flex-1">
                <p className="truncate font-medium leading-tight text-ink-900">
                  {detail.contact.name}
                </p>
                <p className="truncate text-xs leading-tight text-ink-500">
                  {detail.conversation.isPlayground
                    ? "Ruang coba, bukan WhatsApp beneran"
                    : (detail.contact.phone ?? "tanpa nomor")}
                </p>
                {/* Konteks cepat (keluhan / janji) cuma muncul kalau memang ada.
                    Dulu disembunyikan di xl karena panel kanan memuatnya; panel
                    itu sudah dihapus (memakan tempat, isinya sama dengan profil
                    yang seketuk dari kepala ini), jadi sekarang selalu tampil. */}
                {(detail.contact.masalah ||
                  (!detail.conversation.isPlayground &&
                    !detail.conversation.channelConnected) ||
                  (detail.contact.janjiPada &&
                    new Date(detail.contact.janjiPada).getTime() > Date.now())) && (
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    {/* Nomor putus dulu ditulis menyambung di ekor nomor
                        teleponnya ("0812... · nomornya lagi tidak nyambung"),
                        jadi barisnya panjang dan keadaan yang paling penting
                        justru tenggelam di ujung kalimat. Sebagai lencana dia
                        kelihatan sekilas. */}
                    {!detail.conversation.isPlayground &&
                      !detail.conversation.channelConnected && (
                        <span className="badge bg-amber-100 text-amber-800">
                          nomor putus
                        </span>
                      )}
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
              </a>

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

            {/* Latar obrolan sengaja abu SANGAT muda, bukan putih.

                Dengan latar putih, kepala, isi, dan kotak tulis lebur jadi satu
                bidang putih besar, dan cuma gelembung pelanggan yang kelihatan
                sebagai gelembung. Dengan latar abu muda, ketiganya punya batas:
                kepala dan kotak tulis menempel putih di atas dan bawah,
                gelembungnya mengambang di tengah. */}
            <div
              ref={gulungRef}
              className="thin-scroll relative min-h-0 flex-1 overflow-y-auto bg-ink-50 px-4 py-5 sm:px-5"
            >
              {detail.messages.map((m, i) => {
                const hari = hariDari(m.createdAt);
                const sebelum = detail.messages[i - 1];
                const sesudah = detail.messages[i + 1];
                const gantiHari = !sebelum || hariDari(sebelum.createdAt) !== hari;
                // Pesan beruntun dari orang yang sama, berjarak dekat, jadi SATU
                // kelompok: rapat di dalam, lega dengan kelompok berikutnya, dan
                // jamnya cuma ditulis sekali di pesan terakhir. Tanpa ini tiap
                // pesan membawa baris jamnya sendiri, dan orang yang menulis
                // lima pesan pendek berturut-turut memakan setengah layar.
                const serumpun = (a?: Msg, b?: Msg) =>
                  !!a &&
                  !!b &&
                  a.role === b.role &&
                  a.role !== "system" &&
                  b.role !== "system" &&
                  Math.abs(
                    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
                  ) < 5 * 60_000;
                const rapat = !gantiHari && serumpun(sebelum, m);
                const akhirKelompok =
                  !serumpun(m, sesudah) ||
                  hariDari(sesudah!.createdAt) !== hari;
                return (
                  <Fragment key={m.id}>
                    {/* Pemisah tanggal, digambar sekali tiap ganti hari. */}
                    {gantiHari && (
                      <div className={`flex justify-center ${i === 0 ? "" : "mt-5"} mb-3`}>
                        <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-ink-500 shadow-sm">
                          {labelHari(hari)}
                        </span>
                      </div>
                    )}
                    <PesanBaris m={m} rapat={rapat} tampilkanJam={akhirKelompok} />
                  </Fragment>
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

            {/* Turun ke pesan terbaru. Cuma ada waktu memang sedang jauh di
                atas, dan menempel di atas kotak tulis, bukan menutupi pesan. */}
            {jauhDariBawah && (
              <button
                type="button"
                onClick={() =>
                  bottomRef.current?.scrollIntoView({ behavior: "smooth" })
                }
                aria-label="Turun ke pesan terbaru"
                className="anim-naik absolute bottom-24 right-4 z-10 grid h-10 w-10 place-items-center rounded-full border border-ink-200 bg-white text-ink-600 shadow-[0_6px_16px_-6px_rgba(15,15,15,0.35)] transition hover:text-ink-900 active:scale-95 sm:right-6"
              >
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 5v14M5 12l7 7 7-7" />
                </svg>
              </button>
            )}

            {/* Kotak tulis. Di HP menempel di dasar layar penuh (jarak aman
                iPhone dihormati), tombol kirim jadi lingkaran berikon supaya
                hemat lebar dan langsung terbaca sebagai "kirim". */}
            <div className="border-t border-ink-200 bg-white px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-5">
              {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
              <div className="flex items-end gap-2">
                <textarea
                  data-fokus-tenang
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
              {/* Muncul cuma waktu tangannya sudah di kotak tulis.

                  Dulu kalimat ini selalu terpampang di bawah composer, jadi
                  tiap obrolan membayar satu baris tetap untuk keterangan yang
                  cuma berlaku sedetik sebelum tombol kirim ditekan. */}
              {detail.conversation.aiEnabled && draft.trim().length > 0 && (
                <p className="anim-muncul mt-2 text-[11px] leading-relaxed text-ink-500">
                  Begitu kamu ikut balas, asisten langsung berhenti di obrolan ini.
                </p>
              )}
            </div>
          </div>

        </>
      )}
    </div>
  );
}
