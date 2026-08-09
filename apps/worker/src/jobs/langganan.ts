import {
  HARI_INGATKAN_SEBELUM_HABIS,
  getPlan,
  langgananKedaluwarsa,
  langgananSegeraHabis,
  prisma,
  sapuUpayaKedaluwarsa,
  turunkanLangganan,
} from "@palwise/db";
import { log } from "../lib/log.js";
import { kirimKeNomorToko, stopChannel } from "../wa/manager.js";

/**
 * Penjaga langganan: menurunkan paket yang periodenya habis, dan mengingatkan
 * sebelum itu terjadi.
 *
 * Kenapa di worker dan bukan di dashboard: cuma proses ini yang hidup terus.
 * Dashboard baru mengerjakan sesuatu kalau ada yang membuka halaman, jadi
 * langganan yang habis tengah malam akan tetap berlaku sampai ada orang yang
 * kebetulan membuka /app/tagihan. Untuk yang berhubungan dengan uang, "berlaku
 * kalau ada yang melihat" itu bukan aturan.
 *
 * Dan cuma proses ini yang memegang sambungan WhatsApp, jadi cuma dia yang bisa
 * benar-benar MEMATIKAN nomor yang lewat jatah. Menulis `plan` di database saja
 * tidak menghentikan apa pun: nomor kedua dan ketiga tetap membalas pelanggan
 * sampai worker berikutnya menyalakan ulang semuanya.
 */

/** Setiap setengah jam. Cukup rapat untuk uang, cukup jarang untuk database. */
const TICK_MS = 30 * 60 * 1000;

/**
 * Matikan nomor yang tidak muat lagi di paket baru.
 *
 * Kembaran dari `rapikanNomorLewatJatah` di dashboard, dan keduanya memang
 * harus ada. Yang di dashboard dipakai waktu orangnya sendiri menekan tombol
 * turun paket; yang ini dipakai waktu paketnya turun tanpa ada yang menekan
 * apa pun. Aturannya sama: yang dipertahankan nomor TERLAMA, sama dengan
 * `dalamJatahPaket`.
 */
async function matikanNomorLewatJatah(workspaceId: string, planId: string) {
  const batas = getPlan(planId).maxChannels;

  const nomor = await prisma.channel.findMany({
    where: { workspaceId },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });

  for (const c of nomor.slice(batas)) {
    // autoStart dimatikan DULU, sebelum sambungannya diputus.
    //
    // Kalau urutannya dibalik dan prosesnya mati di tengah, nomornya sudah
    // terputus tapi penandanya masih menyala, jadi worker berikutnya
    // menyalakannya lagi. Pemiliknya melihat nomor yang mati sendiri lalu
    // hidup sendiri, dan tidak ada di layar yang bisa menjelaskannya.
    await prisma.channel
      .update({ where: { id: c.id }, data: { autoStart: false } })
      .catch(() => null);
    try {
      await stopChannel(c.id);
    } catch (err) {
      log.warn(`gagal mematikan nomor ${c.id}: ${err instanceof Error ? err.message : err}`);
    }
  }
}

