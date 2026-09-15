# Rilis platform dan pengalaman HP — 15 September 2026

## Perubahan

- Hero tidak lagi menampilkan angka kuota balasan gratis. Versi HP memiliki judul dua baris, CTA utama penuh, menu ringkas, teks lebih besar, dan contoh percakapan yang bisa diperluas. Angka kapasitas tetap ada di paket dan FAQ.
- Asisten: pengaturan per bagian, pilihan asisten yang jelas, tombol simpan tetap terjangkau. Isian pada bagian tertutup tetap dikirim; bagian dengan validasi gagal dibuka otomatis.
- Pelanggan: ringkasan dari data tersimpan, pencarian berlabel, 30 pelanggan per halaman, urutan stabil, dan kata kunci dipertahankan saat memilih tahap. Batas lama 200 pelanggan tidak lagi memotong daftar.
- Chat masuk: pencarian selalu terlihat, filter dengan status terpilih, baris percakapan lebih lega, keadaan memuat/gagal/kosong, dan tombol mencoba kembali.
- WhatsApp: kartu tanpa kotak QR kosong, QR hanya saat tersedia, status terkini dibedakan dari status tersimpan, serta pelepasan nomor tetap memerlukan konfirmasi di produk.
- Akun: ringkasan email, formulir perubahan yang dibuka saat diperlukan, tampil/sembunyikan password, validasi wajib, dan pemberitahuan aksesibel.
- Paket: navigasi bagian, perbandingan paket yang jelas, referral ditempatkan sebagai rincian tambahan, dan pesan pembayaran tanpa instruksi konfigurasi server atau klaim popularitas yang tidak dibuktikan.
- Navigasi pengaturan bersama menghubungkan Asisten, Info bisnis, Coba dulu, WhatsApp, serta Akun/Paket. Pilihan asisten dipertahankan pada tautan terkait.

## Verifikasi lokal

- TypeScript web dan pemeriksaan whitespace Git lolos.
- Playwright / Edge: landing pada lebar 320, 360, 390, 430, 768, 1024, 1440; angka kuota tidak ada di hero; perluas/ringkas demo dan mode pemilik berhasil.
- Asisten, Pelanggan, Chat masuk, WhatsApp, Akun, Paket: tidak ada overflow dokumen pada lebar 320, 390, 768, 1024, 1440. Screenshot desktop/HP diperiksa.
- Akun QA lokal dengan 65 pelanggan sintetis dan 3 percakapan: login, tiga halaman pelanggan, pencarian, pelestarian kata kunci saat filter, simpan asisten dengan bagian tertutup, validasi dan visibilitas password, pencarian serta pembukaan chat di HP lolos. Tidak ada galat JavaScript klien.
- Status WhatsApp disconnected, connecting, qr, connected, logged_out, serta worker tidak tersedia diuji dengan respons jaringan sintetis. QR berukuran sedikitnya 200 piksel pada layar HP; kondisi lain tidak menampilkan kotak QR. Membuka lalu membatalkan pelepasan tidak mengirim mutasi.
- Kegagalan daftar inbox dan pemulihan melalui Coba lagi lolos.
- Pengujian tidak mengirim pesan pelanggan, memanggil AI, atau membuat pembayaran. Status simulasi bukan bukti sambungan WhatsApp sungguhan.

## Rilis

Build produksi dibuat pada direktori rilis terpisah. Hanya proses web yang diganti setelah build lolos; build sebelumnya disimpan untuk pemulihan. Hasil aktivasi dan pemeriksaan live dicatat sesudah rilis.
