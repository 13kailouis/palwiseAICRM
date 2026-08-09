/**
 * Pembungkus "next build" dengan batas memori yang dinaikkan.
 *
 * Di laptop dengan RAM 8 GB, next build sering berhenti karena kehabisan heap
 * saat mengumpulkan data halaman. Menaikkan batasnya lewat NODE_OPTIONS tidak
 * bisa ditulis langsung di package.json karena cara menyetel variabel di
 * Windows dan Linux berbeda, jadi dijalankan dari sini.
 *
 * Letak paket "next" dicari lewat resolver Node, bukan jalur folder, karena di
 * npm workspaces paketnya bisa berada di node_modules root.
 */
import { createRequire } from "node:module";
import { spawn } from "node:child_process";

const require = createRequire(import.meta.url);

let nextBin;
try {
  nextBin = require.resolve("next/dist/bin/next");
} catch {
  console.error('Paket "next" tidak ketemu. Jalankan "npm install" dulu.');
  process.exit(1);
}

const child = spawn(
  process.execPath,
  ["--max-old-space-size=4096", nextBin, "build", ...process.argv.slice(2)],
  { stdio: "inherit" },
);

child.on("exit", (code) => process.exit(code ?? 1));
child.on("error", (err) => {
  console.error(err);
  process.exit(1);
});
