import { workerHealth } from "@/lib/worker";
import { InfoTip } from "@/components/InfoTip";

/**
 * Peringatan kalau mesin Palwise mati atau kunci AI-nya belum diisi.
 *
 * Dipisah jadi komponennya sendiri supaya bisa dibungkus <Suspense> di
 * layout. Alasannya soal kecepatan: isinya berasal dari panggilan HTTP ke
 * worker, dan panggilan itu punya batas tunggu 4 detik. Waktu masih di dalam
 * layout, panggilan tersebut ikut menahan SETIAP perpindahan halaman. Selama
 * worker sehat memang cuma 4 milidetik, tapi begitu worker mati atau sedang
 * sibuk, tiap klik menu jadi menunggu sampai 4 detik untuk sesuatu yang cuma
 * berupa pita peringatan.
 *
 * Sekarang halamannya tampil dulu, peringatannya menyusul begitu jawabannya
 * datang. Yang ditunggu tidak boleh yang paling tidak penting.
 */
/**
 * Kalimat yang dibaca PEMILIK USAHA, bukan yang memasang produknya.
 *
 * Dua pita di bawah dulu menyuruh menjalankan "npm run dev dari folder proyek"
 * dan mengisi GEMINI_API_KEY di file .env. Itu benar di laptop orang yang
 * membangun Palwise, dan tidak masuk akal sama sekali di layar pemilik salon
 * yang berlangganan: dia tidak punya folder proyek, tidak pernah membuka
 * terminal, dan sekarang cuma tahu satu hal, yaitu chatnya tidak dibalas dan
 * dia disuruh melakukan sesuatu yang tidak dia mengerti.
 *
 * Yang berguna buat dia cuma dua: apa yang sedang terjadi, dan apakah dia perlu
 * berbuat sesuatu. Jawabannya untuk kedua pita ini sama, yaitu tidak, karena
 * dua-duanya urusan yang mengelola servernya.
 */
const DI_LAPTOP = process.env.NODE_ENV !== "production";

/**
 * Pita ringkas: satu baris pesan, sisanya (kalau ada) di balik lambang info.
 *
 * Dulu isinya paragraf tiga baris yang di HP menutupi bagian atas tiap halaman.
 * Yang menenangkan ("kamu tidak perlu apa-apa") tetap penting, tapi tidak perlu
 * memakan tinggi layar terus-menerus: dia pindah ke `detail`, yang dibuka waktu
 * orangnya memang mau tahu kenapa.
 */
function Pita({
  children,
  detail,
}: {
  children: React.ReactNode;
  detail?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm leading-relaxed text-amber-900 sm:px-6">
      <p className="min-w-0 flex-1">{children}</p>
      {detail && (
        <InfoTip label="Keterangan" judul="Apa yang terjadi">
          {detail}
        </InfoTip>
      )}
    </div>
  );
}

function Kode({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded bg-amber-100 px-1.5 py-0.5 font-mono text-xs">
      {children}
    </code>
  );
}

export async function PeringatanMesin() {
  const health = await workerHealth();

  if (!health) {
    // Di laptop tetap versi teknis lengkap (yang membacanya orang yang memasang
    // produknya). Di produksi versi ringkas: satu baris menenangkan, sebabnya
    // di balik lambang info.
    return DI_LAPTOP ? (
      <Pita>
        Mesin Palwise sedang mati, jadi chat belum bisa dibalas otomatis.
        Jalankan <Kode>npm run dev</Kode> dari folder proyek.
      </Pita>
    ) : (
      <Pita
        detail={
          // Frasa "kamu tidak perlu melakukan apa-apa" ditulis UTUH dalam satu
          // baris di kode, jangan dipenggal editor: selftest mencarinya persis
          // begitu, dan penggalan baris di tengahnya bikin tes gagal menuduh
          // kode yang sudah benar.
          <>
            Ini gangguan di pihak kami dan sedang kami tangani, kamu tidak perlu melakukan apa-apa. Chat yang masuk tetap tersimpan dan bisa kamu balas sendiri dari Chat masuk.
          </>
        }
      >
        Asisten lagi nggak bisa bales otomatis, tapi chat tetap masuk.
      </Pita>
    );
  }

  if (!health.aiConfigured) {
    return DI_LAPTOP ? (
      <Pita>
        Kunci layanan AI belum diisi, jadi asistenmu belum bisa menjawab.
        Tambahkan <Kode>GEMINI_API_KEY</Kode> di file{" "}
        <code className="font-mono text-xs">.env</code> (gratis di{" "}
        <a
          className="underline"
          href="https://aistudio.google.com/apikey"
          target="_blank"
          rel="noreferrer"
        >
          aistudio.google.com/apikey
        </a>
        ), lalu nyalakan ulang.
      </Pita>
    ) : (
      <Pita
        detail={
          <>
            Ini urusan di pihak kami dan sedang kami bereskan. Chat yang masuk
            tetap tersimpan dan bisa kamu balas sendiri dari Chat masuk.
          </>
        }
      >
        Layanan AI lagi belum aktif, jadi asisten belum bisa jawab.
      </Pita>
    );
  }

  return null;
}
