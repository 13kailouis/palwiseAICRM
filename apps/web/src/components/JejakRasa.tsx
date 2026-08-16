import { tampilanRasa } from "@/lib/rasa";

/**
 * Perjalanan perasaan pelanggan sepanjang obrolan.
 *
 * SENGAJA BUKAN GRAFIK. Versi pertama yang terpikir sebuah sparkline — satu
 * batang per pesan, tinggi menurut mood. Itu terlihat pintar dan tidak menjawab
 * pertanyaan siapa pun: pemilik toko tidak ingin tahu bentuk kurvanya, dia ingin
 * tahu APA YANG TERJADI. Empat puluh batang untuk satu obrolan itu pertunjukan
 * data, bukan keterangan.
 *
 * Jadi yang ditampilkan cuma TITIK BALIK — momen bacaannya berubah, dengan
 * alasannya. Hasilnya terbaca sebagai kalimat: masuk hangat, jatuh waktu dengar
 * harga, naik lagi sesudah dikasih pilihan lain. Dan di HP dia tetap terbaca,
 * yang tidak berlaku untuk grafik selebar layar.
 */

interface Titik {
  label: string;
  alasan: string[];
  pada: Date;
}

function jam(d: Date): string {
  return d.toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function JejakRasa({ titik }: { titik: Titik[] }) {
  if (titik.length === 0) {
    return (
      <p className="mt-2 text-xs leading-relaxed text-ink-500">
        Belum ada bacaan. Perjalanan perasaannya muncul di sini begitu pelanggan
        ini chat lagi.
      </p>
    );
  }

  return (
    <ol className="mt-3 space-y-2.5">
      {titik.map((t, i) => {
        const tampil = tampilanRasa(t.label);
        return (
          <li key={i} className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span className="w-[92px] shrink-0 text-[11px] tabular-nums text-ink-400">
              {jam(t.pada)}
            </span>
            {tampil ? (
              <span className={`badge ${tampil.kelas}`}>{tampil.teks}</span>
            ) : (
              <span className="badge bg-ink-100 text-ink-500">biasa</span>
            )}
            {t.alasan.length > 0 && (
              <span className="text-xs leading-relaxed text-ink-500">
                {t.alasan.join(", ")}
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}
