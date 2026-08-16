/**
 * Inti dinamis: perasaan sebagai keadaan sistem yang bergerak, bukan label
 * yang dihitung ulang dari nol tiap pesan.
 *
 * Diturunkan dari mesin afektif yang dipakai Miso, dengan tiga perubahan yang
 * semuanya karena PEMAKAINYA BEDA.
 *
 * 1. KEPRIBADIAN DIBUANG. Di Miso, Big Five menentukan temperamen si pet. Di
 *    sini yang dibaca PELANGGAN, dan kita tidak tahu kepribadiannya. Jadi
 *    temperamennya netral (0,0,0) untuk semua orang, dan konstanta dinamikanya
 *    ditulis langsung. Kalau suatu hari mau menyimpulkan watak pelanggan dari
 *    riwayatnya, di situlah kelasnya dikembalikan.
 *
 * 2. AGENCY, NOVELTY, CERTAINTY DIBUANG dari appraisal. Di mesin aslinya
 *    ketiganya dipakai menurunkan dominance dan gain. Di sini dominance
 *    ditentukan langsung per isyarat di leksikon ("penipu" itu dominan, "waduh"
 *    tidak), dan itu jauh lebih bisa ditala daripada menebaknya dari agency.
 *
 * 3. SEMUA KONSTANTA WAKTU DISKALA ULANG. Ini yang paling menentukan, dan
 *    kalau dilewatkan seluruh lapisan ini jadi omong kosong. Miso ditick 120
 *    kali per detik dan kejadiannya berjarak detik; di sana stimulus yang habis
 *    dalam 5 detik itu benar. Chat WhatsApp berjarak MENIT, kadang jam. Dengan
 *    konstanta asli, pelanggan yang marah jam 10.00 sudah kembali netral
 *    sepenuhnya waktu dia menulis lagi jam 10.02, dan lapisan ini tidak akan
 *    pernah mengingat apa pun.
 *
 * Skala waktunya sekarang, semuanya dalam DETIK:
 *
 *   stimulus  paruh ~10 menit   tendangan pesan ini, masih terasa di giliran
 *                               berikutnya, habis kalau obrolannya menggantung
 *   emosi     tetapan ~20 detik reaksi cepat, sudah menetap sebelum balasan jadi
 *   mood      paruh ~1,6 jam    latar obrolan; ini yang bikin pelanggan yang
 *                               tadi marah tetap waspada walau sekarang sopan
 *   kortisol  paruh ~1 jam      kewaspadaan paling lambat pulih, dan memang
 *                               begitu kejadiannya pada orang
 *   noradren. paruh ~4 menit    lonjakan paling cepat reda
 *
 * Asimetri kortisol lawan noradrenalin itu bukan hiasan. Dia yang membuat
 * "kesal" meluruh lebih lambat daripada "kaget", dan itu persis yang membedakan
 * bacaan yang terasa benar dari bacaan yang berayun tiap pesan.
 */

export const jepit = (x: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, x));
export const jepit01 = (x: number) => Math.min(1, Math.max(0, x));

export class PAD {
  constructor(
    public p = 0,
    public a = 0,
    public d = 0,
  ) {}
  tambah(o: PAD) {
    return new PAD(this.p + o.p, this.a + o.a, this.d + o.d);
  }
  kurang(o: PAD) {
    return new PAD(this.p - o.p, this.a - o.a, this.d - o.d);
  }
  kali(k: number) {
    return new PAD(this.p * k, this.a * k, this.d * k);
  }
  skala(kp: number, ka: number, kd: number) {
    return new PAD(this.p * kp, this.a * ka, this.d * kd);
  }
  panjang() {
    return Math.sqrt(this.p * this.p + this.a * this.a + this.d * this.d);
  }
  batas(lo = -1, hi = 1) {
    return new PAD(jepit(this.p, lo, hi), jepit(this.a, lo, hi), jepit(this.d, lo, hi));
  }
  keObjek() {
    return { p: +this.p.toFixed(4), a: +this.a.toFixed(4), d: +this.d.toFixed(4) };
  }
  static dariObjek(o: { p?: number; a?: number; d?: number } = {}) {
    return new PAD(+(o.p ?? 0) || 0, +(o.a ?? 0) || 0, +(o.d ?? 0) || 0);
  }
}

