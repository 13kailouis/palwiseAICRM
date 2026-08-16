# Palwise

AI chatbot WhatsApp + CRM omnichannel untuk bisnis Indonesia. Alternatif
Cekat.AI dengan harga mulai **Rp 199.000/bulan** (Cekat: Rp 1.499.000) dan
onboarding 30 detik lewat scan QR — tanpa verifikasi Meta Business.

---

## Kenapa bisa jauh lebih murah

Ini bukan sekadar banting harga — struktur biayanya memang beda:

| | Palwise | Cekat.AI |
|---|---|---|
| Harga mulai | Rp 199.000/bln | Rp 1.499.000/bln |
| Kuota balasan | 3.000 (Starter) / 15.000 (Growth) | 15.000 |
| Harga per balasan | Rp 33 (Growth) / Rp 66 (Starter) | Rp 100 |
| Sampai bisa dipakai | Scan QR, langsung jalan | Daftar ke Meta dulu, 1 sampai 3 hari |

Klaim di halaman harga hanya boleh berisi hal yang bisa dicek pihak lain.
Dua baris pernah ada di sini lalu dibuang karena salah: Cekat juga berlangganan
bulanan, dan Cekat juga bisa membaca audio. Jangan tambahkan pembanding yang
tidak bisa kamu buktikan.

Tiga hal yang menekan biayanya:

1. **Meta tidak menagih service conversation.** Chat yang *dimulai customer*
   gratis selama masih dalam window 24 jam. Yang berbayar hanya template
   marketing (± Rp 780) dan utility (± Rp 336) — dan chatbot CS inbound tidak
   memakai keduanya.
2. **Jalur QR/Baileys tidak punya biaya per pesan sama sekali.**
3. **Gemini Flash + RAG** menekan COGS ke ± Rp 15–40 per balasan. Sisanya margin.

---

## Jalankan di laptop (5 menit)

Butuh **Node.js 20+**. Tidak perlu install database — pakai SQLite.

```bash
npm install
```

```bash
cp .env.example .env
```

Isi `GEMINI_API_KEY` di `.env`. Gratis, ambil di
<https://aistudio.google.com/apikey>. Ganti juga `INTERNAL_TOKEN` dan
`AUTH_SECRET` dengan string acak.

```bash
npm run db:push && npm run db:seed
```

```bash
npm run dev
```

Buka <http://localhost:3000>. Akun demo:

```
demo@palwise.id / demo1234
```

Dashboard di port 3000, worker WhatsApp di port 4000. Keduanya jalan bareng
lewat satu perintah `npm run dev`.

---

## Alur pakai pertama kali

1. **AI Agent** → tulis identitas, gaya bicara, dan alur penjualan.
2. **Knowledge Base** → tempel katalog, harga, SOP. AI hanya boleh menjawab
   dari sini.
3. **Coba Agent** → tes dulu di playground, tidak menyentuh WhatsApp.
4. **WhatsApp** → klik Hubungkan, scan QR dari HP (Perangkat tertaut →
   Tautkan perangkat).
5. **Inbox** → pantau chat masuk, ambil alih kapan saja.

---

## Yang sudah jadi

**AI agent**
- Prompt perilaku bebas (identitas, gaya bicara, alur, batasan)
- Pesan sambutan otomatis untuk chat pertama
- Balasan dipecah jadi beberapa bubble + indikator "mengetik"
- Baca **gambar** dan **voice note** langsung (Gemini native)
- Guardrail anti-halusinasi: dilarang mengarang harga/stok/kebijakan

**Knowledge base (RAG)**
- Sumber: tempel teks, tanya-jawab, upload file (.txt/.md/.csv/.json), tarik dari website
- Chunking sadar-paragraf + embedding + pencarian cosine
- Isi tiap catatan bisa dibuka penuh dan diedit di tempat; menyimpan otomatis
  memicu index ulang, karena potongan lama masih memakai teks sebelum diedit
- Status per sumber, bisa di-index ulang manual

**Pindahkan dari AI lain**

Banyak pemilik usaha sudah berbulan-bulan menceritakan bisnisnya ke ChatGPT,
Claude, atau Gemini. Tab "Dari AI lain" memberi perintah siap tempel supaya
pengetahuan itu pindah tanpa mengetik ulang. Empat hal yang menentukan hasilnya:

1. **Nama bisnisnya disebut, dua kali.** Orang sering cerita beberapa usaha ke
   AI yang sama. Tanpa penyebutan eksplisit plus perintah "abaikan yang lain",
   AI-nya mencampur semuanya jadi satu.
2. **Dilarang menambah fakta.** Tanpa aturan ini AI lain "membantu" melengkapi
   dengan pengetahuan umum, lalu asisten menjawab pelanggan pakai harga karangan.
   Ditambah "pertahankan kata-kataku apa adanya" supaya angka tidak dirapikan.
3. **Hasilnya dibungkus blok kode.** Batasnya jadi jelas dan bisa disalin bulat.
   Tanda kutip tiga, kalimat pengantar, dan kalimat penutup dibuang otomatis
   oleh `buangBlokKode` saat disimpan.
4. **Ditanya apakah sudah lengkap.** Pengetahuan yang banyak pasti terpotong dan
   pengguna tidak akan sadar. Langkah di layar menyuruh ketik "lanjutkan" lalu
   tempel sambungannya.

Diletakkan di Info bisnis, bukan di Asisten. Yang dipindahkan itu fakta bisnis,
dan halaman Asisten mengurus cara bicara.

**Tarik dari website atau berkas**
- Website: cukup masukkan domain (`wefluence.id`), bukan URL halaman tertentu.
  Halaman turunan dipilih berdasarkan skor kata kunci: harga, produk, FAQ,
  cara pesan, kontak, kebijakan.
- Berkas: PDF, Word (.docx), .txt, .md, .csv, .json sampai 15 MB. PDF dibaca
  per halaman lewat `unpdf`, Word lewat `mammoth`. PDF hasil scan ditolak
  dengan penjelasan, bukan disimpan kosong diam-diam.
- Kemajuan dikirim ke layar lewat SSE, jadi pengguna melihat apa yang sedang dibaca
- Perapian bertahap: kalau bahannya banyak, tiap bagian dipadatkan dulu baru
  digabung. Merapikan sekaligus gampang kena batas panjang jawaban, dan
  hasilnya terpotong di tengah tanpa ketahuan.
- Selalu ditampilkan untuk diperiksa dan diedit sebelum disimpan, tidak pernah langsung masuk
- Kalau perapian gagal, teks mentahnya tetap ditampilkan alih-alih dibuang

