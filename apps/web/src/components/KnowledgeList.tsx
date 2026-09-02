"use client";

import { Kosong } from "@/components/Kosong";
import { Portal } from "@/components/Portal";
import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  deleteKnowledgeAction,
  reindexKnowledgeAction,
  updateKnowledgeAction,
  type KnowledgeState,
} from "@/app/actions/knowledge";
import { Ikon } from "@/components/Ikon";

export interface KnowledgeItemData {
  id: string;
  type: string;
  title: string;
  content: string;
  status: string;
  error: string | null;
  chunkCount: number;
  addedLabel: string;
}

const TYPE_LABEL: Record<string, string> = {
  text: "Diketik",
  qna: "Tanya jawab",
  file: "Dari file",
  website: "Dari website",
  ai: "Dari AI lain",
  image: "Dari gambar",
};

const STATUS_STYLE: Record<string, string> = {
  ready: "bg-brand-50 text-brand-700",
  pending: "bg-amber-50 text-amber-700",
  error: "bg-red-50 text-red-700",
};

const STATUS_LABEL: Record<string, string> = {
  ready: "Sudah dihafal",
  pending: "Belum dihafal",
  error: "Gagal dihafal",
};

function SaveButton({ dirty }: { dirty: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending || !dirty}>
      {pending ? "Menyimpan dan menghafal ulang" : "Simpan perubahan"}
    </button>
  );
}

function HapusButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-red-700 disabled:opacity-60"
    >
      {pending ? "Menghapus" : "Ya, hapus"}
    </button>
  );
}

