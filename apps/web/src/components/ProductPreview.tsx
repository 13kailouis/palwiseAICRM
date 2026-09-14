"use client";

import { useState } from "react";
import { Logo } from "./Logo";
import { Ikon } from "./Ikon";
import type { ChatContoh, ContohTanyaItem } from "@/lib/jualan";

export function ProductPreview({
  chat: initialChat,
  tanya: initialTanya,
  options = [],
}: {
  chat: ChatContoh;
  tanya: ContohTanyaItem;
  options?: {
    id: string;
    label: string;
    chat: ChatContoh;
    tanya: ContohTanyaItem;
  }[];
}) {
  const [mode, setMode] = useState<"wa" | "ai">("wa");
  const [industry, setIndustry] = useState("");
  const example = options.find((item) => item.id === industry);
  const chat = example?.chat ?? initialChat;
  const tanya = example?.tanya ?? initialTanya;
  return (
    <div className="pw-preview">
      <div className="pw-preview-bar">
        <span className="pw-preview-dots" aria-hidden>
          <i />
          <i />
          <i />
        </span>
        {options.length ? (
          <select
            aria-label="Pilih bidang contoh percakapan"
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
          >
            <option value="">Contoh: Kenali Palwise</option>
            {options.map((o) => (
              <option value={o.id} key={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        ) : (
          <span>Ruang kerja Palwise</span>
        )}
        <span className="pw-demo-label">Data ilustrasi</span>
      </div>
      <div className="pw-preview-layout">
        <aside className="pw-preview-side" aria-label="Pilih tampilan demo">
          <div className="pw-preview-brand">
            <Logo ukuran={25} />
            <strong>Palwise</strong>
          </div>
          <small>RUANG KERJA</small>
          <button
            type="button"
            onClick={() => setMode("wa")}
            aria-pressed={mode === "wa"}
          >
            <Ikon nama="chat" size={18} />
            Chat pelanggan <span>2</span>
          </button>
          <button
            type="button"
            onClick={() => setMode("ai")}
            aria-pressed={mode === "ai"}
          >
            <Ikon nama="tanya" size={18} />
            Palwise AI
          </button>
          <div className="pw-preview-bottom">
            <span className="pw-avatar">B</span>
            <div>
              <strong>Bisnis kamu</strong>
              <small>Satu tempat. Lebih teratur.</small>
            </div>
          </div>
        </aside>
        <div className="pw-preview-main">
          <div className="pw-preview-tabs" aria-label="Pilih tampilan demo">
            <button
              type="button"
              aria-pressed={mode === "wa"}
              onClick={() => setMode("wa")}
            >
              Untuk pelanggan
            </button>
            <button
              type="button"
              aria-pressed={mode === "ai"}
              onClick={() => setMode("ai")}
            >
              Untuk pemilik
            </button>
          </div>
          <div
            className="pw-preview-chat"
            aria-live="polite"
            aria-atomic="true"
          >
            <div className="pw-chat-heading">
              <span className="pw-avatar">
                {mode === "wa" ? chat.nama.slice(0, 1) : <Logo ukuran={25} />}
              </span>
              <div>
                <strong>{mode === "wa" ? chat.nama : "Palwise AI"}</strong>
                <small>
                  {mode === "wa"
                    ? "WhatsApp · dibantu asisten"
                    : "Bantuan untuk pemilik bisnis"}
                </small>
              </div>
              <span className="pw-status">
                {mode === "wa" ? "Asisten AI" : "Untuk kamu"}
              </span>
            </div>
            {mode === "wa" ? (
              <div className="pw-bubbles">
                <span className="pw-chat-day">CONTOH PERCAKAPAN</span>
                {chat.pesan.slice(0, 4).map((p, i) => (
                  <div
                    key={i}
                    className={`pw-bubble ${p.dari === "asisten" ? "pw-bubble-ai" : ""}`}
                  >
                    <p>{p.teks}</p>
                    <small>
                      {p.jam}
                      {p.dari === "asisten" && " · ✓✓"}
                    </small>
                  </div>
                ))}
              </div>
            ) : (
              <div className="pw-owner-demo">
                <p className="pw-owner-question">{tanya.tanya}</p>
                <div className="pw-owner-answer">
                  <Logo ukuran={25} />
                  <div>
                    <strong>Palwise</strong>
                    <p>{tanya.jawab}</p>
                    {tanya.pelanggan?.map((p) => (
                      <div className="pw-owner-row" key={p}>
                        <Ikon nama="pelanggan" size={17} />
                        {p}
                      </div>
                    ))}
                  </div>
                </div>
                <p className="pw-owner-note">
                  Jawaban dari data yang tercatat di Palwise.
                </p>
              </div>
            )}
          </div>
          <div className="pw-preview-composer">
            <Ikon nama={mode === "wa" ? "kendali" : "tanya"} size={17} />
            <span>
              {mode === "wa"
                ? "Tim bisa mengambil alih percakapan"
                : "Cek pelanggan, siapkan draf, lihat kabar bisnis"}
            </span>
            <span aria-hidden>↗</span>
          </div>
        </div>
        <aside className="pw-preview-context">
          <span className="pw-eyebrow">KONTEKS, TETAP UTUH</span>
          <h3>Setiap chat punya langkah berikutnya.</h3>
          <div>
            <Ikon nama="info" size={20} />
            <strong>Jawaban punya acuan</strong>
            <p>Harga dan kebijakan dari info bisnismu.</p>
          </div>
          <div>
            <Ikon nama="pelanggan" size={20} />
            <strong>Pelanggan tercatat</strong>
            <p>Percakapan dan kebutuhan mudah ditemukan.</p>
          </div>
          <div>
            <Ikon nama="kendali" size={20} />
            <strong>Kamu pegang kendali</strong>
            <p>Pantau jawaban dan lanjutkan bersama tim.</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
