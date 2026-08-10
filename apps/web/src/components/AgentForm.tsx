"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { type Agent, type Fitur } from "@palwise/db";
import { saveAgentAction, type FormState } from "@/app/actions/agent";
import { SaveBar } from "@/components/SaveBar";
import { PresetUsaha } from "@/components/PresetUsaha";

function Section({
  title,
  description,
  terkunci,
  children,
}: {
  title: string;
  description?: string;
  /** Nama paket yang dibutuhkan. Kosong berarti bagian ini tidak terkunci. */
  terkunci?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="card-pad">
      <h2 className="font-semibold text-ink-900">{title}</h2>
      {description && (
        /* max-w-prose = 65 karakter. Kolom isian boleh lebih lebar karena
           isinya sering daftar pendek, tapi paragraf keterangan ini prosa
           sungguhan dan pantas dibatasi seketat bacaan. */
        <p className="mb-5 mt-1 max-w-prose text-sm leading-relaxed text-ink-500">
          {description}
        </p>
      )}

      {/* Pemberitahuannya di DALAM kartu, tepat di bawah judul.

          Dulu ditaruh di bawah bagiannya, dan hasilnya membingungkan: waktu
          digulir, kotak "Ada mulai paket Growth" muncul lebih dulu daripada
          bagian berikutnya, jadi kelihatan seperti milik bagian di bawahnya
          padahal milik yang di atas. Penanda harus menempel pada yang
          ditandainya, bukan menggantung di antara dua hal. */}
      {terkunci && (
        <div className="mb-5 flex flex-wrap items-center gap-3 rounded-lg border border-ink-200 bg-ink-50 px-4 py-3">
          <p className="flex-1 text-sm leading-relaxed text-ink-700">
            Bagian ini belum termasuk paket kamu. Ada mulai paket{" "}
            <span className="font-medium text-ink-900">{terkunci}</span>.
          </p>
          <Link href="/app/tagihan" className="btn-ink shrink-0 px-4 py-1.5 text-xs">
            Naikkan paket
          </Link>
        </div>
      )}

      {/* fieldset disabled, bukan sekadar diredupkan. pointer-events cuma
          memblokir mouse: kotak centangnya tetap ada di formulir dan tetap
          ikut terkirim kalau dicentang lewat konsol. Dengan disabled, kolomnya
          tidak ikut terkirim sama sekali. Server tetap memeriksa ulang, karena
          tampilan tidak pernah boleh jadi satu-satunya kunci. */}
      <fieldset
        disabled={!!terkunci}
        className={[
          terkunci ? "select-none opacity-45" : "",
          description ? "space-y-5" : "mt-5 space-y-5",
        ].join(" ")}
      >
        {children}
      </fieldset>
    </section>
  );
}

/**
 * Kotak isian yang tingginya mengikuti isinya.
 *
 * Kotak bertinggi tetap yang isinya lebih panjang jadi bisa digulir sendiri di
 * dalam, dan itu menjebak roda tetikus: waktu orang menggulir halaman dan
 * kursornya kebetulan lewat di atas kotak ini, yang tergulir kotaknya, bukan
 * halamannya. Kotak lalu tertinggal di posisi tengah dan terlihat terpotong,
 * padahal isinya utuh.
 *
 * Dengan tinggi yang mengikuti isi, kotaknya tidak pernah punya gulirannya
 * sendiri, jadi tidak ada yang bisa dijebak. Isi panjang cuma bikin halamannya
 * lebih panjang, dan itu perilaku yang sudah orang mengerti.
 */