**Banyak nomor & banyak agent**
- Satu akun bisa memegang beberapa nomor sekaligus (3 di Growth, 10 di Pro)
- Bisa membuat beberapa agent, tiap nomor ditugaskan ke agent yang mana saja
- Knowledge base terpisah per agent, jadi bagian keluhan tidak dijejali katalog
- Batas jumlah nomor dan agent ditegakkan sesuai paket saat menambah

**Inbox & handoff**
- Live chat multi-percakapan, filter Masih jalan / Duluin ini / Nunggu kamu / Semua
- AI menandai sendiri kapan butuh manusia, dengan alasannya
- Tim membalas → AI otomatis mundur di percakapan itu
- Lampiran gambar & audio tampil langsung di thread

**Baca perasaan pelanggan**

Asisten membaca nada tiap pesan pelanggan, lalu menyesuaikan **cara** menjawab —
bukan faktanya. Yang kesal dijawab pendek dan langsung, tanpa basa-basi. Yang
sudah mau bayar tidak diajak berputar. Yang kelihatan tidak sanggup tidak
ditanyai budgetnya dan angkanya tidak diulang.

Bacanya dari dua jalur: kata-katanya (leksikon dagang Indonesia, termasuk ejaan
gaul dan emoji) DAN perilakunya — berapa pesan belum dibalas, berapa lama dia
menunggu, keluhan yang menggantung, uang yang sudah dikirim tapi belum dilayani.
Jalur kedua lebih dipercaya: kata bisa dikelabui bahasa daerah dan kesopanan,
tiga pesan beruntun tanpa dibalas artinya sama di seluruh Indonesia.

Yang dilihat pemilik usaha: lencana di kotak masuk lengkap dengan alasannya,
urutan "Duluin ini" menurut siapa yang paling perlu dipegang, perjalanan
perasaan tiap pelanggan di halaman profilnya, dan bacaan hidup di Coba dulu.

**Asistennya sendiri TIDAK punya suasana hati**, dan itu keputusan rancangan.
Yang tetap padanya cuma watak yang kamu pilih sekali di halaman Asisten
(hangat / tenang / santai / tegas). Dia tidak pernah membawa suasana dari obrolan
lain, dan tidak pernah membalas nada kasar dengan nada kasar.

Nol panggilan AI tambahan — semuanya matematika, jadi tidak menambah biaya per
balasan. Bisa dimatikan lewat sakelar di halaman Asisten. Rancangan lengkap dan
alasan tiap keputusan: [bisnis/08-lapisan-rasa.md](bisnis/08-lapisan-rasa.md).

```bash
npm run uji:rasa
```

Korpus 73 pesan berlabel tangan plus 38 uji perilaku, tanpa API dan tanpa
database. `npm run contoh:rasa` mengisi kotak masuk dengan obrolan contoh, dan
`npm run ukur:rasa` mengukur apakah lapisan ini benar-benar bekerja.

**Masalah pelanggan (refund, komplain)**

Pelanggan yang minta uangnya kembali, barangnya rusak, atau paketnya tidak
sampai ditandai sendiri oleh AI dari isi obrolan, lalu muncul di atas halaman
Pelanggan sebagai kotak merah "Perlu ditangani".

**Ini sengaja BUKAN tahap ketujuh di pipeline.** Enam tahap itu posisi di jalan
menuju membeli. Masalah bukan posisi: dia bisa menimpa siapa saja kapan saja,
dan paling sering justru menimpa yang sudah membayar. Kalau dijadikan tahap,
pembeli yang komplain hilang dari hitungan pembeli, aturan "tahap hanya boleh
maju" jadi rusak, dan waktu masalahnya beres tidak ada yang tahu dia harus
dikembalikan ke tahap mana. Jadi masalah itu sumbu terpisah, bukan posisi.

Dua aturan yang menjaganya berguna:

1. **AI cuma boleh mengisi, tidak boleh mengosongkan.** Yang berhak menyatakan
   sudah beres itu pemilik toko. Kalau AI boleh menghapusnya, satu balasan
   santai dari pelanggan yang masih kesal ("oke ditunggu ya") akan
   menghilangkan keluhannya dari daftar, dan tidak ada yang pernah tahu ada
   yang menunggu.
2. **Yang ditampilkan lamanya, bukan tanggalnya.** "Menggantung 3 hari" jauh
   lebih menggerakkan daripada sebuah tanggal. Yang bikin pelanggan pergi bukan
   adanya masalah, tapi lamanya didiamkan. Karena itu daftarnya juga diurutkan
   dari yang paling lama menggantung.

**CRM**
- Kontak & pipeline 6 tahap: baru, tertarik, negosiasi, closing, selesai, batal
- Nama, email, nama bisnis, bidang, dan tag **diisi otomatis AI** dari isi chat
- Data yang sudah dikoreksi manual tidak pernah ditimpa AI
- Arti tiap tahap dijelaskan ke model, bukan cuma daftar nama. Tanpa itu dia
  menebak sendiri dan hasilnya berubah-ubah antar percakapan.
- **Tahap hanya boleh maju.** Satu pertanyaan santai dari pelanggan yang sudah mau
  bayar tidak boleh melemparnya balik ke "baru". Pengecualian: "batal" bisa dari
  mana saja, dan pelanggan "selesai" boleh mulai siklus baru ke "tertarik".
- Kontak ruang coba dikecualikan dari daftar pelanggan, hitungan pipeline,
  ringkasan, kotak masuk, dan daftar jam janji temu yang terisi
- **Profil pelanggan** (`/app/kontak/[id]`): satu tempat berisi keluhan,
  ringkasan AI, semua lampiran, riwayat, janji temu, dan semua datanya yang bisa
  dibetulkan sekaligus dalam satu formulir

**Ringkasan AI per pelanggan**
- Dibuat waktu tombolnya diklik, BUKAN otomatis tiap pesan. Obrolan ramai bisa
  puluhan pesan sehari, dan meringkas ulang tiap pesan berarti membayar model
  puluhan kali untuk paragraf yang mungkin tidak pernah dibuka.
- Disimpan di `Contact.ringkasan` + `ringkasanAt`, dipakai ulang selama belum ada
  pesan baru, dan ditandai "ada pesan baru setelah ini dibuat" kalau ketinggalan
- Sengaja TIDAK memotong jatah balasan, karena jatah itu satuannya "balasan ke
  pelanggan" dan angka pemakaian di Ringkasan memakai satuan yang sama. Remnya
  jarak minimal satu menit antar "Buat ulang", supaya tombol itu tidak jadi
  lubang biaya yang tidak ditagihkan ke siapa pun.

