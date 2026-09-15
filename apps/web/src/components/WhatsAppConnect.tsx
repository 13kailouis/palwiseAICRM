"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Ikon } from "@/components/Ikon";
import compact from "./WhatsAppConnect.module.css";

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
  connecting: {
    text: "Menghubungkan",
    className: "bg-amber-50 text-amber-700",
  },
  // "Menunggu dipindai" itu keadaan menunggu, sama keluarga dengan "Lagi
  // nyambung", jadi ikut amber. Dulu biru bawaan Tailwind (bukan biru merek),
  // jadi terbaca seperti warna asing yang tidak ada di halaman lain.
  qr: { text: "Menunggu dipindai", className: "bg-amber-50 text-amber-700" },
  logged_out: { text: "Dicabut dari HP", className: "bg-red-50 text-red-700" },
  disconnected: {
    text: "Belum tersambung",
    className: "bg-ink-100 text-ink-600",
  },
};

export function WhatsAppConnect({
  channelId,
  channelName,
  initialStatus,
  initialPhone,
  agentSlot,
  deleteSlot,
  dalamChat = false,
  onStatusChange,
  onClose,
  channelPicker,
}: {
  channelId: string;
  channelName: string;
  initialStatus: string;
  initialPhone: string | null;
  agentSlot?: React.ReactNode;
  deleteSlot?: React.ReactNode;
  dalamChat?: boolean;
  onStatusChange?: (connected: boolean) => void;
  onClose?: () => void;
  channelPicker?: React.ReactNode;
}) {
  const router = useRouter();
  const [state, setState] = useState<Status>({
    status: initialStatus,
    qrDataUrl: null,
    phoneNumber: initialPhone,
    error: null,
    workerUp: true,
  });
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [konfirmCabut, setKonfirmCabut] = useState(false);
  const prevStatus = useRef(initialStatus);
  const statusCallback = useRef(onStatusChange);
  statusCallback.current = onStatusChange;
  const refreshBusy = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    // Tab yang tersembunyi tidak perlu ditanyai sama sekali.
    //
    // Halaman ini sering ditinggal terbuka di tab belakang berjam-jam. Tanpa
    // pemeriksaan ini, tiap tab seperti itu tetap mengirim permintaan terus
    // menerus ke server yang juga menjalankan seluruh mesin WhatsApp dan AI,
    // untuk layar yang tidak sedang dilihat siapa pun.
    if (
      (typeof document !== "undefined" && document.hidden) ||
      refreshBusy.current
    )
      return;
    refreshBusy.current = true;

    try {
      const res = await fetch(`/api/channels/${channelId}/status`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Status WhatsApp belum bisa dimuat.");
      const data: Status = await res.json();
      if (!mounted.current) return;
      setState(data);
      setChecked(true);
      statusCallback.current?.(data.status === "connected" && data.workerUp);

      if (data.status === "connected" && prevStatus.current !== "connected") {
        if (!dalamChat) router.refresh();
      }
      prevStatus.current = data.status;
    } catch {
      if (!mounted.current) return;
      setState((s) => ({ ...s, qrDataUrl: null, workerUp: false }));
      setChecked(true);
      statusCallback.current?.(false);
    } finally {
      refreshBusy.current = false;
    }
  }, [channelId, router, dalamChat]);

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
      if (!dalamChat) router.refresh();
    } catch {
      setNotice("Tidak bisa menghubungi server.");
    } finally {
      setBusy(false);
    }
  }

  const connected = state.status === "connected";
  const showingQr = state.workerUp && state.status === "qr" && state.qrDataUrl;
  const badge = LABEL[state.status] ?? LABEL.disconnected;

  if (dalamChat)
    return (
      <div className={compact.card}>
        <div className={compact.heading}>
          <Ikon nama="whatsapp" size={21} />
          <div className={compact.identity}>
            <h3>{channelName}</h3>
            <p role="status">
              {!checked
                ? "Memeriksa sambungan…"
                : !state.workerUp
                  ? "Status belum tersedia"
                  : connected
                    ? state.phoneNumber || "Tersambung"
                    : state.status === "logged_out"
                      ? "Tautan dicabut dari WhatsApp"
                      : badge.text}
            </p>
          </div>
          {checked && connected && state.workerUp && (
            <Ikon nama="centang" size={18} className="text-brand-600" />
          )}
          <a
            href="/app/whatsapp"
            className={compact.icon}
            aria-label="Kelola nomor WhatsApp"
            title="Kelola nomor WhatsApp"
          >
            <span aria-hidden="true">↗</span>
          </a>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className={compact.icon}
              aria-label="Tutup kartu WhatsApp"
              title="Tutup kartu WhatsApp"
            >
              <Ikon nama="silang" size={16} />
            </button>
          )}
        </div>
        {channelPicker}
        {checked && !(connected && state.workerUp) && (
          <div className={compact.body}>
            {showingQr && (
              <div className={compact.qr}>
                <img
                  src={state.qrDataUrl!}
                  width={200}
                  height={200}
                  alt="Kode QR untuk menautkan WhatsApp ke Palwise"
                />
                <p>
                  WhatsApp → <strong>Perangkat tertaut</strong> →{" "}
                  <strong>Tautkan perangkat</strong>
                </p>
              </div>
            )}
            {state.status === "connecting" && state.workerUp && (
              <p className={compact.status} role="status">
                Menyiapkan sambungan…
              </p>
            )}
            {(notice ||
              !state.workerUp ||
              (state.error && state.status !== "logged_out")) && (
              <p role="alert" className={compact.error}>
                {notice ||
                  (!state.workerUp
                    ? "Sambungan belum bisa diperiksa. Coba lagi."
                    : state.error)}
              </p>
            )}
            <div className={compact.actions}>
              {!state.workerUp ? (
                <button
                  type="button"
                  className={compact.primary}
                  disabled={busy}
                  onClick={refresh}
                >
                  Coba lagi
                </button>
              ) : (
                <button
                  type="button"
                  className={compact.primary}
                  disabled={busy || state.status === "connecting"}
                  onClick={() => post("start")}
                >
                  {busy
                    ? "Memproses…"
                    : showingQr
                      ? "Perbarui QR"
                      : "Tampilkan QR"}
                </button>
              )}
              {state.workerUp && sedangBerubah && (
                <button
                  type="button"
                  className={compact.secondary}
                  disabled={busy}
                  onClick={() => post("stop")}
                >
                  Batal
                </button>
              )}
              <details className={compact.help}>
                <summary>Bantuan</summary>
                <div>
                  <p>
                    Buka WhatsApp di HP → Perangkat tertaut → Tautkan perangkat,
                    lalu scan QR. Di iPhone, menu ini ada di Pengaturan.
                  </p>
                  <p>
                    Memakai HP yang sama? Buka chat ini di komputer atau
                    perangkat lain untuk menampilkan QR.
                  </p>
                  <p>QR diperbarui otomatis saat kartu terbuka.</p>
                </div>
              </details>
            </div>
          </div>
        )}
      </div>
    );

  return (
    <section className="pw-channel-card">
      <div className="pw-channel-header">
        <span className="pw-settings-icon">
          <Ikon nama="whatsapp" size={22} />
        </span>
        <div className="min-w-0 flex-1">
          <h3>{channelName}</h3>
          <p role="status">
            {!checked
              ? "Memeriksa sambungan…"
              : !state.workerUp
                ? "Status belum tersedia"
                : connected
                  ? state.phoneNumber || "WhatsApp tersambung"
                  : badge.text}
          </p>
        </div>
        {checked && connected && state.workerUp && (
          <span className="badge bg-ink-100 text-ink-700">Tersambung</span>
        )}
        {deleteSlot}
      </div>
      <div className="pw-channel-body">
        {!checked ? (
          <p className="text-sm text-ink-500" role="status">
            Mengambil status WhatsApp…
          </p>
        ) : !state.workerUp ? (
          <div className="pw-channel-status">
            <h4>Status sambungan belum dapat diperiksa</h4>
            <p>
              Sementara, tangani pelanggan langsung di WhatsApp. Coba periksa
              kembali untuk melihat status terbaru.
            </p>
            <button type="button" className="btn-ghost mt-4" onClick={refresh}>
              Periksa kembali
            </button>
          </div>
        ) : connected ? (
          <div className="pw-channel-status">
            <h4>Siap terhubung dengan pelanggan</h4>
            <p>
              Balasan mengikuti asisten dan pengaturan yang kamu pilih untuk
              nomor ini.
            </p>
            <details className="mt-4">
              <summary className="cursor-pointer py-2 text-xs font-medium text-ink-600">
                Kelola sambungan
              </summary>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn-ghost"
                  disabled={busy}
                  onClick={() => post("stop")}
                >
                  Jeda sambungan
                </button>
                <button
                  type="button"
                  className="btn-danger"
                  disabled={busy}
                  onClick={() => setKonfirmCabut(true)}
                >
                  Lepaskan nomor
                </button>
              </div>
            </details>
          </div>
        ) : (
          <div>
            {showingQr ? (
              <div className="pw-channel-qr">
                <img
                  src={state.qrDataUrl!}
                  width={240}
                  height={240}
                  alt="Kode QR untuk menautkan WhatsApp ke Palwise"
                />
                <div>
                  <h4>Pindai dari WhatsApp di HP</h4>
                  <ol>
                    {STEPS.map((step, i) => (
                      <li key={step}>
                        <span>{i + 1}</span>
                        {step}
                      </li>
                    ))}
                  </ol>
                  <p>QR diperbarui otomatis saat halaman terbuka.</p>
                </div>
              </div>
            ) : (
              <div className="pw-channel-status">
                <h4>
                  {state.status === "connecting"
                    ? "Menyiapkan sambungan…"
                    : state.status === "logged_out"
                      ? "Tautkan kembali nomor bisnismu"
                      : "Sambungkan dalam beberapa langkah"}
                </h4>
                <p>
                  Buka WhatsApp di HP, pilih Perangkat tertaut, lalu pindai kode
                  QR yang muncul di sini.
                </p>
              </div>
            )}
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button
                type="button"
                className="btn-primary"
                disabled={busy || state.status === "connecting"}
                onClick={() => post("start")}
              >
                {busy
                  ? "Memproses…"
                  : showingQr
                    ? "Perbarui QR"
                    : state.status === "connecting"
                      ? "Menghubungkan…"
                      : "Tampilkan QR"}
              </button>
              {sedangBerubah && (
                <button
                  type="button"
                  className="btn-ghost"
                  disabled={busy}
                  onClick={() => post("stop")}
                >
                  Batal
                </button>
              )}
            </div>
            <details className="mt-3">
              <summary className="cursor-pointer py-2 text-xs font-medium text-ink-600">
                Menyambungkan dari HP?
              </summary>
              <p className="mt-2 text-xs leading-relaxed text-ink-500">
                Buka Palwise di komputer atau perangkat lain untuk menampilkan
                QR. Di iPhone, Perangkat tertaut berada di menu Pengaturan
                WhatsApp.
              </p>
            </details>
          </div>
        )}
        {(notice || (state.error && state.workerUp)) && (
          <p
            role="alert"
            className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"
          >
            {notice ||
              "Sambungan perlu diperbarui. Coba tautkan kembali nomor melalui QR."}
          </p>
        )}
        {konfirmCabut && (
          <div
            role="alert"
            className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4"
          >
            <p className="text-sm leading-relaxed text-red-900">
              Lepaskan {channelName} dari Palwise? Balasan otomatis berhenti.
              Riwayat tetap tersimpan dan kamu perlu memindai QR untuk
              menyambungkannya kembali.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                className="btn-danger"
                disabled={busy}
                onClick={() => {
                  setKonfirmCabut(false);
                  void post("stop", { logout: true });
                }}
              >
                Ya, lepaskan nomor
              </button>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setKonfirmCabut(false)}
              >
                Batal
              </button>
            </div>
          </div>
        )}
        {agentSlot && (
          <div className="mt-6 border-t border-ink-100 pt-5">{agentSlot}</div>
        )}
      </div>
    </section>
  );
}
