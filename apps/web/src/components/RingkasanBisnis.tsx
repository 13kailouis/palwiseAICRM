"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import type { PusatBisnis } from "@palwise/db";
import { TanyaIcon } from "./TanyaIcon";
import { Ikon, type NamaIkon } from "./Ikon";
import { BANTUAN_BISNIS } from "./bantuanBisnis";
import styles from "./RingkasanBisnis.module.css";

export const tanyaBisnis = (pesan: string) => `/app/tanya?q=${encodeURIComponent(pesan)}`;
const angka = (n: number) => n.toLocaleString("id-ID");
const waktu = (s: string) => new Date(s).toLocaleString("id-ID", { timeZone: "Asia/Jakarta", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const jam = (s: string) => new Date(s).toLocaleTimeString("id-ID", { timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit" });
const tabs = ["prioritas", "peluang", "janji"] as const;
type Tab = typeof tabs[number];
const labelTab = { prioritas: "Perhatian", peluang: "Peluang", janji: "Janji" };
const ikonBantuan: NamaIkon[] = ["kalender", "pelanggan", "ringkasan", "catat"];

export function RingkasanBisnis({ awal }: { awal: PusatBisnis }) {
  const [data, setData] = useState(awal);
  const [tab, setTab] = useState<Tab>("prioritas");
  const [semua, setSemua] = useState(false);
  const [memuat, setMemuat] = useState(false);
  const [galat, setGalat] = useState("");
  const urutan = useRef(0);
  function pilihTab(t: Tab) { setTab(t); setSemua(false); }
  async function muat(hari: 7 | 30) {
    const id = ++urutan.current;
    setMemuat(true); setGalat("");
    try {
      const res = await fetch(`/api/ringkasan?hari=${hari}`, { cache: "no-store" });
      if (!res.ok) throw new Error("Belum bisa memperbarui. Data sebelumnya tetap ditampilkan.");
      const baru: PusatBisnis = await res.json();
      if (id === urutan.current) setData(baru);
    } catch (e) { if (id === urutan.current) setGalat(e instanceof Error ? e.message : "Koneksi bermasalah. Coba lagi."); }
    finally { if (id === urutan.current) setMemuat(false); }
  }
  const metrik = [
    { label: "Pelanggan aktif", kunci: "aktif", href: "/app/inbox", ikon: "pelanggan" },
    { label: "Pelanggan baru", kunci: "baru", href: "/app/kontak", ikon: "sapa" },
    { label: "Pesan masuk", kunci: "pesan", href: "/app/inbox", ikon: "chat" },
    { label: "Klaim bayar", kunci: "klaim", href: "/app/kontak?stage=klaim-bayar", ikon: "paket" },
  ] as const;
  const jumlah = { prioritas: data.jumlahPrioritas, peluang: data.jumlahPeluang, janji: data.jumlahJanji };
  const max = Math.max(1, ...data.tahap.map(t => t.jumlah));
  const bentrok = new Set(data.janji.filter(j => data.janji.some(k => k.id !== j.id && Math.abs(new Date(k.waktu).getTime() - new Date(j.waktu).getTime()) < 30 * 60_000)).map(j => j.id));
  const total = data.tahap.reduce((s, t) => s + t.jumlah, 0);
  const belumSiap = !data.info || !data.caraBicara || !data.kanal.length;
  const terputus = !data.kanal.length || data.kanal.some(k => k.status !== "connected");
  const batasTampil = semua ? 8 : 4;
  const tampil = Math.min(data[tab].length, batasTampil);

  return <div className={styles.page}>
    <header className={styles.header}>
      <div className={styles.heading}><h1>Ringkasan</h1><p>{data.usaha}</p></div>
      <Link className={styles.primary} href="/app/tanya"><TanyaIcon nama="chat" size={18} /><span>Tanya Palwise</span></Link>
    </header>
    <section aria-label="Angka bisnis">
      <div className={styles.toolbar}>
        <div className={styles.period} aria-label="Periode ringkasan">{([7, 30] as const).map(n => <button key={n} aria-pressed={data.hari === n} disabled={memuat} onClick={() => void muat(n)}>{n} hari</button>)}</div>
        <div className={styles.sync}>
          <span className={styles.updated} role="status" title={`Diperbarui ${waktu(data.diperbarui)} WIB`}>{memuat ? "Memperbarui…" : <><span className={styles.updatedLabel}>Diperbarui </span>{jam(data.diperbarui)} WIB</>}</span>
          <button className={`${styles.iconButton} ${memuat ? styles.refreshing : ""}`} disabled={memuat} onClick={() => void muat(data.hari)} aria-label="Perbarui ringkasan" title="Perbarui ringkasan"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M20 7a9 9 0 1 0 1 9M20 3v5h-5" /></svg></button>
        </div>
      </div>
      {galat && <div role="alert" className={styles.error}>{galat} <button onClick={() => void muat(data.hari)}>Coba lagi</button></div>}
      <div className={styles.metrics} aria-busy={memuat}>{metrik.map(m => {
        const selisih = data.kini[m.kunci] - data.lalu[m.kunci];
        const perubahan = selisih === 0 ? "Tetap" : `${selisih > 0 ? "+" : ""}${angka(selisih)}`;
        return <Link href={m.href} key={m.kunci} className={styles.metric} aria-label={`${m.label}: ${angka(data.kini[m.kunci])}. ${perubahan} dibanding ${data.hari} hari sebelumnya.${m.kunci === "klaim" ? " Belum diverifikasi." : ""}`}>
          <span className={styles.metricLabel}><Ikon nama={m.ikon} size={16} />{m.label}</span>
          <div className={styles.metricValue}><strong>{angka(data.kini[m.kunci])}</strong><small title={`Dibanding ${data.hari} hari sebelumnya`}>{selisih !== 0 && <TanyaIcon nama={selisih > 0 ? "atas" : "bawah"} size={12} />}{perubahan}</small></div>
          {m.kunci === "klaim" && <span className={styles.unverified}>Belum diverifikasi</span>}
        </Link>;
      })}</div>
    </section>
    {(terputus || belumSiap) && <div className={styles.notices}>
      {terputus && <Link href={tanyaBisnis("Periksa status WhatsApp dan tampilkan kartu untuk menyambungkannya jika terputus.")} className={styles.notice}><Ikon nama="whatsapp" size={20} /><span><b>Periksa WhatsApp</b><small>Data terbaru mungkin belum masuk.</small></span><TanyaIcon nama="kanan" size={18} /></Link>}
      {belumSiap && <Link className={styles.notice} href="/app/mulai"><Ikon nama="asisten" size={20} /><span><b>Lengkapi asisten</b></span><TanyaIcon nama="kanan" size={18} /></Link>}
    </div>}
    <div className={styles.workspace}>
      <div className={styles.stack}>
      <section className={styles.work} aria-label="Pekerjaan bisnis">
        <div className={styles.sectionHeading}><h2>Fokus hari ini</h2><Link className={styles.iconButton} href="/app/inbox" aria-label="Buka kotak masuk" title="Buka kotak masuk"><TanyaIcon nama="kanan" size={18} /></Link></div>
        <div className={styles.tabs} role="tablist" aria-label="Fokus hari ini">{tabs.map(t => <button key={t} id={`tab-${t}`} role="tab" aria-selected={tab === t} aria-controls="panel-fokus" tabIndex={tab === t ? 0 : -1} onClick={() => pilihTab(t)} onKeyDown={e => {
          if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
          e.preventDefault(); const i = e.key === "Home" ? 0 : e.key === "End" ? 2 : (tabs.indexOf(t) + (e.key === "ArrowRight" ? 1 : 2)) % 3;
          pilihTab(tabs[i]); document.getElementById(`tab-${tabs[i]}`)?.focus();
        }}>{labelTab[t]}<span>{angka(jumlah[t])}</span></button>)}</div>
        <div id="panel-fokus" role="tabpanel" tabIndex={0} aria-labelledby={`tab-${tab}`}>
          {!jumlah[tab] && <div className={styles.empty}><span className={styles.emptyIcon}><Ikon nama={tab === "janji" ? "kalender" : tab === "peluang" ? "pelanggan" : "centang"} size={24} /></span><h3>{tab === "prioritas" ? "Tidak ada yang perlu ditangani" : tab === "peluang" ? "Belum ada peluang" : "Belum ada janji"}</h3><p>{tab === "prioritas" ? "Belum ada obrolan yang ditandai perlu perhatian." : tab === "peluang" ? "Prospek yang perlu ditinjau akan muncul di sini." : "Jadwal pelanggan akan muncul di sini."}</p></div>}
          {tab !== "janji" ? data[tab].slice(0, batasTampil).map(c => <div className={styles.row} key={`${tab}-${c.id}`}>
            <Link className={styles.avatar} href={`/app/inbox?c=${c.id}`} aria-label={`Buka obrolan ${c.nama}`}>{c.nama.slice(0, 1).toUpperCase()}</Link>
            <div className={styles.person}>
              <Link className={styles.personName} href={`/app/inbox?c=${c.id}`}>{c.nama}</Link>
              <details className={styles.reason}><summary aria-label={`Alasan ${c.nama}: ${c.alasan}`}><span>{c.alasan}</span><TanyaIcon nama="bawah" size={12} /></summary><p>{c.alasan}</p></details>
            </div>
            <Link className={styles.rowAction} aria-label={`Siapkan draf ${tab === "prioritas" ? "balasan" : "follow up"} untuk ${c.nama}`} title={`Siapkan draf untuk ${c.nama}`} href={tanyaBisnis(`Siapkan draf ${tab === "prioritas" ? "balasan" : "follow up"} untuk ${JSON.stringify(c.nama)}${c.nomor ? ` (nomor ${c.nomor})` : ""}. Baca obrolan terakhir dulu dan sesuaikan dengan kebutuhan pelanggan.`)}><TanyaIcon nama="baru" size={17} /><span>Bantu balas</span></Link>
          </div>) : data.janji.slice(0, batasTampil).map(j => <Link className={styles.row} key={j.id} href={`/app/kontak/${j.id}`}>
            <span className={styles.avatar}><Ikon nama="kalender" size={18} /></span><div className={styles.appointment}><b>{j.nama}</b><time dateTime={j.waktu}>{waktu(j.waktu)} WIB</time>{j.catatan && <small>{j.catatan}</small>}</div><span className={styles.badge}>{bentrok.has(j.id) ? "Jam bentrok" : j.dipastikan ? "Dipastikan" : "Konfirmasi"}</span>
          </Link>)}
          {data[tab].length > 4 && <button className={styles.showMore} aria-expanded={semua} onClick={() => setSemua(!semua)}>{semua ? "Tampilkan lebih sedikit" : "Lihat lainnya"}<TanyaIcon nama={semua ? "atas" : "bawah"} size={14} /></button>}
          {jumlah[tab] > tampil && <Link className={styles.showMore} href={tab === "janji" ? "/app/kontak?stage=janji" : "/app/inbox"}>Menampilkan {angka(tampil)} dari {angka(jumlah[tab])} · Lihat semua<TanyaIcon nama="kanan" size={14} /></Link>}
        </div>
      </section>
      <section className={styles.recentCard}>
        <div className={styles.sectionHeading}><h2>Chat terbaru</h2><Link href="/app/inbox" className={styles.textLink}>Lihat semua<TanyaIcon nama="kanan" size={14} /></Link></div>
        {data.terbaru.length ? data.terbaru.slice(0, 4).map(c => <Link href={`/app/inbox?c=${c.id}`} key={c.id} className={styles.recent}><span className={styles.avatar}>{c.nama.slice(0, 1).toUpperCase()}</span><span className={styles.recentText}><b>{c.nama}</b><small>{c.peran === "customer" ? "" : c.peran ? "Tim: " : ""}{c.cuplikan || "Belum ada pesan"}</small></span><time dateTime={c.waktu} title={`${waktu(c.waktu)} WIB`}>{new Date(c.waktu).toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta", day: "numeric", month: "short" })}</time></Link>) : <p className={styles.emptySmall}>{terputus ? "Sambungkan WhatsApp untuk menerima chat." : "Chat pelanggan akan muncul di sini."}</p>}
      </section>
      </div>
      <div className={styles.stack}>
      <aside className={styles.assistant} aria-label="Bantuan Palwise">
        <div className={styles.sectionHeading}><h2>Bantu kerjakan</h2><TanyaIcon nama="ide" size={19} /></div>
        <div className={styles.quickActions}>{BANTUAN_BISNIS.map((f, i) => <Link key={f.judul} href={tanyaBisnis(f.pesan)} className={styles.feature} title={f.detail}><Ikon nama={ikonBantuan[i]} size={21} /><b>{f.judul}</b><TanyaIcon nama="kanan" size={15} /></Link>)}</div>
      </aside>
      <section className={styles.pipelineCard}>
        <div className={styles.sectionHeading}><h2>Tahap pelanggan</h2><Link href="/app/kontak" className={styles.total} aria-label={`Lihat ${angka(total)} pelanggan`}>{angka(total)}<TanyaIcon nama="kanan" size={14} /></Link></div>
        {total ? <div className={styles.pipeline}>{["baru", "tertarik", "negosiasi", "closing", "selesai", "batal"].map(t => { const n = data.tahap.find(x => x.nama === t)?.jumlah || 0; return <Link key={t} href={`/app/kontak?stage=${t}`}><span>{t}</span><span className={styles.track} aria-hidden="true"><i style={{ width: `${n / max * 100}%` }} /></span><b>{angka(n)}</b></Link>; })}</div> : <p className={styles.emptySmall}>Belum ada pelanggan tercatat.</p>}
      </section>
      </div>
    </div>
    <div className={styles.footer}>
      <details className={styles.status}><summary>Paket & asisten<span>{data.paket}<TanyaIcon nama="bawah" size={14} /></span></summary><div>
        <p>{angka(data.balasan.terpakai)} / {angka(data.balasan.batas)} balasan WhatsApp terpakai. Reset {waktu(data.resetBalasan)} WIB. <Link href="/app/tagihan">Kelola paket</Link></p>
        <p>{data.info} info bisnis siap. <Link href="/app/knowledge">Kelola info bisnis</Link></p>
        <p>Status tercatat: {data.kanal.map(k => `${k.name}: ${k.status === "connected" ? "tersambung" : "belum tersambung"}`).join("; ") || "belum ada nomor"}. <Link href={tanyaBisnis("Apa WhatsApp saya masih tersambung?")}>Periksa sekarang</Link></p>
        <Link href="/panduan">Panduan penggunaan</Link>
      </div></details>
      <details className={styles.status}><summary>Tentang data<TanyaIcon nama="bawah" size={14} /></summary><div>
        <p>Data tercatat, diperbarui {waktu(data.diperbarui)} WIB. Angka dibandingkan dengan {data.hari} hari sebelumnya. Pelanggan aktif adalah pelanggan yang chat dalam periode ini.</p>
        <p>Klaim bayar belum diverifikasi. Tahap selesai bukan bukti pembayaran.</p>
        <p>Fokus dan tahap pelanggan menunjukkan keadaan saat ini. Peluang berasal dari prospek tanpa aktivitas 1–30 hari. Janji mulai hari ini, termasuk jadwal yang sudah lewat; waktu dalam WIB.</p>
        <p>Bantuan dibuka sebagai draf permintaan di Tanya. AI bekerja setelah kamu kirim.</p>
      </div></details>
    </div>
  </div>;
}
