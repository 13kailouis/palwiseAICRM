"use client";

import { useState } from "react";
import { Logo } from "./Logo";
import { Ikon } from "./Ikon";
import styles from "./ContohTanya.module.css";

const CONTOH = [
  { label: "Cek calon peserta", ikon: "pelanggan" as const, tanya: "Siapa yang perlu aku balas?", jawab: "Maya menunggu kepastian trial. Raka ingin tahu biaya kelas dewasa.", pelanggan: ["Maya · Trial Sabtu belum dikonfirmasi", "Raka · Menanyakan biaya kelas dewasa"], petunjuk: "Temukan calon peserta yang perlu perhatian dari percakapan yang tercatat." },
  { label: "Siapkan draf", ikon: "kirim" as const, tanya: "Bantu balas Maya, jadwal trial-nya masih aku cek.", jawab: "Maya meminta trial Bahasa Inggris anak hari Sabtu. Ini drafnya:", draf: "Halo Kak Maya, permintaan trial Bahasa Inggris anak hari Sabtu sudah kami catat. Jadwalnya masih kami cek dengan tim pengajar. Kami kabari setelah ada kepastian ya 🙂", petunjuk: "Baca drafnya, minta revisi, lalu kirim setelah kamu setujui." },
  { label: "Kabar pendaftaran", ikon: "ringkasan" as const, tanya: "Berapa orang yang chat hari ini?", jawab: "Ada 8 orang yang chat hari ini di data Palwise, termasuk 3 kontak baru.", angka: ["8 orang chat", "3 kontak baru"], petunjuk: "Lihat aktivitas yang tercatat. Jumlah chat belum berarti jumlah peserta yang mendaftar." },
];

/** Clearly marked sample data, with local controls only; never sends customer messages. */
export function ContohTanya() {
  const [aktif, setAktif] = useState(0);
  const item = CONTOH[aktif];
  return <section className={styles.demo} aria-label="Contoh Palwise AI">
    <div className={styles.top}><span><Logo ukuran={26} /><strong>Palwise AI</strong></span><small>Contoh penggunaan · data ilustrasi</small></div>
    <div className={styles.layout}>
      <div className={styles.choices} aria-label="Pilih contoh penggunaan">
        <p>Bantu admin menentukan tindak lanjut.</p>
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