**Janji temu**
- Dua kolom (`Contact.janjiPada`, `janjiCatatan`), **bukan sistem booking**. Tidak
  ada pengecekan bentrok yang mengikat, tidak ada kuota per jam, tidak ada
  kalender. Kalau berlagak sistem booking, orang berhenti mencatat di buku
  mereka sendiri lalu kehilangan janji waktu AI salah dengar.
- Termasuk yang online: meeting Zoom atau Google Meet, video call, demo online
- **AI tidak pernah boleh memastikan.** Dia tidak bisa melihat kalender
  pemiliknya, tidak tahu dia sedang cuti, dan tidak tahu jam itu sudah dipakai di
  luar Palwise. Semua yang dia catat masuk sebagai permintaan
  (`janjiDipastikan: false`), dan prompt melarang kalimat seperti "sudah saya
  booking". Cuma manusia yang menaikkannya jadi pasti.
- Tombol **"Pastikan dan kabari"** mengirim pesan konfirmasi ke pelanggan.
  Pesannya ditulis kode (bukan AI), selalu diperlihatkan dan bisa diubah dulu,
  dan urutannya kirim-dulu-baru-tandai supaya pengiriman yang gagal tidak pernah
  meninggalkan jadwal yang tertulis "sudah dipastikan" tanpa ada pesan yang
  sampai. Ini juga tidak mematikan asisten di obrolan itu.
- Jam yang sudah terisi dikirim ke model **tanpa nama siapa pun**, supaya dia
  tidak menawarkan jam bentrok tanpa bisa membocorkan pelanggan yang satu ke
  pelanggan yang lain
- Bentrok dalam 30 menit ditandai di Ringkasan, dengan catatan jujur bahwa
  Palwise cuma tahu janji yang dicatatnya sendiri
- Pelanggan yang punya janji di depan **tidak ikut disapa otomatis** di jalur
  sapaan biasa. Dia bukan menghilang, dia sedang menunggu hari H.
- **Pengingat otomatis** sebelum janjinya (bawaan 24 jam, bisa diatur). Hanya
  untuk janji yang sudah dipastikan manusia, sekali per janji, dan tidak dikirim
  kalau jamnya sudah lewat. Penandanya menyimpan waktu janjinya (bukan
  "sudah/belum"), jadi janji yang dijadwalkan ulang otomatis terpasang lagi.
  Hari dan jamnya disuapkan ke model dalam bentuk jadi supaya dia tidak
  menghitung tanggal sendiri. Aturannya ada di `perluDiingatkan()`, dipisah
  sebagai fungsi murni karena pekerjaan aslinya butuh koneksi WhatsApp hidup dan
  aturan yang cuma hidup di dalam kueri berarti aturan yang tidak pernah diuji.

**Preset jenis usaha**
- `apps/web/src/lib/preset.ts`: teks awal per bidang usaha (toko, kafe/katering,
  klinik/salon, jasa/servis, properti, kursus) untuk cara bicara, sapaan
  pertama, kondisi eskalasi, dan tiga prompt sapaan otomatis
- **Tidak ada satu pun cabang kode per bidang usaha.** Yang berbeda cuma teks
  awal yang langsung jadi milik pemiliknya begitu dipakai. Menambah bidang baru
  = menambah satu baris di berkas itu.
- Isian yang sudah diisi sendiri tidak pernah ditimpa tanpa konfirmasi

**Ketahanan jawaban**
- Model Gemini 3.x memakai token "berpikir" dari jatah `maxOutputTokens` yang
  sama, jadi jawaban JSON bisa terpotong di tengah. Jatahnya dinaikkan ke 3000
  dan `GEMINI_THINKING=off` jadi bawaan.
- Perbandingan langsung: mematikan berpikir memberi jawaban yang sama persis
  (termasuk menghitung total 4 bungkus dan menerapkan syarat gratis ongkir),
  tapi hemat sekitar 480 token keluaran per balasan. Token keluaran itu yang
  paling mahal, jadi ini menekan biaya beberapa kali lipat.
- Kalau JSON tetap rusak, kalimat balasannya diselamatkan dari teks mentah.
  Kalau tidak ada yang bisa diselamatkan, pelanggan menerima kalimat minta maaf
  dan percakapannya dilempar ke manusia. Pecahan JSON tidak pernah terkirim.
- Gangguan sesaat (kode 5xx, rate limit) dicoba ulang otomatis sampai tiga kali
  dengan jeda menaik. Kehabisan saldo atau jatah harian TIDAK diulang, karena
  hasilnya pasti sama.
- Kalau model utama tetap penuh, panggilan dialihkan ke `GEMINI_FALLBACK_MODEL`.
  Model unggulan Google bisa menjawab 503 berjam-jam, dan tanpa cadangan itu
  berarti seluruh pelangganmu tidak dibalas selama itu.

**Asisten mengirim gambar (halaman Gambar & berkas)**
- Bisnis mengunggah foto produk, daftar harga, QRIS, video, atau PDF, masing-masing
  dengan keterangan **kapan pantas dikirim**
- Daftar itu ditempel ke prompt, dan model memilih sendiri lewat field
  `kirim_berkas`. Tidak ada flow builder yang perlu diatur.
- Kode yang dikarang model dibuang, maksimal 2 berkas per balasan
- Berkas yang sudah dikirim TETAP disebut di prompt, cuma ditandai. Kalau
  disembunyikan, model mengira dirinya tidak bisa mengirim gambar sama sekali dan
  menjawab "maaf saya belum bisa menampilkan foto", yang jelas salah.
- Pengulangan tetap dicegah di kode: berkas yang terkirim dalam 5 pesan terakhir
  ditolak walau model memaksa
- Lewat jalur QR ini tidak ada biaya tambahan per lampiran

**Mengirim gambar vs tahu isinya**
- Dua hal berbeda yang gampang tertukar. Foto daftar harga bisa DIKIRIM tanpa
  asisten TAHU angkanya, jadi dia tetap tidak bisa menjawab "berapa harganya".
- Karena itu form unggah punya centang "Baca juga tulisan di dalam gambarnya"
  (menyala secara bawaan, khusus gambar). Isinya dibaca Gemini lalu jadi
  `KnowledgeSource` bertipe `image` dan ikut dihafal.
- Tautannya `MediaAsset.knowledgeSourceId`. Menghapus gambarnya ikut menghapus
  catatannya, kalau tidak asisten terus menjawab dari harga di gambar yang
  sudah tidak ada.
- Membaca dibatasi 5 MB, mengirim tetap 10 MB. Foto 9,6 MB langsung dari HP
  bikin permintaannya timeout, sementara mengirimnya tidak masalah.

**Ketahanan pesan masuk**
- Pesan dari satu orang diproses berurutan. Kalau dibiarkan berbarengan, kontak dan
  obrolannya bisa terbuat dua kali dan sapaan pembuka terkirim dobel.
