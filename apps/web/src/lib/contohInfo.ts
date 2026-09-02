import { PRESET } from "@/lib/preset";
import type { NamaIkon } from "@/components/Ikon";

/**
 * Contoh isi Info bisnis, satu untuk tiap bidang usaha.
 *
 * KENAPA TIDAK SATU CONTOH SAJA.
 *
 * Sampai 3 September 2026 tombol "Pakai contoh" cuma punya SATU contoh, dan
 * isinya toko kopi: empat baris produk, ongkir, jam buka. Itu masalah yang
 * sama persis dengan yang sudah pernah merusak prompt bawaan (lihat catatan
 * "contoh retail bikin pipeline usaha jasa kelihatan mati"): contoh adalah
 * perintah yang paling patuh diikuti orang, jauh lebih patuh daripada
 * penjelasan di sebelahnya. Pemilik klinik yang menekannya melihat daftar
 * harga kopi, lalu menyimpulkan salah satu dari dua hal, dan dua-duanya
 * merugikan: "produk ini buat toko, bukan buat saya", atau "berarti saya cuma
 * perlu menulis daftar harga" padahal yang paling ditanyakan pasiennya jadwal
 * praktik dan apa yang perlu dibawa.
 *
 * Palwise dijual ke hampir semua lini usaha, bukan cuma retail. Presetnya
 * sudah sepuluh bidang. Contoh isinya tinggal satu, dan itu bagian yang paling
 * menentukan mutu jawaban asistennya, karena asisten cuma sebaik catatannya.
 *
 * YANG DIAJARKAN BENTUKNYA, BUKAN PENJELASANNYA. Tidak ada satu pun kalimat
 * perintah di dalam teks contoh ("tulis tiap varian di baris sendiri", dan
 * sejenisnya). Isi ini masuk apa adanya ke Info bisnis lalu dibaca asistennya
 * sebagai fakta usaha, jadi kalimat perintah di dalamnya akan dihafalkan
 * sebagai fakta juga. Petunjuknya hidup di layar, di luar teks ini.
 *
 * ENAM HAL YANG SENGAJA ADA DI SETIAP CONTOH, karena tiap satu menutup
 * pertanyaan yang benar-benar sering masuk lewat WhatsApp:
 *
 * 1. Daftar harga dengan SATU BARIS PER ITEM, dan varian tidak pernah
 *    digabung. "Ada ukuran M, L, XL" tidak bisa dijawab per ukuran, sedangkan
 *    pelanggan selalu bertanya per ukuran.
 * 2. Penanda ketersediaan di baris yang sama: stok, sisa unit, kelas penuh,
 *    jadwal dokter. "Ready gak kak?" itu pertanyaan nomor satu.
 * 3. Setidaknya satu baris yang menyatakan sesuatu SEDANG TIDAK ADA. Asisten
 *    cuma boleh bilang habis kalau catatannya memang menulis begitu, jadi
 *    pemiliknya perlu melihat caranya menandai itu.
 * 4. Cara pesan dan cara bayar. Ini yang mengubah tanya jadi transaksi, dan
 *    hampir tidak pernah ditulis kalau tidak dicontohkan.
 * 5. Batas wilayah, jadwal, atau syarat. Yang TIDAK dilayani sama pentingnya
 *    dengan yang dilayani.
 * 6. Blok "YANG SERING DITANYA", karena banyak jawaban penting tidak berbentuk
 *    daftar harga dan tidak punya tempat lain.
 *
 * TIAP CONTOH JUGA PATUH PADA BATASAN PRESET BIDANGNYA, dan ini bukan
 * kerapian. Preset klinik melarang asisten memberi saran medis; kalau contoh
 * isinya memuat anjuran obat, pemiliknya menyimpan catatan yang menyuruh
 * asistennya melanggar aturannya sendiri, dan yang menang biasanya catatannya.
 * Jadi: contoh klinik menutup pertanyaan kondisi tubuh ke pemeriksaan
 * langsung, contoh properti menyerahkan KPR dan simulasi cicilan ke tim,
 * contoh servis menyebut biaya cek saja dan bukan biaya perbaikan, contoh
 * agency menandai semua angka sebagai harga mulai, contoh skincare tidak
 * menjanjikan hasil dan tidak menebak kondisi kulit, dan contoh sekolah tidak
 * menyebut sisa kuota sama sekali.
 *
 * Nama bidang dan ikonnya DITURUNKAN dari `PRESET`, tidak diketik ulang di
 * sini. Dua daftar bidang usaha di dua berkas sudah pernah berbeda diam-diam,
 * dan yang mahal bukan bedanya, tapi bidang baru yang ditambahkan lalu tidak
 * pernah muncul karena tidak ada yang ingat ada berkas kedua. Selftest
 * memastikan tiap preset punya contohnya.
 */

