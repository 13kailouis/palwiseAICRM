import { bolehPakai, prisma } from "@palwise/db";
import {
  obrolanDitutupDenganSalam,
  runAgentOnConversation,
} from "../core/conversation.js";
import { isChannelConnected, sendToConversation } from "../wa/manager.js";
import { log } from "../lib/log.js";

const TICK_MS = 15 * 60 * 1000; // 15 menit
const BATCH = 25;

/**
 * Berapa lama sebuah obrolan dibisukan sesudah ditutup dengan salam.
 *
 * Bukan selamanya, karena calon pembeli yang pamit sopan hari ini masih boleh
 * disapa lagi bulan depan. Bukan sebentar juga, karena menyapa orang yang baru
 * saja berpamitan itu persis yang mau dihindari. Bisunya batal sendiri begitu
 * pelanggannya bicara lagi.
 */
const BISU_SESUDAH_SALAM_HARI = 30;

/**
 * Auto follow-up: kalau customer diam lebih dari X jam dan belum closing,
 * AI menyapa lagi. Ini fitur yang biasanya paling terasa dampaknya ke konversi.
 */

/**
 * Saring asisten yang workspace-nya memang berhak memakai sapaan otomatis.
 *
 * Ini pengaman untuk turun paket. Menolak menyalakan tombolnya di dashboard
 * saja tidak cukup: workspace yang dulu Growth sudah punya
 * followUpEnabled = true tersimpan di database, dan kalau tidak diperiksa lagi
 * di sini, dia terus mendapat sapaan otomatis selamanya walau sudah pindah ke
 * paket gratis. Persis pola bocor yang sama pernah terjadi di jatah nomor.
 */
async function saringBerhak<T extends { workspaceId: string }>(
  agents: T[],
): Promise<T[]> {
  if (agents.length === 0) return agents;

  const workspaces = await prisma.workspace.findMany({
    where: { id: { in: [...new Set(agents.map((a) => a.workspaceId))] } },
    select: { id: true, plan: true },
  });
  const boleh = new Set(
    workspaces.filter((w) => bolehPakai(w.plan, "sapaOtomatis")).map((w) => w.id),
  );

  return agents.filter((a) => boleh.has(a.workspaceId));
}

/**
 * Pelanggan yang punya janji temu di depan TIDAK ikut disapa otomatis.
 *
 * Dia bukan menghilang, dia sedang menunggu hari H. Sapaan "kok diam, masih
 * tertarik?" ke orang yang Sabtu depan sudah janjian datang bukan cuma
 * mubazir, dia bikin usahanya kelihatan tidak mencatat apa-apa, persis kesan
 * yang paling ingin dihindari orang yang memakai Palwise.
 *
 * Berlaku untuk ketiga jalur sapaan: sebelum beli, tanya kabar, dan ajakan
 * balik lagi. Alasannya sama di ketiganya.
 *
 * Ditulis sebagai fungsi, BUKAN tetapan modul. Worker ini proses yang hidup
 * berhari-hari, jadi `new Date()` yang dihitung sekali waktu berkas ini dimuat
 * akan membeku di jam worker dinyalakan, dan seminggu kemudian dia menganggap
 * semua janji masih "di depan".
 */
function tanpaJanjiDekat() {
  return {
    OR: [{ janjiPada: null }, { janjiPada: { lt: new Date() } }],
  };
}

