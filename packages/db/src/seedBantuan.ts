/**
 * Akun bantuan Palwise: memakai produknya sendiri untuk melayani penggunanya.
 *
 * Bisa dijalankan berkali-kali. Kalau akunnya sudah ada, isinya diperbarui,
 * bukan dibuat dobel, jadi aman dipanggil lagi tiap kali info produknya berubah.
 *
 * SEMUA ISI CATATAN DI BAWAH DIAMBIL DARI KODE YANG BENAR-BENAR JALAN: harga
 * dan batas dari plans.ts, aturan pengembalian dana dari halaman
 * /pengembalian, risiko Meta dari /ketentuan. Tidak ada satu angka pun yang
 * dikarang. Asisten yang mengarang soal produknya sendiri jauh lebih merusak
 * daripada asisten yang bilang "saya cek dulu ke tim".
 */
import bcrypt from "bcryptjs";
import { prisma } from "./index.js";
import { PLANS } from "./plans.js";

const EMAIL = "bantuan@palwise.id";
const NAMA_USAHA = "Palwise";

const PERILAKU = `Kamu customer service Palwise, namanya Pal.

TENTANG PALWISE
Palwise itu asisten WhatsApp untuk usaha kecil di Indonesia. Chat pelanggan
dibalas otomatis dari info bisnis yang dimasukkan pemiliknya, calon pembeli
tercatat sendiri, dan janji temunya ikut dicatat.

GAYA BICARA
- Ramah dan santai, panggil "kak". Bahasa Indonesia sehari-hari.
- Singkat. Maksimal 3 kalimat per bubble.
- Jangan memakai istilah teknis. Yang chat kamu pemilik warung, klinik, salon,
  bengkel, dan toko online, bukan orang IT. Dilarang menyebut "API", "webhook",
  "deploy", "server", atau menyuruh mereka membuka terminal.

ATURAN PALING PENTING
- JANGAN PERNAH mengarang harga, batas paket, atau kebijakan. Semua angkanya ada
  di info bisnis. Kalau ditanya sesuatu yang tidak ada di situ, bilang jujur
  kamu cek dulu ke tim.
- Kalau ada yang bertanya "apakah nomor saya bisa diblokir WhatsApp", jawab
  JUJUR bahwa risikonya ada dan jelaskan cara menghindarinya. Jangan
  menenangkan dengan cara menutupi. Orang yang kena blokir setelah kamu bilang
  "aman kok" akan jauh lebih marah.
- Jangan menjanjikan kenaikan penjualan. Yang boleh kamu janjikan cuma yang
  memang dikerjakan produknya: chat dibalas cepat, data tercatat, janji temu
  tidak kelewat.
- Kalau dia ragu, arahkan ke paket gratis. ${PLANS.free.aiCredits} balasan per
  bulan tanpa kartu kredit itu jawaban terbaik untuk hampir semua keraguan.

ALUR
- Kalau ada yang baru chat, tanyakan dulu usahanya bidang apa. Jawabanmu soal
  cocok atau tidak sangat bergantung itu.
- Kalau dia sudah tertarik, arahkan daftar gratis dulu, bukan langsung bayar.`;

const SAPAAN = `Halo kak! 👋 Ini Pal dari Palwise.
Ada yang mau ditanyakan soal Palwise? Boleh cerita dulu usahanya bidang apa, biar saya jawabnya pas.`;

const ESKALASI = `Pelanggan minta bicara dengan manusia, komplain soal tagihan atau
pengembalian dana, melaporkan akunnya bermasalah atau tidak bisa masuk,
nomornya kena blokir Meta, atau menanyakan hal yang tidak ada di info bisnis.
Juga kalau dia menanyakan kerja sama, keagenan, atau permintaan fitur khusus.`;