const TOKO = `DAFTAR HARGA DAN STOK
Kaos polos katun, ukuran M, hitam, Rp 75.000, stok 20
Kaos polos katun, ukuran L, hitam, Rp 75.000, stok 8
Kaos polos katun, ukuran L, putih, Rp 75.000, stok 0
Kaos polos katun, ukuran XL, hitam, Rp 80.000, stok 5
Kemeja flanel, ukuran M, merah, Rp 145.000, stok 3
Kemeja flanel, ukuran L, merah, Rp 145.000, stok 0
Celana chino, ukuran 30, krem, Rp 165.000, stok 6
Celana chino, ukuran 32, krem, Rp 165.000, stok 12
Totebag kanvas, Rp 55.000, stok 40
Topi baseball, hitam, Rp 65.000, stok 15

HARGA GROSIR
Beli 12 pcs sampai 47 pcs, potongan 10 persen.
Beli 48 pcs ke atas, potongan 20 persen, bisa campur model.
Harga grosir tidak berlaku untuk barang yang sedang diskon.

CARA PESAN DAN BAYAR
Sebutkan nama barang, ukuran, warna, dan jumlahnya.
Bayar transfer BCA atau QRIS. Pesanan diproses setelah bukti transfer masuk.
Belum melayani COD.

ONGKIR
Dikirim dari Bandung pakai JNE, J&T, atau SiCepat.
Jabodetabek Rp 15.000, Pulau Jawa Rp 20.000, luar Jawa mulai Rp 35.000.
Gratis ongkir untuk belanja di atas Rp 300.000.
Pesanan yang masuk sebelum jam 15.00 dikirim hari itu juga.

JAM BUKA
Senin sampai Sabtu, 09.00 sampai 17.00. Minggu libur.

TUKAR DAN RETUR
Salah ukuran bisa ditukar dalam 3 hari, barang belum dipakai dan label masih menempel.
Ongkir tukar ditanggung pembeli.
Barang rusak waktu diterima diganti penuh, kirim video waktu paket dibuka.

YANG SERING DITANYA
Ada toko fisiknya? Ada di Jalan Merdeka nomor 12, Bandung, buka 10.00 sampai 20.00.
Bisa nego? Harga satuan sudah pas, potongan cuma lewat harga grosir di atas.
Bisa custom sablon nama? Bisa, minimal 6 pcs, tambahan Rp 20.000 per pcs.`;