- Balasan ditunda 1,8 detik. Orang sering mengetik satu maksud jadi beberapa pesan
  pendek, dan tanpa jeda ini tiap pesan dijawab sendiri-sendiri: tiga balasan dan
  tiga kali potong kuota untuk satu pertanyaan.
- Lampiran tidak dikirim ulang ke model di giliran berikutnya demi hemat token, jadi
  model menulis ringkasan satu kalimat yang disimpan di `Message.mediaSummary` dan
  diputar ulang sebagai riwayat. Tanpa itu asisten lupa isi foto begitu pelanggan
  lanjut mengetik.

**Menjaga hubungan setelah pembelian**
- Dua jalur terpisah dengan hitung mundur dan catatan sendiri: tanya kabar
  (bawaan 3 hari) dan ajak beli lagi (bawaan 30 hari)
- Dipicu saat pelanggan masuk tahap "selesai", dihitung dari `Contact.closedAt`
  yang dicap baik oleh AI maupun oleh tim yang menandai manual
- Sengaja dipisah dari follow-up sebelum beli, supaya jatah sapaan yang satu
  tidak menghabiskan jatah yang lain
- Sebelum ini hubungannya putus di titik penjualan: job follow-up justru
  mengeluarkan siapa pun yang sudah membeli

**Paket gratis dan batas pemakaian**
- Paket "Coba Gratis": 100 balasan per bulan, 1 nomor, tanpa batas waktu.
  Pendaftar baru masuk ke sini, bukan langsung Starter.
- **Ruang coba punya jatah harian sendiri (30/hari) dan TIDAK memotong kuota
  balasan pelanggan.** Dulu ikut memotong, dan untuk pengguna gratis itu fatal:
  jatahnya habis buat menguji, asistennya tidak pernah sempat membuktikan diri.
- Jatah ruang coba habis tidak menghentikan balasan ke pelanggan, dan sebaliknya.
- **Jatah dipesan sebelum AI dipanggil, bukan dipotong sesudahnya.** Kalau dipotong
  belakangan, beberapa pelanggan yang chat pada detik yang sama sama-sama melihat
  "jatah masih ada" lalu semuanya dibalas. Delapan chat barengan di sisa satu jatah
  menghasilkan tujuh balasan kelebihan. Sekarang pengecekan dan pemotongannya satu
  perintah, dan jatahnya dikembalikan kalau AI-nya gagal menjawab.
- Batasnya tepat di angkanya: balasan ke-100 masih terkirim, yang ke-101 berhenti.
- **Kuota habis tidak boleh gagal dalam diam.** Sebelumnya pelanggan chat lalu
  didiamkan dan pemilik toko tidak tahu apa-apa. Sekarang:
  - pelanggan dapat satu pesan "pesannya sudah kami terima, tim akan membalas",
    sekali saja per obrolan
  - pemilik toko diberi tahu lewat WhatsApp-nya sendiri, sekali saat pemakaian
    lewat 80 persen dan sekali saat benar-benar habis
  - dashboard menampilkan pita peringatan, kuning di atas 70 persen dan merah
    saat habis

**Ajak teman**
- **Hadiah cair saat temannya BERLANGGANAN, bukan saat dia mendaftar.** Memberi
  hadiah untuk pendaftaran mengundang akun palsu: satu orang bikin lima email,
  memanen hadiahnya, tidak pernah membayar, dan kamu menanggung biaya AI untuk
  kelimanya.
- Dua sisi sama-sama dapat 1 bulan gratis. Referral satu arah konversinya jauh
  lebih rendah karena yang diajak tidak punya alasan tambahan untuk ikut.
- Kode 6 huruf tanpa I, O, 0, dan 1, supaya tidak salah dengar saat dibacakan.
  Ketikan berantakan dirapikan sendiri, jadi "re-yf qt99" tetap jadi "REYFQT".
- Dikunci `hadiahAjakCair` supaya turun-naik paket tidak bisa memanen berulang.
- Kode sendiri tidak menghasilkan apa pun. Tanpa penjagaan ini workspace yang
  sama ditambah dua kali dalam satu transaksi dan orangnya panen dua bulan.
- Bulan gratisnya ditabung di `Workspace.bulanGratis`, dipotong dari tagihan
  begitu sistem pembayaran terpasang.

**Penugasan asisten ke nomor**
- `Channel.agentId` kosong berarti **sengaja tidak dibalas otomatis**, sesuai janji
  di layar. Dulu kodenya diam-diam jatuh ke asisten pertama, jadi nomor yang
  sengaja dipegang manual tetap dijawab AI dengan persona yang salah.
- Karena kolom kosong sekarang punya arti, menghapus asisten memindahkan
  nomor-nomornya ke asisten lain, bukan mengosongkannya. Kalau dikosongkan,
  menghapus asisten diam-diam membuat nomornya bisu.
- Ruang coba tidak punya channel, jadi di sana tetap dipakai asisten pertama.

**Tombol hapus**
- Semua tindakan yang tidak bisa dibatalkan pakai konfirmasi dua langkah
  (`TombolHapus`), bukan langsung jalan begitu diklik.
- Peringatannya menyebut angka nyata, bukan ancaman samar. Contoh: "Yang ikut
  terhapus permanen: 2 catatan info bisnis dan 1 gambar miliknya."

**Operasional**
- Jam kerja: dalam jam kantor chat dipegang tim, di luar itu AI ambil alih
- Auto follow-up kalau customer diam sekian jam (maks N kali)
- Kuota balasan per paket, reset bulanan otomatis
- Reconnect WhatsApp otomatis dengan backoff

---

## Berkas bisnis

Keputusan dan alasannya, terpisah dari kode, ada di [`bisnis/`](bisnis/):
posisi produk, pelanggan yang cocok, persona beserta keberatannya, harga dan
untung, peta jalan, playbook jualan, dan panduan pasang di VPS langkah demi
langkah.

Satu aturan di folder itu: tidak ada angka karangan. Yang belum diketahui
ditulis BELUM DIUKUR, bukan ditebak.

## Akun bantuan Palwise (memakai produknya sendiri)

```bash
npm run akun:bantuan
```

Menyiapkan akun `bantuan@palwise.id` lengkap dengan asisten bernama Pal, paket
Growth, dan lima catatan info bisnis: harga tiap paket, daftar fitur, cara
memasang, risiko yang harus disampaikan jujur, dan aturan pengembalian dana.
Sesudah itu tinggal masuk ke dashboard lalu scan QR di halaman Nomor WhatsApp.

Tiga hal yang membuatnya aman dijalankan berulang:

