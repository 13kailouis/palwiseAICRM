import Link from "next/link";
import { Ikon, type NamaIkon } from "@/components/Ikon";

/** Lebar kolom untuk halaman berbentuk formulir. Dipakai bersama supaya
 *  kepala halaman, baris tab, dan isinya berdiri di garis kiri yang sama. */
export const KOLOM_SEMPIT = "mx-auto w-full max-w-3xl px-5 sm:px-6";

/**
 * Lebar kolom untuk halaman form yang punya panel bantuan di sampingnya.
 *
 * Lebih lebar dari KOLOM_SEMPIT karena isinya dua kolom: formulir di kiri dan
 * panel bantuan yang nempel di kanan. Di layar lebar, ruang samping yang dulu
 * kosong sekarang dipakai untuk penjelasan panjang, jadi kotak isiannya sendiri
 * tidak lagi penuh teks. Kepala halaman dan baris tab ikut lebar ini supaya
 * garis kirinya sama dengan formulirnya.
 */
export const KOLOM_FORM = "mx-auto w-full max-w-5xl px-5 sm:px-6";

/**
 * Avatar inisial, digambar sendiri, dipakai bersama (kotak masuk + profil).
 *
 * Inisial dalam lingkaran netral, bukan warna acak per orang (warna acak
 * menarik mata ke hiasan, padahal yang penting namanya) dan bukan foto orang
 * asing. Sama seperti aplikasi chat yang orang pakai tiap hari.
 */
export function Avatar({ nama, ukuran = 40 }: { nama: string; ukuran?: number }) {
  const inisial = (nama.trim()[0] ?? "?").toUpperCase();
  return (
    <span
      aria-hidden
      className="grid shrink-0 place-items-center rounded-full bg-ink-100 font-semibold text-ink-600"
      style={{ height: ukuran, width: ukuran, fontSize: ukuran * 0.42 }}
    >
      {inisial}
    </span>
  );
}

export function PageHeader({
  title,
  description,
  action,
  sempit = false,
  kolom,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  /** Halaman berbentuk formulir satu kolom: isinya ikut satu kolom di tengah. */
  sempit?: boolean;
  /** Lebar kolom yang dipakai isinya. Menang atas `sempit` kalau diisi.
   *  Dipakai halaman form dua kolom supaya kepala halaman selebar formulirnya. */
  kolom?: string;
}) {
  // Kolom eksplisit menang. Kalau tidak ada, jatuh ke perilaku lama: sempit
  // memakai KOLOM_SEMPIT, selain itu selebar layar dengan padding sendiri.
  const dalam = kolom ?? (sempit ? KOLOM_SEMPIT : "");
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
      className={`kepala-halaman anim-muncul border-b border-ink-200 bg-white py-4 sm:py-5 ${
        dalam ? "" : "px-5 sm:px-6"
      }`}
    >
      {/* Pita putihnya tetap selebar layar, cuma isinya yang masuk ke kolom.
          Pita yang ikut menyempit membuat garis bawahnya menggantung di
          tengah-tengah dan halaman jadi terlihat patah. */}
      <div
        className={`flex flex-wrap items-start justify-between gap-4 ${dalam}`}
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

/**
 * Tata letak halaman form: isi di kiri, panel bantuan yang nempel di kanan.
 *
 * Di layar lebar, ruang samping yang dulu kosong dipakai untuk penjelasan
 * panjang, jadi kotak isian di kiri tidak lagi penuh teks. Di HP dan tablet,
 * dua kolomnya menumpuk: isi dulu, bantuan di bawahnya, karena di layar sempit
 * yang orang butuh duluan kotak isiannya, bukan penjelasannya.
 *
 * Padding horizontalnya ditaruh di kolom KIRI, bukan di pembungkus luar, supaya
 * bilah Simpan yang menempel di dasar formulir (SaveBar, pakai margin negatif
 * -mx untuk membleed ke tepi) tetap pas selebar kolomnya. Panel kanan
 * paddingnya sendiri.
 */
export function FormDuaKolom({
  children,
  bantuan,
}: {
  children: React.ReactNode;
  bantuan: React.ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-5xl">
      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_17rem] lg:items-start lg:gap-8">
        {/* Panel bantuan ditaruh DULUAN di kode, tapi digeser ke kanan di
            laptop pakai order. Gunanya: di HP dia muncul di ATAS formulir
            (ringkas, bisa dibuka), bukan terdampar di paling bawah layar di
            mana tidak ada yang menggulir sampai situ. Di laptop dia jadi kolom
            kanan yang nempel. */}
        <aside className="order-first px-5 pt-4 sm:px-6 lg:order-2 lg:sticky lg:top-6 lg:px-0 lg:pt-6">
          {bantuan}
        </aside>
        <div className="min-w-0 px-5 py-6 sm:px-6 lg:order-1">{children}</div>
      </div>
    </div>
  );
}