const MAKANAN = `DAFTAR MENU DAN HARGA
Nasi goreng kampung, Rp 25.000
Nasi goreng seafood, Rp 35.000
Ayam bakar madu, Rp 32.000
Ayam goreng lalapan, Rp 28.000
Sop iga, Rp 45.000
Cah kangkung, Rp 18.000
Es teh manis, Rp 6.000
Kopi susu gula aren, Rp 22.000
Jus alpukat, Rp 20.000
Sop iga sedang kosong sampai akhir minggu ini.

PAKET KATERING
Paket Hemat, Rp 25.000 per porsi. Nasi, ayam, sayur, sambal, kerupuk.
Paket Sedang, Rp 35.000 per porsi. Nasi, ayam, sayur, telur balado, buah, air mineral.
Paket Lengkap, Rp 50.000 per porsi. Nasi, dua lauk, sayur, buah, puding, air mineral.
Nasi tumpeng ukuran sedang untuk 15 orang, Rp 450.000.
Nasi tumpeng ukuran besar untuk 30 orang, Rp 850.000.
Minimal pesanan katering 20 porsi.
Pesanan katering paling lambat 2 hari sebelum hari H.
Tanggal baru dianggap pasti setelah dikonfirmasi tim, karena ikut antrean dapur.

CARA PESAN DAN BAYAR
Sebutkan tanggal, jam, jumlah porsi, dan alamat antar.
Katering bayar DP 50 persen, sisanya waktu pesanan diantar.
Transfer BCA atau QRIS. Untuk instansi bisa pakai invoice.

AREA ANTAR
Antar sendiri untuk Bandung kota, ongkos Rp 20.000 sampai Rp 50.000 tergantung jarak.
Luar Bandung kota belum dilayani.
Pesanan satuan juga ada di GoFood dan GrabFood.

JAM BUKA
Setiap hari 10.00 sampai 22.00.
Dapur katering libur hari Senin.

BAHAN DAN ALERGI
Semua menu tidak mengandung babi.
Menu tanpa MSG tersedia, sebutkan waktu pesan.
Untuk alergi tertentu, tanyakan dulu ke tim sebelum memesan.

YANG SERING DITANYA
Bisa pesan mendadak hari ini? Untuk satuan bisa. Katering di atas 20 porsi harus dicek dulu ke dapur.
Ada tempat untuk acara? Ada, kapasitas 40 orang, pemakaian tempat gratis kalau pesan di atas 30 porsi.
Wadahnya apa? Katering pakai kotak sekali pakai. Prasmanan pakai alat kami, ada jaminan Rp 300.000 yang dikembalikan.`;

const KLINIK = `DAFTAR LAYANAN DAN TARIF
Konsultasi dokter umum, Rp 100.000, sekitar 20 menit
Konsultasi dokter gigi, Rp 150.000, sekitar 30 menit
Bersihkan karang gigi, Rp 350.000, sekitar 45 menit
Tambal gigi, mulai Rp 250.000, sekitar 30 menit, biaya pastinya setelah diperiksa
Cabut gigi biasa, mulai Rp 300.000
Facial dasar, Rp 175.000, sekitar 60 menit
Facial acne, Rp 250.000, sekitar 75 menit
Totok wajah, Rp 120.000, sekitar 45 menit
Creambath, Rp 95.000, sekitar 60 menit
Paket facial 5 kali, Rp 750.000, berlaku 6 bulan

JADWAL PRAKTIK
Dokter umum, Senin sampai Sabtu, 08.00 sampai 14.00.
Dokter gigi, Selasa, Kamis, Sabtu, 15.00 sampai 20.00.
Terapis facial dan rambut, setiap hari, 09.00 sampai 19.00.
Minggu dan tanggal merah tutup.
Dokter gigi cuti 10 sampai 17 bulan ini, jadwalnya kosong.

CARA DAFTAR
Sebutkan layanan yang diinginkan, hari, dan jam yang diminta.
Jadwal dicatat sebagai permintaan dulu, tim mengabari kalau sudah pasti.
Datang 15 menit sebelum jadwal.
Batal atau ganti jadwal paling lambat 3 jam sebelumnya.
Telat lebih dari 20 menit, jadwalnya digeser ke antrean berikutnya.

PEMBAYARAN
Tunai, kartu debit, kartu kredit, dan QRIS.
Belum melayani BPJS.
Cicilan 0 persen 3 bulan untuk kartu kredit BCA dan Mandiri, minimal transaksi Rp 1.000.000.

YANG PERLU DIBAWA
KTP untuk pasien baru.
Hasil pemeriksaan atau rontgen sebelumnya kalau ada.
Untuk anak, bawa kartu imunisasi.

LOKASI
Jalan Melati nomor 8, lantai 2.
Parkir mobil dan motor tersedia, gratis.

YANG SERING DITANYA
Bisa datang tanpa daftar dulu? Bisa, tapi dilayani setelah yang sudah punya jadwal.
Melayani anak-anak? Melayani mulai usia 3 tahun.
Pertanyaan soal keluhan, obat, dan kondisi tubuh dijawab dokternya langsung waktu pemeriksaan, tidak lewat chat.`;

