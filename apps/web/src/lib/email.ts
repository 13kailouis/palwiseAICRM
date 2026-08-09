import "server-only";

/**
 * Pengirim email.
 *
 * Dipakai lewat Resend, dipanggil langsung ke alamat webnya tanpa paket
 * tambahan, sama seperti cara Gemini dipanggil di mesin WhatsApp.
 *
 * Kalau RESEND_API_KEY belum diisi, emailnya TIDAK dikirim tapi isinya
 * ditulis ke layar server. Itu disengaja: kamu bisa mencoba seluruh alur lupa
 * password di laptop tanpa mendaftar ke mana-mana dulu. Yang tidak boleh
 * terjadi adalah gagal diam-diam, jadi ketiadaan kunci selalu dilaporkan.
 */

const ALAMAT_RESEND = "https://api.resend.com/emails";

export interface HasilKirim {
  terkirim: boolean;
  /** Kenapa tidak terkirim. Untuk dicatat, bukan untuk ditampilkan ke pengguna. */
  alasan?: string;
}

export interface Surat {
  ke: string;
  judul: string;
  /** Isi polos. Wajib. Sebagian orang membaca email tanpa tampilan. */
  teks: string;
  html?: string;
}

function pengirim(): string {
  return process.env.EMAIL_FROM || "Palwise <noreply@palwise.id>";
}

/**
 * Alasan khusus "belum ada kunci di laptop".
 *
 * Dipakai pemanggilnya untuk MEMAAFKAN kegagalan ini, karena di laptop
 * tautannya memang sengaja dicetak ke layar server, bukan dikirim.
 */
export const ALASAN_TANPA_KUNCI = "RESEND_API_KEY belum diisi";

export async function kirimEmail(surat: Surat): Promise<HasilKirim> {
  const kunci = process.env.RESEND_API_KEY;

  // Di server, tidak adanya kunci itu KEGAGALAN, bukan mode latihan.
  //
  // Tanpa cabang ini, alasannya sama persis dengan yang di laptop, dan
  // pemanggilnya memaafkannya. Akibatnya orang yang lupa password menekan
  // tombolnya, dibalas "cek emailmu ya", lalu menunggu email yang tidak akan
  // pernah datang. Alamat email itu satu-satunya jalan mengembalikan akunnya,
  // jadi yang sebenarnya terjadi adalah dia terkunci selamanya, dan satu-
  // satunya jejaknya cuma peringatan di catatan proses yang tidak dibaca
  // siapa pun.
  if (!kunci && process.env.NODE_ENV === "production") {
    console.error(
      `EMAIL GAGAL: RESEND_API_KEY belum diisi di server. "${surat.judul}" ke ${surat.ke} TIDAK terkirim.`,
    );
    return {
      terkirim: false,
      alasan: "Pengiriman email belum diatur di server ini",
    };
  }

  if (!kunci) {
    console.warn(
      [
        "",
        "─────────────────────────────────────────────────────────────",
        " EMAIL TIDAK DIKIRIM: RESEND_API_KEY belum diisi di .env",
        "",
        ` Ke     : ${surat.ke}`,
        ` Judul  : ${surat.judul}`,
        "",
        surat.teks,
        "─────────────────────────────────────────────────────────────",
        "",
      ].join("\n"),
    );
    return { terkirim: false, alasan: ALASAN_TANPA_KUNCI };
  }

  try {
    const jawaban = await fetch(ALAMAT_RESEND, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${kunci}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: pengirim(),
        to: [surat.ke],
        subject: surat.judul,
        text: surat.teks,
        ...(surat.html ? { html: surat.html } : {}),
      }),
      // Jangan menggantung halaman kalau layanannya lambat. Pengguna lebih baik
      // melihat "coba lagi" daripada menunggu tanpa ujung.
      signal: AbortSignal.timeout(10_000),
    });

    if (!jawaban.ok) {
      const isi = await jawaban.text().catch(() => "");
      console.error(`Gagal kirim email (${jawaban.status}): ${isi.slice(0, 300)}`);
      return { terkirim: false, alasan: `HTTP ${jawaban.status}` };
    }

    return { terkirim: true };
  } catch (err) {
    console.error("Gagal kirim email:", err);
    return { terkirim: false, alasan: String(err) };
  }
}

/** Bungkus isi email dengan tampilan sederhana yang sama untuk semua surat. */
function bungkus(judul: string, isiHtml: string): string {
  return `<!doctype html>
<html lang="id"><body style="margin:0;padding:24px;background:#f5f5f4;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1c1917">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:12px;padding:28px">
    <p style="margin:0 0 20px;font-size:18px;font-weight:600">Palwise</p>
    <h1 style="margin:0 0 16px;font-size:20px;font-weight:600">${judul}</h1>
    ${isiHtml}
  </div>
  <p style="max-width:480px;margin:16px auto 0;font-size:12px;color:#78716c">
    Email ini dikirim otomatis, tidak perlu dibalas.
  </p>
</body></html>`;
}

/**
 * Surat berisi tautan ganti password.
 *
 * Tautannya ditulis juga sebagai teks biasa, bukan cuma jadi tombol. Sebagian
 * aplikasi email memblokir tombol, dan kalau itu terjadi orangnya buntu tanpa
 * tahu kenapa.
 */
