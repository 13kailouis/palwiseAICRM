import type { Metadata } from "next";
import Link from "next/link";
import { getPlan } from "@palwise/db";
import { HalamanTeks } from "@/components/HalamanTeks";
import { IDENTITAS } from "@/lib/identitas";

export const metadata: Metadata = {
  title: "Kebijakan pengembalian dana Palwise",
  description:
    "Kapan uang langgananmu bisa dikembalikan, dan bagaimana caranya.",
};

export default function PengembalianPage() {
  return (
    <HalamanTeks
      judul="Pengembalian dana"
      ringkas="Kapan uangmu bisa kembali, kapan tidak, dan bagaimana cara memintanya. Tidak ada syarat tersembunyi."
    >
      <h2>Coba dulu, jangan bayar dulu</h2>
      <p>
        Cara terbaik menghindari urusan pengembalian dana adalah tidak perlu
        sampai ke sana. Palwise punya paket gratis dengan{" "}
        {getPlan("free").aiCredits} balasan per bulan, tanpa perlu memasukkan
        data pembayaran apa pun. Nomor WhatsApp bisa disambungkan, asisten bisa
        dicoba dengan pelanggan sungguhan.
      </p>
      <p>
        Pakai itu dulu sampai kamu yakin. Baru bayar kalau memang cocok.
      </p>

      <h2>Jaminan 14 hari</h2>
      <p>
        Kalau kamu baru pertama kali berlangganan berbayar dan ternyata tidak
        cocok, minta uangmu kembali dalam <strong>14 hari</strong> sejak
        pembayaran pertama. Kami kembalikan penuh, tanpa ditanya alasannya
        panjang lebar.
      </p>
      <p>
        Berlaku sekali per akun, untuk langganan pertama saja.
      </p>

      <h2>Bulan berjalan</h2>
      <p>
        Lewat 14 hari itu, langganan berjalan sampai akhir bulan yang sudah
        dibayar. Kalau kamu berhenti di tengah bulan, layanan tetap hidup sampai
        tanggal habisnya, dan bulan berjalan itu tidak dikembalikan sebagian.
      </p>
      <p>Alasannya sederhana: jatah balasanmu memang sudah tersedia sebulan penuh.</p>

      <h2>Kami yang kembalikan tanpa diminta</h2>
      <p>Ada keadaan yang kami anggap kesalahan kami, dan uangmu kembali tanpa perlu kamu tagih:</p>
      <ul>
        <li>
          Layanan mati lebih dari 24 jam berturut-turut karena masalah di pihak
          kami. Kami kembalikan bagian bulan yang tidak bisa kamu pakai.
        </li>
        <li>
          Kamu kena tagih dua kali untuk bulan yang sama.
        </li>
        <li>
          Kami menghentikan akunmu padahal kamu tidak melanggar apa pun. Sisa
          bulan yang sudah dibayar kami kembalikan.
        </li>
      </ul>

      <h2>Yang tidak kami kembalikan</h2>
      <p>Supaya jelas dan tidak jadi kecewa belakangan:</p>
      <ul>
        <li>
          <strong>Nomor WhatsApp kamu diblokir atau dibatasi Meta.</strong> Ini
          keputusan Meta, bukan kami, dan kami tidak punya kendali atasnya.
          Alasannya dijelaskan di{" "}
          <Link href="/ketentuan">syarat dan ketentuan</Link>.
        </li>
        <li>
          <strong>Jawaban asisten kurang memuaskan.</strong> Mutu jawaban sangat
          bergantung pada info bisnis yang kamu masukkan. Kalau hasilnya kurang
          bagus, hubungi kami dulu, biasanya bisa diperbaiki. Itu sebabnya ada
          paket gratis untuk mencoba.
        </li>
        <li>
          <strong>Jatah balasan yang tidak terpakai.</strong> Sisa jatah hangus
          tiap bulan dan tidak diuangkan.
        </li>
        <li>
          <strong>Akun yang dihentikan karena melanggar aturan</strong>, misalnya
          dipakai mengirim spam.
        </li>
        <li>Permintaan yang datang lebih dari 60 hari setelah pembayaran.</li>
      </ul>

      <h2>Cara memintanya</h2>
      <ol className="list-decimal space-y-1.5 pl-5">
        <li>
          Kirim email ke {IDENTITAS.email} dari alamat email yang kamu pakai
          mendaftar.
        </li>
        <li>Sebutkan nama usahamu dan kira-kira kapan kamu membayar.</li>
        <li>
          Kamu tidak perlu menjelaskan panjang lebar. Kalau kamu mau bilang apa
          yang kurang, kami senang, tapi itu bukan syarat.
        </li>
      </ol>
      <p>
        Kami balas dalam <strong>3 hari kerja</strong>. Kalau disetujui, dananya
        dikirim balik lewat jalur yang sama dengan pembayaranmu, biasanya sampai
        dalam 7 sampai 14 hari kerja tergantung banknya.
      </p>

      <h2>Kalau kamu tidak setuju dengan keputusan kami</h2>
      <p>
        Balas saja emailnya dan minta ditinjau ulang. Akan dilihat orang yang
        berbeda. Kalau tetap tidak menemukan titik temu, jalur penyelesaiannya
        ada di <Link href="/ketentuan">syarat dan ketentuan</Link> nomor 11.
      </p>
    </HalamanTeks>
  );
}