const PROPERTI = `DAFTAR UNIT DAN HARGA
Tipe 36/72, 2 kamar tidur, 1 kamar mandi, Rp 450.000.000, tersedia 4 unit
Tipe 45/90, 2 kamar tidur, 2 kamar mandi, Rp 585.000.000, tersedia 2 unit
Tipe 60/120, 3 kamar tidur, 2 kamar mandi, Rp 850.000.000, tersedia 1 unit
Tipe 70/135, 3 kamar tidur, 2 kamar mandi, Rp 1.050.000.000, sudah terjual habis
Ruko 2 lantai, 4x12 meter, Rp 1.250.000.000, tersedia 3 unit
Kavling siap bangun, 90 meter persegi, Rp 275.000.000, tersedia 6 kavling

YANG SUDAH TERMASUK
Sertifikat SHM dan PBG atas nama pembeli.
Listrik 2200 watt dan air PDAM sudah terpasang.
Pagar depan, carport satu mobil, dan taman kecil.
Belum termasuk BPHTB, biaya notaris, dan biaya provisi bank.

CARA BELI DAN PEMBAYARAN
Booking fee Rp 5.000.000, dikembalikan penuh kalau pengajuan KPR ditolak bank.
Bisa tunai keras, tunai bertahap 12 bulan, atau KPR.
Bank rekanan BCA, BTN, dan Mandiri.
Pengajuan KPR, simulasi cicilan, dan hasil persetujuannya diurus tim, tidak dihitung lewat chat.

DOKUMEN YANG DISIAPKAN PEMBELI
KTP suami istri, kartu keluarga, buku nikah, NPWP.
Slip gaji 3 bulan terakhir dan rekening koran 3 bulan terakhir.
Untuk wiraswasta ditambah NIB atau SIUP dan laporan keuangan setahun.

SURVEI LOKASI
Kantor pemasaran buka setiap hari 09.00 sampai 17.00.
Sebaiknya janjian dulu supaya ada yang menemani keliling.
Alamat Jalan Anggrek nomor 5, dekat pintu tol Cibiru.

SERAH TERIMA
Unit siap huni 30 hari setelah pelunasan atau akad kredit.
Unit indent sesuai tanggal yang tertulis di surat pemesanan.
Masa perbaikan gratis 90 hari setelah serah terima.

YANG SERING DITANYA
Harga bisa nego? Ada program potongan yang berubah tiap bulan, ditanyakan ke tim.
Boleh dibeli untuk investasi lalu disewakan? Boleh, tidak ada larangan dari pengembang.
Sudah ada penghuninya? Sudah, tahap pertama terisi 80 persen.`;

const SERVIS = `DAFTAR LAYANAN DAN TARIF
Cuci AC 0,5 PK sampai 1 PK, Rp 75.000 per unit, sekitar 45 menit
Cuci AC 1,5 PK sampai 2 PK, Rp 95.000 per unit, sekitar 60 menit
Bongkar pasang AC, Rp 350.000 per unit
Isi freon R32 0,5 PK sampai 1 PK, Rp 250.000
Isi freon R32 1,5 PK sampai 2 PK, Rp 350.000
Cek mesin cuci, Rp 75.000, biaya perbaikannya menyusul setelah dicek teknisi
Cek kulkas, Rp 75.000, biaya perbaikannya menyusul setelah dicek teknisi
Ganti sparepart, harganya ikut sparepartnya, selalu dikabari dulu sebelum dikerjakan
Biaya perbaikan tidak bisa dipastikan sebelum unitnya dilihat teknisi.

AREA LAYANAN DAN ONGKOS PANGGIL
Bandung kota, ongkos panggil gratis.
Cimahi dan Kabupaten Bandung, ongkos panggil Rp 25.000.
Di luar dua wilayah itu belum dilayani.

JADWAL
Senin sampai Sabtu, 08.00 sampai 17.00.
Minggu hanya untuk panggilan darurat, tambahan Rp 50.000.
Jadwal dicatat sebagai permintaan dulu, tim mengabari setelah teknisinya dipastikan kosong.
Slot pagi biasanya penuh, slot siang lebih longgar.

GARANSI
Cuci AC bergaransi 14 hari.
Perbaikan bergaransi 30 hari untuk kerusakan yang sama.
Sparepart bergaransi sesuai kartu garansi pabrikannya.
Garansi hangus kalau unit sempat dibuka teknisi lain.

CARA BAYAR
Tunai atau transfer setelah pekerjaan selesai dan dicek bersama.
Untuk pekerjaan di atas Rp 1.000.000 ada DP 30 persen.
Untuk kantor dan instansi bisa pakai invoice, tempo 14 hari.

YANG SERING DITANYA
Bisa datang hari ini juga? Tergantung teknisi yang kosong, dicek dulu ke tim.
Melayani borongan kantor? Melayani, minimal 5 unit, harganya beda, tanya tim.
Kalau sudah dicek tapi tidak jadi diperbaiki? Biaya ceknya tetap dibayar.`;

