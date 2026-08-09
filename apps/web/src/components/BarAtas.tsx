/**
 * Kepala halaman khusus HP.
 *
 * Isinya cuma penanda tempat: logo, nama toko, dan halaman yang sedang dibuka.
 * Tidak ada tombol menu di sini, karena menunya sudah ada di bawah tempat
 * jempol sampai. Menaruh tombol yang sama dua kali cuma membuat orang ragu
 * mana yang benar.
 *
 * Sengaja tidak ikut menempel waktu digulir. Layar HP itu pendek, dan bar yang
 * menempel memakan tinggi yang seharusnya jadi isi. Yang perlu selalu
 * terjangkau sudah di bawah.
 */
export function BarAtas({ namaWorkspace }: { namaWorkspace: string }) {
  return (
    <header className="flex items-center gap-2.5 border-b border-ink-200 bg-white px-4 py-3 lg:hidden">
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-brand-600 text-[11px] font-bold text-white">
        P
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium leading-tight text-ink-950">
          {namaWorkspace}
        </p>
        <p className="text-[11px] leading-tight text-ink-500">Palwise</p>
      </div>
    </header>
  );
}
