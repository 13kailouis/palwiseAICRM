# Kuota Tanya

Keputusan awal 9 September 2026. Sumber konfigurasi: `KUOTA_TANYA` di `packages/db/src/plans.ts`.

| Paket | Harga/bulan | Tanya/bulan | Tanya/hari |
| --- | ---: | ---: | ---: |
| Coba Gratis | Rp0 | 20 | 10 |
| Starter | Rp199.000 | 200 | 20 |
| Growth | Rp499.000 | 600 | 40 |
| Pro | Rp999.000 | 1.200 | 80 |

Satu pertanyaan dihitung sekali bila perlu model, termasuk pemasangan dan revisi draf. QR, riwayat, serta jalur deterministik status WhatsApp/hitungan sederhana/daftar tahap pelanggan tidak dihitung. Konfirmasi tindakan yang sudah dibuat tidak memanggil model lagi.

Kuota berlaku bersama seluruh anggota satu workspace, kalender WIB (00.00 setiap hari/tanggal 1 setiap bulan), tanpa akumulasi. Perubahan paket menyesuaikan batas dan tetap memakai hitungan bulan yang sama. Langganan kedaluwarsa langsung memakai batas gratis meskipun scheduler belum berjalan. Akun gratis tanpa email pemilik terverifikasi mendapat 5 pertanyaan sekali; pertanyaan tersebut tetap termasuk kuota bulan berjalan setelah verifikasi.

## Pengaman biaya

- Reservasi atomik sebelum panggilan model; hitungan dipisah dari obrolan agar tidak bisa direset dengan menghapusnya.
- Maksimal 3 percobaan AI per menit dan batas percobaan harian sebesar kuota harian + 5, termasuk percobaan gagal. Gagal sebelum jawaban tersimpan mengembalikan kuota pertanyaan, tetapi bukan kuota percobaan.
- Empat panggilan model per pertanyaan, maksimal 1.400 token keluaran tiap panggilan. Riwayat/payload alat dibatasi total 24.000 karakter tiap panggilan, selain system prompt; permintaan pemilik dipertahankan. Pesan masuk maksimal 2.000 karakter.
- Error 429 diteruskan sampai UI dengan sisa kuota dan alasan. Draf tetap tersedia. Tidak ada pembelian atau penagihan otomatis saat kuota habis.
- Kuota WhatsApp dan ruang coba tetap mempunyai penghitung masing-masing. Pembatasan ini tidak menjamin margin keseluruhan produk; biaya kedua jalur itu dan infrastruktur harus tetap diperhitungkan.

## Dasar biaya

[Harga resmi Gemini](https://ai.google.dev/gemini-api/docs/pricing), dibaca 9 September 2026: Gemini 3.1 Flash-Lite standar $0,25 input/$1,50 output per satu juta token; cadangan 3.5 Flash-Lite $0,30/$2,50. Kode memakai provider/model yang dikonfigurasi, tanpa otomatis menaikkan kelas model untuk paket berbayar.

Contoh perencanaan, bukan biaya aktual: dua panggilan dengan total 6.000 token masuk dan 600 keluar pada 3.1 Flash-Lite = $0,0024. Dengan kurs ASUMSI Rp17.000/USD, sekitar Rp41 per pertanyaan: Rp820/8.200/24.600/49.200 bila seluruh kuota masing-masing paket habis. Percakapan panjang, keluaran maksimal, fallback, dan retry dapat lebih mahal. Skenario berat empat panggilan, total 32.000 input + 5.600 output = $0,0164 di 3.1, atau $0,0236 di 3.5; bukan batas biaya absolut karena tokenisasi berbeda dari jumlah karakter. Jangan mengklaim “pasti tidak rugi” dari contoh ini.

Evaluasi dari log token provider saat pemakaian nyata bertambah. Jangan memperbesar kuota atau menaikkan model sebelum biaya per pertanyaan dihitung ulang. Tarif, kurs, pajak, biaya WhatsApp, dan server harus diperiksa terpisah.

## Rilis

Tambahan schema hanya tabel `PemakaianTanya` beserta index dan relasi workspace. Backup SQLite sebelum `db:push`; tanpa `--accept-data-loss`. Kolom penghitung Tanya lama tetap ada untuk rollback. Pemakaian lama sebelum rilis tidak dihitung ulang; tiap workspace mulai dengan kuota baru pada peluncuran. Pekerjaan yang terhenti karena proses server mati dapat meninggalkan satu reservasi terhitung; ini konservatif terhadap biaya, tanpa mengulang refund secara otomatis.

Validasi: `npm run uji:kuota-tanya`, `npm run uji:tanya`, `npm run typecheck`, build produksi, cek API autentikasi/429, serta indikator kuota pada viewport HP dan desktop.