const KURSUS = `DAFTAR KELAS DAN BIAYA
Matematika SD kelas 4 sampai 6, Rp 350.000 per bulan, 8 pertemuan
Matematika SMP, Rp 450.000 per bulan, 8 pertemuan
Fisika SMA, Rp 550.000 per bulan, 8 pertemuan
Kimia SMA, Rp 550.000 per bulan, 8 pertemuan
Bahasa Inggris anak usia 7 sampai 12, Rp 400.000 per bulan, 8 pertemuan
Bahasa Inggris dewasa, Rp 500.000 per bulan, 8 pertemuan
Kelas privat di rumah murid, Rp 150.000 per pertemuan, minimal 4 pertemuan
Biaya pendaftaran Rp 100.000, sekali di awal.
Buku modul Rp 75.000 per semester.

JADWAL
Matematika SD, Senin dan Rabu, 15.30 sampai 17.00.
Matematika SMP, Selasa dan Kamis, 16.00 sampai 17.30.
Fisika SMA, Selasa dan Jumat, 18.30 sampai 20.00.
Kimia SMA, Senin dan Kamis, 18.30 sampai 20.00.
Bahasa Inggris anak, Sabtu, 09.00 sampai 10.30.
Bahasa Inggris dewasa, Rabu dan Jumat, 19.00 sampai 20.30.
Kelas Bahasa Inggris anak Sabtu pagi sedang penuh, kelas baru dibuka bulan depan.

KELAS PERCOBAAN
Boleh ikut satu pertemuan gratis, daftar dulu lewat chat.
Kelas percobaan cuma sekali untuk tiap calon murid.

CARA DAFTAR DAN BAYAR
Sebutkan nama murid, kelasnya berapa, dan mata pelajaran yang mau diambil.
Bayar transfer paling lambat tanggal 5 tiap bulan.
Telat bayar lebih dari 7 hari, kursinya dilepas untuk yang mengantre.

ATURAN KELAS
Satu kelas maksimal 6 murid.
Pertemuan yang dibatalkan lembaga diganti di hari lain.
Murid yang tidak hadir tanpa kabar tidak diganti.
Laporan perkembangan dikirim ke orang tua tiap akhir bulan.

TEMPAT
Jalan Kenanga nomor 21, lantai 2.
Ada ruang tunggu ber-AC untuk orang tua.
Kelas online lewat Zoom, biayanya sama.

YANG SERING DITANYA
Bisa pilih pengajar? Bisa diminta, tapi menyesuaikan jadwal pengajarnya.
Kalau anak ketinggalan materi? Ada jam tambahan gratis satu kali per bulan.
Ada kelas persiapan ujian? Ada, dibuka 3 bulan sebelum musim ujian, biayanya terpisah.`;