function IsianTumbuh({
  name,
  id,
  defaultValue,
  minRows = 10,
  className,
}: {
  name: string;
  id: string;
  defaultValue: string;
  minRows?: number;
  className: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  const sesuaikan = () => {
    const el = ref.current;
    if (!el) return;
    // Dinolkan dulu, kalau tidak tingginya cuma bisa bertambah dan tidak
    // pernah menyusut lagi waktu tulisannya dihapus.
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  };

  useEffect(sesuaikan, []);

  return (
    <textarea
      ref={ref}
      id={id}
      name={name}
      rows={minRows}
      defaultValue={defaultValue}
      onInput={sesuaikan}
      className={className + " overflow-hidden"}
    />
  );
}

function Toggle({
  name,
  label,
  hint,
  defaultChecked,
  onChange,
}: {
  name: string;
  label: string;
  hint?: string;
  defaultChecked?: boolean;
  onChange?: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        onChange={(e) => onChange?.(e.target.checked)}
        className="mt-0.5 h-4 w-4 rounded border-ink-300 text-brand-600 focus:ring-brand-500"
      />
      <span>
        <span className="text-sm font-medium text-ink-800">{label}</span>
        {hint && <span className="mt-0.5 block text-xs text-ink-500">{hint}</span>}
      </span>
    </label>
  );
}

export function AgentForm({
  agent,
  namaBisnis,
  fiturAktif,
  paketFitur,
}: {
  agent: Agent;
  /** Dipakai preset untuk mengisi sendiri nama usahanya, bukan disuruh diketik. */
  namaBisnis: string;
  /** Fitur yang boleh dipakai paket workspace ini. */
  fiturAktif: Fitur[];
  /** Nama paket termurah yang punya tiap fitur, untuk kalimat ajakan. */
  paketFitur: Record<string, string>;
}) {
  const boleh = (f: Fitur) => fiturAktif.includes(f);
  const paketUntuk = (f: Fitur) => paketFitur[f] ?? "Starter";

  const [state, formAction] = useActionState(saveAgentAction, {} as FormState);
  const [officeHours, setOfficeHours] = useState(agent.officeHoursEnabled);
  const [followUp, setFollowUp] = useState(agent.followUpEnabled);
  const [afterSales, setAfterSales] = useState(agent.afterSalesEnabled);
  const [restock, setRestock] = useState(agent.restockEnabled);
  const [pengingat, setPengingat] = useState(agent.pengingatEnabled);

  return (
    /* Lebar baca dibatasi.
     *
     * Di layar 1440px, satu baris di sini memuat 154 karakter. Batas nyaman
     * baca 45 sampai 75. Yang bikin lelah bukan panjangnya kalimat, tapi
     * perjalanan mata waktu pindah baris: dari ujung kanan dia harus balik
     * lebih dari seribu piksel ke kiri, dan sering mendarat di baris yang
     * salah.
     *
     * Halaman jadi punya ruang kosong di kanan, dan itu bukan kekurangan.
     * Tepi kiri yang tetap di satu tempat justru yang bikin matanya tidak
     * perlu mencari. */
    <form
      action={formAction}
      className="mx-auto w-full max-w-3xl space-y-6 px-5 py-6 sm:px-6"
    >
      <input type="hidden" name="agentId" value={agent.id} />

      {/* Paling atas, sebelum kotak mana pun.

          Yang bikin produk umum terasa tumpul bukan mesinnya, tapi layar kosong
          yang menyuruh orang mengarang kalimat pertamanya sendiri. Pemilik
          klinik membuka kotak "Cara kerja dan gaya bicara", melihatnya kosong,
          lalu menutup tab. Ini yang menutup jarak itu tanpa memecah kodenya
          jadi produk-produk terpisah per bidang usaha. */}
      <PresetUsaha namaBisnis={namaBisnis} />

      <Section
        title="Cara dia bicara"
        description="Ini bagian paling penting. Tulis seperti kamu sedang melatih karyawan baru: siapa dia, gaya bicaranya bagaimana, dan apa yang harus ditanyakan ke pelanggan. Makin jelas, makin bagus hasilnya."
      >
        <div>
          <label className="label" htmlFor="name">
            Nama asisten
          </label>
          <input id="name" name="name" className="input" defaultValue={agent.name} />
          <p className="hint max-w-prose">Buat catatan kamu sendiri, pelanggan tidak melihat ini.</p>
        </div>

        <div>
          <label className="label" htmlFor="behaviorPrompt">
            Cara kerja dan gaya bicara
          </label>
          <IsianTumbuh
            id="behaviorPrompt"
            name="behaviorPrompt"
            minRows={12}
            className="textarea-prosa"
            defaultValue={agent.behaviorPrompt}
          />
          {/* Dua contoh, sengaja dari dua jenis usaha yang berbeda.

              Dengan satu contoh toko kopi saja, orang klinik dan penjual jasa
              menyalin bentuknya mentah-mentah atau malah ragu produk ini untuk
              mereka. Contoh kedua lebih murah daripada halaman bantuan. */}
          <p className="hint max-w-prose">
            Tulis pakai bahasa sehari-hari, siapa dia dan mau bersikap seperti
            apa. Contoh toko: &ldquo;Kamu pegawai toko Kopi Nusantara, namanya
            Nara. Ramah dan santai, panggil pelanggan pakai &lsquo;kak&rsquo;.
            Kalau ada yang baru chat, tanyakan dulu namanya dan mau cari kopi
            seperti apa.&rdquo; Contoh jasa: &ldquo;Kamu resepsionis Klinik Sehat
            Bunda, namanya Dina. Sopan dan menenangkan. Bantu pasien tahu jadwal
            dokter dan cara daftar, jangan pernah memberi saran medis.&rdquo;
          </p>
        </div>

        <div>
          <label className="label" htmlFor="welcomeMessage">
            Sapaan pertama
          </label>
          <textarea
            id="welcomeMessage"
            name="welcomeMessage"
            rows={3}
            className="input resize-y"
            defaultValue={agent.welcomeMessage}
          />
          <p className="hint max-w-prose">
            Dikirim sekali saat ada orang chat pertama kali. Kosongkan kalau tidak
            mau pakai.
          </p>
        </div>

        <Toggle
          name="isActive"
          label="Asisten sedang bekerja"
          hint="Matikan kalau mau semua chat dipegang tim kamu dulu."
          defaultChecked={agent.isActive}
        />
      </Section>

      <Section
        title="Kapan harus panggil kamu"
        description="Ada hal yang lebih baik ditangani orang. Tulis di sini kapan dia harus berhenti dan menandai obrolan supaya kamu yang lanjutkan."
      >
        <div>
          <label className="label" htmlFor="handoffCondition">
            Situasi yang harus dilempar ke kamu
          </label>
          <textarea
            id="handoffCondition"
            name="handoffCondition"
            rows={4}
            className="input resize-y"
            defaultValue={agent.handoffCondition}
          />
          <p className="hint max-w-prose">
            Contoh: &ldquo;Kalau pelanggan sudah kirim bukti transfer, nanya harga
            grosir, atau komplain berat.&rdquo;
          </p>
        </div>
      </Section>

      <Section
        terkunci={boleh("jamKerja") ? undefined : paketUntuk("jamKerja")}
        title="Jam kerja tim"
        description="Kalau dinyalakan, selama jam kerja chat dibiarkan buat tim kamu. Lewat jam itu baru asisten yang balas."
      >
        <Toggle
          name="officeHoursEnabled"
          label="Ikut jam kerja"
          hint="Kalau dimatikan, dia balas terus 24 jam."
          defaultChecked={agent.officeHoursEnabled}
          onChange={setOfficeHours}
        />
        {officeHours && (
          <div className="grid max-w-sm grid-cols-2 gap-4">
            <div>
              <label className="label" htmlFor="officeHoursStart">
                Buka jam
              </label>
              <input
                id="officeHoursStart"
                name="officeHoursStart"
                type="time"
                className="input"
                defaultValue={agent.officeHoursStart}
              />
            </div>
            <div>
              <label className="label" htmlFor="officeHoursEnd">
                Tutup jam
              </label>
              <input
                id="officeHoursEnd"
                name="officeHoursEnd"
                type="time"
                className="input"
                defaultValue={agent.officeHoursEnd}
              />
            </div>
          </div>
        )}
      </Section>

      <Section
        terkunci={boleh("sapaOtomatis") ? undefined : paketUntuk("sapaOtomatis")}
        title="Sapa lagi yang menghilang sebelum beli"
        description="Banyak calon pembeli nanya-nanya lalu diam. Kalau dinyalakan, mereka disapa lagi otomatis. Yang sudah beli tidak kena ini, ada bagiannya sendiri di bawah."
      >
        <Toggle
          name="followUpEnabled"
          label="Sapa lagi kalau pelanggan diam"
          defaultChecked={agent.followUpEnabled}
          onChange={setFollowUp}
        />
        {followUp && (
          <>
            <div className="grid max-w-sm grid-cols-2 gap-4">
              <div>
                <label className="label" htmlFor="followUpAfterHours">
                  Diam berapa jam
                </label>
                <input
                  id="followUpAfterHours"
                  name="followUpAfterHours"
                  type="number"
                  min={1}
                  max={720}
                  className="input"
                  defaultValue={agent.followUpAfterHours}
                />
              </div>
              <div>
                <label className="label" htmlFor="followUpMaxAttempts">
                  Disapa maksimal
                </label>
                <input
                  id="followUpMaxAttempts"
                  name="followUpMaxAttempts"
                  type="number"
                  min={1}
                  max={5}
                  className="input"
                  defaultValue={agent.followUpMaxAttempts}
                />
                <p className="hint max-w-prose">Kali. Jangan kebanyakan, nanti dianggap ganggu.</p>
              </div>
            </div>
            <div>
              <label className="label" htmlFor="followUpPrompt">
                Mau disapa seperti apa
              </label>
              <textarea
                id="followUpPrompt"
                name="followUpPrompt"
                rows={3}
                className="input resize-y"
                defaultValue={agent.followUpPrompt}
              />
            </div>
          </>
        )}
      </Section>

      <Section
        terkunci={boleh("sapaOtomatis") ? undefined : paketUntuk("sapaOtomatis")}
        title="Jaga hubungan setelah pembeli"
        description="Yang di atas mengejar orang yang belum jadi beli. Yang di sini menjaga orang yang sudah beli, dan biasanya mereka yang paling gampang diajak beli lagi. Berjalan otomatis begitu pelanggan masuk tahap selesai."
      >
        {/* Label di sini sengaja tidak menyebut barang kiriman.

            Fiturnya cuma sapaan berjadwal, dan itu berguna buat siapa pun. Tapi
            waktu labelnya mengandaikan ada paket yang dikirim dan diterima,
            klinik, salon, dan penjual jasa membacanya sebagai fitur yang bukan
            untuk mereka, lalu tidak pernah menyalakannya. Yang hilang bukan
            kalimatnya, tapi fiturnya. */}
        <Toggle
          name="afterSalesEnabled"
          label="Tanya kabar setelah urusannya beres"
          hint="Memastikan barangnya sampai, layanannya memuaskan, atau jadwalnya jalan lancar. Belum jualan apa-apa."
          defaultChecked={agent.afterSalesEnabled}
          onChange={setAfterSales}
        />
        {afterSales && (
          <>
            <div className="max-w-[200px]">
              <label className="label" htmlFor="afterSalesAfterDays">
                Berapa hari setelah selesai
              </label>
              <input
                id="afterSalesAfterDays"
                name="afterSalesAfterDays"
                type="number"
                min={1}
                max={60}
                className="input"
                defaultValue={agent.afterSalesAfterDays}
              />
            </div>
            <div>
              <label className="label" htmlFor="afterSalesPrompt">
                Mau ditanya apa
              </label>
              <textarea
                id="afterSalesPrompt"
                name="afterSalesPrompt"
                rows={3}
                className="input resize-y"
                defaultValue={agent.afterSalesPrompt}
              />
            </div>
          </>
        )}

        <div className="border-t border-ink-100 pt-5">
          <Toggle
            name="restockEnabled"
            label="Ajak balik lagi kalau sudah waktunya"
            hint="Buat yang dipakai sampai habis seperti kopi atau skincare, dan buat yang memang berulang seperti kontrol ke klinik, servis rutin, atau potong rambut."
            defaultChecked={agent.restockEnabled}
            onChange={setRestock}
          />
        </div>
        {restock && (
          <>
            <div className="max-w-[200px]">
              <label className="label" htmlFor="restockAfterDays">
                Jarak sebelum diajak lagi
              </label>
              <input
                id="restockAfterDays"
                name="restockAfterDays"
                type="number"
                min={3}
                max={365}
                className="input"
                defaultValue={agent.restockAfterDays}
              />
              <p className="hint max-w-prose">
                Hari. Kalau yang kamu jual habis dipakai, isi sesuai umur
                pakainya. Kalau layanan, isi jarak wajar antar kunjungan.
              </p>
            </div>
            <div>
              <label className="label" htmlFor="restockPrompt">
                Mau diajak seperti apa
              </label>
              <textarea
                id="restockPrompt"
                name="restockPrompt"
                rows={3}
                className="input resize-y"
                defaultValue={agent.restockPrompt}
              />
            </div>
          </>
        )}
      </Section>

      <Section
        terkunci={boleh("sapaOtomatis") ? undefined : paketUntuk("sapaOtomatis")}
        title="Ingatkan sebelum janji temu"
        description="Buat yang pelanggannya datang atau ketemu online: klinik, salon, bengkel, properti, kursus. Jadwal yang dicatat asisten diingatkan sendiri sebelum harinya tiba."
      >
        <Toggle
          name="pengingatEnabled"
          label="Ingatkan pelanggan sebelum janjinya"
          hint="Cuma untuk jadwal yang sudah kamu pastikan. Yang masih berstatus permintaan tidak pernah diingatkan, karena kamu sendiri belum menyetujuinya."
          defaultChecked={agent.pengingatEnabled}
          onChange={setPengingat}
        />
        {pengingat && (
          <>
            <div className="max-w-[200px]">
              <label className="label" htmlFor="pengingatJamSebelum">
                Berapa jam sebelumnya
              </label>
              <input
                id="pengingatJamSebelum"
                name="pengingatJamSebelum"
                type="number"
                min={1}
                max={168}
                className="input"
                defaultValue={agent.pengingatJamSebelum}
              />
              <p className="hint max-w-prose">
                Jam. 24 berarti diingatkan sehari sebelumnya.
              </p>
            </div>
            <div>
              <label className="label" htmlFor="pengingatPrompt">
                Mau diingatkan seperti apa
              </label>
              <textarea
                id="pengingatPrompt"
                name="pengingatPrompt"
                rows={3}
                className="input resize-y"
                defaultValue={agent.pengingatPrompt}
              />
              <p className="hint max-w-prose">
                Hari dan jamnya disuapkan ke asisten dalam bentuk jadi, jadi dia
                tidak perlu menghitung sendiri dan tidak bisa salah menyebut
                tanggal.
              </p>
            </div>
          </>
        )}
      </Section>

      <Section title="Cara membalas">
        <Toggle
          name="splitBubbles"
          label="Pecah jawaban panjang jadi beberapa pesan"
          hint="Lebih enak dibaca di HP dan terasa seperti diketik orang."
          defaultChecked={agent.splitBubbles}
        />

        <div className="grid max-w-sm grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="temperature">
              Kebebasan menjawab
            </label>
            <input
              id="temperature"
              name="temperature"
              type="number"
              step="0.1"
              min={0}
              max={1}
              className="input"
              defaultValue={agent.temperature}
            />
            <p className="hint max-w-prose">
              Isi 0 kalau mau jawabannya kaku tapi seragam. 0,4 paling pas.
            </p>
          </div>
          <div>
            <label className="label" htmlFor="typingSpeedMs">
              Jeda sebelum balas
            </label>
            <input
              id="typingSpeedMs"
              name="typingSpeedMs"
              type="number"
              min={0}
              max={120}
              className="input"
              defaultValue={agent.typingSpeedMs}
            />
            <p className="hint max-w-prose">Isi 0 kalau mau balas langsung. 25 terasa wajar.</p>
          </div>
        </div>
      </Section>

      <SaveBar state={state} />
    </form>
  );
}
