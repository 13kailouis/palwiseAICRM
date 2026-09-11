"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Ikon } from "@/components/Ikon";
import { Logo } from "@/components/Logo";
import { HapusObrolanModal } from "@/components/HapusObrolanModal";
import Link from "next/link";
import { TanyaIcon } from "@/components/TanyaIcon";
import { BANTUAN_BISNIS } from "./bantuanBisnis";
import styles from "./Tanya.module.css";
import { WhatsAppDalamChat } from "@/components/WhatsAppDalamChat";
import type { HasilBacaTanya, IdeTanya, JatahTanya } from "@palwise/db";

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
  | { jenis: "ubah_asisten"; bagian?: "cara_bicara" | "sapaan" | "serah_manusia"; isiLama: string; isi: string }
  | { jenis: "atur_asisten"; ubahan: { kunci: string; lama: string | number | boolean; baru: string | number | boolean }[] }
  | { jenis: "ubah_pelanggan"; kontakId: string; kepada: string; nomor: string | null; ubahan: { kunci: string; lama: string | null; baru: string | null }[] }
  | { jenis: "hapus_pelanggan"; kontakId: string; kepada: string; nomor: string | null }
  | { jenis: "hafalkan_info"; catatanId: string; judul: string }
  | { jenis: "hapus_info"; catatanId: string; judul: string; cuplikan: string }
  | { jenis: "ubah_berkas"; berkasId: string; namaLama: string; keteranganLama: string; nama: string; keterangan: string }
  | { jenis: "baca_berkas"; berkasId: string; nama: string }
  | { jenis: "hapus_berkas"; berkasId: string; nama: string }
  | { jenis: "atur_nomor"; nomorId: string; namaNomor: string; aksi: "matikan" | "nyalakan" | "ganti_nama"; namaBaru?: string }
  | { jenis: "hapus_nomor"; nomorId: string; namaNomor: string }
  | { jenis: "buka_halaman"; tujuan: string; alasan: string };

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

