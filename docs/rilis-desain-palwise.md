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

Build produksi dan hasil pemeriksaan domain publik dicatat setelah aktivasi.