export function suratResetSandi(nama: string, tautan: string, umurMenit: number): Surat {
  const teks = [
    `Halo ${nama},`,
    "",
    "Ada yang minta ganti password akun Palwise kamu. Kalau itu kamu, buka",
    "tautan di bawah ini:",
    "",
    tautan,
    "",
    `Tautannya berlaku ${umurMenit} menit dan cuma bisa dipakai sekali.`,
    "",
    "Kalau bukan kamu yang minta, abaikan saja email ini. Passwordmu tidak",
    "berubah selama tautannya tidak dibuka.",
  ].join("\n");

  const html = bungkus(
    "Ganti password",
    `<p style="margin:0 0 16px;line-height:1.6">Halo ${nama}, ada yang minta ganti password akun Palwise kamu. Kalau itu kamu, klik tombol di bawah.</p>
     <p style="margin:0 0 20px"><a href="${tautan}" style="display:inline-block;background:#1a73e8;color:#fff;text-decoration:none;padding:11px 20px;border-radius:8px;font-weight:600">Ganti password</a></p>
     <p style="margin:0 0 16px;line-height:1.6;font-size:14px;color:#57534e">Kalau tombolnya tidak jalan, salin alamat ini ke browser:<br><span style="word-break:break-all;color:#1a73e8">${tautan}</span></p>
     <p style="margin:0;line-height:1.6;font-size:14px;color:#57534e">Tautannya berlaku ${umurMenit} menit dan cuma bisa dipakai sekali. Kalau bukan kamu yang minta, abaikan saja email ini. Passwordmu tidak berubah selama tautannya tidak dibuka.</p>`,
  );

  return { ke: "", judul: "Ganti password Palwise", teks, html };
}

/** Surat berisi tautan konfirmasi alamat email. */
export function suratVerifikasi(nama: string, tautan: string, umurJam: number): Surat {
  const teks = [
    `Halo ${nama},`,
    "",
    "Tinggal satu klik untuk memastikan alamat email ini benar milikmu:",
    "",
    tautan,
    "",
    `Tautannya berlaku ${umurJam} jam.`,
    "",
    "Kenapa ini penting: kalau suatu hari kamu lupa password, alamat inilah",
    "satu-satunya jalan kami mengembalikan akunmu. Kalau alamatnya salah ketik,",
    "kami tidak bisa menolong.",
  ].join("\n");

  const html = bungkus(
    "Konfirmasi email kamu",
    `<p style="margin:0 0 16px;line-height:1.6">Halo ${nama}, tinggal satu klik untuk memastikan alamat email ini benar milikmu.</p>
     <p style="margin:0 0 20px"><a href="${tautan}" style="display:inline-block;background:#1a73e8;color:#fff;text-decoration:none;padding:11px 20px;border-radius:8px;font-weight:600">Konfirmasi email</a></p>
     <p style="margin:0 0 16px;line-height:1.6;font-size:14px;color:#57534e">Kalau tombolnya tidak jalan, salin alamat ini ke browser:<br><span style="word-break:break-all;color:#1a73e8">${tautan}</span></p>
     <p style="margin:0;line-height:1.6;font-size:14px;color:#57534e">Tautannya berlaku ${umurJam} jam. Kenapa ini penting: kalau suatu hari kamu lupa password, alamat inilah satu-satunya jalan kami mengembalikan akunmu.</p>`,
  );

  return { ke: "", judul: "Konfirmasi email Palwise kamu", teks, html };
}

/**
 * Pemberitahuan ke alamat LAMA bahwa emailnya diganti.
 *
 * Ini pengaman yang sebenarnya untuk penggantian email. Kalau ada yang berhasil
 * masuk ke akun orang lalu mengganti alamatnya supaya pemilik aslinya terkunci,
 * surat inilah satu-satunya kesempatan pemilik asli mengetahuinya. Karena itu
 * dikirim ke alamat lama, bukan ke alamat baru.
 */
export function suratEmailDiganti(nama: string, emailBaru: string): Surat {
  const teks = [
    `Halo ${nama},`,
    "",
    `Email akun Palwise kamu baru saja diganti menjadi ${emailBaru}.`,
    "",
    "Kalau itu memang kamu, tidak perlu melakukan apa-apa.",
    "",
    "Kalau BUKAN kamu, akunmu kemungkinan dipakai orang lain. Segera hubungi",
    "kami, dan jangan tunggu lama.",
  ].join("\n");

  const html = bungkus(
    "Email akun kamu diganti",
    `<p style="margin:0 0 16px;line-height:1.6">Halo ${nama}, email akun Palwise kamu baru saja diganti menjadi <strong>${emailBaru}</strong>.</p>
     <p style="margin:0 0 16px;line-height:1.6">Kalau itu memang kamu, tidak perlu melakukan apa-apa.</p>
     <p style="margin:0;line-height:1.6;padding:12px 14px;background:#fef2f2;border-radius:8px;color:#991b1b">Kalau <strong>bukan</strong> kamu, akunmu kemungkinan dipakai orang lain. Segera hubungi kami, dan jangan tunggu lama.</p>`,
  );

  return { ke: "", judul: "Email akun Palwise kamu diganti", teks, html };
}
