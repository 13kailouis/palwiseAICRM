import type { Metadata } from "next";
import Link from "next/link";
import { HalamanTeks } from "@/components/HalamanTeks";
import { IDENTITAS } from "@/lib/identitas";

export const metadata: Metadata = {
  title: "Syarat dan ketentuan Palwise",
  description:
    "Aturan pemakaian Palwise, termasuk hal yang perlu kamu tahu soal risiko dan tanggung jawab.",
};

export default function KetentuanPage() {
  return (
    <HalamanTeks
      judul="Syarat dan ketentuan"
      ringkas="Dengan mendaftar dan memakai Palwise, kamu setuju dengan aturan di halaman ini. Kami tulis sependek mungkin dan tanpa bahasa yang menyembunyikan sesuatu."
    >
      <h2>1. Apa yang kami sediakan</h2>
      <p>
        Palwise adalah alat yang menyambungkan nomor WhatsApp kamu dengan
        asisten otomatis. Asisten itu membaca info bisnis yang kamu masukkan
        sendiri, lalu menyusun jawaban untuk pelanggan yang chat.
      </p>
      <p>
        Layanan ini disediakan oleh {IDENTITAS.badanUsaha}, beralamat di{" "}
        {IDENTITAS.alamat}.
      </p>

      <h2>2. Yang paling penting kamu tahu sebelum memakai</h2>
      <p>
        Dua hal ini kami taruh di depan, bukan di bagian bawah dengan huruf
        kecil, karena keduanya bisa benar-benar merugikan kamu.
      </p>

      <h3>Jawaban AI bisa salah</h3>
      <p>
        Asisten menyusun jawaban dari info yang kamu masukkan, tapi dia tetap
        mesin dan bisa keliru: salah menyebut harga, salah paham pertanyaan,
        atau menjawab hal yang tidak kamu maksud.{" "}
        <strong>
          Kamu yang bertanggung jawab atas apa yang dikirim asisten ke
          pelangganmu.
        </strong>{" "}
        Kami menyarankan kamu mencobanya dulu di halaman Coba dulu, memeriksa
        chat yang masuk secara berkala, dan menyalakan aturan lempar ke manusia
        untuk hal yang penting seperti pembayaran dan komplain.
      </p>

      <h3>Nomor WhatsApp kamu bisa diblokir Meta</h3>
      <p>
        Palwise menyambung ke WhatsApp lewat fitur perangkat tertaut, cara yang
        sama seperti WhatsApp Web. Palwise{" "}
        <strong>bukan produk resmi WhatsApp dan tidak berafiliasi dengan
        Meta.</strong>{" "}
        Meta punya aturan sendiri soal pemakaian otomatis, dan mereka bisa
        membatasi atau memblokir nomor yang dianggap melanggar, terutama kalau
        dipakai mengirim pesan massal ke orang yang tidak meminta.
      </p>
      <p>
        Risiko itu ada dan tidak bisa kami hilangkan. Yang bisa kami lakukan
        adalah membuat Palwise hanya membalas orang yang chat duluan, bukan
        menyebar pesan. <strong>Kami tidak bisa mengganti kerugian kalau
        nomormu diblokir Meta.</strong> Kalau nomor itu satu-satunya jalur
        usahamu, pikirkan dulu memakai nomor lain yang khusus untuk usaha. Bukan
        nomor yang baru dibeli: nomor baru belum dikenal WhatsApp dan justru
        lebih gampang kena batasan. Pakai nomor yang sudah beberapa hari kamu
        pakai wajar dari HP.
      </p>

      <h2>3. Akun kamu</h2>
      <ul>
        <li>Satu orang atau satu badan usaha, satu akun.</li>
        <li>
          Kamu yang menjaga passwordmu. Kegiatan yang terjadi lewat akunmu
          dianggap dilakukan olehmu.
        </li>
        <li>Umur minimal 17 tahun, atau punya izin dari wali.</li>
        <li>Keterangan yang kamu isi harus benar.</li>
      </ul>

      <h2>4. Yang tidak boleh dilakukan</h2>
      <ul>
        <li>
          Mengirim pesan massal, promosi, atau spam ke orang yang tidak pernah
          chat duluan.
        </li>
        <li>Menipu, berjualan barang terlarang, atau melanggar hukum Indonesia.</li>
        <li>
          Membuat asisten menyamar sebagai orang atau lembaga lain untuk
          menyesatkan.
        </li>
        <li>Mencoba menembus, membebani, atau membongkar sistem kami.</li>
        <li>Menjual ulang akses Palwise tanpa perjanjian tertulis dengan kami.</li>
      </ul>
      <p>
        Kalau ini dilanggar, kami bisa menghentikan akunmu. Untuk pelanggaran
        berat seperti penipuan, penghentiannya bisa langsung tanpa peringatan.
      </p>

      <h2>5. Data pelangganmu</h2>
      <p>
        Chat, nomor, dan nama pelanggan yang masuk ke Palwise tetap milik kamu.
        Kami cuma menyimpankan dan memprosesnya supaya asisten bisa bekerja.
        Rinciannya ada di <Link href="/privasi">kebijakan privasi</Link>.
      </p>
      <p>
        Kamu yang bertanggung jawab memberi tahu pelangganmu bahwa chat mereka
        ditangani sistem otomatis, dan memastikan kamu memang berhak mengumpulkan
        data mereka.
      </p>

      <h2>6. Pembayaran dan paket</h2>
      <ul>
        <li>Berlangganan dihitung per bulan, dibayar di muka.</li>
        <li>
          Tiap paket punya jatah jumlah balasan AI per bulan. Kalau jatahnya
          habis, asisten berhenti membalas sampai bulan berikutnya atau sampai
          paketmu dinaikkan. Sisa jatah tidak dibawa ke bulan berikutnya.
        </li>
        <li>
          Harga bisa berubah. Kalau berubah, kami beritahu paling lambat 30 hari
          sebelum berlaku untukmu, dan kamu bebas berhenti sebelum itu.
        </li>
        <li>Berhenti berlangganan bisa kapan saja, tanpa denda.</li>
      </ul>
      <p>
        Soal pengembalian dana ada di halaman terpisah:{" "}
        <Link href="/pengembalian">kebijakan pengembalian dana</Link>.
      </p>

      <h2>7. Layanan bisa berhenti sementara</h2>
      <p>
        Kami tidak menjanjikan Palwise hidup 100 persen sepanjang waktu. Bisa
        ada perawatan, gangguan di penyedia AI, atau perubahan mendadak dari
        pihak WhatsApp. Kami usahakan pulih secepatnya dan memberi kabar kalau
        gangguannya lama.
      </p>

      <h2>8. Batas tanggung jawab</h2>
      <p>
        Sejauh diizinkan hukum, tanggung jawab kami atas kerugian yang timbul
        dari pemakaian Palwise dibatasi paling banyak sebesar biaya langganan
        yang kamu bayar dalam 3 bulan terakhir.
      </p>
      <p>Kami tidak bertanggung jawab atas:</p>
      <ul>
        <li>Kehilangan penjualan atau keuntungan.</li>
        <li>Akibat dari jawaban asisten yang keliru.</li>
        <li>Nomor WhatsApp yang dibatasi atau diblokir Meta.</li>
        <li>Gangguan yang berasal dari layanan pihak ketiga.</li>
      </ul>
      <p>
        Batasan ini tidak berlaku untuk kerugian yang timbul dari kesengajaan
        atau kelalaian berat kami.
      </p>

      <h2>9. Menghentikan akun</h2>
      <p>
        Kamu bisa berhenti kapan saja. Kami bisa menghentikan akunmu kalau kamu
        melanggar aturan di atas, atau kalau pembayaran menunggak lebih dari 14
        hari. Kalau kami yang menghentikan tanpa kesalahan di pihakmu, sisa
        bulan yang sudah kamu bayar kami kembalikan.
      </p>
      <p>
        Setelah akun berhenti, datamu masih bisa diambil selama 30 hari. Lewat
        itu terhapus.
      </p>

      <h2>10. Perubahan ketentuan</h2>
      <p>
        Kalau ketentuan ini berubah dengan cara yang merugikanmu, kami beritahu
        lewat email 30 hari sebelum berlaku. Kalau kamu tidak setuju, kamu bisa
        berhenti sebelum tanggal itu dan sisa bulan yang sudah dibayar
        dikembalikan.
      </p>

      <h2>11. Hukum yang berlaku</h2>
      <p>
        Ketentuan ini tunduk pada hukum Republik Indonesia. Kalau ada
        perselisihan, kita selesaikan dulu dengan musyawarah. Kalau tidak
        selesai juga, diselesaikan lewat pengadilan negeri di wilayah tempat
        kedudukan {IDENTITAS.badanUsaha}.
      </p>

      <h2>12. Menghubungi kami</h2>
      <p>
        {IDENTITAS.email}
        <br />
        {IDENTITAS.alamat}
      </p>
    </HalamanTeks>
  );
}
