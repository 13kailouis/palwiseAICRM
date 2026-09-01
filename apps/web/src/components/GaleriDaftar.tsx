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
import { Ikon } from "@/components/Ikon";

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

function Kartu({ berkas }: { berkas: BerkasData }) {
  const [buka, setBuka] = useState(false);
  const [menu, setMenu] = useState(false);
  const [konfirmHapus, setKonfirmHapus] = useState(false);
  const [state, formAction] = useActionState(ubahBerkasAction, {} as GaleriState);

  return (
    <li className="card overflow-hidden">
      <div className="flex gap-3 p-3 sm:gap-4 sm:p-4">
        {/* Ubah dibuka dengan mengetuk gambar atau namanya, seperti daftar di
            app galeri biasa. */}
        <button
          type="button"
          onClick={() => setBuka((v) => !v)}
          aria-label={`Ubah ${berkas.name}`}
          className="h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-ink-200 bg-ink-50 sm:h-24 sm:w-24"
        >
          {berkas.kind === "image" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/api/media/${encodeURIComponent(berkas.fileName)}`}
              alt={berkas.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="grid h-full place-items-center text-ink-400">
              <Ikon nama="berkas" size={26} />
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setBuka((v) => !v)}
          className="min-w-0 flex-1 text-left"
        >
          <span className="flex flex-wrap items-center gap-2">
            <span className="badge bg-ink-100 text-ink-600">
              {LABEL_JENIS[berkas.kind] ?? berkas.kind}
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
          </span>
          <span className="mt-1.5 line-clamp-1 font-medium text-ink-900">
            {berkas.name}
          </span>
          <span className="mt-1 line-clamp-2 text-sm leading-relaxed text-ink-500">
            Dikirim kalau {berkas.description}
          </span>
          {berkas.readStatus === "none" && berkas.kind === "image" && (
            <span className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-amber-700">
              Isinya belum dibaca, jadi asistenmu bisa mengirim gambar ini tapi
              belum tahu tulisan di dalamnya.
            </span>
          )}
          {berkas.readError && (
            <span className="mt-1.5 block rounded bg-red-50 px-2 py-1 text-xs text-red-700">
              {berkas.readError}
            </span>
          )}
        </button>

        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setMenu((v) => !v)}
            aria-label="Aksi berkas"
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
              <div className="anim-naik absolute right-0 top-full z-50 mt-1 w-44 overflow-hidden rounded-xl border border-ink-200 bg-white py-1 shadow-[0_8px_24px_-8px_rgba(15,15,15,0.25)]">
                <button
                  type="button"
                  onClick={() => {
                    setMenu(false);
                    setBuka((v) => !v);
                  }}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-ink-700 hover:bg-ink-50"
                >
                  <Ikon nama="catat" size={16} className="shrink-0 text-ink-500" />
                  {buka ? "Tutup" : "Ubah"}
                </button>
                {berkas.kind === "image" && (
                  <form action={bacaIsiBerkasAction}>
                    <input type="hidden" name="id" value={berkas.id} />
                    <button
                      type="submit"
                      onClick={() => setMenu(false)}
                      className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-ink-700 hover:bg-ink-50"
                    >
                      <Ikon nama="info" size={16} className="shrink-0 text-ink-500" />
                      {berkas.readStatus === "ready" ? "Baca ulang" : "Baca isinya"}
                    </button>
                  </form>
                )}
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
        <div className="border-t border-ink-100 bg-red-50/60 p-3 sm:p-4">
          <p className="text-xs leading-relaxed text-red-900">
            Hapus &quot;{berkas.name}&quot;? Berkasnya ikut hilang dari
            penyimpanan
            {berkas.readStatus === "ready"
              ? ", begitu juga catatan hasil bacaannya di Info bisnis."
              : "."}
          </p>
          <div className="mt-2.5 flex gap-2">
            <form action={hapusBerkasAction}>
              <input type="hidden" name="id" value={berkas.id} />
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
          kalimat="Unggah foto barang, menu, atau daftar harga lewat kotak Tambah gambar, nanti asistenmu yang mengirimnya."
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
