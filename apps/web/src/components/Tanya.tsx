"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Ikon } from "@/components/Ikon";
import { Logo } from "@/components/Logo";

/**
 * Ruang perintah.
 *
 * ══ Kenapa halaman ini TIDAK berbentuk seperti Kotak masuk ══
 *
 * Palwise punya tiga tempat yang isinya obrolan: Kotak masuk (pelanggan asli),
 * Coba dulu (kamu pura-pura jadi pelanggan), dan ini (kamu bicara ke Palwise).
 * Kalau ketiganya kelihatan mirip, cepat atau lambat ada yang mengetik perintah
 * di jendela pelanggan sungguhan, dan perintah itu terkirim apa adanya.
 *
 * Jadi bedanya dibuat di BENTUK, bukan di tulisan kecil.
 *
 * Jawaban Palwise TIDAK pakai gelembung: dia teks biasa di atas kertas putih
 * dengan logo kecil di sebelahnya, seperti ChatGPT atau Claude. Yang
 * bergelembung cuma yang kamu ketik. Di Kotak masuk justru sebaliknya,
 * semuanya bergelembung.
 *
 * ══ Aturan ruang di layar ══
 *
 * Halaman ini setinggi layar dan isinya satu kolom obrolan, jadi tiap piksel
 * yang dipakai kepala halaman diambil dari ruang baca. Aturannya:
 *
 * - Kepala CUMA SATU BARIS. Judul, kemajuan, dan tombolnya berbagi baris itu.
 *   Versi sebelumnya menumpuk judul, satu kalimat penjelasan, dan pita kemajuan
 *   jadi tiga baris setinggi 130px, untuk keterangan yang dibaca sekali seumur
 *   hidup.
 * - Tidak ada kalimat yang menjelaskan halaman ini di kepala. Yang perlu
 *   dijelaskan ditaruh di layar kosong, tempat orang memang sedang mencari tahu
 *   harus apa, dan hilang sendiri begitu obrolannya jalan.
 * - Rel riwayat itu DAFTAR, bukan panel bertombol besar. Tombol hitam "Perintah
 *   baru" selebar rel dulu berdiri di atasnya, dan itu menjawab pertanyaan yang
 *   tidak pernah ditanyakan siapa pun: orang yang membuka halaman ini mau
 *   mengetik, bukan mau membuat wadah dulu. Tombol sebesar itu justru bikin dia
 *   mengira ada langkah yang harus dikerjakan sebelum boleh mengetik. Sekarang
 *   "mulai baru" tinggal ikon kecil, dan yang memenuhi rel cuma riwayatnya.
 */

// ── Bentuk data ───────────────────────────────────────────────────────────────

type Usul =
  | {
      jenis: "kirim_pesan";
      kontakId: string;
      kepada: string;
      nomor: string | null;
      teks: string;
    }
  | {
      jenis: "kirim_berkas";
      kontakId: string;
      kepada: string;
      nomor: string | null;
      teks: string;
      kode: string;
      namaBerkas: string;
    }
  | { jenis: "tambah_info"; judul: string; isi: string }
  | {
      jenis: "ubah_info";
      catatanId: string;
      judul: string;
      isiLama: string;
      isi: string;
    }
  | { jenis: "ubah_asisten"; isiLama: string; isi: string };

interface Pesan {
  id: string;
  peran: string;
  teks: string;
  alat: string[];
  usul: Usul | null;
  usulStatus: string | null;
  usulPesan: string | null;
}

interface Sesi {
  id: string;
  judul: string;
  mode: string;
  updatedAt: string;
}

interface Pemasangan {
  caraBicara: boolean;
  info: boolean;
  jumlahInfo: number;
  nomor: boolean;
}

/**
 * Contoh perintah untuk layar kosong.
 *
 * Empat, bukan sepuluh. Ini bukan daftar kemampuan, ini pancingan: yang
 * dibutuhkan orang yang baru pertama membuka halaman ini cuma bukti bahwa
 * mengetik dengan bahasa sendiri memang boleh.
 */
const CONTOH = [
  { ikon: "chat", label: "Hari ini ada berapa yang chat?" },
  { ikon: "kendali", label: "Ada yang komplen nggak?" },
  { ikon: "kalender", label: "Siapa yang janji ketemu hari ini?" },
  { ikon: "kirim", label: "Chat Budi, tanyain jadi order apa nggak" },
] as const;

/**
 * Jawaban siap tekan untuk pertanyaan pertama pemasangan.
 *
 * Pertanyaannya "usahamu jualan apa", dan mengetik jawabannya di HP sambil
 * berdiri di toko itu penghalang yang tidak perlu ada untuk giliran PERTAMA,
 * yaitu giliran yang paling banyak ditinggalkan orang. Yang ditekan tetap
 * dikirim sebagai kalimat biasa, bukan preset tersembunyi, jadi jawabannya
 * tetap boleh diketik sendiri kalau usahanya tidak ada di daftar.
 */
const JENIS_USAHA = [
  { ikon: "kopi", label: "Makanan & minuman" },
  { ikon: "skincare", label: "Skincare & kosmetik" },
  { ikon: "fashion", label: "Baju & fashion" },
  { ikon: "klinik", label: "Klinik & kesehatan" },
  { ikon: "servis", label: "Servis & perbaikan" },
  { ikon: "properti", label: "Properti" },
  { ikon: "kursus", label: "Kursus & les" },
] as const;

// ── Halaman ───────────────────────────────────────────────────────────────────