- **Harga dan batas diturunkan dari `PLANS`**, bukan diketik ulang. Kalau
  diketik ulang, suatu hari harganya naik di halaman jualan dan asisten bantuan
  masih menyebut angka lama ke calon pembeli.
- **Sandinya tidak diganti** kalau akunnya sudah ada. Menjalankan ulang untuk
  memperbarui info produk tidak boleh mengunci pemiliknya keluar.
- **Catatan lama dibuang** sebelum yang baru ditulis, supaya tidak ada dua
  daftar harga yang saling bertentangan di satu asisten.

Sesudah nomornya tersambung, isi nomor itu ke `IDENTITAS.waBantuan` di
`apps/web/src/lib/identitas.ts`. Tombol "Tanya dulu lewat WhatsApp" di halaman
depan sengaja tidak muncul sebelum itu, karena tombol chat yang tidak ada yang
membalas lebih merusak daripada tidak ada tombolnya.

## Halaman hukum: ADA YANG HARUS KAMU ISI

Halaman privasi, ketentuan, pengembalian dana, dan kontak sudah jadi di
`/privasi`, `/ketentuan`, `/pengembalian`, `/kontak`. Tapi isinya belum bisa
dipakai berjualan sampai kamu mengisi keterangan resminya di
`apps/web/src/lib/identitas.ts`: nama badan usaha, alamat, email, dan nomor
WhatsApp bantuan.

Saya sengaja **tidak** mengarang nama PT, alamat kantor, atau nomor izin. Itu
keterangan hukum yang cuma kamu yang tahu, dan salah tulis di halaman ketentuan
bisa jadi masalah beneran.

Selama masih kosong, halaman-halaman itu menampilkan kotak merah "Halaman ini
belum siap dipakai" beserta daftar apa yang kurang. Kotaknya hilang sendiri
begitu semuanya terisi. Sengaja begitu: halaman hukum yang isinya masih contoh
lebih berbahaya daripada halaman hukum yang belum ada, karena kelihatan seperti
sudah jadi.

Dua hal yang **jangan dihapus** dari halaman-halaman itu:

1. **Penyangkalan Meta.** Palwise memakai WhatsApp lewat perangkat tertaut,
   bukan lewat kerja sama resmi. Ada di kaki tiap halaman, dan wajib tetap ada.
2. **Peringatan nomor bisa diblokir.** Ada di ketentuan nomor 2 dan di tanya
   jawab halaman depan. Itu risiko nyata dan pelanggan berhak tahu sebelum
   membayar, bukan sesudah.

## Tampilan: hitam putih plus satu biru

Dasarnya hitam putih. Permukaan putih, tulisan hitam pekat, abu netral. Lalu
satu warna saja yang boleh muncul: **biru `#1a73e8`** (`brand-600` di Tailwind,
`brand-700` untuk keadaan ditekan).

**Biru cuma untuk hal yang bisa diklik.** Aturan yang harus dipegang:

- **Satu bidang biru besar per layar.** Kalau ada tiga tombol biru sejajar,
  tidak ada yang jadi utama, dan mata membaca warnanya sebagai hiasan bukan
  sebagai ajakan. Halaman Akun sempat punya tiga, lalu dua di antaranya
  dijadikan hitam.
- **Hitam bukan versi "lebih pelan" dari biru.** Hitam di atas putih justru
  paling kontras. Bedanya jenis, bukan keras pelan: biru berarti "ini yang
  menyelesaikan tujuan halaman", hitam berarti "tindakan biasa yang kamu
  lakukan saat butuh". Kelasnya di `globals.css`: `.btn-primary` (biru),
  `.btn-ink` (hitam), `.btn-ghost` (garis luar).
- **Selalu hitam:** angka, uang, judul, ikon, isi kartu, batang kemajuan. Itu
  semua informasi, bukan ajakan, jadi tidak berhak menuntut perhatian.
- Merah `red-600` dan hijau dipakai untuk arti, bukan hiasan: merah kalau ada
  yang berhenti atau menunggu ditangani. Tingkat tengah tidak diberi warna
  sama sekali. Warna yang muncul saat tidak ada yang perlu dikerjakan melatih
  orang mengabaikan merah waktu merahnya benar-benar penting.

**Tulisan huruf kecil biasa.** Tidak ada LABEL HURUF BESAR SEMUA, tidak ada
tanda pisah panjang, tidak ada titik warna sebagai bulatan daftar. Semua itu
bikin tampilan terasa seperti templat.

### Ikon

Digambar sendiri di `apps/web/src/components/Ikon.tsx`, bukan dari paket ikon.
Grid 24, garis 2, ujung dan sambungan bulat, tanpa isian, mewarisi warna teks
lewat `currentColor`.

Yang lama (▤ ◍ ◎ ✦ ▧ ▨ ◈ ▷ ◇ ○) dibuang karena tidak ada satu pun bentuk itu
yang berarti apa-apa buat pemilik toko. Ikon yang tidak dikenali lebih buruk
daripada tanpa ikon: tetap memakan perhatian, tapi tidak membantu mengenali
apa pun.

**Jalur SVG yang salah ketik tetap lolos parser tapi tidak menggambar apa-apa,
tanpa error.** Jadi setiap ikon baru harus dibuktikan benar-benar tergambar,
bukan cuma tidak error. Caranya: render satu per satu di browser, lalu periksa
`getBBox()` tiap bagiannya punya lebar atau tinggi. Cara ini yang menemukan
gagang telepon di ikon WhatsApp cuma 1px dan praktis tidak kelihatan.

### Menu samping dikelompokkan, bukan dipangkas

Sepuluh menu bukan masalahnya. "7 plus minus 2" tidak berlaku di sini, karena
angka itu soal berapa banyak hal yang bisa ditahan di kepala waktu barangnya
**tidak kelihatan**. Menu samping selalu kelihatan, jadi orang memindainya
bukan mengingatnya. Hukum Hick memang berlaku, tapi bentuknya logaritma: dari
tujuh ke sepuluh naiknya kecil sekali.

Yang benar-benar memakan waktu itu daftar rata tanpa kelompok, karena mata
harus menyapu sepuluh-duanya tiap kali. Sekarang tiga kelompok: Setiap hari,
Asisten kamu, Pengaturan. Dua langkah pendek lebih cepat dari satu langkah
panjang.

Urutannya juga bukan kebetulan. Yang paling atas dan paling bawah paling
diperhatikan, yang di tengah paling terabaikan. Dulu Asisten dan Info bisnis
justru duduk persis di tengah, padahal berdua itu yang menentukan pengguna baru
berhasil atau menyerah. Sekarang keduanya jadi kepala kelompok sendiri.

## Arsitektur

