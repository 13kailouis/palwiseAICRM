import Image from "next/image";

/**
 * Lambang Palwise, satu-satunya.
 *
 * Sebelum ini logonya digambar ulang sebagai huruf "P" putih di dalam kotak
 * biru, disalin di delapan berkas. Delapan salinan artinya delapan tempat yang
 * harus diingat waktu logonya berganti, dan yang terlewat baru ketahuan
 * berbulan-bulan kemudian dari orang yang melihat dua logo berbeda di satu
 * produk.
 *
 * Berkasnya dibuat dari aseet/logo.jpg lewat `npm run logo`.
 */
export function Logo({
  ukuran = 32,
  className = "",
}: {
  ukuran?: number;
  className?: string;
}) {
  return (
    <Image
      src="/logo.png"
      alt="Palwise"
      width={ukuran}
      height={ukuran}
      // Logo muncul di layar pertama tiap halaman, jadi jangan ditunda.
      // Menundanya bikin kepala halaman berkedip kosong sepersekian detik.
      priority
      className={className}
    />
  );
}

/** Lambang plus tulisan namanya, bentuk yang paling sering dipakai. */
export function LogoNama({ className = "" }: { className?: string }) {
  return (
    <span className={`flex items-center gap-2 ${className}`}>
      <Logo />
      <span className="text-lg font-semibold tracking-tight text-ink-950">
        Palwise
      </span>
    </span>
  );
}
