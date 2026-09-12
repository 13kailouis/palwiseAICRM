"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  sinkronSheetAction,
  tambahSheetAction,
  type KnowledgeState,
} from "@/app/actions/knowledge";
import {
  pasangSheetPelangganAction,
  putuskanSheetPelangganAction,
  salinSekarangAction,
  type SambunganState,
} from "@/app/actions/sambungan";
import { Ikon } from "@/components/Ikon";
import { InfoTip } from "@/components/InfoTip";
import { salinTeks } from "@/lib/salin";

function Kirim({ label, sibuk, kelas = "btn-primary" }: { label: string; sibuk: string; kelas?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={kelas} disabled={pending}>
      {pending ? sibuk : label}
    </button>
  );
}

function Kabar({ state }: { state: KnowledgeState | SambunganState }) {
  if (state?.error) {
    return <p className="text-sm leading-relaxed text-red-600">{state.error}</p>;
  }
  if (state?.message) {
    return <p className="text-sm leading-relaxed text-brand-700">{state.message}</p>;
  }
  return null;
}

/**
 * Alamat email robot, dengan tombol salin.
 *
 * Alamat akun layanan Google itu panjang dan tidak bisa diingat
 * ("palwise@proyek-123.iam.gserviceaccount.com"), jadi mengetik ulang pasti
 * salah satu huruf. Satu-satunya cara yang masuk akal: salin, tempel.
 */
export function SalinEmail({ email }: { email: string }) {
  const [tersalin, setTersalin] = useState(false);
  return (
    <span className="mt-1.5 flex max-w-full items-center gap-2 rounded-lg border border-ink-200 bg-ink-50 py-1 pl-3 pr-1">
      <span className="min-w-0 flex-1 truncate font-mono text-xs text-ink-800">{email}</span>
      <button
        type="button"
        onClick={async () => {
          if (await salinTeks(email)) {
            setTersalin(true);
            setTimeout(() => setTersalin(false), 2000);
          }
        }}
        className="tap-aman inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-brand-700 hover:bg-white"
      >
        <Ikon nama={tersalin ? "centang" : "salin"} size={13} />
        {tersalin ? "Tersalin" : "Salin"}
      </button>
    </span>
  );
}

function Langkah({ no, children }: { no: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-ink-900 text-xs font-semibold text-white">
        {no}
      </span>
      <span className="min-w-0 flex-1 pt-0.5 text-sm leading-relaxed text-ink-700">{children}</span>
    </li>
  );
}

/**
 * Tab "Google Sheet" di kotak Tambah info.
 *
 * Langkahnya ditulis sebagai tiga nomor, bukan paragraf. Yang paling sering
 * membuat ini gagal adalah langkah Bagikan, dan langkah yang tenggelam di
 * tengah paragraf akan dilewati.
 */
export function TambahSheet({ agentId, robot }: { agentId: string; robot: string | null }) {
  const [state, formAction] = useActionState(tambahSheetAction, {} as KnowledgeState);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="agentId" value={agentId} />

      <ol className="space-y-3">
        <Langkah no={1}>
          Buka Sheet stok atau daftar hargamu. Nggak perlu dirapikan dulu:
          judul di baris mana pun, sel digabung, atau ada nama bagian, semua
          terbaca.
        </Langkah>
        <Langkah no={2}>
          Tekan <strong className="font-medium text-ink-900">Bagikan</strong>, lalu
          ubah Akses umum jadi{" "}
          <strong className="font-medium text-ink-900">Siapa saja yang memiliki link</strong>.
          {robot && (
            <>
              {" "}Kalau Sheet-nya mau tetap pribadi, tambahkan email ini sebagai
              Pelihat:
              <SalinEmail email={robot} />
            </>
          )}
        </Langkah>
        <Langkah no={3}>Salin alamat Sheet dari browser, tempel di bawah.</Langkah>
      </ol>

      <div>
        <label className="label" htmlFor="sheet-url">
          Tautan Google Sheet
        </label>
        <input
          id="sheet-url"
          name="url"
          type="url"
          inputMode="url"
          className="input"
          placeholder="https://docs.google.com/spreadsheets/d/..."
          required
        />
        <p className="hint flex items-start gap-1.5">
          <span>Tab yang sedang dibuka yang dipakai. Diperbarui otomatis tiap 30 menit.</span>
          <InfoTip judul="Kenapa pakai Sheet">
            Stok dan harga yang kamu ubah di Sheet ikut sampai ke asistenmu
            tanpa perlu ditempel ulang. Jadi asisten tidak lagi bilang barang
            ada padahal sudah habis. Kolom seperti harga modal, HPP, atau
            pemasok otomatis disembunyikan dari asisten, jadi tidak pernah
            sampai ke pembeli. Kalau punya beberapa tab, sambungkan satu per
            satu, tiap tab jadi satu catatan.
          </InfoTip>
        </p>
      </div>

      <div>
        <label className="label mb-1 text-ink-600" htmlFor="sheet-judul">
          Judul <span className="font-normal text-ink-400">(opsional)</span>
        </label>
        <input
          id="sheet-judul"
          name="title"
          className="input"
          placeholder="Kalau kosong, pakai nama Sheet-nya"
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Kirim label="Sambungkan" sibuk="Lagi membaca Sheet" />
        <Kabar state={state} />
      </div>
    </form>
  );
}