/**
 * Appraisal: hasil pembacaan satu pesan, sebelum masuk ke dinamika.
 *
 * Sengaja cuma lima dimensi. Mesin aslinya punya sembilan, dan empat sisanya
 * (novelty, certainty, goal_conduciveness, agency) di sini cuma jadi jalan
 * memutar menuju angka yang toh sudah kita tentukan sendiri di leksikon.
 */
export interface Appraisal {
  /** -1..1. Enak atau tidak enak. */
  valensi: number;
  /** -1..1. 0 = tenang biasa, 1 = meledak, -1 = datar/lesu. */
  gairah: number;
  /** -1..1. Marah itu dominan (menuntut); ragu dan takut tidak. */
  kuasa: number;
  /** 0..1. Butuh sekarang. */
  desakan: number;
  /** -1..1. Merasa dekat atau menjauh. */
  kedekatan: number;
}

export const APPRAISAL_KOSONG: Appraisal = {
  valensi: 0,
  gairah: 0,
  kuasa: 0,
  desakan: 0,
  kedekatan: 0,
};

// ── neurokimia ────────────────────────────────────────────────────────────────

const NAMA_NEURO = [
  "dopamin",
  "serotonin",
  "kortisol",
  "oksitosin",
  "noradrenalin",
] as const;
type NamaNeuro = (typeof NAMA_NEURO)[number];

/** Laju peluruhan per detik. Lihat tabel paruh waktu di kepala berkas. */
const LURUH: Record<NamaNeuro, number> = {
  dopamin: 0.0015,
  serotonin: 0.0001,
  kortisol: 0.0002,
  oksitosin: 0.0004,
  noradrenalin: 0.003,
};

const DASAR: Record<NamaNeuro, number> = {
  dopamin: 0.5,
  serotonin: 0.5,
  kortisol: 0.3,
  oksitosin: 0.4,
  noradrenalin: 0.3,
};

class Neurokimia {
  nilai: Record<NamaNeuro, number> = { ...DASAR };

  set(n: NamaNeuro, v: number) {
    this.nilai[n] = jepit01(v);
  }
  luruh(dt: number) {
    for (const n of NAMA_NEURO) {
      this.set(n, DASAR[n] + (this.nilai[n] - DASAR[n]) * Math.exp(-LURUH[n] * dt));
    }
  }
  picu(d: Partial<Record<NamaNeuro, number>>) {
    for (const n of NAMA_NEURO) if (d[n]) this.set(n, this.nilai[n] + d[n]!);
  }
  simpang(n: NamaNeuro) {
    return this.nilai[n] - DASAR[n];
  }

  gainValensi() {
    return (
      1 +
      0.8 * this.simpang("dopamin") +
      0.6 * this.simpang("serotonin") +
      0.5 * this.simpang("oksitosin") -
      0.7 * this.simpang("kortisol")
    );
  }
  gainGairah() {
    return (
      1 + 1.1 * this.simpang("noradrenalin") + 0.7 * this.simpang("kortisol")
    );
  }
  gainKuasa() {
    return 1 + 0.6 * this.simpang("serotonin") - 0.5 * this.simpang("kortisol");
  }
  /**
   * Seberapa cepat emosi kembali ke mood.
   *
   * Kortisol tinggi memperlambatnya. Ini satu-satunya tempat di mana "pernah
   * kesal tadi" benar-benar mengubah cara pesan BERIKUTNYA dibaca, dan itu
   * memang yang terjadi pada orang: sekali merasa diabaikan, pesan netral pun
   * dibacanya sebagai dingin.
   */
  pemulihan() {
    return jepit(1 + 0.5 * this.simpang("serotonin") - 0.8 * this.simpang("kortisol"), 0.4, 1.6);
  }
}

