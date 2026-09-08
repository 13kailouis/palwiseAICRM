"use client";

import { useCallback, useEffect, useState } from "react";
import { WhatsAppConnect } from "@/components/WhatsAppConnect";
import { AddChannel } from "@/components/AddChannel";
import { Ikon } from "@/components/Ikon";

interface DaftarNomor {
  channels: { id: string; name: string; status: string; phoneNumber: string | null }[];
  used: number;
  max: number;
  planName: string;
}

export function WhatsAppDalamChat({ tutup, tersambung }: { tutup: () => void; tersambung: (connected: boolean) => void }) {
  const [data, setData] = useState<DaftarNomor | null>(null);
  const [terpilih, setTerpilih] = useState("");
  const [galat, setGalat] = useState<string | null>(null);
  const [memuat, setMemuat] = useState(false);
  const muat = useCallback(async () => {
    setMemuat(true); setGalat(null);
    try {
      const res = await fetch("/api/tanya/whatsapp", { cache: "no-store" });
      if (!res.ok) throw new Error("Nomor WhatsApp belum bisa dimuat.");
      const hasil: DaftarNomor = await res.json();
      setData(hasil);
      setTerpilih(lama => hasil.channels.some(c => c.id === lama) ? lama : hasil.channels[0]?.id ?? "");
    } catch { setGalat("Nomor WhatsApp belum bisa dimuat. Coba lagi ya."); }
    finally { setMemuat(false); }
  }, []);
  useEffect(() => { void muat(); }, [muat]);
  const nomor = data?.channels.find(c => c.id === terpilih);

  return <section className="mt-6" aria-label="Sambungkan WhatsApp di chat">
    <div className="mb-3 flex items-center gap-2"><Ikon nama="whatsapp" size={18} /><h2 className="text-sm font-semibold">Sambungkan WhatsApp</h2>
      <button type="button" onClick={tutup} className="ml-auto grid h-11 w-11 place-items-center rounded-xl text-ink-500 hover:bg-ink-100" aria-label="Tutup kartu WhatsApp"><Ikon nama="silang" size={16} /></button>
    </div>
    {galat && <div role="alert" className="mb-3 rounded-xl border border-red-100 bg-red-50 p-3 text-xs text-red-800">{galat}<button type="button" onClick={muat} disabled={memuat} className="ml-2 min-h-9 underline">Coba lagi</button></div>}
    {memuat && !data && <p role="status" className="py-5 text-sm text-ink-500">Memuat nomor WhatsApp...</p>}
    {data && data.channels.length > 1 && <label className="mb-3 block text-xs text-ink-600">Nomor yang ingin kamu sambungkan<select className="input mt-2 w-full" value={terpilih} onChange={e => setTerpilih(e.target.value)}>{data.channels.map(c => <option key={c.id} value={c.id}>{c.name}{c.phoneNumber ? ` · ${c.phoneNumber}` : ""}</option>)}</select></label>}
    {nomor && <WhatsAppConnect key={nomor.id} channelId={nomor.id} channelName={nomor.name} initialStatus={nomor.status} initialPhone={nomor.phoneNumber} dalamChat onStatusChange={connected => {
      // Progres pemasangan berlaku untuk semua nomor di workspace.
      tersambung(connected || !!data?.channels.some(c => c.id !== nomor.id && c.status === "connected"));
      setData(lama => {
        if (!lama || lama.channels.some(c => c.id === nomor.id && (c.status === "connected") === connected)) return lama;
        return { ...lama, channels: lama.channels.map(c => c.id === nomor.id ? { ...c, status: connected ? "connected" : "disconnected" } : c) };
      });
    }} />}
    {data && data.channels.length === 0 && <AddChannel used={data.used} max={data.max} planName={data.planName} onAdded={muat} />}
  </section>;
}
