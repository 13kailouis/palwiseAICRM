import Link from "next/link";
import {
  PLANS,
  SEMUA_PAKET,
  KUOTA_TANYA,
  formatIDR,
  paketMinimalTiapFitur,
} from "@palwise/db";
import { keApp } from "@/lib/situs";
import { DataTerstruktur } from "./DataTerstruktur";
import { Ikon, type NamaIkon } from "./Ikon";
import { HALAMAN_BIDANG, type IsiJualan } from "@/lib/jualan";
import { ContohTanya } from "./ContohTanya";
import { KakiHalaman } from "./HalamanTeks";
import { MarketingNav } from "./MarketingNav";
import { ProductPreview } from "./ProductPreview";

const FAQ = [
  {
    t: "Apa yang bisa saya coba secara gratis?",
    j: `Kamu mendapat ${PLANS.free.aiCredits} balasan WhatsApp per bulan, kotak masuk, data pelanggan, dan tempat mengisi info bisnis. Palwise AI menyediakan ${KUOTA_TANYA.free.bulanan} pertanyaan per bulan setelah verifikasi email, maksimal ${KUOTA_TANYA.free.harian} per hari. Sebelum verifikasi, tersedia 5 percobaan. Tidak perlu kartu kredit.`,
  },
  {
    t: "Harus punya tim teknis untuk mulai?",
    j: "Tidak. Buat akun, isi informasi bisnis, lalu uji jawaban di halaman Coba dulu. Setelah siap, sambungkan nomor lewat Perangkat tertaut di WhatsApp. Panduan tersedia di setiap tahap.",
  },
  {
    t: "Bagaimana kalau jawaban AI belum sesuai?",
    j: "Periksa sumber informasinya, perbarui harga atau aturan yang perlu diubah, lalu uji kembali. AI tetap bisa salah. Pantau percakapan dan ambil alih saat pelanggan membutuhkan bantuan tim.",
  },
  {
    t: "Apa bedanya asisten WhatsApp dan Palwise AI?",
    j: "Asisten WhatsApp membalas pelanggan sesuai informasi dan pengaturan bisnismu. Palwise AI adalah ruang chat untuk pemilik: mencari pelanggan, menyiapkan draf, membaca kabar bisnis, dan membantu mengubah pengaturan. Kiriman dan perubahan lewat Palwise AI ditampilkan untuk persetujuanmu.",
  },
  {
    t: "Bagaimana nomor WhatsApp disambungkan?",
    j: "Melalui scan QR di menu Perangkat tertaut. Kamu tetap mengelola nomornya dan bisa melepas sambungan. Ketersediaan sambungan mengikuti layanan WhatsApp; periksa statusnya di aplikasi. Detail penggunaan ada di panduan dan syarat layanan.",
  },
  {
    t: "Bagaimana data bisnis dan pelanggan digunakan?",
    j: "Data digunakan untuk menjalankan layanan, menangani masalah, dan memperbaiki produk. Kebijakan privasi menjelaskan pemrosesan data, akses tim, serta pencatatan akses. Baca rinciannya sebelum menyambungkan data bisnismu.",
  },
  {
    t: "Apakah saya harus berlangganan tahunan?",
    j: "Tidak. Paket berbayar berlaku bulanan, tanpa biaya pemasangan. Kamu bisa mulai gratis dan memilih paket setelah mencobanya. Jika berhenti, paket berbayar tetap berlaku sampai masa aktifnya berakhir.",
  },
];

function SectionHeading({
  label,
  title,
  text,
}: {
  label: string;
  title: string;
  text?: string;
}) {
  return (
    <div className="pw-section-heading">
      <p className="pw-eyebrow">{label}</p>
      <h2>{title}</h2>
      {text && <p>{text}</p>}
    </div>
  );
}

