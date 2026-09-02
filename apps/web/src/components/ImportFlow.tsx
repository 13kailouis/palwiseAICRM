"use client";

import { useEffect, useRef, useState } from "react";
import { IsiBesar, TombolBesar } from "@/components/IsiBesar";
import { useRouter } from "next/navigation";
import { MAKS_BACA_BYTE, MAKS_BACA_MB, mb } from "@/lib/batas";

type Phase = "idle" | "working" | "review";
export type ImportMode = "website" | "file";

interface LogLine {
  text: string;
  kind: "step" | "page-ok" | "page-skip";
  detail?: string;
}

const TEKS: Record<
  ImportMode,
  {
    label: string;
    hint: string;
    tombol: string;
    sedang: string;
    endpoint: string;
    simpanTipe: string;
  }
> = {
  website: {
    label: "Alamat websitenya",
    hint: "Cukup alamat depannya saja. Halaman harga, produk, dan cara pesannya kami telusuri otomatis.",
    tombol: "Ambil dari website",
    sedang: "Sedang membaca website",
    endpoint: "/api/knowledge/scrape",
    simpanTipe: "website",
  },
  file: {
    label: "Pilih file",
    // Angkanya diambil dari tetapannya, bukan ditulis tangan. Kalimat penolakan
    // di bawah sudah memakai MAKS_BACA_MB, jadi kalau yang ini ditulis tangan,
    // suatu hari batasnya berubah dan orang membaca dua angka yang berbeda di
    // layar yang sama: "maksimal 15 MB" di atas, "batasnya 20 MB" di bawah.
    hint: `Bisa PDF, Word (.docx), catatan (.txt, .md), atau file Excel yang disimpan sebagai .csv. Maksimal ${MAKS_BACA_MB} MB. PDF hasil scan atau foto tidak bisa dibaca.`,
    tombol: "Baca isi file",
    sedang: "Sedang membaca file",
    endpoint: "/api/knowledge/extract-file",
    simpanTipe: "file",
  },
};