function KnowledgeItem({ source }: { source: KnowledgeItemData }) {
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const [konfirmHapus, setKonfirmHapus] = useState(false);
  // Konfirmasi "tulisanmu belum disimpan" dulu memakai window.confirm bawaan
  // browser, satu-satunya dialog bawaan yang tersisa di seluruh aplikasi.
  // Bentuknya beda sendiri di tiap sistem, tidak bisa diberi kalimat yang
  // benar-benar menjelaskan, dan di beberapa browser bisa ditekan orang tanpa
  // sempat terbaca. Sekarang lapisan di dalam jendelanya, sama seperti
  // konfirmasi hapus di sebelahnya.
  const [konfirmTutup, setKonfirmTutup] = useState(false);
  const [content, setContent] = useState(source.content);
  const [title, setTitle] = useState(source.title);
  const [state, formAction] = useActionState(
    updateKnowledgeAction,
    {} as KnowledgeState,
  );

  const dirty = content !== source.content || title !== source.title;

  /**
   * Peringatan sebelum suntingan yang belum disimpan hilang.
   *
   * Catatan info bisnis itu tulisan panjang: daftar harga, aturan toko, tanya
   * jawab. Orang mengetiknya lama, dan dulu satu klik pada "Tutup" membuangnya
   * tanpa bertanya apa pun. Peringatan yang cuma memberi tahu tapi tidak
   * mencegah itu setengah pekerjaan, jadi di sini benar-benar dicegah.
   */
  function tutupEditor() {
    if (dirty) {
      setKonfirmTutup(true);
      return;
    }
    buangDanTutup();
  }

  function buangDanTutup() {
    setContent(source.content);
    setTitle(source.title);
    setKonfirmHapus(false);
    setKonfirmTutup(false);
    setOpen(false);
  }

  // Menutup tab atau pindah halaman juga membuang suntingannya, dan itu jalan
  // keluar yang jauh lebih sering dipakai orang daripada tombol tutup.
  useEffect(() => {
    if (!dirty) return;
    const tanya = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", tanya);
    return () => window.removeEventListener("beforeunload", tanya);
  }, [dirty]);

  // Waktu jendela editor terbuka: Esc menutupnya (lewat penjaga yang sama) dan
  // halaman di belakang dikunci supaya tidak ikut menggulir.
  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => {
      // Esc membatalkan konfirmasinya dulu, baru menutup jendelanya. Tanpa
      // ini satu tekan Esc melewati penjaganya sendiri.
      if (e.key !== "Escape") return;
      if (konfirmTutup) setKonfirmTutup(false);
      else tutupEditor();
    };
    window.addEventListener("keydown", esc);
    const sebelum = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", esc);
      document.body.style.overflow = sebelum;
    };
    // BUG LAMA, diperbaiki 3 September 2026. Dependensinya cuma [open], jadi
    // pendengar Esc-nya menangkap tutupEditor dari render saat jendela BARU
    // DIBUKA, dan di saat itu dirty pasti false karena belum ada yang diketik.
    // Akibatnya Esc sesudah mengetik menutup jendela dan membuang suntingannya
    // TANPA bertanya, persis kerusakan yang penjaga ini dibuat untuk mencegah.
    // Tombol Tutup dan klik latar aman, karena dua-duanya memanggil
    // tutupEditor yang segar dari render terakhir; cuma jalur Esc yang bocor,
    // dan itu jalan keluar yang paling sering dipakai orang yang mengetik.
    //
    // Komentar lamanya berbunyi "yang penting cuma buka/tutup" dan terdengar
    // benar sekali. Yang penting justru dirty, karena dia yang menentukan
    // penjaganya menyala atau tidak.
    //
    // tutupEditor sendiri tetap di luar dependensi: identitasnya berubah tiap
    // render, dan yang dibacanya cuma dirty plus penyetel yang stabil.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, dirty, konfirmTutup]);

  return (
    <li className="card p-4">
      {/* Kartu ringkas: sekali ketuk membuka jendela editor, jadi isinya tidak
          pernah memanjang ke bawah dan memakan layar. Tombolnya cuma satu
          lambang kecil yang tidak ikut menyusut. */}
      <div className="flex items-start justify-between gap-3">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="min-w-0 flex-1 text-left"
        >
          <span className="flex flex-wrap items-center gap-2">
            <span className="badge bg-ink-100 text-ink-600">
              {TYPE_LABEL[source.type] ?? source.type}
            </span>
            <span
              className={`badge ${STATUS_STYLE[source.status] ?? STATUS_STYLE.pending}`}
            >
              {STATUS_LABEL[source.status] ?? source.status}
            </span>
            <span className="text-xs text-ink-400">
              {source.content.length.toLocaleString("id-ID")} huruf
            </span>
          </span>

          {/* line-clamp memakai display:-webkit-box; menambah "block" di
              sebelahnya justru membatalkan potongannya. Jadi cukup line-clamp
              saja. Judul satu baris, isinya dua baris, seperti daftar di app. */}
          <span className="mt-2 line-clamp-1 font-medium text-ink-900">
            {source.title}
          </span>
          <span className="mt-1 line-clamp-2 text-sm leading-relaxed text-ink-500">
            {source.content.slice(0, 220)}
          </span>

          {source.error && (
            <span className="mt-2 block rounded bg-red-50 px-2 py-1 text-xs text-red-700">
              {source.error}
            </span>
          )}
          <span className="mt-2 block text-xs text-ink-400">
            Ditambahkan {source.addedLabel}
          </span>
        </button>

        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setMenu((v) => !v)}
            aria-label="Aksi catatan"
            aria-expanded={menu}
            className="grid h-9 w-9 place-items-center rounded-lg text-ink-500 transition hover:bg-ink-100 hover:text-ink-800"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
              <circle cx="12" cy="5" r="1.6" />
              <circle cx="12" cy="12" r="1.6" />
              <circle cx="12" cy="19" r="1.6" />
            </svg>
          </button>
          {menu && (
            <>
              <span
                aria-hidden
                onClick={() => setMenu(false)}
                className="fixed inset-0 z-40"
              />
              <div className="anim-naik absolute right-0 top-full z-50 mt-1 w-48 overflow-hidden rounded-xl border border-ink-200 bg-white py-1 shadow-[0_8px_24px_-8px_rgba(15,15,15,0.25)]">
                <button
                  type="button"
                  onClick={() => {
                    setMenu(false);
                    setOpen(true);
                  }}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-ink-700 hover:bg-ink-50"
                >
                  <Ikon nama="catat" size={16} className="shrink-0 text-ink-500" />
                  Lihat &amp; edit
                </button>
                <form action={reindexKnowledgeAction}>
                  <input type="hidden" name="id" value={source.id} />
                  <button
                    type="submit"
                    onClick={() => setMenu(false)}
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-ink-700 hover:bg-ink-50"
                  >
                    <Ikon nama="ringkasan" size={16} className="shrink-0 text-ink-500" />
                    Hafalkan lagi
                  </button>
                </form>
                <button
                  type="button"
                  onClick={() => {
                    setMenu(false);
                    setKonfirmHapus(true);
                    setOpen(true);
                  }}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                >
                  <Ikon nama="silang" size={16} className="shrink-0" />
                  Hapus
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {open && (
        <EditorModal
          source={source}
          title={title}
          content={content}
          setTitle={setTitle}
          setContent={setContent}
          dirty={dirty}
          state={state}
          formAction={formAction}
          tutup={tutupEditor}
          konfirmHapus={konfirmHapus}
          setKonfirmHapus={setKonfirmHapus}
          konfirmTutup={konfirmTutup}
          setKonfirmTutup={setKonfirmTutup}
          buangDanTutup={buangDanTutup}
        />
      )}
    </li>
  );
}

