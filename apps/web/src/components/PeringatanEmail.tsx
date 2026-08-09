import Link from "next/link";

/**
 * Pengingat bahwa email belum dikonfirmasi.
 *
 * Sengaja cuma satu garis tipis, bukan halaman penghadang. Yang memakai Palwise
 * itu pemilik toko, bukan orang kantoran yang membuka email tiap jam. Menghadang
 * mereka tepat setelah daftar membuat sebagian tidak pernah kembali, dan yang
 * kita dapat cuma daftar email bersih milik orang yang batal jadi pelanggan.
 *
 * Wajibnya baru muncul di satu tempat: sebelum pindah ke paket berbayar. Di
 * situ alamat yang salah mulai betulan merugikan.
 */
export function PeringatanEmail({ email }: { email: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-200 bg-amber-50 px-6 py-2.5 text-sm text-amber-900">
      <p>
        Email <strong>{email}</strong> belum dikonfirmasi. Kalau alamatnya salah
        ketik, kami tidak bisa mengembalikan akunmu waktu kamu lupa password.
      </p>
      <Link href="/app/akun" className="tap-aman btn-ghost shrink-0 px-3 py-1.5 text-xs">
        Konfirmasi sekarang
      </Link>
    </div>
  );
}
