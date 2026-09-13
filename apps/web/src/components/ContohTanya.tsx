"use client";

import { useState } from "react";
import { Logo } from "./Logo";
import { Ikon } from "./Ikon";
import type { ContohTanyaItem } from "@/lib/jualan";
import styles from "./ContohTanya.module.css";

/**
 * Clearly marked sample data, with local controls only; never sends customer messages.
 *
 * The examples arrive as a prop from `lib/jualan.ts` instead of being imported
 * here: this file runs in the browser, and importing the data module would ship
 * every business type's copy to every visitor.
 */
export function ContohTanya({ contoh }: { contoh: ContohTanyaItem[] }) {
  const [aktif, setAktif] = useState(0);
  const item = contoh[aktif] ?? contoh[0];
  return <section className={styles.demo} aria-label="Contoh Palwise AI">
    <div className={styles.top}><span><Logo ukuran={26} /><strong>Palwise AI</strong></span><small>Contoh penggunaan · data ilustrasi</small></div>
    <div className={styles.layout}>
      <div className={styles.choices} aria-label="Pilih contoh penggunaan">
        <p>Satu chat untuk urusan bisnismu.</p>
        {contoh.map((c, i) => <button key={c.label} type="button" aria-pressed={aktif === i} aria-controls="contoh-tanya-isi" onClick={() => setAktif(i)}><Ikon nama={c.ikon} size={18} />{c.label}</button>)}
      </div>
      <div id="contoh-tanya-isi" className={styles.chat} aria-live="polite" aria-atomic="true">
        <p className={styles.question}>{item.tanya}</p>
        <div className={styles.answer}><Logo ukuran={25} /><div><strong>Palwise</strong><p>{item.jawab}</p>
          {item.pelanggan && <ul>{item.pelanggan.map(n => <li key={n}>{n}</li>)}</ul>}
          {item.draf && <div className={styles.draft}><small>Draf untuk {item.draf.untuk}</small><p>{item.draf.teks}</p><span><Ikon nama="kirim" size={14} />Menunggu persetujuanmu</span></div>}
          {item.angka && <div className={styles.stats}>{item.angka.map(n => <span key={n}>{n}</span>)}</div>}
        </div></div>
        <p className={styles.note}>{item.petunjuk}</p>
      </div>
    </div>
  </section>;
}
