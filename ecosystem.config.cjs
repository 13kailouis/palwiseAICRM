/**
 * Penataan proses untuk server (PM2).
 *
 * Dipakai supaya Palwise hidup lagi sendiri kalau crash atau server di-reboot.
 * Tanpa ini, mesin WhatsApp mati jam 2 pagi dan tidak ada yang tahu sampai
 * pelanggan komplain.
 *
 * Jalankan di server:
 *   pm2 start ecosystem.config.cjs
 *   pm2 save && pm2 startup     (supaya ikut nyala setelah reboot)
 */
module.exports = {
  apps: [
    {
      name: "palwise-web",
      cwd: "./apps/web",
      script: "npm",
      args: "start",
      interpreter: "none",
      instances: 1,
      autorestart: true,
      max_memory_restart: "600M",
      env: { NODE_ENV: "production" },
      error_file: "../../data/log/web-error.log",
      out_file: "../../data/log/web.log",
      time: true,
    },
    {
      name: "palwise-worker",
      cwd: "./apps/worker",
      script: "npm",
      args: "start",
      interpreter: "none",

      // WAJIB satu. Dua proses yang memegang sesi WhatsApp yang sama akan
      // saling ditendang WhatsApp, dan nomor pelanggan keluar sendiri.
      // Kunci sesi di dalam aplikasi menolak proses kedua, tapi jangan
      // diandalkan sebagai satu-satunya penjaga.
      instances: 1,
      exec_mode: "fork",

      autorestart: true,
      // Sengaja tidak dibatasi memori. Restart memutus semua sambungan
      // WhatsApp sekaligus, jadi jangan sampai terjadi otomatis hanya karena
      // pemakaian memori naik sementara.
      env: { NODE_ENV: "production" },
      error_file: "../../data/log/worker-error.log",
      out_file: "../../data/log/worker.log",
      time: true,
    },
  ],
};
