# Harga dan untung

Angka paketnya diambil dari `packages/db/src/plans.ts`. Kalau di sana berubah,
perbarui berkas ini.

## Paket

| | Gratis | Starter | Growth | Pro |
|---|---|---|---|---|
| Harga per bulan | Rp 0 | Rp 199.000 | Rp 499.000 | Rp 999.000 |
| Balasan per bulan | 51 | 3.000 | 15.000 | 30.000 |
| Harga per balasan | — | Rp 66 | Rp 33 | Rp 33 |
| Nomor WhatsApp | 1 | 1 | 3 | 10 |
| Asisten | 1 | 1 | 5 | 20 |
| Catatan info bisnis | 10 | 20 | 200 | 1.000 |

Satu **balasan** berarti satu kali asisten menjawab, bukan satu baris pesan.
Jawaban yang dipecah jadi tiga bubble tetap dihitung satu.

## Yang dikunci per paket

Cuma dua, dan ditegakkan di worker bukan cuma disembunyikan di layar:

- **Baca foto dan pesan suara** — mulai Starter
- **Kirim foto, video, PDF dari galeri** — mulai Starter
- **Sapa duluan dan jam kerja tim** — mulai Growth

Semua sisanya, termasuk CRM, janji temu, dan ringkasan AI, **didapat paket
gratis juga**. Itu keputusan sadar: yang bikin orang merasa Palwise mengerti
usahanya justru fitur-fitur itu, dan menguncinya sebelum ada yang percaya sama
sekali berarti memotong jalan sendiri.

## Yang belum kamu tahu, dan ini yang paling penting

**Dengan model yang sekarang, semua paket berbayar RUGI. Modelnya harus diganti,
bukan harganya dinaikkan.**

Dua hal yang harus dipisah, dan keduanya sekarang sudah ada angkanya: berapa token
yang dipakai tiap balasan (diukur `npm run ukur:prompt`), dan berapa harga per
token (dari halaman harga resmi Google). Rinciannya di bawah, beserta apa yang
harus dikerjakan.

Worker juga mencatat token masuk dan keluar tiap balasan ke catatan prosesnya,
jadi sesudah ada beberapa pelanggan sungguhan, angka rata-rata yang sebenarnya
akan datang sendiri dan menggantikan perkiraan di sini.

### Ukuran promptnya sudah diukur, 8 Agustus 2026

Dari `npm run ukur:prompt`, dan ini token yang dikirim ULANG di setiap balasan:

| Bagian | Token | Catatan |
|---|---|---|
| System prompt | ~3.400 | Tetap, dikirim ulang tiap balasan |
| Konteks per giliran | ~80 | Tanggal, data kontak |
| Info bisnis (`topK` 5) | ~1.200 | 5 potongan, tiap potongan sampai 900 huruf |
| Riwayat (10 pesan) | ~600 | Naik terus sepanjang obrolan |
| **Input per balasan** | **~5.300** | |
| Keluaran | ~200 sampai 400 | Berpikir sengaja dimatikan |

**System prompt itu 64 persen dari seluruh biaya input**, dan sekarang dia TIDAK
kena diskon. Pengukuran langsung ke API (lihat `apps/worker/src/lib/token.ts`)
menemukan ambang diskonnya ada di antara 3.766 dan 6.966 token, sedangkan prompt
kita 3.400. Jadi posisinya paling merugikan: sudah cukup panjang untuk mahal,
belum cukup panjang untuk dapat diskon.

Catatan: `npm run ukur:prompt` dulu membandingkannya dengan ambang 1.024 dan
mencetak centang hijau, jadi angkanya terbaca seolah diskonnya sudah kena.
Sudah dibetulkan supaya memakai ambang yang benar-benar terukur.

### Harga modelnya sudah dipastikan, 8 Agustus 2026

Dari halaman harga resmi Google (`ai.google.dev/gemini-api/docs/pricing`), paket
berbayar, per 1 juta token:

| Model | Input | Keluaran |
|---|---|---|
| **Gemini 3.5 Flash** (yang dipakai sekarang) | **$1,50** | **$9,00** |
| Gemini 3.5 Flash-Lite | $0,30 | $2,50 |
| **Gemini 3.1 Flash-Lite** (cadangan kita) | **$0,25** | **$1,50** |
| Gemini 3.1 Pro Preview | $2,00 | $12,00 |

Yang bikin celaka bukan harga inputnya, tapi **keluarannya: $9,00**, enam kali
harga input. Perkiraan sebelumnya cuma menghitung input, dan itu keliru besar.

### Jadi sekarang: Gemini 3.5 Flash bikin SEMUA paket rugi

Pakai 5.300 token input dan 300 token keluaran per balasan, kurs Rp 14.412:

