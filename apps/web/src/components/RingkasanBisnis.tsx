"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import type { PusatBisnis } from "@palwise/db";
import { TanyaIcon } from "./TanyaIcon";
import { BANTUAN_BISNIS } from "./bantuanBisnis";
import styles from "./RingkasanBisnis.module.css";

export const tanyaBisnis = (pesan: string) => `/app/tanya?q=${encodeURIComponent(pesan)}`;
const angka = (n: number) => n.toLocaleString("id-ID");
const waktu = (s: string) => new Date(s).toLocaleString("id-ID", { timeZone: "Asia/Jakarta", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });


export function RingkasanBisnis({ awal }: { awal: PusatBisnis }) {
  const [data, setData] = useState(awal);
  const [tab, setTab] = useState<"prioritas" | "peluang" | "janji">("prioritas");
  const [memuat, setMemuat] = useState(false);
  const [galat, setGalat] = useState("");
  const urutan = useRef(0);
  async function muat(hari: 7 | 30) {
    const id = ++urutan.current;
    setMemuat(true); setGalat("");
    try {
      const res = await fetch(`/api/ringkasan?hari=${hari}`, { cache: "no-store" });
      if (!res.ok) throw new Error("Ringkasan belum bisa diperbarui. Data sebelumnya tetap ditampilkan.");
      const baru: PusatBisnis = await res.json();
      if (id === urutan.current) setData(baru);
    } catch (e) { if (id === urutan.current) setGalat(e instanceof Error ? e.message : "Koneksi bermasalah. Coba lagi."); }
    finally { if (id === urutan.current) setMemuat(false); }
  }
  const metrik = [
    { label: "Pelanggan yang chat", kunci: "aktif", href: "/app/inbox" },
    { label: "Pelanggan baru", kunci: "baru", href: "/app/kontak" },
    { label: "Pesan masuk", kunci: "pesan", href: "/app/inbox" },
    { label: "Mengaku sudah bayar", kunci: "klaim", href: "/app/kontak?stage=klaim-bayar" },
  ] as const;
  const jumlah = { prioritas: data.jumlahPrioritas, peluang: data.jumlahPeluang, janji: data.jumlahJanji };
  const labelTab = { prioritas: "Perlu perhatian", peluang: "Peluang", janji: "Janji" };
  const max = Math.max(1, ...data.tahap.map(t => t.jumlah));
  const total = data.tahap.reduce((s, t) => s + t.jumlah, 0);
  const belumSiap = !data.info || !data.caraBicara || !data.kanal.length;
  return <div className={styles.page}>
    <header className={styles.header}>
      <div><p className={styles.eyebrow}>{data.usaha}</p><h1>Ringkasan</h1></div>
      <Link className={styles.primary} href="/app/tanya"><TanyaIcon nama="chat" size={18} /> Tanya Palwise</Link>
    </header>
    <div className={styles.toolbar}>
      <div className={styles.period} aria-label="Periode ringkasan">{([7, 30] as const).map(n => <button key={n} aria-pressed={data.hari === n} disabled={memuat} onClick={() => void muat(n)}>{n} hari</button>)}</div>
      <span className={styles.updated}>{memuat ? "Memperbarui…" : `Diperbarui ${waktu(data.diperbarui)} WIB`}</span>
      <button className={styles.refresh} disabled={memuat} onClick={() => void muat(data.hari)} aria-label="Perbarui ringkasan" title="Perbarui ringkasan"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M20 7a9 9 0 1 0 1 9M20 3v5h-5" /></svg></button>
    </div>
    {galat && <div role="alert" className={styles.error}>{galat} <button onClick={() => void muat(data.hari)}>Coba lagi</button></div>}
    <div className={styles.metrics} aria-busy={memuat}>{metrik.map(m => {
      const selisih = data.kini[m.kunci] - data.lalu[m.kunci];
      return <Link href={m.href} key={m.kunci} className={styles.metric} title={`Buka ${m.kunci === "klaim" ? "klaim pembayaran" : "data terkait"}; angka ringkasan untuk ${data.hari} hari`}>
        <span>{m.label}</span><strong>{angka(data.kini[m.kunci])}</strong><small>{selisih > 0 ? "+" : ""}{angka(selisih)} <span>dari periode sebelumnya</span></small>
      </Link>;
    })}</div>
    <p className={styles.note}>Data tercatat · hari WIB · dibanding durasi yang sama. Klaim bayar perlu kamu verifikasi.</p>
    {data.kanal.some(k => k.status !== "connected") || !data.kanal.length ? <Link href={tanyaBisnis("Periksa status WhatsApp dan tampilkan kartu untuk menyambungkannya jika terputus.")} className={styles.notice}><span>WhatsApp belum sepenuhnya tersambung. Data terbaru mungkin belum masuk.</span><b>Periksa <span aria-hidden="true">↗</span></b></Link> : null}
    {belumSiap && <Link className={styles.notice} href="/app/mulai"><span>Lengkapi asisten agar bisa membantu sesuai bisnismu.</span><b>Siapkan <span aria-hidden="true">↗</span></b></Link>}
    <div className={styles.columns}>
      <section className={styles.work} aria-label="Pekerjaan bisnis">
        <div className={styles.sectionHeading}><h2>Fokus hari ini</h2><span>Keadaan saat ini</span></div>
        <div className={styles.tabs} role="tablist" aria-label="Fokus hari ini">{(["prioritas", "peluang", "janji"] as const).map(t => <button key={t} id={`tab-${t}`} role="tab" aria-selected={tab === t} aria-controls="panel-fokus" tabIndex={tab === t ? 0 : -1} onClick={() => setTab(t)} onKeyDown={e => {
          const keys = ["prioritas", "peluang", "janji"] as const;
          if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
          e.preventDefault(); const i = e.key === "Home" ? 0 : e.key === "End" ? 2 : (keys.indexOf(t) + (e.key === "ArrowRight" ? 1 : 2)) % 3;
          setTab(keys[i]); document.getElementById(`tab-${keys[i]}`)?.focus();
        }}>{labelTab[t]} <span>{angka(jumlah[t])}</span></button>)}</div>
        <div id="panel-fokus" role="tabpanel" aria-labelledby={`tab-${tab}`}>
          <p className={styles.explanation}>{tab === "prioritas" ? "Keluhan dan obrolan yang membutuhkan tim." : tab === "peluang" ? "Prospek tanpa aktivitas 1–30 hari. Cek konteks sebelum menghubungi." : "Mulai hari ini, termasuk jadwal yang sudah lewat hari ini. Waktu WIB."}</p>
          {!jumlah[tab] && <div className={styles.empty}><TanyaIcon nama="centang" size={25} /><h3>{tab === "prioritas" ? "Belum ada yang perlu ditangani" : tab === "peluang" ? "Belum ada peluang yang sesuai" : "Belum ada janji tercatat"}</h3><p>{tab === "prioritas" ? "Cek peluang atau gunakan waktu ini untuk merencanakan langkah berikutnya." : tab === "peluang" ? "Pelanggan tertarik akan muncul di sini saat sudah waktunya ditinjau kembali." : "Permintaan jadwal dari pelanggan muncul di sini untuk kamu pastikan."}</p></div>}
          {tab !== "janji" ? data[tab].map(c => <div className={styles.row} key={c.id}>
            <Link className={styles.person} href={`/app/inbox?c=${c.id}`}><span className={styles.avatar}>{c.nama.slice(0, 1).toUpperCase()}</span><span><b>{c.nama}</b><small>{c.alasan}</small></span></Link>
            <Link className={styles.rowAction} href={tanyaBisnis(`Siapkan draf ${tab === "prioritas" ? "balasan" : "follow up"} untuk ${JSON.stringify(c.nama)}${c.nomor ? ` (nomor ${c.nomor})` : ""}. Baca obrolan terakhir dulu dan sesuaikan dengan kebutuhan pelanggan.`)}>Bantu balas <TanyaIcon nama="kanan" size={16} /></Link>
          </div>) : data.janji.map(j => <Link className={styles.row} key={j.id} href={`/app/kontak/${j.id}`}><div className={styles.appointment}><b>{j.nama}</b><small>{waktu(j.waktu)} WIB · {j.catatan || "Tanpa catatan"}</small></div><span className={styles.badge}>{j.dipastikan ? "Dipastikan" : "Perlu dipastikan"}</span></Link>)}
          {jumlah[tab] > 8 && <p className={styles.explanation}>Menampilkan 8 dari {angka(jumlah[tab])}. <Link href={tab === "janji" ? "/app/kontak?stage=janji" : "/app/inbox"}>Lihat semua →</Link></p>}
        </div>
      </section>
      <aside className={styles.assistant}>
        <div className={styles.sectionHeading}><h2>Kerjakan bersama AI</h2><TanyaIcon nama="ide" /></div>
        {BANTUAN_BISNIS.map(f => <Link key={f.judul} href={tanyaBisnis(f.pesan)} className={styles.feature}><span><b>{f.judul}</b><small>{f.detail}</small></span><TanyaIcon nama="kanan" size={18} /></Link>)}
        <p className={styles.note}>Permintaan dibuka di Tanya untuk kamu tinjau. AI mulai bekerja setelah kamu kirim.</p>
      </aside>
    </div>
    <div className={styles.columns}>
      <section className={styles.card}>
        <div className={styles.sectionHeading}><h2>Perjalanan pelanggan</h2><Link href="/app/kontak">{angka(total)} pelanggan ↗</Link></div>
        {total ? <div className={styles.pipeline}>{["baru", "tertarik", "negosiasi", "closing", "selesai", "batal"].map(t => { const n = data.tahap.find(x => x.nama === t)?.jumlah || 0; return <Link key={t} href={`/app/kontak?stage=${t}`}><span>{t}</span><span className={styles.track}><i style={{ width: `${n / max * 100}%` }} /></span><b>{angka(n)}</b></Link>; })}</div> : <p className={styles.explanation}>Tahap pelanggan akan terlihat setelah ada pelanggan tercatat.</p>}
        <p className={styles.note}>Posisi saat ini. Tahap selesai bukan bukti pembayaran.</p>
      </section>
      <section className={styles.card}>
        <div className={styles.sectionHeading}><h2>Obrolan terbaru</h2><Link href="/app/inbox">Kotak masuk ↗</Link></div>
        {data.terbaru.length ? data.terbaru.map(c => <Link href={`/app/inbox?c=${c.id}`} key={c.id} className={styles.recent}><span><b>{c.nama}</b><small>{c.peran === "customer" ? "" : c.peran ? "Tim: " : ""}{c.cuplikan}</small></span><time dateTime={c.waktu}>{waktu(c.waktu)}</time></Link>) : <p className={styles.explanation}>Belum ada obrolan pelanggan. Sambungkan WhatsApp untuk mulai menerima chat.</p>}
      </section>
    </div>
    <details className={styles.status}><summary>Paket & kesiapan <span>{data.paket}</span></summary><div>
      <p>{angka(data.balasan.terpakai)} / {angka(data.balasan.batas)} balasan WhatsApp terpakai. <Link href="/app/tagihan">Kelola paket ↗</Link></p>
      <p>{data.info} info bisnis siap digunakan. <Link href="/app/knowledge">Kelola info bisnis ↗</Link></p>
      <p><Link href="/panduan">Buka panduan penggunaan ↗</Link></p>
      <p>Status terakhir tercatat: {data.kanal.map(k => `${k.name} — ${k.status === "connected" ? "tersambung" : "belum tersambung"}`).join("; ") || "belum ada nomor"}. <Link href={tanyaBisnis("Apa WhatsApp saya masih tersambung?")}>Periksa sekarang ↗</Link></p>
    </div></details>
  </div>;
}
