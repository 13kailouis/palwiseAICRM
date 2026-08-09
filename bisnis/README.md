# Berkas bisnis Palwise

Terpisah dari kode, karena isinya keputusan dan alasan, bukan cara kerja.

| Berkas | Isinya |
|---|---|
| [01-produk-dan-posisi.md](01-produk-dan-posisi.md) | Palwise itu apa, dijual sebagai apa, dan apa yang sengaja tidak dijanjikan |
| [02-icp.md](02-icp.md) | Usaha seperti apa yang paling cocok, dan yang sebaiknya ditolak |
| [03-persona.md](03-persona.md) | Enam orang yang membeli, lengkap dengan keberatan mereka |
| [04-harga-dan-untung.md](04-harga-dan-untung.md) | Harga tiap paket, dari mana angkanya, dan apa yang belum kamu tahu |
| [05-peta-jalan.md](05-peta-jalan.md) | Yang sudah jadi, yang menghalangi pendapatan, dan urutan berikutnya |
| [06-playbook-jualan.md](06-playbook-jualan.md) | Cara menjelaskan, menjawab keberatan, dan kapan menolak |
| [07-pasang-di-vps.md](07-pasang-di-vps.md) | Langkah pasang di server, dari nol sampai jalan |

## Versi PDF, untuk dikirim ke orang

```bash
npm run bisnis:pdf
```

Hasilnya di `bisnis/pdf/`: satu berkas gabungan bersampul dan berdaftar isi
(`Palwise-Berkas-Bisnis.pdf`), plus satu PDF per bagian, karena yang dikirim ke
orang biasanya cuma satu bagian. Calon investor tidak butuh cara pasang di VPS,
dan orang yang membantu memasang tidak perlu tahu marginnya.

Jalankan lagi tiap kali isinya berubah. PDF-nya sengaja dibuat skrip supaya
memperbaruinya cuma satu perintah, karena yang berbahaya bukan PDF basi, tapi
PDF basi yang terlanjur dikirim.

## Aturan berkas di folder ini

**Tidak ada angka karangan.** Semua angka di sini punya asalnya: dari kode
(`packages/db/src/plans.ts`), dari halaman pesaing yang bisa dibuka sendiri, atau
dari keputusan yang memang kamu ambil. Yang belum diketahui ditulis
**BELUM DIUKUR**, bukan ditebak.

Alasannya sama dengan alasan halaman jualan Palwise tidak memuat testimoni
karangan: angka yang kelihatan meyakinkan tapi tidak ada asalnya akan dipakai
untuk mengambil keputusan, dan keputusan di atas angka karangan lebih mahal
daripada tidak punya angka sama sekali.

**Ditulis per 4 Agustus 2026.** Palwise belum punya pelanggan berbayar.