function tanggalIndo(d: Date): string {
  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** Turunkan semua yang periodenya sudah lewat. */
export async function runTurunkanTick(): Promise<number> {
  const daftar = await langgananKedaluwarsa();
  let turun = 0;

  for (const ws of daftar) {
    const hasil = await turunkanLangganan(ws.id);
    if (!hasil) continue;

    turun++;
    const dari = getPlan(hasil.dari);
    const ke = getPlan(hasil.ke);
    log.info(`langganan habis: ${ws.name} turun dari ${dari.name} ke ${ke.name}`);

    await matikanNomorLewatJatah(ws.id, hasil.ke);

    // Dikabari lewat WhatsApp-nya sendiri, bukan email.
    //
    // Pola yang sama dengan kabar kuota habis, dan alasannya sama: pemilik toko
    // membaca WhatsApp sepanjang hari dan membuka email seminggu sekali. Kabar
    // bahwa asistennya baru saja mengecil harus sampai di hari itu, bukan hari
    // Senin depan.
    await kirimKeNomorToko(
      ws.id,
      `Palwise: masa berlangganan paket ${dari.name} kamu sudah habis.\n\n` +
        `Sekarang akunmu jalan di paket ${ke.name}: ${ke.aiCredits.toLocaleString("id-ID")} balasan per bulan, ` +
        `${ke.maxChannels} nomor WhatsApp.\n\n` +
        `Chat pelanggan tetap masuk dan tetap bisa kamu balas manual. ` +
        `Buka halaman Paket & pemakaian di dashboard kalau mau berlangganan lagi.`,
    );
  }

  return turun;
}

/** Ingatkan yang mau habis, sekali saja per periode. */
export async function runIngatkanTick(): Promise<number> {
  const daftar = await langgananSegeraHabis();
  let dikirim = 0;

  for (const ws of daftar) {
    if (!ws.langgananSampai) continue;
    const paket = getPlan(ws.plan);
    const sisaHari = Math.max(
      1,
      Math.ceil((ws.langgananSampai.getTime() - Date.now()) / 86_400_000),
    );

    const terkirim = await kirimKeNomorToko(
      ws.id,
      `Palwise: langganan paket ${paket.name} kamu habis ${sisaHari} hari lagi, ` +
        `tanggal ${tanggalIndo(ws.langgananSampai)}.\n\n` +
        // Angkanya diturunkan dari daftar paket, bukan diketik. Kabar yang
        // menyebut jatah lama bikin orang merasa dibohongi tepat di saat dia
        // sedang memutuskan mau bayar lagi atau tidak.
        `Kalau tidak diperpanjang, akunmu turun ke paket gratis: ` +
        `${getPlan("free").aiCredits.toLocaleString("id-ID")} balasan per bulan ` +
        `dan 1 nomor WhatsApp. Nomor di luar jatah itu berhenti melayani pelanggan.\n\n` +
        `Perpanjang di halaman Paket & pemakaian di dashboard.`,
    );

    // Penandanya cuma dicap kalau pesannya BENAR-BENAR terkirim.
    //
    // Kalau dicap lebih dulu, pengingat hilang selamanya untuk orang yang
    // nomornya kebetulan sedang tidak tersambung, dan justru dia yang paling
    // perlu diingatkan. Pola yang sama dengan kabar kuota habis.
    if (!terkirim) continue;

    await prisma.workspace.update({
      where: { id: ws.id },
      data: { langgananDiingatkanPada: new Date() },
    });
    dikirim++;
  }

  return dikirim;
}

export function startLanggananScheduler(): NodeJS.Timeout {
  log.info(
    `penjaga langganan aktif (cek tiap 30 menit, ingatkan ${HARI_INGATKAN_SEBELUM_HABIS} hari sebelum habis)`,
  );

  const jalankan = () => {
    runTurunkanTick().catch((err) =>
      log.error(`turunkan langganan error: ${err?.message ?? err}`),
    );
    runIngatkanTick().catch((err) =>
      log.error(`ingatkan langganan error: ${err?.message ?? err}`),
    );
    // Tagihan yang tenggatnya lewat tanpa notifikasi. Lihat alasan lengkapnya di
    // `sapuUpayaKedaluwarsa`: notifikasi Midtrans bisa tidak pernah datang, dan
    // tanpa penyapu ini barisnya menggantung selamanya sambil halaman tagihan
    // terus menawarkan tautan yang sudah mati.
    sapuUpayaKedaluwarsa()
      .then((n) => {
        if (n > 0) log.info(`${n} tagihan kedaluwarsa ditandai gagal`);
      })
      .catch((err) => log.error(`sapu tagihan error: ${err?.message ?? err}`));
  };

  // Sekali di awal, tapi JANGAN langsung.
  //
  // Server yang baru dinyalakan ulang bisa saja mati semalam, dan dalam semalam
  // itu ada langganan yang habis, jadi menunggu tick pertama berarti paket
  // kedaluwarsa tetap berlaku setengah jam lagi. Tapi kalau dijalankan pada
  // detik nol, belum ada satu pun nomor WhatsApp yang tersambung, dan kabar
  // "paketmu turun" gagal terkirim tanpa pernah dicoba lagi — karena
  // penurunannya sendiri sudah selesai dan tidak akan terdeteksi lagi.
  // Dua menit cukup untuk restoreChannels menyambungkan nomornya.
  const awal = setTimeout(jalankan, 2 * 60 * 1000);
  awal.unref?.();

  const timer = setInterval(jalankan, TICK_MS);
  timer.unref?.();
  return timer;
}