export function Tanya({ sesiAwal }: { sesiAwal: string | null }) {
  const router = useRouter();

  const [daftar, setDaftar] = useState<Sesi[]>([]);
  const [sesiId, setSesiId] = useState<string | null>(sesiAwal);
  const [pesan, setPesan] = useState<Pesan[]>([]);
  const [draft, setDraft] = useState("");
  const [sibuk, setSibuk] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);
  const [riwayatBuka, setRiwayatBuka] = useState(false);
  const [jatah, setJatah] = useState<{
    terpakai: number;
    batas: number;
  } | null>(null);
  const [mode, setMode] = useState<string>("perintah");
  const [pasang, setPasang] = useState<Pemasangan | null>(null);

  const gulirRef = useRef<HTMLDivElement>(null);
  const isianRef = useRef<HTMLTextAreaElement>(null);

  // Gulir kotaknya sendiri, bukan seluruh halaman. `scrollIntoView` menggulir
  // semua induk yang bisa digulir sampai elemennya kelihatan, dan itu bikin
  // kepala halaman ikut terdorong keluar tiap ada jawaban baru.
  useEffect(() => {
    const el = gulirRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [pesan.length, sibuk]);

  const muatDaftar = useCallback(async () => {
    const res = await fetch("/api/tanya/sesi");
    if (!res.ok) return [] as Sesi[];
    const data = await res.json();
    setDaftar(data.sesi ?? []);
    return (data.sesi ?? []) as Sesi[];
  }, []);

  const muatPemasangan = useCallback(async () => {
    const res = await fetch("/api/tanya/pemasangan");
    if (res.ok) setPasang(await res.json());
  }, []);

  const muatUtas = useCallback(
    async (id: string) => {
      const res = await fetch(`/api/tanya/sesi/${id}`);
      if (!res.ok) {
        setPesan([]);
        return;
      }
      const data = await res.json();
      setPesan(data.pesan ?? []);
      setMode(data.mode ?? "perintah");
      // Pitanya cuma dipakai utas pemasangan, jadi cuma di situ dia diambil.
      // Satu kueri tambahan di tiap perpindahan utas biasa itu ongkos yang
      // dibayar semua orang untuk sesuatu yang tidak pernah mereka lihat.
      if (data.mode === "pasang") await muatPemasangan();
      else setPasang(null);
    },
    [muatPemasangan],
  );

  // Muat pertama: ambil daftarnya, lalu buka utas yang diminta alamat, atau
  // yang paling baru, atau bikin baru kalau memang belum pernah ada.
  useEffect(() => {
    let batal = false;
    (async () => {
      const list = await muatDaftar();
      if (batal) return;

      const dituju =
        sesiAwal && list.some((s) => s.id === sesiAwal)
          ? sesiAwal
          : list[0]?.id;
      if (dituju) {
        setSesiId(dituju);
        await muatUtas(dituju);
      } else {
        const res = await fetch("/api/tanya/sesi", { method: "POST" });
        const data = await res.json();
        if (!batal && data?.id) {
          setSesiId(data.id);
          setPesan([]);
          await muatDaftar();
        }
      }
    })();
    return () => {
      batal = true;
    };
    // Sengaja sekali saja. Perpindahan utas sesudah ini dikerjakan bukaUtas.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function bukaUtas(id: string) {
    setSesiId(id);
    setRiwayatBuka(false);
    setGalat(null);
    await muatUtas(id);
    // Alamatnya ikut berubah supaya utas ini bisa di-bookmark dan tombol
    // kembali browser bekerja seperti yang orang harapkan.
    router.replace(`/app/tanya?s=${id}`, { scroll: false });
  }

  async function utasBaru() {
    setGalat(null);
    const res = await fetch("/api/tanya/sesi", { method: "POST" });
    const data = await res.json();
    if (data?.id) {
      setSesiId(data.id);
      setPesan([]);
      setMode("perintah");
      setPasang(null);
      setRiwayatBuka(false);
      await muatDaftar();
      router.replace(`/app/tanya?s=${data.id}`, { scroll: false });
      isianRef.current?.focus();
    }
  }

  async function hapusUtas(id: string) {
    await fetch(`/api/tanya/sesi/${id}`, { method: "DELETE" });
    const list = await muatDaftar();
    if (id === sesiId) {
      const berikut = list[0]?.id;
      if (berikut) await bukaUtas(berikut);
      else await utasBaru();
    }
  }

  async function kirim(teks: string) {
    const isi = teks.trim();
    if (!isi || sibuk || !sesiId) return;

    setGalat(null);
    setDraft("");
    setSibuk(true);

    // Gelembung sementara supaya perintahnya langsung kelihatan. Dia diganti
    // baris asli dari server begitu jawabannya datang.
    const sementara: Pesan = {
      id: `sementara-${Date.now()}`,
      peran: "pemilik",
      teks: isi,
      alat: [],
      usul: null,
      usulStatus: null,
      usulPesan: null,
    };
    setPesan((p) => [...p, sementara]);

    try {
      const res = await fetch("/api/tanya", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ sesiId, pesan: isi }),
      });
      const data = await res.json();

      if (!res.ok || data?.error) {
        // Perintahnya gagal, jadi gelembung sementaranya dicabut lagi dan
        // teksnya dikembalikan ke kotak ketik. Membiarkannya menggantung di
        // layar bikin orang mengira perintahnya sudah masuk.
        setPesan((p) => p.filter((x) => x.id !== sementara.id));
        setDraft(isi);
        setGalat(data?.error ?? "Gagal menjalankan perintah.");
        return;
      }

      setPesan((p) => [
        ...p.filter((x) => x.id !== sementara.id),
        ...(data.pesan ?? []),
      ]);
      if (data.jatah)
        setJatah({ terpakai: data.jatah.terpakai, batas: data.jatah.batas });
      await muatDaftar();
      if (mode === "pasang") await muatPemasangan();
    } catch {
      setPesan((p) => p.filter((x) => x.id !== sementara.id));
      setDraft(isi);
      setGalat("Tidak bisa menghubungi server.");
    } finally {
      setSibuk(false);
    }
  }

  // Mengembalikan pesan galat, bukan cuma menyetel pita di dasar layar. Pitanya
  // nempel di bawah, sementara kartunya bisa berada jauh di atas utas yang
  // panjang, dan justru di kartu itulah pertanyaan "jadi terkirim atau tidak"
  // muncul. Jadi kabarnya ditampilkan di dua tempat.
  async function jalankanUsul(
    pesanId: string,
    opsi: { batal?: boolean; ambilAlih?: boolean },
  ): Promise<string | null> {
    setGalat(null);
    const res = await fetch("/api/tanya/lakukan", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        pesanId,
        batal: opsi.batal,
        ambilAlih: opsi.ambilAlih,
      }),
    });
    const data = await res.json().catch(() => ({}));

    const kabar =
      !res.ok || data?.error ? (data?.error ?? "Gagal mengerjakan.") : null;
    if (kabar) setGalat(kabar);

    // Dibaca ulang dari server, bukan ditebak di layar. Statusnya ditentukan
    // apakah WhatsApp-nya benar-benar menerima, dan itu cuma diketahui worker.
    if (sesiId) await muatUtas(sesiId);
    if (mode === "pasang") await muatPemasangan();
    return kabar;
  }

  const kosong = pesan.length === 0;
  // Giliran pertama pemasangan: baru sapaan Palwise, pemiliknya belum menjawab.
  const barusanMulai =
    mode === "pasang" &&
    pesan.length > 0 &&
    !pesan.some((p) => p.peran === "pemilik");
  const judulSekarang = daftar.find((s) => s.id === sesiId)?.judul;

  return (
    <div className="flex h-full min-h-0">
      <RelRiwayat
        daftar={daftar}
        sesiId={sesiId}
        buka={riwayatBuka}
        tutup={() => setRiwayatBuka(false)}
        pilih={bukaUtas}
        hapus={hapusUtas}
        baru={utasBaru}
      />

      <div className="flex min-w-0 flex-1 flex-col bg-white">
        {/* SATU BARIS. Judul, kemajuan, dan tombolnya berbagi tempat, karena
            tiap baris di sini diambil dari ruang baca obrolannya. */}
        <header className="flex shrink-0 items-center gap-2 border-b border-ink-200 px-2 py-2 sm:px-4">
          <button
            type="button"
            onClick={() => setRiwayatBuka(true)}
            className="tap-aman grid h-8 w-8 shrink-0 place-items-center rounded-lg text-ink-500 transition hover:bg-ink-100 lg:hidden"
            aria-label="Riwayat"
          >
            <Ikon nama="jam" size={17} />
          </button>

          <p className="min-w-0 shrink truncate text-sm font-medium text-ink-900">
            {judulSekarang || (mode === "pasang" ? "Pasang asisten" : "Tanya")}
          </p>

          {mode === "pasang" && <Langkah keadaan={pasang} />}

          <button
            type="button"
            onClick={utasBaru}
            title="Mulai obrolan baru"
            className="tap-aman ml-auto grid h-8 w-8 shrink-0 place-items-center rounded-lg text-ink-500 transition hover:bg-ink-100 hover:text-ink-900"
            aria-label="Mulai obrolan baru"
          >
            <IkonTambah />
          </button>
        </header>

        <div
          ref={gulirRef}
          className="thin-scroll min-h-0 flex-1 overflow-y-auto"
        >
          <div className="mx-auto w-full max-w-2xl px-4 py-5 sm:px-6">
            {kosong ? (
              <Sambutan pilih={kirim} />
            ) : (
              <div className="space-y-5">
                {pesan.map((p) =>
                  p.peran === "pemilik" ? (
                    <DariPemilik key={p.id} teks={p.teks} />
                  ) : (
                    <DariPalwise
                      key={p.id}
                      pesan={p}
                      jalankan={(opsi) => jalankanUsul(p.id, opsi)}
                    />
                  ),
                )}
              </div>
            )}

            {/* Jawaban siap tekan, cuma di giliran pertama pemasangan. */}
            {barusanMulai && !sibuk && (
              <div className="anim-naik mt-3 flex flex-wrap gap-1.5 sm:pl-8">
                {JENIS_USAHA.map((j) => (
                  <button
                    key={j.label}
                    type="button"
                    onClick={() => kirim(`Jualan ${j.label.toLowerCase()}`)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-ink-200 px-2.5 py-1.5 text-[13px] text-ink-700 transition hover:border-ink-400 hover:bg-ink-50"
                    style={{ transitionDuration: "var(--gerak-cepat)" }}
                  >
                    <Ikon nama={j.ikon} size={14} className="text-ink-400" />
                    {j.label}
                  </button>
                ))}
              </div>
            )}

            {sibuk && (
              <div className="mt-5 flex items-center gap-2.5">
                <TandaPalwise />
                <span
                  className="titik-ketik flex items-center gap-1 text-ink-300"
                  aria-label="Palwise sedang mengerjakan"
                >
                  <span />
                  <span />
                  <span />
                </span>
              </div>
            )}
          </div>
        </div>

        {galat && (
          <div className="shrink-0 border-t border-red-200 bg-red-50 px-4 py-2 text-[13px] text-red-800 sm:px-6">
            {galat}
          </div>
        )}

        <Pengetik
          isianRef={isianRef}
          draft={draft}
          setDraft={setDraft}
          sibuk={sibuk}
          kirim={kirim}
          jatah={jatah}
          tampilkanContoh={kosong}
        />
      </div>
    </div>
  );
}

