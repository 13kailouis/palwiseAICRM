import { NextResponse } from "next/server";
import {
  BAYAR_DIKEMBALIKAN,
  BAYAR_GAGAL,
  BAYAR_LUNAS,
  BAYAR_MENUNGGU,
  aktifkanLangganan,
  getPlan,
  prisma,
} from "@palwise/db";
import { cairkanHadiahAjak } from "@/lib/ajakTeman";
import {
  bacaHasil,
  jumlahDilaporkan,
  tandaTanganSah,
  type NotifikasiMidtrans,
} from "@/lib/midtrans";

/**
 * Tempat Midtrans memberi tahu bahwa uangnya sudah masuk.
 *
 * INI yang menyalakan paket berbayar, bukan halaman yang dilihat orangnya
 * sesudah membayar. Bedanya penting dan pernah jadi lubang di banyak aplikasi:
 * halaman "terima kasih" cuma bukti browsernya sampai ke situ, dan siapa pun
 * bisa membukanya sendiri. Yang jadi bukti pembayaran hanya permintaan dari
 * Midtrans yang tanda tangannya cocok dengan server key kita.
 *
 * Karena itu juga alurnya tetap benar walau orangnya menutup browser tepat
 * sesudah transfer. Uang masuk, notifikasi datang ke sini, paketnya naik, dan
 * dia menemukannya sudah naik waktu membuka dashboard lagi.
 *
 * Selalu dijawab 200 untuk hal yang sudah kita urus, termasuk kegagalan yang
 * kita sengaja abaikan. Midtrans mengulang pengiriman notifikasi selama
 * jawabannya bukan 200, dan mengulang sesuatu yang memang kita tolak cuma
 * membanjiri catatan proses tanpa mengubah apa pun.
 */

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let isi: NotifikasiMidtrans;
  const mentah = await req.text();

  try {
    isi = JSON.parse(mentah) as NotifikasiMidtrans;
  } catch {
    return NextResponse.json({ error: "Bukan JSON" }, { status: 400 });
  }

  // Tanda tangan dulu, sebelum menyentuh database sama sekali.
  //
  // Kalau baris pembayarannya dicari lebih dulu, alamat ini jadi alat menebak:
  // order_id yang ada dijawab beda dengan yang tidak ada, dan orang bisa
  // memetakan seluruh isi tabel pembayaran dari luar.
  if (!tandaTanganSah(isi)) {
    console.warn(
      `Notifikasi Midtrans ditolak, tanda tangannya tidak cocok. order_id=${isi.order_id ?? "?"}`,
    );
    return NextResponse.json({ error: "Tanda tangan tidak sah" }, { status: 403 });
  }

  const bayar = await prisma.pembayaran.findUnique({
    where: { id: String(isi.order_id) },
  });

  if (!bayar) {
    // Tanda tangannya sah tapi barisnya tidak ada. Paling sering karena
    // notifikasi sandbox nyasar ke server production atau sebaliknya. Dijawab
    // 200 supaya tidak diulang terus-menerus.
    console.warn(`Notifikasi Midtrans untuk pembayaran yang tidak ada: ${isi.order_id}`);
    return NextResponse.json({ ok: true, catatan: "tidak dikenal" });
  }

  // Jumlahnya harus cocok dengan yang kita tagih.
  //
  // Tanda tangan yang sah cuma membuktikan notifikasinya benar dari Midtrans,
  // BUKAN bahwa yang dibayar sebesar yang kita minta. Tanpa perbandingan ini,
  // transaksi Rp 10.000 yang tanda tangannya sah sempurna bisa menyalakan paket
  // Rp 999.000.
  //
  // PENTING SOAL SETELAN MIDTRANS: "Split Midtrans fee with customer" di
  // Settings > Snap Preferences HARUS MATI. Kalau dinyalakan, biaya transaksinya
  // ditambahkan ke jumlah yang dibayar pelanggan, dan jumlah yang dilaporkan
  // Midtrans tidak lagi sama dengan yang kita catat. Akibatnya pemeriksaan di
  // bawah menolak SETIAP pembayaran yang sah: uangnya masuk ke rekening, barisnya
  // ditandai "JUMLAH TIDAK COCOK", dan paketnya tidak pernah naik.
  //
  // Kalau suatu hari setelan itu memang mau dinyalakan, jangan langsung; lakukan
  // satu transaksi sungguhan dulu, baca `catatan` di baris pembayarannya, dan
  // sesuaikan pemeriksaan ini supaya menerima selisih biayanya.
  const dilaporkan = jumlahDilaporkan(isi);
  if (dilaporkan === null || dilaporkan !== bayar.jumlah) {
    console.error(
      `Jumlah pembayaran tidak cocok untuk ${bayar.id}: ditagih ${bayar.jumlah}, dilaporkan ${dilaporkan}`,
    );
    await prisma.pembayaran.update({
      where: { id: bayar.id },
      data: {
        catatan: `JUMLAH TIDAK COCOK. Ditagih ${bayar.jumlah}, dilaporkan ${dilaporkan}. ${mentah.slice(0, 900)}`,
      },
    });
    return NextResponse.json({ ok: true, catatan: "jumlah tidak cocok" });
  }

  const hasil = bacaHasil(isi);

  // Sudah pernah lunas dan sekarang dilaporkan lunas lagi. Midtrans memang
  // mengirim notifikasi yang sama berkali-kali, dan tanpa penjaga ini satu
  // pembayaran akan memperpanjang langganan dua kali.
  if (bayar.status === BAYAR_LUNAS && hasil === "lunas") {
    return NextResponse.json({ ok: true, catatan: "sudah diproses" });
  }

  const jejak = {
    midtransId: isi.transaction_id ?? bayar.midtransId,
    metode: isi.payment_type ?? bayar.metode,
    catatan: mentah.slice(0, 1000),
  };

  if (hasil === "menunggu") {
    await prisma.pembayaran.update({
      where: { id: bayar.id },
      data: { ...jejak, status: BAYAR_MENUNGGU },
    });
    return NextResponse.json({ ok: true });
  }

  if (hasil === "gagal") {
    await prisma.pembayaran.update({
      where: { id: bayar.id },
      data: { ...jejak, status: BAYAR_GAGAL },
    });
    // Paketnya sengaja TIDAK diturunkan di sini. Kalau dia masih punya periode
    // yang sudah dibayar, periode itu tetap haknya; yang menurunkan cuma
    // tanggal habisnya, lewat penjadwal di worker. Upaya bayar yang gagal
    // untuk perpanjangan tidak boleh memotong bulan yang sudah lunas.
    return NextResponse.json({ ok: true });
  }

  if (hasil === "dikembalikan") {
    await prisma.pembayaran.update({
      where: { id: bayar.id },
      data: { ...jejak, status: BAYAR_DIKEMBALIKAN },
    });

    // Uangnya dikembalikan, jadi haknya juga berakhir. Tanggal habisnya
    // dimajukan ke sekarang, dan penjadwal worker yang menurunkan paketnya
    // beserta mematikan nomor yang lewat jatah. Sengaja tidak menurunkan paket
    // langsung dari sini supaya cuma ada SATU tempat yang tahu cara
    // menurunkan, lengkap dengan mematikan nomornya.
    if (bayar.status === BAYAR_LUNAS) {
      console.warn(
        `Pembayaran ${bayar.id} dikembalikan. Langganan workspace ${bayar.workspaceId} diakhiri.`,
      );
      await prisma.workspace.update({
        where: { id: bayar.workspaceId },
        data: { langgananSampai: new Date() },
      });
    }
    return NextResponse.json({ ok: true });
  }

  // Lunas.
  await prisma.pembayaran.update({
    where: { id: bayar.id },
    data: { ...jejak, status: BAYAR_LUNAS, lunasPada: new Date() },
  });

  const paket = getPlan(bayar.planId);
  const aktif = await aktifkanLangganan({
    workspaceId: bayar.workspaceId,
    planId: bayar.planId,
    perpanjang: bayar.perpanjang,
  });

  // Inilah saat hadiah ajak teman cair: temannya benar-benar MEMBAYAR.
  //
  // Dulu ini dipanggil dari tombol ganti paket, jadi hadiahnya cair dari
  // perpindahan paket yang tidak dibayar sama sekali. Satu orang bisa membuat
  // lima akun, tiap akun menekan "Pindah ke Pro", dan bulan gratisnya cair
  // semua. Sekarang dia cuma bisa dipicu oleh uang yang sungguhan masuk.
  //
  // Bulan gratis SENGAJA tidak memicunya, lihat catatan di lib/ajakTeman.
  await cairkanHadiahAjak(bayar.workspaceId);

  console.log(
    `Pembayaran ${bayar.id} lunas: ${paket.name} untuk workspace ${bayar.workspaceId}, aktif sampai ${aktif.sampai.toISOString()}`,
  );

  return NextResponse.json({ ok: true });
}

/**
 * Midtrans kadang memeriksa alamat notifikasi dengan GET waktu kamu
 * menyimpannya di dashboard mereka. Dijawab supaya tidak terbaca sebagai
 * alamat yang mati, tapi tanpa membocorkan apa pun.
 */
export async function GET() {
  return NextResponse.json({ ok: true });
}
