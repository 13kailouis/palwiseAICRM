"use client";

import { useActionState, useState } from "react";
import { IsiBesar, TombolBesar } from "@/components/IsiBesar";
import { salinTeks } from "@/lib/salin";
import { useFormStatus } from "react-dom";
import { addKnowledgeAction, type KnowledgeState } from "@/app/actions/knowledge";

/**
 * Perintah yang ditempel pengguna ke AI lain.
 *
 * Empat hal yang menentukan hasilnya:
 * 1. Nama bisnis disebut, karena orang sering cerita beberapa usaha ke AI yang
 *    sama dan tanpa ini AI-nya mencampur semuanya.
 * 2. Dilarang menambah fakta. Tanpa aturan ini AI lain "membantu" melengkapi
 *    dengan pengetahuan umum, lalu asisten menjawab pakai harga karangan.
 * 3. Hasilnya dibungkus blok kode, jadi batasnya jelas dan gampang disalin.
 * 4. Ditanya apakah sudah lengkap, karena pengetahuan yang banyak pasti
 *    terpotong dan pengguna tidak akan sadar.
 */
function buatPerintah(namaBisnis: string): string {
  const nama = namaBisnis.trim() || "(isi nama bisnismu)";

  return `Aku mau memindahkan semua yang kamu tahu tentang bisnisku ke sistem lain.

Nama bisnisnya: ${nama}

Kalau di percakapan kita aku pernah membahas lebih dari satu usaha, ambil HANYA yang bernama ${nama}. Abaikan yang lain.

Kumpulkan semua yang pernah aku ceritakan tentang bisnis itu dari seluruh percakapan kita, lalu susun ulang jadi satu catatan.

## Aturan
1. Pertahankan kata-kataku apa adanya sebisa mungkin, terutama untuk harga, nama produk, dan aturan toko.
2. Hanya tulis yang benar-benar pernah aku sebutkan. Jangan menambah, jangan menebak, jangan melengkapi dengan pengetahuan umum.
3. Kalau suatu bagian tidak pernah kita bahas, lewati saja bagiannya. Jangan menulis "tidak diketahui".
4. Pakai kata-kata yang biasa dipakai pelanggan, bukan istilah internal.
5. Pisahkan tiap bagian dengan satu baris kosong.

## Bagian, tulis berurutan seperti ini
1. TENTANG USAHA — apa yang dijual, sejak kapan, lokasinya di mana.
2. PRODUK DAN HARGA — satu baris per produk: nama, harga, keterangan singkat.
3. CARA PESAN — langkahnya dari pelanggan bertanya sampai barang dikirim.
4. PENGIRIMAN — kurir, jangkauan, ongkir, berapa lama sampai.
5. PEMBAYARAN — cara bayar yang diterima, kapan pesanan diproses.
6. ATURAN TOKO — retur, garansi, komplain, jam buka, hari libur.
7. PERTANYAAN YANG SERING DITANYA — tulis "T:" lalu "J:" di baris berikutnya.

## Keluaran
- Bungkus seluruh hasilnya dalam satu blok kode supaya gampang disalin.
- Setelah blok kode itu, bilang apakah ini sudah lengkap atau masih ada sisanya.`;
}

const LANGKAH = [
  "Buka ChatGPT, Claude, atau Gemini yang selama ini kamu pakai ngobrolin bisnismu",
  "Buka obrolan lamanya, jangan buka obrolan baru",
  "Tempel perintah di bawah, lalu kirim",
  "Salin isi blok kodenya, tempel ke kotak paling bawah",
  "Kalau dia bilang masih ada sisanya, ketik “lanjutkan” lalu tempel sambungannya juga",
];

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary" disabled={pending}>
      {pending ? "Lagi dihafalkan" : "Simpan"}
    </button>
  );
}

