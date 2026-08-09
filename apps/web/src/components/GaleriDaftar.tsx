"use client";

import { Kosong } from "@/components/Kosong";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  bacaIsiBerkasAction,
  hapusBerkasAction,
  ubahBerkasAction,
  type GaleriState,
} from "@/app/actions/galeri";
import { TombolHapus } from "@/components/TombolHapus";

export interface BerkasData {
  id: string;
  code: string;
  name: string;
  description: string;
  fileName: string;
  kind: string;
  sizeBytes: number;
  sentCount: number;
  readStatus: string;
  readError: string | null;
}

const BACAAN: Record<string, { teks: string; kelas: string }> = {
  ready: { teks: "isinya dihafal", kelas: "bg-brand-50 text-brand-700" },
  pending: { teks: "sedang dibaca", kelas: "bg-amber-50 text-amber-700" },
  error: { teks: "gagal dibaca", kelas: "bg-red-50 text-red-700" },
};

const LABEL_JENIS: Record<string, string> = {
  image: "Gambar",
  video: "Video",
  document: "Berkas",
};

function Simpan() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary px-3 py-1.5 text-xs" disabled={pending}>
      {pending ? "Menyimpan" : "Simpan"}
    </button>
  );
}

function Kartu({ berkas }: { berkas: BerkasData }) {
  const [buka, setBuka] = useState(false);
  const [state, formAction] = useActionState(ubahBerkasAction, {} as GaleriState);

  return (
    <li className="card overflow-hidden">
      <div className="flex gap-4 p-4">
        <div className="h-24 w-24 shrink-0 overflow-hidden rounded-lg border border-ink-200 bg-ink-50">
          {berkas.kind === "image" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/api/media/${encodeURIComponent(berkas.fileName)}`}
              alt={berkas.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="grid h-full place-items-center text-xs text-ink-400">
              {LABEL_JENIS[berkas.kind] ?? "Berkas"}
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="badge bg-ink-100 text-ink-600">
              {LABEL_JENIS[berkas.kind] ?? berkas.kind}
            </span>
            <span className="text-xs text-ink-400">
              {(berkas.sizeBytes / 1024).toFixed(0)} KB
            </span>
            {berkas.sentCount > 0 && (
              <span className="badge bg-ink-100 text-ink-600">
                dikirim {berkas.sentCount}x
              </span>
            )}
            {BACAAN[berkas.readStatus] && (
              <span className={`badge ${BACAAN[berkas.readStatus].kelas}`}>
                {BACAAN[berkas.readStatus].teks}
              </span>
            )}
          </div>
          <p className="mt-1.5 truncate font-medium text-ink-900">{berkas.name}</p>
          <p className="mt-1 text-sm leading-relaxed text-ink-500">
            Dikirim kalau {berkas.description}
          </p>
          {berkas.readStatus === "none" && berkas.kind === "image" && (
            <p className="mt-1.5 text-xs leading-relaxed text-amber-700">
              Isinya belum dibaca, jadi asistenmu bisa mengirim gambar ini tapi
              belum tahu tulisan di dalamnya.
            </p>
          )}
          {berkas.readError && (
            <p className="mt-1.5 rounded bg-red-50 px-2 py-1 text-xs text-red-700">
              {berkas.readError}
            </p>
          )}
        </div>

        <div className="flex shrink-0 flex-col gap-2">
          <button
            type="button"
            onClick={() => setBuka((v) => !v)}
            className="btn-ghost px-3 py-1.5 text-xs"
          >
            {buka ? "Tutup" : "Ubah"}
          </button>
          {berkas.kind === "image" && (
            <form action={bacaIsiBerkasAction}>
              <input type="hidden" name="id" value={berkas.id} />
              <button type="submit" className="btn-ghost w-full px-3 py-1.5 text-xs">
                {berkas.readStatus === "ready" ? "Baca ulang" : "Baca isinya"}
              </button>
            </form>
          )}
          <TombolHapus
            action={hapusBerkasAction}
            fields={{ id: berkas.id }}
            penuh
            konfirmasi={
              `Hapus "${berkas.name}"? Berkasnya ikut hilang dari penyimpanan` +
              (berkas.readStatus === "ready"
                ? ", begitu juga catatan hasil bacaannya di Info bisnis."
                : ".")
            }
          />
        </div>
      </div>

      {buka && (
        <form
          action={formAction}
          className="space-y-3 border-t border-ink-100 bg-ink-50/50 p-4"
        >
          <input type="hidden" name="id" value={berkas.id} />
          <div>
            <label className="label" htmlFor={`nama-${berkas.id}`}>
              Judul
            </label>
            <input
              id={`nama-${berkas.id}`}
              name="name"
              defaultValue={berkas.name}
              className="input"
            />
          </div>
          <div>
            <label className="label" htmlFor={`ket-${berkas.id}`}>
              Kapan ini pantas dikirim
            </label>
            <textarea
              id={`ket-${berkas.id}`}
              name="description"
              rows={2}
              defaultValue={berkas.description}
              className="input resize-y"
            />
          </div>
          <div className="flex items-center gap-3">
            <Simpan />
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

export function GaleriDaftar({ berkas }: { berkas: BerkasData[] }) {
  if (berkas.length === 0) {
    return (
      <div className="card">
        <Kosong
          ikon="gambar"
          judul="Belum ada gambar"
          kalimat="Unggah foto barang, menu, atau daftar harga lewat kotak di sebelah, nanti asistenmu yang mengirimnya."
        />
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {berkas.map((b) => (
        <Kartu key={b.id} berkas={b} />
      ))}
    </ul>
  );
}
