import express from "express";
import cors from "cors";

import { env, aiConfigured, periksaTokenInternal } from "./env.js";
import { log } from "./lib/log.js";
import { router } from "./routes.js";
import { describeProviders } from "./ai/provider.js";
import { indexPendingSources } from "./ai/rag.js";
import { lepasSemuaKunci, restoreChannels } from "./wa/manager.js";
import { startFollowUpScheduler } from "./jobs/followup.js";
import { startLanggananScheduler } from "./jobs/langganan.js";

const app = express();

app.use(cors());
app.use(express.json({ limit: "20mb" }));
app.use(router);

app.use((err: any, _req: any, res: any, _next: any) => {
  log.error(err?.message ?? err);
  res.status(500).json({ error: err?.message ?? "Kesalahan tak terduga" });
});

// Sebelum apa pun didengarkan. Kalau tokennya masih bawaan di server, lebih
// baik gagal berisik sekarang daripada terbuka diam-diam berbulan-bulan.
periksaTokenInternal();

const server = app.listen(env.PORT, env.HOST, () => {
  const ai = describeProviders();
  log.ok(`worker jalan di http://${env.HOST}:${env.PORT}`);
  log.info(`AI provider: ${ai.provider} (${ai.model})`);

  if (!aiConfigured()) {
    log.warn(
      "API key AI belum diisi — dashboard tetap jalan, tapi agent belum bisa membalas.",
    );
    log.warn(
      "Isi GEMINI_API_KEY di file .env (gratis: https://aistudio.google.com/apikey), lalu restart.",
    );
  } else {
    // Index knowledge yang tertunda lalu sambungkan ulang WhatsApp.
    indexPendingSources().catch((e) => log.warn(`indexing awal gagal: ${e?.message ?? e}`));
  }

  restoreChannels().catch((e) => log.error(`restore channel gagal: ${e?.message ?? e}`));
  startFollowUpScheduler();

  // Sengaja DI LUAR pemeriksaan aiConfigured di atas. Langganan yang habis harus
  // tetap turun walau kunci AI belum diisi, kalau tidak akun berbayar yang
  // kedaluwarsa akan bertahan selamanya di server yang kunci AI-nya kosong.
  startLanggananScheduler();
});

function shutdown(signal: string) {
  log.info(`${signal} diterima, mematikan worker`);
  lepasSemuaKunci();
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 3000).unref();
}

// Kunci sesi juga harus dilepas kalau prosesnya mati mendadak.
process.on("exit", () => lepasSemuaKunci());

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("unhandledRejection", (reason) => {
  log.error("unhandled rejection:", reason);
});
