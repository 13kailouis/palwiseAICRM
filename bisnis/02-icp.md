# Pelanggan yang paling cocok

## Empat syarat, dan semuanya harus terpenuhi

**1. Chat masuknya lewat WhatsApp, bukan lewat marketplace.**
Palwise menyambung ke satu nomor WhatsApp. Usaha yang 90% pesanannya dari
Shopee atau Tokopedia tidak akan merasakan apa-apa.

**2. Pertanyaannya berulang.**
Harga berapa, masih ada nggak, jam buka, bisa hari Sabtu, lokasinya di mana.
Kalau tiap chat butuh penilaian manusia yang berbeda, asisten cuma jadi
penghalang.

**3. Jawabannya bisa ditulis.**
Ini syarat yang paling sering meleset. Kalau harga selalu tergantung negosiasi
dan tidak ada satu pun yang bisa ditulis sebagai aturan, tidak ada yang bisa
dihafalkan asistennya.

**4. Ada yang hilang karena telat membalas.**
Ini yang mengubah "menarik" jadi "mau bayar". Kalau chat masuknya lima sehari
dan semua terbalas dalam sepuluh menit, tidak ada masalah yang dibayar.

## Enam bidang yang sudah ada presetnya

Diambil dari `apps/web/src/lib/preset.ts`. Urutannya menurut seberapa pas dengan
empat syarat di atas.

| Bidang | Kenapa cocok | Yang perlu diwaspadai |
|---|---|---|
| **Klinik, salon, perawatan** | Pertanyaan jadwal berulang terus, dan janji temu itu inti usahanya | Asisten dilarang keras memberi saran medis. Sudah dikunci di presetnya |
| **Jasa & servis** (bengkel, laundry, servis AC) | Tarif dan area layanan gampang ditulis, jadwal jelas | Jangan menebak biaya perbaikan sebelum barangnya dilihat |
| **Properti** | Siklusnya panjang, pertanyaan tipe unit berulang, survei butuh janji temu | Dilarang menjanjikan persetujuan KPR |
| **Kursus & les** | Jadwal dan biaya gampang ditulis, kelas percobaan butuh janji | Yang chat sering orang tua, bahasanya harus tenang |
| **Toko & retail** | Volume chat paling tinggi | Stok berubah cepat; kalau tidak diperbarui, asistennya salah |
| **Kafe, resto, katering** | Pesanan besar butuh tanggal dan porsi | Tanggal tidak boleh dijanjikan sebelum dapur memastikan |

## Yang sebaiknya ditolak, atau minimal diperingatkan

**Yang mau blast promo.** Ini penyebab paling cepat nomornya diblokir Meta.
Palwise memang tidak bisa melakukannya, tapi orang yang datang dengan niat itu
akan kecewa dan menyalahkan produknya. Lebih baik ditolak di depan.

**Yang nomornya satu-satunya jalur usaha dan tidak punya cadangan.** Risiko
pemblokiran nyata. Sarankan nomor lain yang khusus usaha, **tapi bukan nomor yang
baru dibeli**: nomor baru belum dikenal WhatsApp dan justru lebih gampang kena
batasan. Yang benar nomor yang sudah dipakai wajar beberapa hari dari HP. Saran
ini harus sama di tiga tempat (halaman jualan, ketentuan, halaman Nomor
WhatsApp), karena "pakai nomor terpisah" saja terbaca sebagai "beli nomor baru"
dan itu justru pilihan paling berisiko. Kalau dia menolak, jangan dipaksa jual.

**Yang harganya sepenuhnya negosiasi.** Tidak ada yang bisa dihafalkan.

**Yang butuh integrasi ke sistem lain** (stok otomatis, ERP, sistem booking yang
sudah ada). Belum ada, dan tidak ada di peta jalan dekat.

## Ukuran usaha yang pas

**BELUM DIUKUR** dan sengaja tidak ditebak. Yang bisa dikatakan dari struktur
harga: paket gratis 51 balasan sebulan cukup untuk sekitar selusin obrolan, jadi
dia alat coba, bukan alat pakai. Starter 3.000 balasan sebulan berarti sekitar 100
balasan sehari.

Angka nyatanya baru bisa diisi setelah ada sepuluh pengguna berbayar. Sampai
saat itu, jangan menyusun target berdasarkan tebakan.