export async function runFollowUpTick(): Promise<number> {
  const agents = await saringBerhak(
    await prisma.agent.findMany({
      where: { followUpEnabled: true, isActive: true },
    }),
  );
  if (agents.length === 0) return 0;

  const now = Date.now();
  let sent = 0;

  for (const agent of agents) {
    const cutoff = new Date(now - agent.followUpAfterHours * 60 * 60 * 1000);

    const candidates = await prisma.conversation.findMany({
      where: {
        workspaceId: agent.workspaceId,
        status: "open",
        aiEnabled: true,
        needsHuman: false,
        lastCustomerAt: { not: null, lte: cutoff },
        followUpCount: { lt: agent.followUpMaxAttempts },
        channelId: { not: null },
        OR: [
          { followUpMutedUntil: null },
          { followUpMutedUntil: { lte: new Date(now) } },
        ],
        contact: { stage: { notIn: ["selesai", "batal"] }, ...tanpaJanjiDekat() },
      },
      include: { contact: true },
      take: BATCH,
    });

    for (const conv of candidates) {
      if (!conv.channelId || !isChannelConnected(conv.channelId)) continue;

      // Obrolan yang sudah ditutup dengan salam TIDAK disapa lagi.
      //
      // Sapaan ini untuk orang yang menghilang di tengah jalan, bukan untuk
      // orang yang pamit baik-baik. "Masih tertarik kak?" yang datang dua belas
      // jam sesudah kedua belah pihak saling mengucapkan terima kasih bukan cuma
      // mubazir, dia bikin usahanya kelihatan tidak menyimak obrolannya sendiri.
      //
      // Dibisukan lama, bukan cuma dilewati. Kalau cuma dilewati, obrolan ini
      // tetap jadi calon di setiap putaran selamanya, dan lama-lama dia mendesak
      // keluar obrolan yang benar-benar perlu disapa dari jatah batch.
      // Bisunya sendiri dibatalkan begitu pelanggannya bicara lagi.
      if (await obrolanDitutupDenganSalam(conv.id)) {
        log.info(`sapaan dilewati untuk ${conv.id}: obrolannya sudah ditutup dengan salam`);
        await prisma.conversation.update({
          where: { id: conv.id },
          data: { followUpMutedUntil: new Date(now + BISU_SESUDAH_SALAM_HARI * SEHARI_MS) },
        });
        continue;
      }

      const result = await runAgentOnConversation({
        conversationId: conv.id,
        systemHint:
          `Customer sudah tidak membalas selama ${agent.followUpAfterHours} jam. ` +
          `Kirim follow-up sekarang. ${agent.followUpPrompt} ` +
          `Jangan menyapa seperti chat pertama kali, dan jangan minta maaf berlebihan. ` +
          `Cukup 1 bubble singkat.`,
      });

      if (result.status !== "replied") {
        log.info(`follow-up dilewati untuk ${conv.id}: ${result.reason}`);
        continue;
      }

      const delivery = await sendToConversation(conv.id, result.bubbles);
      if (!delivery.ok) {
        log.warn(`follow-up gagal terkirim: ${delivery.error}`);
        continue;
      }

      await prisma.conversation.update({
        where: { id: conv.id },
        data: {
          followUpCount: { increment: 1 },
          // Jangan follow-up lagi sebelum periode berikutnya lewat.
          followUpMutedUntil: new Date(
            now + agent.followUpAfterHours * 60 * 60 * 1000,
          ),
        },
      });
      sent++;
    }
  }

  if (sent > 0) log.ok(`${sent} follow-up otomatis terkirim`);
  return sent;
}

const SEHARI_MS = 24 * 60 * 60 * 1000;

/**
 * Sapaan setelah pelanggan membeli.
 *
 * Dipisah dari follow-up sebelum beli, karena maksudnya beda: yang ini bukan
 * mengejar penjualan yang menggantung, tapi menjaga hubungan dengan orang yang
 * sudah percaya. Pembeli lama itu yang paling murah diajak beli lagi.
 */
