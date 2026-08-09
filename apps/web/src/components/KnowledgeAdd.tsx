"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { addKnowledgeAction, type KnowledgeState } from "@/app/actions/knowledge";
import { ImportFlow } from "@/components/ImportFlow";
import { DariAiLain } from "@/components/DariAiLain";
import { Ikon, type NamaIkon } from "@/components/Ikon";

type Tab = "text" | "qna" | "file" | "website" | "ai";

/**
 * Lima pilihan dulu berjejer jadi satu baris yang membungkus ke baris kedua.
 * Itu merusak kelompoknya: dua yang terdorong ke bawah kelihatan seperti
 * pilihan kelas dua, padahal setara.
 *
 * Sekarang dipisah menurut pekerjaannya, bukan cuma supaya muat. Dua yang
 * pertama itu MENULIS sendiri, tiga sisanya MENGAMBIL dari tempat yang sudah
 * ada. Dua jenis pekerjaan yang berbeda memang pantas dipisah, dan kebetulan
 * jadi muat.
 */
const TULIS: { id: Tab; label: string }[] = [
  { id: "text", label: "Ketik sendiri" },
  { id: "qna", label: "Tanya jawab" },
];

/**
 * Website duluan, dan dia satu-satunya yang diberi tanda "Paling cepat".
 *
 * Alasannya bukan karena jalur ini paling banyak dikerjakan di kode (walau
 * memang begitu), tapi karena selisih usahanya untuk PEMILIKNYA paling besar:
 * satu alamat website menghasilkan puluhan ribu huruf dalam satu tekan, dan
 * kalau tidak dia harus mengetik semuanya sendiri. Info bisnis yang kosong itu
 * tempat orang paling sering menyerah, jadi jalur yang paling sedikit
 * usahanya pantas dilihat paling dulu.
 *
 * Dulu tiga pilihan ini duduk di bawah label "Atau ambil dari" dengan huruf
 * kecil, jadi terbaca sebagai pilihan kelas dua dan gampang tidak terlihat.
 *
 * TAPI TIDAK JADI DEFAULT, dan itu keputusan. Banyak pemilik usaha di Indonesia
 * tidak punya website: warung, bengkel, klinik kecil, dan penjual yang jualannya
 * cuma lewat Instagram dan WhatsApp. Kalau panel ini terbuka langsung meminta
 * alamat website, mereka menabrak dinding di langkah paling pertama, dan
 * "Ketik sendiri" berubah jadi jalan alternatif yang harus dicari. Menyarankan
 * itu menaruhnya paling depan, bukan menutup jalan yang lain.
 */
const AMBIL: { id: Tab; label: string; ikon: NamaIkon; saran?: string }[] = [
  { id: "website", label: "Website", ikon: "website", saran: "Paling cepat" },
  { id: "file", label: "Berkas", ikon: "berkas" },
  { id: "ai", label: "AI lain", ikon: "salin" },
];


/**
 * Contoh isi, dipakai tombol "Pakai contoh".
 *
 * Dulu teks ini jadi placeholder textarea. Itu keliru karena tiga hal:
 * placeholder sengaja dibuat pudar supaya tidak tertukar dengan isian, jadi
 * susah dibaca; dia hilang tepat waktu orang mulai mengetik, padahal justru
 * saat itu contohnya paling dibutuhkan; dan kotak kosong yang penuh tulisan
 * kelihatan seperti sudah terisi kalau dilihat sekilas.
 *
 * Sebagai tombol, contohnya benar-benar masuk ke kolomnya, lalu tinggal
 * ditimpa. Itu yang sebenarnya dimau orang waktu melihat contoh.
 */
