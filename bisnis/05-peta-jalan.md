# Peta jalan

Per 8 Agustus 2026. Palwise belum punya pelanggan berbayar, tapi sudah bisa
menerima uang.

## Sudah jadi dan jalan

**Membalas chat.** Balas otomatis 24 jam dari info yang diisi pemiliknya, dipecah
jadi beberapa bubble, bisa baca foto dan pesan suara, bisa kirim foto/video/PDF,
bisa diambil alih manusia kapan saja, dan bisa ikut jam kerja tim.

**Mengisi info bisnis.** Ketik manual, tanya jawab, tarik dari website, baca dari
PDF/Word/txt/csv, atau pindahkan dari ChatGPT. Plus preset per bidang usaha.

**CRM.** Data pelanggan terisi sendiri, enam tahap pipeline, keluhan dilacak
terpisah, ringkasan AI per pelanggan, profil lengkap per pelanggan.

**Janji temu.** Dicatat otomatis dari obrolan (tatap muka maupun online),
dipastikan manusia, pelanggannya bisa dikabari sekalian, dan diingatkan sebelum
harinya.

**Sapa duluan.** Yang menghilang, yang sudah beli, dan pengingat janji.

**Menerima pembayaran.** Midtrans Snap, dipasang 8 Agustus 2026. Paket berbayar
cuma bisa dinyalakan oleh notifikasi dari Midtrans yang tanda tangannya cocok,
bukan oleh tombol di dashboard. Perpanjangan menambah dari tanggal habis yang
lama, ganti paket memulai periode baru, dan penurunan paket dijadwalkan di akhir
periode yang sudah dibayar seperti yang dijanjikan halaman pengembalian dana.
Bulan gratis dari ajak teman dipotong lebih dulu tanpa lewat Midtrans. Langganan
yang habis diturunkan penjadwal di worker, lengkap dengan mematikan nomor yang
lewat jatah, dan pemiliknya diingatkan lewat WhatsApp-nya sendiri tiga hari
sebelumnya. Dibuktikan `npm run uji:bayar`.

## Yang menghalangi pendapatan

### 1. Dua kolom identitas

`IDENTITAS.alamat` masih "Majalengka" saja, dan `IDENTITAS.waBantuan` masih
kosong. Alamat lengkap dipakai di ketentuan dan privasi sebagai alamat surat
resmi. Nomor WA menentukan munculnya tombol "Tanya dulu lewat WhatsApp" di
halaman depan.

### 2. Kotak masuk halo@palwise.id

Alamatnya sudah tertulis di kode, tapi mengisi teksnya tidak membuat kotak
masuknya ada. Alamat itu satu-satunya jalur permintaan pengembalian dana dan
satu-satunya jalur penghapusan data menurut UU PDP. Sekalian verifikasi domain
`palwise.id` di Resend, karena `RESEND_API_KEY` yang terisi tidak menolong kalau
domain pengirimnya belum diverifikasi.

### 3. Ukur biaya AI sebenarnya

Lihat [04-harga-dan-untung.md](04-harga-dan-untung.md). Sampai ini diukur, kamu
belum tahu paket mana yang untung.

## Sesudah bisa terima uang

Urutannya menurut apa yang paling sering ditanyakan, bukan menurut apa yang
paling menarik dikerjakan. **Jangan mengerjakan apa pun di sini sebelum ada
sepuluh pengguna berbayar yang memintanya.**

**Laporan sederhana.** Berapa chat masuk, berapa jadi closing, jam berapa paling
ramai. Sengaja dibuang dari halaman harga pada 1 Agustus 2026 karena fiturnya
memang tidak ada; jangan dijanjikan lagi sebelum benar-benar jadi.

**Integrasi kalender.** Palwise cuma tahu janji yang dia sendiri catat. Belum ada
datanya soal berapa banyak pemilik usaha Indonesia yang memakai Google Calendar,
jadi tanyakan dulu ke pengguna sungguhan sebelum membangunnya.

**Meta Cloud API.** Jalur resmi, bebas risiko blokir, tapi berbayar per
percakapan. Kolomnya sudah disiapkan di database. Ini jawaban untuk yang nomornya
tidak boleh berisiko sama sekali.

**Instagram dan live chat web.** Skemanya sudah multi-channel.

## Yang sengaja TIDAK dikerjakan

**Broadcast atau blast.** Ini cara paling cepat bikin nomor pelanggan diblokir
Meta. Jangan dipasang tanpa rate limiting dan opt-in yang benar, dan menurut saya
jangan dipasang sama sekali di jalur QR.

**Visual flow builder.** Alur diatur lewat prompt, dan untuk kebanyakan kasus itu
lebih fleksibel.

**Memecah produk jadi versi per bidang usaha.** Lihat
[01-produk-dan-posisi.md](01-produk-dan-posisi.md).

## Cara memutuskan apa berikutnya

Tiga pertanyaan, semuanya harus dijawab ya:

1. Sudah ada minimal tiga pengguna berbayar yang memintanya?
2. Kalau tidak dibuat, apakah ada yang berhenti berlangganan?
3. Apakah bisa dikerjakan tanpa memecah mesinnya jadi cabang per bidang usaha?
