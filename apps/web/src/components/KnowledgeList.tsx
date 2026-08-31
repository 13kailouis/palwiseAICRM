"use client";

import { Kosong } from "@/components/Kosong";
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
   * tanpa bertanya apa pun, padahal tepat di sebelahnya ada tulisan "Ada
   * perubahan yang belum disimpan". Peringatan yang cuma memberi tahu tapi
   * tidak mencegah itu setengah pekerjaan.
   */
  function tutupEditor() {
    if (
      dirty &&
      !window.confirm(
        "Perubahan yang belum disimpan akan hilang. Tutup saja?",
      )
    ) {
      return;
    }
    setContent(source.content);
    setTitle(source.title);
    setOpen(false);
  }

  // Menutup tab atau pindah halaman juga membuang suntingannya, dan itu jalan
  // keluar yang jauh lebih sering dipakai orang daripada tombol Tutup.
  useEffect(() => {
    if (!dirty) return;
    const tanya = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", tanya);
    return () => window.removeEventListener("beforeunload", tanya);
  }, [dirty]);

  return (
    <li className="card p-4">
      {/* Isi kiri boleh menyusut (min-w-0), tombolnya cuma satu lambang kecil
          yang tidak ikut menyusut. Dulu tiga tombol teks di sebelah kanan itu
          lebar dan shrink-0, jadi di HP dia mendorong kolom nama sampai
          tinggal selebar satu kata dan judulnya patah satu kata satu baris. */}
      <div className="flex items-start justify-between gap-3">
        {/* Judul plus badge jadi satu tombol buka-tutup, lewat penjaga yang
            sama. Kalau tidak, satu klik di sini membuang suntingan yang belum
            disimpan tanpa bertanya. */}
        <button
          type="button"
          onClick={() => (open ? tutupEditor() : setOpen(true))}
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
              sebelahnya justru membatalkan potongannya, jadi teksnya jatuh
              berbaris-baris. Jadi cukup line-clamp saja, tanpa block. Judul
              satu baris, isinya dua baris, sisanya titik-titik, seperti daftar
              di app chat. */}
          <span className="mt-2 line-clamp-1 font-medium text-ink-900">
            {source.title}
          </span>
          {!open && (
            <span className="mt-1 line-clamp-2 text-sm leading-relaxed text-ink-500">
              {source.content.slice(0, 220)}
            </span>
          )}

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
                    if (open) tutupEditor();
                    else setOpen(true);
                  }}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-ink-700 hover:bg-ink-50"
                >
                  <Ikon nama="catat" size={16} className="shrink-0 text-ink-500" />
                  {open ? "Tutup" : "Lihat & edit"}
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

      {konfirmHapus && (
        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3">
          <p className="text-xs leading-relaxed text-red-900">
            Hapus &quot;{source.title}&quot;? Asistenmu langsung lupa isinya dan
            tidak bisa lagi menjawab pertanyaan soal itu.
          </p>
          <div className="mt-2.5 flex gap-2">
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
      )}

      {open && (
        <form action={formAction} className="mt-4 space-y-3 border-t border-ink-100 pt-4">
          <input type="hidden" name="id" value={source.id} />

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

          <div>
            <label className="label" htmlFor={`isi-${source.id}`}>
              Isi lengkapnya
            </label>
            <textarea
              id={`isi-${source.id}`}
              name="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={20}
              className="textarea"
            />
            <p className="hint">
              Ini persis yang dihafal asistenmu. Pisahkan tiap topik dengan baris
              kosong, karena di situlah teksnya dipotong.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
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
                Batalkan perubahan
              </button>
            )}
            {dirty && (
              <span className="text-xs text-amber-700">
                Ada perubahan yang belum disimpan
              </span>
            )}
            {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
            {state?.message && !state.error && (
              <p className="text-sm text-brand-700">{state.message}</p>
            )}
          </div>
        </form>
      )}
    </li>
  );
}

export function KnowledgeList({ sources }: { sources: KnowledgeItemData[] }) {
  if (sources.length === 0) {
    return (
      <div className="card">
        <Kosong
          ikon="info"
          judul="Belum ada info apa-apa"
          kalimat="Tempel daftar harga dan cara pesan lewat kotak di sebelah, biar asistenmu punya bahan menjawab."
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
