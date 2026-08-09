/**
 * Yang muncul selama halaman berikutnya masih disiapkan di server.
 *
 * Tanpa berkas ini, Next.js menahan layar apa adanya sampai halaman barunya
 * jadi. Halaman lama tetap terpampang, tidak ada yang bergerak, dan tombol
 * yang barusan diklik kelihatan tidak bereaksi. Dua ratus milidetik pun sudah
 * terasa seperti macet kalau tidak ada satu pun tanda bahwa sesuatu sedang
 * terjadi, dan orang biasanya mengeklik lagi, yang malah menambah beban.
 *
 * Bentuknya sengaja meniru susunan halaman dashboard yang sebenarnya: pita
 * judul di atas, lalu deretan kartu. Mata sudah menempati posisinya sebelum
 * isinya datang, jadi pergantiannya terasa seperti terisi, bukan seperti
 * halaman baru yang melompat masuk.
 *
 * Berlaku untuk semua halaman di bawah /app sekaligus.
 */
export default function Loading() {
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">Sedang memuat halaman</span>

      {/* Pita judul, tingginya disamakan dengan PageHeader supaya isinya tidak
          melompat waktu yang asli datang. */}
      <div className="border-b border-ink-200 bg-white px-5 py-4 sm:px-6 sm:py-5">
        <div className="kerangka h-6 w-40" />
        <div className="kerangka mt-2.5 h-4 w-64 max-w-full" />
      </div>

      <div className="space-y-6 p-4 sm:p-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="card p-5">
              <div className="kerangka h-3.5 w-28" />
              <div className="kerangka mt-3 h-7 w-16" />
            </div>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="card-pad lg:col-span-2">
            <div className="kerangka h-4 w-36" />
            <div className="mt-5 space-y-4">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="kerangka h-9 w-9 shrink-0 rounded-full" />
                  <div className="min-w-0 flex-1">
                    <div className="kerangka h-3.5 w-32" />
                    <div className="kerangka mt-2 h-3 w-48 max-w-full" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card-pad">
            <div className="kerangka h-4 w-32" />
            <div className="kerangka mt-4 h-3 w-full" />
            <div className="kerangka mt-2 h-3 w-5/6" />
            <div className="kerangka mt-5 h-9 w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