```
apps/web       Next.js 15 — dashboard, auth, halaman marketing
apps/worker    Node + Express — koneksi WhatsApp (Baileys), mesin AI, job
packages/db    Prisma + SQLite — skema & definisi paket, dipakai keduanya
```

Worker dipisah karena Baileys butuh proses yang hidup terus — tidak bisa
serverless. Web berbicara ke worker lewat REST dengan `INTERNAL_TOKEN`.

**Provider AI bisa diganti** lewat `AI_PROVIDER` di `.env`
(`gemini` | `openai` | `anthropic`) tanpa mengubah kode. Gemini jadi default
karena hanya dia yang menerima input audio di kelas harga ini.

---

## Uji tanpa biaya API

```bash
npm run selftest
```

Panggilan ke provider AI diganti stub, lalu seluruh pipeline dijalankan apa
adanya: chunking, embedding, retrieval, penyusunan prompt, parsing JSON,
penulisan CRM, aturan tahap pipeline, handoff, percobaan ulang, dan kuota.
54 pemeriksaan, tidak menyentuh API berbayar.

Aturannya: **tiap bug yang ketemu waktu dipakai harus jadi uji baru di sini.**
Yang sudah masuk antara lain jawaban model terpotong di tengah, JSON rusak parah,
LID tersimpan sebagai nomor telepon, tahap pipeline mundur sendiri, dan asisten
lupa isi foto. Semuanya lolos typecheck waktu itu, jadi typecheck saja tidak cukup.

Perintah lain:

```bash
npm run typecheck
```

```bash
npm run db:studio
```

## Kalau asisten tiba-tiba berhenti menjawab

Google rutin menghentikan model lama tanpa pemberitahuan. Waktu itu terjadi,
nama model di `.env` jadi tidak berlaku dan semua balasan gagal. Cek dengan:

```bash
npm run models
```

Perintah itu menampilkan model yang masih hidup untuk API key kamu dan menandai
mana yang sedang dipakai. Kalau ada yang sudah hilang, ganti namanya di `.env`,
lalu buka halaman Info bisnis dan klik "Hafalkan lagi".

Perintah itu tidak cuma membaca daftar model, tapi benar-benar mencoba model
yang ada di `.env` kamu. Itu penting karena Google **menutup model lama untuk
API key yang baru dibuat**: modelnya masih terdaftar, tapi menolak key kamu.
Kalau model chat kamu bermasalah, perintahnya sekalian mencarikan pengganti
yang sudah diuji jalan.

Penyebab kedua yang sering: saldo Google AI habis. Cek di
<https://ai.studio/projects>. Pesan errornya sudah diterjemahkan, jadi yang
muncul di layar bukan JSON mentah.

## Pasang di server

Satu VPS cukup untuk semuanya: dashboard, mesin WhatsApp, database, dan berkas
lampiran. Tidak perlu layanan tambahan.

Ambil VPS di Jakarta atau Singapura. Pemakainya pemilik toko di Indonesia, jadi
dashboardnya terasa jauh lebih enak dibanding server di Eropa. Mulai dari 2 GB
memori. Aplikasinya sendiri terukur sekitar 400 MB tanpa nomor tersambung, dan
tiap nomor WhatsApp menambah lagi, jadi ukur sendiri setelah beberapa pelanggan
masuk sebelum memutuskan naik ukuran.

```bash
npm install && npm run build && npm run db:push && npm run db:seed
```

Jangan jalankan dengan `npm run dev` di server. Pakai PM2 supaya hidup lagi
sendiri kalau crash atau server di-reboot:

```bash
pm2 start ecosystem.config.cjs && pm2 save && pm2 startup
```

HTTPS diurus Caddy, termasuk memperbarui sertifikatnya sendiri. Ganti domain di
`Caddyfile`, arahkan A record ke IP server, lalu:

```bash
caddy run --config Caddyfile
```

### Lupa password & email

Pengguna yang lupa passwordnya bisa minta tautan lewat halaman `/lupa`.

Emailnya dikirim lewat Resend, dipanggil langsung ke alamat webnya tanpa paket
tambahan. Isi `RESEND_API_KEY` di `.env`. Jatah gratisnya 3.000 email per bulan
dan 100 per hari, jauh di atas kebutuhan tautan lupa password.

**Kalau `RESEND_API_KEY` dikosongkan, emailnya tidak dikirim tapi isinya
ditulis ke layar server.** Jadi seluruh alurnya tetap bisa dicoba di laptop
tanpa daftar ke mana-mana. Yang tidak boleh terjadi adalah gagal diam-diam,
jadi ketiadaan kunci selalu dilaporkan ke layar.

Sebelum bisa mengirim ke alamat pelanggan sungguhan, domainnya harus
didaftarkan dulu di <https://resend.com/domains>, lalu `EMAIL_FROM` diganti ke
alamat di domain itu. Selama belum, Resend hanya mau mengirim ke alamat pemilik
akunnya sendiri dan menolak sisanya dengan kode 403.

Empat hal yang menentukan fitur ini aman atau tidak:

1. **Yang disimpan cuma sidik jari tokennya, bukan tokennya.** Token aslinya
   hanya ada di email pemiliknya. Kalau isi database bocor, tidak ada satu pun
   akun yang bisa diambil alih dengan isi bocoran itu.
2. **Jawaban di layar selalu sama**, mau emailnya terdaftar atau tidak. Kalau
   dibedakan, halaman ini berubah jadi alat untuk mengecek email siapa saja
   yang punya akun di sini, satu per satu.
3. **Ganti password mengusir semua sesi lama.** Kolom `sessionVersion` di tabel
   User ikut disimpan di dalam tanda login, dan yang angkanya ketinggalan
   ditolak. Tanpa ini, orang yang sudah terlanjur masuk ke akun korban tetap
   bisa lanjut, padahal justru itu alasan korbannya mengganti password.
4. **Sekali pakai, berlaku 1 jam, maksimal 3 permintaan per jam per akun.**

Semua itu dijaga 15 uji otomatis di `npm run selftest`.

Satu hal yang sengaja tidak dibuat sama: kalau pengirimannya sendiri yang gagal
(salah kunci, Resend mati), layarnya menampilkan pesan gagal, bukan "sudah
dikirim". Itu kesalahan di pihak kita dan bukan tentang alamat emailnya, jadi
memberitahukannya tidak membocorkan apa-apa. Kalau dibiarkan bilang "terkirim",
orangnya menunggu email yang tidak akan pernah datang.

### Halaman Akun & konfirmasi email

`/app/akun` mengurus tiga hal: ganti email, ganti password, dan konfirmasi email.