export async function runAfterSalesTick(): Promise<number> {
  const agents = await saringBerhak(
    await prisma.agent.findMany({
      where: {
        isActive: true,
        OR: [{ afterSalesEnabled: true }, { restockEnabled: true }],
      },
    }),
  );
  if (agents.length === 0) return 0;

  const sekarang = Date.now();
  let terkirim = 0;

  for (const agent of agents) {
    // Dua jenis sapaan, masing-masing punya hitung mundur sendiri.
    const jenis: {
      nama: "tanya kabar" | "ajak beli lagi";
      aktif: boolean;
      hari: number;
      arahan: string;
      kolom: "afterSalesSentAt" | "restockSentAt";
    }[] = [
      {
        nama: "tanya kabar",
        aktif: agent.afterSalesEnabled,
        hari: agent.afterSalesAfterDays,
        arahan: agent.afterSalesPrompt,
        kolom: "afterSalesSentAt",
      },
      {
        nama: "ajak beli lagi",
        aktif: agent.restockEnabled,
        hari: agent.restockAfterDays,
        arahan: agent.restockPrompt,
        kolom: "restockSentAt",
      },
    ];

    for (const j of jenis) {
      if (!j.aktif) continue;

      const batas = new Date(sekarang - j.hari * SEHARI_MS);

      const calon = await prisma.conversation.findMany({
        where: {
          workspaceId: agent.workspaceId,
          aiEnabled: true,
          needsHuman: false,
          channelId: { not: null },
          [j.kolom]: null,
          contact: {
            stage: "selesai",
            closedAt: { not: null, lte: batas },
            ...tanpaJanjiDekat(),
          },
        },
        include: { contact: true },
        take: BATCH,
      });

      for (const percakapan of calon) {
        if (!percakapan.channelId || !isChannelConnected(percakapan.channelId)) continue;

        const hariBerlalu = percakapan.contact.closedAt
          ? Math.floor((sekarang - percakapan.contact.closedAt.getTime()) / SEHARI_MS)
          : j.hari;

        const hasil = await runAgentOnConversation({
          conversationId: percakapan.id,
          systemHint:
            `Pelanggan ini sudah selesai membeli ${hariBerlalu} hari lalu. ` +
            `Kirim sapaan "${j.nama}" sekarang. ${j.arahan} ` +
            `Sapa seperti mengenal dia, bukan seperti chat pertama kali. Cukup 1 bubble singkat.`,
        });

        if (hasil.status !== "replied") {
          log.info(`${j.nama} dilewati untuk ${percakapan.id}: ${hasil.reason}`);
          continue;
        }

        const kirim = await sendToConversation(percakapan.id, hasil.bubbles);
        if (!kirim.ok) {
          log.warn(`${j.nama} gagal terkirim: ${kirim.error}`);
          continue;
        }

        await prisma.conversation.update({
          where: { id: percakapan.id },
          data: { [j.kolom]: new Date() },
        });
        terkirim++;
      }
    }
  }

  if (terkirim > 0) log.ok(`${terkirim} sapaan setelah pembelian terkirim`);
  return terkirim;
}

/**
 * Pengingat sebelum janji temu.
 *
 * TIGA PAGAR, dan ketiganya penting.
 *
 * 1. Cuma janji yang SUDAH DIPASTIKAN manusia. Mengingatkan pelanggan soal
 *    jadwal yang pemiliknya sendiri belum pernah setujui itu persis bahaya yang
 *    dicegah pemisah diminta/dipastikan. Pengingat justru memperkuat keyakinan
 *    pelanggan, jadi dia paling berbahaya kalau dikirim untuk jadwal yang belum
 *    tentu ada.
 * 2. Cuma sekali per janji, dijaga lewat `pengingatUntuk` yang menyimpan waktu
 *    janjinya. Kalau pelanggannya menjadwalkan ulang, waktunya tidak cocok lagi
 *    dan pengingatnya terpasang ulang dengan sendirinya.
 * 3. Tidak dikirim kalau janjinya sudah lewat. Pengingat yang datang setelah
 *    jamnya bukan cuma tidak berguna, dia mengingatkan orang pada sesuatu yang
 *    sudah gagal.
 */
/**
 * Semua aturan pengingat dalam satu fungsi murni.
 *
 * Sengaja dipisah dari kuerinya. Pekerjaan aslinya butuh koneksi WhatsApp yang
 * hidup, jadi tidak bisa dijalankan ujung ke ujung di selftest, dan aturan yang
 * cuma hidup di dalam kueri berarti aturan yang tidak pernah diuji. Kueri di
 * bawah tetap menyaring lebih dulu supaya tidak menarik seluruh tabel, tapi
 * yang memutuskan tetap fungsi ini.
 */
export function perluDiingatkan(
  kontak: {
    janjiPada: Date | null;
    janjiDipastikan: boolean;
    pengingatUntuk: Date | null;
  },
  jamSebelum: number,
  sekarang: Date = new Date(),
): boolean {
  if (!kontak.janjiPada) return false;

  // Belum dipastikan manusia. Pengingat justru memperkuat keyakinan pelanggan,
  // jadi dia paling berbahaya kalau dikirim untuk jadwal yang belum tentu ada.
  if (!kontak.janjiDipastikan) return false;

  const selisih = kontak.janjiPada.getTime() - sekarang.getTime();

  // Sudah lewat. Pengingat yang datang setelah jamnya bukan cuma tidak berguna,
  // dia mengingatkan orang pada sesuatu yang sudah gagal.
  if (selisih <= 0) return false;

  // Masih terlalu jauh.
  if (selisih > jamSebelum * 60 * 60 * 1000) return false;

  // Sudah pernah diingatkan untuk janji jam ini persis. Yang disimpan waktu
  // janjinya, bukan penanda "sudah/belum", jadi janji yang digeser otomatis
  // tidak cocok lagi dan pengingatnya terpasang ulang dengan sendirinya.
  if (
    kontak.pengingatUntuk &&
    kontak.pengingatUntuk.getTime() === kontak.janjiPada.getTime()
  ) {
    return false;
  }

  return true;
}

