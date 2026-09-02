"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { addKnowledgeAction, type KnowledgeState } from "@/app/actions/knowledge";
import { ImportFlow } from "@/components/ImportFlow";
import { DariAiLain } from "@/components/DariAiLain";
import { Ikon, type NamaIkon } from "@/components/Ikon";
import { CONTOH_INFO } from "@/lib/contohInfo";
import { InfoTip } from "@/components/InfoTip";

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
  // Deret contoh sengaja tertutup dulu. Kolom isian yang sudah ditemani satu
  // baris keterangan tidak butuh sepuluh kotak lagi di atasnya sebelum ada
  // yang meminta.
  const [contohBuka, setContohBuka] = useState(false);
  // Yang terakhir dipakai ditandai, supaya orang yang mencoba beberapa contoh
  // tahu yang mana yang sekarang ada di kolomnya.
  const [contohDipakai, setContohDipakai] = useState<string | null>(null);
  const [state, formAction] = useActionState(addKnowledgeAction, {} as KnowledgeState);

  // Lagi mengambil dari sumber luar (website/berkas/AI lain)? Deret "Ketik
  // sendiri / Tanya jawab" cuma jadi gangguan saat itu, jadi disembunyikan.
  const ambilAktif = tab === "website" || tab === "file" || tab === "ai";

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
      <div className="mb-2 mt-4 flex items-center gap-1.5">
        <p className="text-xs font-medium text-ink-600">
          Ambil dari website atau berkas
        </p>
        {/* Jebakan impornya penting, tapi tidak perlu jadi paragraf yang selalu
            terpampang. Dipindah ke lambang info: yang butuh tinggal ketuk. */}
        <InfoTip judul="Sesudah diambil, periksa dulu">
          Pastikan isinya sudah memuat harga, ongkir, jam buka, dan aturan retur.
          Kalau websitemu tidak menyebutnya, tambahin sendiri lewat Ketik
          sendiri. Itu yang paling sering ditanya pelanggan.
        </InfoTip>
      </div>
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

      {/* Deret "Ketik sendiri / Tanya jawab" disembunyikan waktu lagi mengambil
          dari sumber luar, karena saat itu dia cuma gangguan. Diganti satu
          tautan kecil buat balik menulis manual kalau ternyata website tidak
          menyebut harga atau ongkir.

          Jebakan impornya sendiri (tulisan pemasaran panjang yang tidak
          menjawab "berapa harganya" dan malah mendorong keluar data yang
          berguna) tetap dijelaskan, tapi pindah ke lambang info di atas supaya
          tidak jadi paragraf yang selalu terpampang. */}
      {ambilAktif ? (
        <button
          type="button"
          onClick={() => setTab("text")}
          className="mt-3 text-xs font-medium text-brand-700 hover:underline"
        >
          atau ketik sendiri
        </button>
      ) : (
        <>
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
        </>
      )}

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
                  sebagai placeholder yang hilang begitu diketik.

                  Sekarang tombolnya MEMBUKA PILIHAN, bukan langsung mengisi.
                  Contoh tunggal berisi daftar harga kopi mengajarkan dua hal
                  yang salah sekaligus ke pemilik klinik, bengkel, atau
                  sekolah: bahwa produk ini untuk toko, dan bahwa catatannya
                  cukup berisi daftar harga. Padahal yang paling ditanyakan
                  pasien itu jadwal praktik, dan yang paling ditanyakan calon
                  murid itu berkas pendaftaran. */}
              <button
                type="button"
                onClick={() => setContohBuka((b) => !b)}
                aria-expanded={contohBuka}
                className="text-sm font-medium text-brand-700 hover:underline"
              >
                {contohBuka ? "Tutup contoh" : "Pakai contoh"}
              </button>
            </div>

            {/* Deret pilihan bidang usaha. Nama dan ikonnya diturunkan dari
                PRESET, jadi bidang yang ada di layar Asisten selalu ada di
                sini juga, dengan urutan yang sama.

                Satu baris yang bisa digeser, bukan grid yang membungkus:
                sepuluh kotak yang membungkus jadi tiga baris mendorong
                kolom isiannya jauh ke bawah layar HP, dan yang dicari orang
                di layar ini kolom isiannya. */}
            {contohBuka && (
              <div className="anim-naik mb-2.5 rounded-xl border border-ink-200 bg-ink-50 p-3">
                <p className="text-xs leading-relaxed text-ink-600">
                  Pilih yang paling dekat sama usahamu. Isinya cuma contoh
                  bentuk, angkanya karangan, jadi timpa dengan datamu sendiri.
                </p>
                {/* Di HP satu baris yang digeser, di layar lebar dibiarkan
                    membungkus. Sepuluh nama bidang yang membungkus di layar
                    360px jadi enam baris dan mendorong kolom isian keluar
                    layar, padahal kolom isian itu yang dicari orang di sini.
                    Di layar lebar kebalikannya: yang digeser menyembunyikan
                    setengah pilihan di balik tepi kotak, dan tidak ada yang
                    tahu harus menggeser. */}
                <div className="thin-scroll -mx-3 mt-2.5 flex gap-2 overflow-x-auto px-3 pb-1 sm:flex-wrap sm:overflow-visible">
                  {CONTOH_INFO.map((c) => {
                    const aktif = contohDipakai === c.id;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        aria-pressed={aktif}
                        onClick={() => {
                          setIsi(c.isi);
                          setContohDipakai(c.id);
                        }}
                        className={`tap-aman inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-2 text-sm transition-colors ${
                          aktif
                            ? "border-brand-600 bg-brand-600 font-medium text-white"
                            : "border-ink-200 bg-white text-ink-700 hover:border-ink-300"
                        }`}
                      >
                        <Ikon
                          nama={c.ikon}
                          size={15}
                          className={aktif ? "text-white" : "text-ink-400"}
                        />
                        <span className="whitespace-nowrap">{c.nama}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            <textarea
              id="content"
              name="content"
              rows={12}
              className="textarea"
              value={isi}
              onChange={(e) => setIsi(e.target.value)}
              placeholder="Daftar harga dan stok, cara pesan, jam buka, aturan retur, pertanyaan yang sering ditanya."
            />
            {/* Keterangan ini ada karena contoh di atas cuma bisa mengajarkan
                BENTUKNYA, tidak bisa mengajarkan seberapa banyak.

                Contoh yang isinya empat baris diam-diam mengajarkan bahwa empat
                baris itu cukup, dan orang berhenti di situ. Lalu pelanggannya
                menanyakan barang kelima dan asistennya tidak punya jawabannya.

                Pelanggan sungguhan 10 Agustus 2026 menempelkan 842 baris hasil
                ekspor Excel, dan itu justru yang paling benar. Tapi dia harus
                menebak sendiri bahwa itu boleh, karena tidak ada satu kalimat
                pun di layar ini yang mengatakannya. Yang lain berhenti di lima
                baris karena mengira daftar panjang bikin asistennya bingung. */}
            <p className="mt-2 text-xs leading-relaxed text-ink-500">
              Tulis <strong className="font-medium text-ink-700">semua</strong>{" "}
              barang atau layananmu, satu baris satu item, lengkap dengan
              harganya. Daftar panjang justru bagus, ratusan baris tidak apa-apa.
              Kalau datamu sudah ada di Excel atau Google Sheets, salin saja
              kolomnya lalu tempel di sini apa adanya.
            </p>
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