/**
 * Jendela editor: layar penuh di HP, kotak di tengah di desktop, seperti app
 * populer. Semua yang berhubungan dengan satu catatan ada di sini (lihat, edit,
 * hafalkan ulang, hapus), jadi kartunya di belakang tetap ringkas.
 */
function EditorModal({
  source,
  title,
  content,
  setTitle,
  setContent,
  dirty,
  state,
  formAction,
  tutup,
  konfirmHapus,
  setKonfirmHapus,
  konfirmTutup,
  setKonfirmTutup,
  buangDanTutup,
}: {
  source: KnowledgeItemData;
  title: string;
  content: string;
  setTitle: (v: string) => void;
  setContent: (v: string) => void;
  dirty: boolean;
  state: KnowledgeState;
  formAction: (payload: FormData) => void;
  tutup: () => void;
  konfirmHapus: boolean;
  setKonfirmHapus: (v: boolean) => void;
  konfirmTutup: boolean;
  setKonfirmTutup: (v: boolean) => void;
  buangDanTutup: () => void;
}) {
  return (
    <Portal>
      <div
        role="dialog"
          aria-modal="true"
          aria-label={`Edit ${source.title}`}
          onClick={tutup}
          className="fixed inset-0 z-[60] flex bg-ink-950/40 backdrop-blur-sm sm:items-center sm:justify-center sm:p-4"
        >
        <div
          onClick={(e) => e.stopPropagation()}
          className="anim-naik relative flex h-full w-full flex-col bg-white sm:h-auto sm:max-h-[86vh] sm:max-w-2xl sm:rounded-2xl sm:border sm:border-ink-200 sm:shadow-[0_24px_64px_-16px_rgba(15,15,15,0.4)]"
        >
          {/* Kepala jendela: jenis + status di kiri, tombol tutup di kanan. */}
          <div className="flex items-center gap-3 border-b border-ink-100 px-4 py-3 sm:px-5">
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
              <span className="badge bg-ink-100 text-ink-600">
                {TYPE_LABEL[source.type] ?? source.type}
              </span>
              <span
                className={`badge ${STATUS_STYLE[source.status] ?? STATUS_STYLE.pending}`}
              >
                {STATUS_LABEL[source.status] ?? source.status}
              </span>
            </div>
            <button
              type="button"
              onClick={tutup}
              aria-label="Tutup"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-ink-500 transition hover:bg-ink-100 hover:text-ink-800"
            >
              <Ikon nama="silang" size={18} />
            </button>
          </div>

          <form
            action={formAction}
            className="flex min-h-0 flex-1 flex-col"
          >
            <input type="hidden" name="id" value={source.id} />

            {/* Badan jendela menggulir sendiri, kepala dan kaki tetap di tempat. */}
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4 sm:px-5">
              <div>
                <label className="label" htmlFor={`judul-${source.id}`}>
                  Judul
                </label>
                <input
                  id={`judul-${source.id}`}
                  name="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="input"
                />
              </div>

              <div className="flex min-h-0 flex-1 flex-col">
                <label className="label" htmlFor={`isi-${source.id}`}>
                  Isi lengkapnya
                </label>
                <textarea
                  id={`isi-${source.id}`}
                  name="content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="textarea min-h-[240px] flex-1 sm:min-h-[320px]"
                />
                <p className="hint">
                  Ini persis yang dihafal asistenmu. Pisahkan tiap topik dengan
                  baris kosong, karena di situlah teksnya dipotong.
                </p>
              </div>

              {source.error && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
                  {source.error}
                </p>
              )}
            </div>

            {/* Kaki jendela: simpan di kanan, aksi lain di kiri. */}
            <div className="border-t border-ink-100 px-4 py-3 sm:px-5">
              {dirty && (
                <p className="mb-2 text-xs text-amber-700">
                  Ada perubahan yang belum disimpan
                </p>
              )}
              {state?.error && (
                <p className="mb-2 text-sm text-red-600">{state.error}</p>
              )}
              {state?.message && !state.error && (
                <p className="mb-2 text-sm text-brand-700">{state.message}</p>
              )}

              <div className="flex flex-col gap-2 sm:flex-row-reverse sm:items-center">
                <div className="flex items-center gap-2">
                  <SaveButton dirty={dirty} />
                  {dirty && (
                    <button
                      type="button"
                      onClick={() => {
                        setContent(source.content);
                        setTitle(source.title);
                      }}
                      className="btn-ghost"
                    >
                      Batalkan
                    </button>
                  )}
                </div>

                <div className="flex flex-1 items-center gap-1.5">
                  {!konfirmHapus && (
                    <button
                      type="button"
                      onClick={() => setKonfirmHapus(true)}
                      className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50"
                    >
                      Hapus
                    </button>
                  )}
                </div>
              </div>
            </div>
          </form>

          {/* Hafalkan ulang berdiri sendiri di luar form utama supaya tidak ikut
              mengirim suntingan yang belum disimpan. */}
          <div className="border-t border-ink-100 px-4 py-2.5 sm:px-5">
            <form action={reindexKnowledgeAction}>
              <input type="hidden" name="id" value={source.id} />
              <button
                type="submit"
                className="flex items-center gap-2 text-xs font-medium text-ink-600 transition hover:text-ink-900"
              >
                <Ikon nama="ringkasan" size={15} className="shrink-0 text-ink-500" />
                Hafalkan lagi dari awal
              </button>
            </form>
          </div>

          {/* Konfirmasi hapus, sebagai lapisan di dalam jendela. Form hapusnya
              berdiri sendiri, bukan di dalam form suntingan (form di dalam form
              itu HTML yang tidak sah dan pecah di browser). */}
          {/* Konfirmasi buang suntingan. Bentuknya sengaja sama persis dengan
              konfirmasi hapus di bawahnya, karena dua-duanya pekerjaan yang
              sama: menahan sesuatu yang tidak bisa dibatalkan. */}
          {konfirmTutup && (
            <div className="absolute inset-0 z-10 flex items-end bg-ink-950/20 backdrop-blur-[2px] sm:items-center sm:justify-center sm:p-4">
              <div className="w-full rounded-t-2xl border-t border-ink-200 bg-white p-4 shadow-[0_-8px_24px_-8px_rgba(15,15,15,0.2)] sm:w-auto sm:max-w-sm sm:rounded-2xl sm:border">
                <p className="text-sm leading-relaxed text-ink-900">
                  Ada yang kamu ubah tapi belum disimpan. Kalau ditutup sekarang,
                  perubahannya hilang dan nggak bisa dibalikin.
                </p>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={buangDanTutup}
                    className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
                  >
                    Tutup, buang perubahannya
                  </button>
                  <button
                    type="button"
                    onClick={() => setKonfirmTutup(false)}
                    className="rounded-lg border border-ink-200 bg-white px-3 py-1.5 text-xs text-ink-700 hover:bg-ink-50"
                  >
                    Lanjut edit
                  </button>
                </div>
              </div>
            </div>
          )}

          {konfirmHapus && (
            <div className="absolute inset-0 z-10 flex items-end bg-ink-950/20 backdrop-blur-[2px] sm:items-center sm:justify-center sm:p-4">
              <div className="w-full rounded-t-2xl border-t border-ink-200 bg-white p-4 shadow-[0_-8px_24px_-8px_rgba(15,15,15,0.2)] sm:w-auto sm:max-w-sm sm:rounded-2xl sm:border">
                <p className="text-sm leading-relaxed text-ink-900">
                  Hapus &quot;{source.title}&quot;? Asistenmu langsung lupa isinya
                  dan tidak bisa lagi menjawab pertanyaan soal itu.
                </p>
                <div className="mt-3 flex gap-2">
                  <form action={deleteKnowledgeAction}>
                    <input type="hidden" name="id" value={source.id} />
                    <HapusButton />
                  </form>
                  <button
                    type="button"
                    onClick={() => setKonfirmHapus(false)}
                    className="rounded-lg border border-ink-200 bg-white px-3 py-1.5 text-xs text-ink-700 hover:bg-ink-50"
                  >
                    Batal
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Portal>
  );
}

export function KnowledgeList({ sources }: { sources: KnowledgeItemData[] }) {
  if (sources.length === 0) {
    return (
      <div className="card">
        <Kosong
          ikon="info"
          judul="Belum ada info apa-apa"
          kalimat="Tempel daftar harga dan cara pesan lewat kotak Tambah info, biar asistenmu punya bahan menjawab."
        />
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {sources.map((s) => (
        <KnowledgeItem key={s.id} source={s} />
      ))}
    </ul>
  );
}
