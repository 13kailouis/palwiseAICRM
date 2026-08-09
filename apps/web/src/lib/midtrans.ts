import "server-only";
import crypto from "node:crypto";
import { JAM_UPAYA_BAYAR_KEDALUWARSA } from "@palwise/db";

/**
 * Penghubung ke Midtrans (Snap).
 *
 * Dipanggil langsung ke alamat webnya tanpa paket tambahan, sama seperti cara
 * Resend dan Gemini dipanggil di tempat lain. Yang dibutuhkan cuma dua
 * permintaan HTTP, dan paket resminya membawa serta seluruh SDK yang tidak
 * kita pakai.
 *
 * Kenapa Snap dan bukan Core API: Snap yang menampilkan halaman pilih metode
 * bayar, mengurus virtual account, QRIS, e-wallet, dan kartu, dan yang paling
 * menentukan, DATA KARTUNYA TIDAK PERNAH LEWAT SERVER KITA. Dengan Core API
 * nomor kartu masuk ke formulir kita sendiri dan kewajiban PCI DSS pindah ke
 * kita. Untuk satu orang yang menjual ke pemilik toko, itu pertukaran yang
 * tidak masuk akal.
 *
 * Halaman privasi sudah menulis "Pembayaran diproses penyedia pembayaran,
 * bukan kami". Snap yang membuat kalimat itu benar.
 */

/** Server Key. Rahasia, tidak boleh pernah sampai ke browser. */
function serverKey(): string {
  return process.env.MIDTRANS_SERVER_KEY?.trim() ?? "";
}

/**
 * Production atau sandbox.
 *
 * Bawaannya SANDBOX, dan itu disengaja. Nilai bawaan yang salah harus selalu
 * mengarah ke yang tidak merugikan siapa pun: sandbox yang terpasang di server
 * cuma bikin pembayaran tidak jadi, sedangkan production yang terpasang di
 * laptop menagih uang sungguhan waktu kamu sedang mencoba-coba.
 */
function produksi(): boolean {
  return process.env.MIDTRANS_PRODUCTION?.trim().toLowerCase() === "on";
}

function alamatSnap(): string {
  return produksi()
    ? "https://app.midtrans.com/snap/v1/transactions"
    : "https://app.sandbox.midtrans.com/snap/v1/transactions";
}

/** Sudah bisa menerima pembayaran atau belum. */
export function midtransSiap(): boolean {
  return serverKey().length > 0;
}

/** Untuk dipajang di halaman tagihan waktu masih sandbox. */
export function midtransModeUji(): boolean {
  return midtransSiap() && !produksi();
}

/**
 * Kunci sandbox dan kunci production tidak bisa saling dipakai.
 *
 * Kunci sandbox Midtrans selalu berawalan "SB-", yang production tidak. Kalau
 * dipasang silang, Midtrans menjawab 401 tanpa satu kata penjelasan, dan yang
 * terlihat di layar cuma "halaman pembayarannya gagal dibuka". Orang lalu
 * mencari kesalahan di kode, di firewall, di Caddy, di mana-mana kecuali di
 * satu baris .env yang benar-benar salah.
 *
 * Diperiksa dari AWALAN kuncinya, bukan dari percobaan memanggil. Kesalahan
 * pemasangan harus ketahuan sebelum ada uang yang bergerak, bukan sesudah.
 *
 * @returns kalimat kesalahannya, atau null kalau cocok.
 */
export function salahLingkunganKunci(): string | null {
  const kunci = serverKey();
  if (!kunci) return null;

  const kunciSandbox = kunci.toUpperCase().startsWith("SB-");

  if (produksi() && kunciSandbox) {
    return (
      "MIDTRANS_PRODUCTION=on tapi MIDTRANS_SERVER_KEY masih kunci sandbox " +
      "(berawalan SB-). Ambil kunci production di dashboard Midtrans, pindah " +
      "Environment ke Production dulu."
    );
  }

  if (!produksi() && !kunciSandbox) {
    return (
      "MIDTRANS_SERVER_KEY itu kunci production, tapi MIDTRANS_PRODUCTION " +
      "belum diisi jadi yang dihubungi masih sandbox. Isi MIDTRANS_PRODUCTION=on " +
      "kalau server ini memang melayani pelanggan, atau pakai kunci sandbox " +
      "(berawalan SB-) kalau ini masih laptop."
    );
  }

  return null;
}