/** Harga dan batas ditulis dari PLANS, bukan diketik ulang. */
function catatanPaket(): string {
  const baris = Object.values(PLANS).map((p) => {
    const harga =
      p.pricePerMonth === 0
        ? "Gratis selamanya"
        : `Rp ${p.pricePerMonth.toLocaleString("id-ID")} per bulan`;
    const perBalasan =
      p.pricePerMonth > 0
        ? ` (sekitar Rp ${Math.round(p.pricePerMonth / p.aiCredits)} per balasan)`
        : "";
    return [
      `PAKET ${p.name.toUpperCase()} — ${harga}`,
      `- ${p.aiCredits.toLocaleString("id-ID")} balasan per bulan${perBalasan}`,
      `- ${p.maxChannels} nomor WhatsApp, ${p.maxAgents} asisten`,
      `- Info bisnis sampai ${p.maxKnowledgeSources.toLocaleString("id-ID")} catatan`,
      ...p.features.map((f) => `- ${f}`),
    ].join("\n");
  });

  return [
    "HARGA DAN ISI TIAP PAKET",
    "",
    ...baris,
    "",
    "CATATAN PENTING SOAL HARGA",
    "- Semua paket dibayar per bulan dan bisa dihentikan kapan saja.",
    "- Tidak ada biaya pasang dan tidak ada kontrak minimal.",
    "- Paket gratis tidak perlu kartu kredit dan tidak ada batas waktunya.",
    "- Satu balasan artinya satu kali asisten menjawab, bukan satu baris pesan.",
    "  Jawaban yang dipecah jadi tiga bubble tetap dihitung satu balasan.",
    "- Chat yang dimulai pelanggan tidak ditagih WhatsApp selama dibalas dalam",
    "  24 jam, jadi yang ditagihkan Palwise cuma biaya menjalankan asistennya.",
  ].join("\n");
}

const CATATAN_FITUR = `APA SAJA YANG BISA DILAKUKAN PALWISE

MEMBALAS CHAT
- Membalas chat WhatsApp otomatis 24 jam, memakai info bisnis yang kamu isi.
- Jawaban panjang dipecah jadi beberapa bubble seperti orang mengetik.
- Pemilik toko tetap melihat semua chat dan bisa mengambil alih kapan saja.
  Begitu kamu ikut membalas, asistennya langsung mundur.
- Bisa diatur ikut jam kerja tim: di dalam jam kerja chat dipegang timmu, di
  luar jam itu baru asistennya yang menjawab. Mulai paket Growth.

MEMBACA DAN MENGIRIM BERKAS
- Bisa membaca foto dan pesan suara yang dikirim pelanggan. Mulai paket Starter.
- Bisa mengirim sendiri foto, video, dan berkas PDF dari galeri. Mulai paket
  Starter. Satu asisten muat 30 berkas.
- Ukuran berkas yang dikirim maksimal 10 MB. Berkas yang cuma dibaca isinya
  untuk info bisnis maksimal 15 MB.

MENCATAT PELANGGAN
- Nama, email, nama usaha, dan minat pelanggan dicatat sendiri dari obrolannya.
- Ada enam tahap: baru, tertarik, negosiasi, closing, selesai, batal.
- Keluhan pelanggan dilacak terpisah dari tahap, jadi pembeli yang komplain
  tidak hilang dari hitungan pembeli.
- Ada ringkasan AI per pelanggan: sekali klik, seluruh obrolannya dibaca dan
  ditulis intinya. Tidak memotong jatah balasan.

JANJI TEMU
- Jadwal yang disepakati di chat dicatat sendiri, tatap muka maupun online
  seperti Zoom dan Google Meet.
- Asisten TIDAK BISA melihat kalender pemiliknya, jadi dia cuma mencatat
  permintaan. Pemiliknya yang memastikan, sekali klik, dan pelanggannya bisa
  dikabari sekalian.
- Pelanggan bisa diingatkan otomatis sebelum harinya tiba. Mulai paket Growth.

SAPA DULUAN
- Yang tanya-tanya lalu menghilang bisa disapa lagi otomatis.
- Yang sudah beli ditanya kabarnya, lalu diajak lagi pas kira-kira waktunya
  perlu. Mulai paket Growth.

MENGISI INFO BISNIS
- Bisa ditulis manual, ditempel sebagai tanya jawab, ditarik dari alamat
  website, atau diambil dari berkas PDF, Word, txt, md, csv.
- Bisa juga dipindahkan dari ChatGPT, Claude, atau Gemini kalau kamu sudah
  pernah cerita soal bisnismu di sana.
- Ada contoh siap pakai per jenis usaha: toko, kafe dan katering, klinik dan
  salon, jasa dan servis, properti, kursus.`;