/** Tombol "Perbarui sekarang" untuk satu catatan dari Sheet. */
export function PerbaruiSheet({ id, kecil = false }: { id: string; kecil?: boolean }) {
  const [state, formAction] = useActionState(sinkronSheetAction, {} as KnowledgeState);
  return (
    <form action={formAction} className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <input type="hidden" name="id" value={id} />
      <Kirim
        label="Perbarui sekarang"
        sibuk="Lagi membaca Sheet"
        kelas={kecil ? "btn-ghost px-3 py-1.5 text-xs" : "btn-ink"}
      />
      <Kabar state={state} />
    </form>
  );
}

/** Pasang atau ganti Sheet tujuan data pelanggan. */
export function PasangPelanggan({ robot, ganti = false }: { robot: string; ganti?: boolean }) {
  const [state, formAction] = useActionState(pasangSheetPelangganAction, {} as SambunganState);
  return (
    <form action={formAction} className="space-y-4">
      <ol className="space-y-3">
        <Langkah no={1}>
          Buat Sheet baru di Google Sheets, atau buka Sheet yang sudah kamu pakai.
        </Langkah>
        <Langkah no={2}>
          Tekan <strong className="font-medium text-ink-900">Bagikan</strong>, tambahkan
          email ini, pilih <strong className="font-medium text-ink-900">Editor</strong>:
          <SalinEmail email={robot} />
        </Langkah>
        <Langkah no={3}>Salin alamat Sheet dari browser, tempel di bawah.</Langkah>
      </ol>
      <div>
        <label className="label" htmlFor="pelanggan-url">
          Tautan Google Sheet
        </label>
        <input
          id="pelanggan-url"
          name="url"
          type="url"
          inputMode="url"
          className="input"
          placeholder="https://docs.google.com/spreadsheets/d/..."
          required
        />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Kirim label={ganti ? "Ganti Sheet" : "Sambungkan"} sibuk="Lagi menyalin" />
        <Kabar state={state} />
      </div>
    </form>
  );
}

export function SalinSekarang() {
  const [state, formAction] = useActionState(salinSekarangAction, {} as SambunganState);
  return (
    <form action={formAction} className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <Kirim label="Salin sekarang" sibuk="Lagi menyalin" kelas="btn-ink" />
      <Kabar state={state} />
    </form>
  );
}

/**
 * Putuskan, dua tekan. Tidak menghapus apa pun di Sheet-nya, dan kalimat
 * konfirmasinya menyebut itu, karena "putuskan" gampang terbaca sebagai
 * "hapus datanya".
 */
export function PutuskanPelanggan() {
  const [yakin, setYakin] = useState(false);
  if (!yakin) {
    return (
      <button
        type="button"
        onClick={() => setYakin(true)}
        className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50"
      >
        Putuskan
      </button>
    );
  }
  return (
    <div className="w-full rounded-xl border border-red-200 bg-red-50 p-3">
      <p className="text-sm leading-relaxed text-ink-800">
        Palwise berhenti memperbarui Sheet itu. Isi yang sudah tersalin tetap ada
        di Sheet-mu, tidak dihapus.
      </p>
      <div className="mt-2 flex gap-2">
        <form action={putuskanSheetPelangganAction}>
          <button
            type="submit"
            className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
          >
            Ya, putuskan
          </button>
        </form>
        <button
          type="button"
          onClick={() => setYakin(false)}
          className="rounded-lg border border-ink-200 bg-white px-3 py-1.5 text-xs text-ink-700 hover:bg-ink-50"
        >
          Batal
        </button>
      </div>
    </div>
  );
}
