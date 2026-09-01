"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Ikon } from "@/components/Ikon";

interface Status {
  status: string;
  qrDataUrl: string | null;
  phoneNumber: string | null;
  error: string | null;
  workerUp: boolean;
}

const STEPS = [
  "Buka WhatsApp di HP yang nomornya mau dipakai",
  "Ketuk titik tiga di pojok kanan atas, pilih Perangkat tertaut",
  "Ketuk Tautkan perangkat",
  "Arahkan kamera HP ke kotak QR di layar ini",
];

const LABEL: Record<string, { text: string; className: string }> = {
  connected: { text: "Aktif", className: "bg-brand-50 text-brand-700" },
  connecting: { text: "Lagi nyambung", className: "bg-amber-50 text-amber-700" },
  // "Tunggu di-scan" itu keadaan menunggu, sama keluarga dengan "Lagi
  // nyambung", jadi ikut amber. Dulu biru bawaan Tailwind (bukan biru merek),
  // jadi terbaca seperti warna asing yang tidak ada di halaman lain.
  qr: { text: "Tunggu di-scan", className: "bg-amber-50 text-amber-700" },
  logged_out: { text: "Dicabut dari HP", className: "bg-red-50 text-red-700" },
  disconnected: { text: "Belum nyambung", className: "bg-ink-100 text-ink-600" },
};