const CONTOH_ISI = [
  "DAFTAR HARGA",
  "Arabika Gayo 200gr, Rp 85.000",
  "Robusta Temanggung 200gr, Rp 55.000",
  "",
  "PENGIRIMAN",
  "Dikirim dari Bandung pakai JNE atau J&T.",
  "Gratis ongkir kalau belanja di atas Rp 300.000.",
  "",
  "JAM BUKA",
  "Senin sampai Sabtu, 09.00 sampai 17.00.",
].join("\n");

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      {pending ? "Lagi dihafalkan" : "Simpan"}
    </button>
  );
}

export function KnowledgeAdd({
  agentId,
  namaBisnis,
}: {
  agentId: string;
  namaBisnis: string;
}) {
  const [tab, setTab] = useState<Tab>("text");
  // Isi textarea dipegang di sini supaya tombol "Pakai contoh" bisa mengisinya.
  const [isi, setIsi] = useState("");
  const [state, formAction] = useActionState(addKnowledgeAction, {} as KnowledgeState);

  return (
    <div className="card p-5">
      <h2 className="font-semibold text-ink-900">Tambah info</h2>
      <p className="mt-1 text-sm text-ink-500">
        Makin lengkap info yang kamu kasih, makin jarang asistenmu salah jawab.
      </p>

      {/* Yang MENGAMBIL naik ke atas, yang MENULIS turun ke bawah.

          Urutan di layar itu saran yang paling kuat, jauh lebih kuat daripada
          kalimat apa pun. Selama tiga pilihan ini ada di bawah dengan label
          "Atau ambil dari", orang yang punya website tetap mulai dengan mengetik
          manual, karena itu yang dilihatnya pertama.

          Labelnya juga diganti dari "Atau ambil dari" jadi kalimat yang menyebut
          keuntungannya, karena "atau" itu kata yang membuat pilihan terdengar
          seperti pengganti, bukan seperti yang disarankan. */}
      <p className="mb-2 mt-4 text-xs font-medium text-ink-600">
        Punya website? Ambil dari situ, sekali tekan langsung banyak
      </p>
      <div className="flex flex-wrap gap-2">
        {AMBIL.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`tap-aman inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm transition ${
              tab === t.id
                ? "border-ink-900 bg-ink-900 font-medium text-white"
                : "border-ink-200 text-ink-700 hover:border-ink-300"
            }`}
          >
            <Ikon nama={t.ikon} size={15} className="shrink-0" />
            {t.label}
            {/* Tandanya cuma di satu pilihan. Kalau tiga-tiganya ditandai,
                tidak ada yang disarankan. */}
            {t.saran && (
              <span
                className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${
                  tab === t.id ? "bg-white/20 text-white" : "bg-ink-100 text-ink-600"
                }`}
              >
                {t.saran}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Jebakan yang perlu disebut TEPAT DI SINI, bukan di halaman panduan.

          Website itu tulisan pemasaran, dan pemasaran jarang memuat hal yang
          benar-benar ditanyakan pelanggan: harga persis, aturan ongkir, jam
          buka, aturan retur. Jadi satu impor bisa menghasilkan tiga puluh ribu
          huruf yang isinya "visi kami" dan tetap tidak bisa menjawab "berapa
          harganya".

          Dan itu bukan cuma sia-sia, tapi merugikan: pencarian cuma mengambil
          lima potongan paling mirip per pertanyaan, jadi tumpukan tulisan
          pemasaran justru MENDORONG KELUAR potongan yang berguna. Info bisnis
          500 huruf berisi daftar harga mengalahkan 30.000 huruf berisi profil
          perusahaan.

          Ditulis di bawah tombolnya, bukan sesudah impornya selesai, supaya
          orangnya tahu harus memeriksa apa sebelum dia merasa pekerjaannya
          sudah beres. */}
      <p className="mt-2 text-xs leading-relaxed text-ink-500">
        Sesudah diambil, cek isinya sudah memuat harga, ongkir, jam buka, dan
        aturan retur. Kalau websitemu tidak menyebut itu, tambahin sendiri lewat{" "}
        <button
          type="button"
          onClick={() => setTab("text")}
          className="font-medium text-brand-700 hover:underline"
        >
          Ketik sendiri
        </button>
        . Itu yang paling sering ditanya pelanggan.
      </p>

      <p className="mb-2 mt-5 text-xs text-ink-500">Atau tulis sendiri</p>
      <div className="grid grid-cols-2 gap-1 rounded-lg bg-ink-100 p-1">
        {TULIS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`tap-aman justify-center rounded-md px-3 py-2 text-sm transition ${
              tab === t.id
                ? "bg-white font-medium text-ink-900 shadow-sm"
                : "text-ink-600 hover:text-ink-900"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab website dan file punya alurnya sendiri: baca dulu, periksa
          hasilnya, baru simpan. Jadi keduanya tidak ikut form di bawah. */}
      {(tab === "website" || tab === "file") && (
        <div className="mt-5">
          <ImportFlow key={tab} agentId={agentId} mode={tab} />
        </div>
      )}

      {tab === "ai" && (
        <div className="mt-5">
          <DariAiLain agentId={agentId} namaBisnis={namaBisnis} />
        </div>
      )}

      {tab !== "website" && tab !== "file" && tab !== "ai" && (
      <form action={formAction} className="mt-5 space-y-4">
        <input type="hidden" name="type" value={tab} />
        <input type="hidden" name="agentId" value={agentId} />

        {/* Isinya duluan, judulnya belakangan.
            Judul boleh dikosongkan, jadi menaruhnya paling atas memaksa orang
            berhenti memikirkan hal yang tidak penting sebelum sampai ke hal
            yang penting. Yang wajib dikerjakan lebih dulu, yang opsional
            menyusul. */}
        {tab === "text" && (
          <div>
            <div className="mb-1.5 flex items-end justify-between gap-3">
              <label className="label mb-0" htmlFor="content">
                Isinya
              </label>
              {/* Contohnya benar-benar masuk ke kolomnya, bukan cuma dibayangi
                  sebagai placeholder yang hilang begitu diketik. */}
              <button
                type="button"
                onClick={() => setIsi(CONTOH_ISI)}
                className="text-sm font-medium text-brand-700 hover:underline"
              >
                Pakai contoh
              </button>
            </div>
            <textarea
              id="content"
              name="content"
              rows={12}
              className="textarea"
              value={isi}
              onChange={(e) => setIsi(e.target.value)}
              placeholder="Daftar harga, cara pesan, jam buka, aturan retur, pertanyaan yang sering ditanya."
            />
          </div>
        )}

        {tab === "qna" && (
          <>
            <div>
              <label className="label" htmlFor="question">
                Pertanyaannya
              </label>
              <input
                id="question"
                name="question"
                className="input"
                placeholder="Hari Minggu buka jam berapa?"
              />
            </div>
            <div>
              <label className="label" htmlFor="answer">
                Jawabannya
              </label>
              <textarea
                id="answer"
                name="answer"
                rows={4}
                className="input resize-y"
                placeholder="Buka jam 9 pagi sampai jam 3 sore."
              />
            </div>
          </>
        )}

        {/* Opsional, jadi ditaruh belakangan dan ditulis lebih pelan.
            Kolom yang boleh dilewati tidak boleh tampil sekeras kolom yang
            wajib, kalau tidak orang mengira dua-duanya harus diisi. */}
        <div>
          <label className="label mb-1 text-ink-600" htmlFor="title">
            Judul <span className="font-normal text-ink-400">(opsional)</span>
          </label>
          <input
            id="title"
            name="title"
            className="input"
            placeholder="Misalnya: Daftar harga produk"
          />
        </div>

        <div className="flex items-center gap-3">
          <Submit />
          {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
          {state?.message && !state.error && (
            <p className="text-sm text-brand-700">{state.message}</p>
          )}
        </div>
      </form>
      )}
    </div>
  );
}