export function ImportFlow({
  agentId,
  mode,
}: {
  agentId: string;
  mode: ImportMode;
}) {
  const t = TEKS[mode];
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("idle");
  // Hasil telusur bisa puluhan ribu huruf, dan keterangannya sendiri menyuruh
  // memeriksanya. Memeriksa lewat jendela 18 baris di kolom sempit itu
  // menyuruh sesuatu yang tidak akan dikerjakan.
  const [besarBuka, setBesarBuka] = useState(false);
  const [url, setUrl] = useState("");
  const [fileName, setFileName] = useState("");
  const [log, setLog] = useState<LogLine[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tidied, setTidied] = useState(false);
  // Kenapa isinya masih mentah. Dulu tidak pernah sampai ke layar: alasannya
  // cuma lewat sebagai satu baris di catatan proses, lalu tergulung hilang,
  // dan yang tersisa cuma "belum sempat dirapikan" yang tidak menjelaskan
  // apa-apa. Orang jadi tidak tahu ini perlu diulangi atau memang begitu.
  const [alasanMentah, setAlasanMentah] = useState("");
  // Websitenya kebaca, tapi isinya hampir kosong. Ini kegagalan yang paling
  // berbahaya karena kelihatan berhasil: catatannya tersimpan, dan asistennya
  // diam-diam tidak tahu apa-apa soal produknya.
  const [tipis, setTipis] = useState(false);
  // Websitenya terbaca banyak, tapi isinya menu semua, bukan fakta. Ini beda
  // dari gagal: mengulanginya tidak akan mengubah apa pun, dan teks mentahnya
  // justru TIDAK layak disimpan.
  const [tanpaFakta, setTanpaFakta] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Batalkan begitu layarnya ditinggal.
  //
  // Menelusuri website bisa memakan dua menit, dan orang memang pindah halaman
  // di tengah jalan. Tanpa ini permintaannya tidak pernah diputus, jadi server
  // meneruskan penelusuran sampai habis lalu MEMBAYAR MODEL untuk merapikan
  // hasilnya, untuk layar yang sudah tidak ada. Tombol "Batal" saja tidak
  // cukup: yang pindah halaman tidak menekan tombol apa pun.
  useEffect(() => () => abortRef.current?.abort(), []);

  // Ukuran diperiksa di browser dulu. Batasnya ditolak di server juga, tapi
  // menunggu 15 MB terkirim cuma untuk ditolak itu menyiksa di jaringan HP.
  const [besar, setBesar] = useState("");

  function pilihBerkas(file: File | undefined) {
    setFileName(file?.name ?? "");
    setBesar(
      file && file.size > MAKS_BACA_BYTE
        ? `Ukurannya ${mb(file.size)}, batasnya ${MAKS_BACA_MB} MB.`
        : "",
    );
  }

  const siap =
    mode === "website" ? url.trim().length > 0 : fileName.length > 0 && !besar;

  async function mulai() {
    if (!siap || phase === "working") return;

    setPhase("working");
    setLog([]);
    setError(null);
    setContent("");

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      let body: BodyInit;
      let headers: HeadersInit | undefined;

      if (mode === "website") {
        body = JSON.stringify({ url });
        headers = { "content-type": "application/json" };
      } else {
        const berkas = fileRef.current?.files?.[0];
        if (!berkas) throw new Error("Filenya belum dipilih.");
        const fd = new FormData();
        fd.append("file", berkas);
        body = fd;
      }

      const res = await fetch(t.endpoint, {
        method: "POST",
        headers,
        body,
        signal: controller.signal,
      });
      if (!res.body) throw new Error("Server tidak mengirim apa-apa.");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";

        for (const part of parts) {
          const line = part.split("\n").find((l) => l.startsWith("data: "));
          if (!line) continue;

          let event: any;
          try {
            event = JSON.parse(line.slice(6));
          } catch {
            continue;
          }

          if (event.type === "step") {
            setLog((l) => [...l, { text: event.text, kind: "step" }]);
          } else if (event.type === "page") {
            setLog((l) => [
              ...l,
              {
                text: event.title || event.url,
                kind: event.ok ? "page-ok" : "page-skip",
                detail: event.ok
                  ? `${event.chars.toLocaleString("id-ID")} huruf`
                  : (event.note ?? "dilewati"),
              },
            ]);
          } else if (event.type === "done") {
            setTitle(event.title ?? "");
            setContent(event.content ?? "");
            setTidied(!!event.tidied);
            setAlasanMentah(event.alasanMentah ?? "");
            setTipis(!!event.tipis);
            setTanpaFakta(!!event.tanpaFakta);
            setPhase("review");
          } else if (event.type === "error") {
            setError(event.message);
            setPhase("idle");
          }
        }
      }
    } catch (err) {
      if ((err as Error)?.name !== "AbortError") {
        setError(
          err instanceof Error ? err.message : "Gagal menghubungi server.",
        );
      }
      setPhase("idle");
    } finally {
      abortRef.current = null;
    }
  }

  async function simpan() {
    if (!content.trim() || saving) return;
    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/knowledge/save-import", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          agentId,
          title,
          content,
          type: t.simpanTipe,
          sumber: mode === "website" ? url : fileName,
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data?.error ?? "Gagal menyimpan.");
      } else {
        ulangi();
        setUrl("");
        setFileName("");
        if (fileRef.current) fileRef.current.value = "";
        router.refresh();
      }
    } catch {
      setError("Gagal menghubungi server.");
    } finally {
      setSaving(false);
    }
  }

  function ulangi() {
    setPhase("idle");
    setLog([]);
    setContent("");
  }

  return (
    <div className="space-y-4">
      {phase !== "review" && (
        <>
          <div>
            <label className="label" htmlFor={`sumber-${mode}`}>
              {t.label}
            </label>
            {mode === "website" ? (
              <input
                id={`sumber-${mode}`}
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && mulai()}
                disabled={phase === "working"}
                className="input"
                // Contoh alamat, bukan nama usaha yang benar-benar ada.
                // Menaruh nama bisnis sungguhan di sini bikin orang mengira
                // itu contoh pelanggan Palwise.
                placeholder="namatokokamu.com"
              />
            ) : (
              <input
                id={`sumber-${mode}`}
                ref={fileRef}
                type="file"
                accept=".pdf,.docx,.txt,.md,.csv,.json"
                disabled={phase === "working"}
                onChange={(e) => pilihBerkas(e.target.files?.[0])}
                className="input file:mr-3 file:rounded file:border-0 file:bg-ink-100 file:px-3 file:py-1.5 file:text-sm"
              />
            )}
            {besar ? (
              <p className="mt-1.5 text-sm leading-relaxed text-red-600">{besar}</p>
            ) : (
              <p className="hint">{t.hint}</p>
            )}
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={mulai}
              disabled={phase === "working" || !siap}
              className="btn-primary"
            >
              {phase === "working" ? t.sedang : t.tombol}
            </button>
            {phase === "working" && (
              <button
                type="button"
                onClick={() => {
                  abortRef.current?.abort();
                  setPhase("idle");
                }}
                className="btn-ghost"
              >
                Batal
              </button>
            )}
          </div>
        </>
      )}

      {log.length > 0 && phase !== "review" && (
        <div className="thin-scroll max-h-64 overflow-y-auto rounded-lg border border-ink-200 bg-ink-50 p-3">
          <ul className="space-y-1.5 text-sm">
            {log.map((l, i) => (
              <li key={i} className="flex gap-2">
                <span
                  className={
                    l.kind === "page-ok"
                      ? "text-brand-600"
                      : l.kind === "page-skip"
                        ? "text-ink-300"
                        : "text-ink-400"
                  }
                >
                  {l.kind === "page-ok" ? "✓" : l.kind === "page-skip" ? "×" : "•"}
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className={l.kind === "page-skip" ? "text-ink-400" : "text-ink-700"}
                  >
                    {l.text}
                  </span>
                  {l.detail && (
                    <span className="ml-1.5 text-xs text-ink-400">({l.detail})</span>
                  )}
                </span>
              </li>
            ))}
            {phase === "working" && (
              <li className="flex gap-2 text-sm text-ink-400">
                <span className="animate-pulse">•</span>
                <span className="animate-pulse">sedang bekerja</span>
              </li>
            )}
          </ul>
        </div>
      )}

      {phase === "review" && (
        <>
          {tanpaFakta && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm leading-relaxed text-red-800">
              <p className="font-medium">
                Websitenya kebaca, tapi tidak ada fakta yang bisa diambil.
              </p>
              <p className="mt-1">
                Yang terbaca cuma nama-nama menu dan kalimat promosi, bukan
                produk, harga, atau aturan toko. Kalau ini disimpan, asistenmu
                cuma hafal daftar menu websitemu dan tetap tidak bisa menjawab
                pertanyaan pelanggan.
              </p>
              <p className="mt-1 font-medium">
                Sebaiknya jangan disimpan. Pakai &ldquo;Ketik sendiri&rdquo; dan
                tulis produk serta harganya langsung.
              </p>
            </div>
          )}

          {tipis && !tanpaFakta && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm leading-relaxed text-amber-900">
              <p className="font-medium">Isi websitenya cuma terbaca sedikit.</p>
              <p className="mt-1">
                Website yang isinya baru muncul setelah dijalankan di browser
                memang tidak bisa dibaca utuh dari luar. Periksa hasil di bawah:
                kalau produk atau harganya tidak ada di situ, salin tempel
                manual lewat &ldquo;Ketik sendiri&rdquo;.
              </p>
            </div>
          )}

          {tidied ? (
            <div className="rounded-lg border border-brand-200 bg-brand-50/60 px-3 py-2.5 text-sm leading-relaxed text-brand-900">
              Sudah dibaca dan dirapikan. Periksa dulu di bawah, betulkan yang
              salah, baru simpan.
            </div>
          ) : tanpaFakta ? null : (
            /* Amber, bukan biru. Ini keadaan yang tidak seharusnya terjadi dan
               menyisakan pekerjaan buat orangnya, jadi warnanya tidak boleh
               sama dengan kabar baik. */
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm leading-relaxed text-amber-900">
              <p className="font-medium">Belum sempat dirapikan otomatis.</p>
              {alasanMentah && <p className="mt-1">Sebabnya: {alasanMentah}</p>}
              <p className="mt-1">
                Isinya masih mentah, jadi masih ada menu dan tulisan berulang
                dari websitenya. Rapikan seperlunya sebelum simpan, atau tekan
                &ldquo;Buang, ulangi&rdquo; untuk mencoba lagi.
              </p>
            </div>
          )}

          <div>
            <label className="label" htmlFor={`judul-${mode}`}>
              Judul catatan
            </label>
            <input
              id={`judul-${mode}`}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input"
            />
          </div>

          <div>
            <div className="mb-1.5 flex items-end justify-between gap-3">
              <label className="label mb-0" htmlFor={`hasil-${mode}`}>
                Hasilnya{" "}
                <span className="font-normal text-ink-400">
                  ({content.length.toLocaleString("id-ID")} huruf, bisa diedit)
                </span>
              </label>
              <TombolBesar onClick={() => setBesarBuka(true)} />
            </div>
            <textarea
              id={`hasil-${mode}`}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={18}
              className="textarea"
            />
            <p className="hint">
              Baca sekilas dulu, terutama bagian akhirnya. Kalau ada harga atau
              aturan yang keliru, betulkan sekarang, karena asistenmu akan
              menganggap ini benar.
            </p>
            <IsiBesar
              buka={besarBuka}
              nilai={content}
              onUbah={setContent}
              onTutup={() => setBesarBuka(false)}
              judul="Hasil telusur website"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {/* Waktu hasilnya tidak memuat fakta, tombol simpan diturunkan
                jadi tombol biasa. Tidak dikunci, karena pemilik toko berhak
                memutuskan sendiri, tapi juga tidak boleh jadi tombol paling
                mengundang di layar untuk sesuatu yang sudah kita bilang
                sebaiknya jangan disimpan. */}
            <button
              type="button"
              onClick={simpan}
              disabled={saving || !content.trim()}
              className={tanpaFakta ? "btn-ghost" : "btn-primary"}
            >
              {saving ? "Menyimpan" : "Simpan catatan ini"}
            </button>
            <button type="button" onClick={ulangi} className="btn-ghost">
              Buang, ulangi
            </button>
          </div>
        </>
      )}

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}
    </div>
  );
}