export function WhatsAppConnect({
  channelId,
  channelName,
  initialStatus,
  initialPhone,
  agentSlot,
  deleteSlot,
}: {
  channelId: string;
  channelName: string;
  initialStatus: string;
  initialPhone: string | null;
  agentSlot?: React.ReactNode;
  deleteSlot?: React.ReactNode;
}) {
  const router = useRouter();
  const [state, setState] = useState<Status>({
    status: initialStatus,
    qrDataUrl: null,
    phoneNumber: initialPhone,
    error: null,
    workerUp: true,
  });
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [konfirmCabut, setKonfirmCabut] = useState(false);
  const prevStatus = useRef(initialStatus);

  const refresh = useCallback(async () => {
    // Tab yang tersembunyi tidak perlu ditanyai sama sekali.
    //
    // Halaman ini sering ditinggal terbuka di tab belakang berjam-jam. Tanpa
    // pemeriksaan ini, tiap tab seperti itu tetap mengirim permintaan terus
    // menerus ke server yang juga menjalankan seluruh mesin WhatsApp dan AI,
    // untuk layar yang tidak sedang dilihat siapa pun.
    if (typeof document !== "undefined" && document.hidden) return;

    try {
      const res = await fetch(`/api/channels/${channelId}/status`, {
        cache: "no-store",
      });
      if (!res.ok) return;
      const data: Status = await res.json();
      setState(data);

      if (data.status === "connected" && prevStatus.current !== "connected") {
        router.refresh();
      }
      prevStatus.current = data.status;
    } catch {
      // biarkan, coba lagi di putaran berikutnya
    }
  }, [channelId, router]);

  // Rapat cuma waktu ada yang memang sedang berubah.
  //
  // QR di WhatsApp berganti tiap sekitar 20 detik, jadi selama layarnya
  // menampilkan QR atau sedang menyambung, ceknya harus 2,5 detik sekali.
  // Tapi begitu tersambung, statusnya bisa tidak berubah berhari-hari, dan
  // bertanya 24 kali per menit untuk jawaban yang sama itu beban tetap di
  // server yang juga menjalankan mesin WhatsApp dan AI-nya.
  const sedangBerubah = state.status === "qr" || state.status === "connecting";
  const jeda = sedangBerubah ? 2500 : 20000;

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, jeda);
    // Waktu tab dibuka lagi setelah lama ditinggal, statusnya bisa sudah basi
    // berjam-jam. Tanya sekali langsung, jangan menunggu putaran berikutnya.
    const saatKembali = () => {
      if (!document.hidden) refresh();
    };
    document.addEventListener("visibilitychange", saatKembali);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", saatKembali);
    };
  }, [refresh, jeda]);

  async function post(path: string, body?: unknown) {
    setBusy(true);
    setNotice(null);
    try {
      const res = await fetch(`/api/channels/${channelId}/${path}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) setNotice(data?.error ?? "Ada yang tidak beres.");
      await refresh();
      router.refresh();
    } catch {
      setNotice("Tidak bisa menghubungi server.");
    } finally {
      setBusy(false);
    }
  }

  const connected = state.status === "connected";
  const showingQr = state.status === "qr" && state.qrDataUrl;
  const badge = LABEL[state.status] ?? LABEL.disconnected;

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-200 px-5 py-3.5">
        <div className="flex items-center gap-3">
          <p className="font-medium text-ink-900">{channelName}</p>
          <span className={`badge ${badge.className}`}>{badge.text}</span>
        </div>
        <div className="flex items-center gap-2">
          {connected && (
            <span className="text-sm text-ink-500">{state.phoneNumber ?? ""}</span>
          )}
          {deleteSlot}
        </div>
      </div>

      <div className="p-5">
        {connected ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-600">
                  <Ikon nama="centang" size={20} />
                </span>
                <div>
                  <p className="font-medium text-ink-900">Nomor ini sudah jalan</p>
                  <p className="text-sm text-ink-500">
                    Chat yang masuk ke sini otomatis dibalas.
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button className="btn-ghost" disabled={busy} onClick={() => post("stop")}>
                  Matikan sementara
                </button>
                <button
                  className="btn-danger"
                  disabled={busy}
                  onClick={() => setKonfirmCabut(true)}
                >
                  Cabut nomor
                </button>
              </div>
            </div>

            {/* Konfirmasi di tempat, bukan kotak bawaan browser: dia bisa
                diblokir, dan tidak bisa menjelaskan akibatnya sepelan ini. */}
            {konfirmCabut && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                <p className="text-sm leading-relaxed text-red-900">
                  Cabut nomor ini dari Palwise? Chat yang masuk berhenti dibalas,
                  dan kamu perlu scan QR lagi kalau mau memakainya. Riwayat
                  obrolannya tetap tersimpan.
                </p>
                <div className="mt-2.5 flex gap-2">
                  <button
                    className="btn-danger px-3 py-1.5 text-xs"
                    disabled={busy}
                    onClick={() => {
                      setKonfirmCabut(false);
                      post("stop", { logout: true });
                    }}
                  >
                    Ya, cabut
                  </button>
                  <button
                    type="button"
                    className="rounded-lg border border-ink-200 bg-white px-3 py-1.5 text-xs text-ink-700 hover:bg-ink-50"
                    onClick={() => setKonfirmCabut(false)}
                  >
                    Batal
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-[260px_minmax(0,1fr)] md:gap-8">
            {/* Di HP kotaknya dibatasi 240px dan ditaruh di tengah. Tanpa itu
                dia jadi persegi selebar layar, dan waktu QR-nya belum muncul
                yang kelihatan cuma satu kotak kosong raksasa. */}
            <div className="mx-auto grid aspect-square w-full max-w-[240px] place-items-center rounded-xl border border-ink-200 bg-ink-50 md:mx-0 md:max-w-none">
              {showingQr ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={state.qrDataUrl!}
                  alt="Kode QR WhatsApp"
                  className="h-full w-full rounded-xl bg-white p-3"
                />
              ) : state.status === "connecting" ? (
                <p className="px-6 text-center text-sm text-ink-500">Sebentar ya</p>
              ) : (
                <p className="px-6 text-center text-sm text-ink-500">
                  Klik Sambungkan untuk memunculkan QR
                </p>
              )}
            </div>

            <div>
              <h3 className="font-semibold text-ink-900">Cara menyambungkan</h3>
              <ol className="mt-4 space-y-2.5">
                {STEPS.map((s, i) => (
                  <li key={s} className="flex gap-3 text-sm text-ink-700">
                    <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-ink-100 text-[11px] font-medium text-ink-600">
                      {i + 1}
                    </span>
                    {s}
                  </li>
                ))}
              </ol>

              {/* Cuma kalau tidak ada keterangan yang lebih spesifik.

                  Waktu nomornya dicabut dari HP, worker menyimpan alasan yang
                  lebih jelas di lastError ("dikeluarkan lewat menu Perangkat
                  tertaut di HP"), dan itu ditampilkan di kotak merah tepat di
                  bawah. Tanpa syarat ini, dua kotak bertumpuk mengatakan hal
                  yang sama dengan kalimat berbeda, dan orang yang membacanya
                  wajar mengira ada dua masalah. */}
              {state.status === "logged_out" && !state.error && (
                <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  Nomor ini dicabut dari HP. Scan QR lagi kalau mau dipakai.
                </p>
              )}
              {state.error && (
                <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                  {state.error}
                </p>
              )}
              {!state.workerUp && (
                <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  Mesin Palwise belum menyala.
                </p>
              )}
              {notice && (
                <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                  {notice}
                </p>
              )}

              <div className="mt-6 flex gap-2">
                <button className="btn-primary" disabled={busy} onClick={() => post("start")}>
                  {busy ? "Sebentar" : showingQr ? "Ganti QR baru" : "Sambungkan"}
                </button>
                {(state.status === "qr" || state.status === "connecting") && (
                  <button className="btn-ghost" disabled={busy} onClick={() => post("stop")}>
                    Batal
                  </button>
                )}
              </div>

              <p className="mt-5 text-xs leading-relaxed text-ink-500">
                Kotak QR ganti otomatis tiap 20 detik dan halaman ini ikut
                memperbaruinya, jadi tidak usah di-refresh.
              </p>
            </div>
          </div>
        )}

        {agentSlot && (
          <div className="mt-5 border-t border-ink-100 pt-5">{agentSlot}</div>
        )}
      </div>
    </div>
  );
}
