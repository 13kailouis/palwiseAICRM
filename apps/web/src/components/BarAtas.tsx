import { Logo } from "@/components/Logo";

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
      {/* Logo sungguhan, bukan huruf "P" di kotak biru.

          Dulu di sini digambar kotak biru berisi "P" sebagai pengganti logo,
          dan hasilnya di HP mereknya kelihatan beda dari sidebar di laptop yang
          memakai lambang aslinya. Satu produk dua logo itu tanda paling cepat
          yang bikin orang ragu ini situs jadi atau belum. Latarnya putih di
          sini, jadi lambang berwarna aslinya tampil benar. */}
      <Logo ukuran={28} className="shrink-0" />
      <div className="min-w-0">
        <p className="truncate text-sm font-medium leading-tight text-ink-950">
          {namaWorkspace}
        </p>
        <p className="text-[11px] leading-tight text-ink-500">Palwise</p>
      </div>
    </header>
  );
}
