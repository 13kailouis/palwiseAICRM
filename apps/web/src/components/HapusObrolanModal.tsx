"use client";

import { useEffect, useRef, useState } from "react";
import { Portal } from "./Portal";
import { TanyaIcon } from "./TanyaIcon";
import styles from "./Tanya.module.css";

type Props = { judul: string; hapus: () => Promise<string | null>; tutup: () => void };

export function HapusObrolanModal(props: Props) {
  return <Portal><DialogHapus {...props} /></Portal>;
}

function DialogHapus({ judul, hapus, tutup }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const batalRef = useRef<HTMLButtonElement>(null);
  const proses = useRef(false);
  const [sibuk, setSibuk] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);
  useEffect(() => {
    const dialog = dialogRef.current!;
    dialog.showModal();
    batalRef.current?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { dialog.close(); document.body.style.overflow = overflow; };
  }, []);
  async function konfirmasi() {
    if (proses.current) return;
    proses.current = true; setSibuk(true); setGalat(null);
    try {
      const error = await hapus();
      if (error) setGalat(error);
      else tutup();
    } catch { setGalat("Obrolan belum berhasil dihapus. Coba lagi."); }
    finally { proses.current = false; setSibuk(false); }
  }
  return <dialog ref={dialogRef} className={styles.deleteDialog} aria-labelledby="hapus-obrolan-judul" aria-describedby="hapus-obrolan-info"
    onCancel={event => { event.preventDefault(); if (!proses.current) tutup(); }}
    onClick={event => { if (event.target === event.currentTarget && !proses.current) { const r = event.currentTarget.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) tutup(); } }}>
    <div className={styles.dialogHeading}><h2 id="hapus-obrolan-judul">Hapus obrolan?</h2><button type="button" className={styles.iconButton} disabled={sibuk} onClick={tutup} aria-label="Tutup konfirmasi"><TanyaIcon nama="tutup" size={18} /></button></div>
    <p className={styles.deleteTitle}>{judul || "Obrolan baru"}</p>
    <p id="hapus-obrolan-info" className={styles.dialogDescription}>Isi obrolan ini akan dihapus permanen.</p>
    {galat && <p className={styles.dialogError} role="alert">{galat}</p>}
    <div className={styles.dialogActions}><button ref={batalRef} type="button" disabled={sibuk} onClick={tutup}>Batal</button><button type="button" className={styles.dangerButton} disabled={sibuk} onClick={konfirmasi}>{sibuk ? "Menghapus…" : "Hapus"}</button></div>
    <span className="sr-only" role="status">{sibuk ? "Menghapus obrolan, tunggu sebentar." : ""}</span>
  </dialog>;
}
