"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  HASH_UMPAN,
  UMUR_TOKEN_MENIT,
  UMUR_VERIFIKASI_JAM,
  jendelaSudahLewat,
  mintaResetSandi,
  mintaVerifikasiEmail,
  prisma,
  rapikanKodeAjak,
  sisaIstirahat,
  tukarTokenReset,
} from "@palwise/db";
import { cariPengajak } from "@/lib/ajakTeman";
import {
  ALASAN_TANPA_KUNCI,
  kirimEmail,
  suratResetSandi,
  suratVerifikasi,
} from "@/lib/email";
import { asalApp } from "@/lib/situs";
import {
  createSession,
  destroySession,
  hashPassword,
  verifyPassword,
} from "@/lib/auth";

export interface AuthState {
  error?: string;
}

const DEFAULT_BEHAVIOR = `Kamu adalah customer service untuk bisnis bernama {{BISNIS}}.
Namamu adalah Sari.

TUGASMU
- Memberi informasi produk & harga yang jelas dan singkat.
- Menggali kebutuhan calon pembeli lalu mengarahkan ke pemesanan.

GAYA BICARA
- Ramah, santai, pakai "kak". Boleh pakai emoji secukupnya.
- Balasan singkat, maksimal 3 kalimat per bubble.
- Jangan pernah mengarang harga atau stok. Kalau tidak tahu, bilang akan dicek tim.

ALUR
- Kalau ini chat pertama, tanyakan dulu nama dan kebutuhannya.
- Kalau customer sudah tertarik, minta nama lengkap dan detail pesanan.

BATASAN
- Jangan menjawab pertanyaan yang tidak berkaitan dengan {{BISNIS}}.`;

