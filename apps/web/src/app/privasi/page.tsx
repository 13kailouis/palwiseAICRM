import type { Metadata } from "next";
import { HalamanTeks } from "@/components/HalamanTeks";
import { IDENTITAS } from "@/lib/identitas";

export const metadata: Metadata = {
  title: "Kebijakan privasi Palwise",
  description:
    "Data apa yang Palwise simpan, siapa yang bisa melihatnya, dan bagaimana cara menghapusnya.",
};

export default function PrivasiPage() {
  return (
    <HalamanTeks
      judul="Kebijakan privasi"
      ringkas="Halaman ini menjelaskan data apa yang kami simpan, kenapa disimpan, siapa yang bisa melihatnya, dan bagaimana kamu menghapusnya. Ditulis supaya bisa dimengerti tanpa bantuan pengacara."
    >
      <p>
        Palwise dipakai untuk membalas chat pelanggan di WhatsApp. Artinya
        sistem ini memegang isi percakapan orang lain, bukan cuma data kamu
        sendiri. Kami memperlakukan itu sebagai titipan.
      </p>

      <h2>Ringkasnya</h2>
      <ul>
        <li>Kami tidak menjual data kamu atau data pelangganmu ke siapa pun.</li>
        <li>Kami tidak memakai isi chat pelangganmu untuk melatih model AI.</li>
        <li>
          Karyawan kami tidak membaca isi chat kamu, kecuali kamu sendiri yang
          meminta bantuan dan mengizinkannya.
        </li>
        <li>Kamu bisa minta seluruh datamu dihapus, kapan saja.</li>
      </ul>

      <h2>Data yang kami simpan</h2>

      <h3>Tentang kamu sebagai pengguna</h3>
      <ul>
        <li>Nama, alamat email, dan nama usaha yang kamu isi waktu mendaftar.</li>
        <li>
          Password kamu disimpan dalam bentuk teracak satu arah. Kami tidak bisa
          membacanya, dan kalau kamu lupa, kami cuma bisa membantu kamu membuat
          yang baru, bukan memberitahu yang lama.
        </li>
        <li>Paket yang kamu pakai dan jumlah balasan yang sudah terpakai.</li>
      </ul>

      <h3>Tentang bisnismu</h3>
      <ul>
        <li>
          Info yang kamu masukkan sendiri: daftar harga, katalog, aturan toko,
          cara asisten harus bicara, gambar produk.
        </li>
        <li>
          Kalau kamu memasukkan alamat website, isi halaman itu kami baca dan
          simpan sebagai bahan jawaban asisten.
        </li>
      </ul>

      <h3>Tentang pelanggan yang chat ke kamu</h3>
      <p>
        Ini bagian yang paling perlu kamu perhatikan, karena datanya bukan
        milikmu maupun milik kami, tapi milik pelangganmu.
      </p>
      <ul>
        <li>Nomor WhatsApp dan nama profil WhatsApp mereka.</li>
        <li>Isi pesan yang mereka kirim dan yang dibalas asisten.</li>
        <li>
          Gambar dan pesan suara yang mereka kirim, beserta hasil pembacaannya
          oleh AI.
        </li>
        <li>
          Nama, email, dan nama usaha yang berhasil dikenali AI dari isi
          obrolan, kalau mereka menyebutkannya sendiri.
        </li>
      </ul>
      <p>
        <strong>
          Kamu yang bertanggung jawab memberi tahu pelangganmu bahwa chat mereka
          dibalas dan disimpan oleh sistem otomatis.
        </strong>{" "}
        Palwise menyediakan alatnya, tapi hubungan dengan pelanggan itu milikmu.
      </p>

      <h3>Yang TIDAK kami simpan</h3>
      <ul>
        <li>
          Nomor kartu, rekening, atau data pembayaran. Pembayaran diproses
          penyedia pembayaran, bukan kami.
        </li>
        <li>
          Isi chat kamu dengan orang lain di WhatsApp. Palwise cuma membaca
          percakapan di nomor yang kamu sambungkan, dan cuma pesan dari
          pelanggan perorangan. Grup dan saluran diabaikan.
        </li>
      </ul>

      <h2>Pihak ketiga yang ikut memproses</h2>
      <p>
        Untuk bisa bekerja, sebagian data harus dikirim ke layanan lain. Ini
        daftar lengkapnya, tidak ada yang disembunyikan:
      </p>
      <ul>
        <li>
          <strong>Google (Gemini)</strong> memproses isi pesan pelanggan supaya
          bisa disusun jawabannya, termasuk membaca gambar dan pesan suara.
          Kami memakainya lewat antarmuka berbayar, yang menurut ketentuan
          Google tidak dipakai untuk melatih model mereka.
        </li>
        <li>
          <strong>Meta (WhatsApp)</strong> adalah jalur pesannya sendiri. Isi
          pesan melewati sistem mereka sebagaimana chat WhatsApp biasa.
        </li>
        <li>
          <strong>Resend</strong> mengirimkan email dari kami ke kamu, seperti
          tautan lupa password. Yang dikirim ke sana cuma alamat email dan isi
          surat itu, tidak ada data pelanggan.
        </li>
        <li>
          <strong>Penyedia server</strong> tempat aplikasi ini berjalan.
        </li>
      </ul>

      <h2>Berapa lama disimpan</h2>
      <ul>
        <li>
          Selama akunmu aktif, riwayat chat dan data pelanggan disimpan supaya
          asisten ingat percakapan sebelumnya.
        </li>
        <li>
          Kalau kamu menghapus akun, seluruh data workspace kamu ikut terhapus,
          termasuk kontak, percakapan, dan gambar yang kamu unggah.
        </li>
        <li>
          Salinan cadangan bisa masih menyimpannya sampai 14 hari setelah itu,
          lalu ikut terhapus dengan sendirinya.
        </li>
      </ul>

      <h2>Hak kamu</h2>
      <p>
        Undang-Undang Nomor 27 Tahun 2022 tentang Pelindungan Data Pribadi
        memberi kamu beberapa hak, dan kami mengikutinya:
      </p>
      <ul>
        <li>Meminta salinan data yang kami simpan tentang kamu.</li>
        <li>Membetulkan data yang salah.</li>
        <li>Meminta datamu dihapus.</li>
        <li>Menarik persetujuan dan berhenti memakai layanan ini.</li>
      </ul>
      <p>
        Kirim permintaannya ke {IDENTITAS.email}. Kami usahakan dijawab dalam 7
        hari kerja.
      </p>
      <p>
        Pelanggan yang chat ke nomormu punya hak yang sama, tapi permintaan
        mereka kamu yang menangani, karena kamu yang mengumpulkan datanya. Kalau
        kamu butuh menghapus satu pelanggan, itu bisa kamu lakukan sendiri dari
        halaman Pelanggan.
      </p>

      <h2>Keamanan</h2>
      <ul>
        <li>Semua lalu lintas ke Palwise memakai HTTPS.</li>
        <li>Password disimpan teracak dengan bcrypt.</li>
        <li>
          Data antar pengguna dipisah. Akun lain tidak bisa membaca chat atau
          pelangganmu.
        </li>
        <li>
          Tidak ada sistem yang bebas risiko. Kalau terjadi kebocoran yang
          menyangkut datamu, kami akan memberitahumu.
        </li>
      </ul>

      <h2>Perubahan</h2>
      <p>
        Kalau kebijakan ini berubah dengan cara yang merugikan kamu, kami
        beritahu lewat email sebelum berlaku. Perubahan kecil seperti perbaikan
        kalimat langsung berlaku, dan tanggal di atas ikut diperbarui.
      </p>

      <h2>Menghubungi kami</h2>
      <p>
        {IDENTITAS.badanUsaha}
        <br />
        {IDENTITAS.alamat}
        <br />
        {IDENTITAS.email}
      </p>
    </HalamanTeks>
  );
}
