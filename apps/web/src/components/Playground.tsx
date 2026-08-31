"use client";

import { useEffect, useRef, useState } from "react";
import { tampilanRasa } from "@/lib/rasa";
import { Ikon } from "@/components/Ikon";
import { Avatar } from "@/components/ui";

interface Bubble {
  from: "customer" | "ai" | "error" | "berkas";
  text: string;
  fileName?: string;
  kind?: string;
}

interface Rasa {
  label: string;
  alasan: string[];
  efek: string[];
  mati?: boolean;
}

/**
 * Contoh pertanyaan.
 *
 * Empat yang pertama pertanyaan biasa. Tiga terakhir ditambahkan supaya
 * lapisan rasa bisa DILIHAT, bukan cuma dibaca di halaman jualan — dan tiga
 * itu yang paling menentukan apakah orang percaya fitur ini: pelanggan yang
 * kesal, pelanggan yang sudah mau bayar, dan pelanggan yang tidak sanggup tapi
 * tidak mengatakannya.
 */
const CONTOH = [
  "Halo, ini jual apa aja ya?",
  "Harganya berapa?",
  "Kirim ke Surabaya ongkirnya berapa?",
  "Saya mau pesan 2, caranya gimana?",
  "Kok lama banget sih balesnya, dari tadi saya nunggu",
  "Transfer kemana ya kak? saya ambil sekarang",
  "Wah belum ada rejeki kalau segitu",
];

