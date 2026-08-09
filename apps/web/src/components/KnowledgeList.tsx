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
import { TombolHapus } from "@/components/TombolHapus";

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

function KnowledgeItem({ source }: { source: KnowledgeItemData }) {
  const [open, setOpen] = useState(false);
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
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
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
          </div>

          {/* Judulnya juga tombol buka-tutup, jadi dia harus lewat penjaga
              yang sama. Kalau tidak, satu klik di sini tetap membuang
              suntingan yang belum disimpan tanpa bertanya. */}
          <button
            type="button"
            onClick={() => (open ? tutupEditor() : setOpen(true))}
            className="mt-2 block w-full text-left"
          >
            <span className="font-medium text-ink-900 hover:text-brand-700">
              {source.title}
            </span>
            {!open && (
              <span className="mt-1 line-clamp-2 block text-sm leading-relaxed text-ink-500">
                {source.content.slice(0, 220)}
              </span>
            )}
          </button>

          {source.error && (
            <p className="mt-2 rounded bg-red-50 px-2 py-1 text-xs text-red-700">
              {source.error}
            </p>
          )}
          <p className="mt-2 text-xs text-ink-400">
            Ditambahkan {source.addedLabel}
          </p>
        </div>

        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => (open ? tutupEditor() : setOpen(true))}
            className="btn-ghost px-3 py-1.5 text-xs"
          >
            {open ? "Tutup" : "Lihat & edit"}
          </button>
          <form action={reindexKnowledgeAction}>
            <input type="hidden" name="id" value={source.id} />
            <button type="submit" className="btn-ghost px-3 py-1.5 text-xs">
              Hafalkan lagi
            </button>
          </form>
          <TombolHapus
            action={deleteKnowledgeAction}
            fields={{ id: source.id }}
            konfirmasi={`Hapus "${source.title}"? Asistenmu langsung lupa isinya dan tidak bisa lagi menjawab pertanyaan soal itu.`}
          />
        </div>
      </div>

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