export interface PermintaanBayar {
  /** Dipakai sebagai order_id. Harus belum pernah dipakai. */
  orderId: string;
  /** Rupiah BULAT. Midtrans menolak pecahan untuk IDR. */
  jumlah: number;
  namaPaket: string;
  email: string;
  nama: string;
  /** Ke mana orangnya dikembalikan sesudah selesai di halaman Midtrans. */
  urlSelesai: string;
}

/**
 * Buat satu transaksi Snap, dapatkan alamat halaman bayarnya.
 *
 * Sengaja melempar galat, bukan mengembalikan null. Pemanggilnya WAJIB
 * menandai baris pembayarannya gagal kalau ini tidak berhasil; kalau
 * kegagalannya boleh diabaikan, akan ada baris "menunggu" yang menggantung
 * selamanya tanpa tautan, dan pemiliknya melihat "sedang diproses" untuk
 * sesuatu yang tidak pernah ada.
 */
export async function buatTransaksiSnap(
  minta: PermintaanBayar,
): Promise<{ token: string; urlBayar: string }> {
  const kunci = serverKey();
  if (!kunci) throw new Error("MIDTRANS_SERVER_KEY belum diisi");

  // Diperiksa di sini, bukan cuma dipajang di halaman tagihan. Halaman itu
  // bisa saja tidak pernah dibaca, sedangkan galat ini masuk ke catatan proses
  // dan ke kolom catatan barisnya, jadi jejaknya ada waktu ditelusuri nanti.
  const salah = salahLingkunganKunci();
  if (salah) throw new Error(salah);

  // Basic auth: server key sebagai username, password kosong. Titik dua di
  // belakang itu WAJIB ada, dan kalau lupa jawabannya 401 tanpa penjelasan.
  const auth = Buffer.from(`${kunci}:`).toString("base64");

  const jawaban = await fetch(alamatSnap(), {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Basic ${auth}`,
    },
    body: JSON.stringify({
      transaction_details: {
        order_id: minta.orderId,
        // Dibulatkan lagi di sini walau pemanggilnya sudah mengirim bilangan
        // bulat. Midtrans menolak pecahan untuk IDR, dan yang gagal bukan cuma
        // permintaan ini: tanda tangan notifikasinya dihitung dari angka yang
        // dia catat, jadi selisih satu perak membuat seluruh alurnya rusak.
        gross_amount: Math.round(minta.jumlah),
      },
      item_details: [
        {
          id: minta.namaPaket.toLowerCase().replace(/\s+/g, "-"),
          price: Math.round(minta.jumlah),
          quantity: 1,
          name: `Palwise ${minta.namaPaket} 1 bulan`.slice(0, 50),
        },
      ],
      customer_details: {
        first_name: minta.nama.slice(0, 60),
        email: minta.email,
      },
      // Tenggatnya DIKIRIM, tidak dibiarkan ke bawaan Midtrans.
      //
      // Bawaan halaman checkout Snap cuma 2 jam. Kalau tidak dikirim, halaman
      // tagihan kita menawarkan "Lanjutkan pembayaran" selama 24 jam untuk
      // halaman yang sudah dibuang Midtrans sesudah 2 jam, dan yang menekannya
      // mendarat di "Transaksi sudah kedaluwarsa". Terjadi sungguhan 8 Agustus
      // 2026.
      //
      // `start_time` sengaja TIDAK dikirim. Formatnya menuntut offset zona waktu
      // ("2026-08-09 18:11:08 +0700") dan salah satu huruf saja membuat seluruh
      // permintaan ditolak. Tanpa dia, Midtrans menghitung dari saat transaksinya
      // dibuat, dan itu memang yang kita mau.
      expiry: {
        unit: "hours",
        duration: JAM_UPAYA_BAYAR_KEDALUWARSA,
      },
      callbacks: { finish: minta.urlSelesai },
      // Kartu kredit sengaja dipaksa 3DS. Tanpa ini, transaksi kartu bisa lolos
      // tanpa pembuktian pemiliknya, dan yang menanggung chargeback-nya kita.
      credit_card: { secure: true },
    }),
    // Jangan menggantung halaman kalau Midtrans lambat. Orang lebih baik
    // melihat "coba lagi" daripada menunggu tanpa ujung.
    signal: AbortSignal.timeout(15_000),
  });

  const isi = await jawaban.text();

  if (!jawaban.ok) {
    // Pesan galat Midtrans dibawa apa adanya ke catatan proses. Yang paling
    // sering: order_id sudah dipakai, atau server key salah lingkungan
    // (sandbox dipakai ke production).
    throw new Error(`Midtrans menolak (${jawaban.status}): ${isi.slice(0, 300)}`);
  }

  const data = JSON.parse(isi) as { token?: string; redirect_url?: string };
  if (!data.token || !data.redirect_url) {
    throw new Error(`Midtrans menjawab tanpa tautan bayar: ${isi.slice(0, 300)}`);
  }

  return { token: data.token, urlBayar: data.redirect_url };
}

/** Isi notifikasi Midtrans yang kita pakai. Sisanya diabaikan. */
export interface NotifikasiMidtrans {
  order_id?: string;
  status_code?: string;
  gross_amount?: string;
  signature_key?: string;
  transaction_status?: string;
  fraud_status?: string;
  transaction_id?: string;
  payment_type?: string;
}

/**
 * Buktikan notifikasinya benar dari Midtrans.
 *
 * INI SATU-SATUNYA PENJAGA DI SELURUH ALUR PEMBAYARAN. Alamat webhook-nya
 * terbuka ke internet dan memang harus begitu, jadi tanpa pemeriksaan ini siapa
 * pun yang tahu alamatnya bisa mengirim satu permintaan berisi
 * {"order_id":"...","transaction_status":"settlement"} dan mengaktifkan paket
 * Pro tanpa membayar sepeser pun.
 *
 * Rumusnya ditentukan Midtrans: sha512 dari order_id + status_code +
 * gross_amount + server key, disambung tanpa pemisah.
 *
 * `gross_amount` HARUS dipakai apa adanya seperti yang dia kirim, biasanya
 * berbentuk "199000.00". Merapikannya jadi 199000 menghasilkan sidik jari yang
 * berbeda dan semua notifikasi yang sah akan ditolak.
 */
export function tandaTanganSah(n: NotifikasiMidtrans): boolean {
  const kunci = serverKey();
  if (!kunci) return false;
  if (!n.order_id || !n.status_code || !n.gross_amount || !n.signature_key) {
    return false;
  }

  const harusnya = crypto
    .createHash("sha512")
    .update(`${n.order_id}${n.status_code}${n.gross_amount}${kunci}`)
    .digest("hex");

  const dikirim = n.signature_key.trim().toLowerCase();
  if (dikirim.length !== harusnya.length) return false;

  // Dibandingkan dengan waktu tetap. Perbandingan biasa berhenti di huruf
  // pertama yang beda, dan selisih waktunya bisa dipakai menebak sidik jarinya
  // huruf demi huruf.
  return crypto.timingSafeEqual(Buffer.from(dikirim), Buffer.from(harusnya));
}

export type HasilBayar = "lunas" | "menunggu" | "gagal" | "dikembalikan";

/**
 * Terjemahkan status Midtrans jadi satu dari empat keadaan.
 *
 * Yang paling gampang salah: `capture`. Untuk kartu kredit dia BUKAN berarti
 * lunas. Kalau `fraud_status` masih "challenge", uangnya ditahan dan masih
 * bisa dibatalkan, jadi menganggapnya lunas berarti memberi paket berbayar
 * untuk transaksi yang belum tentu jadi. Cuma "accept" yang dihitung.
 *
 * Yang tidak dikenali dianggap MENUNGGU, bukan gagal. Midtrans boleh
 * menambah status baru kapan saja, dan menebak "gagal" berarti mematikan
 * langganan orang yang sebenarnya sudah bayar.
 */
export function bacaHasil(n: NotifikasiMidtrans): HasilBayar {
  const status = (n.transaction_status ?? "").toLowerCase();
  const fraud = (n.fraud_status ?? "").toLowerCase();

  if (status === "capture") {
    if (fraud === "accept") return "lunas";
    if (fraud === "deny") return "gagal";
    return "menunggu";
  }

  if (status === "settlement") return "lunas";
  if (status === "pending" || status === "authorize") return "menunggu";
  if (["deny", "cancel", "expire", "failure"].includes(status)) return "gagal";
  if (["refund", "partial_refund", "chargeback", "partial_chargeback"].includes(status)) {
    return "dikembalikan";
  }

  return "menunggu";
}

/**
 * Jumlah yang dilaporkan Midtrans, sebagai rupiah bulat.
 *
 * Dipakai untuk dibandingkan dengan jumlah yang kita catat sendiri. Tanpa
 * perbandingan itu, tanda tangan yang sah untuk transaksi Rp 1.000 bisa
 * mengaktifkan paket Rp 999.000, karena tanda tangannya memang benar — cuma
 * untuk transaksi yang lain.
 */
export function jumlahDilaporkan(n: NotifikasiMidtrans): number | null {
  if (!n.gross_amount) return null;
  const angka = Number(n.gross_amount);
  return Number.isFinite(angka) ? Math.round(angka) : null;
}