export function Tanya({ sesiAwal, pesanAwal = "" }: { sesiAwal: string | null; pesanAwal?: string }) {
  const router = useRouter();

  const [daftar, setDaftar] = useState<Sesi[]>([]);
  const [sesiId, setSesiId] = useState<string | null>(sesiAwal);
  const [pesan, setPesan] = useState<Pesan[]>([]);
  const [draft, setDraft] = useState(pesanAwal.slice(0, 2000));
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
  const [jatah, setJatah] = useState<JatahTanya | null>(null);
  useEffect(() => {
    let aktif = true;
    const muat = async () => {
      if (document.visibilityState === "hidden") return;
      try {
        const res = await fetch("/api/tanya/jatah", { cache: "no-store" });
        if (res.ok) { const data = await res.json(); if (aktif) setJatah(data); }
      } catch { /* Server still enforces limits when the usage indicator is offline. */ }
    };
    void muat();
    const timer = setInterval(muat, 60_000);
    window.addEventListener("focus", muat);
    document.addEventListener("visibilitychange", muat);
    return () => { aktif = false; clearInterval(timer); window.removeEventListener("focus", muat); document.removeEventListener("visibilitychange", muat); };
  }, []);
  const [mode, setMode] = useState<string>("perintah");
  const [pasang, setPasang] = useState<Pemasangan | null>(null);

  const gulirRef = useRef<HTMLDivElement>(null);
  const isianRef = useRef<HTMLTextAreaElement>(null);
  const sedangMemuatRef = useRef(0);
  // The answer being written right now, streamed from the worker: latest status and text so far.
  const [alir, setAlir] = useState<{ status: string; teks: string } | null>(null);
  // Messages that just finished streaming replace the live bubble without replaying an entrance.
  const [tanpaAnimasi, setTanpaAnimasi] = useState<Set<string>>(() => new Set());
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

  // The chat scrolls its own messages (html[data-tanya] in globals.css). The phone keyboard is
  // handled app-wide by LayarHp: this page's old handler only listened to `resize`, missed the
  // iOS pan, and left the composer at the top of the screen with blank space under it.
  useEffect(() => {
    const el = document.documentElement;
    el.dataset.tanya = "1";
    return () => {
      delete el.dataset.tanya;
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
          : pesanAwal ? undefined : list[0]?.id;
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
      isianRef.current?.focus({ preventScroll: true });
    }
    } catch (error) {
      setGalat(error instanceof Error ? error.message : "Tidak bisa menghubungi server.");
    } finally {
      operasiRef.current = false;
      setMemuat(false);
    }
  }

  async function hapusUtas(id: string): Promise<string | null> {
    if (operasiRef.current || sibuk || mengubah) return "Tunggu proses sebelumnya selesai.";
    operasiRef.current = true;
    setMengubah(true);
    setGalat(null);
    try {
    const res = await fetch(`/api/tanya/sesi/${id}`, { method: "DELETE" });
    // Retrying after a lost response is safe: an already absent thread is deleted.
    if (!res.ok && res.status !== 404) throw new Error("Obrolan belum berhasil dihapus. Coba lagi.");
    const sisa = daftar.filter(s => s.id !== id);
    setDaftar(sisa);
    const list = await muatDaftar().catch(() => {
      setGalat("Obrolan sudah dihapus. Riwayat lainnya belum bisa diperbarui; muat ulang halaman jika perlu.");
      return sisa;
    });
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
    return null;
    } catch (error) {
      return error instanceof Error ? error.message : "Tidak bisa menghubungi server.";
    } finally {
      operasiRef.current = false;
      setMengubah(false);
    }
  }

  async function kirim(teks: string) {
    const isi = teks.trim();
    if (!isi || sibuk || memuat || operasiRef.current || !sesiId) return;
    if (isi.length > 2000) { setGalat("Pesan maksimal 2.000 karakter. Ringkas dulu ya."); return; }
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
      // Normal answers stream as server-sent events; instant paths and errors still arrive as JSON.
      const mengalir = (res.headers.get("content-type") ?? "").includes("text/event-stream");
      if (mengalir) setAlir({ status: "", teks: "" });
      const data = mengalir ? await bacaAliran(res, (k) => setAlir((a) => {
        const kini = a ?? { status: "", teks: "" };
        if (k.jenis === "status") return { ...kini, status: k.teks ?? "" };
        if (k.jenis === "teks") return { ...kini, teks: kini.teks + (k.teks ?? "") };
        return { ...kini, teks: "" };
      })) : await res.json();
      const berhasil = mengalir ? Number(data.status ?? 500) < 400 : res.ok;
      if (data.jatah) setJatah(data.jatah);
      if (!berhasil || data?.error) {
        // Perintahnya gagal, jadi gelembung sementaranya dicabut lagi dan
        // teksnya dikembalikan ke kotak ketik. Membiarkannya menggantung di
        // layar bikin orang mengira perintahnya sudah masuk.
        setPesan((p) => p.filter((x) => x.id !== sementara.id));
        setDraft(sekarang => sekarang.trim() ? `${isi}\n\n${sekarang}` : isi);
        setGalat(data?.code === "TANYA_LIMIT" && data.jatah ? null : data?.error ?? "Gagal menjalankan perintah.");
        return;
      }

      setPesan((p) => [
        ...p.filter((x) => x.id !== sementara.id),
        ...(data.pesan ?? []),
      ]);
      // Swap the live bubble for the saved answer in the same render.
      setAlir(null);
      if (mengalir) setTanpaAnimasi(new Set((data.pesan ?? []).map((p: Pesan) => p.id)));
      if ((data.pesan ?? []).some((p: Pesan) => p.alat?.includes("sambungkan_whatsapp"))) setWhatsappBuka(true);
      // A history refresh failure must not restore an already delivered draft.
      await Promise.allSettled([muatDaftar(), ...(mode === "pasang" ? [muatPemasangan()] : [])]);
    } catch (err) {
      setPesan((p) => p.filter((x) => x.id !== sementara.id));
      if (err instanceof AliranPutus) {
        // The worker may already have saved the answer: reload the thread rather than re-offer the text.
        setGalat("Sambungan terputus di tengah jawaban. Obrolannya dimuat ulang.");
        if (sesiId) void bukaUtas(sesiId, true);
      } else {
        setDraft(sekarang => sekarang.trim() ? `${isi}\n\n${sekarang}` : isi);
        setGalat("Tidak bisa menghubungi server.");
      }
    } finally {
      operasiRef.current = false;
      setAlir(null);
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
    // Focused from code, so Safari must not scroll the page to "reveal" a composer that already
    // sits above the keyboard (the same jump as a direct tap). Wait a frame so the picked text is
    // in the box, then put the caret at its end.
    requestAnimationFrame(() => {
      const el = isianRef.current;
      if (!el) return;
      el.focus({ preventScroll: true });
      el.setSelectionRange(el.value.length, el.value.length);
    });
  }

  return (
    <div className={styles.shell}>
      <RelRiwayat daftar={daftar} sesiId={sesiId} buka={riwayatBuka} ciut={riwayatCiut}
        tutup={() => setRiwayatBuka(false)}
        pilih={bukaUtas} hapus={hapusUtas} terkunci={terkunci} />
      <section className={styles.main} aria-label="Tanya Palwise" inert={riwayatBuka}>
        <header className={styles.header}>
          <button type="button" className={styles.iconButton} title="Buka atau tutup riwayat" aria-label="Buka atau tutup riwayat" aria-controls="riwayat-tanya"
            onClick={() => { if (window.matchMedia("(min-width: 1024px)").matches) setRiwayatCiut(!riwayatCiut); else setRiwayatBuka(true); }}><TanyaIcon nama="panel" /></button>
          <Link href="/app" className={styles.identity} aria-label="Palwise AI, kembali ke ringkasan" title="Kembali ke ringkasan"><Logo ukuran={24} /><span className={styles.identityTitle}>Palwise<span className={styles.aiBadge}>AI</span></span></Link>
          {mode === "pasang" ? <Langkah keadaan={pasang} sambungkan={() => { ikutiRef.current = true; setWhatsappBuka(true); }} /> : <p className={styles.headerTitle} title={judulSekarang}>{judulSekarang || ""}</p>}
          <div className={styles.headerActions}>
            <button type="button" onClick={utasBaru} disabled={terkunci} className={styles.iconButton} aria-label="Obrolan baru" title="Obrolan baru"><TanyaIcon nama="baru" /></button>
          </div>
        </header>
        <div className={styles.workspace + (kosong && !memuat ? " " + styles.workspaceEmpty : "")}>
          <div className={styles.conversationArea}>
            <div ref={gulirRef} className={styles.scrollArea} onScroll={(event) => {
              const el = event.currentTarget;
              const jauh = el.scrollHeight - el.scrollTop - el.clientHeight > 120;
              ikutiRef.current = !jauh;
              setJauhDariBawah(jauh);
            }}>
              {memuat ? <div className={styles.loading} role="status"><span className="titik-ketik inline-flex items-center gap-1" aria-hidden="true"><span /><span /><span /></span>Menyiapkan obrolan...</div> :
                <div className={styles.thread}>
                  {kosong ? <Sambutan usaha={ideAkun.usaha} /> : <div className={styles.messages} role="log" aria-label="Percakapan dengan Palwise" aria-live="polite" aria-relevant="additions">
                    {pesan.map((p, index) => p.peran === "pemilik" ? <DariPemilik key={p.id} teks={p.teks} /> :
                      <DariPalwise key={p.id} pesan={p} jalankan={(opsi) => jalankanUsul(p.id, opsi)}
                        tanpaAnimasi={tanpaAnimasi.has(p.id)}
                        lengkapi={index === pesan.length - 1 && !terkunci ? () => kirim("Lengkapi jawaban sebelumnya dengan hasil atau draf lengkap yang bisa saya periksa. Jangan hanya menulis pengantar atau janji.") : undefined} />)}
                  </div>}
                  {barusanMulai && !sibuk && <div className="mt-5 flex flex-wrap gap-2">
                    {JENIS_USAHA.map((j) => <button key={j.label} type="button" disabled={terkunci} onClick={() => kirim(`Jualan ${j.label.toLowerCase()}`)}
                      className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-ink-200 px-3 py-2 text-xs text-ink-700 transition hover:bg-ink-50 disabled:opacity-40"><Ikon nama={j.ikon} size={16} />{j.label}</button>)}
                  </div>}
                  {/* Waiting state: typing dots in a bubble, like chat apps, never a spinner. */}
                  {sibuk && (alir?.teks ? <JawabanMengalir teks={alir.teks} /> :
                    <div className={styles.thinking} role="status"><TandaPalwise /><span className={`titik-ketik ${styles.dots}`} aria-hidden="true"><span /><span /><span /></span>{alir?.status && <span key={alir.status} className={styles.thinkingStatus + " anim-naik"}>{alir.status}</span>}<span className="sr-only">Palwise sedang menyiapkan jawaban...</span></div>)}
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

/** Compact progress; the checklist opens only when requested. */
function Langkah({ keadaan, sambungkan }: { keadaan: Pemasangan | null; sambungkan: () => void }) {
  const ref = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const outside = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) ref.current?.removeAttribute("open"); };
    const escape = (e: KeyboardEvent) => { if (e.key === "Escape" && ref.current?.open) { ref.current.open = false; ref.current.querySelector("summary")?.focus(); } };
    document.addEventListener("pointerdown", outside); document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", escape); };
  }, []);
  if (!keadaan) return null;
  const langkah = [
    { label: "Cara bicara", selesai: keadaan.caraBicara },
    { label: "Info bisnis", selesai: keadaan.info },
    { label: "WhatsApp", selesai: keadaan.nomor },
  ];
  const jumlah = langkah.filter(l => l.selesai).length;
  return <details ref={ref} className={styles.setupProgress}>
    <summary aria-label={`Progres pemasangan: ${jumlah} dari 3 selesai`}><span>Pasang asisten</span><b>{jumlah}/3</b><TanyaIcon nama="bawah" size={13} /></summary>
    <div className={styles.setupChecklist}>{langkah.map(l => <div key={l.label}><span>{l.label}</span>{l.selesai ? <span aria-label="Selesai"><TanyaIcon nama="centang" size={16} /></span> : l.label === "WhatsApp" ? <button type="button" onClick={() => { if (ref.current) ref.current.open = false; sambungkan(); }}>Tautkan</button> : <small>Belum diisi</small>}</div>)}</div>
  </details>;
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

function RelRiwayat({ daftar, sesiId, buka, ciut, tutup, pilih, hapus, terkunci }: {
  daftar: Sesi[]; sesiId: string | null; buka: boolean; ciut: boolean; tutup: () => void;
  pilih: (id: string) => void; hapus: (id: string) => Promise<string | null>; terkunci: boolean;
}) {
  const [mauHapus, setMauHapus] = useState<Sesi | null>(null);
  const [pencarian, setPencarian] = useState("");
  const panelRef = useRef<HTMLElement>(null);
  const cariRef = useRef<HTMLInputElement>(null);
  const pemicuHapusRef = useRef<HTMLButtonElement | null>(null);
  const tutupRef = useRef(tutup);
  tutupRef.current = tutup;

  useEffect(() => {
    if (!buka) return;
    const sebelumnya = document.activeElement as HTMLElement | null;
    panelRef.current?.querySelector<HTMLButtonElement>('button[aria-label="Tutup riwayat"]')?.focus({ preventScroll: true });
    function keyboard(event: KeyboardEvent) {
      if (document.querySelector("dialog[open]")) return;
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
        <button type="button" className={styles.iconButton + " " + styles.historyClose} aria-label="Tutup riwayat" title="Tutup riwayat" onClick={tutup}><TanyaIcon nama="tutup" size={18} /></button>
      </div>
      <label className={styles.search}><TanyaIcon nama="cari" size={17} /><input ref={cariRef} type="search" placeholder="Cari obrolan..." aria-label="Cari obrolan" value={pencarian} onChange={e => setPencarian(e.target.value)} /></label>
      <nav className={styles.historyList} aria-label="Daftar obrolan">
        {hasil.length === 0 ? <p className={styles.historyEmpty}>{pencarian ? "Tidak ada obrolan yang cocok. Coba kata lain." : "Obrolanmu akan tersimpan di sini. Mulai dengan satu pertanyaan."}</p> : kelompokkan(hasil).map(k =>
          <div key={k.judul} className={styles.historyGroup}><p>{k.judul}</p><ul>
            {k.isi.map(s => <li key={s.id}>
              <div className={styles.historyRow + (s.id === sesiId ? " " + styles.historyRowActive : "")}>
                <button type="button" disabled={terkunci} onClick={() => { setMauHapus(null); pilih(s.id); }} className={styles.historySelect} aria-current={s.id === sesiId ? "page" : undefined} title={s.judul || "Obrolan baru"}>
                  {s.mode === "pasang" ? <Ikon nama="asisten" size={16} /> : <TanyaIcon nama="chat" size={16} />}<span>{s.judul || "Obrolan baru"}</span>
                </button>
                <button type="button" disabled={terkunci} onClick={event => { pemicuHapusRef.current = event.currentTarget; setMauHapus(s); }} className={styles.historyDelete} aria-label={`Hapus ${s.judul || "obrolan ini"}`} title="Hapus obrolan"><TanyaIcon nama="hapus" size={15} /></button>
              </div>
            </li>)}
          </ul></div>)}
      </nav>
    </aside>
    {mauHapus && <HapusObrolanModal judul={mauHapus.judul} hapus={() => hapus(mauHapus.id)} tutup={() => {
      setMauHapus(null);
      requestAnimationFrame(() => {
        const pemicu = pemicuHapusRef.current;
        if (pemicu?.isConnected && !pemicu.disabled && pemicu.getClientRects().length && !pemicu.closest('[inert]')) {
          pemicu.focus();
          return;
        }
        if (!document.activeElement || document.activeElement === document.body || !(document.activeElement as HTMLElement).getClientRects().length) {
          if (cariRef.current?.getClientRects().length) cariRef.current.focus();
          else document.querySelector<HTMLButtonElement>('[aria-controls="riwayat-tanya"]')?.focus();
        }
      });
    }} />}
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

/**
 * The model often writes a list inside one sentence ("langkahnya: 1. A. 2. B. 3. C."). Split it
 * into one line per item, but only for a run that starts at 1 and counts up, so "versi 2." stays put.
 */
function pecahDaftarSebaris(line: string): string[] {
  const posisi: number[] = [];
  const penanda = /(^|\s)(\d{1,2})\.\s+(?=\S)/g;
  for (let m, cari = 1; (m = penanda.exec(line));) {
    if (Number(m[2]) === cari) { posisi.push(m.index + m[1].length); cari++; }
  }
  if (posisi.length < 2) return [line];
  const pembuka = line.slice(0, posisi[0]).trim();
  return [...(pembuka ? [pembuka] : []), ...posisi.map((p, i) => line.slice(p, posisi[i + 1]).trim())];
}

function TeksJawaban({ teks }: { teks: string }) {
  const hasil: React.ReactNode[] = [];
  let dalamKode = false;
  const lines = teks.split("\n").flatMap(l => {
    if (l.startsWith("```")) { dalamKode = !dalamKode; return [l]; }
    return dalamKode ? [l] : pecahDaftarSebaris(l);
  });
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

class AliranPutus extends Error {}

type KabarAlir = { jenis: string; teks?: string; status?: number; [kunci: string]: unknown };

/** Read the answer's server-sent events, reporting each one; returns the final "selesai" payload. */
async function bacaAliran(res: Response, saatKabar: (kabar: KabarAlir) => void): Promise<KabarAlir> {
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let sisa = "";
  let akhir: KabarAlir | null = null;
  const olah = (blok: string) => {
    const data = blok.split("\n").filter((b) => b.startsWith("data:")).map((b) => b.slice(5).trim()).join("");
    if (!data) return;
    const kabar = JSON.parse(data) as KabarAlir;
    if (kabar.jenis === "selesai") akhir = kabar; else saatKabar(kabar);
  };
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      sisa += decoder.decode(value, { stream: true });
      let i: number;
      while ((i = sisa.indexOf("\n\n")) >= 0) { olah(sisa.slice(0, i)); sisa = sisa.slice(i + 2); }
    }
    if (sisa.trim()) olah(sisa);
  } catch {
    throw new AliranPutus();
  }
  if (!akhir) throw new AliranPutus();
  return akhir;
}

/** The answer while the model is still writing it: same look as a finished one, plus a caret. */
function JawabanMengalir({ teks }: { teks: string }) {
  return <article className={styles.answer} aria-busy="true">
    <div className={styles.answerIdentity}><TandaPalwise /><span>Palwise</span><span className={styles.aiBadge}>AI</span></div>
    <div className={`${styles.answerBody} ${styles.mengalir}`}><TeksJawaban teks={teks} /></div>
  </article>;
}

function DariPalwise({ pesan, jalankan, lengkapi, tanpaAnimasi = false }: {
  pesan: Pesan; jalankan: (opsi: { batal?: boolean; ambilAlih?: boolean }) => Promise<string | null>;
  lengkapi?: () => void;
  /** Just finished streaming in place: do not replay the entrance animation. */
  tanpaAnimasi?: boolean;
}) {
  const [salinan, setSalinan] = useState<"awal" | "selesai" | "gagal">("awal");
  useEffect(() => { if (salinan === "awal") return; const timer = setTimeout(() => setSalinan("awal"), 2500); return () => clearTimeout(timer); }, [salinan]);
  async function salin() {
    const lengkap = [pesan.teks, pesan.usul ? ("teks" in pesan.usul ? pesan.usul.teks : "isi" in pesan.usul ? pesan.usul.isi : "ubahan" in pesan.usul ? pesan.usul.ubahan.map((u: { kunci: string; baru: unknown }) => `${u.kunci}: ${u.baru}`).join("\n") : "") : "", ...(pesan.hasilBaca ?? []).map(h => `${h.judul}\n${rapikanHasil(h.alat, h.isi)}`)].filter(Boolean).join("\n\n");
    try { await navigator.clipboard.writeText(lengkap); setSalinan("selesai"); }
    catch { setSalinan("gagal"); }
  }
  const adaBacaan = (pesan.hasilBaca?.length ?? 0) > 0;
  const teksDariData = !pesan.usul && !!pesan.teks && !!pesan.hasilBaca?.[0]?.isi.startsWith(pesan.teks);
  const bacaanPendukung = adaBacaan && (!!pesan.usul || (!teksDariData && !!pesan.teks.trim()));
  return <article className={styles.answer + (tanpaAnimasi ? "" : " anim-naik")}>
    <div className={styles.answerIdentity}><TandaPalwise /><span>Palwise</span><span className={styles.aiBadge}>AI</span></div>
    <div className={styles.answerBody}>
      {/* Data the assistant read to write its answer sits ABOVE the answer, folded, like a model's
          "thinking" row. When the data itself IS the answer (a plain lookup), it stays open below. */}
      {bacaanPendukung && <LangkahBaca hasil={pesan.hasilBaca!} />}
      {!teksDariData && <TeksJawaban teks={pesan.teks} />}
      {pesan.usul && <div className="anim-naik"><KartuUsul usul={pesan.usul} status={pesan.usulStatus} kabar={pesan.usulPesan} jalankan={jalankan} /></div>}
      {adaBacaan && !bacaanPendukung && <HasilPembacaan hasil={pesan.hasilBaca!} />}
      {lengkapi && !pesan.usul && !pesan.hasilBaca?.length && pesan.teks.length < 400 &&
        /(?:ini|berikut).{0,40}\b(?:draf|draft)|\b(?:saya|aku)\s+(?:akan\s+)?(?:lihat|cek|siapkan)\s+(?:dulu|data|draf)/i.test(pesan.teks) &&
        !/[\n:][\s\S]{20}/.test(pesan.teks) && <button type="button" className={styles.recoverAnswer} onClick={lengkapi} title="Buat jawaban lengkap menggunakan kuota AI">Lengkapi jawaban</button>}
      <div className={styles.answerFooter}>
        <button type="button" className={styles.copy} onClick={salin} aria-label="Salin jawaban" title={salinan === "selesai" ? "Tersalin" : "Salin jawaban"}>
          <Ikon nama={salinan === "selesai" ? "centang" : "salin"} size={16} /><span className="sr-only" aria-live="polite">{salinan === "selesai" ? "Tersalin" : salinan === "gagal" ? "Gagal menyalin, coba lagi" : ""}</span>
        </button>
        {pesan.alat.length > 0 && <details className={styles.sourceMenu}><summary aria-label="Sumber jawaban" title="Sumber jawaban"><Ikon nama="info" size={16} /></summary><div>{[...new Set(pesan.alat)].map(kode => <p key={kode}>{namaAlat(kode)}</p>)}</div></details>}
      </div>
    </div>
  </article>;
}


function HasilPembacaan({ hasil, ringkas = false }: { hasil: HasilBacaTanya[]; ringkas?: boolean }) {
  return <div className={styles.results}>{hasil.map((item, index) => <details key={`${item.alat}-${index}`} className={styles.resultCard} aria-label={item.judul}
    open={!ringkas && !["lihat_kontak", "lihat_info", "lihat_asisten", "cari_info_bisnis"].includes(item.alat)}>
    <summary className={styles.resultHeading}><span>{item.judul}</span>{item.gagal && <small>Belum berhasil dibaca</small>}</summary>
    <div className={styles.resultContent} tabIndex={0} aria-label={`Isi ${item.judul}`}><TeksJawaban teks={rapikanHasil(item.alat, item.isi)} /></div>
  </details>)}</div>;
}

/** Folded "what I read" row above an answer, in the spirit of a model's thinking disclosure. */
function LangkahBaca({ hasil }: { hasil: HasilBacaTanya[] }) {
  const nama = [...new Set(hasil.map(h => h.judul.charAt(0).toLowerCase() + h.judul.slice(1)))];
  const daftar = nama.length > 2 ? `${nama.slice(0, 2).join(", ")} dan ${nama.length - 2} lainnya` : nama.join(" dan ");
  const gagal = hasil.some(h => h.gagal);
  return <details className={styles.langkahBaca}>
    <summary><Ikon nama={gagal ? "info" : "centang"} size={14} /><span>Membaca {daftar}</span>{gagal && <small>ada yang gagal dibaca</small>}</summary>
    <HasilPembacaan hasil={hasil} />
  </details>;
}

const STATUS_KANAL: Record<string, string> = { connected: "tersambung", disconnected: "terputus", qr: "menunggu scan QR", connecting: "sedang menyambung" };

/**
 * The business brief is written for the model: ISO timestamps, tool names, and rules such as
 * "jangan mengarang angka". The model still receives all of it; the owner sees a plain version.
 * Done at display time so conversations saved earlier are cleaned too.
 */
function rapikanHasil(alat: string, isi: string): string {
  if (!["ringkasan_bisnis", "prioritas_bisnis", "peluang_follow_up"].includes(alat)) return isi;
  return isi
    .replace(/^Data tercatat di Palwise, (\d+) hari[^\n]*/m, (_, n: string) => `Periode ${n} hari terakhir, dibanding ${n} hari sebelumnya.`)
    .replace(/;\s*BUKAN pembayaran terverifikasi atau omzet\./, " (belum dicek, bukan omzet).")
    .replace(/Tahap CRM saat ini \(bukan konversi penjualan\)/, "Tahap pelanggan saat ini")
    .replace(/ \(maksimal 8\)/g, "")
    .replace(/^Peluang dipilih dari[^\n]*\n?/m, "")
    .replace(/^Tidak ada data omzet[^\n]*\n?/m, "")
    .replace(/^(.*)Kanal: (.*)$/m, (_, depan: string, kanal: string) => `${depan}Kanal: ${kanal.replace(/\b(connected|disconnected|qr|connecting)\b/g, s => STATUS_KANAL[s])}`)
    .trim();
}

/** Nama alat dalam bahasa yang dimengerti pemilik toko. */
function namaAlat(kode: string): string {
  const peta: Record<string, string> = {
    hitung_obrolan: "hitungan chat",
    status_whatsapp: "status WhatsApp saat diperiksa",
    daftar_nomor: "daftar nomor WhatsApp",
    daftar_pelanggan: "tahap pelanggan",
    daftar_masalah: "daftar keluhan",
    daftar_nunggu: "yang nunggu dibalas",
    ringkasan_bisnis: "kondisi bisnis", prioritas_bisnis: "prioritas kerja", peluang_follow_up: "peluang follow up",
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
  const [yakin, setYakin] = useState(false);
  const menunggu = status === "menunggu";
  const mengirim =
    usul.jenis === "kirim_pesan" || usul.jenis === "kirim_berkas";
  // Deleting anything takes two presses: "Hapus", then "Ya, hapus".
  const berbahaya = usul.jenis.startsWith("hapus_");

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
        return {
          ikon: "asisten",
          isi: usul.bagian === "sapaan" ? <>Ubah sapaan pertama</>
            : usul.bagian === "serah_manusia" ? <>Ubah kapan asisten memanggil kamu</>
            : <>Ubah cara bicara asisten</>,
        };
      case "atur_asisten":
        return { ikon: "asisten", isi: <>Ubah setelan asisten</> };
      case "ubah_pelanggan":
      case "hapus_pelanggan":
        return {
          ikon: "pelanggan",
          isi: <>{usul.jenis === "hapus_pelanggan" ? "Hapus pelanggan" : "Ubah data"} <span className="font-medium text-ink-900">{usul.kepada}</span>{usul.nomor && <span className="text-ink-400"> {usul.nomor}</span>}</>,
        };
      case "hafalkan_info":
        return { ikon: "info", isi: <>Hafalkan ulang <span className="font-medium text-ink-900">{usul.judul}</span></> };
      case "hapus_info":
        return { ikon: "info", isi: <>Hapus catatan <span className="font-medium text-ink-900">{usul.judul}</span></> };
      case "ubah_berkas":
        return { ikon: "gambar", isi: <>Ubah <span className="font-medium text-ink-900">{usul.namaLama}</span></> };
      case "baca_berkas":
        return { ikon: "gambar", isi: <>Baca isi <span className="font-medium text-ink-900">{usul.nama}</span> jadi Info bisnis</> };
      case "hapus_berkas":
        return { ikon: "gambar", isi: <>Hapus <span className="font-medium text-ink-900">{usul.nama}</span></> };
      case "atur_nomor":
        return {
          ikon: "whatsapp",
          isi: <>{usul.aksi === "matikan" ? "Matikan sementara" : usul.aksi === "nyalakan" ? "Nyalakan lagi" : "Ganti nama"} nomor <span className="font-medium text-ink-900">{usul.namaNomor}</span></>,
        };
      case "hapus_nomor":
        return { ikon: "whatsapp", isi: <>Lepas dan hapus nomor <span className="font-medium text-ink-900">{usul.namaNomor}</span></> };
      case "buka_halaman":
        return { ikon: HALAMAN_TANYA[usul.tujuan]?.ikon ?? "info", isi: <>Buka {HALAMAN_TANYA[usul.tujuan]?.label ?? "halaman"}</> };
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

  const isiBaru = mengirim ? usul.teks : "isi" in usul ? usul.isi : usul.jenis === "hapus_info" ? usul.cuplikan : "";

  // Changes that read best as "label: old → new" rows.
  const daftarData: { kunci: string; lama: string | null; baru: string | null }[] | null =
    usul.jenis === "ubah_pelanggan" ? usul.ubahan
      : usul.jenis === "ubah_berkas" ? [
          ...(usul.nama !== usul.namaLama ? [{ kunci: "nama", lama: usul.namaLama, baru: usul.nama }] : []),
          ...(usul.keterangan !== usul.keteranganLama ? [{ kunci: "keterangan", lama: usul.keteranganLama, baru: usul.keterangan }] : []),
        ]
      : usul.jenis === "atur_nomor" && usul.aksi === "ganti_nama" ? [{ kunci: "namaNomor", lama: usul.namaNomor, baru: usul.namaBaru ?? "" }]
      : null;

  // What a delete takes with it, said plainly before the owner presses.
  const peringatan =
    usul.jenis === "hapus_pelanggan" ? "Seluruh obrolan, catatan, dan janji temunya ikut terhapus. Tidak bisa dikembalikan."
      : usul.jenis === "hapus_info" ? "Asisten tidak akan memakai catatan ini lagi. Tidak bisa dikembalikan."
      : usul.jenis === "hapus_berkas" ? "Berkasnya hilang dari galeri, dan catatan hasil bacaannya ikut dihapus."
      : usul.jenis === "hapus_nomor" ? "Nomor ini keluar dari Palwise dan asisten berhenti membalas dari nomor ini. Untuk memakainya lagi harus scan QR ulang."
      : null;

  const labelUtama = mengirim ? "Kirim"
    : berbahaya ? (yakin ? "Ya, hapus" : "Hapus")
    : usul.jenis === "hafalkan_info" ? "Hafalkan"
    : usul.jenis === "baca_berkas" ? "Baca isinya"
    : usul.jenis === "atur_nomor" && usul.aksi === "matikan" ? "Matikan"
    : usul.jenis === "atur_nomor" && usul.aksi === "nyalakan" ? "Nyalakan"
    : "Simpan";
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

  // A page link, not an action: payments, email and passwords stay on their own pages.
  if (usul.jenis === "buka_halaman") {
    const halaman = HALAMAN_TANYA[usul.tujuan];
    return (
      <div className={styles.proposal}>
        <div className={styles.proposalHeading}>
          <span className={styles.proposalIcon}><Ikon nama={kepala.ikon} size={15} /></span>
          <p className={styles.proposalTitle}>{kepala.isi}</p>
        </div>
        {usul.alasan && <div className={styles.proposalBody}><p className={styles.proposalText}>{usul.alasan}</p></div>}
        {halaman && <div className={styles.proposalActions}><div className={styles.proposalButtons}>
          <Link href={halaman.href} className={`btn-primary ${styles.proposalPrimary}`}>Buka {halaman.label}<TanyaIcon nama="kanan" size={15} /></Link>
        </div></div>}
      </div>
    );
  }

  return (
    <div className={`${styles.proposal} ${berbahaya ? styles.proposalBahaya : ""}`}>
      <div className={styles.proposalHeading}>
        <span className={styles.proposalIcon}><Ikon nama={kepala.ikon} size={15} /></span>
        <p className={styles.proposalTitle}>{kepala.isi}</p>
      </div>

      <div className={styles.proposalBody}>
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
        ) : usul.jenis === "atur_asisten" ? (
          <DaftarUbahan ubahan={usul.ubahan} />
        ) : daftarData ? (
          <DaftarUbahan ubahan={daftarData} label={LABEL_DATA} format={nilaiData} />
        ) : (
          isiBaru && (
            // A message to a customer previews as a chat bubble: that is what they will receive.
            <p className={mengirim ? styles.proposalBubble : styles.proposalText} tabIndex={0}>
              {isiBaru}
            </p>
          )
        )}

        {menunggu && peringatan && (
          <p className={styles.peringatanHapus}>
            {yakin ? "Tekan Ya, hapus sekali lagi untuk memastikan. " : ""}{peringatan}
          </p>
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
        <div className={styles.proposalActions}>
          {/* Cuma untuk yang mengirim, dan mati secara bawaan. "Suruh Budi bawa
              STNK" itu titipan, bukan niat mengambil alih obrolannya selamanya.
              Kalau asisten dimatikan diam-diam, Budi bertanya lagi besok dan
              tidak ada yang menjawab. */}
          {mengirim && (
            <label className={styles.ambilAlih}>
              <input
                type="checkbox"
                checked={ambilAlih}
                onChange={(e) => setAmbilAlih(e.target.checked)}
                className="h-4 w-4 accent-brand-600"
              />
              Aku yang lanjut balas
            </label>
          )}
          <div className={styles.proposalButtons}>
            <button
              type="button"
              disabled={proses}
              onClick={() => tekan({ batal: true })}
              className={styles.proposalCancel}
            >
              Batal
            </button>
            <button
              type="button"
              disabled={proses}
              onClick={() => (berbahaya && !yakin ? setYakin(true) : tekan({ ambilAlih }))}
              className={berbahaya ? styles.tombolHapus : `btn-primary ${styles.proposalPrimary}`}
            >
              {proses ? "Sebentar" : labelUtama}
              {!proses && (berbahaya ? <TanyaIcon nama="hapus" size={15} /> : <Ikon nama={mengirim ? "kirim" : "centang"} size={15} />)}
            </button>
          </div>
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

/** Labels exactly as on the Asisten page, so a change reads the same in both places. */
const LABEL_SETELAN: Record<string, string> = {
  isActive: "Asisten sedang bekerja", rasaAktif: "Baca perasaan pelanggan", splitBubbles: "Pecah jawaban panjang",
  watak: "Nada bicara", officeHoursEnabled: "Ikut jam kerja tim", officeHoursStart: "Jam kerja mulai", officeHoursEnd: "Jam kerja selesai",
  followUpEnabled: "Follow up otomatis", followUpAfterHours: "Follow up setelah (jam)", followUpMaxAttempts: "Follow up paling banyak (kali)", followUpPrompt: "Pesan follow up",
  afterSalesEnabled: "Tanya kabar setelah beli", afterSalesAfterDays: "Tanya kabar setelah (hari)", afterSalesPrompt: "Pesan tanya kabar",
  restockEnabled: "Ajak beli lagi", restockAfterDays: "Ajak beli lagi setelah (hari)", restockPrompt: "Pesan ajak beli lagi",
  pengingatEnabled: "Pengingat janji temu", pengingatJamSebelum: "Ingatkan sebelum janji (jam)", pengingatPrompt: "Pesan pengingat janji",
};
type NilaiUbahan = string | number | boolean | null;
const nilaiSetelan = (_kunci: string, v: NilaiUbahan) => (v === true ? "Nyala" : v === false ? "Mati" : v === null ? "Kosong" : String(v));

/** Labels exactly as on the Pelanggan, Gambar and Nomor WhatsApp pages. */
const LABEL_DATA: Record<string, string> = {
  stage: "Tahap", notes: "Catatan", janjiPada: "Janji temu", janjiCatatan: "Keperluan janji", bereskanMasalah: "Keluhan",
  name: "Nama", businessName: "Nama usaha", industry: "Bidang usaha", nama: "Judul", keterangan: "Dikirim kalau", namaNomor: "Nama nomor",
};
const nilaiData = (kunci: string, v: NilaiUbahan) =>
  v === null ? (kunci === "bereskanMasalah" ? "Beres" : "Kosong")
    : kunci === "janjiPada" ? `${new Date(String(v)).toLocaleString("id-ID", { timeZone: "Asia/Jakarta", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} WIB`
    : String(v);

/** Where a "buka_halaman" card points. */
const HALAMAN_TANYA: Record<string, { href: string; label: string; ikon: React.ComponentProps<typeof Ikon>["nama"] }> = {
  tagihan: { href: "/app/tagihan", label: "Paket & pemakaian", ikon: "paket" },
  akun: { href: "/app/akun", label: "Akun", ikon: "akun" },
  whatsapp: { href: "/app/whatsapp", label: "Nomor WhatsApp", ikon: "whatsapp" },
  agent: { href: "/app/agent", label: "Asisten", ikon: "asisten" },
  knowledge: { href: "/app/knowledge", label: "Info bisnis", ikon: "info" },
  galeri: { href: "/app/galeri", label: "Gambar & berkas", ikon: "gambar" },
  kontak: { href: "/app/kontak", label: "Pelanggan", ikon: "pelanggan" },
};

/** A change as "label: old → new"; long texts stack under their label. */
function DaftarUbahan({ ubahan, label = LABEL_SETELAN, format = nilaiSetelan }: {
  ubahan: { kunci: string; lama: NilaiUbahan; baru: NilaiUbahan }[];
  label?: Record<string, string>;
  format?: (kunci: string, v: NilaiUbahan) => string;
}) {
  return <ul className={styles.settingList}>{ubahan.map((u) => {
    const panjang = typeof u.baru === "string" && u.baru.length > 30 && u.kunci !== "janjiPada";
    return <li key={u.kunci} className={panjang ? styles.settingLong : undefined}>
      <span>{label[u.kunci] ?? u.kunci}</span>
      {panjang ? <p>{String(u.baru)}</p> : <span className={styles.settingValue}><s>{format(u.kunci, u.lama)}</s><TanyaIcon nama="kanan" size={12} /><b>{format(u.kunci, u.baru)}</b></span>}
    </li>;
  })}</ul>;
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
  sibuk: boolean; terkunci: boolean; kirim: (teks: string) => void; jatah: JatahTanya | null;
  kosong: boolean; ideBuka: boolean; togelIde: () => void; pilihIde: (teks: string) => void;
  ide: IdeTanya[];
  galat: string | null; cobaLagi: () => void;
  bukaWhatsapp: () => void;
}) {
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
      {jatah?.habis && <div className={styles.quotaNotice} role="status"><span>{jatah.pesan}</span>
        {jatah.alasan === "verifikasi" ? <Link href="/app/akun">Verifikasi email</Link> : jatah.alasan === "bulanan" && jatah.paket !== "pro" ? <Link href="/app/tagihan">Lihat paket</Link> : null}
      </div>}
      {(kosong || ideBuka) && ide.length > 0 && <div id="ide-tanya" className={styles.suggestions} aria-label="Saran untuk bisnismu">
        {ide.map(c => <button key={c.judul} type="button" onClick={() => pilihIde(c.pesan)} className={styles.suggestion} title={c.pesan}>
          <span className={styles.suggestionIcon}><Ikon nama={c.ikon} size={17} /></span><span><strong>{c.judul}</strong></span>
        </button>)}
      </div>}
      {ideBuka && <div className={styles.suggestions} aria-label="Bantuan bisnis">
        {BANTUAN_BISNIS.map(f => <button key={f.judul} type="button" className={styles.suggestion} title={f.detail} onClick={() => pilihIde(f.pesan)}><TanyaIcon nama="analisis" size={17} /><strong>{f.judul}</strong></button>)}
      </div>}
      <form onSubmit={e => { e.preventDefault(); kirim(draft); }} className={styles.composer}>
        <textarea data-fokus-tenang ref={isianRef} rows={1} maxLength={2000} value={draft} onChange={e => setDraft(e.target.value)}
          onKeyDown={e => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing && window.matchMedia("(hover: hover) and (pointer: fine)").matches) { e.preventDefault(); kirim(draft); }
          }} placeholder={sibuk ? "Tulis pertanyaan berikutnya..." : "Minta apa saja ke Palwise AI"}
          className={styles.textarea} aria-label="Pesan untuk Palwise" />
        <div className={styles.composerToolbar}>
          <button type="button" onClick={togelIde} className={styles.ideaButton} title="Saran untuk bisnismu" aria-label="Saran untuk bisnismu" aria-expanded={ideBuka} aria-controls="ide-tanya"><TanyaIcon nama="ide" size={18} /></button>
          <button type="button" onClick={bukaWhatsapp} className={styles.ideaButton} title="Sambungkan WhatsApp" aria-label="Sambungkan WhatsApp di chat"><Ikon nama="whatsapp" size={19} /></button>
          {jatah && <KuotaTanya jatah={jatah} />}
          <button type="submit" disabled={terkunci || !draft.trim()} className={styles.send} aria-label="Kirim pesan" title="Kirim pesan">
            {sibuk ? <span className="titik-ketik inline-flex items-center gap-[3px]" aria-hidden="true"><span /><span /><span /></span> : <TanyaIcon nama="atas" size={21} />}
          </button>
        </div>
      </form>
      <div className={styles.composerHint}>
        <span>Draf diperiksa sebelum dikirim.</span>
        {!kosong && <span className={styles.keyboardHint}>Enter kirim · Shift + Enter baris baru</span>}
      </div>
    </div>
  </div>;
}

function KuotaTanya({ jatah }: { jatah: JatahTanya }) {
  const ref = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    const outside = (event: PointerEvent) => { if (!ref.current?.contains(event.target as Node)) ref.current?.removeAttribute("open"); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape" && ref.current?.open) { ref.current.open = false; ref.current.querySelector("summary")?.focus(); } };
    document.addEventListener("pointerdown", outside); document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", escape); };
  }, []);
  const tanggal = new Date(jatah.resetBulanan).toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta", day: "numeric", month: "long" });
  return <details ref={ref} className={styles.quotaDetails}>
    <summary aria-label={`Sisa ${jatah.sisa} pertanyaan AI. Lihat kuota Tanya`} title="Kuota Tanya">{jatah.sisa} AI</summary>
    <div className={styles.quotaPopover}>
      <strong>Tanya · {jatah.namaPaket}</strong>
      <p>{jatah.terpakai} / {jatah.batas} pertanyaan {jatah.belumKonfirmasi ? "percobaan" : "bulan ini"}</p>
      <p>{Math.min(jatah.harian.sisa, jatah.sisa)} tersedia hari ini.</p>
      <p>{jatah.belumKonfirmasi ? "Verifikasi email untuk kuota bulanan." : `Kuota bulanan terisi ${tanggal}, 00.00 WIB.`}</p>
      <p>Kuota bersama satu bisnis, terpisah dari balasan WhatsApp. QR, riwayat, dan pengecekan tanpa AI tidak memakai kuota.</p>
      <Link href={jatah.belumKonfirmasi ? "/app/akun" : "/app/tagihan"}>{jatah.belumKonfirmasi ? "Verifikasi email" : "Lihat paket"}</Link>
    </div>
  </details>;
}
