import { Logo } from "@/components/Logo";

/**
 * Kepala halaman khusus HP.
 *
 * Isinya cuma merek: lambang plus tulisan "Palwise". Satu baris tipis.
 *
 * NAMA BISNIS SENGAJA TIDAK DITAMPILKAN di sini. Dulu barisnya "Wefluence /
 * Palwise" dua baris, dan itu dua kerugian: pemiliknya sudah tahu nama
 * bisnisnya sendiri (jadi tidak menambah info apa pun), dan barisnya bikin
 * bar ini setinggi dua baris yang memakan layar HP yang sudah pendek. Judul
 * halaman yang sedang dibuka juga sudah ada tepat di bawahnya lewat
 * PageHeader, jadi menaruhnya di sini cuma mengulang.
 *
 * Sengaja tidak ikut menempel waktu digulir. Layar HP itu pendek, dan bar yang
 * menempel memakan tinggi yang seharusnya jadi isi. Yang perlu selalu
 * terjangkau sudah di bawah (bar menu).
 *
 * Argumen namaWorkspace tetap diterima supaya pemanggilnya tidak perlu diubah,
 * tapi tidak lagi dipakai.
 */
export function BarAtas({ namaWorkspace: _namaWorkspace }: { namaWorkspace: string }) {
  return (
    <header className="flex items-center gap-2 border-b border-ink-200 bg-white px-4 py-2.5 lg:hidden">
      {/* Logo sungguhan, bukan huruf "P" di kotak biru: latar putih di sini
          jadi lambang berwarna aslinya tampil benar, sama dengan sidebar
          laptop. */}
      <Logo ukuran={26} className="shrink-0" />
      <span className="text-[15px] font-semibold tracking-tight text-ink-950">
        Palwise
      </span>
    </header>
  );
}
