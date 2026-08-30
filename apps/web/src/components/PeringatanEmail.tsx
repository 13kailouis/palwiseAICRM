import Link from "next/link";
import { InfoTip } from "@/components/InfoTip";

/**
 * Pengingat bahwa email belum dikonfirmasi.
 *
 * Sengaja satu garis tipis, bukan halaman penghadang. Yang memakai Palwise itu
 * pemilik toko, bukan orang kantoran yang membuka email tiap jam. Menghadang
 * mereka tepat setelah daftar membuat sebagian tidak pernah kembali.
 *
 * Sebabnya (kenapa perlu dikonfirmasi) dipindah ke lambang info, bukan lagi
 * kalimat panjang di pita. Di HP, kalimat dua baris di atas tiap halaman itu
 * memakan tinggi layar yang seharusnya jadi isi; yang perlu selalu kelihatan
 * cuma "ada yang belum beres" dan tombolnya.
 */
export function PeringatanEmail({ email }: { email: string }) {
  return (
    <div className="flex items-center gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900 sm:px-6">
      <p className="min-w-0 flex-1 truncate">
        Email <strong>{email}</strong> belum dikonfirmasi.
      </p>
      <InfoTip label="Kenapa perlu dikonfirmasi" judul="Kenapa perlu dikonfirmasi">
        Kalau alamat email kamu salah ketik, kami nggak bisa ngirim tautan
        pemulihan waktu kamu lupa password. Ini satu-satunya jalan kami balikin
        akunmu.
      </InfoTip>
      <Link
        href="/app/akun"
        className="tap-aman shrink-0 rounded-lg border border-amber-300 bg-white/70 px-3 py-1 text-xs font-medium text-amber-900 hover:bg-white"
      >
        Konfirmasi
      </Link>
    </div>
  );
}
