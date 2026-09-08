"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Ikon } from "@/components/Ikon";
import { Logo } from "@/components/Logo";
import Link from "next/link";
import { TanyaIcon } from "@/components/TanyaIcon";
import styles from "./Tanya.module.css";
import { WhatsAppDalamChat } from "@/components/WhatsAppDalamChat";
import type { HasilBacaTanya, IdeTanya } from "@palwise/db";

/** A dedicated AI workspace, with a searchable history and a responsive composer. */

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
  hasilBaca?: HasilBacaTanya[];
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
  const [ideAkun, setIdeAkun] = useState<{ usaha: string; ide: IdeTanya[] }>({ usaha: "", ide: [] });
  const permintaanIde = useRef(0);
  const muatIde = useCallback(async () => {
    const urutan = ++permintaanIde.current;
    try {
      const res = await fetch("/api/tanya/ide", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      if (urutan === permintaanIde.current) setIdeAkun(data);
    } catch { /* Suggestions are optional; typing remains available. */ }
  }, []);
  useEffect(() => {
    void muatIde();
    return () => { permintaanIde.current++; };
  }, [muatIde, sesiId]);
  const [sibuk, setSibuk] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);
  const [riwayatBuka, setRiwayatBuka] = useState(false);
  const [riwayatCiut, setRiwayatCiut] = useState(false);
  const [memuat, setMemuat] = useState(true);
  const [mengubah, setMengubah] = useState(false);
  const [jauhDariBawah, setJauhDariBawah] = useState(false);
  const [ideBuka, setIdeBuka] = useState(false);
  const [whatsappBuka, setWhatsappBuka] = useState(false);
  const [jatah, setJatah] = useState<{
    terpakai: number;
    batas: number;
  } | null>(null);
  const [mode, setMode] = useState<string>("perintah");
  const [pasang, setPasang] = useState<Pemasangan | null>(null);

  const gulirRef = useRef<HTMLDivElement>(null);
  const isianRef = useRef<HTMLTextAreaElement>(null);
  const sedangMemuatRef = useRef(0);
  const operasiRef = useRef(false);
  const ikutiRef = useRef(true);

  function keBawah() {
    const el = gulirRef.current;
    el?.scrollTo({ top: el.scrollHeight, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    ikutiRef.current = true;
    setJauhDariBawah(false);
  }

  // Gulir kotaknya sendiri, bukan seluruh halaman. `scrollIntoView` menggulir
  // semua induk yang bisa digulir sampai elemennya kelihatan, dan itu bikin
  // kepala halaman ikut terdorong keluar tiap ada jawaban baru.
  useEffect(() => {
    const el = gulirRef.current;
    if (el && ikutiRef.current) el.scrollTo({ top: el.scrollHeight, behavior: "auto" });
  }, [pesan.length, sibuk, memuat, whatsappBuka]);

  useEffect(() => {
    const el = gulirRef.current;
    const isi = el?.firstElementChild;
    if (!el || !isi) return;
    const observer = new ResizeObserver(() => {
      if (ikutiRef.current) el.scrollTop = el.scrollHeight;
    });
    observer.observe(isi);
    return () => observer.disconnect();
  }, [memuat, whatsappBuka]);

  // Keep the composer inside the visible viewport when a phone keyboard opens.
  useEffect(() => {
    const viewport = window.visualViewport;
    const el = document.documentElement;
    el.dataset.tanya = "1";
    const ukur = () => {
      el.style.setProperty("--tanya-viewport", `${viewport?.height ?? window.innerHeight}px`);
      if (viewport && window.innerHeight - viewport.height > 140 && viewport.scale === 1) el.dataset.tanyaKeyboard = "1";
      else delete el.dataset.tanyaKeyboard;
    };
    ukur();
    viewport?.addEventListener("resize", ukur);
    return () => {
      delete el.dataset.tanya;
      delete el.dataset.tanyaKeyboard;
      el.style.removeProperty("--tanya-viewport");
      viewport?.removeEventListener("resize", ukur);
    };
  }, []);

  const muatDaftar = useCallback(async () => {
    const res = await fetch("/api/tanya/sesi");
    if (!res.ok) throw new Error("Riwayat belum bisa dimuat. Coba lagi ya.");
    const data = await res.json();
    setDaftar(data.sesi ?? []);
    return (data.sesi ?? []) as Sesi[];
  }, []);

  const muatPemasangan = useCallback(async () => {
    const res = await fetch("/api/tanya/pemasangan");
    if (!res.ok) throw new Error("Progres pemasangan belum bisa dimuat.");
    const keadaan: Pemasangan = await res.json();
    setPasang(keadaan);
    return keadaan;
  }, []);

  const muatUtas = useCallback(
    async (id: string) => {
      const permintaan = ++sedangMemuatRef.current;
      const res = await fetch(`/api/tanya/sesi/${id}`);
      if (!res.ok) throw new Error("Obrolan belum bisa dibuka. Coba lagi ya.");
      const data = await res.json();
      if (permintaan !== sedangMemuatRef.current) return;
      setPesan(data.pesan ?? []);
      setMode(data.mode ?? "perintah");
      setWhatsappBuka((data.pesan ?? []).some((p: Pesan) => p.alat.includes("sambungkan_whatsapp")));
      // Pitanya cuma dipakai utas pemasangan, jadi cuma di situ dia diambil.
      // Satu kueri tambahan di tiap perpindahan utas biasa itu ongkos yang
      // dibayar semua orang untuk sesuatu yang tidak pernah mereka lihat.
      if (data.mode === "pasang") {
        const keadaan = await muatPemasangan();
        if (keadaan.caraBicara && keadaan.info && !keadaan.nomor) setWhatsappBuka(true);
      }
      else setPasang(null);
    },
    [muatPemasangan],
  );

  // Muat pertama: ambil daftarnya, lalu buka utas yang diminta alamat, atau
  // yang paling baru, atau bikin baru kalau memang belum pernah ada.
  useEffect(() => {
    let batal = false;
    (async () => {
      try {
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
        if (!res.ok || !data?.id) throw new Error("Obrolan belum bisa dibuat.");
        if (!batal && data?.id) {
          setSesiId(data.id);
          setPesan([]);
          await muatDaftar();
        }
      }
      } catch (error) {
        if (!batal) setGalat(error instanceof Error ? error.message : "Tidak bisa menghubungi server.");
      } finally {
        if (!batal) setMemuat(false);
      }
    })();
    return () => {
      batal = true;
    };
    // Sengaja sekali saja. Perpindahan utas sesudah ini dikerjakan bukaUtas.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function bukaUtas(id: string, pertahankanDraft = false) {
    if (operasiRef.current || sibuk || mengubah) return;
    operasiRef.current = true;
    setMemuat(true);
    sedangMemuatRef.current++;
    ikutiRef.current = true;
    setJauhDariBawah(false);
    if (!pertahankanDraft) setDraft("");
    setIdeBuka(false);
    try {
    setSesiId(id);
    setRiwayatBuka(false);
    setGalat(null);
    await muatUtas(id);
    // Alamatnya ikut berubah supaya utas ini bisa di-bookmark dan tombol
    // kembali browser bekerja seperti yang orang harapkan.
    router.replace(`/app/tanya?s=${id}`, { scroll: false });
    } catch (error) {
      setPesan([]);
      setGalat(error instanceof Error ? error.message : "Tidak bisa menghubungi server.");
    } finally {
      operasiRef.current = false;
      setMemuat(false);
    }
  }

  async function utasBaru() {
    if (operasiRef.current || sibuk || mengubah) return;
    operasiRef.current = true;
    setMemuat(true);
    setGalat(null);
    try {
    const res = await fetch("/api/tanya/sesi", { method: "POST" });
    const data = await res.json();
    if (!res.ok || !data?.id) throw new Error("Obrolan baru belum bisa dibuat.");
    if (data?.id) {
      setSesiId(data.id);
      setPesan([]);
      setMode("perintah");
      setPasang(null);
      setWhatsappBuka(false);
      setDraft("");
      setIdeBuka(false);
      setJauhDariBawah(false);
      ikutiRef.current = true;
      setRiwayatBuka(false);
      await muatDaftar();
      router.replace(`/app/tanya?s=${data.id}`, { scroll: false });
      isianRef.current?.focus();
    }
    } catch (error) {
      setGalat(error instanceof Error ? error.message : "Tidak bisa menghubungi server.");
    } finally {
      operasiRef.current = false;
      setMemuat(false);
    }
  }

  async function hapusUtas(id: string) {
    if (operasiRef.current || sibuk || mengubah) return;
    operasiRef.current = true;
    setMengubah(true);
    setGalat(null);
    try {
    const res = await fetch(`/api/tanya/sesi/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Obrolan belum berhasil dihapus.");
    const list = await muatDaftar();
    operasiRef.current = false;
    setMengubah(false);
    if (id === sesiId) {
      const berikut = list[0]?.id;
      // Navigation owns its own busy guard after deletion completes.
      setSesiId(null);
      setPesan([]);
      if (berikut) await bukaUtas(berikut);
      else await utasBaru();
    }
    } catch (error) {
      setGalat(error instanceof Error ? error.message : "Tidak bisa menghubungi server.");
    } finally {
      operasiRef.current = false;
      setMengubah(false);
    }
  }

  async function kirim(teks: string) {
    const isi = teks.trim();
    if (!isi || sibuk || memuat || operasiRef.current || !sesiId) return;
    operasiRef.current = true;
    ikutiRef.current = true;
    setJauhDariBawah(false);
    setIdeBuka(false);

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
        setDraft(sekarang => sekarang.trim() ? `${isi}\n\n${sekarang}` : isi);
        setGalat(data?.error ?? "Gagal menjalankan perintah.");
        return;
      }

      setPesan((p) => [
        ...p.filter((x) => x.id !== sementara.id),
        ...(data.pesan ?? []),
      ]);
      if ((data.pesan ?? []).some((p: Pesan) => p.alat?.includes("sambungkan_whatsapp"))) setWhatsappBuka(true);
      if (data.jatah)
        setJatah({ terpakai: data.jatah.terpakai, batas: data.jatah.batas });
      // A history refresh failure must not restore an already delivered draft.
      await Promise.allSettled([muatDaftar(), ...(mode === "pasang" ? [muatPemasangan()] : [])]);
    } catch {
      setPesan((p) => p.filter((x) => x.id !== sementara.id));
      setDraft(sekarang => sekarang.trim() ? `${isi}\n\n${sekarang}` : isi);
      setGalat("Tidak bisa menghubungi server.");
    } finally {
      operasiRef.current = false;
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
    if (operasiRef.current) return "Tunggu proses sebelumnya selesai dulu ya.";
    operasiRef.current = true;
    setMengubah(true);
    setGalat(null);
    try {
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
    if (mode === "pasang") {
      const keadaan = await muatPemasangan();
      if (keadaan.caraBicara && keadaan.info && !keadaan.nomor) setWhatsappBuka(true);
    }
    return kabar;
    } catch {
      const kabar = "Status tindakan belum bisa diperiksa. Muat ulang obrolan sebelum mencoba lagi.";
      setGalat(kabar);
      return kabar;
    } finally {
      operasiRef.current = false;
      setMengubah(false);
    }
  }

  const kosong = pesan.length === 0 && !whatsappBuka;
  // Giliran pertama pemasangan: baru sapaan Palwise, pemiliknya belum menjawab.
  const barusanMulai =
    mode === "pasang" &&
    !!pasang && !pasang.caraBicara && !pasang.info && !pasang.nomor &&
    pesan.length > 0 &&
    !pesan.some((p) => p.peran === "pemilik");
  const judulSekarang = daftar.find((s) => s.id === sesiId)?.judul;

  const terkunci = sibuk || memuat || mengubah;

  function pilihIde(teks: string) {
    setDraft(teks);
    setIdeBuka(false);
    isianRef.current?.focus();
  }

  return (
    <div className={styles.shell}>
      <RelRiwayat daftar={daftar} sesiId={sesiId} buka={riwayatBuka} ciut={riwayatCiut}
        tutup={() => setRiwayatBuka(false)} ciutkan={() => setRiwayatCiut(true)}
        pilih={bukaUtas} hapus={hapusUtas} baru={utasBaru} terkunci={terkunci} />
      <section className={styles.main} aria-label="Tanya Palwise" inert={riwayatBuka}>
        <header className={styles.header}>
          <Link href="/app" className={styles.iconButton + " " + styles.mobileBack} aria-label="Kembali ke ringkasan" title="Kembali ke ringkasan"><TanyaIcon nama="kembali" /></Link>
          <button type="button" className={styles.iconButton} title="Buka atau tutup riwayat" aria-label="Buka atau tutup riwayat" aria-controls="riwayat-tanya"
            onClick={() => { if (window.matchMedia("(min-width: 1024px)").matches) setRiwayatCiut(!riwayatCiut); else setRiwayatBuka(true); }}><TanyaIcon nama="panel" /></button>
          <div className={styles.identity}>
            <Logo ukuran={28} />
            <div className={styles.identityText}>
              <p className={styles.identityTitle}>Palwise <span className={styles.aiBadge}>AI</span></p>
              <p className={styles.subtitle}>{mode === "pasang" ? "Siapkan asisten bisnismu" : judulSekarang || "Teman kerja untuk bisnismu"}</p>
            </div>
          </div>
          <div className={styles.headerActions}>
            <button type="button" onClick={utasBaru} disabled={terkunci} className={styles.newChat} aria-label="Obrolan baru" title="Obrolan baru"><TanyaIcon nama="baru" size={17} /><span>Obrolan baru</span></button>
          </div>
        </header>
        {mode === "pasang" && <div className="border-b border-ink-100 px-5 py-2"><Langkah keadaan={pasang} sambungkan={() => { ikutiRef.current = true; setWhatsappBuka(true); }} /></div>}
        <div className={styles.workspace + (kosong && !memuat ? " " + styles.workspaceEmpty : "")}>
          <div className={styles.conversationArea}>
            <div ref={gulirRef} className={styles.scrollArea} onScroll={(event) => {
              const el = event.currentTarget;
              const jauh = el.scrollHeight - el.scrollTop - el.clientHeight > 120;
              ikutiRef.current = !jauh;
              setJauhDariBawah(jauh);
            }}>
              {memuat ? <div className={styles.loading} role="status"><span className={styles.spinner} />Menyiapkan obrolan...</div> :
                <div className={styles.thread}>
                  {kosong ? <Sambutan usaha={ideAkun.usaha} /> : <div className={styles.messages} role="log" aria-label="Percakapan dengan Palwise" aria-live="polite" aria-relevant="additions">
                    {pesan.map((p) => p.peran === "pemilik" ? <DariPemilik key={p.id} teks={p.teks} /> :
                      <DariPalwise key={p.id} pesan={p} jalankan={(opsi) => jalankanUsul(p.id, opsi)} />)}
                  </div>}
                  {barusanMulai && !sibuk && <div className="mt-5 flex flex-wrap gap-2">
                    {JENIS_USAHA.map((j) => <button key={j.label} type="button" disabled={terkunci} onClick={() => kirim(`Jualan ${j.label.toLowerCase()}`)}
                      className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-ink-200 px-3 py-2 text-xs text-ink-700 transition hover:bg-ink-50 disabled:opacity-40"><Ikon nama={j.ikon} size={16} />{j.label}</button>)}
                  </div>}
                  {sibuk && <div className={styles.thinking} role="status"><TandaPalwise /><span className={styles.spinner} /><span>Palwise sedang menyiapkan jawaban...</span></div>}
                  {whatsappBuka && <WhatsAppDalamChat key={sesiId} tutup={() => setWhatsappBuka(false)} tersambung={(connected) => {
                    setPasang(keadaan => keadaan && keadaan.nomor !== connected ? { ...keadaan, nomor: connected } : keadaan);
                  }} />}
                </div>}
            </div>
            {!kosong && jauhDariBawah && <button type="button" onClick={keBawah} className={styles.jump} aria-label="Ke pesan terbaru" title="Ke pesan terbaru"><TanyaIcon nama="bawah" size={18} /></button>}
          </div>
          <Pengetik isianRef={isianRef} draft={draft} setDraft={setDraft} sibuk={sibuk} terkunci={terkunci || !sesiId} kirim={kirim}
            jatah={jatah} kosong={kosong && !memuat} ide={ideAkun.ide} ideBuka={ideBuka} togelIde={() => { if (!ideBuka) void muatIde(); setIdeBuka(!ideBuka); }} pilihIde={pilihIde}
            bukaWhatsapp={() => { ikutiRef.current = true; setWhatsappBuka(true); }}
            galat={galat} cobaLagi={() => { if (sesiId) void bukaUtas(sesiId, true); else void utasBaru(); }} />
        </div>
      </section>
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
function Langkah({ keadaan, sambungkan }: { keadaan: Pemasangan | null; sambungkan: () => void }) {
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
    { label: "WhatsApp", selesai: keadaan.nomor, href: "/app/whatsapp" },
  ];

  return (
    <div className="flex min-w-0 items-center justify-between gap-2 overflow-hidden" aria-label="Progres pemasangan">
      {langkah.map((l) => {
        const isi = (
          <>
            <span
              className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                l.selesai ? "bg-brand-600" : "bg-ink-300"
              }`}
            />
            <span className="truncate">{l.label}</span>
          </>
        );
        const kelas = `inline-flex min-h-8 items-center gap-1.5 text-[10px] sm:text-xs ${
          l.selesai ? "text-ink-500" : "font-medium text-ink-800"
        }`;

        return l.href && !l.selesai ? (
          <button
            key={l.label}
            type="button"
            onClick={sambungkan}
            className={`${kelas} hover:text-brand-700 hover:underline`}
          >
            {isi}
          </button>
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

function RelRiwayat({ daftar, sesiId, buka, ciut, tutup, ciutkan, pilih, hapus, baru, terkunci }: {
  daftar: Sesi[]; sesiId: string | null; buka: boolean; ciut: boolean; tutup: () => void; ciutkan: () => void;
  pilih: (id: string) => void; hapus: (id: string) => void; baru: () => void; terkunci: boolean;
}) {
  const [mauHapus, setMauHapus] = useState<string | null>(null);
  const [pencarian, setPencarian] = useState("");
  const panelRef = useRef<HTMLElement>(null);
  const cariRef = useRef<HTMLInputElement>(null);
  const tutupRef = useRef(tutup);
  tutupRef.current = tutup;

  useEffect(() => {
    if (!buka) return;
    const sebelumnya = document.activeElement as HTMLElement | null;
    cariRef.current?.focus();
    function keyboard(event: KeyboardEvent) {
      if (event.key === "Escape") { event.preventDefault(); tutupRef.current(); }
      if (event.key !== "Tab") return;
      const nodes = Array.from(panelRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input, a[href]') ?? []).filter(el => el.getClientRects().length > 0);
      const pertama = nodes[0], terakhir = nodes[nodes.length - 1];
      if (event.shiftKey && document.activeElement === pertama) { event.preventDefault(); terakhir?.focus(); }
      else if (!event.shiftKey && document.activeElement === terakhir) { event.preventDefault(); pertama?.focus(); }
    }
    const media = window.matchMedia("(min-width: 1024px)");
    const resize = () => { if (media.matches) tutupRef.current(); };
    media.addEventListener("change", resize);
    document.addEventListener("keydown", keyboard);
    return () => { document.removeEventListener("keydown", keyboard); media.removeEventListener("change", resize); sebelumnya?.focus(); };
  }, [buka]);

  const hasil = daftar.filter(s => (s.judul || "Obrolan baru").toLocaleLowerCase("id").includes(pencarian.toLocaleLowerCase("id")));
  return <>
    {buka && <div className={styles.backdrop} onClick={tutup} aria-hidden="true" />}
    <aside id="riwayat-tanya" ref={panelRef} role={buka ? "dialog" : undefined} aria-modal={buka || undefined} aria-label="Riwayat obrolan"
      className={[styles.history, ciut ? styles.historyClosed : "", buka ? styles.historyOpen : ""].join(" ")}>
      <div className={styles.historyHeading}><h2>Ruang obrolan</h2>
        <button type="button" className={styles.iconButton} aria-label="Tutup riwayat" title="Tutup riwayat" onClick={() => { tutup(); ciutkan(); }}><TanyaIcon nama={buka ? "tutup" : "panel"} size={18} /></button>
      </div>
      <button type="button" onClick={() => { setPencarian(""); baru(); }} disabled={terkunci} className={styles.newChat}><TanyaIcon nama="baru" size={17} />Obrolan baru</button>
      <label className={styles.search}><TanyaIcon nama="cari" size={17} /><input ref={cariRef} type="search" placeholder="Cari obrolan..." aria-label="Cari obrolan" value={pencarian} onChange={e => setPencarian(e.target.value)} /></label>
      <nav className={styles.historyList} aria-label="Daftar obrolan">
        {hasil.length === 0 ? <p className={styles.historyEmpty}>{pencarian ? "Tidak ada obrolan yang cocok. Coba kata lain." : "Obrolanmu akan tersimpan di sini. Mulai dengan satu pertanyaan."}</p> : kelompokkan(hasil).map(k =>
          <div key={k.judul} className={styles.historyGroup}><p>{k.judul}</p><ul>
            {k.isi.map(s => <li key={s.id}>
              <div className={styles.historyRow + (s.id === sesiId ? " " + styles.historyRowActive : "")}>
                <button type="button" disabled={terkunci} onClick={() => { setMauHapus(null); pilih(s.id); }} className={styles.historySelect} aria-current={s.id === sesiId ? "page" : undefined} title={s.judul || "Obrolan baru"}>
                  {s.mode === "pasang" ? <Ikon nama="asisten" size={16} /> : <TanyaIcon nama="chat" size={16} />}<span>{s.judul || "Obrolan baru"}</span>
                </button>
                <button type="button" disabled={terkunci} onClick={() => setMauHapus(s.id)} className={styles.historyDelete} aria-label={`Hapus ${s.judul || "obrolan ini"}`} title="Hapus obrolan"><TanyaIcon nama="hapus" size={15} /></button>
              </div>
              {mauHapus === s.id && <div className={styles.deleteConfirm}><p>Hapus obrolan ini? Isinya tidak bisa dikembalikan.</p><div>
                <button type="button" disabled={terkunci} onClick={() => { setMauHapus(null); hapus(s.id); }}>Hapus</button>
                <button type="button" onClick={() => setMauHapus(null)}>Batal</button>
              </div></div>}
            </li>)}
          </ul></div>)}
      </nav>
      <div className={styles.historyFooter}><Ikon nama="info" size={16} /><span>Konteks bisnis, dalam satu obrolan.</span></div>
    </aside>
  </>;
}


// ── Gelembung ─────────────────────────────────────────────────────────────────

function DariPemilik({ teks }: { teks: string }) {
  return <div className={styles.owner + " anim-naik"}><p>{teks}</p></div>;
}

function TandaPalwise() {
  return <span className={styles.avatar}><Logo ukuran={18} /></span>;
}

// React escapes every fragment. Model output is never inserted as HTML.
function formatInline(teks: string): React.ReactNode[] {
  return teks.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? <strong key={i}>{part.slice(2, -2)}</strong> :
    part.startsWith("`") && part.endsWith("`") ? <code key={i}>{part.slice(1, -1)}</code> : part);
}

function TeksJawaban({ teks }: { teks: string }) {
  const hasil: React.ReactNode[] = [];
  const lines = teks.split("\n");
  for (let i = 0; i < lines.length;) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }
    if (line.startsWith("```")) {
      const code: string[] = []; i++;
      while (i < lines.length && !lines[i].startsWith("```")) code.push(lines[i++]);
      i++; hasil.push(<pre key={i}><code>{code.join("\n")}</code></pre>); continue;
    }
    if (/^#{1,6} /.test(line)) { hasil.push(<h3 key={i}>{formatInline(line.replace(/^#{1,6} /, ""))}</h3>); i++; continue; }
    if (/^\s*([-*] |\d+\. )/.test(line)) {
      const ordered = /^\s*\d+\. /.test(line), items: React.ReactNode[] = [];
      const pattern = ordered ? /^\s*\d+\. / : /^\s*[-*] /;
      while (i < lines.length && pattern.test(lines[i])) { items.push(<li key={i}>{formatInline(lines[i].replace(pattern, ""))}</li>); i++; }
      hasil.push(ordered ? <ol key={i}>{items}</ol> : <ul key={i}>{items}</ul>); continue;
    }
    const para = [line]; i++;
    while (i < lines.length && lines[i].trim() && !/^(#{1,6} |```|\s*[-*] |\s*\d+\. )/.test(lines[i])) para.push(lines[i++]);
    hasil.push(<p key={i}>{formatInline(para.join("\n"))}</p>);
  }
  return <div className={styles.answerText}>{hasil}</div>;
}

function DariPalwise({ pesan, jalankan }: {
  pesan: Pesan; jalankan: (opsi: { batal?: boolean; ambilAlih?: boolean }) => Promise<string | null>;
}) {
  const [salinan, setSalinan] = useState<"awal" | "selesai" | "gagal">("awal");
  useEffect(() => { if (salinan === "awal") return; const timer = setTimeout(() => setSalinan("awal"), 2500); return () => clearTimeout(timer); }, [salinan]);
  async function salin() {
    const lengkap = [pesan.teks, ...(pesan.hasilBaca ?? []).map(h => `${h.judul}\n${h.isi}`)].join("\n\n");
    try { await navigator.clipboard.writeText(lengkap); setSalinan("selesai"); }
    catch { setSalinan("gagal"); }
  }
  return <article className={styles.answer + " anim-naik"}>
    <div className={styles.answerIdentity}><TandaPalwise /><span>Palwise</span><span className={styles.aiBadge}>AI</span></div>
    <div className={styles.answerBody}>
      {!(pesan.hasilBaca?.[0]?.isi.startsWith(pesan.teks) && pesan.teks) && <TeksJawaban teks={pesan.teks} />}
      {(pesan.hasilBaca ?? []).map((hasil, index) => <details key={`${hasil.alat}-${index}`} className={styles.resultCard} aria-label={hasil.judul}
        open={!new Set(["lihat_kontak", "lihat_info", "lihat_asisten", "cari_info_bisnis"]).has(hasil.alat)}>
        <summary className={styles.resultHeading}><span>{hasil.judul}</span>{hasil.gagal && <small>Belum berhasil dibaca</small>}</summary>
        <TeksJawaban teks={hasil.isi} />
      </details>)}
      {pesan.usul && <div className="mt-4"><KartuUsul usul={pesan.usul} status={pesan.usulStatus} kabar={pesan.usulPesan} jalankan={jalankan} /></div>}
      <div className={styles.answerFooter}>
        <button type="button" className={styles.copy} onClick={salin} aria-label="Salin jawaban" title={salinan === "selesai" ? "Tersalin" : "Salin jawaban"}>
          <Ikon nama={salinan === "selesai" ? "centang" : "salin"} size={16} /><span className="sr-only" aria-live="polite">{salinan === "selesai" ? "Tersalin" : salinan === "gagal" ? "Gagal menyalin, coba lagi" : ""}</span>
        </button>
        {pesan.alat.length > 0 && <details className={styles.sourceMenu}><summary aria-label="Sumber jawaban" title="Sumber jawaban"><Ikon nama="info" size={16} /></summary><div>{[...new Set(pesan.alat)].map(kode => <p key={kode}>{namaAlat(kode)}</p>)}</div></details>}
      </div>
    </div>
  </article>;
}


/** Nama alat dalam bahasa yang dimengerti pemilik toko. */
function namaAlat(kode: string): string {
  const peta: Record<string, string> = {
    hitung_obrolan: "hitungan chat",
    daftar_pelanggan: "tahap pelanggan",
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
    sambungkan_whatsapp: "koneksi WhatsApp",
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
    try { setGalatLokal(await jalankan(opsi)); }
    catch { setGalatLokal("Status belum bisa diperiksa. Muat ulang obrolan ya."); }
    finally { setProses(false); }
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
    <div className="overflow-hidden rounded-2xl border border-ink-200 bg-white">
      <div className="flex items-start gap-2.5 border-b border-ink-100 bg-ink-50 px-4 py-3">
        <Ikon nama={kepala.ikon} size={14} className="shrink-0 text-ink-400" />
        <p className="min-w-0 flex-1 break-words text-[12px] leading-relaxed text-ink-600">
          {kepala.isi}
        </p>
      </div>

      <div className="space-y-3 p-4">
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
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3 border-t border-ink-100 px-4 py-3">
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

function Sambutan({ usaha }: { usaha: string }) {
  return <div className={styles.welcome + " anim-naik"}>
    <div className={styles.welcomeLogo}><Logo ukuran={40} /></div>
    <h1>Mau kerjakan apa?</h1>
    {usaha && <p className={styles.businessName}>{usaha}</p>}
  </div>;
}

function Pengetik({ isianRef, draft, setDraft, sibuk, terkunci, kirim, jatah, kosong, ide, ideBuka, togelIde, pilihIde, galat, cobaLagi, bukaWhatsapp }: {
  isianRef: React.RefObject<HTMLTextAreaElement | null>; draft: string; setDraft: (v: string) => void;
  sibuk: boolean; terkunci: boolean; kirim: (teks: string) => void; jatah: { terpakai: number; batas: number } | null;
  kosong: boolean; ideBuka: boolean; togelIde: () => void; pilihIde: (teks: string) => void;
  ide: IdeTanya[];
  galat: string | null; cobaLagi: () => void;
  bukaWhatsapp: () => void;
}) {
  const sisa = jatah ? Math.max(0, jatah.batas - jatah.terpakai) : null;
  useEffect(() => {
    const el = isianRef.current;
    if (!el) return;
    const sesuaikan = () => {
      el.style.height = "auto";
      el.style.height = Math.min(el.scrollHeight, 180) + "px";
    };
    let lebar = el.clientWidth;
    sesuaikan();
    const observer = new ResizeObserver(() => {
      if (el.clientWidth !== lebar) { lebar = el.clientWidth; sesuaikan(); }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [draft, isianRef]);

  return <div className={styles.composerDock}>
    <div className={styles.composerInner}>
      {galat && <div className={styles.error} role="alert"><span>{galat}</span><button type="button" onClick={cobaLagi} disabled={sibuk}>Muat ulang</button></div>}
      <form onSubmit={e => { e.preventDefault(); kirim(draft); }} className={styles.composer}>
        <textarea ref={isianRef} rows={1} value={draft} onChange={e => setDraft(e.target.value)}
          onKeyDown={e => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing && window.matchMedia("(hover: hover) and (pointer: fine)").matches) { e.preventDefault(); kirim(draft); }
          }} placeholder={sibuk ? "Tulis pertanyaan berikutnya..." : "Tanya Palwise..."}
          className={styles.textarea} aria-label="Pesan untuk Palwise" />
        <div className={styles.composerToolbar}>
          {!kosong && <button type="button" onClick={togelIde} className={styles.ideaButton} title="Saran untuk bisnismu" aria-label="Saran untuk bisnismu" aria-expanded={ideBuka} aria-controls="ide-tanya"><TanyaIcon nama="ide" size={18} /></button>}
          <button type="button" onClick={bukaWhatsapp} className={styles.ideaButton} title="Sambungkan WhatsApp" aria-label="Sambungkan WhatsApp di chat"><Ikon nama="whatsapp" size={19} /></button>
          <button type="submit" disabled={terkunci || !draft.trim()} className={styles.send} aria-label="Kirim pesan" title="Kirim pesan">
            {sibuk ? <span className={styles.spinner} /> : <TanyaIcon nama="atas" size={21} />}
          </button>
        </div>
      </form>
      {(kosong || ideBuka) && ide.length > 0 && <div id="ide-tanya" className={styles.suggestions} aria-label="Saran untuk bisnismu">
        {ide.map(c => <button key={c.judul} type="button" onClick={() => pilihIde(c.pesan)} className={styles.suggestion} title={c.pesan}>
          <span className={styles.suggestionIcon}><Ikon nama={c.ikon} size={17} /></span><span><strong>{c.judul}</strong></span>
        </button>)}
      </div>}
      <div className={styles.composerHint}>
        <span>Draf diperiksa sebelum dikirim.</span>
        {!kosong && <span className={styles.keyboardHint}>Enter kirim · Shift + Enter baris baru</span>}
      </div>
      {sisa !== null && sisa <= 10 && <p className="pt-2 text-center text-xs text-ink-600" role="status">Sisa {sisa} perintah hari ini.</p>}
    </div>
  </div>;
}