export function HalamanJualan({ isi }: { isi: IsiJualan }) {
  const umum = isi.id === "umum";
  const faqs = [...isi.tanyaJawab, ...FAQ];
  const fitur = paketMinimalTiapFitur();
  const benefits: {
    icon: NamaIkon;
    title: string;
    text: string;
    tag: string;
  }[] = [
    {
      icon: "chat",
      title: "Pertanyaan berulang, terlayani.",
      text: "Bantu pelanggan memahami harga, layanan, dan cara pesan dari informasi yang kamu siapkan.",
      tag: "ASISTEN WHATSAPP",
    },
    {
      icon: "pelanggan",
      title: "Lihat siapa yang perlu perhatian.",
      text: "Temukan kebutuhan dan riwayat pelanggan tanpa membaca ulang semua percakapan.",
      tag: "PELANGGAN & RINGKASAN",
    },
    {
      icon: "sapa",
      title: "Lanjutkan percakapan yang tertunda.",
      text: `Atur sapaan otomatis dan jam kerja tim. Tersedia mulai paket ${fitur.sapaOtomatis}.`,
      tag: "TINDAK LANJUT",
    },
  ];
  return (
    <main className="pw-marketing">
      <a className="pw-skip" href="#utama">
        Lewati ke konten utama
      </a>
      <DataTerstruktur tanyaJawab={faqs} />
      <MarketingNav daftar={keApp("/daftar")} masuk={keApp("/masuk")} />
      <section id="utama" className="pw-hero">
        <div className="pw-container">
          <div className="pw-hero-copy">
            <p className="pw-eyebrow">
              <span className="pw-live-dot" />{" "}
              {umum
                ? "REKAN KERJA AI UNTUK BISNISMU"
                : `PALWISE UNTUK ${isi.nama.toLocaleUpperCase("id-ID")}`}
            </p>
            <h1>
              {umum ? (
                <>
                  {isi.hero.judul}
                  <br />
                  <span>{isi.hero.judulAbu}</span>
                </>
              ) : (
                <>
                  Lebih dekat dengan pelanggan.
                  <br />
                  <span>Lebih mudah mengelola {isi.nama.toLowerCase()}.</span>
                </>
              )}
            </h1>
            <p className="pw-hero-description">
              AI yang membantu membalas WhatsApp pelanggan, merapikan
              percakapan, dan menyiapkan langkah berikutnya. Semua dalam satu
              ruang kerja. Kendali tetap di tanganmu.
            </p>
            <div className="pw-hero-actions">
              <Link className="pw-button" href={keApp("/daftar")}>
                Mulai gratis <span aria-hidden>↗</span>
              </Link>
              <a className="pw-button pw-button-outline" href="#demo">
                <Ikon nama="coba" size={17} />
                Lihat cara kerjanya
              </a>
            </div>
            <p className="pw-hero-note">
              <Ikon nama="centang" size={14} />
              Tanpa kartu kredit <span>·</span> {PLANS.free.aiCredits} balasan
              gratis per bulan
            </p>
          </div>
          <div id="demo" className="pw-hero-product">
            <ProductPreview
              chat={isi.chat}
              tanya={isi.tanyaAi[0]}
              options={
                umum
                  ? HALAMAN_BIDANG.map((h) => ({
                      id: h.id,
                      label: h.nama,
                      chat: h.chat,
                      tanya: h.tanyaAi[0],
                    }))
                  : undefined
              }
            />
          </div>
          <div className="pw-value-strip">
            <span>Dari chat pertama sampai langkah berikutnya.</span>
            <span>
              <Ikon nama="whatsapp" size={18} />
              WhatsApp pelanggan
            </span>
            <span>
              <Ikon nama="tanya" size={18} />
              AI untuk pemilik
            </span>
            <span>
              <Ikon nama="kendali" size={18} />
              Satu ruang kerja
            </span>
          </div>
        </div>
      </section>
      <section id="fitur" className="pw-section pw-container">
        <div className="pw-heading-split">
          <SectionHeading
            label="LEBIH DARI SEKADAR BALAS CHAT"
            title="Percakapan yang ramai. Bisnis yang tetap teratur."
          />
          <p>
            Tim bisa fokus pada pelanggan yang membutuhkan perhatian. Palwise
            membantu pekerjaan berulang dan menjaga konteks percakapan tetap
            mudah ditemukan.
          </p>
        </div>
        <div className="pw-benefits">
          {benefits.map((b, i) => (
            <article key={b.title}>
              <div className="pw-benefit-top">
                <Ikon nama={b.icon} size={24} />
                <span>0{i + 1}</span>
              </div>
              <p className="pw-eyebrow">{b.tag}</p>
              <h3>{b.title}</h3>
              <p>{b.text}</p>
            </article>
          ))}
        </div>
      </section>
      <section id="palwise-ai" className="pw-owner-section">
        <div className="pw-container pw-section">
          <div className="pw-heading-split">
            <SectionHeading
              label="ASISTEN UNTUK PELANGGAN. REKAN UNTUK KAMU."
              title="Punya pertanyaan soal bisnismu? Tinggal tanya."
            />
            <p>
              “Siapa yang perlu dibalas?” “Bantu buat draf follow up.” Palwise
              AI membantu dari percakapan yang tercatat, dengan hasil yang bisa
              kamu periksa.
            </p>
          </div>
          <ContohTanya contoh={isi.tanyaAi} />
          <p className="pw-caption">
            <Ikon nama="kendali" size={16} />
            Draf dan perubahan ditinjau dulu. Kamu yang menyetujui langkah
            berikutnya.
          </p>
        </div>
      </section>
      <section id="cara" className="pw-section pw-container">
        <div className="pw-setup-grid">
          <SectionHeading
            label="MULAI DARI YANG SUDAH KAMU PUNYA"
            title="Bisnismu punya cara sendiri. Palwise mengikutinya."
            text="Tidak perlu menyusun sistem dari nol. Kenalkan bisnismu, cek jawabannya, lalu mulai melayani."
          />
          <div className="pw-steps">
            {[
              [
                "Kenalkan bisnismu",
                "Tambahkan harga, layanan, dan aturan. Ketik langsung atau ambil dari website, berkas, Google Sheet, dan AI yang sudah kamu pakai.",
              ],
              [
                "Coba sebagai pelanggan",
                "Tanyakan hal yang sering masuk ke WhatsApp. Periksa jawabannya dan sesuaikan sebelum menghubungkan nomor.",
              ],
              [
                "Hubungkan. Pantau. Kembangkan.",
                "Sambungkan WhatsApp lewat QR, pantau percakapan, dan ambil alih ketika pelanggan membutuhkan timmu.",
              ],
            ].map(([t, d], i) => (
              <article key={t}>
                <span>0{i + 1}</span>
                <div>
                  <h3>{t}</h3>
                  <p>{d}</p>
                </div>
              </article>
            ))}
            <Link className="pw-text-link" href="/panduan">
              Baca panduan mulai <span aria-hidden>↗</span>
            </Link>
          </div>
        </div>
      </section>
      <section id="bidang" className="pw-industries">
        <div className="pw-container pw-section">
          <SectionHeading
            label="BERAGAM BISNIS. SATU CARA KERJA YANG LEBIH RAPI."
            title="Dibuat untuk percakapan bisnismu."
            text="Lihat contoh penggunaan sesuai bidang usaha. Informasi dan gaya asisten tetap bisa kamu sesuaikan."
          />
          <div className="pw-industry-grid">
            {HALAMAN_BIDANG.map((h) => (
              <Link
                href={`/${h.id}`}
                key={h.id}
                aria-current={isi.id === h.id ? "page" : undefined}
              >
                <Ikon nama={h.ikon} size={22} />
                <span>{h.nama}</span>
                <span aria-hidden>↗</span>
              </Link>
            ))}
          </div>
        </div>
      </section>
      <section id="bukti" className="pw-section pw-container">
        <div className="pw-trust-grid">
          <div className="pw-trust-visual">
            <div className="pw-trust-symbol">
              <Ikon nama="kendali" size={42} />
            </div>
            <p>
              AI membantu.
              <br />
              <strong>Kamu memutuskan.</strong>
            </p>
            <span>Dirancang agar tetap bisa kamu periksa.</span>
          </div>
          <div>
            <SectionHeading
              label="KENYAMANAN DIMULAI DARI KENDALI"
              title="Kenali cara kerjanya sebelum mempercayakannya."
            />
            <div className="pw-trust-list">
              <article>
                <Ikon nama="info" size={21} />
                <div>
                  <h3>Informasi bisnis sebagai acuan</h3>
                  <p>
                    Isi dan perbarui sumber jawaban. Uji akurasinya dengan
                    pertanyaan pelangganmu sendiri.
                  </p>
                </div>
              </article>
              <article>
                <Ikon nama="kendali" size={21} />
                <div>
                  <h3>Tim tetap bisa turun tangan</h3>
                  <p>Pantau chat dan lanjutkan percakapan saat dibutuhkan.</p>
                </div>
              </article>
              <article>
                <Ikon nama="berkas" size={21} />
                <div>
                  <h3>Ketentuan yang bisa kamu baca</h3>
                  <p>
                    <Link href="/privasi">Kebijakan privasi</Link>,{" "}
                    <Link href="/ketentuan">syarat layanan</Link>, dan{" "}
                    <Link href="/kontak">kontak tim</Link> tersedia sebelum kamu
                    mulai.
                  </p>
                </div>
              </article>
            </div>
          </div>
        </div>
      </section>
      <section id="harga" className="pw-pricing-section">
        <div className="pw-container pw-section">
          <SectionHeading
            label="MULAI KECIL. BERKEMBANG SAAT SIAP."
            title="Paket yang mengikuti kebutuhanmu."
            text="Coba dengan bisnismu sendiri. Pilih kapasitas yang sesuai setelah melihat cara kerjanya."
          />
          <div className="pw-price-grid">
            {SEMUA_PAKET.map((plan) => (
              <article
                key={plan.id}
                className={`pw-price-card ${plan.highlight ? "pw-price-featured" : ""}`}
              >
                <div className="pw-price-name">
                  <h3>{plan.name}</h3>
                  {plan.highlight && <span>Untuk berkembang</span>}
                </div>
                <p className="pw-price-purpose">
                  {
                    {
                      free: "Kenali cara kerja Palwise",
                      starter: "Mulai melayani setiap hari",
                      growth: "Perluas jangkauan timmu",
                      pro: "Kelola operasional lebih besar",
                    }[plan.id]
                  }
                </p>
                <p className="pw-price">
                  {plan.pricePerMonth
                    ? formatIDR(plan.pricePerMonth)
                    : "Gratis"}
                </p>
                <p className="pw-price-period">
                  {plan.pricePerMonth ? "per bulan" : "tanpa batas waktu"}
                </p>
                <Link
                  className={`pw-button ${plan.highlight ? "pw-button-light" : "pw-button-outline"}`}
                  href={keApp("/daftar")}
                >
                  {plan.id === "free"
                    ? "Mulai gratis"
                    : `Coba sebelum pilih ${plan.name}`}
                  <span aria-hidden>↗</span>
                </Link>
                <ul className="pw-price-quotas">
                  <li>
                    <Ikon nama="centang" size={16} />
                    <span>
                      <strong>{plan.aiCredits.toLocaleString("id-ID")}</strong>{" "}
                      balasan WhatsApp / bulan
                    </span>
                  </li>
                  <li>
                    <Ikon nama="centang" size={16} />
                    <span>
                      <strong>{plan.maxChannels}</strong> nomor ·{" "}
                      <strong>{plan.maxAgents}</strong> asisten
                    </span>
                  </li>
                  <li>
                    <Ikon nama="centang" size={16} />
                    <span>
                      <strong>{plan.maxKnowledgeSources}</strong> catatan info
                      bisnis
                    </span>
                  </li>
                  <li>
                    <Ikon nama="centang" size={16} />
                    <span>
                      <strong>
                        {KUOTA_TANYA[plan.id].bulanan.toLocaleString("id-ID")}
                      </strong>{" "}
                      pertanyaan AI / bulan
                      <br />
                      <small>
                        Maks. {KUOTA_TANYA[plan.id].harian} / hari
                        {plan.id === "free" && ", setelah verifikasi"}
                      </small>
                    </span>
                  </li>
                </ul>
                <details className="pw-plan-details">
                  <summary>
                    Lihat semua fitur <span aria-hidden>+</span>
                  </summary>
                  <ul>
                    {plan.features.map((f) => (
                      <li key={f}>{f}</li>
                    ))}
                  </ul>
                </details>
              </article>
            ))}
          </div>
          <p className="pw-pricing-note">
            Langganan bulanan · Tanpa biaya pemasangan · Kuota AI pemilik
            terpisah dari balasan WhatsApp.
            <br />
            Model AI yang sama di semua paket. Kapasitas dan fitur tambahan
            mengikuti paket pilihanmu.
          </p>
        </div>
      </section>
      <section id="tanya" className="pw-section pw-container">
        <div className="pw-faq-grid">
          <div>
            <SectionHeading
              label="SEBELUM MULAI"
              title="Masih ada yang ingin kamu pastikan?"
            />
            <Link className="pw-text-link" href="/kontak">
              Bicara dengan tim Palwise <span aria-hidden>↗</span>
            </Link>
          </div>
          <div className="pw-faq">
            {faqs.map((f, i) => (
              <details key={`${i}-${f.t}`}>
                <summary>
                  {f.t}
                  <span aria-hidden>+</span>
                </summary>
                <p>{f.j}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
      <section className="pw-final">
        <div className="pw-container">
          <p className="pw-eyebrow">LANGKAH BERIKUTNYA, LEBIH RINGAN.</p>
          <h2>
            Bisnis tetap bergerak.
            <br />
            <span>Kamu punya ruang untuk berkembang.</span>
          </h2>
          <p>Mulai dari satu asisten. Rasakan sendiri bedanya.</p>
          <Link className="pw-button pw-button-light" href={keApp("/daftar")}>
            Buat akun gratis <span aria-hidden>↗</span>
          </Link>
          <small>Tanpa kartu kredit. Upgrade saat kamu siap.</small>
        </div>
      </section>
      <KakiHalaman />
    </main>
  );
}
