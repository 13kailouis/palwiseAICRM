# Huruf halaman ini

`PlusJakartaSans-latin.woff2` itu Plus Jakarta Sans, huruf buatan Tokotype
(Jakarta), lisensi SIL Open Font License 1.1. Salinan lisensinya ada di
`OFL.txt` di folder yang sama, dan menurut lisensinya dia WAJIB ikut selama
berkas hurufnya ada di sini.

**Berkasnya disimpan di repo, bukan diunduh waktu build.** `next/font/google`
menarik berkasnya dari internet tiap kali `next build` jalan, dan build Palwise
dijalankan di VPS. Satu build yang gagal cuma karena Google Fonts sedang tidak
bisa dihubungi itu kegagalan yang tidak ada hubungannya dengan kode, dan yang
paling susah ditebak orang yang sedang deploy jam dua pagi.

Yang diambil cuma potongan **latin** (27 KB). Bahasa Indonesia tidak memakai
huruf di luar itu. Kalau suatu hari halaman ini memuat huruf Vietnam, Yunani,
atau Sirilik, hurufnya akan jatuh ke huruf bawaan sistem, bukan hilang.

Dipasang di `apps/web/src/app/layout.tsx` lewat `next/font/local`, dan namanya
disimpan di peubah CSS `--font-sans` yang dibaca `tailwind.config.ts`.
