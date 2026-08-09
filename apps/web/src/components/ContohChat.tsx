import Image from "next/image";

/**
 * Contoh percakapan sungguhan, dibuat semirip mungkin dengan tampilan WhatsApp.
 *
 * Ini bagian terpenting halaman jualan. Orang tidak membeli asisten WhatsApp
 * karena membaca sembilan poin fitur, tapi karena melihat asistennya menjawab
 * dengan benar, di tempat yang mereka kenali.
 *
 * Kemiripannya disengaja sampai ke hal kecil: warna hijau gelembung kanan,
 * latar krem bermotif, ekor runcing di gelembung pertama, centang dua biru,
 * jam di dalam gelembung. Kalau salah satunya meleset, orang merasa "ini bukan
 * WhatsApp" tanpa bisa menunjuk apa yang salah, dan contohnya berhenti
 * meyakinkan.
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
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='56' height='56' viewBox='0 0 56 56'%3E%3Cg fill='none' stroke='%23d9d0c4' stroke-width='1.1' stroke-linecap='round' opacity='0.55'%3E%3Cpath d='M8 12h6M11 9v6'/%3E%3Ccircle cx='40' cy='16' r='3.5'/%3E%3Cpath d='M30 40l3 3 5-6'/%3E%3Cpath d='M12 34c2-3 6-3 8 0'/%3E%3Cpath d='M46 44v5M43.5 46.5h5'/%3E%3C/g%3E%3C/svg%3E\")";

function Centang() {
  return (
    <svg viewBox="0 0 18 12" width="15" height="10" aria-hidden="true">
      <path
        d="M1 6.6l3.2 3.2L11 2.5"
        fill="none"
        stroke="#53bdeb"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6.4 6.6l3.2 3.2L16.4 2.5"
        fill="none"
        stroke="#53bdeb"
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
      {/* Bingkai HP */}
      <div className="overflow-hidden rounded-[30px] border-[7px] border-ink-950 bg-ink-950 shadow-xl">
        {/* Kepala WhatsApp */}
        <div className="flex items-center gap-3 bg-[#008069] px-3 py-2.5">
          <svg viewBox="0 0 24 24" width="18" height="18" className="shrink-0">
            <path
              d="M15 5l-7 7 7 7"
              fill="none"
              stroke="#fff"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/25 text-[12px] font-semibold text-white">
            R
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-medium leading-tight text-white">
              Bu Ratna
            </p>
            <p className="text-[10.5px] leading-tight text-white/75">online</p>
          </div>

          {/* Panggilan video, panggilan suara, menu. Ada di WhatsApp asli, dan
              ketiadaannya bikin orang merasa ada yang aneh tanpa bisa menunjuk
              apa. */}
          <div className="flex shrink-0 items-center gap-3.5 pr-0.5 text-white">
            <svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor">
              <path d="M15 8.5a2.5 2.5 0 0 0-2.5-2.5h-8A2.5 2.5 0 0 0 2 8.5v7A2.5 2.5 0 0 0 4.5 18h8a2.5 2.5 0 0 0 2.5-2.5v-7Zm1.5 5.1 4 2.6a.7.7 0 0 0 1.1-.6V8.4a.7.7 0 0 0-1.1-.6l-4 2.6v3.2Z" />
            </svg>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <path d="M19.6 15.9l-2.6-1.8a1.4 1.4 0 0 0-1.8.2l-1 1a11.6 11.6 0 0 1-4.5-4.5l1-1a1.4 1.4 0 0 0 .2-1.8L9.1 5.4a1.4 1.4 0 0 0-2-.3l-1.4 1c-.9.8-1.1 2.1-.5 3.4a20.4 20.4 0 0 0 9.3 9.3c1.3.6 2.6.4 3.4-.5l1-1.4a1.4 1.4 0 0 0-.3-2Z" />
            </svg>
            <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor">
              <circle cx="12" cy="5" r="1.8" />
              <circle cx="12" cy="12" r="1.8" />
              <circle cx="12" cy="19" r="1.8" />
            </svg>
          </div>
        </div>

        {/* Isi percakapan */}
        <div
          className="space-y-1.5 px-2.5 py-3"
          style={{ backgroundColor: "#efeae2", backgroundImage: MOTIF }}
        >
          <p className="mx-auto mb-2 w-fit rounded-md bg-[#ffffffcc] px-2 py-0.5 text-[9.5px] text-ink-500 shadow-sm">
            Tadi malam
          </p>

          {PERCAKAPAN.map((p, i) => {
            const kanan = p.dari === "asisten";
            // Ekor cuma di gelembung pertama tiap giliran bicara, persis
            // seperti WhatsApp. Kalau semua gelembung diberi ekor, kelihatan
            // ramai dan justru terasa palsu.
            const ekor = i === 0 || PERCAKAPAN[i - 1].dari !== p.dari;

            return (
              <div
                key={i}
                className={`flex ${kanan ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`relative max-w-[85%] px-2 pb-1.5 pt-1.5 text-[12px] leading-[1.45] shadow-sm ${
                    kanan
                      ? "rounded-lg bg-[#d9fdd3] text-[#111b21]"
                      : "rounded-lg bg-white text-[#111b21]"
                  } ${ekor ? (kanan ? "rounded-tr-none" : "rounded-tl-none") : ""}`}
                >
                  {/* Ekor gelembung */}
                  {ekor && (
                    <span
                      className={`absolute top-0 h-3 w-2.5 ${
                        kanan ? "-right-2.5" : "-left-2.5"
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
                    <span className="mb-1 block overflow-hidden rounded-md">
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

                  <span className="absolute bottom-1 right-1.5 flex items-center gap-0.5">
                    <span className="text-[9px] text-[#667781]">{p.jam}</span>
                    {kanan && <Centang />}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Kolom ketik */}
        <div
          className="flex items-center gap-2 px-2.5 py-2"
          style={{ backgroundColor: "#f0f2f5" }}
        >
          <div className="flex-1 rounded-full bg-white px-3 py-1.5 text-[11.5px] text-ink-400">
            Ketik pesan
          </div>
          <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#008069]">
            <svg viewBox="0 0 24 24" width="13" height="13">
              <path d="M3 20.5 21 12 3 3.5 3 10l12 2-12 2v6.5Z" fill="#fff" />
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
