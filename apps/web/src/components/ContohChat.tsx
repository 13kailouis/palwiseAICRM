import Image from "next/image";

/**
 * Contoh percakapan sungguhan, dibuat semirip mungkin dengan WhatsApp DI iPhONE
 * KELUARAN BARU, MODE GELAP.
 *
 * Ini bagian terpenting halaman jualan. Orang tidak membeli asisten WhatsApp
 * karena membaca sembilan poin fitur, tapi karena melihat asistennya menjawab
 * dengan benar, di tempat yang mereka kenali. Kalau tempatnya terlihat seperti
 * WhatsApp jadul (kepala hijau tua ala Android lama), sebagian orang merasa
 * "ini bukan WhatsApp yang aku pakai" tanpa bisa menunjuk apa yang salah, dan
 * contohnya berhenti meyakinkan. Banyak pemilik toko memakai iPhone dalam mode
 * gelap, jadi itu yang ditiru sedekat mungkin.
 *
 * Yang ditiru versi iOS mode gelap: latar hampir hitam dengan motif doodle,
 * kepala rata kiri (avatar dengan cincin story hijau, nama, lalu tombol video
 * dan telepon di dalam pil), gelembung hijau tua untuk kita dan abu tua untuk
 * pelanggan, pemisah "belum dibaca", dan kolom ketik gelap dengan ikon stiker,
 * kamera, dan mikrofon (kolom kosong, persis tampilan iOS sebelum mengetik).
 *
 * Warna hijau dan biru di sini TIDAK melanggar aturan satu warna per layar.
 * Itu warna WhatsApp, bukan warna Palwise, dan tugasnya membuat orang mengenali
 * tempatnya. Bidangnya juga kecil dan terkurung di dalam bingkai HP.
 *
 * Avatar pelanggan sengaja pakai inisial, bukan foto orang. Memakai wajah orang
 * asing sebagai pelanggan karangan berarti memakai wajah seseorang untuk
 * mengarang kesaksian. Foto kopinya foto produk sungguhan.
 */

/** Motif doodle WhatsApp mode gelap: garis abu tua di atas latar hampir hitam. */
const MOTIF =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='56' height='56' viewBox='0 0 56 56'%3E%3Cg fill='none' stroke='%238696a0' stroke-width='1.1' stroke-linecap='round' stroke-linejoin='round' opacity='0.06'%3E%3Cpath d='M8 12h6M11 9v6'/%3E%3Ccircle cx='40' cy='16' r='3.5'/%3E%3Cpath d='M30 40l3 3 5-6'/%3E%3Cpath d='M12 34c2-3 6-3 8 0'/%3E%3Cpath d='M46 44v5M43.5 46.5h5'/%3E%3Cpath d='M24 4c0 3-3 3-3 6'/%3E%3C/g%3E%3C/svg%3E\")";