const CATATAN_PASANG = `CARA MULAI PAKAI PALWISE

LANGKAHNYA
1. Daftar gratis, tidak perlu kartu kredit.
2. Isi info bisnis: harga, layanan, dan aturan usahamu. Bisa pilih contoh sesuai
   bidang usahamu dulu, lalu tinggal diubah.
3. Sambungkan nomor WhatsApp: buka WhatsApp di HP, masuk ke menu Perangkat
   tertaut, lalu scan QR yang muncul di layar. Sekitar satu menit.

YANG PERLU DIKETAHUI SOAL NOMORNYA
- Nomornya tetap bisa dipakai di HP seperti biasa. Palwise cuma nebeng seperti
  WhatsApp Web.
- Chat grup, status, dan pesan siaran tidak disentuh. Yang dibalas cuma chat
  pribadi.
- Kalau HP mati atau internet putus, koneksinya nyambung lagi otomatis begitu
  jaringan kembali.
- Disarankan memakai nomor khusus usaha, bukan nomor pribadi.
- Tidak perlu mendaftar apa pun ke Meta dan tidak perlu menunggu persetujuan.

BISA COBA DULU TANPA PELANGGAN ASLI
Ada halaman "Coba dulu" untuk menguji asistennya. Yang diketik di situ tidak
dikirim ke WhatsApp siapa pun, dan punya jatah harian sendiri yang tidak
memotong jatah balasan.`;

const CATATAN_RISIKO = `HAL YANG HARUS JUJUR KAMI SAMPAIKAN

PALWISE BUKAN PRODUK RESMI WHATSAPP
Palwise tidak berafiliasi dengan Meta. Sambungannya lewat Perangkat tertaut,
sama seperti WhatsApp Web.

RISIKO NOMOR DIBATASI META
Meta punya aturan sendiri soal pemakaian otomatis, dan mereka bisa membatasi
atau memblokir nomor yang dianggap melanggar. Ini di luar kendali Palwise.

Cara paling aman menghindarinya:
- Palwise cuma membalas orang yang chat duluan, dan tidak pernah menyebar pesan
  ke orang yang belum pernah menghubungi. Itu penyebab blokir yang paling sering.
- Jangan dipakai mengirim promo massal.
- Kalau nomor itu satu-satunya jalur usahamu, sebaiknya pakai nomor terpisah.

KALAU ASISTEN SALAH JAWAB
Bisa terjadi, dan kami tidak berpura-pura tidak. Asisten cuma boleh menjawab
dari info yang kamu masukkan, dilarang mengarang harga, stok, dan jadwal, dan
kalau ada yang tidak dia tahu obrolannya dilempar ke pemilik usahanya. Uji dulu
sepuasnya di halaman Coba dulu sebelum menyambungkan nomor sungguhan.

DATA PELANGGAN
Cuma dipakai menjalankan asistenmu. Tidak dijual, tidak dipakai melatih AI, dan
tidak dibaca karyawan kami.`;

const CATATAN_BAYAR = `PEMBAYARAN, PENGEMBALIAN DANA, DAN AJAK TEMAN

JAMINAN 14 HARI
Kalau baru pertama kali berlangganan berbayar dan ternyata tidak cocok, uangnya
bisa diminta kembali dalam 14 hari sejak pembayaran pertama. Dikembalikan penuh,
tanpa ditanya alasannya panjang lebar. Berlaku sekali per akun, untuk langganan
pertama saja.

BULAN BERJALAN
Lewat 14 hari itu, langganan berjalan sampai akhir bulan yang sudah dibayar.
Kalau berhenti di tengah bulan, layanan tetap hidup sampai tanggal habisnya, dan
bulan berjalan itu tidak dikembalikan sebagian. Alasannya jatah balasannya
memang sudah tersedia sebulan penuh.

KAMI KEMBALIKAN TANPA DIMINTA KALAU
- Layanan mati lebih dari 24 jam berturut-turut karena masalah di pihak kami.
- Kena tagih dua kali untuk bulan yang sama.
- Akunnya kami hentikan padahal tidak melanggar apa pun.

YANG TIDAK DIKEMBALIKAN
- Nomor WhatsApp diblokir atau dibatasi Meta. Itu keputusan Meta, bukan Palwise.
- Jawaban asisten dirasa kurang memuaskan. Mutunya sangat bergantung pada info
  bisnis yang dimasukkan, dan biasanya bisa diperbaiki. Hubungi kami dulu.
  Itu sebabnya ada paket gratis untuk mencoba.
- Jatah balasan yang tidak terpakai. Sisa jatah hangus tiap bulan.

AJAK TEMAN
Tiap pengguna punya kode ajakan. Kalau temanmu daftar lewat tautan itu dan
kemudian berlangganan berbayar, kalian berdua dapat 1 bulan gratis. Hadiahnya
cair saat temannya mulai berlangganan, bukan saat dia mendaftar.`;

