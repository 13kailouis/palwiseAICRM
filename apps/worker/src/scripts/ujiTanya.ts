/** Focused regression checks. Uses a disposable local workspace and no AI/WhatsApp calls. */
import assert from "node:assert/strict";
import { mintaSambunganWhatsApp, prisma, sapaanPemasangan, SAPAAN_PASANG } from "@palwise/db";
import { ALAT_PASANG_UJI, jalankanTanya } from "../ai/tanya.js";
import { getLlm } from "../ai/provider.js";
import "../env.js";

async function main() {
  assert.ok(process.env.DATABASE_URL?.startsWith("file:"), "Tests require local SQLite");
  let checks = 0;
  for (const text of [
    "Berikan qrcodenya untuk di scan ke Whatsapp sy",
    "Tampilkan kode QR WhatsApp", "Sambungkan nomor WA saya",
    "Mau tautkan perangkat", "Mana QR-nya?", "minta qr code", "hubungkan whatsapp",
  ]) { assert.equal(mintaSambunganWhatsApp(text), true, text); checks++; }
  for (const text of [
    "Tampilkan QRIS untuk pembayaran", "Kirim kode QR katalog produk",
    "Berapa chat WhatsApp hari ini?", "Ada yang komplen nggak?", "Jualan skincare",
  ]) { assert.equal(mintaSambunganWhatsApp(text), false, text); checks++; }
  const empty = { caraBicara: false, info: false, jumlahInfo: 0, nomor: false };
  assert.equal(sapaanPemasangan(empty), SAPAAN_PASANG); checks++;
  for (const nomor of [false, true]) {
    const greeting = sapaanPemasangan({ caraBicara: true, info: true, jumlahInfo: 2, nomor });
    assert.doesNotMatch(greeting, /jualan apa|skincare|biasanya beli/);
    assert.match(greeting, nomor ? /sudah terpasang/ : /Tampilkan QR/); checks += 2;
  }
  assert.match(sapaanPemasangan({ ...empty, caraBicara: true }), /lengkapi info bisnis/); checks++;
  assert.match(sapaanPemasangan({ ...empty, info: true, jumlahInfo: 1 }), /cara bicara/); checks++;
  assert.ok(ALAT_PASANG_UJI.has("sambungkan_whatsapp")); checks++;
  assert.ok(!ALAT_PASANG_UJI.has("daftar_gambar")); checks++;

  const workspace = await prisma.workspace.create({ data: { name: "__uji_tanya_" + Date.now() } });
  const llm = getLlm();
  const original = llm.complete;
  try {
    const agent = await prisma.agent.create({ data: { workspaceId: workspace.id, name: "Asisten uji", behaviorPrompt: "Layani pelanggan bisnis uji dengan sopan." } });
    await prisma.knowledgeSource.create({ data: { agentId: agent.id, type: "text", title: "Info uji", content: "Buka pukul 09.00 sampai 17.00.", status: "ready" } });
    for (const mode of ["pasang", "perintah"] as const) {
      let calls = 0;
      llm.complete = async (input) => {
        calls++;
        if (mode === "pasang") {
          assert.match(input.system, /STATUS PEMASANGAN SAAT INI/);
          assert.match(input.system, /Cara bicara asisten: SUDAH diisi/);
          assert.match(input.system, /Info bisnis: SUDAH, 1 catatan/);
          assert.match(input.system, /Nomor WhatsApp: BELUM tersambung/);
          assert.match(input.system, /Jangan mengulang pertanyaan jenis usaha/);
        }
        return calls === 1 ? JSON.stringify({ alat: "sambungkan_whatsapp", argumen: {} }) : JSON.stringify({ jawab: "Kartu WhatsApp ada di bawah." });
      };
      const result = await jalankanTanya({ workspaceId: workspace.id, riwayat: [{ peran: "palwise", teks: SAPAAN_PASANG }], pesan: "Bantu menautkan nomor usaha", mode });
      assert.deepEqual(result.alat, ["sambungkan_whatsapp"]);
      assert.equal(result.usul, null);
      assert.equal(calls, 2);
      assert.equal(await prisma.channel.count({ where: { workspaceId: workspace.id } }), 0, "Showing a card must not create or link a channel");
      checks += 4;
    }
  } finally {
    llm.complete = original;
    await prisma.workspace.delete({ where: { id: workspace.id } });
  }
  console.log(`${checks} regression checks passed: setup progress, QR intent, both chat modes, no connection side effects.`);
}
main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