const AGENCY = `LAYANAN DAN CAKUPAN
Kelola media sosial, mulai Rp 3.500.000 per bulan. 12 konten feed, 20 story, laporan bulanan.
Kelola media sosial plus iklan, mulai Rp 6.000.000 per bulan. Termasuk paket di atas, plus pasang dan pantau iklan. Budget iklannya dibayar terpisah oleh klien.
Website company profile, mulai Rp 8.000.000. Sampai 7 halaman, domain dan hosting tahun pertama.
Website toko online, mulai Rp 15.000.000. Katalog, keranjang, dan pembayaran otomatis.
Foto produk, mulai Rp 2.500.000. Sampai 15 foto jadi, satu hari pemotretan di studio kami.
Video pendek, mulai Rp 3.000.000 per video. Sampai 60 detik, satu kali revisi konsep.
Logo dan identitas visual, mulai Rp 5.000.000. Tiga alternatif logo, dua kali revisi, panduan pemakaian.
Semua angka di atas harga mulai. Harga akhirnya ikut cakupan pekerjaan, jumlah revisi, dan tenggat.

CARA KERJA
Pertama bicara kebutuhan lewat chat atau meeting online.
Tim menyusun penawaran tertulis, 2 hari kerja.
Kontrak ditandatangani, DP 50 persen dibayar.
Pengerjaan berjalan sesuai jadwal di kontrak.
Pelunasan waktu serah terima berkas.

REVISI DAN TENGGAT
Dua kali revisi sudah termasuk. Revisi ketiga dan seterusnya ditagih terpisah.
Pengerjaan mulai dihitung setelah bahan dari klien lengkap.
Tenggat di bawah 7 hari kerja ada biaya tambahan 30 persen.

PEMBAYARAN
Transfer ke rekening perusahaan, ada invoice dan faktur pajak.
Termin 50 persen di awal dan 50 persen di akhir.
Kerja sama di atas 6 bulan bisa termin bulanan.

JAM KERJA
Senin sampai Jumat, 09.00 sampai 18.00.
Di luar jam itu dibalas hari kerja berikutnya.
Slot pengerjaan bulan ini sudah penuh, pesanan baru masuk antrean bulan depan.

YANG SERING DITANYA
Bisa lihat portofolio? Bisa, tim yang mengirimkan.
Rate card lengkapnya ada? Ada, tim yang menyiapkan dan mengirimkannya setelah kebutuhannya jelas.
Melayani luar kota? Melayani, meeting online. Biaya perjalanan ditambahkan kalau perlu datang.
Konten sehari jadi? Tidak. Waktu paling cepat 3 hari kerja per batch.`;

const SKINCARE = `DAFTAR PRODUK, HARGA, DAN STOK
Facial wash gentle 100ml, Rp 65.000, stok 24
Facial wash acne 100ml, Rp 72.000, stok 11
Toner hydrating 100ml, Rp 85.000, stok 7
Toner exfoliating 100ml, Rp 95.000, stok 0
Serum vitamin C 20ml, Rp 145.000, stok 15
Serum niacinamide 20ml, Rp 125.000, stok 9
Moisturizer ringan 30gr, Rp 98.000, stok 18
Moisturizer kaya 30gr, Rp 110.000, stok 4
Sunscreen SPF 50 PA++++ 40ml, Rp 115.000, stok 30
Paket pemula, Rp 250.000. Facial wash gentle, toner hydrating, sunscreen.
Paket lengkap, Rp 520.000. Facial wash, toner, serum, moisturizer, sunscreen.

IZIN DAN KANDUNGAN
Semua produk terdaftar BPOM, nomornya tercantum di kemasan.
Serum vitamin C berisi 10 persen ascorbic acid.
Serum niacinamide berisi 5 persen niacinamide.
Toner exfoliating berisi 2 persen BHA, tidak dipakai bersamaan dengan serum vitamin C di waktu yang sama.
Seri gentle dan hydrating tanpa pewangi dan tanpa alkohol.
Semua produk tidak diuji pada hewan.

CARA PAKAI
Pagi: facial wash, toner, serum, moisturizer, sunscreen.
Malam: facial wash, toner, serum, moisturizer.
Produk baru dipakai satu per satu dengan jeda seminggu, supaya ketahuan kalau ada yang tidak cocok.
Untuk kulit sensitif, coba dulu di area kecil belakang telinga selama 2 hari.

CARA PESAN DAN BAYAR
Sebutkan nama produk dan jumlahnya.
Transfer BCA atau QRIS. COD lewat kurir tersedia untuk Jabodetabek.

ONGKIR
Dikirim dari Jakarta pakai JNE, J&T, atau SiCepat.
Gratis ongkir untuk belanja di atas Rp 300.000.
Pesanan sebelum jam 15.00 dikirim hari itu juga.
Dikemas pakai bubble wrap, botol kaca ditambah kardus tebal.

RETUR
Produk salah kirim atau rusak diganti, kirim video waktu paket dibuka.
Produk yang segelnya sudah dibuka tidak bisa dikembalikan, karena alasan kebersihan.

YANG SERING DITANYA
Aman untuk ibu hamil atau menyusui? Untuk kondisi itu, tanyakan ke dokter kulit dulu sebelum memakai.
Berapa lama hasilnya kelihatan? Tiap kulit beda dan kami tidak menjanjikan waktu tertentu.
Ada yang untuk kulit sensitif? Ada, seri gentle dan hydrating tanpa pewangi dan tanpa alkohol.
Bisa jadi reseller? Bisa, minimal ambil 20 pcs, harga dan syaratnya ditanyakan ke tim.`;