export async function registerAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const name = String(formData.get("name") ?? "").trim();
  const businessName = String(formData.get("businessName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!name || !businessName || !email || !password) {
    return { error: "Semua kolom wajib diisi." };
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { error: "Emailnya kelihatannya salah tulis." };
  }
  if (password.length < 8) {
    return { error: "Password minimal 8 huruf." };
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "Email ini sudah pernah dipakai. Masuk saja langsung." };
  }

  // Kode ajak dicatat sekarang, tapi hadiahnya baru cair kalau nanti dia
  // benar-benar berlangganan. Kode yang salah ketik diabaikan diam-diam,
  // karena menolak pendaftaran hanya gara-gara itu terlalu mahal.
  const kodeAjak = rapikanKodeAjak(String(formData.get("ajak") ?? ""));
  const diajakOleh = kodeAjak ? await cariPengajak(kodeAjak) : null;

  // Empat baris dibuat sekaligus atau tidak sama sekali.
  //
  // Dulu dibuat berurutan tanpa pengaman. Kalau pembuatan user gagal, dan yang
  // paling gampang bikin gagal adalah dua orang mendaftar dengan email yang
  // sama di detik yang sama, workspace-nya SUDAH terlanjur jadi dan tidak
  // pernah dipakai siapa pun. Orangnya cuma melihat halaman error, lalu
  // mencoba lagi, dan menambah satu workspace yatim lagi.
  //
  // Bentrok email juga ditangkap di sini, bukan cuma diperiksa di atas.
  // Pemeriksaan sebelumnya tetap ada karena kalimatnya jauh lebih enak dibaca,
  // tapi dia tidak bisa dipakai sebagai pengaman: selalu ada jeda antara
  // memeriksa dan menulis, dan pengamannya yang sesungguhnya cuma satu, yaitu
  // aturan unik di database.
  let user;
  try {
    ({ user } = await prisma.$transaction(async (tx) => {
      const workspace = await tx.workspace.create({
        data: { name: businessName, plan: "free", diajakOleh },
      });

      const dibuat = await tx.user.create({
        data: {
          email,
          name,
          passwordHash: await hashPassword(password),
          workspaceId: workspace.id,
        },
      });

      // Siapkan agent + channel default supaya user langsung punya sesuatu
      // untuk dicoba, bukan halaman kosong.
      const agent = await tx.agent.create({
        data: {
          workspaceId: workspace.id,
          name: `Asisten ${businessName}`,
          behaviorPrompt: DEFAULT_BEHAVIOR.replaceAll("{{BISNIS}}", businessName),
          welcomeMessage: `Halo kak! 👋 Terima kasih sudah menghubungi ${businessName}.\nAda yang bisa saya bantu?`,
          handoffCondition:
            "Kalau customer minta bicara dengan orangnya langsung, komplain berat, atau menanyakan hal yang tidak kamu tahu.",
        },
      });

      await tx.channel.create({
        data: {
          workspaceId: workspace.id,
          agentId: agent.id,
          name: "WhatsApp Utama",
          type: "whatsapp_qr",
        },
      });

      return { user: dibuat };
    }));
  } catch (err) {
    if ((err as { code?: string })?.code === "P2002") {
      return { error: "Email ini sudah pernah dipakai. Masuk saja langsung." };
    }
    console.error("Gagal membuat akun:", err);
    return { error: "Pendaftarannya gagal. Coba lagi sebentar lagi ya." };
  }

  // Tautan konfirmasi dikirim sekarang, bukan menunggu orangnya mencari
  // tombolnya sendiri.
  //
  // Alasannya: orang yang salah ketik emailnya tidak merasa ada yang salah,
  // jadi dia tidak punya alasan menekan tombol apa pun. Padahal justru dia
  // yang paling butuh. Konfirmasi yang harus diminta sendiri cuma menangkap
  // orang yang emailnya memang sudah benar, dan itu tidak ada gunanya.
  //
  // Kalau pengirimannya gagal, pendaftarannya TIDAK dibatalkan. Akunnya sudah
  // jadi, dan menolaknya di detik terakhir gara-gara email adalah cara
  // tercepat kehilangan pengguna baru. Dia tetap bisa minta ulang dari
  // halaman Akun.
  try {
    const verifikasi = await mintaVerifikasiEmail(user.id);
    if (verifikasi.token) {
      const kepala = await headers();
      const tautan = `${asalApp(kepala.get("host") ?? undefined)}/verifikasi?token=${encodeURIComponent(verifikasi.token)}`;
      const surat = suratVerifikasi(name, tautan, UMUR_VERIFIKASI_JAM);
      await kirimEmail({ ...surat, ke: email });
    }
  } catch (err) {
    console.error("Gagal mengirim konfirmasi email saat daftar:", err);
  }

  await createSession(user.id);
  redirect("/app");
}

export async function loginAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) return { error: "Email dan password wajib diisi." };

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    await verifyPassword(password, HASH_UMPAN);
    return { error: "Email atau password salah." };
  }

  // Masih dalam masa istirahat?
  //
  // Kalimatnya sengaja berbeda dengan "email atau password salah", dan itu
  // memang memberi tahu penebak bahwa akun ini ada. Itu pertukaran yang
  // dipilih sadar: yang dia dapat cuma "alamat ini punya akun", sedangkan yang
  // dicegah adalah tebakan password tanpa batas ke akun yang memegang nomor
  // WhatsApp dan seluruh riwayat chat pelanggannya. Dan orang yang benar-benar
  // lupa passwordnya harus tahu kenapa dia ditolak, kalau tidak dia akan
  // mencoba terus dan menganggap produknya rusak.
  const sisaMenit = sisaIstirahat(user.gagalMasuk, user.gagalMasukSejak);
  if (sisaMenit > 0) {
    return {
      error: `Terlalu banyak percobaan. Coba lagi ${sisaMenit} menit lagi, atau pakai "Lupa password".`,
    };
  }

  if (!(await verifyPassword(password, user.passwordHash))) {
    await prisma.user.update({
      where: { id: user.id },
      data: jendelaSudahLewat(user.gagalMasukSejak)
        ? { gagalMasuk: 1, gagalMasukSejak: new Date() }
        : { gagalMasuk: { increment: 1 } },
    });
    return { error: "Email atau password salah." };
  }

  if (user.gagalMasuk > 0) {
    await prisma.user.update({
      where: { id: user.id },
      data: { gagalMasuk: 0, gagalMasukSejak: null },
    });
  }

  await createSession(user.id);
  redirect("/app");
}

