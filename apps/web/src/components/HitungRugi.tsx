"use client";

import { useState } from "react";
import Link from "next/link";

const rupiah = (n: number) => `Rp ${Math.round(n).toLocaleString("id-ID")}`;

/**
 * "How much slips away each month", computed ONLY from numbers the owner enters.
 *
 * The defaults are labelled as examples, and nothing here is a claim about other
 * businesses: Palwise has no customer data to quote, and an invented statistic on
 * this page would cost the one thing the price wedge needs, being believed.
 */
export function HitungRugi({ hargaStarter, keDaftar }: { hargaStarter: number; keDaftar: string }) {
  const [chat, setChat] = useState(20);
  const [luarJam, setLuarJam] = useState(30);
  const [jadiBeli, setJadiBeli] = useState(10);
  const [belanja, setBelanja] = useState(150_000);

  const chatLuarJam = Math.round((chat * 30 * luarJam) / 100);
  const order = Math.round((chatLuarJam * jadiBeli) / 100);
  const uang = order * belanja;
  const balikModal = Math.max(1, Math.ceil(hargaStarter / Math.max(1, belanja)));

  const geser = [
    { label: "Chat WhatsApp masuk per hari", nilai: chat, set: setChat, min: 1, maks: 200, langkah: 1, tampil: `${chat} chat` },
    { label: "Yang masuk di luar jam buka", nilai: luarJam, set: setLuarJam, min: 0, maks: 100, langkah: 5, tampil: `${luarJam}%` },
    { label: "Dari yang dibales cepat, yang jadi beli", nilai: jadiBeli, set: setJadiBeli, min: 1, maks: 50, langkah: 1, tampil: `${jadiBeli}%` },
    { label: "Rata-rata sekali belanja", nilai: belanja, set: setBelanja, min: 10_000, maks: 2_000_000, langkah: 10_000, tampil: rupiah(belanja) },
  ];

  return (
    <div className="mx-auto grid max-w-5xl overflow-hidden rounded-3xl border border-ink-200 bg-white shadow-[0_1px_2px_rgba(15,15,15,0.04)] lg:grid-cols-[1.1fr_1fr]">
      <div className="space-y-6 p-5 sm:p-8">
        <p className="text-xs text-ink-500">Angka awalnya cuma contoh. Geser pakai angka tokomu sendiri.</p>
        {geser.map((g) => (
          <label key={g.label} className="block">
            <span className="flex items-baseline justify-between gap-3">
              <span className="text-sm text-ink-700">{g.label}</span>
              <span className="shrink-0 text-base font-bold tabular-nums text-ink-950">{g.tampil}</span>
            </span>
            <input
              type="range"
              min={g.min}
              max={g.maks}
              step={g.langkah}
              value={g.nilai}
              onChange={(e) => g.set(Number(e.target.value))}
              className="mt-3 h-2 w-full cursor-pointer accent-brand-600"
              aria-label={g.label}
            />
          </label>
        ))}
      </div>

      <div className="flex flex-col justify-between gap-6 bg-ink-950 p-5 text-white sm:p-8">
        <div>
          <p className="text-sm text-white/60">Chat yang masuk waktu tokomu tutup</p>
          <p className="mt-1 text-2xl font-bold tabular-nums">{chatLuarJam.toLocaleString("id-ID")} chat / bulan</p>

          <p className="mt-6 text-sm text-white/60">Yang bisa jadi order kalau semuanya langsung dibales</p>
          <p className="mt-1 text-[40px] font-bold leading-tight tracking-[-0.02em] tabular-nums sm:text-[48px]">{rupiah(uang)}</p>
          <p className="text-sm text-white/60">tiap bulan, dari sekitar {order.toLocaleString("id-ID")} order</p>

          <p className="mt-6 rounded-2xl bg-white/[0.07] px-4 py-3 text-sm leading-relaxed text-white/85">
            Paket Starter {rupiah(hargaStarter)} sebulan udah balik modal dari <b className="text-white">{balikModal} order</b>.
          </p>
        </div>

        <div>
          <Link href={keDaftar} className="btn-besar inline-flex w-full items-center justify-center rounded-xl bg-white font-semibold text-ink-950 transition hover:bg-ink-100">
            Mulai gratis, jangan sampai lepas lagi
          </Link>
          <p className="mt-3 text-center text-xs text-white/50">Hitungan ini dari angka yang kamu masukkan, bukan janji hasil.</p>
        </div>
      </div>
    </div>
  );
}