**Ganti email minta password sekarang.** Tanpa itu, siapa pun yang sempat
memakai laptop orang yang lupa keluar bisa memindahkan akunnya ke alamat
sendiri, dan pemilik aslinya terkunci permanen. Alamat **lama** juga dikabari
setiap penggantian, karena kalau bukan pemiliknya yang mengganti, surat itulah
satu-satunya kesempatan dia mengetahuinya.

**Ganti password melempar perangkat lain, tapi tidak perangkat yang dipakai.**
Kalau ikut terlempar, orang yang baru saja berhasil mengganti password langsung
dilempar ke halaman masuk, dan itu terasa seperti gagal.

**Konfirmasi email sengaja dibuat lunak.** Tidak ada halaman penghadang setelah
daftar. Yang muncul cuma satu garis tipis di atas dashboard, dan orangnya tetap
bisa langsung mencoba semuanya.

Wajibnya cuma di satu tempat: **sebelum pindah ke paket berbayar.** Alasannya,
yang memakai Palwise itu pemilik toko, bukan orang kantoran yang membuka email
tiap jam. Menghadang mereka tepat setelah daftar membuat sebagian tidak pernah
kembali, dan yang kita dapat cuma daftar email bersih milik orang yang batal
jadi pelanggan. Di gerbang paket berbayar beda: dia sudah mencoba, sudah yakin,
dan sebentar lagi ada tagihan yang harus sampai ke alamat itu.

Dua aturan yang menjaganya tetap berarti:

1. **Ganti email mencabut status terkonfirmasi.** Kalau tidak, orang bisa
   mengonfirmasi alamat yang benar sekali, lalu pindah ke alamat asal-asalan dan
   tetap dianggap terbukti.
2. **Tautan menyimpan alamat yang dituju.** Tautan yang dibuat untuk alamat lama
   tidak boleh mengesahkan alamat baru, karena tidak ada yang pernah
   membuktikan alamat baru itu benar.

Tautannya berlaku 24 jam, jauh lebih longgar daripada tautan lupa password yang
cuma 1 jam. Bedanya disengaja: yang satu kunci masuk, yang satu cuma penanda.

Halamannya juga tidak minta login. Orang sering membuka email di HP sementara
dashboardnya terbuka di laptop.

### Dua alamat, satu aplikasi

Halaman jualan dan dashboard dipisah alamatnya:

| Alamat            | Isinya                          |
| ----------------- | ------------------------------- |
| `palwise.id`     | halaman jualan, harga, fitur    |
| `app.palwise.id` | masuk, daftar, dashboard        |

Keduanya dilayani oleh satu proses Next.js yang sama, di porta 3000. Yang
memilah halamannya `apps/web/src/middleware.ts`, berdasarkan alamat yang dibuka
pengunjung. Tidak ada aplikasi kedua, tidak ada database kedua, tidak ada
penataan yang perlu diduakan.

Untuk menyalakannya, isi dua baris di `.env`:

```
NEXT_PUBLIC_SITE_URL=https://palwise.id
NEXT_PUBLIC_APP_URL=https://app.palwise.id
```

Lalu arahkan tiga DNS record ke IP server: `@`, `www`, dan `app`.

Kalau dua baris itu dikosongkan, semuanya jalan di satu alamat seperti biasa.
Itu yang dipakai waktu mengembangkan di laptop.

Dua hal yang perlu diingat:

- **Kedua alamat ini dibaca saat build**, bukan saat aplikasinya jalan. Kalau
  domainnya diganti, jalankan `npm run build` lagi.
- **Tanda login hanya berlaku di `app.palwise.id`.** Akibatnya halaman jualan
  di `palwise.id` selalu menampilkan tombol "Masuk" dan "Coba gratis", bukan
  "Buka dashboard", walaupun kamu sedang login. Ini disengaja: tanda login yang
  berlaku di semua subdomain jangkauannya lebih luas daripada yang dibutuhkan.
  Kalau nanti mau diubah, tempatnya satu baris di `apps/web/src/lib/auth.ts`,
  tambahkan `domain: ".palwise.id"` waktu kue sesinya dibuat.

Cadangan harian, disalin ke luar mesin. Ini yang paling sering dilupakan dan
paling mahal akibatnya:

```bash
0 2 * * * cd /path/ke/palwise && npm run db:backup
```

### Yang harus kamu urus sendiri

VPS memberi mesinnya, bukan ketenangannya:

- **Porta 4000 jangan dibuka ke internet.** Di dalamnya ada lampiran pelanggan
  dan perintah pengelolaan nomor. `Caddyfile` sengaja hanya meneruskan porta
  3000. Tutup 4000 di firewall.
- **Cadangan harus keluar dari mesin itu.** Cadangan yang tersimpan di disk yang
  sama tidak menolong waktu disknya rusak. Salin ke S3, Google Drive, atau
  cukup ke laptopmu.
- **Mesin WhatsApp harus satu proses saja.** Dua proses yang memegang sesi sama
  akan saling ditendang WhatsApp dan nomor pelanggan keluar sendiri. Sudah
  disetel `instances: 1` di PM2, dan aplikasinya juga menolak proses kedua.
- **Kalau worker mati, tidak ada yang memberitahumu.** PM2 menyalakannya lagi,
  tapi pantau sendiri lewat `pm2 logs` atau pasang pemantau uptime.
- **`.env` jangan ikut masuk git.** Isinya kunci AI dan kunci sesi login.

## Database: kapan pindah dan ke mana

Sekarang SQLite. Itu bukan pilihan sementara yang memalukan, dan tidak perlu
diganti sebelum ada alasannya.

**Jangan Firebase.** Firestore itu NoSQL dan Prisma tidak mendukungnya, jadi
setiap query di aplikasi ini harus ditulis ulang. Berminggu-minggu kerja untuk
mendapatkan sesuatu yang tidak dibutuhkan proyek ini. Harganya juga per operasi
baca, sementara kotak masuk di sini menyegarkan tiap beberapa detik.

**Kalau pindah, ke Postgres.** Pilihannya Supabase atau Neon, dua-duanya punya
paket gratis. Perpindahannya benar-benar satu baris:

```
provider = "sqlite"   →   provider = "postgresql"
```

Sudah diuji: skema ini valid sebagai Postgres tanpa perubahan lain sama sekali.
Tidak ada tipe khas SQLite yang dipakai.

**Kapan.** Bukan sekarang. Pindah waktu pelanggan berbayar pertama datang, atau
waktu butuh lebih dari satu mesin. Dua alasan tambahan yang lebih mendesak
daripada databasenya sendiri: lampiran pelanggan sekarang disimpan di disk lokal
dan akan hilang kalau server diganti, dan tidak ada cadangan otomatis di luar
mesin itu. Supabase menyelesaikan keduanya sekaligus karena punya Storage.