export async function logoutAction() {
  await destroySession();
  redirect("/masuk");
}

// ─── Lupa password ────────────────────────────────────────────────────────────

export interface ResetState {
  error?: string;
  selesai?: boolean;
}

/**
 * Kirim tautan ganti password.
 *
 * Jawabannya SELALU sama, mau emailnya terdaftar atau tidak, mau permintaannya
 * kebanyakan atau tidak. Kalau dibedakan, halaman ini berubah jadi alat untuk
 * mengecek email siapa saja yang punya akun di Palwise, satu per satu.
 */
export async function mintaResetAction(
  _prev: ResetState,
  formData: FormData,
): Promise<ResetState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) return { error: "Emailnya diisi dulu ya." };

  const hasil = await mintaResetSandi(email);

  if (hasil.token) {
    const user = await prisma.user.findUnique({ where: { email } });
    const kepala = await headers();
    const asal = asalApp(kepala.get("host") ?? undefined);
    const tautan = `${asal}/atur-ulang?token=${encodeURIComponent(hasil.token)}`;

    const surat = suratResetSandi(user?.name ?? "kak", tautan, UMUR_TOKEN_MENIT);
    const kirim = await kirimEmail({ ...surat, ke: email });

    // Kalau pengirimannya sendiri yang gagal, jangan bilang sudah terkirim.
    // Orangnya akan menunggu email yang tidak akan pernah datang, lalu berhenti
    // mencoba. Ini kesalahan di pihak kita, bukan di alamat emailnya, jadi
    // memberitahukannya tidak membocorkan email siapa yang punya akun.
    // Dibandingkan dengan tetapannya, bukan dengan teks yang diketik ulang.
    // Kalau kalimatnya diubah sedikit saja di email.ts, perbandingan berbasis
    // teks diam-diam berhenti cocok, dan yang gagal justru jadi tidak
    // dilaporkan. Di server, alasannya memang sudah berbeda, jadi cabang ini
    // tidak akan memaafkannya.
    if (!kirim.terkirim && kirim.alasan !== ALASAN_TANPA_KUNCI) {
      return {
        error:
          "Emailnya gagal dikirim dari pihak kami. Coba lagi sebentar lagi, " +
          "atau hubungi kami kalau tetap begitu.",
      };
    }
  }

  return { selesai: true };
}

/** Tukar tautan dari email dengan password baru. */
export async function aturUlangAction(
  _prev: ResetState,
  formData: FormData,
): Promise<ResetState> {
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  const ulangi = String(formData.get("ulangi") ?? "");

  if (password.length < 8) return { error: "Password minimal 8 huruf." };
  if (password !== ulangi) return { error: "Dua passwordnya belum sama." };

  const hasil = await tukarTokenReset(token, await hashPassword(password));

  if (!hasil.ok) {
    if (hasil.alasan === "kedaluwarsa") {
      return { error: "Tautannya sudah lewat waktu. Minta tautan baru ya." };
    }
    if (hasil.alasan === "sudah_dipakai") {
      return { error: "Tautan ini sudah dipakai. Minta tautan baru ya." };
    }
    return { error: "Tautannya tidak berlaku. Minta tautan baru ya." };
  }

  // Langsung dimasukkan, jadi dia tidak perlu mengetik password barunya lagi
  // di halaman sebelah. Sesi ini dibuat setelah nomornya naik, jadi dia yang
  // berlaku dan yang lama tetap terlempar.
  await createSession(hasil.userId!);
  redirect("/app");
}