export async function runPengingatTick(): Promise<number> {
  const agents = await saringBerhak(
    await prisma.agent.findMany({
      where: { pengingatEnabled: true, isActive: true },
    }),
  );
  if (agents.length === 0) return 0;

  let terkirim = 0;

  for (const agent of agents) {
    const sekarang = new Date();
    const batasDepan = new Date(
      sekarang.getTime() + agent.pengingatJamSebelum * 60 * 60 * 1000,
    );

    const calon = await prisma.conversation.findMany({
      where: {
        workspaceId: agent.workspaceId,
        aiEnabled: true,
        needsHuman: false,
        channelId: { not: null },
        contact: {
          janjiDipastikan: true,
          janjiPada: { gt: sekarang, lte: batasDepan },
        },
      },
      include: { contact: true },
      take: BATCH,
    });

    for (const percakapan of calon) {
      const kontak = percakapan.contact;
      if (!perluDiingatkan(kontak, agent.pengingatJamSebelum, sekarang)) continue;
      if (!percakapan.channelId || !isChannelConnected(percakapan.channelId)) continue;
      // Sudah dipastikan bukan null oleh [perluDiingatkan].
      const janjiPada = kontak.janjiPada!;

      // Hari dan jamnya disuapkan jadi, bukan disuruh dihitung model. Model
      // yang menghitung sendiri "besok" dari tanggal mentah adalah cara paling
      // gampang membuat orang datang di hari yang salah.
      const kapan = janjiPada.toLocaleDateString("id-ID", {
        weekday: "long",
        day: "numeric",
        month: "long",
      });
      const jam = janjiPada.toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
      });

      const hasil = await runAgentOnConversation({
        conversationId: percakapan.id,
        systemHint:
          `Pelanggan ini punya janji pada ${kapan} jam ${jam}` +
          (kontak.janjiCatatan ? ` untuk ${kontak.janjiCatatan}` : "") +
          `. Kirim pengingat sekarang. ${agent.pengingatPrompt} ` +
          `Pakai hari dan jam persis seperti yang disebutkan di atas, jangan menghitung sendiri dan jangan mengarang detail lain. ` +
          `Sapa seperti mengenal dia, bukan seperti chat pertama kali. Cukup 1 bubble singkat.`,
      });

      if (hasil.status !== "replied") {
        log.info(`pengingat dilewati untuk ${percakapan.id}: ${hasil.reason}`);
        continue;
      }

      const kirim = await sendToConversation(percakapan.id, hasil.bubbles);
      if (!kirim.ok) {
        log.warn(`pengingat gagal terkirim: ${kirim.error}`);
        continue;
      }

      // Ditandai SETELAH benar-benar terkirim. Kalau ditandai duluan, satu
      // kegagalan kirim berarti pelanggan itu tidak pernah diingatkan sama
      // sekali, dan tidak ada yang tahu.
      await prisma.contact.update({
        where: { id: kontak.id },
        data: { pengingatUntuk: janjiPada },
      });
      terkirim++;
    }
  }

  if (terkirim > 0) log.ok(`${terkirim} pengingat janji temu terkirim`);
  return terkirim;
}

export function startFollowUpScheduler(): NodeJS.Timeout {
  log.info("penjadwal auto follow-up aktif (cek tiap 15 menit)");
  // Tunggu sebentar supaya koneksi WhatsApp sempat naik dulu.
  const timer = setInterval(() => {
    runFollowUpTick().catch((err) =>
      log.error(`follow-up tick error: ${err?.message ?? err}`),
    );
    runAfterSalesTick().catch((err) =>
      log.error(`after-sales tick error: ${err?.message ?? err}`),
    );
    runPengingatTick().catch((err) =>
      log.error(`pengingat tick error: ${err?.message ?? err}`),
    );
  }, TICK_MS);
  timer.unref?.();
  return timer;
}