// ── Kemajuan pemasangan ───────────────────────────────────────────────────────

/**
 * Tiga langkah pemasangan, sebagai titik-titik di dalam baris kepala.
 *
 * Ada karena obrolan itu bentuk yang paling buruk untuk menjawab "aku sudah
 * sampai mana": percakapan bergulir ke atas lalu hilang. Tapi jawabannya cukup
 * tiga titik, bukan pita selebar layar berisi lencana berlabel lengkap. Di
 * layar kecil labelnya disembunyikan dan yang tersisa titiknya saja, karena di
 * sana yang dibutuhkan cuma "masih ada yang abu-abu atau tidak".
 *
 * Langkah ketiga sengaja BUKAN sesuatu yang bisa dikerjakan Palwise. Memindai
 * kode QR harus pakai HP sendiri, jadi titiknya jadi tautan keluar.
 */
function Langkah({ keadaan }: { keadaan: Pemasangan | null }) {
  if (!keadaan) return null;

  const langkah = [
    {
      label: "Cara bicara",
      selesai: keadaan.caraBicara,
      href: null as string | null,
    },
    {
      label: "Info bisnis",
      selesai: keadaan.info,
      href: null as string | null,
    },
    { label: "Nomor", selesai: keadaan.nomor, href: "/app/whatsapp" },
  ];

  return (
    <div className="flex min-w-0 items-center gap-2 overflow-hidden">
      <span className="shrink-0 text-ink-300" aria-hidden="true">
        ·
      </span>
      {langkah.map((l) => {
        const isi = (
          <>
            <span
              className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                l.selesai ? "bg-brand-600" : "bg-ink-300"
              }`}
            />
            <span className="hidden truncate md:inline">{l.label}</span>
          </>
        );
        const kelas = `inline-flex items-center gap-1.5 text-xs ${
          l.selesai ? "text-ink-400" : "text-ink-600"
        }`;

        return l.href && !l.selesai ? (
          <a
            key={l.label}
            href={l.href}
            className={`${kelas} hover:text-brand-700 hover:underline`}
          >
            {isi}
          </a>
        ) : (
          <span key={l.label} className={kelas}>
            {isi}
          </span>
        );
      })}
    </div>
  );
}

// ── Rel riwayat ───────────────────────────────────────────────────────────────

/**
 * Kelompokkan riwayat per rentang waktu.
 *
 * Daftar tanpa penanda waktu berhenti berguna begitu isinya lewat sepuluh
 * baris: semuanya kelihatan sama tuanya, dan orang yang mencari "yang kemarin
 * aku tanya" harus membuka satu-satu. Judul kelompok jauh lebih murah daripada
 * menempelkan tanggal di tiap baris, dan lebih gampang disapu mata.
 *
 * Batasnya awal hari, bukan "24 jam lalu". Obrolan jam 11 malam yang dibuka
 * jam 8 pagi harus masuk "Kemarin", bukan "Hari ini", karena begitulah orang
 * menyebutnya sendiri.
 */
function kelompokkan(daftar: Sesi[]): { judul: string; isi: Sesi[] }[] {
  const awalHariIni = new Date();
  awalHariIni.setHours(0, 0, 0, 0);
  const sehari = 24 * 60 * 60 * 1000;

  const batas: { judul: string; sejak: number }[] = [
    { judul: "Hari ini", sejak: awalHariIni.getTime() },
    { judul: "Kemarin", sejak: awalHariIni.getTime() - sehari },
    { judul: "7 hari terakhir", sejak: awalHariIni.getTime() - 7 * sehari },
    { judul: "30 hari terakhir", sejak: awalHariIni.getTime() - 30 * sehari },
    { judul: "Lebih lama", sejak: -Infinity },
  ];

  const hasil: { judul: string; isi: Sesi[] }[] = [];
  for (const s of daftar) {
    const waktu = new Date(s.updatedAt).getTime();
    const kelompok =
      batas.find((b) => waktu >= b.sejak) ?? batas[batas.length - 1];
    const akhir = hasil[hasil.length - 1];
    // Daftarnya sudah urut dari yang terbaru, jadi cukup membandingkan dengan
    // kelompok terakhir. Tidak perlu menyortir ulang apa pun.
    if (akhir?.judul === kelompok.judul) akhir.isi.push(s);
    else hasil.push({ judul: kelompok.judul, isi: [s] });
  }
  return hasil;
}

/**
 * Daftar utas. Rel tetap ada karena orang balik lagi besoknya mencari "yang
 * kemarin aku tanya", tapi isinya cuma daftar: yang menonjol harus obrolannya,
 * bukan tombol membuat obrolan.
 */
function RelRiwayat({
  daftar,
  sesiId,
  buka,
  tutup,
  pilih,
  hapus,
  baru,
}: {
  daftar: Sesi[];
  sesiId: string | null;
  buka: boolean;
  tutup: () => void;
  pilih: (id: string) => void;
  hapus: (id: string) => void;
  baru: () => void;
}) {
  const [mauHapus, setMauHapus] = useState<string | null>(null);

  return (
    <>
      {buka && (
        <div
          className="fixed inset-0 z-40 bg-ink-950/40 backdrop-blur-sm lg:hidden"
          onClick={tutup}
          aria-hidden="true"
        />
      )}

      <aside
        className={[
          "flex-col border-r border-ink-200 bg-ink-50/70",
          "fixed inset-y-0 left-0 z-50 w-64 max-w-[80vw] lg:static lg:z-auto lg:w-56 lg:max-w-none",
          buka ? "anim-naik flex" : "hidden lg:flex",
        ].join(" ")}
      >
        <div className="flex shrink-0 items-center gap-1 px-3 py-2.5">
          <p className="flex-1 text-xs font-medium text-ink-500">Riwayat</p>
          <button
            type="button"
            onClick={baru}
            title="Mulai obrolan baru"
            className="tap-aman grid h-7 w-7 place-items-center rounded-md text-ink-500 transition hover:bg-ink-200 hover:text-ink-900"
            aria-label="Mulai obrolan baru"
          >
            <IkonTambah />
          </button>
          <button
            type="button"
            onClick={tutup}
            className="tap-aman grid h-7 w-7 place-items-center rounded-md text-ink-500 transition hover:bg-ink-200 lg:hidden"
            aria-label="Tutup riwayat"
          >
            <Ikon nama="silang" size={14} />
          </button>
        </div>

        <nav className="thin-scroll min-h-0 flex-1 overflow-y-auto px-2 pb-3">
          {daftar.length === 0 ? (
            <p className="px-2 py-2 text-xs text-ink-400">Belum ada.</p>
          ) : (
            kelompokkan(daftar).map((k) => (
              <div key={k.judul} className="mb-1">
                <p className="px-2 pb-1 pt-2 text-[11px] font-medium text-ink-400">
                  {k.judul}
                </p>
                <ul className="space-y-px">
                  {k.isi.map((s) => {
                    const aktif = s.id === sesiId;
                    return (
                      <li key={s.id} className="group relative">
                        <button
                          type="button"
                          onClick={() => pilih(s.id)}
                          className={`flex w-full items-center gap-1.5 rounded-md py-1.5 pl-2 pr-7 text-left text-[13px] transition ${
                            aktif
                              ? "bg-white font-medium text-ink-900 shadow-sm"
                              : "text-ink-600 hover:bg-ink-100"
                          }`}
                          style={{ transitionDuration: "var(--gerak-cepat)" }}
                        >
                          {s.mode === "pasang" && (
                            <Ikon
                              nama="asisten"
                              size={13}
                              className="shrink-0 text-ink-400"
                            />
                          )}
                          <span className="truncate">
                            {s.judul || "Belum ada judul"}
                          </span>
                        </button>

                        {/* Muncul waktu diarahkan kursor di desktop, dan SELALU
                        kelihatan di layar sentuh, karena di sana tidak ada yang
                        namanya diarahkan kursor. */}
                        <button
                          type="button"
                          onClick={() => setMauHapus(s.id)}
                          className="absolute right-0.5 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded text-ink-400 transition hover:bg-ink-200 hover:text-ink-700 lg:opacity-0 lg:group-hover:opacity-100"
                          aria-label={`Hapus "${s.judul || "obrolan ini"}"`}
                        >
                          <Ikon nama="silang" size={13} />
                        </button>

                        {mauHapus === s.id && (
                          <div className="mt-1 rounded-lg border border-red-200 bg-red-50 p-2 text-xs text-red-800">
                            <p>Hapus obrolan ini?</p>
                            <div className="mt-1.5 flex gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setMauHapus(null);
                                  hapus(s.id);
                                }}
                                className="rounded bg-red-600 px-2 py-0.5 font-medium text-white"
                              >
                                Hapus
                              </button>
                              <button
                                type="button"
                                onClick={() => setMauHapus(null)}
                                className="rounded border border-red-300 bg-white px-2 py-0.5"
                              >
                                Batal
                              </button>
                            </div>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))
          )}
        </nav>
      </aside>
    </>
  );
}

// ── Gelembung ─────────────────────────────────────────────────────────────────

function DariPemilik({ teks }: { teks: string }) {
  return (
    <div className="anim-naik flex justify-end">
      <p className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-sm bg-brand-600 px-3.5 py-2 text-[15px] leading-relaxed text-white">
        {teks}
      </p>
    </div>
  );
}

/**
 * Tanda Palwise di sebelah tiap jawaban.
 *
 * Latarnya PUTIH bertepi, bukan lingkaran gelap. Logonya biru pekat di atas
 * latar tembus pandang, jadi di atas hitam dia tenggelam: di ukuran kecil yang
 * kelihatan cuma titik hitam, dan pembaca tidak mengenalinya sebagai Palwise.
 */
function TandaPalwise() {
  return (
    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white ring-1 ring-ink-200">
      <Logo ukuran={14} />
    </span>
  );
}

function DariPalwise({
  pesan,
  jalankan,
}: {
  pesan: Pesan;
  jalankan: (opsi: {
    batal?: boolean;
    ambilAlih?: boolean;
  }) => Promise<string | null>;
}) {
  return (
    <div className="anim-naik flex gap-2.5">
      <TandaPalwise />
      <div className="min-w-0 flex-1 space-y-2.5">
        <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-ink-800">
          {pesan.teks}
        </p>

        {pesan.usul && (
          <KartuUsul
            usul={pesan.usul}
            status={pesan.usulStatus}
            kabar={pesan.usulPesan}
            jalankan={jalankan}
          />
        )}

        {/* Dari mana angkanya diambil. Bukan hiasan: satu-satunya cara pemilik
            toko membedakan jawaban yang dihitung dari database dan jawaban yang
            cuma omongan. Tidak ada baris ini berarti tidak ada alat yang jalan. */}
        {pesan.alat.length > 0 && (
          <p className="text-[11px] text-ink-400">
            {pesan.alat.map(namaAlat).join(" · ")}
          </p>
        )}
      </div>
    </div>
  );
}

/** Nama alat dalam bahasa yang dimengerti pemilik toko. */
function namaAlat(kode: string): string {
  const peta: Record<string, string> = {
    hitung_obrolan: "hitungan chat",
    daftar_masalah: "daftar keluhan",
    daftar_nunggu: "yang nunggu dibalas",
    daftar_janji: "janji temu",
    cari_kontak: "data pelanggan",
    lihat_kontak: "riwayat pelanggan",
    cari_info_bisnis: "Info bisnis",
    daftar_gambar: "daftar gambar",
    pemakaian: "jatah pemakaian",
    daftar_info: "daftar Info bisnis",
    lihat_info: "isi catatan",
    lihat_asisten: "setelan asisten",
    keadaan_pemasangan: "langkah pemasangan",
  };
  return peta[kode] ?? kode;
}

// ── Melihat apa yang berubah ──────────────────────────────────────────────────

type Potong = { jenis: "sama" | "hapus" | "tambah"; baris: string[] };

/**
 * Bandingkan dua teks PER BARIS.
 *
 * Kenapa per baris dan bukan dua kotak berdampingan: yang mau dijawab pemilik
 * toko cuma satu, "apa yang hilang". Dua blok teks utuh bersebelahan memaksa
 * dia membandingkan sendiri kata per kata, dan yang terjadi di lapangan bukan
 * dia membandingkan dengan teliti, tapi dia menekan Simpan tanpa membaca
 * dua-duanya.
 *
 * Pakai LCS biasa. Teksnya paling banyak puluhan baris (cara bicara asisten,
 * catatan harga), jadi tabel n×m di sini tidak pernah jadi soal.
 */
function bandingkan(lama: string, baru: string): Potong[] {
  const a = lama.split("\n");
  const b = baru.split("\n");

  const n = a.length;
  const m = b.length;
  const tabel: number[][] = Array.from({ length: n + 1 }, () =>
    new Array(m + 1).fill(0),
  );
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      tabel[i][j] =
        a[i] === b[j]
          ? tabel[i + 1][j + 1] + 1
          : Math.max(tabel[i + 1][j], tabel[i][j + 1]);
    }
  }

  const hasil: Potong[] = [];
  const tambahkan = (jenis: Potong["jenis"], baris: string) => {
    const akhir = hasil[hasil.length - 1];
    if (akhir?.jenis === jenis) akhir.baris.push(baris);
    else hasil.push({ jenis, baris: [baris] });
  };

  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      tambahkan("sama", a[i]);
      i++;
      j++;
    } else if (tabel[i + 1][j] >= tabel[i][j + 1]) {
      tambahkan("hapus", a[i]);
      i++;
    } else {
      tambahkan("tambah", b[j]);
      j++;
    }
  }
  while (i < n) tambahkan("hapus", a[i++]);
  while (j < m) tambahkan("tambah", b[j++]);

  return hasil;
}

/** Berapa baris sama berturut-turut yang masih ditampilkan apa adanya. */
const SAMA_MAKS = 2;

/**
 * Tampilan "apa yang berubah", TERBUKA SEJAK AWAL.
 *
 * Dulu yang lama disembunyikan di balik tautan "Lihat yang lama", dan itu
 * salah: tidak ada yang membuka lipatan untuk memeriksa sesuatu yang dia belum
 * tahu perlu diperiksa. Yang berubah harus kelihatan tanpa diklik, dan yang
 * dilipat justru bagian yang TIDAK berubah.
 */
function Perubahan({ lama, baru }: { lama: string; baru: string }) {
  const [bukaSemua, setBukaSemua] = useState(false);
  const potongan = bandingkan(lama.trim(), baru.trim());

  const dihapus = potongan
    .filter((p) => p.jenis === "hapus")
    .reduce((n, p) => n + p.baris.length, 0);
  const ditambah = potongan
    .filter((p) => p.jenis === "tambah")
    .reduce((n, p) => n + p.baris.length, 0);

  return (
    <div>
      <div className="mb-1 flex items-center gap-2 text-[11px] text-ink-400">
        <span>Yang berubah</span>
        {ditambah > 0 && (
          <span className="font-medium text-brand-700">+{ditambah}</span>
        )}
        {dihapus > 0 && (
          <span className="font-medium text-red-600">−{dihapus}</span>
        )}
      </div>

      <div className="thin-scroll max-h-72 overflow-y-auto rounded-lg border border-ink-200 py-1 text-[12px] leading-relaxed">
        {potongan.map((p, i) => {
          if (p.jenis === "sama") {
            // Baris yang tidak berubah dilipat kalau banyak. Yang dicari orang
            // di sini bukan seluruh isinya, tapi bedanya.
            if (p.baris.length > SAMA_MAKS && !bukaSemua) {
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => setBukaSemua(true)}
                  className="block w-full px-2.5 py-1 text-left text-[11px] text-ink-400 transition hover:bg-ink-50 hover:text-ink-600"
                >
                  {p.baris.length} baris tidak berubah
                </button>
              );
            }
            return p.baris.map((b, k) => (
              <p key={`${i}-${k}`} className="truncate px-2.5 text-ink-400">
                {b || " "}
              </p>
            ));
          }

          const hapus = p.jenis === "hapus";
          return p.baris.map((b, k) => (
            <p
              key={`${i}-${k}`}
              className={`whitespace-pre-wrap border-l-2 px-2 ${
                hapus
                  ? "border-red-300 bg-red-50/60 text-ink-400 line-through decoration-ink-300"
                  : "border-brand-500 bg-brand-50/60 text-ink-900"
              }`}
            >
              {b || " "}
            </p>
          ));
        })}
      </div>
    </div>
  );
}

// ── Kartu konfirmasi ──────────────────────────────────────────────────────────

/**
 * Satu kartu untuk semua usul, dan tombolnya SATU-SATUNYA pintu.
 *
 * Model tidak pernah mengerjakan apa pun sendiri. Alasannya beda per jenis,
 * tapi bentuknya sama karena kebiasaannya harus sama: apa pun yang Palwise mau
 * kerjakan, kamu lihat dulu.
 *
 * - Kirim ke pelanggan: tidak bisa ditarik balik, dan yang keluar nama tokomu.
 *   Salah orang dan salah isi cuma ketahuan kalau ditampilkan, karena itu
 *   NOMORNYA ikut ditulis, bukan cuma namanya.
 * - Simpan Info bisnis: catatannya dibacakan asisten ke pelanggan sebagai
 *   fakta. Harga salah ketik di sini jadi harga yang dikutip berulang-ulang.
 * - Cara bicara asisten: satu blok yang menentukan nada asisten di semua
 *   obrolan, dan menyimpannya MENGGANTI yang lama seluruhnya.
 */
function KartuUsul({
  usul,
  status,
  kabar,
  jalankan,
}: {
  usul: Usul;
  status: string | null;
  kabar: string | null;
  jalankan: (opsi: {
    batal?: boolean;
    ambilAlih?: boolean;
  }) => Promise<string | null>;
}) {
  const [ambilAlih, setAmbilAlih] = useState(false);
  const [proses, setProses] = useState(false);
  const [galatLokal, setGalatLokal] = useState<string | null>(null);
  const menunggu = status === "menunggu";
  const mengirim =
    usul.jenis === "kirim_pesan" || usul.jenis === "kirim_berkas";

  async function tekan(opsi: { batal?: boolean; ambilAlih?: boolean }) {
    setProses(true);
    setGalatLokal(null);
    setGalatLokal(await jalankan(opsi));
    setProses(false);
  }

  // Ditulis sebagai switch, bukan rantai ternary yang bercabang di `mengirim`.
  // `mengirim` cuma boolean, jadi TypeScript tidak bisa memakainya untuk
  // mempersempit tipe.
  const kepala = ((): {
    ikon: React.ComponentProps<typeof Ikon>["nama"];
    isi: React.ReactNode;
  } => {
    switch (usul.jenis) {
      case "kirim_pesan":
      case "kirim_berkas":
        return {
          ikon: usul.jenis === "kirim_berkas" ? "gambar" : "kirim",
          isi: (
            <>
              Kirim ke{" "}
              <span className="font-medium text-ink-900">{usul.kepada}</span>
              {/* Nomornya WAJIB kelihatan. Tiga pelanggan bisa sama-sama bernama
                  Budi, dan nama saja tidak pernah cukup untuk memastikan. */}
              {usul.nomor && (
                <span className="text-ink-400"> {usul.nomor}</span>
              )}
            </>
          ),
        };
      case "ubah_asisten":
        return { ikon: "asisten", isi: <>Ubah cara bicara asisten</> };
      case "ubah_info":
        return {
          ikon: "info",
          isi: (
            <>
              Ubah catatan{" "}
              <span className="font-medium text-ink-900">{usul.judul}</span>
            </>
          ),
        };
      case "tambah_info":
        return {
          ikon: "info",
          isi: (
            <>
              Catatan baru{" "}
              <span className="font-medium text-ink-900">{usul.judul}</span>
            </>
          ),
        };
    }
  })();

  const isiBaru = mengirim ? usul.teks : (usul as { isi: string }).isi;
  const isiLama =
    usul.jenis === "ubah_info" || usul.jenis === "ubah_asisten"
      ? usul.isiLama.trim()
      : "";

  // Peringatan waktu yang baru JAUH lebih pendek dari yang lama.
  //
  // Bukan kecurigaan umum terhadap model, ini bug yang sudah pernah terjadi
  // dalam bentuk lain: tombol "Mulai dari contoh" dulu MENURUNKAN mutu asisten
  // karena contohnya lebih miskin daripada tulisan bawaan yang dia timpa. Di
  // sini bentuknya sama persis: "santai aja panggil kak" jadi tiga baris yang
  // mengganti dua puluh baris berisi tugas dan larangan mengarang stok.
  const menyusutBanyak =
    isiLama.length > 200 && isiBaru.length < isiLama.length * 0.6;

  return (
    <div className="overflow-hidden rounded-xl border border-ink-200">
      <div className="flex items-center gap-2 border-b border-ink-100 bg-ink-50 px-2.5 py-1.5">
        <Ikon nama={kepala.ikon} size={14} className="shrink-0 text-ink-400" />
        <p className="min-w-0 flex-1 truncate text-[12px] text-ink-600">
          {kepala.isi}
        </p>
      </div>

      <div className="space-y-2 p-2.5">
        {usul.jenis === "kirim_berkas" && (
          <p className="flex items-center gap-2 rounded-lg bg-ink-50 px-2.5 py-1.5 text-[13px] text-ink-700">
            <Ikon nama="berkas" size={14} className="shrink-0 text-ink-400" />
            <span className="truncate">{usul.namaBerkas}</span>
          </p>
        )}

        {/* Yang mau diubah ditampilkan sebagai PERBANDINGAN, terbuka sejak awal.
            Menampilkan yang baru saja bikin "Simpan" jadi lompatan iman. */}
        {isiLama ? (
          <Perubahan lama={isiLama} baru={isiBaru} />
        ) : (
          isiBaru && (
            <p className="thin-scroll max-h-56 overflow-y-auto whitespace-pre-wrap rounded-lg bg-ink-50 px-2.5 py-2 text-[13px] leading-relaxed text-ink-800">
              {isiBaru}
            </p>
          )
        )}

        {menunggu && menyusutBanyak && (
          <p className="rounded-lg bg-amber-50 px-2.5 py-1.5 text-[12px] leading-relaxed text-amber-900">
            Yang baru jauh lebih pendek. Cek dulu baris yang dicoret, itu akan
            hilang.
          </p>
        )}

        {menunggu && galatLokal && (
          <p className="rounded-lg bg-red-50 px-2.5 py-1.5 text-[12px] leading-relaxed text-red-800">
            {galatLokal}
          </p>
        )}
      </div>

      {menunggu ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-ink-100 px-2.5 py-2">
          <button
            type="button"
            disabled={proses}
            onClick={() => tekan({ ambilAlih })}
            className="btn-primary disabled:opacity-60"
          >
            {proses ? "Sebentar" : mengirim ? "Kirim" : "Simpan"}
          </button>
          <button
            type="button"
            disabled={proses}
            onClick={() => tekan({ batal: true })}
            className="tap-aman text-[13px] text-ink-500 transition hover:text-ink-900 disabled:opacity-60"
          >
            Batal
          </button>

          {/* Cuma untuk yang mengirim, dan mati secara bawaan. "Suruh Budi bawa
              STNK" itu titipan, bukan niat mengambil alih obrolannya selamanya.
              Kalau asisten dimatikan diam-diam, Budi bertanya lagi besok dan
              tidak ada yang menjawab. */}
          {mengirim && (
            <label className="ml-auto flex cursor-pointer items-center gap-1.5 text-[12px] text-ink-500">
              <input
                type="checkbox"
                checked={ambilAlih}
                onChange={(e) => setAmbilAlih(e.target.checked)}
                className="h-3.5 w-3.5 accent-brand-600"
              />
              Aku yang lanjut balas
            </label>
          )}
        </div>
      ) : (
        <p
          className={`border-t px-2.5 py-1.5 text-[12px] ${
            status === "gagal"
              ? "border-red-200 bg-red-50 text-red-800"
              : "border-ink-100 text-ink-500"
          }`}
        >
          {kabar ??
            (status === "dibatalkan" ? "Tidak jadi." : "Sudah diproses.")}
        </p>
      )}
    </div>
  );
}

// ── Layar kosong & kotak ketik ────────────────────────────────────────────────

function Sambutan({ pilih }: { pilih: (teks: string) => void }) {
  return (
    <div className="py-3">
      <h2 className="text-base font-semibold text-ink-900">
        Mau tahu apa, atau mau aku kerjain apa?
      </h2>
      <p className="mt-1 text-[13px] text-ink-500">
        Tulis pakai bahasa kamu sendiri. Kalau aku mau mengirim atau menyimpan
        sesuatu, isinya aku tunjukkan dulu.
      </p>

      {/* Cuma di layar lebar. Di HP contohnya jadi baris chip di atas kotak
          ketik, supaya selalu dalam jangkauan jempol dan tidak tergulir hilang
          begitu keyboard naik. */}
      <ul className="anim-urut mt-3 hidden gap-0.5 sm:grid">
        {CONTOH.map((c) => (
          <li key={c.label}>
            <button
              type="button"
              onClick={() => pilih(c.label)}
              className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[13px] text-ink-600 transition hover:bg-ink-50 hover:text-ink-900"
              style={{ transitionDuration: "var(--gerak-cepat)" }}
            >
              <Ikon nama={c.ikon} size={14} className="shrink-0 text-ink-400" />
              {c.label}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Pengetik({
  isianRef,
  draft,
  setDraft,
  sibuk,
  kirim,
  jatah,
  tampilkanContoh,
}: {
  isianRef: React.RefObject<HTMLTextAreaElement | null>;
  draft: string;
  setDraft: (v: string) => void;
  sibuk: boolean;
  kirim: (teks: string) => void;
  jatah: { terpakai: number; batas: number } | null;
  tampilkanContoh: boolean;
}) {
  const sisa = jatah ? Math.max(0, jatah.batas - jatah.terpakai) : null;

  // Kotaknya tumbuh mengikuti isinya, dan menyusut lagi waktu dikosongkan.
  // Tanpa ini, perintah tiga baris cuma kelihatan satu baris dan orang tidak
  // bisa membaca ulang apa yang barusan dia ketik sebelum mengirim.
  useEffect(() => {
    const el = isianRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [draft, isianRef]);

  return (
    <div
      className="shrink-0 border-t border-ink-200 bg-white"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {tampilkanContoh && (
        <div className="thin-scroll flex gap-1.5 overflow-x-auto px-3 pt-2.5 sm:hidden">
          {CONTOH.map((c) => (
            <button
              key={c.label}
              type="button"
              onClick={() => kirim(c.label)}
              className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border border-ink-200 px-2.5 py-1.5 text-[12px] text-ink-700"
            >
              <Ikon nama={c.ikon} size={13} className="text-ink-400" />
              {c.label}
            </button>
          ))}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          kirim(draft);
        }}
        className="mx-auto flex w-full max-w-2xl items-end gap-2 px-3 py-2.5 sm:px-6"
      >
        <textarea
          ref={isianRef}
          rows={1}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            // Enter mengirim, Shift+Enter baris baru. Perintah di sini hampir
            // selalu satu kalimat, jadi yang lebih sering dipakai yang dipasang
            // di tombol tanpa modifier.
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              kirim(draft);
            }
          }}
          placeholder="Tulis perintah atau pertanyaan"
          className="textarea-prosa min-h-[42px] flex-1 resize-none py-2.5"
          disabled={sibuk}
        />
        <button
          type="submit"
          disabled={sibuk || !draft.trim()}
          className="tap-aman grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-600 text-white transition hover:bg-brand-700 disabled:opacity-30"
          aria-label="Kirim perintah"
        >
          <Ikon nama="kirim" size={17} />
        </button>
      </form>

      {/* Sisa jatah, dan cuma waktu tinggal sedikit. Meteran yang selalu tampil
          mengajari orang mengabaikannya, dan waktu benar-benar habis dia sudah
          jadi bagian dari latar. */}
      {sisa !== null && sisa <= 10 && (
        <p className="pb-2 text-center text-[11px] text-ink-400">
          Sisa {sisa} perintah hari ini.
        </p>
      )}
    </div>
  );
}

/** Tanda tambah, digambar sendiri supaya sekeluarga dengan ikon yang lain. */
function IkonTambah() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