// ── inti ──────────────────────────────────────────────────────────────────────

/** Batas langkah integrasi, detik. Harus jauh di bawah 2/K_EMOSI = 40 dtk. */
const LANGKAH_MAKS = 5;
const LANGKAH_BANYAK = 2000;

const K_EMOSI = 0.05;
const K_STIM = 0.0012;
const K_MOOD = 0.00004;
const K_EM = 0.00008;
/** Sekuat apa satu pesan menendang keadaan. Ditala lewat uji korpus. */
const REAKTIVITAS = 1.15;

export interface KeadaanTersimpan {
  emosi: { p: number; a: number; d: number };
  mood: { p: number; a: number; d: number };
  stimulus: { p: number; a: number; d: number };
  neuro: Partial<Record<NamaNeuro, number>>;
}

export class IntiRasa {
  emosi = new PAD();
  mood = new PAD();
  stimulus = new PAD();
  private neuro = new Neurokimia();

  /**
   * Terapkan bacaan satu pesan.
   *
   * `dt` bawaannya 60 detik, dan angka itu bukan tebakan. Tetapan waktu emosi
   * di sini 1/K_EMOSI = 20 detik, jadi satu langkah 1 detik cuma memindahkan
   * keadaan 5% menuju sasarannya — pesan semarah apa pun praktis tidak
   * terbaca. Enam puluh detik = tiga tetapan waktu = 95% sampai, yang artinya
   * "reaksi terhadap pesan ini sudah selesai waktu balasannya disusun".
   *
   * Ini juga yang membedakannya dari mesin aslinya: di sana dt=1 memang benar,
   * karena di sana K_EMOTION-nya 0,9 dan satu detik sudah lebih dari cukup.
   */
  terapkan(ap: Appraisal, dt = 60) {
    this.pakaiNeuro(ap);
    const kick = this.impuls(ap);

    // Muatan lama diredam sebanyak muatan baru yang datang, bukan selalu
    // separuh.
    //
    // Mesin aslinya selalu mengalikan 0,45, dan di sana itu benar: si pet
    // dielus tiap beberapa detik, jadi kejadian terbaru memang harus menang.
    // Di chat itu menghapus ingatan terlalu cepat. Terukur: pelanggan menulis
    // "kok lama banget sih, dari tadi saya nunggu", lalu 30 detik kemudian
    // "halo kak", dan bacaannya jatuh dari kesal ke 0,08 — praktis netral.
    // Lencana di kotak masuk yang padam satu pesan sesudah keluhannya sama
    // saja dengan tidak ada lencana.
    //
    // Sekarang: pesan bermuatan besar tetap mendorong keadaan, pesan kosong
    // tidak menghapus apa pun. Pengamannya tetap batas -1,6..1,6 di bawah.
    const redam = jepit(0.45 + 0.5 * Math.exp(-kick.panjang()), 0.45, 0.95);
    this.stimulus = this.stimulus.kali(redam).tambah(kick).batas(-1.6, 1.6);
    this.maju(Math.max(0.001, dt));
  }

  /** Majukan waktu tanpa kejadian apa pun. O(1) untuk dt berapa pun. */
  tick(dt: number) {
    if (dt <= 0) return;
    this.neuro.luruh(dt);
    this.stimulus = this.stimulus.kali(Math.exp(-K_STIM * dt));

    const kE = K_EMOSI * this.neuro.pemulihan();
    this.emosi = this.mood
      .tambah(this.emosi.kurang(this.mood).kali(Math.exp(-kE * dt)))
      .batas();

    const jumlah = K_MOOD + K_EM;
    // Temperamen pelanggan dianggap netral, jadi tarikan jangka panjangnya
    // menuju nol. Yang tersisa cuma serapan dari emosi sekarang.
    const tujuan = this.emosi.kali(K_EM / jumlah);
    this.mood = tujuan.tambah(this.mood.kurang(tujuan).kali(Math.exp(-jumlah * dt))).batas();
  }

