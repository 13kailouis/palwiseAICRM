import { workerHealth } from "@/lib/worker";

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

function Pita({ children }: { children: React.ReactNode }) {
  return (
    <div className="border-b border-amber-200 bg-amber-50 px-5 py-2.5 text-sm leading-relaxed text-amber-900 sm:px-6">
      {children}
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
    return (
      <Pita>
        {DI_LAPTOP ? (
          <>
            Mesin Palwise sedang mati, jadi chat belum bisa dibalas otomatis.
            Jalankan <Kode>npm run dev</Kode> dari folder proyek.
          </>
        ) : (
          <>
            Asistenmu sedang tidak bisa membalas otomatis. Ini gangguan di pihak
            kami dan sedang kami tangani, kamu tidak perlu melakukan apa-apa.
            Chat yang masuk tetap tersimpan dan bisa kamu balas sendiri dari
            Chat masuk.
          </>
        )}
      </Pita>
    );
  }

  if (!health.aiConfigured) {
    return (
      <Pita>
        {DI_LAPTOP ? (
          <>
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
          </>
        ) : (
          <>
            Layanan AI-nya sedang belum aktif, jadi asistenmu belum bisa
            menjawab. Ini urusan di pihak kami dan sedang kami bereskan. Chat
            yang masuk tetap tersimpan.
          </>
        )}
      </Pita>
    );
  }

  return null;
}