/**
 * Panel bantuan: judul, beberapa poin pendek, tautan opsional.
 *
 * Dua wajah, sesuai layarnya:
 * - Di HP jadi satu baris yang bisa dibuka (`<details>`), ditaruh di atas
 *   formulir. Ringkas dulu, isinya keluar kalau memang mau dibaca. Layar HP
 *   pendek, dan panel penuh yang selalu terbentang di situ cuma jadi tembok.
 * - Di laptop jadi panel statis di kolom kanan, mengisi ruang yang dulu kosong.
 *
 * Poin sengaja PENDEK. Ini tempat memindahkan penjelasan yang tadinya numpuk di
 * dalam formulir, bukan tempat menaruh paragraf baru.
 */
export function PanelBantuan({
  judul,
  poin,
  tautan,
}: {
  judul: string;
  poin: { ikon: NamaIkon; teks: React.ReactNode }[];
  tautan?: { href: string; label: string };
}) {
  const daftar = (
    <>
      <ul className="space-y-3">
        {poin.map((p, i) => (
          <li key={i} className="flex gap-2.5">
            <span className="mt-0.5 shrink-0 text-ink-400">
              <Ikon nama={p.ikon} size={16} />
            </span>
            <span className="text-[13px] leading-relaxed text-ink-600">
              {p.teks}
            </span>
          </li>
        ))}
      </ul>
      {tautan && (
        <Link
          href={tautan.href}
          className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-brand-700 hover:text-brand-800"
        >
          {tautan.label}
          <span aria-hidden>→</span>
        </Link>
      )}
    </>
  );

  return (
    <>
      {/* HP: ringkas, bisa dibuka. */}
      <details className="card group lg:hidden">
        <summary className="tap-aman flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-medium text-ink-800">
          {judul}
          <span
            className="shrink-0 text-ink-400 transition-transform group-open:rotate-180"
            style={{ transitionDuration: "var(--gerak-cepat)" }}
            aria-hidden="true"
          >
            <svg
              viewBox="0 0 24 24"
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </span>
        </summary>
        <div className="border-t border-ink-100 px-4 py-4">{daftar}</div>
      </details>

      {/* Laptop: panel statis di kolom kanan. */}
      <div className="hidden rounded-xl border border-ink-200 bg-ink-50 p-5 lg:block">
        <p className="text-sm font-semibold text-ink-900">{judul}</p>
        <div className="mt-3">{daftar}</div>
      </div>
    </>
  );
}

export function Stat({
  label,
  value,
  sub,
  ikon,
  href,
  nyala = false,
}: {
  label: string;
  value: string | number;
  sub?: string;
  ikon?: NamaIkon;
  /** Kalau diisi, seluruh kartunya jadi tautan. */
  href?: string;
  /** Tandai kartu yang butuh perhatian (mis. ada yang nunggu dibalas): tepi
   *  dan lambangnya jadi amber supaya matanya berhenti di sana lebih dulu. */
  nyala?: boolean;
}) {
  const isi = (
    <>
      <div className="flex items-start justify-between gap-2">
        <p className="text-[13px] leading-snug text-ink-500">{label}</p>
        {ikon && (
          <span
            className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg ${
              nyala ? "bg-amber-100 text-amber-700" : "bg-ink-100 text-ink-500"
            }`}
          >
            <Ikon nama={ikon} size={15} />
          </span>
        )}
      </div>
      <p className="mt-2 text-[26px] font-semibold leading-none tracking-tight tabular-nums text-ink-950">
        {value}
      </p>
      {sub && (
        <p
          className={`mt-1.5 text-xs ${
            nyala ? "font-medium text-amber-700" : "text-ink-500"
          }`}
        >
          {sub}
        </p>
      )}
    </>
  );

  const kelas = `card p-4 ${nyala ? "border-amber-200" : ""}`;
  if (href) {
    return (
      <Link
        href={href}
        className={`${kelas} block transition hover:border-ink-300`}
      >
        {isi}
      </Link>
    );
  }
  return <div className={kelas}>{isi}</div>;
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
