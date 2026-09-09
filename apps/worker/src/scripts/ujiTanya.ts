/** Focused regression checks. Uses a disposable local workspace and no AI/WhatsApp calls. */
import assert from "node:assert/strict";
import { awalHariWib, muatPusatBisnis, bacaHasilTanya, mintaSambunganWhatsApp, muatIdeTanya, prisma, sapaanPemasangan, SAPAAN_PASANG, tanyaStatusWhatsApp } from "@palwise/db";
import { bacaUsul, ALAT, ALAT_PASANG_UJI, jalankanTanya, muatRiwayatTanya, rentangWaktu } from "../ai/tanya.js";
import { permintaanAnalisis, hasilDijanjikanTanpaIsi, janjiPemeriksaan, rentangHitunganLangsung, tahapYangDiminta } from "../ai/tanyaBacaan.js";
import { koneksiTanya } from "../ai/tanyaKoneksi.js";
import { getLlm } from "../ai/provider.js";
import "../env.js";

async function main() {
  assert.ok(process.env.DATABASE_URL?.startsWith("file:"), "Tests require local SQLite");
  let checks = 0;
  assert.equal(rentangWaktu("hari-ini", new Date("2026-09-08T18:30:00Z")).dari.toISOString(), "2026-09-08T17:00:00.000Z");
  assert.equal(rentangWaktu("kemarin", new Date("2026-09-08T18:30:00Z")).sampai.toISOString(), "2026-09-08T17:00:00.000Z"); checks += 2;
  for (const teks of ["Apa whatsapp sy sudah tersambung?", "WA saya masih aktif?", "Kenapa WhatsApp terputus?", "Cek status WhatsApp"]) {
    assert.equal(tanyaStatusWhatsApp(teks), true, teks);
    assert.equal(mintaSambunganWhatsApp(teks), false, teks); checks += 2;
  }
  assert.equal(rentangHitunganLangsung("berapa chat masuk hari ini?"), "hari-ini");
  assert.equal(rentangHitunganLangsung("Kemarin ada berapa pesan masuk?"), "kemarin");
  assert.equal(rentangHitunganLangsung("Berapa chat masuk dari Maya hari ini?"), null); checks += 3;
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

  for (const teks of ["Ini drafnya.", "Berikut daftarnya.", "Drafnya sudah siap.", "Ini draf yang lebih santai untuk Maya."]) {
    assert.equal(hasilDijanjikanTanpaIsi(teks), true); checks++;
  }
  assert.equal(hasilDijanjikanTanpaIsi("Ini drafnya:\nHalo Maya, apa kabar? Semoga harimu menyenangkan ya."), false); checks++;
  assert.equal(janjiPemeriksaan("Akan saya siapkan draf pesannya."), true); checks++;
  const workspace = await prisma.workspace.create({ data: { name: "__uji_tanya_" + Date.now() } });
  const tetangga = await prisma.workspace.create({ data: { name: "__uji_tanya_tetangga_" + Date.now() } });
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

    for (const teks of ["Cek siapa saja yg tertarik", "Cek siapa saja pelanggan yang tertarik", "Berapa pelanggan tertarik?"]) {
      assert.equal(tahapYangDiminta(teks), "tertarik"); checks++;
    }
    for (const teks of ["Cek pelanggan tertarik kemarin", "Kirim pesan ke pelanggan tertarik", "Siapa yang belum tertarik?", "Lihat info baru", "Bandingkan pelanggan baru dan tertarik", "Kenapa pelanggan tertarik?", "Cek pelanggan tertarik bernama Budi"]) {
      assert.equal(tahapYangDiminta(teks), null, teks); checks++;
    }
    const kanal = await prisma.channel.create({ data: { workspaceId: workspace.id, name: "Nomor uji", autoStart: false } });
    const kanalLain = await prisma.channel.create({ data: { workspaceId: workspace.id, name: "Nomor kedua", autoStart: false } });
    assert.match((await koneksiTanya(tetangga.id, () => "connected")).catatan, /belum ditautkan/);
    assert.match((await koneksiTanya(workspace.id, () => null)).catatan, /sedang terputus/);
    assert.equal((await koneksiTanya(workspace.id, () => "connected")).catatan, "");
    assert.match((await koneksiTanya(workspace.id, id => id === kanal.id ? "connected" : null)).catatan, /1 dari 2/); checks += 4;
    await prisma.channel.update({ where: { id: kanal.id }, data: { status: "connected" } });
    llm.complete = async () => { throw new Error("Count/status lookups must be grounded without asking the model"); };
    const nol = await jalankanTanya({ workspaceId: workspace.id, riwayat: [], pesan: "berapa chat masuk hari ini?" });
    assert.match(nol.teks, /terputus/);
    assert.match(nol.hasilBaca[0].isi, /Pesan masuk: 0/);
    assert.match(nol.hasilBaca[0].isi, /belum tersinkron/);
    assert.doesNotMatch(nol.teks, /Belum ada chat/);
    const status = await jalankanTanya({ workspaceId: workspace.id, riwayat: [{ peran: "palwise", teks: "WhatsApp sudah tersambung." }], pesan: "Apa WhatsApp sy masih tersambung?" });
    assert.match(status.teks, /terputus/);
    assert.deepEqual(status.alat, ["status_whatsapp"]); checks += 6;
    const tertarik = await prisma.contact.create({ data: { workspaceId: workspace.id, waJid: "uji-minat@s.whatsapp.net", name: "Maya Uji", phone: "628000001", stage: "tertarik" } });
    const menunggu = await prisma.contact.create({ data: { workspaceId: workspace.id, waJid: "uji-nunggu@s.whatsapp.net", name: "Budi Uji", phone: "628000002", stage: "baru" } });
    await prisma.contact.create({ data: { workspaceId: workspace.id, waJid: "playground:uji-daftar", name: "Kontak Coba", stage: "tertarik" } });
    await prisma.contact.create({ data: { workspaceId: tetangga.id, waJid: "uji-tetangga@s.whatsapp.net", name: "Kontak Tetangga", stage: "tertarik" } });
    await prisma.conversation.create({ data: { workspaceId: workspace.id, channelId: kanal.id, contactId: tertarik.id, messages: { create: { role: "customer", content: "Saya butuh sepatu ukuran 39 untuk hari Jumat." } } } });
    // Same person on two channels is one customer, but every incoming message counts.
    const percakapanLain = await prisma.conversation.create({ data: { workspaceId: workspace.id, channelId: kanalLain.id, contactId: tertarik.id, messages: { create: { role: "customer", content: "Pesan kedua untuk pengujian." } } } });
    const hitung = await ALAT.find(a => a.nama === "hitung_obrolan")!.jalankan({ workspaceId: workspace.id, agentId: agent.id }, {});
    assert.match(hitung, /Pesan masuk: 2/); assert.match(hitung, /Pelanggan yang chat: 1/); assert.match(hitung, /WIB/); checks += 3;
    await prisma.conversation.delete({ where: { id: percakapanLain.id } });
    await prisma.conversation.create({ data: { workspaceId: workspace.id, channelId: kanal.id, contactId: menunggu.id, needsHuman: true, handoffReason: "Minta bantuan memilih ukuran", handoffAt: new Date() } });
    llm.complete = async () => { throw new Error("A clear CRM stage lookup must not ask the model to choose its data source"); };
    const minat = await jalankanTanya({ workspaceId: workspace.id, riwayat: [], pesan: "Cek siapa saja yg tertarik" });
    assert.deepEqual(minat.alat, ["daftar_pelanggan"]);
    assert.match(minat.teks, /1 pelanggan/);
    assert.match(minat.hasilBaca[0].isi, /Maya Uji/);
    assert.doesNotMatch(minat.hasilBaca[0].isi, /Budi Uji|Kontak Coba|Kontak Tetangga|\(id:/);
    assert.equal(minat.usul, null); checks += 5;
    const mana = await jalankanTanya({ workspaceId: workspace.id, riwayat: [{ peran: "pemilik", teks: "Cek siapa saja yg tertarik" }, { peran: "palwise", teks: "Ini daftar yang menunggu balasan" }], pesan: "Mana?" });
    assert.deepEqual(mana.hasilBaca, minat.hasilBaca); checks++;
    assert.ok(janjiPemeriksaan("Kita mulai dengan cek kondisi saat ini ya, saya lihat dulu data pelanggan yang sudah tertarik."));
    assert.ok(!janjiPemeriksaan("Mau saya cek pelanggan tertarik?"));
    assert.ok(!janjiPemeriksaan("Saya sudah memeriksa data pelanggan.")); checks += 3;
    let janjiCalls = 0;
    llm.complete = async () => {
      janjiCalls++;
      if (janjiCalls === 1) return JSON.stringify({ jawab: "Saya bisa bantu. Saya lihat dulu data pelanggan yang sudah tertarik." });
      if (janjiCalls === 2) return JSON.stringify({ alat: "daftar_pelanggan", argumen: { tahap: "tertarik" } });
      return JSON.stringify({ jawab: "Maya tertarik sepatu. Mulai dengan follow up sesuai kebutuhannya." });
    };
    const lanjut = await jalankanTanya({ workspaceId: workspace.id, riwayat: [], pesan: "Gimana caranya meningkatkan banyak pelanggan, apa kamu bisa?" });
    assert.equal(janjiCalls, 3); assert.match(lanjut.hasilBaca.find(h => h.alat === "daftar_pelanggan")!.isi, /Maya Uji/); assert.match(lanjut.teks, /follow up/); checks += 3;
    llm.complete = async () => JSON.stringify({ jawab: "Sebentar saya cek dulu datanya." });
    const macet = await jalankanTanya({ workspaceId: workspace.id, riwayat: [], pesan: "Bantu periksa bisnis saya" });
    assert.match(macet.teks, /belum berhasil dijalankan/); assert.ok(!janjiPemeriksaan(macet.teks)); checks += 2;
    const kosong = await jalankanTanya({ workspaceId: workspace.id, riwayat: [], pesan: "Cek pelanggan negosiasi" });
    assert.match(kosong.hasilBaca[0].isi, /Belum ada pelanggan/); checks++;
    const ide = await muatIdeTanya(workspace.id);
    assert.ok(ide.ide.some(i => i.judul === "1 pelanggan tertarik"));
    assert.ok(ide.ide.some(i => i.judul === "Follow up Maya Uji" && i.pesan.includes(tertarik.phone!) && i.pesan.includes("obrolan terakhir")));
    assert.ok(ide.ide.some(i => i.judul === "Bantu balas Budi Uji"));
    assert.doesNotMatch(JSON.stringify(ide), /Kontak Coba|Kontak Tetangga/);
    assert.ok((await muatIdeTanya(tetangga.id)).ide.every(i => !/Maya|Budi/.test(i.pesan))); checks += 5;

    const sesi = await prisma.sesiTanya.create({ data: { workspaceId: workspace.id } });
    for (let i = 0; i < 45; i++) await prisma.pesanTanya.create({ data: { sesiId: sesi.id, peran: "pemilik", teks: i === 44 ? "Cek siapa saja yg tertarik" : `Obrolan lama ${i}`, createdAt: new Date(Date.now() - (46-i)*1000) } });
    await prisma.pesanTanya.create({ data: { sesiId: sesi.id, peran: "palwise", teks: minat.teks, hasilBaca: JSON.stringify(minat.hasilBaca) } });
    const riwayat = await muatRiwayatTanya(sesi.id, workspace.id);
    assert.equal(riwayat.length, 40);
    assert.equal(riwayat.at(-2)?.teks, "Cek siapa saja yg tertarik");
    assert.deepEqual(riwayat.at(-1)?.hasilBaca, minat.hasilBaca);
    assert.deepEqual(await muatRiwayatTanya(sesi.id, tetangga.id), []);
    assert.deepEqual(bacaHasilTanya("rusak"), []);
    assert.deepEqual(bacaHasilTanya('[{"isi":"tidak lengkap"}]'), []); checks += 6;
    assert.match((await jalankanTanya({ workspaceId: workspace.id, riwayat, pesan: "Mana?" })).hasilBaca[0].isi, /Maya Uji/); checks++;

    // A vague model answer, invalid JSON, or model outage must not erase a successful read.
    for (const akhir of ["vague", "invalid", "offline"]) {
      let calls = 0;
      llm.complete = async () => {
        if (++calls === 1) return JSON.stringify({ alat: "daftar_nunggu", argumen: {} });
        if (akhir === "offline") throw new Error("Test provider offline");
        return akhir === "invalid" ? "not json" : JSON.stringify({ jawab: "Ini daftarnya." });
      };
      const hasil = await jalankanTanya({ workspaceId: workspace.id, riwayat: [], pesan: "Siapa yang perlu dibalas tim?" });
      assert.match(hasil.hasilBaca[0].isi, /Budi Uji/);
      assert.equal(hasil.hasilBaca[0].gagal, false); checks += 2;
    }
    const alat = ALAT.find(a => a.nama === "daftar_nunggu")!;
    const bacaAsli = alat.jalankan;
    try {
      alat.jalankan = async () => { throw new Error("Test database offline"); };
      let calls = 0;
      llm.complete = async () => ++calls === 1 ? JSON.stringify({ alat: "daftar_nunggu" }) : JSON.stringify({ jawab: "Belum bisa dibaca." });
      const gagal = await jalankanTanya({ workspaceId: workspace.id, riwayat: [], pesan: "Cek obrolan yang perlu tim" });
      assert.equal(gagal.hasilBaca[0].gagal, true);
      assert.doesNotMatch(gagal.hasilBaca[0].isi, /tidak ada pelanggan/i); checks += 2;
    } finally { alat.jalankan = bacaAsli; }
    let draftCalls = 0;
    llm.complete = async input => {
      draftCalls++;
      if (draftCalls === 2) assert.match(JSON.stringify(input.messages), /sepatu ukuran 39 untuk hari Jumat/);
      return JSON.stringify({ jawab: "Draf untuk Maya.", usul: { jenis: "kirim_pesan", kontakId: tertarik.id, teks: draftCalls === 1 ? "Halo pelanggan, ada yang dibantu?" : "Halo Maya, mau lanjut pilihan sepatu ukuran 39 untuk hari Jumat?" } });
    };
    const draf = await jalankanTanya({ workspaceId: workspace.id, riwayat: [], pesan: "Siapkan draf follow up untuk Maya" });
    assert.equal(draftCalls, 2);
    assert.equal(draf.usul?.jenis, "kirim_pesan");
    assert.ok(draf.usul && "teks" in draf.usul && draf.usul.teks.includes("ukuran 39"));
    assert.ok(draf.alat.includes("lihat_kontak"));
    assert.equal(await prisma.message.count({ where: { conversation: { workspaceId: workspace.id }, role: { in: ["ai", "human"] } } }), 0); checks += 5;
    // Revisions must carry the actual saved draft, then return a new complete proposal.
    await prisma.pesanTanya.create({ data: { sesiId: sesi.id, peran: "palwise", teks: "Ini drafnya.", usul: JSON.stringify(draf.usul), usulStatus: "menunggu" } });
    const riwayatDraf = await muatRiwayatTanya(sesi.id, workspace.id);
    assert.equal(riwayatDraf.at(-1)?.usul?.kontakId, tertarik.id); checks++;
    for (const revisi of ["Jngn gitu, untuk relationship", "Mna", "Lebih santai dong"]) {
      let calls = 0;
      llm.complete = async input => {
        calls++;
        assert.match(JSON.stringify(input.messages), /ukuran 39/);
        assert.match(JSON.stringify(input.messages), new RegExp(tertarik.id));
        if (calls === 1) return JSON.stringify({ jawab: "Ini draf buat Maya untuk menjaga hubungan baik, Kak." });
        return JSON.stringify({ jawab: "Ini draf yang lebih santai.", usul: { jenis: "kirim_pesan", kontakId: tertarik.id, teks: "Halo Maya, apa kabar? Semoga harimu menyenangkan ya." } });
      };
      const hasil = await jalankanTanya({ workspaceId: workspace.id, riwayat: riwayatDraf, pesan: revisi });
      assert.equal(calls, 3); assert.equal(hasil.usul?.jenis, "kirim_pesan");
      assert.ok(hasil.usul && "teks" in hasil.usul && hasil.usul.teks.includes("apa kabar"));
      assert.ok(hasil.alat.includes("lihat_kontak")); checks += 4;
    }

    // A new strategy request must not inherit an earlier recipient or proposal.
    for (const pesan of ["gimana caranya ningkatin banyak pelanggan apa kmu bisa", "Susun prioritas kerja hari ini. Jangan buat draf pesan dulu.", "Analisis peluang follow up. Jangan buat atau kirim pesan dulu."]) {
      assert.equal(permintaanAnalisis(pesan), true, pesan); checks++;
      let calls = 0;
      llm.complete = async input => {
        calls++;
        assert.match(input.system, /TUGAS SAAT INI: analisis/);
        assert.doesNotMatch(JSON.stringify(input.messages.slice(0, -2)), /USUL YANG/);
        return calls === 1 ? JSON.stringify({jawab: "Ini draf untuk Maya.", usul: {jenis:"kirim_pesan", kontakId:tertarik.id, teks:"Halo Maya"}}) : JSON.stringify({jawab:"Fokus pada kebutuhan pelanggan. Coba satu penawaran yang relevan, lalu catat berapa pelanggan baru yang menghubungi tiap minggu."});
      };
      const hasil = await jalankanTanya({workspaceId:workspace.id, riwayat:riwayatDraf, pesan});
      assert.equal(hasil.usul,null); assert.equal(calls,2); assert.ok(hasil.alat.includes("ringkasan_bisnis")); assert.doesNotMatch(hasil.teks,/Maya|draf/); checks += 4;
    }
    assert.equal(permintaanAnalisis("Buat draf pesan untuk strategi follow up Maya"),false); checks++;
    assert.equal(awalHariWib(new Date("2026-09-10T18:00:00Z")).toISOString(),"2026-09-10T17:00:00.000Z"); checks++;
    const laporan = await muatPusatBisnis(workspace.id);
    assert.equal(laporan.kini.pesan,1); assert.equal(laporan.kini.aktif,1);
    assert.equal(laporan.tahap.reduce((n,t)=>n+t.jumlah,0),2);
    assert.equal(laporan.jumlahPrioritas,1); assert.equal(laporan.prioritas[0].nama,"Budi Uji"); checks += 5;
    // A section at the end of a long imported website must remain editable without a full rewrite.
    const konten = "BAGIAN LAIN\n" + "Informasi produk yang harus tetap utuh.\n".repeat(400) + "\nKONTAK\nEmail: support@example.test\nAKHIR\n";
    const cat = await prisma.knowledgeSource.create({data:{agentId:agent.id,type:"website",title:"Situs bisnis",content:konten,status:"ready"}});
    const ctx = {workspaceId:workspace.id,agentId:agent.id};
    const baca = await ALAT.find(a=>a.nama === "lihat_info")!.jalankan(ctx,{catatanId:cat.id,bagian:"KONTAK"});
    assert.match(baca,/support@example.test/); checks++;
    for (const ganti of ["Email: support@example.test\nEmail lain: halo@example.test, partnership@example.test", "Email: baru@example.test", ""]) {
      const usul = await bacaUsul(ctx,{jenis:"ubah_bagian_info",catatanId:cat.id,cari:"Email: support@example.test",ganti},"perintah");
      assert.equal(usul?.jenis,"ubah_info");
      assert.ok(usul && "isi" in usul && usul.isi === konten.replace("Email: support@example.test",ganti)); checks += 2;
    }
    for (const cari of ["teks tidak ada", "Informasi produk", ""]) {
      assert.equal(await bacaUsul(ctx,{jenis:"ubah_bagian_info",catatanId:cat.id,cari,ganti:"Baru"},"perintah"),null); checks++;
    }
    assert.equal(await bacaUsul({workspaceId:tetangga.id,agentId:null},{jenis:"ubah_bagian_info",catatanId:cat.id,cari:"Email: support@example.test",ganti:"Email: asing@example.test"},"perintah"),null); checks++;
    let editCalls = 0;
    llm.complete = async () => ++editCalls === 1 ? JSON.stringify({alat:"lihat_info",argumen:{catatanId:cat.id,bagian:"KONTAK"}}) : JSON.stringify({jawab:"Dua email ditambahkan pada bagian Kontak. Cek perubahan sebelum disimpan.",usul:{jenis:"ubah_bagian_info",catatanId:cat.id,cari:"Email: support@example.test",ganti:"Email: support@example.test\nEmail lain: halo@example.test, partnership@example.test"}});
    const edit = await jalankanTanya({workspaceId:workspace.id,riwayat:[],pesan:"Tambahkan kontak halo@example.test dan partnership@example.test pada info bisnis"});
    assert.equal(edit.usul?.jenis,"ubah_info"); assert.equal(editCalls,2); assert.equal((await prisma.knowledgeSource.findUniqueOrThrow({where:{id:cat.id}})).content,konten); checks += 3;

    llm.complete = async () => JSON.stringify({ jawab: "Maaf, ini draf pesan untuk menjaga hubungan baik dengan Kak Maya." });
    const takAdaDraf = await jalankanTanya({ workspaceId: workspace.id, riwayat: riwayatDraf, pesan: "Mna" });
    assert.equal(takAdaDraf.usul, null); assert.match(takAdaDraf.teks, /belum berhasil dibuat/); checks += 2;
    llm.complete = async () => JSON.stringify({ jawab: "Ini drafnya.", usul: { jenis: "kirim_pesan", kontakId: "kontak-milik-orang-lain", teks: "Halo" } });
    const invalid = await jalankanTanya({ workspaceId: workspace.id, riwayat: [], pesan: "Siapkan pesan" });
    assert.equal(invalid.usul, null); assert.match(invalid.teks, /belum berhasil dibuat/); checks += 2;
    assert.equal(await prisma.message.count({ where: { conversation: { workspaceId: workspace.id }, role: { in: ["ai", "human"] } } }), 0); checks++;
    let emptyCalls = 0;
    llm.complete = async () => ++emptyCalls === 1 ? JSON.stringify({ alat: "daftar_masalah" }) : JSON.stringify({ jawab: "Ini daftar pelanggan yang komplain. Mau balas siapa?" });
    const benarKosong = await jalankanTanya({ workspaceId: workspace.id, riwayat: [], pesan: "Siapa yang komplain?" });
    assert.match(benarKosong.teks, /Belum ada data/);
    assert.doesNotMatch(benarKosong.teks, /Mau balas/); checks += 2;
    for (let i = 0; i < 21; i++) await prisma.contact.create({ data: { workspaceId: workspace.id, waJid: `uji-batas-${i}@s.whatsapp.net`, name: `Pelanggan batas ${i}`, stage: "negosiasi" } });
    const terbatas = await ALAT.find(a => a.nama === "daftar_pelanggan")!.jalankan({ workspaceId: workspace.id, agentId: agent.id }, { tahap: "negosiasi" });
    assert.match(terbatas, /Menampilkan 20 dari 21/); checks++;
  } finally {
    llm.complete = original;
    await prisma.workspace.delete({ where: { id: workspace.id } });
    await prisma.workspace.delete({ where: { id: tetangga.id } });
  }
  console.log(`${checks} regression checks passed: saved results, correct CRM stages, follow-up context, personal suggestions, long history, empty/error states, QR and setup.`);
}
main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
