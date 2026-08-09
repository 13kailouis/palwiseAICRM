"use client";

import { useEffect, useRef, useState } from "react";

interface Bubble {
  from: "customer" | "ai" | "error" | "berkas";
  text: string;
  fileName?: string;
  kind?: string;
}

const CONTOH = [
  "Halo, ini jual apa aja ya?",
  "Harganya berapa?",
  "Kirim ke Surabaya ongkirnya berapa?",
  "Saya mau pesan 2, caranya gimana?",
  "Saya mau ngomong sama orangnya langsung dong",
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
    setBusy(false);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
      {/* Tinggi tetap 600px lebih tinggi daripada layar HP yang bisa dipakai,
          jadi kolom ketiknya terdorong keluar layar dan orang tidak menemukan
          tempat mengetik. Di HP tingginya ikut layar, dikurangi kepala halaman
          dan bar bawah. */}
      <div className="card flex h-[calc(100dvh-260px)] min-h-[380px] flex-col overflow-hidden lg:h-[600px]">
        <div className="flex items-center justify-between border-b border-ink-200 px-4 py-3 sm:px-5">
          <div>
            <p className="text-sm font-medium text-ink-900">{agentName}</p>
            <p className="text-xs text-ink-500">Pura-pura chat WhatsApp</p>
          </div>
          <button onClick={reset} disabled={busy} className="btn-ghost px-3 py-1.5 text-xs">
            Mulai dari awal
          </button>
        </div>

        <div className="thin-scroll min-h-0 flex-1 space-y-3 overflow-y-auto bg-ink-50 px-5 py-5">
          {chat.length === 0 && (
            <p className="py-10 text-center text-sm text-ink-500">
              Coba tanya seperti pelanggan beneran, lihat jawabannya pas atau tidak.
            </p>
          )}
          {chat.map((b, i) => (
            <div
              key={i}
              className={`flex ${b.from === "customer" ? "justify-end" : "justify-start"}`}
              title={b.from === "berkas" ? "Di WhatsApp ini terkirim sebagai lampiran" : undefined}
            >
              <div
                className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
                  b.from === "customer"
                    ? "rounded-br-sm bg-brand-600 text-white"
                    : b.from === "error"
                      ? "rounded-bl-sm border border-red-200 bg-red-50 text-red-700"
                      : "rounded-bl-sm border border-ink-200 bg-white text-ink-900"
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
            <div className="flex justify-start">
              <div className="rounded-2xl rounded-bl-sm border border-ink-200 bg-white px-4 py-2.5 text-sm text-ink-400">
                sedang mengetik
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="border-t border-ink-200 p-4">
          <div className="flex gap-2">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send(draft)}
              placeholder="Tulis pesan seolah kamu pelanggan"
              className="input"
            />
            <button
              onClick={() => send(draft)}
              disabled={busy || !draft.trim()}
              className="btn-primary"
            >
              Kirim
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="card-pad">
          <h3 className="text-sm font-semibold text-ink-900">Coba tanya ini</h3>
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

        {(meta.knowledgeUsed !== undefined || meta.handoff) && (
          <div className="card-pad">
            <h3 className="text-sm font-semibold text-ink-900">Jawaban barusan</h3>
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
