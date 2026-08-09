import Link from "next/link";

/** Lebar kolom untuk halaman berbentuk formulir. Dipakai bersama supaya
 *  kepala halaman, baris tab, dan isinya berdiri di garis kiri yang sama. */
export const KOLOM_SEMPIT = "mx-auto w-full max-w-3xl px-5 sm:px-6";

export function PageHeader({
  title,
  description,
  action,
  sempit = false,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  /** Halaman berbentuk formulir: isinya ikut satu kolom di tengah. */
  sempit?: boolean;
}) {
  return (
    /* anim-muncul, BUKAN anim-naik.
     *
     * anim-naik menggeser elemennya turun 8px lalu menaikkannya kembali.
     * translateY tidak mengubah tata letak, jadi selama 200 ms itu kepala
     * halaman menutupi baris di bawahnya sebanyak 8px. Ditambah transform
     * membuat elemennya digambar di lapisan atas, jadi yang tertutup benar-
     * benar hilang sebentar, bukan cuma bertumpuk samar.
     *
     * Fade saja tidak menggeser apa pun, jadi tidak ada yang bisa tertutup.
     * Gerak naik tetap dipakai untuk kartu di dalam halaman, karena di sana
     * tidak ada apa pun tepat di bawahnya yang bisa tertimpa. */
    <div
      className={`anim-muncul border-b border-ink-200 bg-white py-4 sm:py-5 ${
        sempit ? "" : "px-5 sm:px-6"
      }`}
    >
      {/* Pita putihnya tetap selebar layar, cuma isinya yang masuk ke kolom.
          Pita yang ikut menyempit membuat garis bawahnya menggantung di
          tengah-tengah dan halaman jadi terlihat patah. */}
      <div
        className={`flex flex-wrap items-start justify-between gap-4 ${
          sempit ? KOLOM_SEMPIT : ""
        }`}
      >
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-ink-950">{title}</h1>
          {description && (
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-ink-500">
              {description}
            </p>
          )}
        </div>
        {action}
      </div>
    </div>
  );
}

export function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="card-pad">
      <p className="text-sm text-ink-500">{label}</p>
      <p className="mt-1.5 text-2xl font-semibold tracking-tight text-ink-950">
        {value}
      </p>
      {sub && <p className="mt-1 text-xs text-ink-500">{sub}</p>}
    </div>
  );
}

export function EmptyState({
  title,
  body,
  href,
  cta,
}: {
  title: string;
  body: string;
  href?: string;
  cta?: string;
}) {
  return (
    <div className="card grid place-items-center px-6 py-16 text-center">
      <div className="max-w-sm">
        <p className="font-medium text-ink-900">{title}</p>
        <p className="mt-2 text-sm leading-relaxed text-ink-500">{body}</p>
        {href && cta && (
          <Link href={href} className="btn-primary mt-5">
            {cta}
          </Link>
        )}
      </div>
    </div>
  );
}

const STAGE_STYLES: Record<string, string> = {
  baru: "bg-ink-100 text-ink-700",
  tertarik: "bg-blue-50 text-blue-700",
  negosiasi: "bg-amber-50 text-amber-700",
  closing: "bg-violet-50 text-violet-700",
  selesai: "bg-brand-50 text-brand-700",
  batal: "bg-red-50 text-red-700",
};

export function StageBadge({ stage }: { stage: string }) {
  return (
    <span className={`badge ${STAGE_STYLES[stage] ?? STAGE_STYLES.baru}`}>
      {stage}
    </span>
  );
}

const CHANNEL_STATUS: Record<string, { label: string; className: string }> = {
  connected: { label: "Aktif", className: "bg-brand-50 text-brand-700" },
  connecting: { label: "Lagi nyambung", className: "bg-amber-50 text-amber-700" },
  qr: { label: "Tunggu di-scan", className: "bg-blue-50 text-blue-700" },
  logged_out: { label: "Dicabut dari HP", className: "bg-red-50 text-red-700" },
  disconnected: { label: "Belum nyambung", className: "bg-ink-100 text-ink-600" },
};

export function ChannelBadge({ status }: { status: string }) {
  const s = CHANNEL_STATUS[status] ?? CHANNEL_STATUS.disconnected;
  return <span className={`badge ${s.className}`}>{s.label}</span>;
}

/**
 * "Sudah menggantung 3 hari" jauh lebih menggerakkan daripada tanggal.
 *
 * Yang bikin pelanggan pergi bukan adanya masalah, tapi lamanya didiamkan.
 * Jadi yang ditampilkan lamanya, bukan kapannya.
 */
export function menggantung(sejak: Date | string): string {
  const d = typeof sejak === "string" ? new Date(sejak) : sejak;
  const menit = Math.floor((Date.now() - d.getTime()) / 60000);
  if (menit < 60) return "baru saja";
  const jam = Math.floor(menit / 60);
  if (jam < 24) return "menggantung " + jam + " jam";
  return "menggantung " + Math.floor(jam / 24) + " hari";
}

/**
 * Janji temu, ditulis seperti orang menyebutkannya.
 *
 * "Besok jam 14.00" jauh lebih cepat ditangkap daripada "05/08/2026 14:00".
 * Yang dicari orang dari daftar janji itu "apa ada yang datang hari ini",
 * bukan tanggal persisnya.
 */
export function formatJanji(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const jam = d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });

  const hariIni = new Date();
  hariIni.setHours(0, 0, 0, 0);
  const hariJanji = new Date(d);
  hariJanji.setHours(0, 0, 0, 0);
  const beda = Math.round(
    (hariJanji.getTime() - hariIni.getTime()) / (24 * 60 * 60 * 1000),
  );

  if (beda === 0) return `Hari ini jam ${jam}`;
  if (beda === 1) return `Besok jam ${jam}`;
  if (beda === -1) return `Kemarin jam ${jam}`;
  if (beda > 1 && beda < 7) {
    return `${d.toLocaleDateString("id-ID", { weekday: "long" })} jam ${jam}`;
  }
  const tanggal = d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
  return beda < 0 ? `${tanggal}, sudah lewat` : `${tanggal} jam ${jam}`;
}

/**
 * Bentuk yang diminta <input type="datetime-local">, yaitu waktu SETEMPAT.
 *
 * toISOString() tidak bisa dipakai di sini karena dia mengubah ke UTC, dan
 * hasilnya janji jam 2 siang tampil sebagai jam 7 pagi di kotak isian.
 */
export function untukIsianWaktu(date: Date | null | undefined): string {
  if (!date) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}T${p(
    date.getHours(),
  )}:${p(date.getMinutes())}`;
}

export function formatWaktu(date: Date | string | null | undefined): string {
  if (!date) return "-";
  const d = typeof date === "string" ? new Date(date) : date;
  const diff = Date.now() - d.getTime();
  const menit = Math.floor(diff / 60000);
  if (menit < 1) return "barusan";
  if (menit < 60) return `${menit} menit lalu`;
  const jam = Math.floor(menit / 60);
  if (jam < 24) return `${jam} jam lalu`;
  const hari = Math.floor(jam / 24);
  if (hari < 7) return `${hari} hari lalu`;
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}
