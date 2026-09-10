# Preferensi produk Palwise

Dicatat dari arahan pemilik pada 8 September 2026.

- Halaman Tanya terasa seperti aplikasi chat AI yang rapi di HP dan desktop. Utamakan ruang percakapan; header, composer, dan kartu bantuan harus ringkas.
- Satu kontrol untuk satu fungsi. Hindari tombol sidebar dan obrolan baru yang tampil ganda pada layar yang sama.
- Aksi sekunder seperti salin jawaban, sumber, dan pengaturan memakai ikon dengan nama aksesibel serta tooltip. Jangan mengecilkan sasaran sentuh demi menghemat ruang.
- Panduan panjang dan rincian tambahan dibuka saat diperlukan. Kartu WhatsApp tidak menampilkan kotak QR kosong yang besar; QR asli tetap cukup besar untuk dipindai.
- Saran pertanyaan dan draf menggunakan konteks bisnis, nama pelanggan, dan percakapan yang benar-benar ada. Jangan membuat pelanggan X atau mengulang pilihan jenis usaha setelah pemasangan sudah melewati langkah itu.
- Hasil pembacaan data harus terlihat, termasuk keadaan kosong atau gagal. Jangan mengatakan “ini daftarnya” tanpa daftar.
- Jawaban tidak boleh berhenti pada janji seperti “saya lihat dulu”. Jalankan pembacaan yang diperlukan lalu berikan hasil dalam giliran yang sama; bila gagal, jelaskan kegagalannya atau minta konteks spesifik.
- Bedakan status WhatsApp terkini dari data riwayat. Saat terputus, hitungan tersimpan tidak membuktikan tidak ada chat masuk di WhatsApp. Jelaskan batas sinkronisasi dengan singkat.
- Hapus obrolan menggunakan modal konfirmasi di HP dan desktop, dengan judul obrolan, Batal, Hapus, keadaan proses, dan galat. Tab/Shift+Tab tetap di dalam modal, termasuk saat proses berjalan. Batal/Escape mengembalikan fokus ke tombol asal; jika obrolan sudah dihapus, fokus menuju navigasi yang masih tersedia.
- Periksa detail lintas keadaan: memuat, kosong, galat, terputus, tersambung, layar sempit, riwayat panjang, dan keyboard HP. Pengiriman pesan sungguhan tetap melalui persetujuan pemilik di produk.

File ini menyimpan preferensi proyek, bukan izin umum untuk tindakan produksi pada tugas mendatang.

## Kuota Tanya — 9 September 2026

- Pemilik meminta fitur Tanya dibatasi agar biaya AI terkendali, mencakup empat paket: Coba Gratis, Starter, Growth, Pro.
- Skema awal: 20/200/600/1.200 pertanyaan AI per bulan per bisnis, dengan batas harian 10/20/40/80. Gratis sebelum email pemilik diverifikasi mendapat 5 percobaan sekali, bukan kuota yang berulang.
- Kuota Tanya terpisah dari balasan WhatsApp. Riwayat, QR, dan pengecekan yang dijalankan tanpa model tidak memotongnya. Pemasangan melalui AI tetap dihitung.
- Hitungan harus disimpan di server, tahan terhadap permintaan bersamaan, dan tidak terulang saat membuat atau menghapus obrolan. Kegagalan dikembalikan sekali; percobaan berulang tetap dibatasi.
- Sisa kuota cukup berupa indikator kecil; rincian dibuka saat ditekan. Saat habis, jelaskan waktu reset atau verifikasi/naik paket tanpa menghilangkan draf.
- Angka ini membatasi biaya, bukan jaminan seluruh usaha untung. Evaluasi ulang menggunakan pemakaian token dan harga provider aktual sebelum melonggarkan kuota atau mengganti model.

## Chat lengkap dan tampilan ringkas — 9 September 2026

- Draf/revisi wajib membawa isi lengkap, penerima yang benar, dan konteks draf sebelumnya. Kalimat seperti “ini drafnya” bukan hasil. Usul yang ditolak tidak boleh meninggalkan narasi seolah hasil sudah tersedia.
- Satu giliran menyelesaikan pembacaan dan jawaban; perbaikan otomatis tetap dibatasi empat panggilan model. Jika gagal, tampilkan kegagalan yang jelas. Jangan mengirim pesan pelanggan otomatis.
- Saat ada draf, tampilkan draf terlebih dahulu. Gabungkan hasil pencarian dan riwayat dalam rincian yang bisa dibuka. Daftar yang merupakan jawaban utama tetap terlihat; transkrip panjang punya area gulir terbatas.
- Di HP, composer berada di bawah baik saat obrolan kosong maupun berjalan. Saran berada di atasnya. Membuka sidebar riwayat memfokuskan tombol tutup, bukan pencarian, agar keyboard tidak terbuka otomatis.
- Landing page menonjolkan dua sisi Palwise: chat AI untuk pemilik bisnis dan asisten WhatsApp untuk pelanggan. Tunjukkan contoh cek pelanggan, draf, dan kabar bisnis. Data ilustrasi wajib ditandai; jangan gunakan identitas pelanggan produksi dalam demo publik.
- Jawaban lama yang terlanjur tanpa hasil dapat dilengkapi lewat tindakan pengguna, dengan kuota yang sama; tidak ada pemrosesan ulang otomatis yang diam-diam memotong kuota.

## Bisnis, Ringkasan, dan edit bagian — 10 September 2026

- Tanya harus memahami pergantian topik. Pertanyaan strategi menambah pelanggan tidak boleh meneruskan draf/penerima dari obrolan sebelumnya. Berikan hasil yang menjawab pertanyaan terbaru.
- Bantuan bisnis diutamakan untuk prioritas kerja, peluang follow up, perbandingan perkembangan, dan pengelolaan info bisnis; gunakan data nyata, alasan yang terlihat, dan langkah yang dapat dikerjakan.
- Ringkasan menjadi ruang kerja ringkas dengan periode 7/30 hari, perbandingan durasi sama, tab perhatian/peluang/janji, tahap pelanggan, dan akses langsung ke obrolan atau bantuan Tanya. Informasi paket dan panduan cukup dibuka saat diperlukan.
- Tindakan dari Ringkasan menyiapkan permintaan di obrolan baru, tanpa otomatis memanggil AI atau mengirim pesan. Kuota keempat paket tetap berlaku.
- Info bisnis bisa ditambah, diedit, diganti atau dihapus sebagian lewat chat. Pada catatan panjang hasil impor, ubah bagian yang diminta dan pertahankan sisanya; jangan memaksa model menulis ulang seluruh dokumen.
- Tampilkan perubahan sebelum Simpan. Jika sumber sudah berubah setelah pratinjau, jangan menimpa versi terbaru. Edit salinan Palwise tidak mengubah website asal.

Rilis preferensi di atas aktif pada 10 September 2026, kode `a56f1ef`; hasil verifikasi dicatat di [docs/rilis-ringkasan-tanya.md](docs/rilis-ringkasan-tanya.md).

## Dashboard dan Masukan yang ringkas — 10 September 2026

- Dashboard dan Masukan memakai susunan yang disesuaikan untuk HP dan desktop, dengan teks sedikit, hierarki jelas, dan rincian dibuka saat diperlukan.
- Hindari kartu penuh penjelasan berulang. Utamakan angka, daftar pekerjaan, dan tindakan yang langsung bisa digunakan.
- Masukan harus ringkas dan interaktif agar tidak banyak mengambil ruang layar atau menutupi pekerjaan utama.