export function Playground({
  agentId,
  agentName,
}: {
  agentId: string;
  agentName: string;
}) {
  const [chat, setChat] = useState<Bubble[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [meta, setMeta] = useState<{ handoff?: boolean; knowledgeUsed?: number }>({});
  const [rasa, setRasa] = useState<Rasa | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat.length, busy]);

  async function send(text: string) {
    const message = text.trim();
    if (!message || busy) return;

    setChat((c) => [...c, { from: "customer", text: message }]);
    setDraft("");
    setBusy(true);

    try {
      const res = await fetch("/api/playground", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ agentId, message }),
      });
      const data = await res.json();

      if (!res.ok || data?.error) {
        setChat((c) => [
          ...c,
          { from: "error", text: data?.error ?? "Asisten gagal menjawab." },
        ]);
      } else {
        setChat((c) => [
          ...c,
          ...(data.bubbles ?? []).map((b: string) => ({ from: "ai" as const, text: b })),
          ...(data.berkas ?? []).map((b: any) => ({
            from: "berkas" as const,
            text: b.name,
            fileName: b.fileName,
            kind: b.kind,
          })),
        ]);
        setMeta({ handoff: data.handoff, knowledgeUsed: data.knowledgeUsed });
        setRasa(data.rasa ?? null);
      }
    } catch {
      setChat((c) => [...c, { from: "error", text: "Tidak bisa menghubungi server." }]);
    } finally {
      setBusy(false);
    }
  }

  async function reset() {
    setBusy(true);
    await fetch("/api/playground", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ agentId, reset: true }),
    });
    setChat([]);
    setMeta({});
    setRasa(null);
    setBusy(false);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
      {/* Tinggi tetap 600px lebih tinggi daripada layar HP yang bisa dipakai,
          jadi kolom ketiknya terdorong keluar layar dan orang tidak menemukan
          tempat mengetik. Di HP tingginya ikut layar, dikurangi kepala halaman
          dan bar bawah. */}
      <div className="card flex h-[calc(100dvh-230px)] min-h-[380px] flex-col overflow-hidden lg:h-[600px]">
        <div className="flex items-center justify-between gap-3 border-b border-ink-200 px-4 py-2.5 sm:px-5">
          <div className="flex items-center gap-2.5">
            <Avatar nama={agentName} ukuran={38} />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-ink-900">
                {agentName}
              </p>
              <p className="flex items-center gap-1.5 text-xs text-ink-500">
                {/* Titik kecil "hidup", penanda pura-pura seperti status online
                    di app chat. */}
                <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
                Pura-pura chat WhatsApp
              </p>
            </div>
          </div>
          <button
            onClick={reset}
            disabled={busy}
            className="btn-ghost shrink-0 px-3 py-1.5 text-xs"
          >
            Mulai dari awal
          </button>
        </div>

        <div className="thin-scroll min-h-0 flex-1 space-y-3 overflow-y-auto bg-ink-50 px-4 py-5 sm:px-5">
          {chat.length === 0 && (
            <div className="grid h-full place-items-center px-6 text-center">
              <div className="max-w-xs">
                <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-white text-ink-400 shadow-sm ring-1 ring-ink-200">
                  <Ikon nama="coba" size={22} />
                </span>
                <p className="mt-3 text-sm leading-relaxed text-ink-500">
                  Tulis seperti pelanggan beneran, lihat jawabannya pas atau
                  tidak. Yang kamu ketik di sini tidak dikirim ke siapa pun.
                </p>
              </div>
            </div>
          )}
          {chat.map((b, i) => (
            <div
              key={i}
              className={`anim-naik flex ${b.from === "customer" ? "justify-end" : "justify-start"}`}
              title={b.from === "berkas" ? "Di WhatsApp ini terkirim sebagai lampiran" : undefined}
            >
              <div
                className={`max-w-[78%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
                  b.from === "customer"
                    ? "rounded-br-md bg-brand-600 text-white"
                    : b.from === "error"
                      ? "rounded-bl-md border border-red-200 bg-red-50 text-red-700"
                      : "rounded-bl-md bg-white text-ink-900 shadow-sm ring-1 ring-ink-200/70"
                }`}
              >
                {b.from === "berkas" && b.fileName && (
                  <>
                    {b.kind === "image" ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={`/api/media/${encodeURIComponent(b.fileName)}`}
                        alt={b.text}
                        className="mb-1.5 max-h-56 rounded-lg"
                      />
                    ) : (
                      <p className="mb-1 text-xs text-ink-400">
                        berkas terkirim
                      </p>
                    )}
                  </>
                )}
                <p className="whitespace-pre-wrap">{b.text}</p>
              </div>
            </div>
          ))}
          {busy && (
            <div className="anim-naik flex justify-start">
              <div className="titik-ketik rounded-2xl rounded-bl-md bg-white px-4 py-3 text-ink-400 shadow-sm ring-1 ring-ink-200/70">
                <span />
                <span />
                <span />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Contoh pertanyaan tepat di atas kotak ketik, khusus HP.

            Di layar lebar contoh ada di panel kanan yang selalu kelihatan. Di
            HP panel itu jatuh JAUH di bawah kotak obrolan, jadi orang tidak
            pernah sampai ke sana. Dijadikan satu baris yang bisa digeser tepat
            di atas tempat mengetik, dia selalu terjangkau jempol. */}
        <div className="thin-scroll flex gap-2 overflow-x-auto border-t border-ink-100 px-4 py-2.5 lg:hidden">
          {CONTOH.map((c) => (
            <button
              key={c}
              onClick={() => send(c)}
              disabled={busy}
              className="shrink-0 whitespace-nowrap rounded-full border border-ink-200 px-3 py-1.5 text-xs text-ink-700 transition active:bg-ink-100 disabled:opacity-50"
            >
              {c}
            </button>
          ))}
        </div>

        <div className="border-t border-ink-200 p-3 sm:p-4">
          <div className="flex items-center gap-2">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send(draft)}
              placeholder="Tulis pesan seolah kamu pelanggan"
              className="input flex-1"
            />
            <button
              onClick={() => send(draft)}
              disabled={busy || !draft.trim()}
              aria-label="Kirim"
              className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-brand-600 text-white transition hover:bg-brand-700 disabled:opacity-40"
            >
              <Ikon nama="kirim" size={19} />
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {/* Di HP contoh sudah jadi baris di atas kotak ketik, jadi panel ini
            khusus layar lebar biar tidak dobel. */}
        <div className="card-pad hidden lg:block">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-ink-900">
            <Ikon nama="coba" size={15} className="text-ink-400" />
            Coba tanya ini
          </h3>
          <div className="mt-3 space-y-2">
            {CONTOH.map((c) => (
              <button
                key={c}
                onClick={() => send(c)}
                disabled={busy}
                className="tap-aman w-full rounded-lg border border-ink-200 px-3 py-2 text-left text-sm text-ink-700 transition hover:border-brand-400 hover:bg-brand-50/40 disabled:opacity-50"
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Bacaan hidup.
            Ditaruh di ATAS kotak "Jawaban barusan" dengan sengaja: ini yang
            baru, dan ini satu-satunya tempat orang bisa melihat sendiri
            lapisannya bekerja sebelum membiarkannya menyentuh pelanggan
            sungguhan. */}
        {rasa && (
          <div className="card-pad">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-ink-900">
              <Ikon nama="sapa" size={15} className="text-ink-400" />
              Dia baca apa
            </h3>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              {(() => {
                const t = tampilanRasa(rasa.label);
                return t ? (
                  <span className={`badge ${t.kelas}`}>{t.teks}</span>
                ) : (
                  <span className="badge bg-ink-100 text-ink-600">biasa saja</span>
                );
              })()}
              {rasa.alasan.map((a) => (
                <span key={a} className="text-xs text-ink-500">
                  {a}
                </span>
              ))}
            </div>

            {rasa.mati ? (
              <p className="mt-3 text-xs leading-relaxed text-ink-500">
                Cara jawabnya tidak diubah karena{" "}
                <span className="font-medium text-ink-700">Baca perasaan pelanggan</span>{" "}
                sedang mati di halaman Asisten.
              </p>
            ) : rasa.efek.length > 0 ? (
              <>
                <p className="mt-4 text-xs font-medium text-ink-700">
                  Yang berubah di jawaban barusan
                </p>
                <ul className="mt-1.5 space-y-1">
                  {rasa.efek.map((e) => (
                    <li key={e} className="text-xs leading-relaxed text-ink-600">
                      {e}
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="mt-3 text-xs leading-relaxed text-ink-500">
                Tidak ada yang perlu diubah, jadi dia menjawab seperti biasa.
              </p>
            )}

            {/* Kekhawatiran yang muncul otomatis begitu orang melihat kata
                "perasaan", dijawab di tempat dia melihatnya. */}
            <p className="mt-4 border-t border-ink-100 pt-3 text-xs leading-relaxed text-ink-400">
              Yang berubah cuma caranya menjawab. Harga, stok, dan jadwal tetap
              dari Info bisnis.
            </p>
          </div>
        )}

        {(meta.knowledgeUsed !== undefined || meta.handoff) && (
          <div className="card-pad">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-ink-900">
              <Ikon nama="ringkasan" size={15} className="text-ink-400" />
              Jawaban barusan
            </h3>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-ink-500">Ngambil dari info kamu</dt>
                <dd className="font-medium text-ink-900">
                  {meta.knowledgeUsed ? "Ya" : "Tidak"}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-ink-500">Minta dibantu kamu</dt>
                <dd className="font-medium text-ink-900">
                  {meta.handoff ? "Ya" : "Tidak"}
                </dd>
              </div>
            </dl>
            {meta.knowledgeUsed === 0 && (
              <p className="mt-3 text-xs leading-relaxed text-amber-700">
                Jawaban ini tidak diambil dari info yang kamu isi. Kalau terasa
                mengambang, tambahkan keterangannya di halaman Info bisnis.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
