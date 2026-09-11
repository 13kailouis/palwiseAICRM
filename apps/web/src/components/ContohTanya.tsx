"use client";

import { useState } from "react";
import { Logo } from "./Logo";
import { Ikon } from "./Ikon";
import styles from "./ContohTanya.module.css";

const CONTOH = [
  { label: "Cek pelanggan", ikon: "pelanggan" as const, tanya: "Siapa yang perlu aku balas?", jawab: "Maya menunggu kepastian ukuran. Raka ingin tahu jadwal pengiriman.", pelanggan: ["Maya · Tanya ukuran 39", "Raka · Menunggu jadwal kirim"], petunjuk: "Temukan yang perlu perhatian dari percakapan yang tercatat." },
  { label: "Siapkan draf", ikon: "kirim" as const, tanya: "Bantu follow up Maya, yang santai aja.", jawab: "Maya terakhir menanyakan sepatu ukuran 39. Ini drafnya:", draf: "Halo Maya, masih mau lanjut cari sepatu ukuran 39? Kalau ada yang ingin ditanyakan dulu, kabari ya 🙂", petunjuk: "Baca drafnya, minta revisi, lalu kirim setelah kamu setujui." },
  { label: "Kabar bisnis", ikon: "ringkasan" as const, tanya: "Berapa pelanggan yang chat hari ini?", jawab: "Ada 8 pelanggan yang chat hari ini di data Palwise.", angka: ["8 pelanggan", "3 baru pertama chat"], petunjuk: "Tanya kondisi bisnis dengan bahasa sehari-hari, dari data yang tersedia." },
];

/** Clearly marked sample data, with local controls only; never sends customer messages. */
export function ContohTanya() {
  const [aktif, setAktif] = useState(0);
  const item = CONTOH[aktif];
  return <section className={styles.demo} aria-label="Contoh Palwise AI">
    <div className={styles.top}><span><Logo ukuran={26} /><strong>Palwise AI</strong></span><small>Contoh penggunaan · data ilustrasi</small></div>
    <div className={styles.layout}>
      <div className={styles.choices} aria-label="Pilih contoh penggunaan">
        <p>Satu chat untuk urusan bisnismu.</p>
        {CONTOH.map((c, i) => <button key={c.label} type="button" aria-pressed={aktif === i} aria-controls="contoh-tanya-isi" onClick={() => setAktif(i)}><Ikon nama={c.ikon} size={18} />{c.label}</button>)}
      </div>
      <div id="contoh-tanya-isi" className={styles.chat} aria-live="polite" aria-atomic="true">
        <p className={styles.question}>{item.tanya}</p>
        <div className={styles.answer}><Logo ukuran={25} /><div><strong>Palwise</strong><p>{item.jawab}</p>
          {item.pelanggan && <ul>{item.pelanggan.map(n => <li key={n}>{n}</li>)}</ul>}
          {item.draf && <div className={styles.draft}><small>Draf untuk Maya</small><p>{item.draf}</p><span><Ikon nama="kirim" size={14} />Menunggu persetujuanmu</span></div>}
          {item.angka && <div className={styles.stats}>{item.angka.map(n => <span key={n}>{n}</span>)}</div>}
        </div></div>
        <p className={styles.note}>{item.petunjuk}</p>
      </div>
    </div>
  </section>;
}