**Catatan penting.** Mesin WhatsApp tetap butuh VPS apa pun databasenya, karena
Baileys perlu proses yang hidup terus. Supabase dan Firebase tidak bisa
menjalankan itu. Jadi VPS-nya tetap ada, dan SQLite di VPS itu bertahan jauh
lebih lama daripada yang orang kira.

**Sementara masih SQLite:**
- Mode WAL dan waktu tunggu 5 detik dinyalakan otomatis saat aplikasi dimuat.
  Tanpa itu dashboard dan mesin WhatsApp saling mengunci berkas yang sama, dan
  penulisan bisa gagal tepat saat pelanggan sedang chat. Sudah diuji: tiga
  proses menulis 60 kali berbarengan, 180 berhasil, nol gagal.
- Cadangan: `npm run db:backup`. Memakai `VACUUM INTO`, jadi hasilnya konsisten
  tanpa perlu menghentikan aplikasi. Menyimpan 14 cadangan terakhir.

## Kalau data demo hilang

```bash
npm run db:seed
```

Hati-hati waktu menulis skrip bersih-bersih sekali pakai: `startsWith` di Prisma
diterjemahkan jadi `LIKE`, dan di SQL karakter `_` itu wildcard satu huruf. Jadi
`startsWith: "__"` cocok dengan SEMUA nama minimal dua huruf, bukan hanya yang
diawali dua garis bawah. Penyaring di kode produksi aman karena polanya
`playground:` yang tidak mengandung wildcard.

## Kalau `npm run build` gagal

Build produksi butuh sekitar 3 GB memori. Di laptop 8 GB yang banyak aplikasi
terbuka, prosesnya bisa mati di tengah jalan dan meninggalkan folder `.next`
yang rusak. Gejala lanjutannya aneh-aneh, misalnya `Cannot find module for
page: /_document`. Obatnya:

```bash
rm -rf apps/web/.next && npm run build
```

Batas memorinya sudah dinaikkan lewat `apps/web/build.mjs`. Untuk pemakaian
sehari-hari `npm run dev` tidak butuh ini dan tidak terpengaruh.

---

## Belum ada di MVP ini

Sengaja dipotong supaya MVP-nya benar-benar jalan dulu:

- **Payment gateway.** Ganti paket langsung berlaku tanpa tagihan. Sambungkan
  Midtrans/Xendit sebelum jual.
- **Meta Cloud API.** Field `Channel.type` sudah disiapkan (`whatsapp_cloud`),
  implementasinya belum ada.
- **Instagram, Facebook, live chat web.** Skema sudah multi-channel.
- **Broadcast/blast.** Ini justru yang paling cepat bikin nomor kena blokir di
  jalur QR — jangan dipasang tanpa rate limiting dan opt-in yang benar.
- **Visual flow builder.** Saat ini alur diatur lewat prompt, yang untuk
  kebanyakan kasus lebih fleksibel.
- **Integrasi kalender (Google Calendar dan sejenisnya).** Palwise cuma tahu
  janji yang dia sendiri catat, jadi jadwal yang dibuat lewat telepon atau
  ditulis di buku tidak terlihat olehnya. Pemisah diminta/dipastikan yang
  menahan bahayanya sekarang. Jangan bangun ini sebelum menanyakan ke pengguna
  sungguhan di mana mereka mencatat jadwal, karena belum ada datanya.
- **Parsing PDF.** Untuk sekarang: salin isinya, tempel sebagai teks.

## Kalau nomor WhatsApp keluar sendiri

Penyebab paling sering: **dua proses Palwise memakai sesi yang sama**. WhatsApp
tidak mengizinkannya dan akan menendang salah satunya. Gampang terjadi waktu
ngoprek, misalnya `npm run dev` jalan sambil worker dijalankan manual di
terminal lain.

Sekarang tiap sesi dikunci lewat berkas `dipakai.lock` di foldernya. Proses
kedua ditolak dengan pesan jelas, bukan diam-diam saling menendang. Kunci basi
dari proses yang mati mendadak dideteksi lewat pengecekan PID.

Alasan putus juga dibedakan, karena dulu semuanya diperlakukan sama dan
kredensialnya langsung dihapus:

| Kode | Artinya | Yang dilakukan |
|---|---|---|
| 401 | dikeluarkan lewat menu Perangkat tertaut | hapus sesi, minta scan ulang |
| 440 | sesi diambil alih di tempat lain | sesi disimpan, tunggu perintah pengguna |
| 515 | minta mulai ulang setelah scan QR | sambung ulang langsung, ini normal |
| 403, 411 | ditolak WhatsApp | sesi disimpan, tampilkan penjelasan |
| lainnya | gangguan sesaat | sambung ulang otomatis dengan jeda menaik |

## Soal LID dan nomor telepon

WhatsApp sedang pindah ke LID, alamat acak yang sengaja menyembunyikan nomor
asli. Alamat yang masuk bisa berupa `62812...@s.whatsapp.net` atau
`2080102...@lid`, dan yang kedua BUKAN nomor telepon.

- Nomor asli diambil dari `key.senderPn`, bukan dari alamat pengirim.
- Kalau nomornya tidak bisa diketahui, kolomnya dikosongkan dan ditampilkan
  "nomor disembunyikan WhatsApp". Jangan pernah menampilkan angka LID sebagai
  nomor, itu menyesatkan dan tidak bisa dihubungi.
- Orang yang sama bisa datang lewat dua alamat berbeda. Pencocokan dilakukan
  lewat nomor telepon supaya riwayatnya tidak terpecah jadi dua kontak.

## Risiko yang perlu kamu tahu

**Jalur QR memakai protokol WhatsApp Web, bukan API resmi Meta.** Ini yang
membuat onboarding instan dan biaya per pesan nol, tapi:

- Nomor bisa diblokir kalau dipakai spam atau blast ke kontak dingin.
- Meta bisa mengubah protokolnya sewaktu-waktu.
- Sarankan pelanggan memakai nomor khusus bisnis, bukan nomor pribadi.

Untuk pelanggan besar, sediakan Meta Cloud API sebagai opsi berbayar. Slot
arsitekturnya sudah ada.

---

## Struktur penyimpanan

```
data/palwise.db      database SQLite
data/wa-sessions/    kredensial WhatsApp per channel
data/media/          gambar & voice note dari customer
```

Semuanya di-ignore git. Hapus `data/` untuk mulai dari nol.

Untuk produksi: ganti datasource Prisma ke `postgresql` dan pindahkan
pencarian embedding ke pgvector (lihat catatan di `apps/worker/src/ai/rag.ts`).
#   p a l w i s e A I C R M  
 