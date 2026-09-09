/** Quota regression tests: disposable SQLite workspaces, mocked AI, no WhatsApp sends. */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { ambilJatahTanya, BatasTanyaError, KUOTA_TANYA, periodeTanya, pesanJatahTanya, prisma, selesaikanJatahTanya } from "@palwise/db";
import { batasiKonteksTanya, jalankanTanya } from "../ai/tanya.js";
import { getLlm } from "../ai/provider.js";
import { textMessage } from "../ai/types.js";
import { env } from "../env.js";
import express from "express";
import { router } from "../routes.js";

async function main() {
  assert.ok(process.env.DATABASE_URL?.startsWith("file:"));
  const now = new Date("2026-09-15T03:00:00Z");
  const kemarin = new Date("2026-09-14T03:00:00Z");
  const ids: string[] = [];
  const llm = getLlm(), asli = llm.complete;
  const buat = async (plan = "free", verified = true) => {
    const ws = await prisma.workspace.create({ data: { name: "__uji_kuota_tanya_" + randomUUID(), plan,
      users: { create: { email: randomUUID() + "@example.invalid", name: "Penguji", passwordHash: "unused", role: "owner", emailVerifiedAt: verified ? now : null } },
    } }); ids.push(ws.id); return ws.id;
  };
  const isi = async (workspaceId: string, count: number, createdAt = kemarin, status = "success") => {
    await prisma.pemakaianTanya.createMany({ data: Array.from({ length: count }, () => ({ id: randomUUID(), workspaceId, createdAt, status })) });
  };
  let checks = 0;
  try {
    const waktu = periodeTanya(new Date("2026-09-30T17:00:00Z"));
    assert.equal(waktu.hari.toISOString(), "2026-09-30T17:00:00.000Z");
    assert.equal(waktu.bulan.toISOString(), "2026-09-30T17:00:00.000Z");
    assert.equal(waktu.berikutnya.toISOString(), "2026-10-31T17:00:00.000Z"); checks += 3;
    for (const plan of ["free", "starter", "growth", "pro"] as const) {
      const ws = await buat(plan);
      assert.equal((await ambilJatahTanya(ws, now)).batas, KUOTA_TANYA[plan].bulanan);
      await isi(ws, KUOTA_TANYA[plan].bulanan - 1);
      const outcomes = await Promise.allSettled(Array.from({ length: 8 }, () => pesanJatahTanya(ws, now)));
      assert.equal(outcomes.filter(r => r.status === "fulfilled").length, 1, `${plan}: only final allowance can be reserved`);
      for (const result of outcomes) if (result.status === "rejected") assert.ok(result.reason instanceof BatasTanyaError);
      assert.equal((await ambilJatahTanya(ws, now)).alasan, "bulanan");
      assert.equal((await ambilJatahTanya(ws, new Date("2026-10-01T03:00:00Z"))).terpakai, 0);
      // No relation to sessions, so clearing the entire chat history cannot reset quota.
      const session = await prisma.sesiTanya.create({ data: { workspaceId: ws } });
      await prisma.sesiTanya.delete({ where: { id: session.id } });
      assert.equal((await ambilJatahTanya(ws, now)).sisa, 0); checks += 5;
    }
    const day = await buat();
    await isi(day, 9, new Date(now.getTime() - 120_000));
    const dayId = await pesanJatahTanya(day, now);
    assert.equal((await ambilJatahTanya(day, now)).alasan, "harian");
    assert.equal((await ambilJatahTanya(day, new Date("2026-09-15T17:00:00Z"))).harian.terpakai, 0);
    await selesaikanJatahTanya(dayId, false); await selesaikanJatahTanya(dayId, false);
    assert.equal((await ambilJatahTanya(day, now)).terpakai, 9, "refund is idempotent"); checks += 3;
    const unverified = await buat("free", false);
    await isi(unverified, 5, new Date("2026-07-01T03:00:00Z"));
    assert.equal((await ambilJatahTanya(unverified, now)).alasan, "verifikasi");
    await assert.rejects(pesanJatahTanya(unverified, now), BatasTanyaError);
    await prisma.user.updateMany({ where: { workspaceId: unverified }, data: { emailVerifiedAt: now } });
    assert.equal((await ambilJatahTanya(unverified, now)).batas, 20); checks += 3;
    const change = await buat();
    await isi(change, 20);
    await prisma.workspace.update({ where: { id: change }, data: { plan: "starter", langgananSampai: new Date("2026-10-15T00:00:00Z") } });
    assert.equal((await ambilJatahTanya(change, now)).sisa, 180);
    const upgraded = await pesanJatahTanya(change, now);
    await selesaikanJatahTanya(upgraded, true);
    await selesaikanJatahTanya(upgraded, false);
    assert.equal((await ambilJatahTanya(change, now)).terpakai, 21, "successful request cannot be refunded twice");
    await prisma.workspace.update({ where: { id: change }, data: { langgananSampai: kemarin } });
    assert.equal((await ambilJatahTanya(change, now)).paket, "free");
    assert.equal((await ambilJatahTanya(change, now)).alasan, "bulanan"); checks += 4;
    const burst = await buat();
    const attempts = await Promise.allSettled(Array.from({ length: 8 }, () => pesanJatahTanya(burst, now)));
    assert.equal(attempts.filter(r => r.status === "fulfilled").length, 3);
    for (const r of attempts) if (r.status === "fulfilled") await selesaikanJatahTanya(r.value, false);
    assert.equal((await ambilJatahTanya(burst, now)).terpakai, 0);
    assert.equal((await ambilJatahTanya(burst, now)).alasan, "cepat");
    await isi(burst, 12, new Date(now.getTime() - 120_000), "failed");
    assert.equal((await ambilJatahTanya(burst, now)).alasan, "percobaan"); checks += 4;
    const modelWs = await buat();
    let calls = 0, reserves = 0;
    llm.complete = async input => { calls++; assert.ok(input.maxTokens! <= 1400); return JSON.stringify({ jawab: "Berikut saran untuk bisnis kamu." }); };
    for (const mode of ["pasang", "perintah"] as const) {
      await jalankanTanya({ workspaceId: modelWs, riwayat: [], pesan: "Bantu merencanakan pemasaran toko", mode,
        sebelumModel: async () => { reserves++; await pesanJatahTanya(modelWs, now); } });
    }
    assert.equal(calls, 2); assert.equal(reserves, 2);
    await jalankanTanya({ workspaceId: modelWs, riwayat: [], pesan: "Cek status WhatsApp", sebelumModel: async () => { throw new Error("Should not need AI quota"); } });
    await jalankanTanya({ workspaceId: modelWs, riwayat: [], pesan: "Berapa chat masuk hari ini?", sebelumModel: async () => { throw new Error("Should not need AI quota"); } });
    assert.equal(calls, 2);
    await assert.rejects(jalankanTanya({ workspaceId: modelWs, riwayat: [], pesan: "Buat strategi pemasaran", sebelumModel: async () => { throw new BatasTanyaError(await ambilJatahTanya(day, now)); } }), BatasTanyaError);
    assert.equal(calls, 2, "denial happens before paid provider call"); checks += 4;
    const bounded = batasiKonteksTanya(Array.from({ length: 40 }, (_, i) => textMessage(i % 2 ? "user" : "assistant", `${i}:` + "x".repeat(20_000))));
    assert.ok(bounded.reduce((n, m) => n + m.parts.reduce((v, p) => v + (p.text?.length ?? 0), 0), 0) <= 24_000);
    assert.match(bounded.at(-1)!.parts[0].text!, /^39:/); checks += 2;
    const pinned = textMessage("user", "Permintaan asli yang harus tetap diingat");
    const withPin = batasiKonteksTanya([textMessage("assistant", "Riwayat lama"), pinned, ...Array.from({ length: 6 }, () => textMessage("user", "HASIL ALAT: " + "z".repeat(10000)))], pinned);
    assert.equal(withPin[0].parts[0].text, pinned.parts[0].text);
    assert.ok(withPin.reduce((n, m) => n + m.parts.reduce((v, p) => v + (p.text?.length ?? 0), 0), 0) <= 24000); checks += 2;

    // Exercise the actual authenticated worker route, response status, persistence and refunds.
    const app = express(); app.use(express.json()); app.use(router);
    const server = app.listen(0, "127.0.0.1");
    await new Promise<void>(resolve => server.once("listening", resolve));
    const port = (server.address() as { port: number }).port;
    try {
      const routeWs = await buat();
      const session = await prisma.sesiTanya.create({ data: { workspaceId: routeWs } });
      const request = (pesan: string, workspaceId = routeWs, token = env.INTERNAL_TOKEN) => fetch(`http://127.0.0.1:${port}/tanya`, {
        method: "POST", headers: { "content-type": "application/json", "x-internal-token": token },
        body: JSON.stringify({ workspaceId, sesiId: session.id, pesan }),
      });
      assert.equal((await request("halo", routeWs, "invalid-test-token")).status, 401);
      assert.equal((await request("halo", modelWs)).status, 404);
      assert.equal((await request("x".repeat(2001))).status, 400);
      const previousCalls = calls;
      await isi(routeWs, 20, new Date());
      const denied = await request("Buatkan strategi pemasaran");
      assert.equal(denied.status, 429);
      const denial = await denied.json() as any;
      assert.equal(denial.code, "TANYA_LIMIT"); assert.equal(denial.jatah.alasan, "bulanan");
      assert.equal(calls, previousCalls);
      assert.equal(await prisma.pesanTanya.count({ where: { sesiId: session.id } }), 0);
      const free = await request("Cek status WhatsApp");
      assert.equal(free.status, 200);
      assert.equal(calls, previousCalls);
      assert.equal((await ambilJatahTanya(routeWs)).terpakai, 20);
      await prisma.pemakaianTanya.deleteMany({ where: { workspaceId: routeWs } });
      const success = await request("Bantu merencanakan promosi");
      assert.equal(success.status, 200);
      const answer = await success.json() as any;
      assert.equal(answer.pesan.length, 2); assert.equal(answer.jatah.terpakai, 1);
      llm.complete = async () => { throw new Error("Simulasi AI gagal"); };
      const failed = await request("Coba susun strategi lain");
      assert.equal(failed.status, 500);
      assert.equal((await ambilJatahTanya(routeWs)).terpakai, 1);
      assert.equal(await prisma.pemakaianTanya.count({ where: { workspaceId: routeWs, status: "failed" } }), 1);
      assert.equal(await prisma.pesanTanya.count({ where: { sesiId: session.id } }), 4, "failed request leaves no partial bubble");
      checks += 18;
    } finally { await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); }
    console.log(`${checks} quota checks passed: all four plans, concurrent limits, WIB resets, verification, refunds, deletion, upgrades, expired plans, retry abuse, AI gating, context bounds.`);
  } finally {
    llm.complete = asli;
    await prisma.workspace.deleteMany({ where: { id: { in: ids }, name: { startsWith: "__uji_kuota_tanya_" } } });
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
