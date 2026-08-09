import { getPlan, prisma } from "@palwise/db";
import { requireUser } from "@/lib/auth";
import { KOLOM_SEMPIT, PageHeader } from "@/components/ui";
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
        sempit
        title="Nomor WhatsApp"
        description="Sambungkan nomor WhatsApp usaha kamu. Cukup scan QR dari HP, tidak perlu daftar ke Meta."
      />

      <div className={`space-y-6 py-6 ${KOLOM_SEMPIT}`}>
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
                    Asisten yang jaga nomor ini
                  </label>
                  <select
                    id={`agent-${channel.id}`}
                    name="agentId"
                    defaultValue={channel.agentId ?? ""}
                    className="input max-w-xs"
                  >
                    <option value="">Tidak ada, chat tidak dibalas otomatis</option>
                    {agents.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                        {a.isActive ? "" : " (lagi dimatikan)"}
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

        <div className="card-pad">
          <h2 className="font-semibold text-ink-900">Yang perlu kamu tahu</h2>
          <ul className="mt-3 space-y-2 text-sm leading-relaxed text-ink-600">
            <li>
              Nomornya tetap bisa kamu pakai di HP seperti biasa. Palwise cuma
              nebeng seperti WhatsApp Web.
            </li>
            <li>
              Chat grup, status, dan pesan siaran tidak disentuh. Yang dibalas cuma
              chat pribadi.
            </li>
            <li>
              Jangan dipakai kirim promo massal ke orang yang belum pernah chat
              kamu. Itu cara paling cepat bikin nomor diblokir WhatsApp.
            </li>
            <li>
              Nomor yang baru dibeli jauh lebih gampang kena batasan sementara
              daripada nomor lama. WhatsApp belum kenal nomor itu, jadi kegiatan
              yang wajar pun bisa terbaca mencurigakan. Pakai dulu beberapa hari
              seperti biasa dari HP sebelum disambungkan ke sini.
            </li>
            <li>
              Mau menguji asistennya? Pakai <strong>Coba dulu</strong>, bukan
              chat ke nomor sungguhan. Menguji dengan menyuruh dua nomor saling
              balas itu persis pola yang dibaca WhatsApp sebagai spam otomatis,
              dan nomornya bisa kena batasan beberapa jam.
            </li>
            <li>
              Kalau HP mati atau internet putus, koneksinya nyambung lagi otomatis begitu
              jaringan balik.
            </li>
            <li>Pakai nomor khusus usaha, jangan nomor pribadi.</li>
          </ul>
        </div>
      </div>
    </>
  );
}