export function DariAiLain({
  agentId,
  namaBisnis,
}: {
  agentId: string;
  namaBisnis: string;
}) {
  const [state, formAction] = useActionState(addKnowledgeAction, {} as KnowledgeState);
  const [nama, setNama] = useState(namaBisnis);
  const [tempelan, setTempelan] = useState("");
  const [besarBuka, setBesarBuka] = useState(false);
  const [tersalin, setTersalin] = useState(false);
  const [gagalSalin, setGagalSalin] = useState(false);

  const perintah = buatPerintah(nama);

  async function salin() {
    // Jalan cadangannya penting di sini: alamat LAN tanpa HTTPS tidak punya
    // penyalin bawaan browser sama sekali, dan perintah ini panjang untuk
    // diblok manual di layar HP.
    const berhasil = await salinTeks(perintah);
    setGagalSalin(!berhasil);
    setTersalin(berhasil);
    if (berhasil) setTimeout(() => setTersalin(false), 2500);
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-ink-200 bg-ink-50/60 p-3">
        <p className="text-sm font-medium text-ink-800">
          Sudah pernah cerita soal bisnismu ke AI lain?
        </p>
        <p className="mt-1 text-xs leading-relaxed text-ink-500">
          Pindahkan saja ke sini, tidak usah ngetik ulang. Kalau belum pernah,
          pakai tab &ldquo;Ketik sendiri&rdquo; saja karena AI-nya belum punya apa
          pun untuk diceritakan.
        </p>
      </div>

      <div>
        <label className="label" htmlFor="nama-bisnis">
          Nama bisnis yang mau diambil
        </label>
        <input
          id="nama-bisnis"
          value={nama}
          onChange={(e) => setNama(e.target.value)}
          className="input"
          placeholder="Kopi Nusantara"
        />
        <p className="hint">
          Penting kalau kamu pernah cerita beberapa usaha ke AI yang sama. Tanpa
          ini dia bisa mencampur semuanya jadi satu.
        </p>
      </div>

      <ol className="space-y-2">
        {LANGKAH.map((l, i) => (
          <li key={l} className="flex gap-2.5 text-sm text-ink-700">
            <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-ink-100 text-[11px] font-medium text-ink-600">
              {i + 1}
            </span>
            {l}
          </li>
        ))}
      </ol>

      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-sm font-medium text-ink-800">Perintahnya</span>
          <button type="button" onClick={salin} className="btn-ghost px-3 py-1 text-xs">
            {tersalin ? "Tersalin" : "Salin"}
          </button>
        </div>
        {/* Perintahnya panjang sekali, jadi gagal menyalin di layar HP bukan
            hal kecil. Kalau tidak diberi tahu, orangnya menekan Salin, menempel
            di tempat lain, dan yang tertempel isi papan klip yang lama. */}
        {gagalSalin && (
          <p className="mb-1.5 text-xs text-amber-700">
            Browsernya tidak mengizinkan menyalin otomatis. Ketuk kotak di bawah,
            blok semuanya, lalu salin manual ya.
          </p>
        )}
        <textarea
          readOnly
          rows={8}
          value={perintah}
          onFocus={(e) => e.currentTarget.select()}
          className="textarea bg-ink-50 text-ink-600"
        />
        <p className="hint">
          Klik Salin, atau klik kotaknya untuk memblok semua lalu salin manual.
        </p>
      </div>

      <form action={formAction} className="space-y-4 border-t border-ink-100 pt-4">
        <input type="hidden" name="type" value="ai" />
        <input type="hidden" name="agentId" value={agentId} />

        <div>
          <label className="label" htmlFor="title-ai">
            Judul <span className="font-normal text-ink-400">(boleh dikosongkan)</span>
          </label>
          <input
            id="title-ai"
            name="title"
            className="input"
            placeholder="Pengetahuan dari ChatGPT"
          />
        </div>

        <div>
          <div className="mb-1.5 flex items-end justify-between gap-3">
            <label className="label mb-0" htmlFor="content-ai">
              Tempel jawabannya di sini
            </label>
            {/* Jawaban AI lain bisa panjang sekali, dan keterangan di bawah
                menyuruh membacanya dulu. Sepuluh baris di kolom sempit bukan
                tempat memeriksa harga. */}
            <TombolBesar onClick={() => setBesarBuka(true)} />
          </div>
          <textarea
            id="content-ai"
            name="content"
            rows={10}
            className="textarea"
            value={tempelan}
            onChange={(e) => setTempelan(e.target.value)}
            placeholder="Tempel isi blok kodenya di sini. Tanda kutip tiga di awal dan akhir boleh ikut, nanti dibuang otomatis."
          />
          <IsiBesar
            buka={besarBuka}
            nilai={tempelan}
            onUbah={setTempelan}
            onTutup={() => setBesarBuka(false)}
            judul="Jawaban dari AI lain"
          />
          <p className="hint">
            Baca sekilas dulu sebelum simpan. Kalau ada harga yang keliru,
            betulkan sekarang, karena asistenmu akan menganggap ini benar.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Submit />
          {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
          {state?.message && !state.error && (
            <p className="text-sm text-brand-700">{state.message}</p>
          )}
        </div>
      </form>
    </div>
  );
}
