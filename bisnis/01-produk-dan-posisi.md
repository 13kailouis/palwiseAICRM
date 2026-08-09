# Produk dan posisi

## Satu kalimat

Palwise membalas chat WhatsApp usaha kecil secara otomatis, memakai info harga
dan aturan yang diisi pemiliknya sendiri, lalu mencatat calon pembeli dan janji
temunya.

## Yang dijual: hasil, bukan teknologi

Judul halaman depan berbunyi **"Sales WhatsApp yang gercep 24 jam, tanpa nambah
gaji."**

Itu bukan pilihan gaya. Pembeli Palwise sedang menimbang satu hal yang konkret:
menambah orang atau tidak. Dia berpikir dalam satuan gaji bulanan, bukan dalam
satuan "efisiensi" atau "scale up". Judul yang bicara ke perhitungan itu jauh
lebih mengena daripada janji kenaikan penjualan.

**Kenapa "sales", bukan "admin", diubah 8 Agustus 2026.** Judulnya dulu berbunyi
"Admin WhatsApp yang tidak pernah tidur". Metaforanya rapi tapi menjual barang
yang salah. Admin itu pos biaya: orang membelinya semurah mungkin, menawar, lalu
membatalkannya begitu ada penghematan. Sedangkan yang benar-benar dikerjakan
produknya pekerjaan sales, yaitu menjawab calon pembeli selagi dia masih mau beli,
mengejar yang menghilang, dan mencatat siapa yang hampir jadi. Sales itu pos
penghasilan, dan orang membeli sales sebanyak yang dia mampu.

Pergeseran itu juga yang membenarkan seluruh halaman jualan: dari "chat kamu jadi
rapi" ke "yang tanya jadi beli".

Kata "asisten" tetap dipakai DI DALAM dashboard, dan itu disengaja. Di sana
orangnya sudah membeli, dan yang dia atur memang satu asisten yang menjawab. Yang
diubah cuma cara menjualnya ke orang yang belum kenal.

Dan janji kenaikan penjualan tetap belum boleh dibuat: belum ada satu pelanggan
pun yang bisa membuktikannya. Menjual "sales" itu menyebut PEKERJAAN yang memang
dikerjakan, bukan menjanjikan angka penjualan.

## Pembeda utama: harga

| | Palwise Growth | Cekat.AI |
|---|---|---|
| Harga bulanan | Rp 499.000 | Rp 1.499.000 |
| Jatah balasan | 15.000 | 15.000 |
| Biaya tiap balasan | Rp 33 | Rp 100 |

Angka Cekat diambil dari halaman harga mereka dan dipakai sebagai pembanding di
halaman depan. **Periksa ulang tiap beberapa bulan.** Kalau mereka menurunkan
harga dan kita masih memajang angka lama, itu berubah dari pembanding jujur jadi
kebohongan.

Kenapa bisa jauh lebih murah, dan ini alasan sungguhan yang boleh dijelaskan ke
siapa pun: chat yang dimulai pelanggan tidak ditagih WhatsApp selama dibalas
dalam 24 jam. Jadi biaya sebenarnya cuma menjalankan asistennya, dan itu yang
ditagihkan.

## Tiga hal yang sengaja TIDAK dijanjikan

**Kenaikan penjualan.** Belum ada buktinya. Begitu ada pelanggan yang
penjualannya benar-benar naik dan mau bicara terbuka, angkanya boleh dipakai,
dengan namanya sendiri.

**Nomor WhatsApp aman dari Meta.** Risikonya nyata dan di luar kendali kita.
Halaman ketentuan, halaman jualan, dan asisten bantuan semuanya menyampaikan ini
apa adanya. Orang yang kena blokir setelah dibilang "aman kok" akan jauh lebih
marah daripada yang sudah diperingatkan.

**Jawaban AI selalu benar.** Yang dijanjikan lebih sempit dan bisa ditepati: dia
cuma menjawab dari info yang diisi pemiliknya, dilarang mengarang harga dan
jadwal, dan melempar ke manusia kalau tidak tahu.

## Strategi umum vs khusus bidang

Satu mesin, banyak bidang usaha. TIDAK ada cabang kode per jenis usaha.

Yang membuatnya terasa dibuat khusus itu **preset**: teks awal per bidang usaha
di `apps/web/src/lib/preset.ts`, dipasang di layar Asisten. Preset klinik
melarang saran medis, preset properti melarang menjanjikan KPR. Menambah bidang
baru cukup satu baris di berkas itu.

Kalau nanti mau benar-benar fokus ke satu bidang, yang dipecah **halaman
jualannya** (satu halaman per bidang untuk pencarian) dan presetnya, bukan
mesinnya. Memecah mesin berarti membayar biaya perawatan berkali lipat untuk
produk yang belum punya pelanggan.

## Identitas

Palwise adalah produk, badan usahanya **PT Wefluence Media Group**. Yang
menandatangani ketentuan dan menerima pembayaran badan usaha itu, tapi semua
kontak pelanggan tetap ke Palwise.
