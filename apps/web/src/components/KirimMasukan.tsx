"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Ikon } from "@/components/Ikon";
import type { MasukanState } from "@/app/actions/masukan";
import styles from "./KirimMasukan.module.css";

type Action = (state: MasukanState, formData: FormData) => Promise<MasukanState>;
type Jenis = "bug" | "saran" | "lainnya";
const pilihan = [{ id: "bug", label: "Bug", ikon: "kendali" }, { id: "saran", label: "Ide", ikon: "catat" }, { id: "lainnya", label: "Lainnya", ikon: "chat" }] as const;

export function KirimMasukan({ action }: { action: Action }) {
  const pathname = usePathname();
  const [buka, setBuka] = useState(false);
  const [isi, setIsi] = useState("");
  const [jenis, setJenis] = useState<Jenis>("saran");
  const dialog = useRef<HTMLDialogElement>(null);
  const pemicu = useRef<HTMLButtonElement>(null);
  const pending = useRef(false);
  const judulId = useId();
  const tersembunyi = pathname.startsWith("/app/inbox") || pathname.startsWith("/app/tanya");

  function tutup() {
    if (pending.current) return;
    dialog.current?.close();
    setBuka(false);
    pemicu.current?.focus({ preventScroll: true });
  }

  useEffect(() => {
    if (!buka || tersembunyi) return;
    const el = dialog.current;
    el?.showModal();
    // Focus the close button so opening feedback does not summon the mobile keyboard.
    el?.querySelector<HTMLButtonElement>("[data-tutup]")?.focus({ preventScroll: true });
    const viewport = window.visualViewport;
    function sesuaikan() {
      el?.style.setProperty("--feedback-height", `${viewport?.height ?? window.innerHeight}px`);
      el?.style.setProperty("--feedback-bottom", `${Math.max(0, window.innerHeight - (viewport?.height ?? window.innerHeight) - (viewport?.offsetTop ?? 0))}px`);
    }
    sesuaikan();
    viewport?.addEventListener("resize", sesuaikan);
    viewport?.addEventListener("scroll", sesuaikan);
    return () => { el?.close(); viewport?.removeEventListener("resize", sesuaikan); viewport?.removeEventListener("scroll", sesuaikan); };
  }, [buka, tersembunyi]);

  if (tersembunyi) return null;
  return <>
    <button ref={pemicu} type="button" onClick={() => setBuka(true)} className={styles.launcher} aria-label="Kirim masukan" aria-haspopup="dialog" title="Kirim masukan"><Ikon nama="catat" size={19} /><span>Masukan</span>{isi && <i aria-label="Ada draf" />}</button>
    <dialog ref={dialog} className={styles.panel} aria-labelledby={judulId} onCancel={e => { e.preventDefault(); tutup(); }} onClick={e => {
      if (e.target !== e.currentTarget) return;
      const rect = e.currentTarget.getBoundingClientRect();
      if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) tutup();
    }}>
      {buka && <FormMasukan action={action} judulId={judulId} halaman={pathname} isi={isi} setIsi={setIsi} jenis={jenis} setJenis={setJenis} tutup={tutup} setPending={value => { pending.current = value; }} />}
    </dialog>
  </>;
}

function FormMasukan({ action, judulId, halaman, isi, setIsi, jenis, setJenis, tutup, setPending }: {
  action: Action; judulId: string; halaman: string; isi: string; setIsi: (s: string) => void; jenis: Jenis; setJenis: (s: Jenis) => void; tutup: () => void; setPending: (v: boolean) => void;
}) {
  const [state, formAction, pending] = useActionState(async (prev: MasukanState, form: FormData) => {
    try { return await action(prev, form); }
    catch { return { error: "Belum terkirim. Coba lagi, drafmu tetap tersimpan." }; }
  }, {} as MasukanState);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const berhasil = useRef<HTMLHeadingElement>(null);
  const id = useId();
  useEffect(() => { setPending(pending); }, [pending, setPending]);
  useEffect(() => {
    if (!state.ok) return;
    setIsi("");
    berhasil.current?.focus();
  }, [state.ok, setIsi]);
  useEffect(() => {
    const el = textarea.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(176, Math.max(104, el.scrollHeight))}px`;
  }, [isi]);

  return <>
    <div className={styles.handle} aria-hidden="true" />
    <header className={styles.header}><h2 id={judulId}>Masukan</h2><button data-tutup type="button" onClick={tutup} disabled={pending} className={styles.close} aria-label="Tutup masukan" title="Tutup"><Ikon nama="silang" size={18} /></button></header>
    {state.ok ? <div className={styles.success}>
      <span><Ikon nama="centang" size={25} /></span><h3 ref={berhasil} tabIndex={-1}>Masukan terkirim</h3><p>Terima kasih sudah membantu.</p><button type="button" onClick={tutup} className={styles.submit}>Selesai</button>
    </div> : <form action={formAction} className={styles.form}>
      <input type="hidden" name="halaman" value={halaman} />
      <fieldset className={styles.types} disabled={pending}><legend className={styles.srOnly}>Jenis masukan</legend>{pilihan.map(p => <label key={p.id}>
        <input type="radio" name="jenis" value={p.id} checked={jenis === p.id} onChange={() => setJenis(p.id)} /><span><Ikon nama={p.ikon} size={16} />{p.label}</span>
      </label>)}</fieldset>
      <label className={styles.srOnly} htmlFor={id}>Isi masukan</label>
      <textarea ref={textarea} id={id} name="isi" value={isi} onChange={e => setIsi(e.target.value)} readOnly={pending} rows={3} maxLength={2000} placeholder={jenis === "bug" ? "Apa yang tidak berjalan?" : jenis === "saran" ? "Apa yang bisa lebih baik?" : "Ceritakan di sini…"} aria-describedby={`${id}-batas${state.error ? ` ${id}-error` : ""}`} aria-invalid={state.error ? true : undefined} />
      {state.error && <p id={`${id}-error`} role="alert" className={styles.error}>{state.error}</p>}
      <div className={styles.actions}><span id={`${id}-batas`} className={styles.counter}>{isi.length.toLocaleString("id-ID")} / 2.000</span><button type="submit" disabled={pending} className={styles.submit}>{pending ? "Mengirim…" : "Kirim"}<Ikon nama="kirim" size={16} /></button></div>
      <details className={styles.privacy}><summary><Ikon nama="gembok" size={13} />Data yang disertakan</summary><p>Tulisan ini, halaman yang dibuka, dan email akunmu. Isi chat pelanggan tidak disertakan.</p></details>
    </form>}
  </>;
}