| Model | Ongkos per balasan | Starter Rp 66 | Growth Rp 33 | Pro Rp 33 |
|---|---|---|---|---|
| Gemini 3.5 Flash | **Rp 153** | rugi Rp 87 | rugi Rp 120 | rugi Rp 120 |
| Gemini 3.1 Flash-Lite | **Rp 26** | untung 61% | untung 22% | untung 22% |

Satu pelanggan Growth yang memakai jatahnya penuh: 15.000 × Rp 153 =
**Rp 2,29 juta ongkos** untuk pendapatan Rp 499.000. Rugi Rp 1,8 juta per
pelanggan per bulan. Semakin banyak pelanggan, semakin cepat habis.

Paket gratis pun ikut: 51 × Rp 153 = Rp 7.800 per pengguna gratis per bulan.

### Yang harus dikerjakan, urut

1. **GANTI MODELNYA ke `gemini-3.1-flash-lite`.** Ini yang mengubah rugi jadi
   untung, dan cuma satu baris di `.env` (`GEMINI_MODEL`). Enam kali lebih murah.
   Tugasnya menjawab dari info bisnis dan mengisi JSON, bukan penalaran
   bertingkat, dan token berpikir sudah lama dimatikan, jadi kelas Lite masuk
   akal. Buktikan dulu di halaman Coba dulu dan `npm run selftest` sebelum
   dipasang ke pelanggan.
2. **Jatah Pro sudah dipotong** 60.000 ke 30.000, jadi Rp 33 per balasan sama
   dengan Growth. Sebelumnya Rp 17, yang membuat paket termahal justru paling
   tipis marginnya.
3. **`topK` info bisnis dari 5 jadi 3.** Hemat ~480 token input per balasan.
4. **Jendela riwayat.** Sekarang sampai 60 pesan. Obrolan panjang jadi paling
   mahal, padahal ingatan panjangnya sudah dipegang tag CRM dan ringkasan.
5. **System prompt 3.400 token.** Dikirim ulang tiap balasan dan belum kena
   diskon karena ambangnya sekitar 4.000. Pindahkan inti info bisnis yang stabil
   ke situ supaya menyeberang ambang sekaligus mengurangi blok per giliran.
   Kerjakan paling akhir: sesudah pindah ke Flash-Lite, marginnya sudah aman dan
   ini jadi penghematan, bukan penyelamatan.

Catatan soal diskon: yang murah dan otomatis itu **implicit caching**, dan itu
yang diukur di `lib/token.ts`. Angka "context caching $0,15" di tabel harga
Google itu **explicit caching**, yang ada biaya simpan $1,00 per jam. Untuk
produk dengan banyak asisten berbeda, biaya simpan per jam itu tidak masuk akal.
Jangan tertukar.

Yang sudah pasti mengurangi biaya: lampiran tidak dikirim ulang ke model, token
berpikir dimatikan, dan paket gratis tidak boleh membaca foto atau suara sama
sekali (token gambar dan suara jauh lebih mahal daripada teks).

**Biaya lain yang sudah diketahui:** satu VPS untuk semuanya. Tidak ada layanan
tambahan, tidak ada biaya per nomor WhatsApp, dan chat yang dimulai pelanggan
tidak ditagih Meta selama dibalas dalam 24 jam.

## Kebijakan uang

**Jaminan 14 hari**, penuh, tanpa ditanya panjang lebar, sekali per akun untuk
langganan pertama. **Bulan berjalan tidak dikembalikan sebagian**, karena jatah
balasannya memang sudah tersedia sebulan penuh. **Sisa jatah hangus** tiap
bulan.

Dikembalikan tanpa diminta kalau: layanan mati lebih dari 24 jam berturut-turut
karena kesalahan kita, kena tagih dua kali, atau akunnya dihentikan padahal
tidak melanggar.

Tidak dikembalikan kalau nomornya diblokir Meta, karena itu di luar kendali
kita, dan itu disebut jelas di ketentuan sebelum orang membayar.

## Ajak teman

Pengajak dan yang diajak sama-sama dapat 1 bulan gratis, **cair waktu yang
diajak mulai berlangganan berbayar, bukan waktu dia mendaftar.** Memberi hadiah
untuk pendaftaran mengundang akun palsu.

## Cara menagihnya

**Midtrans Snap, terpasang 8 Agustus 2026.** Paket berbayar cuma bisa dinyalakan
oleh notifikasi dari Midtrans yang tanda tangannya cocok, bukan oleh tombol di
dashboard. Bulan gratis dari ajak teman dipotong lebih dulu tanpa lewat Midtrans.
Langganan yang habis diturunkan penjadwal di worker. Lihat peta jalan dan panduan
VPS.
