/**
 * Kasih paket berbayar ke satu akun TANPA lewat Midtrans.
 *
 * Jalankan:
 *   npm run akun:paket -- 13kailouis@gmail.com pro 24
 *                         ^ email            ^ paket ^ berapa bulan (opsional, bawaan 12)
 *
 * Buat apa: akun founder, akun demo waktu menunjukkan produknya ke orang, dan
 * akun teman yang memang digratiskan. Semuanya perlu paket berbayar hidup
 * sekarang juga, dan tidak ada uang yang benar-benar berpindah.
 *
 * ── KENAPA INI PERINTAH DI SERVER, BUKAN TOMBOL DI HALAMAN ──────────────────
 *
 * Aturan yang sudah dipegang sejak awal: paket berbayar cuma boleh menyala dari
 * notifikasi pembayaran yang tanda tangannya benar. Ada tesnya, dan tesnya
 * memang menolak `aktifkanLangganan` muncul di aksi tombol ganti paket.
 * Alasannya sederhana: begitu ada SATU jalur di aplikasi yang bisa menaikkan
 * paket tanpa uang, jalur itu cepat atau lambat bisa dipanggil orang lain,
 * entah lewat bug, lewat parameter yang tidak diperiksa, atau lewat halaman
 * baru yang lupa memasang pemeriksaan.
 *
 * Perintah ini tidak menambah jalur seperti itu. Dia tidak bisa dipanggil dari
 * browser, tidak punya alamat, dan tidak ikut terpasang di aplikasi web. Yang
 * bisa menjalankannya cuma orang yang sudah memegang server dan basis datanya,
 * dan orang itu memang sudah bisa mengubah apa saja.
 *
 * ── KENAPA TANGGAL JATAH DAN TANGGAL LANGGANAN DIPISAH ──────────────────────
 *
 * `aktifkanLangganan` memasang `quotaResetAt` sama dengan tanggal habis
 * langganan, dan itu benar untuk orang yang membayar bulanan. Di sini tidak:
 * kalau langganannya dua tahun, jatah balasannya jadi satu ember untuk dua
 * tahun, dan begitu embernya habis di bulan ketiga asistennya diam sampai 2028.
 *
 * Jadi tanggal langganannya saja yang dijauhkan; tanggal jatahnya ditinggal
 * satu bulan di depan, dan penolan bulanan di worker yang memajukannya sendiri
 * bulan demi bulan (`periodeBerikutnya`).
 */
import {
  SEMUA_PAKET,
  aktifkanLangganan,
  formatIDR,
  getPlan,
  prisma,
} from "@palwise/db";

/** Tanggal yang sama, sekian bulan ke depan. */
function majuBulan(dari: Date, bulan: number): Date {
  const hari = dari.getDate();
  const d = new Date(dari.getTime());
  d.setDate(1);
  d.setMonth(d.getMonth() + bulan);
  // Akhir bulan: 31 Januari + 1 bulan tidak boleh jadi 3 Maret. Pola yang sama
  // dengan penolan jatah bulanan.
  const hariTerakhir = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(hari, hariTerakhir));
  return d;
}

function keluarDenganPetunjuk(pesan: string): never {
  console.error("");
  console.error(` ${pesan}`);
  console.error("");
  console.error(" Cara pakai:");
  console.error("   npm run akun:paket -- <email> <paket> [bulan]");
  console.error("");
  console.error(
    `   paket : ${SEMUA_PAKET.filter((p) => p.pricePerMonth > 0)
      .map((p) => p.id)
      .join(" | ")}`,
  );
  console.error("   bulan : berapa bulan berlaku, bawaan 12");
  console.error("");
  console.error(" Contoh:");
  console.error("   npm run akun:paket -- kai@contoh.com pro 24");
  console.error("");
  process.exit(1);
}

async function main() {
  const [emailMentah, paketId, bulanMentah] = process.argv.slice(2);

  if (!emailMentah) keluarDenganPetunjuk("Emailnya belum disebut.");
  if (!paketId) keluarDenganPetunjuk("Paketnya belum disebut.");

  const email = emailMentah.trim().toLowerCase();

  const paket = SEMUA_PAKET.find((p) => p.id === paketId);
  if (!paket) keluarDenganPetunjuk(`Paket "${paketId}" tidak ada.`);
  // Menurunkan ke gratis lewat perintah ini dilarang, karena "gratis" bukan
  // langganan: yang benar membiarkan tanggalnya habis, atau memakai tombol
  // turun paket yang sudah menjadwalkannya dengan benar.
  if (paket.pricePerMonth === 0) {
    keluarDenganPetunjuk(
      "Paket gratis tidak diberikan lewat perintah ini. Biarkan tanggalnya habis sendiri.",
    );
  }

  const bulan = bulanMentah ? Number(bulanMentah) : 12;
  if (!Number.isFinite(bulan) || bulan < 1 || bulan > 120) {
    keluarDenganPetunjuk("Bulannya harus angka 1 sampai 120.");
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      workspaceId: true,
      workspace: {
        select: { name: true, plan: true, langgananSampai: true },
      },
    },
  });

  if (!user) {
    keluarDenganPetunjuk(
      `Nggak ada akun dengan email ${email}. Daftar dulu lewat halaman daftar, baru jalankan ini.`,
    );
  }

  const sekarang = new Date();
  const sebelum = user.workspace;

  // Dipakai apa adanya, jadi semua pembersihan yang menyertai langganan baru
  // ikut terjadi: jatah ditolkan, penurunan terjadwal dibatalkan, dan pelanggan
  // yang sempat dikabari jatahnya habis boleh dikabari lagi nanti. Menulis
  // sendiri ke tabelnya akan melewatkan semua itu, dan itu jenis bug yang baru
  // ketahuan berminggu-minggu kemudian.
  await aktifkanLangganan({
    workspaceId: user.workspaceId,
    planId: paket.id,
    perpanjang: false,
    sekarang,
  });

  // Baru sesudah itu tanggal langganannya dijauhkan. Tanggal jatah sengaja
  // TIDAK ikut, lihat penjelasan di kepala berkas.
  const sampai = majuBulan(sekarang, bulan);
  const hasil = await prisma.workspace.update({
    where: { id: user.workspaceId },
    data: { langgananSampai: sampai },
    select: { quotaResetAt: true },
  });

  const tanggal = (d: Date) =>
    d.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

  console.log("");
  console.log("─────────────────────────────────────────────────────────────");
  console.log(" PAKET DIBERIKAN, TANPA PEMBAYARAN");
  console.log("─────────────────────────────────────────────────────────────");
  console.log("");
  console.log(` Akun          : ${email}`);
  console.log(` Usaha         : ${sebelum.name}`);
  console.log(
    ` Paket         : ${getPlan(sebelum.plan).name} -> ${paket.name}`,
  );
  console.log(` Berlaku sampai: ${tanggal(sampai)} (${bulan} bulan)`);
  console.log(` Jatah          : ${paket.aiCredits.toLocaleString("id-ID")} balasan`);
  console.log(` Ditolkan lagi  : ${tanggal(hasil.quotaResetAt)}, lalu tiap bulan`);
  console.log("");
  console.log(
    ` Tidak ada baris pembayaran yang dibuat, jadi ${formatIDR(
      paket.pricePerMonth,
    )} ini`,
  );
  console.log(" tidak akan muncul sebagai uang masuk di halaman founder.");
  console.log("");
  console.log(" Akunnya perlu keluar-masuk lagi? Tidak. Paketnya dibaca dari");
  console.log(" database tiap halaman dibuka.");
  console.log("");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
