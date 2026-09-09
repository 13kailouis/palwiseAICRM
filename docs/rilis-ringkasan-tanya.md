# Ringkasan dan Tanya — 10 September 2026

Rilis aplikasi: `a56f1ef` (perubahan utama `3eed960`, penyempurnaan `54b6036`). Aktif di https://app.palwise.id. Build web `.next-tanya/release-a56f1ef`. Tidak ada migrasi schema.

## Perubahan

- Ringkasan diganti dengan ruang kerja: periode 7/30 hari dan pembanding berdurasi sama dengan batas hari WIB, angka pesan/pelanggan/klaim bayar, tab perhatian/peluang/janji, tahap CRM, obrolan terbaru, serta rincian paket yang dapat dibuka.
- Peluang follow up dibatasi ke obrolan prospek tertarik/negosiasi/closing, tidak aktif 1–30 hari, tanpa keluhan/permintaan bantuan manusia atau jeda follow up. Daftar dibatasi delapan, total tetap dihitung. Ini kandidat untuk ditinjau, bukan bukti siap membeli.
- Tanya mendapat laporan kondisi bisnis, prioritas, peluang follow up, dan pintu pengelolaan info. Tautan dari Ringkasan membuka pertanyaan yang dapat disunting dalam obrolan baru; tidak mengirim atau memanggil AI otomatis.
- Pertanyaan analisis memakai laporan akun dan tidak meneruskan usulan draf lama. Pengaman menolak draf melenceng; perbaikan tetap berada dalam batas empat panggilan model.
- Edit sebagian info bisnis menggunakan kutipan unik dan pengganti. Tambah email, ganti isi, atau hapus bagian mempertahankan seluruh teks lainnya, termasuk sumber impor panjang. Sumber panjang tidak boleh ditimpa dengan keluaran penuh yang terpotong.
- Simpan membandingkan isi lama secara atomik agar pratinjau basi tidak menimpa perubahan yang sudah tersimpan. Pengindeksan ulang dan persetujuan dalam produk tetap berlaku.
- Kegagalan model pada jawaban pertama analisis mengembalikan kuota, walau laporan lokal sudah sempat dibaca.

## Verifikasi

- 1.094 selftest, 168 uji Tanya, 63 uji kuota lulus di server. Pemeriksaan lokal menyeluruh terhambat kehabisan memori; hasil lulus berasal dari pengujian server sebelum aktivasi. Uji arsip PDF pribadi hanya mengecek berkas bila direktori arsip tersedia; arsip tersebut tidak dipublikasikan ke server.
- Build worker dan Next.js produksi, termasuk pemeriksaan tipe, lulus.
- Komponen asli Ringkasan diperiksa pada desktop 1366×900 dan HP 360×760. Peralihan tab dan periode mengubah isi, tidak ada gulir horizontal pada HP. Fixture hanya berisi identitas contoh.
- Uji model Gemini aktual menggunakan workspace sementara: pertanyaan pertumbuhan setelah draf lama menghasilkan strategi tanpa usul kirim; penambahan dua email di akhir catatan impor panjang mempertahankan bagian lainnya. Total lima panggilan model; tidak ada pesan pelanggan terkirim dan workspace uji dibersihkan.
- Sesudah aktivasi: web/worker sehat, rute terlindungi mengarahkan pengguna tanpa login, SHA aset Tanya/Ringkasan sesuai build, landing tetap tersedia, dashboard terautentikasi dan API periode 7/30 lulus dengan akun uji, pembatasan 429 keempat paket serta QR/status tanpa model lulus. Data uji dibersihkan.

## Batas yang perlu dipahami

Angka merupakan data tercatat, bukan keseluruhan WhatsApp ketika sinkronisasi terputus. Tahap selesai dan klaim bayar bukan omzet terverifikasi. Periode hanya menyaring metrik; tab fokus dan tahap CRM menunjukkan keadaan saat ini. Janji yang berdekatan ditandai pada delapan baris yang ditampilkan, bukan pemeriksaan kalender eksternal. Edit sumber impor hanya mengubah salinan Palwise. Tidak ada jaminan kenaikan pelanggan atau retensi dari fitur ini.