const CATATAN: { judul: string; isi: string }[] = [
  { judul: "Harga dan isi tiap paket", isi: catatanPaket() },
  { judul: "Apa saja yang bisa dilakukan Palwise", isi: CATATAN_FITUR },
  { judul: "Cara mulai pakai dan menyambungkan nomor", isi: CATATAN_PASANG },
  { judul: "Risiko dan hal yang kami sampaikan jujur", isi: CATATAN_RISIKO },
  { judul: "Pembayaran, pengembalian dana, dan ajak teman", isi: CATATAN_BAYAR },
];

export interface HasilSeedBantuan {
  email: string;
  sandiBaru: string | null;
  workspaceId: string;
  agentId: string;
  channelId: string;
  jumlahCatatan: number;
}

export async function seedAkunBantuan(
  sandi: string,
): Promise<HasilSeedBantuan> {
  const adaUser = await prisma.user.findUnique({
    where: { email: EMAIL },
    include: { workspace: true },
  });

  let workspaceId: string;
  let sandiBaru: string | null = null;

  if (adaUser) {
    workspaceId = adaUser.workspaceId;
    // Sandi TIDAK diganti kalau akunnya sudah ada. Menjalankan ulang skrip ini
    // untuk memperbarui info produk tidak boleh diam-diam mengunci pemiliknya
    // keluar dari akun yang sandinya sudah dia ganti sendiri.
    await prisma.workspace.update({
      where: { id: workspaceId },
      data: { name: NAMA_USAHA, plan: "growth" },
    });
  } else {
    const workspace = await prisma.workspace.create({
      // Growth supaya sapaan otomatis, pengingat janji, dan jam kerja ikut
      // hidup. Ini akun milik sendiri, jadi tidak ada tagihan yang dilewati.
      data: { name: NAMA_USAHA, plan: "growth" },
    });
    workspaceId = workspace.id;
    sandiBaru = sandi;
    await prisma.user.create({
      data: {
        email: EMAIL,
        name: "Tim Palwise",
        passwordHash: await bcrypt.hash(sandi, 10),
        workspaceId,
      },
    });
  }

  const agent = await prisma.agent.upsert({
    where: {
      id:
        (
          await prisma.agent.findFirst({
            where: { workspaceId },
            orderBy: { createdAt: "asc" },
            select: { id: true },
          })
        )?.id ?? "belum-ada",
    },
    update: {
      name: "Pal, bantuan Palwise",
      behaviorPrompt: PERILAKU,
      welcomeMessage: SAPAAN,
      handoffCondition: ESKALASI,
      isActive: true,
      afterSalesEnabled: false,
      restockEnabled: false,
      followUpEnabled: true,
      followUpAfterHours: 24,
      followUpMaxAttempts: 1,
      followUpPrompt:
        "Tanyakan kabar dengan sopan, ingatkan pertanyaan yang tadi dia sampaikan, dan tawarkan bantuan. Jangan mendesak berlangganan.",
      pengingatEnabled: false,
    },
    create: {
      workspaceId,
      name: "Pal, bantuan Palwise",
      behaviorPrompt: PERILAKU,
      welcomeMessage: SAPAAN,
      handoffCondition: ESKALASI,
      followUpEnabled: true,
      followUpAfterHours: 24,
      followUpMaxAttempts: 1,
      followUpPrompt:
        "Tanyakan kabar dengan sopan, ingatkan pertanyaan yang tadi dia sampaikan, dan tawarkan bantuan. Jangan mendesak berlangganan.",
    },
  });

  const channel =
    (await prisma.channel.findFirst({
      where: { workspaceId },
      orderBy: { createdAt: "asc" },
    })) ??
    (await prisma.channel.create({
      data: {
        workspaceId,
        agentId: agent.id,
        name: "WhatsApp Bantuan Palwise",
        type: "whatsapp_qr",
      },
    }));

  if (channel.agentId !== agent.id) {
    await prisma.channel.update({
      where: { id: channel.id },
      data: { agentId: agent.id },
    });
  }

  // Catatan lama milik asisten ini dibuang lebih dulu supaya menjalankan ulang
  // tidak menumpuk lima salinan info harga yang saling bertentangan. Asisten
  // yang punya dua daftar harga berbeda akan memilih salah satunya secara acak.
  await prisma.knowledgeSource.deleteMany({ where: { agentId: agent.id } });

  for (const c of CATATAN) {
    await prisma.knowledgeSource.create({
      data: {
        agentId: agent.id,
        type: "text",
        title: c.judul,
        content: c.isi,
        status: "pending",
      },
    });
  }

  return {
    email: EMAIL,
    sandiBaru,
    workspaceId,
    agentId: agent.id,
    channelId: channel.id,
    jumlahCatatan: CATATAN.length,
  };
}
