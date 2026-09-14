# Rombakan desain Palwise — 14 September 2026

Landing utama tetap general. Halaman /klinik, /hotel, /kursus, dan tujuh bidang lainnya tetap terpisah dengan contoh percakapan masing-masing.

## Perubahan

- Susunan landing baru: nilai utama, pratinjau WhatsApp dan AI pemilik, manfaat, demo Tanya, langkah mulai, bidang usaha, kendali pengguna, harga, FAQ, dan ajakan mulai.
- Desktop memakai pratinjau ruang kerja tiga kolom. HP memakai pilihan pelanggan/pemilik, menu ringkas, dan kartu harga yang dapat dibaca tanpa menggeser layar. Contoh bidang usaha bisa diganti.
- Formulir masuk, daftar, lupa sandi, reset, dan verifikasi memakai kerangka visual yang sama. Daftar dilengkapi validasi isian, tombol lihat sandi, kode ajakan opsional, dan tautan ketentuan.
- Info bisnis memiliki pustaka dengan pencarian judul/isi, filter kesiapan, keadaan kosong, hitungan sumber, pintasan tambah di HP, dan panel tambah di desktop. Pencarian direset saat berpindah asisten.
- Sidebar, Ringkasan, Tanya, dan navigasi halaman publik diselaraskan. Perilaku pengiriman, kuota, otorisasi, dan sambungan WhatsApp tetap ditangani sistem yang sama.
- Harga/kuota dari konfigurasi paket. Demo ditandai sebagai ilustrasi; tidak ada testimoni, logo pelanggan, atau angka hasil karangan. Metadata dan kartu berbagi mengikuti pesan general baru.

## Pemeriksaan sebelum rilis

- Typecheck web berhasil.
- Browser Edge: lebar 320, 390, 768, 1024, dan 1440 px tanpa overflow horizontal di landing.
- Demo pelanggan/pemilik, pilihan bidang, draf, FAQ, detail paket, menu HP dan Escape berfungsi.
- Validasi daftar, lihat sandi, kode ajakan, login akun uji lokal, dan pesan galat sandi salah diperiksa.
- Pencarian/filter Info bisnis, keadaan hasil kosong, asisten tanpa sumber, dan pintasan tambah di HP diperiksa dengan data uji lokal.
- /klinik, /hotel, /kursus, /privasi, /lupa, /atur-ulang, /verifikasi tampil berhasil pada HP.
- Tidak ada galat JavaScript dalam pengujian interaksi utama. Tidak memanggil AI atau mengirim pesan pelanggan selama verifikasi.

Build awal `f0ba814` berhasil. Koreksi final yang aktif di produksi adalah `b830071`.

## Koreksi dari pemilik — 15 September 2026

- Seluruh latar hijau pada desain baru diganti putih dan abu-abu netral, termasuk landing, autentikasi, sidebar, Ringkasan, Tanya, Info bisnis, dan kartu berbagi. Biru dipakai untuk pilihan/aksi.
- Contoh utama WhatsApp sekarang calon pengguna yang menanyakan kemampuan Palwise dan cara mencoba sebelum menyambungkan nomor. Contoh kopi tidak lagi menjadi demo utama; contoh bidang lain tetap bisa dipilih.
- Peringatan layanan memakai bahasa pengguna pada produksi maupun pratinjau. Perintah terminal dan konfigurasi tidak ditampilkan. Saat worker tidak dapat diperiksa, penjelasan tidak menjamin chat masih tersinkron.
- Typecheck koreksi berhasil. Pengujian browser memeriksa warna latar hasil render, contoh utama, dan pesan gangguan tanpa petunjuk teknis.

## Verifikasi produksi — 15 September 2026

- Rilis web aktif: `apps/web/.next-tanya/release-b830071`. Build produksi beserta pemeriksaan tipe berhasil.
- `https://palwise.id/` memuat warna netral dan contoh baru; sepuluh halaman bidang usaha, panduan, privasi, dan kontak merespons berhasil.
- Masuk, daftar, pemulihan, reset, dan verifikasi email dapat dibuka. Halaman aplikasi tanpa sesi tetap mengarahkan ke masuk.
- JavaScript dan CSS produksi dapat dimuat; kartu Open Graph baru berformat PNG 1200×630.
- Browser pada domain produksi: menu HP, pilihan demo, formulir daftar dan tombol lihat sandi berfungsi; tidak ada galat JavaScript atau overflow horizontal pada pemeriksaan HP.
- Proses `palwise-worker` tetap berjalan dengan PID yang sama sepanjang kedua rilis. Health worker berhasil. Tidak ada migrasi data atau pesan pelanggan yang dikirim.
- Data uji lokal dibersihkan. Build sebelumnya tetap tersedia untuk rollback.

Log build: `data/log/redesign-b830071-build.log`; penanda aktivasi: `data/log/redesign-b830071-active`.