  simpan(): KeadaanTersimpan {
    return {
      emosi: this.emosi.keObjek(),
      mood: this.mood.keObjek(),
      stimulus: this.stimulus.keObjek(),
      neuro: Object.fromEntries(
        NAMA_NEURO.map((n) => [n, +this.neuro.nilai[n].toFixed(4)]),
      ) as Partial<Record<NamaNeuro, number>>,
    };
  }

  muat(d: KeadaanTersimpan | null | undefined) {
    if (!d) return;
    if (d.emosi) this.emosi = PAD.dariObjek(d.emosi);
    if (d.mood) this.mood = PAD.dariObjek(d.mood);
    if (d.stimulus) this.stimulus = PAD.dariObjek(d.stimulus);
    for (const n of NAMA_NEURO) {
      const v = d.neuro?.[n];
      if (typeof v === "number" && Number.isFinite(v)) this.neuro.set(n, v);
    }
  }

  /** Kadar neurokimia sekarang — dipakai penilai rasa, bukan untuk ditampilkan. */
  kadar() {
    return { ...this.neuro.nilai };
  }

  // ── matematika ──
  private pakaiNeuro(ap: Appraisal) {
    const pos = Math.max(0, ap.valensi);
    const neg = Math.max(0, -ap.valensi);
    // Ancaman = tidak enak DAN merasa tidak berdaya. Orang yang marah-marah
    // sambil menuntut tidak sedang terancam; yang bayarannya menggantung dan
    // tidak dijawab, iya.
    const ancaman = neg * Math.max(0, -ap.kuasa);
    this.neuro.picu({
      dopamin: 0.35 * pos,
      serotonin: 0.1 * ap.valensi - 0.15 * neg,
      kortisol: 0.4 * ancaman + 0.25 * neg + 0.1 * ap.desakan,
      oksitosin: 0.3 * Math.max(0, ap.kedekatan) * (0.5 + 0.5 * pos),
      noradrenalin: 0.27 * Math.max(0, ap.gairah) + 0.4 * ap.desakan,
    });
  }

  private impuls(ap: Appraisal) {
    const dasar = new PAD(
      ap.valensi,
      jepit(ap.gairah + 0.3 * ap.desakan, -1, 1),
      ap.kuasa,
    );
    return dasar
      .skala(this.neuro.gainValensi(), this.neuro.gainGairah(), this.neuro.gainKuasa())
      .kali(REAKTIVITAS);
  }

  private maju(dt: number) {
    const n = Math.ceil(dt / LANGKAH_MAKS);
    if (n <= LANGKAH_BANYAK) {
      const h = dt / n;
      for (let i = 0; i < n; i++) this.langkah(h);
      return;
    }
    for (let i = 0; i < LANGKAH_BANYAK; i++) this.langkah(LANGKAH_MAKS);
    this.tick(dt - LANGKAH_BANYAK * LANGKAH_MAKS);
  }

  private langkah(h: number) {
    this.neuro.luruh(h);
    const kE = Math.min(K_EMOSI * this.neuro.pemulihan(), 1.9 / Math.max(h, 1e-6));
    const tujuan = this.mood.tambah(this.stimulus);
    this.emosi = this.emosi.tambah(tujuan.kurang(this.emosi).kali(kE * h)).batas();
    this.stimulus = this.stimulus.kali(1 - K_STIM * h);
    const gerak = this.mood
      .kali(-K_MOOD)
      .tambah(this.emosi.kurang(this.mood).kali(K_EM));
    this.mood = this.mood.tambah(gerak.kali(h)).batas();
  }
}
