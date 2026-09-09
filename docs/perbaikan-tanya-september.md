# Perbaikan Tanya dan landing — 9 September 2026

- Riwayat model menyertakan isi dan status usulan, sebelum transkrip panjang. Revisi dapat mempertahankan penerima dan isi yang sedang disunting.
- Validasi jawaban memperbaiki klaim hasil/draf kosong dan usul tidak valid satu kali, di dalam batas empat panggilan AI. Pembacaan percakapan pelanggan tetap wajib sebelum menghasilkan kartu kirim, termasuk revisi.
- Draf muncul lebih dulu dengan penerima, nomor, isi, dan kontrol persetujuan. Sumber pendukung digabung dalam satu disclosure. Hasil baca utama tetap terbuka; isi panjang dibatasi tinggi dengan gulir keyboard.
- Composer HP tetap di bawah, saran berada di atas input, sidebar tidak memfokuskan pencarian otomatis. Tombol pemulihan tersedia untuk jawaban lama terakhir yang berupa pengantar tanpa isi.
- Hero landing, navigasi, fitur, FAQ, metadata dan visual produk menampilkan Tanya. Demo interaktif menggunakan data ilustrasi lokal, tanpa AI atau pesan sungguhan.

Validasi: 132 regresi Tanya, 63 regresi kuota, 1.094 selftest proyek, TypeScript worker/web. Pemeriksaan komponen nyata melalui browser pada HP dan desktop mencakup draf, rincian, composer kosong, fokus riwayat, dan pilihan demo landing. Keyboard perangkat fisik tidak diemulasikan; fokus DOM dan perubahan viewport diperiksa.
