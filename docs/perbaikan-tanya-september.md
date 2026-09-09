# Perbaikan Tanya dan landing — 9 September 2026

- Riwayat model menyertakan isi dan status usulan, sebelum transkrip panjang. Revisi dapat mempertahankan penerima dan isi yang sedang disunting.
- Validasi jawaban memperbaiki klaim hasil/draf kosong dan usul tidak valid satu kali, di dalam batas empat panggilan AI. Pembacaan percakapan pelanggan tetap wajib sebelum menghasilkan kartu kirim, termasuk revisi.
- Draf muncul lebih dulu dengan penerima, nomor, isi, dan kontrol persetujuan. Sumber pendukung digabung dalam satu disclosure. Hasil baca utama tetap terbuka; isi panjang dibatasi tinggi dengan gulir keyboard.
- Composer HP tetap di bawah, saran berada di atas input, sidebar tidak memfokuskan pencarian otomatis. Tombol pemulihan tersedia untuk jawaban lama terakhir yang berupa pengantar tanpa isi.
- Hero landing, navigasi, fitur, FAQ, metadata dan visual produk menampilkan Tanya. Demo interaktif menggunakan data ilustrasi lokal, tanpa AI atau pesan sungguhan.

Validasi: 132 regresi Tanya, 63 regresi kuota, 1.094 selftest proyek, TypeScript worker/web. Pemeriksaan komponen nyata melalui browser pada HP dan desktop mencakup draf, rincian, composer kosong, fokus riwayat, dan pilihan demo landing. Keyboard perangkat fisik tidak diemulasikan; fokus DOM dan perubahan viewport diperiksa.

## Verifikasi produksi — 10 September 2026

Rilis kode `0a7e8b1` aktif, dengan build web `release-99a510f` (koreksi terakhir hanya menyentuh prompt worker). Kedua layanan sehat. Aset halaman Tanya dan landing cocok dengan build baru; autentikasi dan kuota keempat paket diperiksa melalui endpoint produksi memakai workspace uji yang kemudian dihapus.

Uji tambahan dengan Gemini yang dikonfigurasi server berhasil menghasilkan draf awal dan revisi hubungan tanpa menyebut produk. Dua giliran memakai total lima panggilan model. Tidak ada WhatsApp yang dikirim; pelanggan dan kanal hanya ilustrasi, tidak ditautkan, dan workspace dibersihkan.

Browser memverifikasi landing publik pada lebar 390 dan 320 piksel tanpa luapan horizontal, termasuk interaksi demo. Rincian pelanggan desktop dibatasi 260 piksel dan tetap bisa digulir. Preferensi produk sudah dicatat di MEMORY.md.
