import Image from "next/image";

/**
 * Contoh percakapan sungguhan, dibuat semirip mungkin dengan WhatsApp DI iPhONE
 * KELUARAN BARU.
 *
 * Ini bagian terpenting halaman jualan. Orang tidak membeli asisten WhatsApp
 * karena membaca sembilan poin fitur, tapi karena melihat asistennya menjawab
 * dengan benar, di tempat yang mereka kenali. Kalau tempatnya terlihat seperti
 * WhatsApp jadul (kepala hijau tua ala Android lama), sebagian orang merasa
 * "ini bukan WhatsApp yang aku pakai" tanpa bisa menunjuk apa yang salah, dan
 * contohnya berhenti meyakinkan.
 *
 * Jadi yang ditiru versi iOS terbaru: bilah atas terang dan buram (frosted),
 * judul di tengah, Dynamic Island dan bilah status di puncak, gelembung yang
 * lebih membulat, dan kolom ketik yang bulat penuh. Warna hijaunya khusus
 * gelembung dan tombol kirim, sisanya terang.
 *
 * Warna hijau dan biru di sini TIDAK melanggar aturan satu warna per layar.
 * Itu warna WhatsApp, bukan warna Palwise, dan tugasnya membuat orang mengenali
 * tempatnya. Bidangnya juga kecil dan terkurung di dalam bingkai HP.
 *
 * Foto kopinya foto produk sungguhan. Tidak ada wajah orang di sini, dan itu
 * juga disengaja: memakai wajah orang asing sebagai pelanggan karangan berarti
 * memakai wajah seseorang untuk mengarang kesaksian.
 */

/** Motif latar WhatsApp, digambar sebagai SVG kecil yang diulang. */
const MOTIF =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='56' height='56' viewBox='0 0 56 56'%3E%3Cg fill='none' stroke='%23c9bfb0' stroke-width='1.1' stroke-linecap='round' opacity='0.4'%3E%3Cpath d='M8 12h6M11 9v6'/%3E%3Ccircle cx='40' cy='16' r='3.5'/%3E%3Cpath d='M30 40l3 3 5-6'/%3E%3Cpath d='M12 34c2-3 6-3 8 0'/%3E%3Cpath d='M46 44v5M43.5 46.5h5'/%3E%3C/g%3E%3C/svg%3E\")";

