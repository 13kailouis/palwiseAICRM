import { requireUser } from "@/lib/auth";
import { callWorker } from "@/lib/worker";
import { combinePages, crawlSite } from "@/lib/scrape";
import { bolehImporSekarang, catatImporSelesai } from "@/lib/penjagaImpor";

export const dynamic = "force-dynamic";
// Penelusuran bisa memakan waktu, jadi jangan dipotong terlalu cepat.
export const maxDuration = 300;

/**
 * Telusuri sebuah website lalu kirim kemajuannya sambil berjalan.
 *
 * Dipakai Server-Sent Events supaya pengguna melihat halaman apa yang sedang
 * dibaca, bukan sekadar lingkaran berputar tanpa keterangan.
 */
export async function POST(req: Request) {
  const user = await requireUser();

  const body = await req.json().catch(() => ({}));
  const url = String(body?.url ?? "").trim();

  const encoder = new TextEncoder();

  // Penandanya di LUAR start(), supaya cancel() di bawah bisa mengubahnya.
  //
  // Waktu orangnya menutup tab atau pindah halaman di tengah jalan, browser
  // memutus sambungannya, tapi kerja di dalam start() tetap berjalan sampai
  // habis: menelusuri sisa halaman, lalu memanggil model untuk merapikan
  // semuanya. Penuh biaya, nol gunanya, dan tidak ada yang tahu karena tidak
  // ada satu pun galat yang muncul.
  let closed = false;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: unknown) => {
        if (closed) return;
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        if (!url) throw new Error("Alamat websitenya belum diisi.");

        // Diperiksa SEBELUM menelusuri, bukan sesudah. Menelusuri dua menit
        // lalu baru bilang catatannya penuh itu membuang pekerjaan orangnya
        // dan uang kita sekaligus.
        const penjaga = await bolehImporSekarang(user.workspaceId);
        if (!penjaga.boleh) throw new Error(penjaga.alasan!);

        const result = await crawlSite(url, send);

        const usable = result.pages.filter((p) => p.text.length > 120);
        if (usable.length === 0) {
          throw new Error(
            "Halamannya hampir tidak ada tulisan yang bisa dibaca. Website yang isinya baru muncul setelah dijalankan di browser memang tidak bisa diambil. Salin tempel manual saja.",
          );
        }


        // Berhenti di sini kalau orangnya sudah pergi.
        //
        // Ini titik paling mahal di seluruh alur: merapikan satu website bisa
        // beberapa panggilan model sekaligus. Menelusuri halaman untuk layar
        // yang sudah ditutup itu sia-sia; MEMBAYAR MODEL untuk layar yang sudah
        // ditutup itu sia-sia dan mahal.
        if (closed) return;

        const raw = combinePages(usable);

        send({
          type: "step",
          text: `Selesai membaca ${usable.length} halaman, sekarang dirapikan`,
        });

        let content = raw;
        let tidied = false;
        let alasanMentah = "";
        let tanpaFakta = false;

        try {
          // Dikirim per halaman supaya worker bisa memadatkannya satu per satu
          // kalau bahannya terlalu banyak untuk sekali rapikan.
          const tidy = await callWorker<{ content: string; gagal?: string[] }>(
            "/summarize-site",
            {
              method: "POST",
              body: {
                sections: usable.map((p) => ({ title: p.title, text: p.text })),
                siteName: result.siteTitle,
              },
              timeoutMs: 300_000,
            },
          );
          if (tidy?.content && tidy.content.trim().length > 50) {
            content = tidy.content.trim();
            tidied = true;

            // Sebagian berhasil, sebagian tidak. Halaman yang terlewat harus
            // disebut namanya, karena isinya diam-diam hilang dari catatan.
            if (tidy.gagal?.length) {
              send({
                type: "step",
                text: `${tidy.gagal.length} halaman terlewat: ${tidy.gagal.join(", ")}`,
              });
            }
          } else {
            alasanMentah = "layanan AI mengembalikan hasil kosong";
          }
        } catch (err) {
          // Perapian gagal bukan alasan membuang hasil telusur. Tampilkan
          // teks mentahnya, biarkan pengguna yang merapikan sendiri. Tapi
          // alasannya ikut dibawa ke layar, bukan cuma ke catatan proses yang
          // langsung tergulung hilang.
          alasanMentah = err instanceof Error ? err.message : "tidak diketahui";
          // Dibedakan dari kegagalan biasa. "Tidak ada fakta" bukan gangguan
          // sesaat yang layak diulang, itu vonis soal websitenya, dan teks
          // mentahnya justru TIDAK layak disimpan karena isinya cuma menu.
          tanpaFakta = /tidak memuat fakta/i.test(alasanMentah);
          send({
            type: "step",
            text: `Gagal dirapikan otomatis (${alasanMentah}). Hasil mentahnya tetap ditampilkan.`,
          });
        }

        // Jedanya dicatat di sini, setelah modelnya benar-benar dipanggil.
        // Penelusuran yang gagal di tengah tidak menghabiskan jatah jeda,
        // karena dia tidak memakan biaya model sama sekali.
        await catatImporSelesai(user.workspaceId);

        send({
          type: "done",
          title: result.siteTitle,
          content,
          tidied,
          alasanMentah,
          tanpaFakta,
          // Panen tipis harus sampai ke layar peninjauan, bukan cuma jadi satu
          // baris catatan proses yang langsung tergulung hilang.
          tipis: result.tipis,
          rataRataHuruf: result.rataRataHuruf,
          pageCount: usable.length,
          rawChars: result.totalChars,
        });
      } catch (err) {
        send({
          type: "error",
          message: err instanceof Error ? err.message : "Gagal mengambil website.",
        });
      } finally {
        closed = true;
        try {
          controller.close();
        } catch {
          // Sudah tertutup karena orangnya pergi duluan. Bukan kegagalan.
        }
      }
    },
    cancel() {
      closed = true;
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
