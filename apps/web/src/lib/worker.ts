import "server-only";

/**
 * Alamat mesin WhatsApp.
 *
 * "localhost" SENGAJA diubah jadi 127.0.0.1, dan ini bukan kerapian.
 *
 * Worker mendengarkan di 127.0.0.1 saja, supaya portanya tidak terbuka ke
 * internet waktu dipasang di VPS. Tapi di Windows dan sebagian Linux baru,
 * nama "localhost" diterjemahkan ke ::1 (IPv6) lebih dulu, dan di situ tidak
 * ada yang mendengarkan. Hasilnya sambungan ditolak padahal worker-nya jelas
 * hidup, dan pesannya berbunyi "pastikan npm run dev jalan" ke orang yang
 * npm run dev-nya memang sedang jalan. Sulit sekali ditebak.
 *
 * Jadi nama itu diganti alamatnya langsung. Yang menulis WORKER_URL dengan
 * "localhost" di .env-nya tetap jalan tanpa perlu tahu soal ini.
 */
const BASE = (process.env.WORKER_URL || "http://127.0.0.1:4000").replace(
  "://localhost:",
  "://127.0.0.1:",
);
const TOKEN = process.env.INTERNAL_TOKEN || "palwise-dev-token";

export class WorkerError extends Error {}

/**
 * Panggil worker (proses yang memegang koneksi WhatsApp & AI).
 * Semua mutasi yang butuh runtime lewat sini, bukan langsung ke DB.
 */
export async function callWorker<T = any>(
  path: string,
  init?: { method?: string; body?: unknown; timeoutMs?: number },
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), init?.timeoutMs ?? 90_000);

  try {
    const res = await fetch(`${BASE}${path}`, {
      method: init?.method ?? "GET",
      headers: {
        "content-type": "application/json",
        "x-internal-token": TOKEN,
      },
      body: init?.body ? JSON.stringify(init.body) : undefined,
      signal: controller.signal,
      cache: "no-store",
    });

    const text = await res.text();
    const json = text ? safeParse(text) : {};

    if (!res.ok) {
      throw new WorkerError(json?.error ?? `Worker error ${res.status}`);
    }
    return json as T;
  } catch (err) {
    if (err instanceof WorkerError) throw err;
    if ((err as Error)?.name === "AbortError") {
      throw new WorkerError("Worker tidak merespons (timeout).");
    }
    // Pesan ini SAMPAI KE LAYAR PENGGUNA. Dia muncul sebagai gelembung merah
    // di ruang coba, sebagai galat waktu meringkas obrolan, dan waktu
    // memastikan janji temu.
    //
    // Versi lamanya berbunyi "Pastikan npm run dev jalan" lengkap dengan
    // alamat localhost, dan itu benar cuma di laptop orang yang membangun
    // Palwise. Pemilik salon yang berlangganan tidak punya folder proyek dan
    // tidak pernah membuka terminal; yang dia butuhkan cuma tahu ini bukan
    // salahnya dan tidak ada yang perlu dia lakukan.
    throw new WorkerError(
      process.env.NODE_ENV === "production"
        ? "Mesinnya sedang tidak bisa dihubungi. Ini gangguan di pihak kami, coba lagi sebentar lagi ya."
        : `Tidak bisa menghubungi worker di ${BASE}. Pastikan "npm run dev" jalan.`,
    );
  } finally {
    clearTimeout(timeout);
  }
}

function safeParse(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    return { error: text.slice(0, 300) };
  }
}

export const WORKER_BASE = BASE;

export async function workerHealth() {
  try {
    return await callWorker<{
      ok: boolean;
      aiConfigured: boolean;
      ai: { provider: string; model: string; ready: boolean; supportsAudio: boolean };
    }>("/health", { timeoutMs: 4000 });
  } catch {
    return null;
  }
}