const SEKOLAH = `JENJANG DAN BIAYA
TK A dan TK B. Uang pangkal Rp 5.000.000. SPP Rp 650.000 per bulan.
SD kelas 1 sampai 6. Uang pangkal Rp 12.000.000. SPP Rp 950.000 per bulan.
SMP kelas 7 sampai 9. Uang pangkal Rp 15.000.000. SPP Rp 1.200.000 per bulan.
Seragam Rp 1.500.000 untuk 3 setel, sekali di awal.
Buku dan kegiatan Rp 2.000.000 per tahun ajaran.
Uang pangkal boleh dicicil 3 kali dalam tahun pertama.

JADWAL PENDAFTARAN
Gelombang 1, 1 Oktober sampai 30 November, potongan uang pangkal 15 persen.
Gelombang 2, 1 Desember sampai 28 Februari, potongan uang pangkal 5 persen.
Gelombang 3, 1 Maret sampai kelas terisi, tanpa potongan.
Tes masuk diadakan tiap Sabtu selama masa pendaftaran, mulai 08.00.
Hasil tes diumumkan lewat surat resmi dari sekolah, bukan lewat chat.

CARA DAFTAR DAN BAYAR
Daftar bisa datang langsung ke bagian administrasi atau isi formulir online di website sekolah.
Biaya formulir pendaftaran Rp 350.000, dibayar waktu menyerahkan berkas, tidak dikembalikan.
Uang pangkal dibayar paling lambat 14 hari setelah pengumuman diterima.
SPP dibayar paling lambat tanggal 10 tiap bulan.
Transfer ke rekening sekolah atas nama yayasan, atau bayar langsung di bagian keuangan.
Bukti transfer dikirim ke bagian keuangan supaya tercatat.

BERKAS YANG DISIAPKAN
Fotokopi akta kelahiran dan kartu keluarga.
Fotokopi KTP kedua orang tua.
Rapor dua semester terakhir untuk pendaftar SD dan SMP.
Pas foto 3x4 sebanyak 4 lembar.
Surat pindah dari sekolah asal untuk murid pindahan.

JAM SEKOLAH
TK 07.30 sampai 11.00.
SD 07.00 sampai 14.00.
SMP 07.00 sampai 15.00.
Sabtu untuk kegiatan tambahan dan tidak wajib.

FASILITAS DAN LAYANAN
Perpustakaan, lapangan olahraga, laboratorium komputer, ruang musik.
Antar jemput Rp 450.000 per bulan, rutenya terbatas, tanyakan ke tim.
Katering makan siang Rp 25.000 per hari, bisa berlangganan bulanan.
Ekstrakurikuler futsal, pramuka, robotik, dan tari, sudah termasuk biaya kegiatan.

KUNJUNGAN SEKOLAH
Orang tua boleh datang melihat sekolah, Senin sampai Jumat, 08.00 sampai 15.00.
Sebaiknya janjian dulu supaya ada yang menemani berkeliling.
Alamat Jalan Cempaka nomor 3.

YANG SERING DITANYA
Ada beasiswa? Ada jalur prestasi dan jalur ekonomi, syaratnya diurus bagian administrasi.
Bisa masuk di tengah tahun ajaran? Bisa untuk murid pindahan, berkasnya dicek tim dulu.
Bahasa pengantarnya apa? Bahasa Indonesia, dengan pelajaran Bahasa Inggris tiap hari.`;

