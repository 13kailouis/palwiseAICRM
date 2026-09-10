"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { PusatBisnis } from "@palwise/db";
import { TanyaIcon } from "./TanyaIcon";
import { Ikon, type NamaIkon } from "./Ikon";
import { InfoTip } from "./InfoTip";
import { Avatar } from "./ui";
import { BANTUAN_BISNIS } from "./bantuanBisnis";
import styles from "./RingkasanBisnis.module.css";

export const tanyaBisnis = (pesan: string) => `/app/tanya?q=${encodeURIComponent(pesan)}`;
const WIB = "Asia/Jakarta";
const angka = (n: number) => n.toLocaleString("id-ID");
const waktu = (s: string) => new Date(s).toLocaleString("id-ID", { timeZone: WIB, day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const jam = (s: string) => new Date(s).toLocaleTimeString("id-ID", { timeZone: WIB, hour: "2-digit", minute: "2-digit" });
const tanggal = (s: string) => new Date(s).toLocaleDateString("id-ID", { timeZone: WIB, day: "numeric", month: "short" });
// Measured against the brief's own timestamp, so server and client render the same text.
function berlalu(s: string, kini: string) {
  const menit = Math.max(0, Math.round((Date.parse(kini) - Date.parse(s)) / 60_000));
  if (menit < 1) return "baru";
  if (menit < 60) return `${menit} mnt`;
  if (menit < 1440) return `${Math.floor(menit / 60)} jam`;
  return tanggal(s);
}

const tabs = ["prioritas", "peluang", "janji", "terbaru"] as const;
type Tab = typeof tabs[number];
const labelTab: Record<Tab, string> = { prioritas: "Perhatian", peluang: "Peluang", janji: "Janji", terbaru: "Terbaru" };
const hitungTab = (d: PusatBisnis): Record<Tab, number> => ({ prioritas: d.jumlahPrioritas, peluang: d.jumlahPeluang, janji: d.jumlahJanji, terbaru: d.terbaru.length });
const ikonBantuan: NamaIkon[] = ["kalender", "pelanggan", "ringkasan", "info"];
const TAHAP = [
  { nama: "baru", warna: "#d4d4d4" },
  { nama: "tertarik", warna: "#9aa0a6" },
  { nama: "negosiasi", warna: "#6b7075" },
  { nama: "closing", warna: "#404346" },
  { nama: "selesai", warna: "#171717" },
  { nama: "batal", warna: "#e8b4b4" },
];
const contohTanya = ["Tanya Palwise", "Siapa yang perlu dibalas dulu?", "Ada peluang follow up?", "Ringkas kondisi minggu ini"];

export function RingkasanBisnis({ awal }: { awal: PusatBisnis }) {
  const [data, setData] = useState(awal);
  // Open on the first list that has something in it, so the owner lands on work, not on an empty tab.
  const [tab, setTab] = useState<Tab>(() => tabs.find(t => hitungTab(awal)[t] > 0) ?? "prioritas");
  const [semua, setSemua] = useState(false);
  const [memuat, setMemuat] = useState(false);
  const [galat, setGalat] = useState("");
  const [sorot, setSorot] = useState<string | null>(null);
  const [contoh, setContoh] = useState(0);
  const urutan = useRef(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setContoh(i => (i + 1) % contohTanya.length), 3600);
    return () => clearInterval(t);
  }, []);

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
    { label: "Pelanggan chat", kunci: "aktif", href: "/app/inbox", ikon: "pelanggan" },
    { label: "Pelanggan baru", kunci: "baru", href: "/app/kontak", ikon: "sapa" },
    { label: "Pesan masuk", kunci: "pesan", href: "/app/inbox", ikon: "chat" },
    { label: "Klaim bayar", kunci: "klaim", href: "/app/kontak?stage=klaim-bayar", ikon: "paket" },
  ] as const;
  const jumlah = hitungTab(data);
  const bentrok = new Set(data.janji.filter(j => data.janji.some(k => k.id !== j.id && Math.abs(new Date(k.waktu).getTime() - new Date(j.waktu).getTime()) < 30 * 60_000)).map(j => j.id));
  const perTahap = (nama: string) => data.tahap.find(x => x.nama === nama)?.jumlah || 0;
  const total = data.tahap.reduce((s, t) => s + t.jumlah, 0);
  const belumSiap = !data.info || !data.caraBicara || !data.kanal.length;
  const terputus = !data.kanal.length || data.kanal.some(k => k.status !== "connected");
  const batasTampil = semua ? 8 : 4;
  const tampil = Math.min(data[tab].length, batasTampil);
  const persenJatah = Math.min(100, Math.round(data.balasan.terpakai / Math.max(1, data.balasan.batas) * 100));

  return <div className={styles.page}>
    <header className={styles.header}>
      <div className={styles.heading}><h1>Ringkasan</h1><p>{data.usaha}</p></div>
      <div className={styles.controls}>
        <div className={styles.period} role="group" aria-label="Periode ringkasan">{([7, 30] as const).map(n => <button key={n} type="button" aria-pressed={data.hari === n} disabled={memuat} onClick={() => { if (data.hari !== n) void muat(n); }}>{n} hari</button>)}</div>
        <span className={styles.info}><InfoTip label="Tentang angka ini" judul="Tentang angka ini">Dibanding {data.hari} hari sebelumnya, hari dihitung WIB. Klaim bayar belum kamu cek. Diperbarui {waktu(data.diperbarui)} WIB.</InfoTip></span>
        <button type="button" className={`${styles.iconBtn} ${memuat ? styles.spin : ""}`} disabled={memuat} onClick={() => void muat(data.hari)} aria-label={`Perbarui. Terakhir ${jam(data.diperbarui)} WIB`} title={`Diperbarui ${waktu(data.diperbarui)} WIB`}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 7a9 9 0 1 0 1 9M20 3v5h-5" /></svg></button>
      </div>
    </header>

    {galat && <div role="alert" className={styles.error}>{galat} <button type="button" onClick={() => void muat(data.hari)}>Coba lagi</button></div>}

    {(terputus || belumSiap) && <div className={styles.alerts}>
      {terputus && <Link href={tanyaBisnis("Periksa status WhatsApp dan tampilkan kartu untuk menyambungkannya jika terputus.")} className={styles.alert}><i aria-hidden="true" />{data.kanal.length ? "WhatsApp belum tersambung" : "Sambungkan WhatsApp"}<TanyaIcon nama="kanan" size={15} /></Link>}
      {belumSiap && <Link className={styles.alert} href="/app/mulai"><i aria-hidden="true" />Lengkapi asisten<TanyaIcon nama="kanan" size={15} /></Link>}
    </div>}

    <section aria-label="Angka bisnis" className={styles.metrics} aria-busy={memuat}>{metrik.map(m => {
      const nilai = data.kini[m.kunci];
      const selisih = nilai - data.lalu[m.kunci];
      const perubahan = selisih === 0 ? "tetap" : `${selisih > 0 ? "+" : ""}${angka(selisih)}`;
      return <Link href={m.href} key={m.kunci} className={styles.metric} aria-label={`${m.label}: ${angka(nilai)}. ${perubahan} dibanding ${data.hari} hari sebelumnya.${m.kunci === "klaim" ? " Belum dicek." : ""}`}>
        <span className={styles.metricLabel}><Ikon nama={m.ikon} size={15} />{m.label}</span>
        <strong>{angka(nilai)}</strong>
        <span className={styles.delta} data-arah={selisih > 0 ? "naik" : selisih < 0 ? "turun" : "tetap"} title={`Dibanding ${data.hari} hari sebelumnya`}>{selisih !== 0 && <TanyaIcon nama={selisih > 0 ? "atas" : "bawah"} size={11} />}{perubahan}{m.kunci === "klaim" && <em>belum dicek</em>}</span>
      </Link>;
    })}</section>

    <div className={styles.grid}>
      <section className={`${styles.card} ${styles.focus}`} aria-labelledby="judul-fokus">
        <h2 id="judul-fokus" className={styles.srOnly}>Fokus hari ini</h2>
        <div className={styles.tabs} role="tablist" aria-label="Fokus hari ini">{tabs.map(t => <button key={t} type="button" id={`tab-${t}`} role="tab" aria-selected={tab === t} aria-controls="panel-fokus" tabIndex={tab === t ? 0 : -1} onClick={() => pilihTab(t)} onKeyDown={e => {
          const i = tabs.indexOf(t);
          const k = ({ ArrowLeft: (i + tabs.length - 1) % tabs.length, ArrowRight: (i + 1) % tabs.length, Home: 0, End: tabs.length - 1 } as Record<string, number>)[e.key];
          if (k === undefined) return;
          e.preventDefault(); pilihTab(tabs[k]); document.getElementById(`tab-${tabs[k]}`)?.focus();
        }}>{labelTab[t]}{t !== "terbaru" && <span className={styles.count} data-penting={t === "prioritas" && jumlah[t] > 0 ? "" : undefined}>{angka(jumlah[t])}</span>}</button>)}</div>

        <div id="panel-fokus" role="tabpanel" tabIndex={0} aria-labelledby={`tab-${tab}`} className="anim-urut" key={tab}>
          {!jumlah[tab] && <div className={styles.empty}><span className={styles.emptyIcon}><Ikon nama={tab === "janji" ? "kalender" : tab === "peluang" ? "pelanggan" : tab === "terbaru" ? "chat" : "centang"} size={20} /></span>{tab === "prioritas" ? "Semua beres" : tab === "peluang" ? "Belum ada peluang" : tab === "janji" ? "Belum ada janji" : terputus ? "Sambungkan WhatsApp untuk menerima chat" : "Belum ada chat"}</div>}

          {(tab === "prioritas" || tab === "peluang") && data[tab].slice(0, batasTampil).map(c => <div className={styles.row} key={`${tab}-${c.id}`}>
            <Link className={styles.rowMain} href={`/app/inbox?c=${c.id}`}>
              <Avatar nama={c.nama} ukuran={38} />
              <span className={styles.rowText}><b>{c.nama}</b><small title={c.alasan}>{c.alasan}</small></span>
              <time className={styles.rowTime} dateTime={c.waktu}>{berlalu(c.waktu, data.diperbarui)}</time>
            </Link>
            <Link className={styles.rowAction} aria-label={`Siapkan draf ${tab === "prioritas" ? "balasan" : "follow up"} untuk ${c.nama}`} title="Siapkan draf" href={tanyaBisnis(`Siapkan draf ${tab === "prioritas" ? "balasan" : "follow up"} untuk ${JSON.stringify(c.nama)}${c.nomor ? ` (nomor ${c.nomor})` : ""}. Baca obrolan terakhir dulu dan sesuaikan dengan kebutuhan pelanggan.`)}><TanyaIcon nama="baru" size={17} /><span>Bantu balas</span></Link>
          </div>)}

          {tab === "janji" && data.janji.slice(0, batasTampil).map(j => {
            const status = bentrok.has(j.id) ? "Jam bentrok" : j.dipastikan ? "Dipastikan" : "Konfirmasi";
            return <Link className={`${styles.row} ${styles.rowMain}`} key={j.id} href={`/app/kontak/${j.id}`}>
              <span className={styles.date} aria-hidden="true"><b>{new Date(j.waktu).toLocaleDateString("id-ID", { timeZone: WIB, day: "numeric" })}</b><small>{new Date(j.waktu).toLocaleDateString("id-ID", { timeZone: WIB, month: "short" })}</small></span>
              <span className={styles.rowText}><b>{j.nama}</b><small><time dateTime={j.waktu}>{tanggal(j.waktu)}, {jam(j.waktu)} WIB</time>{j.catatan ? ` · ${j.catatan}` : ""}</small></span>
              <span className={styles.badge} data-jenis={bentrok.has(j.id) ? "bentrok" : j.dipastikan ? "pasti" : "tunggu"}>{status}</span>
            </Link>;
          })}

          {tab === "terbaru" && data.terbaru.slice(0, batasTampil).map(c => <Link className={`${styles.row} ${styles.rowMain}`} key={`t-${c.id}`} href={`/app/inbox?c=${c.id}`}>
            <Avatar nama={c.nama} ukuran={38} />
            <span className={styles.rowText}><b>{c.nama}</b><small>{c.peran === "assistant" ? "Asisten: " : c.peran === "human" || c.peran === "owner" ? "Kamu: " : ""}{c.cuplikan}</small></span>
            <span className={styles.rowEnd}><time className={styles.rowTime} dateTime={c.waktu}>{berlalu(c.waktu, data.diperbarui)}</time>{c.perluBantuan && <i className={styles.dot} title="Perlu dibantu" aria-label="Perlu dibantu" />}</span>
          </Link>)}
        </div>

        {(data[tab].length > 4 || jumlah[tab] > tampil) && <div className={styles.listFoot}>
          <span>{jumlah[tab] > tampil && <>Menampilkan {angka(tampil)} dari {angka(jumlah[tab])}</>}</span>
          <span className={styles.footActions}>
            {data[tab].length > 4 && <button type="button" className={styles.footBtn} aria-expanded={semua} onClick={() => setSemua(!semua)}>{semua ? "Lebih sedikit" : "Lainnya"}<TanyaIcon nama={semua ? "atas" : "bawah"} size={13} /></button>}
            {jumlah[tab] > tampil && <Link className={styles.footBtn} href={tab === "janji" ? "/app/kontak?stage=janji" : "/app/inbox"}>Semua<TanyaIcon nama="kanan" size={13} /></Link>}
          </span>
        </div>}
      </section>

      <div className={styles.side}>
        <section className={`${styles.card} ${styles.ask}`} aria-label="Tanya Palwise">
          <Link href="/app/tanya" className={styles.askBar} aria-label="Tanya Palwise">
            <TanyaIcon nama="chat" size={18} />
            <span className={styles.askText} aria-hidden="true"><span key={contoh} className={styles.askHint}>{contohTanya[contoh]}</span></span>
            <span className={styles.askGo} aria-hidden="true"><TanyaIcon nama="kanan" size={16} /></span>
          </Link>
          <div className={styles.quick}>{BANTUAN_BISNIS.map((f, i) => <Link key={f.judul} href={tanyaBisnis(f.pesan)} className={styles.chip} title={f.detail}><Ikon nama={ikonBantuan[i]} size={16} /><span>{f.judul}</span></Link>)}</div>
        </section>

        <section className={styles.card} aria-labelledby="judul-tahap">
          <div className={styles.cardHead}><h2 id="judul-tahap">Tahap pelanggan</h2><Link href="/app/kontak" className={styles.more} aria-label={`Lihat ${angka(total)} pelanggan`}>{angka(total)}<TanyaIcon nama="kanan" size={13} /></Link></div>
          {total ? <>
            <div className={styles.stageBar} aria-hidden="true">{TAHAP.map(s => { const n = perTahap(s.nama); return n ? <i key={s.nama} style={{ flexGrow: n, background: s.warna }} data-redup={sorot && sorot !== s.nama ? "" : undefined} /> : null; })}</div>
            <div className={styles.legend}>{TAHAP.map(s => <Link key={s.nama} href={`/app/kontak?stage=${s.nama}`} onMouseEnter={() => setSorot(s.nama)} onMouseLeave={() => setSorot(null)} onFocus={() => setSorot(s.nama)} onBlur={() => setSorot(null)}><i style={{ background: s.warna }} /><span>{s.nama}</span><b>{angka(perTahap(s.nama))}</b></Link>)}</div>
          </> : <p className={styles.emptySmall}>Belum ada pelanggan.</p>}
        </section>

        <details className={styles.status}>
          <summary aria-label={`Paket ${data.paket}: ${angka(data.balasan.terpakai)} dari ${angka(data.balasan.batas)} balasan terpakai`}>
            <span className={styles.planName}>{data.paket}</span>
            <span className={styles.meter} data-hampir={persenJatah >= 85 ? "" : undefined}><i style={{ width: `${persenJatah}%` }} /></span>
            <span className={styles.planUse}>{angka(data.balasan.terpakai)}/{angka(data.balasan.batas)}</span>
            <TanyaIcon nama="bawah" size={14} />
          </summary>
          <div className={styles.statusBody}>
            <p>Balasan terpakai, reset {tanggal(data.resetBalasan)}.</p>
            <nav aria-label="Pengaturan cepat"><Link href="/app/tagihan">Kelola paket</Link><Link href="/app/knowledge">Info bisnis · {angka(data.info)}</Link><Link href="/panduan">Panduan</Link></nav>
          </div>
        </details>
      </div>
    </div>
  </div>;
}