/** Centang dua biru "sudah dibaca", khas WhatsApp. */
function Centang() {
  return (
    <svg viewBox="0 0 18 12" width="15" height="10" aria-hidden="true">
      <path
        d="M1 6.6l3.2 3.2L11 2.5"
        fill="none"
        stroke="#34b7f1"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6.4 6.6l3.2 3.2L16.4 2.5"
        fill="none"
        stroke="#34b7f1"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
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

export function ContohChat() {
  return (
    <div className="w-full max-w-[340px]">
      {/* Bingkai iPhone: sudut sangat bulat, tepi hitam tebal. */}
      <div className="overflow-hidden rounded-[46px] border-[11px] border-ink-950 bg-black shadow-2xl">
        {/* Bilah status iOS: jam kiri, Dynamic Island di tengah, sinyal +
            baterai kanan. Ini yang paling cepat bikin orang membacanya sebagai
            iPhone baru, bukan Android lama. */}
        <div className="relative flex items-center justify-between bg-white px-6 pb-1 pt-2 text-[11px] font-semibold text-ink-950">
          <span className="tabular-nums">23.43</span>
          <span
            aria-hidden
            className="absolute left-1/2 top-[7px] h-[22px] w-[80px] -translate-x-1/2 rounded-full bg-black"
          />
          <span className="flex items-center gap-1.5">
            {/* Sinyal */}
            <svg width="17" height="11" viewBox="0 0 17 11" fill="currentColor" aria-hidden="true">
              <rect x="0" y="7.5" width="3" height="3.5" rx="1" />
              <rect x="4.6" y="5" width="3" height="6" rx="1" />
              <rect x="9.2" y="2.5" width="3" height="8.5" rx="1" />
              <rect x="13.8" y="0" width="3" height="11" rx="1" />
            </svg>
            {/* Baterai */}
            <span className="flex items-center">
              <span className="flex h-[11px] w-[22px] items-center rounded-[3px] border border-ink-950/40 p-[1.5px]">
                <span className="block h-full w-[72%] rounded-[1px] bg-ink-950" />
              </span>
              <span className="ml-[1px] h-[4px] w-[1.5px] rounded-r-sm bg-ink-950/40" />
            </span>
          </span>
        </div>

        {/* Kepala percakapan, gaya iOS: terang dan buram, judul di tengah. */}
        <div className="flex items-center gap-1.5 border-b border-black/[0.06] bg-white/85 px-2 pb-2 pt-1 backdrop-blur-xl">
          {/* Panah kembali, warna hijau WhatsApp (khas iOS). */}
          <svg viewBox="0 0 24 24" width="20" height="20" className="shrink-0" aria-hidden="true">
            <path
              d="M15 5l-7 7 7 7"
              fill="none"
              stroke="#25a884"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>

          {/* Judul di tengah: foto, nama, lalu "online" di bawahnya. */}
          <div className="flex min-w-0 flex-1 flex-col items-center leading-tight">
            <div className="flex items-center gap-1.5">
              <span className="grid h-[22px] w-[22px] shrink-0 place-items-center rounded-full bg-[#25a884] text-[10px] font-semibold text-white">
                R
              </span>
              <span className="truncate text-[13.5px] font-semibold text-ink-950">
                Bu Ratna
              </span>
            </div>
            <span className="text-[10px] leading-tight text-ink-400">online</span>
          </div>

          {/* Video call dan telepon, hijau, khas iOS. */}
          <div className="flex shrink-0 items-center gap-3.5 pr-1 text-[#25a884]">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
              <path d="M15 8.5a2.5 2.5 0 0 0-2.5-2.5h-8A2.5 2.5 0 0 0 2 8.5v7A2.5 2.5 0 0 0 4.5 18h8a2.5 2.5 0 0 0 2.5-2.5v-7Zm1.5 5.1 4 2.6a.7.7 0 0 0 1.1-.6V8.4a.7.7 0 0 0-1.1-.6l-4 2.6v3.2Z" />
            </svg>
            <svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor" aria-hidden="true">
              <path d="M19.6 15.9l-2.6-1.8a1.4 1.4 0 0 0-1.8.2l-1 1a11.6 11.6 0 0 1-4.5-4.5l1-1a1.4 1.4 0 0 0 .2-1.8L9.1 5.4a1.4 1.4 0 0 0-2-.3l-1.4 1c-.9.8-1.1 2.1-.5 3.4a20.4 20.4 0 0 0 9.3 9.3c1.3.6 2.6.4 3.4-.5l1-1.4a1.4 1.4 0 0 0-.3-2Z" />
            </svg>
          </div>
        </div>

        {/* Isi percakapan */}
        <div
          className="space-y-1.5 px-2.5 py-3"
          style={{ backgroundColor: "#efe7dd", backgroundImage: MOTIF }}
        >
          <p className="mx-auto mb-2 w-fit rounded-lg bg-white/90 px-2.5 py-0.5 text-[9.5px] font-medium text-ink-500 shadow-sm">
            Tadi malam
          </p>

          {PERCAKAPAN.map((p, i) => {
            const kanan = p.dari === "asisten";
            // Ekor cuma di gelembung pertama tiap giliran bicara, persis seperti
            // WhatsApp. Kalau semua gelembung diberi ekor, kelihatan ramai dan
            // justru terasa palsu.
            const ekor = i === 0 || PERCAKAPAN[i - 1].dari !== p.dari;

            return (
              <div
                key={i}
                className={`flex ${kanan ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`relative max-w-[85%] rounded-[18px] px-2.5 pb-1.5 pt-1.5 text-[12px] leading-[1.45] shadow-[0_1px_1px_rgba(0,0,0,0.08)] ${
                    kanan ? "bg-[#d9fdd3] text-[#111b21]" : "bg-white text-[#111b21]"
                  } ${ekor ? (kanan ? "rounded-tr-md" : "rounded-tl-md") : ""}`}
                >
                  {/* Ekor gelembung */}
                  {ekor && (
                    <span
                      aria-hidden
                      className={`absolute top-0 h-3 w-2.5 ${
                        kanan ? "-right-[7px]" : "-left-[7px]"
                      }`}
                      style={{
                        backgroundColor: kanan ? "#d9fdd3" : "#ffffff",
                        clipPath: kanan
                          ? "polygon(0 0, 100% 0, 0 100%)"
                          : "polygon(0 0, 100% 0, 100% 100%)",
                      }}
                    />
                  )}

                  {p.foto && (
                    <span className="mb-1 block overflow-hidden rounded-[13px]">
                      <Image
                        src="/arabika-toraja.jpg"
                        alt="Biji kopi arabika Toraja yang dikirim pelanggan"
                        width={260}
                        height={195}
                        className="h-[130px] w-full object-cover"
                      />
                    </span>
                  )}

                  <span className="pr-11">{p.teks}</span>

                  <span className="absolute bottom-1 right-2 flex items-center gap-0.5">
                    <span className="text-[9px] text-[#667781]">{p.jam}</span>
                    {kanan && <Centang />}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Kolom ketik gaya iOS: tombol tambah, kolom bulat penuh, tombol kirim
            hijau bulat. */}
        <div className="flex items-center gap-2 bg-white/90 px-2.5 pb-3 pt-2 backdrop-blur-xl">
          <svg viewBox="0 0 24 24" width="22" height="22" className="shrink-0 text-[#25a884]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M12 6v12M6 12h12" />
          </svg>
          <div className="flex-1 rounded-full border border-black/10 bg-white px-3.5 py-1.5 text-[11.5px] text-ink-400">
            Ketik pesan
          </div>
          <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#25a884]">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 19V5M6 11l6-6 6 6" />
            </svg>
          </div>
        </div>
      </div>

      <p className="mt-4 text-center text-xs leading-relaxed text-ink-500">
        Percakapan ini terjadi jam setengah dua belas malam, waktu tokonya sudah
        tutup dan pemiliknya sudah tidur.
      </p>
    </div>
  );
}