const LAINNYA = `DAFTAR LAYANAN DAN HARGA
Cetak brosur A5 art paper 120 gram, Rp 1.200 per lembar, minimal 100 lembar
Cetak brosur A5 art paper 150 gram, Rp 1.500 per lembar, minimal 100 lembar
Cetak kartu nama 2 sisi, Rp 45.000 per box isi 100
Cetak stiker vinyl per meter persegi, Rp 85.000
Spanduk flexi 280 gram per meter persegi, Rp 25.000
Banner roll up ukuran 60x160, Rp 275.000, sudah termasuk rangka
Cetak undangan, mulai Rp 3.500 per lembar, tergantung bahan dan lipatan
Jilid skripsi hard cover, Rp 45.000 per buku
Laminasi A4, Rp 5.000 per lembar
Mesin cetak besar sedang diperbaiki, cetak di atas ukuran A2 belum bisa sampai minggu depan.

WAKTU PENGERJAAN
Kartu nama dan brosur, 1 hari kerja.
Spanduk dan banner, 3 jam kalau file sudah siap.
Undangan, 3 sampai 5 hari kerja tergantung jumlah.
Kilat sehari jadi ada tambahan biaya 50 persen.

SYARAT FILE
Kirim file PDF, AI, atau CDR, resolusi minimal 300 dpi.
Warna pakai mode CMYK, bukan RGB.
File dari HP seperti JPG hasil foto tidak dipakai untuk cetak besar.
Kalau belum punya desain, jasa desain Rp 100.000 sampai Rp 300.000 tergantung tingkat kesulitan.

CARA PESAN DAN BAYAR
Kirim file, sebutkan ukuran, bahan, dan jumlahnya.
DP 50 persen untuk pesanan di atas Rp 500.000.
Tunai, transfer BCA, atau QRIS.
Hasil cetak dicek bersama sebelum dibawa pulang.

JAM BUKA DAN LOKASI
Senin sampai Sabtu, 08.00 sampai 20.00. Minggu 09.00 sampai 15.00.
Jalan Mawar nomor 17, sebelah minimarket.
Antar dalam kota gratis untuk pesanan di atas Rp 1.000.000.

YANG SERING DITANYA
Bisa lihat contoh bahan dulu? Bisa, datang ke tempat, contoh bahannya tersedia.
Warnanya bisa persis seperti di layar? Tidak selalu sama persis, karena layar dan tinta cetak berbeda.
Salah cetak karena file dari pelanggan? Cetak ulang ditagih lagi, jadi filenya dicek bersama sebelum naik cetak.`;

/**
 * Kuncinya WAJIB sama dengan `PRESET[].id`. Selftest memeriksanya, karena
 * bidang usaha baru yang ditambahkan tanpa contohnya menghasilkan chip yang
 * diam-diam hilang dari layar, bukan galat.
 */
const ISI: Record<string, string> = {
  toko: TOKO,
  makanan: MAKANAN,
  klinik: KLINIK,
  properti: PROPERTI,
  servis: SERVIS,
  kursus: KURSUS,
  agency: AGENCY,
  skincare: SKINCARE,
  sekolah: SEKOLAH,
  lainnya: LAINNYA,
};

export interface ContohInfo {
  id: string;
  nama: string;
  ikon: NamaIkon;
  isi: string;
}

/**
 * Urutannya mengikuti `PRESET`, jadi bidang yang sama duduk di urutan yang
 * sama di layar Asisten dan di sini. Orang yang sudah memilih presetnya lalu
 * datang ke Info bisnis mencari nama yang sama di posisi yang sama.
 */
export const CONTOH_INFO: ContohInfo[] = PRESET.filter((p) => ISI[p.id]).map(
  (p) => ({ id: p.id, nama: p.nama, ikon: p.ikon, isi: ISI[p.id] }),
);

/** Dipakai kalau suatu saat contohnya perlu diambil per id. */
export function contohUntuk(id: string): string | undefined {
  return ISI[id];
}
