"use client";

import { useActionState, useEffect, useId, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Ikon } from "@/components/Ikon";
import type { MasukanState } from "@/app/actions/masukan";
import styles from "./KirimMasukan.module.css";

type Action = (state: MasukanState, formData: FormData) => Promise<MasukanState>;
type Jenis = "bug" | "saran" | "lainnya";
const pilihan = [{ id: "bug", label: "Bug", ikon: "kendali" }, { id: "saran", label: "Ide", ikon: "catat" }, { id: "lainnya", label: "Lainnya", ikon: "chat" }] as const;
const petunjuk: Record<Jenis, string> = { bug: "Apa yang tidak jalan?", saran: "Apa yang bisa lebih baik?", lainnya: "Tulis di sini" };
const BATAS = 2000;

export function KirimMasukan({ action }: { action: Action }) {
  const pathname = usePathname();
  const [buka, setBuka] = useState(false);
  const [isi, setIsi] = useState("");
  const [jenis, setJenis] = useState<Jenis>("saran");
  const dialog = useRef<HTMLDialogElement>(null);
  const pemicu = useRef<HTMLButtonElement>(null);
  const pending = useRef(false);
  const seret = useRef<{ y: number; dy: number } | null>(null);
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

  // Phone sheet: drag the handle or header down to dismiss, like a native bottom sheet.
  function mulaiSeret(e: React.PointerEvent<HTMLDialogElement>) {
    const t = e.target as HTMLElement;
    if (!t.closest("[data-seret]") || t.closest("button") || window.matchMedia("(min-width: 1024px)").matches) return;
    seret.current = { y: e.clientY, dy: 0 };
    e.currentTarget.setPointerCapture(e.pointerId);
    e.currentTarget.style.transition = "none";
  }
  function geser(e: React.PointerEvent<HTMLDialogElement>) {
    if (!seret.current) return;
    seret.current.dy = Math.max(0, e.clientY - seret.current.y);
    e.currentTarget.style.transform = `translateY(${seret.current.dy}px)`;
  }
  function lepas(e: React.PointerEvent<HTMLDialogElement>) {
    if (!seret.current) return;
    const jauh = seret.current.dy > 80;
    seret.current = null;
    e.currentTarget.style.transition = "";
    e.currentTarget.style.transform = "";
    if (jauh) tutup();
  }

  if (tersembunyi) return null;
  return <>
    <button ref={pemicu} type="button" onClick={() => setBuka(true)} className={styles.launcher} data-buka={buka ? "" : undefined} aria-label="Kirim masukan" aria-haspopup="dialog" title="Kirim masukan"><Ikon nama="catat" size={18} /><span>Masukan</span>{isi && <i aria-label="Ada draf" />}</button>
    <dialog ref={dialog} className={styles.panel} aria-labelledby={judulId} onCancel={e => { e.preventDefault(); tutup(); }}
      onPointerDown={mulaiSeret} onPointerMove={geser} onPointerUp={lepas} onPointerCancel={lepas}
      onClick={e => {
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
  const form = useRef<HTMLFormElement>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const berhasil = useRef<HTMLHeadingElement>(null);
  const id = useId();
  const kosong = !isi.trim();
  useEffect(() => { setPending(pending); }, [pending, setPending]);
  useEffect(() => {
    if (!state.ok) return;
    setIsi("");
    berhasil.current?.focus();
    // Close on its own once the thank-you has registered; the button stays for anyone faster.
    const t = setTimeout(tutup, 2200);
    return () => clearTimeout(t);
  }, [state.ok, setIsi, tutup]);
  useEffect(() => {
    const el = textarea.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(200, Math.max(96, el.scrollHeight))}px`;
  }, [isi]);

  return <>
    <div className={styles.grip} data-seret aria-hidden="true"><span /></div>
    <header className={styles.header} data-seret><h2 id={judulId}>Masukan</h2><button data-tutup type="button" onClick={tutup} disabled={pending} className={styles.close} aria-label="Tutup masukan" title="Tutup"><Ikon nama="silang" size={18} /></button></header>
    {state.ok ? <div className={styles.success} role="status">
      <span className={styles.check}><Ikon nama="centang" size={24} /></span><h3 ref={berhasil} tabIndex={-1}>Terkirim, makasih!</h3><button type="button" onClick={tutup} className={styles.done}>Tutup</button>
    </div> : <form ref={form} action={formAction} className={styles.form}>
      <input type="hidden" name="halaman" value={halaman} />
      <fieldset className={styles.types} disabled={pending} data-pilih={pilihan.findIndex(p => p.id === jenis)}><legend className={styles.srOnly}>Jenis masukan</legend><span className={styles.thumb} aria-hidden="true" />{pilihan.map(p => <label key={p.id}>
        <input type="radio" name="jenis" value={p.id} checked={jenis === p.id} onChange={() => setJenis(p.id)} /><span><Ikon nama={p.ikon} size={15} />{p.label}</span>
      </label>)}</fieldset>
      <div className={styles.composer} data-galat={state.error ? "" : undefined}>
        <label className={styles.srOnly} htmlFor={id}>Isi masukan</label>
        <textarea ref={textarea} id={id} name="isi" value={isi} onChange={e => setIsi(e.target.value)} readOnly={pending} rows={3} maxLength={2000} placeholder={petunjuk[jenis]}
          onKeyDown={e => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && !kosong) { e.preventDefault(); form.current?.requestSubmit(); } }}
          aria-describedby={state.error ? `${id}-error` : undefined} aria-invalid={state.error ? true : undefined} />
        <div className={styles.composerBar}>
          {isi.length > BATAS * .8 ? <span className={styles.counter} aria-live="polite">{(BATAS - isi.length).toLocaleString("id-ID")} huruf lagi</span> : <span />}
          <button type="submit" disabled={pending || kosong} className={styles.send} aria-label={pending ? "Mengirim" : "Kirim masukan"} title="Kirim (Ctrl+Enter)" aria-busy={pending}>{pending ? <span className={styles.titik} aria-hidden="true"><i /><i /><i /></span> : <Ikon nama="kirim" size={17} />}</button>
        </div>
      </div>
      {state.error && <p id={`${id}-error`} role="alert" className={styles.error}>{state.error}</p>}
      <p className={styles.privacy}><Ikon nama="gembok" size={13} />Halaman ini dan email akun ikut terkirim, chat pelanggan tidak.</p>
    </form>}
  </>;
}
