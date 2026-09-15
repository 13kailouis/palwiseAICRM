import { PlatformNav } from "@/components/PlatformNav";
import { getPlan, prisma } from "@palwise/db";
import { requireUser } from "@/lib/auth";
import {
  FormDuaKolom,
  KOLOM_FORM,
  PageHeader,
  PanelBantuan,
} from "@/components/ui";
import { WhatsAppConnect } from "@/components/WhatsAppConnect";
import { AddChannel } from "@/components/AddChannel";
import { TombolHapus } from "@/components/TombolHapus";
import { assignAgentAction, deleteChannelAction } from "@/app/actions/channel";
import { Kosong } from "@/components/Kosong";

export const dynamic = "force-dynamic";

export default async function WhatsAppPage() {
  const user = await requireUser();

  const [workspace, channels, agents] = await Promise.all([
    prisma.workspace.findUniqueOrThrow({ where: { id: user.workspaceId } }),
    prisma.channel.findMany({
      where: { workspaceId: user.workspaceId },
      orderBy: { createdAt: "asc" },
    }),
    prisma.agent.findMany({
      where: { workspaceId: user.workspaceId },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const plan = getPlan(workspace.plan);

  return (
    <>
      <PageHeader
        kolom={KOLOM_FORM}
        title="Nomor WhatsApp"
        description="Hubungkan nomor bisnis, pilih asisten, dan kelola sambungan di satu tempat."
      />

      <PlatformNav active="/app/whatsapp" kind="setup" />

      <FormDuaKolom
        bantuan={
          <PanelBantuan
            judul="Panduan sambungan"
            poin={[
              {
                ikon: "whatsapp",
                teks: "Hubungkan melalui Perangkat tertaut di WhatsApp. Nomor tetap bisa digunakan dari HP.",
              },
              {
                ikon: "silang",
                teks: "Gunakan untuk melayani pelanggan yang menghubungimu. Hindari pesan massal tanpa persetujuan penerima.",
              },
              {
                ikon: "coba",
                teks: (
                  <>
                    Uji jawaban lewat <strong>Coba dulu</strong> sebelum
                    melayani pelanggan melalui nomor yang tersambung.
                  </>
                ),
              },
              {
                ikon: "info",
                teks: "Sebaiknya gunakan nomor khusus bisnis agar layanan pelanggan mudah dikelola bersama tim.",
              },
            ]}
            tautan={{ href: "/app/coba", label: "Buka Coba dulu" }}
          />
        }
      >
        <div className="space-y-6">
          <div className="pw-page-intro">
            <span className="pw-eyebrow">SALURAN PELANGGAN</span>
            <h2>Kelola WhatsApp bisnismu.</h2>
            <p>
              {channels.length} dari {plan.maxChannels} nomor digunakan · Paket{" "}
              {plan.name}
            </p>
          </div>
          {channels.length === 0 && (
            <div className="card">
              <Kosong
                ikon="whatsapp"
                judul="Belum ada nomor"
                kalimat="Tambahkan nomor pertama kamu lewat kotak di bawah."
              />
            </div>
          )}

          {channels.map((channel) => (
            <WhatsAppConnect
              key={channel.id}
              channelId={channel.id}
              channelName={channel.name}
              initialStatus={channel.status}
              initialPhone={channel.phoneNumber}
              deleteSlot={
                channels.length > 1 ? (
                  <TombolHapus
                    action={deleteChannelAction}
                    fields={{ channelId: channel.id }}
                    konfirmasi={`Hapus "${channel.name}"? Nomornya dilepas dari Palwise dan chat yang masuk ke situ berhenti dibalas. Riwayat obrolannya tetap tersimpan.`}
                  />
                ) : null
              }
              agentSlot={
                <form
                  action={assignAgentAction}
                  className="flex flex-wrap items-end gap-3"
                >
                  <input type="hidden" name="channelId" value={channel.id} />
                  <div>
                    <label className="label" htmlFor={`agent-${channel.id}`}>
                      Asisten untuk nomor ini
                    </label>
                    <select
                      id={`agent-${channel.id}`}
                      name="agentId"
                      defaultValue={channel.agentId ?? ""}
                      className="input max-w-xs"
                    >
                      <option value="">
                        Tidak ada, chat tidak dibalas otomatis
                      </option>
                      {agents.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                          {a.isActive ? "" : " (nonaktif)"}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button className="btn-ghost" type="submit">
                    Simpan
                  </button>
                </form>
              }
            />
          ))}

          <AddChannel
            used={channels.length}
            max={plan.maxChannels}
            planName={plan.name}
          />

          {/* Catatan yang tidak muat di poin panel kanan, tapi tetap perlu ada:
            dilipat supaya tidak jadi tembok buat yang cuma mau scan QR. */}
          <details className="card group">
            <summary className="tap-aman flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3.5 text-sm font-medium text-ink-800 sm:px-5">
              Tentang pesan & sambungan
              <span
                className="shrink-0 text-ink-400 transition-transform group-open:rotate-180"
                style={{ transitionDuration: "var(--gerak-cepat)" }}
                aria-hidden="true"
              >
                <svg
                  viewBox="0 0 24 24"
                  width="16"
                  height="16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </span>
            </summary>
            <ul className="space-y-2 border-t border-ink-100 px-4 py-4 text-sm leading-relaxed text-ink-600 sm:px-5">
              <li>
                Chat grup, status, dan pesan siaran tidak disentuh. Yang dibalas
                cuma chat pribadi.
              </li>
              <li>
                Jika sambungan terputus, periksa status di halaman ini. Kamu
                mungkin perlu menautkan ulang nomor melalui QR.
              </li>
            </ul>
          </details>
        </div>
      </FormDuaKolom>
    </>
  );
}
