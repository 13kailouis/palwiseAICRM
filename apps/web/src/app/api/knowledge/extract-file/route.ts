import { requireUser } from "@/lib/auth";
import { callWorker } from "@/lib/worker";
import { extractFile } from "@/lib/extractFile";
import { bolehImporSekarang, catatImporSelesai } from "@/lib/penjagaImpor";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Baca berkas yang diunggah lalu rapikan isinya, sambil melaporkan kemajuannya.
 *
 * Alurnya sengaja sama dengan tarik dari website: hasilnya selalu ditampilkan
 * dulu untuk diperiksa, tidak pernah langsung masuk ke info bisnis.
 */
export async function POST(req: Request) {
  const user = await requireUser();

  let file: File | null = null;
  try {
    const form = await req.formData();
    const f = form.get("file");
    if (f instanceof File && f.size > 0) file = f;
  } catch {
    // ditangani di bawah
  }

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
        if (!file) throw new Error("Filenya belum dipilih.");

        // Diperiksa SEBELUM berkasnya dibaca dan dirapikan AI. Membaca PDF
        // 15 MB lalu baru bilang catatannya penuh itu membuang pekerjaan
        // orangnya dan uang kita sekaligus.
        const penjaga = await bolehImporSekarang(user.workspaceId);
        if (!penjaga.boleh) throw new Error(penjaga.alasan!);

        const hasil = await extractFile(file, (e) => {
          if (e.type === "step") {
            send({ type: "step", text: e.text });
          } else {
            send({
              type: "page",
              title: e.text,
              url: "",
              chars: e.chars ?? 0,
              ok: e.ok ?? true,
              note: e.note,
            });
          }
        });


        // Berhenti di sini kalau orangnya sudah pergi.
        //
        // Ini titik paling mahal di seluruh alur: merapikan satu website bisa
        // beberapa panggilan model sekaligus. Menelusuri halaman untuk layar
        // yang sudah ditutup itu sia-sia; MEMBAYAR MODEL untuk layar yang sudah
        // ditutup itu sia-sia dan mahal.
        if (closed) return;

        send({
          type: "step",
          text: `Dapat ${hasil.totalChars.toLocaleString("id-ID")} huruf, sekarang dirapikan`,
        });

        let content = hasil.sections.map((s) => s.text).join("\n\n");
        let tidied = false;
        let alasanMentah = "";

        try {
          const tidy = await callWorker<{ content: string; gagal?: string[] }>(
            "/summarize-site",
            {
              method: "POST",
              body: { sections: hasil.sections, siteName: file.name },
              timeoutMs: 300_000,
            },
          );
          if (tidy?.content && tidy.content.trim().length > 50) {
            content = tidy.content.trim();
            tidied = true;
            if (tidy.gagal?.length) {
              send({
                type: "step",
                text: `${tidy.gagal.length} bagian terlewat: ${tidy.gagal.join(", ")}`,
              });
            }
          } else {
            alasanMentah = "layanan AI mengembalikan hasil kosong";
          }
        } catch (err) {
          alasanMentah =
            err instanceof Error ? err.message : "tidak diketahui";
          send({
            type: "step",
            text: `Gagal dirapikan otomatis (${alasanMentah}). Tulisan mentahnya tetap ditampilkan.`,
          });
        }

        // Dicatat setelah modelnya benar-benar dipanggil, bukan di awal.
        await catatImporSelesai(user.workspaceId);

        send({
          type: "done",
          title: file.name.replace(/\.[a-z0-9]+$/i, ""),
          content,
          tidied,
          alasanMentah,
          pageCount: hasil.sections.length,
          rawChars: hasil.totalChars,
        });
      } catch (err) {
        send({
          type: "error",
          message: err instanceof Error ? err.message : "Gagal membaca file.",
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