/** Centang dua biru "sudah dibaca", khas WhatsApp. */
function Centang() {
  return (
    <svg viewBox="0 0 18 12" width="15" height="10" aria-hidden="true">
      <path d="M1 6.6l3.2 3.2L11 2.5" fill="none" stroke="#53bdeb" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6.4 6.6l3.2 3.2L16.4 2.5" fill="none" stroke="#53bdeb" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

type Pesan = {
  dari: "pelanggan" | "asisten";
  teks: string;
  jam: string;
  foto?: boolean;
};

const PERCAKAPAN: Pesan[] = [
  { dari: "pelanggan", teks: "Halo kak, arabika gayo masih ada?", jam: "23.41" },
  {
    dari: "asisten",
    teks: "Halo kak! 👋 Masih ada. Arabika Gayo 200gr Rp 85.000, rasanya floral dan agak citrus. Cocok buat V60 atau tubruk.",
    jam: "23.41",
  },
  { dari: "pelanggan", teks: "Kalau kirim ke Bandung ongkirnya berapa ya", jam: "23.42" },
  {
    dari: "asisten",
    teks: "Kami kirimnya dari Bandung kak, jadi buat area Bandung bisa COD. Kalau belanjanya di atas Rp 300.000 gratis ongkir.",
    jam: "23.42",
  },
  { dari: "pelanggan", teks: "Kalau yang ini namanya apa", jam: "23.43", foto: true },
  {
    dari: "asisten",
    teks: "Itu Arabika Toraja kak, Rp 92.000 per 200gr. Rasanya lebih ke cokelat dan rempah. Mau saya catat pesanannya?",
    jam: "23.43",
  },
];

/** Di mana pemisah "belum dibaca" muncul: tepat sebelum pesan pelanggan terakhir. */
const IDX_BELUM_DIBACA = 4;

export function ContohChat() {
  return (
    <div className="w-full max-w-[340px]">
      {/* Bingkai iPhone: sudut sangat bulat, tepi hitam tebal. */}
      <div className="overflow-hidden rounded-[46px] border-[11px] border-ink-950 bg-black shadow-2xl">
        {/* Bilah status iOS mode gelap: jam kiri, sinyal + wifi + baterai kanan. */}
        <div className="flex items-center justify-between bg-[#0b141a] px-7 pb-1 pt-2.5 text-[12px] font-semibold text-white">
          <span className="tabular-nums">10.03</span>
          <span className="flex items-center gap-1.5">
            {/* Sinyal */}
            <svg width="17" height="11" viewBox="0 0 17 11" fill="currentColor" aria-hidden="true">
              <rect x="0" y="7.5" width="3" height="3.5" rx="1" />
              <rect x="4.6" y="5" width="3" height="6" rx="1" />
              <rect x="9.2" y="2.5" width="3" height="8.5" rx="1" />
              <rect x="13.8" y="0" width="3" height="11" rx="1" />
            </svg>
            {/* Wifi */}
            <svg width="16" height="11" viewBox="0 0 16 12" fill="currentColor" aria-hidden="true">
              <path d="M8 2.2c2.6 0 5 1 6.8 2.7l-1.4 1.5A7.6 7.6 0 0 0 8 4.3 7.6 7.6 0 0 0 2.6 6.4L1.2 4.9A9.7 9.7 0 0 1 8 2.2Zm0 3.2c1.7 0 3.3.7 4.5 1.8l-1.5 1.5A4.5 4.5 0 0 0 8 7.4c-1.2 0-2.3.5-3 1.3L3.5 7.2A6.4 6.4 0 0 1 8 5.4Zm0 3.2c.8 0 1.5.3 2 .9L8 11.4 6 9.5c.5-.6 1.2-.9 2-.9Z" />
            </svg>
            {/* Baterai */}
            <span className="flex items-center">
              <span className="flex h-[11px] w-[23px] items-center rounded-[3px] border border-white/50 p-[1.5px]">
                <span className="block h-full w-[80%] rounded-[1px] bg-white" />
              </span>
              <span className="ml-[1px] h-[4px] w-[1.5px] rounded-r-sm bg-white/50" />
            </span>
          </span>
        </div>

        {/* Kepala percakapan, iOS mode gelap: rata kiri, tombol dalam pil. */}
        <div className="flex items-center gap-2 border-b border-white/[0.06] bg-[#1d282e] px-2.5 pb-2 pt-1.5">
          {/* Panah kembali + jumlah chat belum dibaca, hijau khas iOS. */}
          <div className="flex shrink-0 items-center gap-0.5 text-[#25a884]">
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
              <path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="text-[15px] font-medium">24</span>
          </div>

          {/* Avatar dengan cincin story hijau. */}
          <span className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-full bg-[#2a3942] text-[13px] font-semibold text-[#cfd6da] ring-2 ring-[#25d366] ring-offset-2 ring-offset-[#1d282e]">
            R
          </span>

          {/* Nama, rata kiri, dengan status di bawahnya. */}
          <div className="flex min-w-0 flex-1 flex-col justify-center leading-tight">
            <span className="truncate text-[15px] font-semibold text-white">Bu Ratna</span>
            <span className="text-[11px] leading-tight text-[#8696a0]">online</span>
          </div>

          {/* Video call dan telepon, di dalam pil gelap, khas iOS. */}
          <div className="flex shrink-0 items-center gap-1.5 pr-0.5 text-[#e9edef]">
            <span className="grid h-8 w-11 place-items-center rounded-[10px] bg-white/[0.08]">
              <svg viewBox="0 0 24 24" width="19" height="19" fill="currentColor" aria-hidden="true">
                <path d="M15 8.5a2.5 2.5 0 0 0-2.5-2.5h-8A2.5 2.5 0 0 0 2 8.5v7A2.5 2.5 0 0 0 4.5 18h8a2.5 2.5 0 0 0 2.5-2.5v-7Zm1.5 5.1 4 2.6a.7.7 0 0 0 1.1-.6V8.4a.7.7 0 0 0-1.1-.6l-4 2.6v3.2Z" />
              </svg>
            </span>
            <span className="grid h-8 w-11 place-items-center rounded-[10px] bg-white/[0.08]">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
                <path d="M19.6 15.9l-2.6-1.8a1.4 1.4 0 0 0-1.8.2l-1 1a11.6 11.6 0 0 1-4.5-4.5l1-1a1.4 1.4 0 0 0 .2-1.8L9.1 5.4a1.4 1.4 0 0 0-2-.3l-1.4 1c-.9.8-1.1 2.1-.5 3.4a20.4 20.4 0 0 0 9.3 9.3c1.3.6 2.6.4 3.4-.5l1-1.4a1.4 1.4 0 0 0-.3-2Z" />
              </svg>
            </span>
          </div>
        </div>

        {/* Isi percakapan */}
        <div
          className="space-y-1.5 px-2.5 py-3"
          style={{ backgroundColor: "#0b141a", backgroundImage: MOTIF }}
        >
          <p className="mx-auto mb-2 w-fit rounded-lg bg-[#1d282f] px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide text-[#8696a0]">
            Tadi malam
          </p>

          {PERCAKAPAN.map((p, i) => {
            const kanan = p.dari === "asisten";
            // Ekor cuma di gelembung pertama tiap giliran bicara, persis WhatsApp.
            const ekor = i === 0 || PERCAKAPAN[i - 1].dari !== p.dari;
            const warna = kanan ? "#005c4b" : "#202c33";

            return (
              <div key={i}>
                {i === IDX_BELUM_DIBACA && (
                  <p className="my-2 py-1 text-center text-[11px] font-medium text-[#8696a0]">
                    1 pesan belum dibaca
                  </p>
                )}

                <div className={`flex ${kanan ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`relative max-w-[85%] rounded-[13px] px-2 pb-1.5 pt-1.5 text-[13px] leading-[1.42] text-[#e9edef] shadow-[0_1px_1px_rgba(0,0,0,0.25)] ${
                      ekor ? (kanan ? "rounded-tr-[4px]" : "rounded-tl-[4px]") : ""
                    }`}
                    style={{ backgroundColor: warna }}
                  >
                    {/* Ekor gelembung */}
                    {ekor && (
                      <span
                        aria-hidden
                        className={`absolute top-0 h-3 w-2.5 ${kanan ? "-right-[7px]" : "-left-[7px]"}`}
                        style={{
                          backgroundColor: warna,
                          clipPath: kanan
                            ? "polygon(0 0, 100% 0, 0 100%)"
                            : "polygon(0 0, 100% 0, 100% 100%)",
                        }}
                      />
                    )}

                    {p.foto && (
                      <span className="mb-1 block overflow-hidden rounded-[9px]">
                        <Image
                          src="/arabika-toraja.jpg"
                          alt="Biji kopi arabika Toraja yang dikirim pelanggan"
                          width={260}
                          height={195}
                          className="h-[130px] w-full object-cover"
                        />
                      </span>
                    )}

                    <span className="px-0.5 pr-11">{p.teks}</span>

                    <span className="absolute bottom-1 right-2 flex items-center gap-0.5">
                      <span className="text-[10px] text-[#8696a0]">{p.jam}</span>
                      {kanan && <Centang />}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Kolom ketik iOS mode gelap: tombol tambah, kolom bulat penuh dengan
            ikon stiker, lalu kamera dan mikrofon. Kolom kosong, tanpa tombol
            kirim, persis tampilan iOS sebelum mengetik. */}
        <div className="flex items-center gap-2 bg-[#1d282e] px-2.5 pb-3.5 pt-2 text-[#8696a0]">
          <svg viewBox="0 0 24 24" width="24" height="24" className="shrink-0" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" aria-hidden="true">
            <path d="M12 5v14M5 12h14" />
          </svg>
          <div className="flex flex-1 items-center rounded-full bg-[#2a3942] py-1.5 pl-3.5 pr-2.5">
            <span className="flex-1" />
            {/* Ikon stiker */}
            <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M8 4h8a4 4 0 0 1 4 4v5l-7 7H8a4 4 0 0 1-4-4V8a4 4 0 0 1 4-4z" />
              <path d="M20 13h-4a3 3 0 0 0-3 3v4" />
            </svg>
          </div>
          {/* Kamera */}
          <svg viewBox="0 0 24 24" width="23" height="23" className="shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 8.5a2 2 0 0 1 2-2h1.6l1-1.5h4.8l1 1.5H18a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" />
            <circle cx="12" cy="12.5" r="3.2" />
          </svg>
          {/* Mikrofon */}
          <svg viewBox="0 0 24 24" width="22" height="22" className="shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 3a3 3 0 0 0-3 3v5a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3z" />
            <path d="M5 11a7 7 0 0 0 14 0" />
            <path d="M12 18v3" />
          </svg>
        </div>
      </div>

      <p className="mt-4 text-center text-xs leading-relaxed text-ink-500">
        Percakapan ini terjadi jam setengah dua belas malam, waktu tokonya sudah
        tutup dan pemiliknya sudah tidur.
      </p>
    </div>
  );
}
