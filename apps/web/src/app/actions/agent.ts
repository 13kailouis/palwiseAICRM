"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { bolehPakai, getPlan, pesanTerkunci, prisma } from "@palwise/db";
import { requireUser } from "@/lib/auth";
import { penandaTersisa } from "@/lib/preset";

export interface FormState {
  ok?: boolean;
  error?: string;
  message?: string;
}

function num(fd: FormData, key: string, fallback: number, min: number, max: number) {
  const raw = Number(fd.get(key));
  if (!Number.isFinite(raw)) return fallback;
  return Math.min(max, Math.max(min, raw));
}

/** Pastikan agent yang diedit memang milik workspace user. */
async function assertOwned(agentId: string, workspaceId: string) {
  const agent = await prisma.agent.findFirst({
    where: { id: agentId, workspaceId },
  });
  if (!agent) throw new Error("Asisten ini bukan milik akun kamu.");
  return agent;
}

const NEW_AGENT_PROMPT = `Kamu pegawai {{BISNIS}}, namamu Sari.

TUGASMU
- Menjawab pertanyaan pelanggan dengan jelas dan singkat.
- Menggali kebutuhannya lalu mengarahkan ke pemesanan.

GAYA BICARA
- Ramah dan santai, panggil pelanggan pakai "kak".
- Balasan singkat, maksimal 3 kalimat.
- Jangan pernah mengarang harga atau stok. Kalau tidak tahu, bilang mau dicek dulu ke tim.

BATASAN
- Jangan menjawab pertanyaan yang tidak ada hubungannya dengan {{BISNIS}}.`;

export async function createAgentAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  let newId: string;

  // redirect() bekerja dengan melempar error khusus, jadi dia harus dipanggil
  // di luar try/catch supaya tidak ikut tertangkap.
  try {
    const user = await requireUser();

    const workspace = await prisma.workspace.findUniqueOrThrow({
      where: { id: user.workspaceId },
    });
    const plan = getPlan(workspace.plan);

    const used = await prisma.agent.count({
      where: { workspaceId: user.workspaceId },
    });
    if (used >= plan.maxAgents) {
      return {
        error: `Paket ${plan.name} muat ${plan.maxAgents} asisten. Naikkan paket dulu kalau mau nambah.`,
      };
    }

    const name = String(formData.get("name") ?? "").trim();
    if (!name) return { error: "Kasih nama dulu buat asistennya." };

    const created = await prisma.agent.create({
      data: {
        workspaceId: user.workspaceId,
        name: name.slice(0, 60),
        behaviorPrompt: NEW_AGENT_PROMPT.replaceAll("{{BISNIS}}", workspace.name),
        welcomeMessage: `Halo kak! 👋 Terima kasih sudah menghubungi ${workspace.name}.\nAda yang bisa saya bantu?`,
        handoffCondition:
          "Kalau pelanggan minta bicara dengan orangnya langsung, komplain berat, atau menanyakan hal yang tidak kamu tahu.",
      },
    });

    newId = created.id;
    revalidatePath("/app/agent");
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Gagal membuat asisten." };
  }

  redirect(`/app/agent?a=${newId}`);
}

export async function deleteAgentAction(formData: FormData) {
  const user = await requireUser();
  const agentId = String(formData.get("agentId") ?? "");

  const count = await prisma.agent.count({ where: { workspaceId: user.workspaceId } });
  // Selalu sisakan minimal satu asisten, kalau tidak semua nomor jadi bisu.
  if (count <= 1) return;

  const agent = await prisma.agent.findFirst({
    where: { id: agentId, workspaceId: user.workspaceId },
  });
  if (!agent) return;

  // Nomor yang dijaga asisten ini dipindahkan, bukan dibiarkan kosong. Kolom
  // kosong sekarang berarti "sengaja tidak dibalas otomatis", jadi kalau
  // dibiarkan begitu, menghapus asisten diam-diam membuat nomornya bisu.
  const pengganti = await prisma.agent.findFirst({
    where: { workspaceId: user.workspaceId, id: { not: agentId } },
    orderBy: { createdAt: "asc" },
  });
  if (pengganti) {
    await prisma.channel.updateMany({
      where: { agentId },
      data: { agentId: pengganti.id },
    });
  }

  await prisma.agent.delete({ where: { id: agentId } });
  revalidatePath("/app/agent");
  revalidatePath("/app/whatsapp");
  redirect("/app/agent");
}

export async function saveAgentAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    const user = await requireUser();
    const agentId = String(formData.get("agentId") ?? "");
    await assertOwned(agentId, user.workspaceId);

    const workspace = await prisma.workspace.findUniqueOrThrow({
      where: { id: user.workspaceId },
    });

    // Ditolak di server, bukan cuma disembunyikan di layar.
    //
    // Menyembunyikan tombol itu bukan mengunci. Formulir ini bisa dikirim
    // langsung tanpa membuka halamannya sama sekali, jadi kalau pengecekannya
    // cuma ada di tampilan, kuncinya tidak ada.
    const mintaSapa =
      formData.get("followUpEnabled") === "on" ||
      formData.get("afterSalesEnabled") === "on" ||
      formData.get("restockEnabled") === "on" ||
      formData.get("pengingatEnabled") === "on";
    if (mintaSapa && !bolehPakai(workspace.plan, "sapaOtomatis")) {
      return { error: pesanTerkunci("sapaOtomatis", workspace.plan) };
    }
    if (
      formData.get("officeHoursEnabled") === "on" &&
      !bolehPakai(workspace.plan, "jamKerja")
    ) {
      return { error: pesanTerkunci("jamKerja", workspace.plan) };
    }

    const behaviorPrompt = String(formData.get("behaviorPrompt") ?? "").trim();
    if (behaviorPrompt.length < 20) {
      return {
        error:
          "Keterangannya terlalu pendek. Jelaskan dulu siapa dia dan apa tugasnya, minimal beberapa kalimat.",
      };
    }

    // Penanda contoh yang belum diganti DITOLAK, bukan disimpan diam-diam.
    //
    // Sapaan pertama dikirim apa adanya ke pelanggan, jadi satu penanda yang
    // lupa diganti bikin orang menerima "Selamat datang di [nama toko]." dari
    // nomor resmi usahanya sendiri. Preset sekarang mengisi namanya sendiri,
    // tapi pemeriksaan ini tetap perlu untuk dua hal yang tidak lewat situ:
    // prompt yang sudah terlanjur tersimpan sebelum hari ini, dan formulir yang
    // dikirim langsung tanpa membuka halamannya.
    //
    // Diperiksa di SEMUA kolom yang berisi kalimat, bukan cuma sapaan.
    // Penanda di prompt sapaan otomatis tidak kalah buruk: modelnya menulis
    // ulang penanda itu berbulan-bulan kemudian, waktu tidak ada yang melihat.
    const KOLOM_KALIMAT: [string, string][] = [
      ["Cara kerja dan gaya bicara", behaviorPrompt],
      ["Sapaan pertama", String(formData.get("welcomeMessage") ?? "")],
      ["Kapan panggil kamu", String(formData.get("handoffCondition") ?? "")],
      ["Pesan follow up", String(formData.get("followUpPrompt") ?? "")],
      ["Pesan tanya kabar", String(formData.get("afterSalesPrompt") ?? "")],
      ["Pesan ajak beli lagi", String(formData.get("restockPrompt") ?? "")],
      ["Pesan pengingat janji", String(formData.get("pengingatPrompt") ?? "")],
    ];

    for (const [judul, isi] of KOLOM_KALIMAT) {
      const sisa = penandaTersisa(isi);
      if (sisa.length > 0) {
        return {
          error: `Di kotak "${judul}" masih ada ${sisa.join(" dan ")} yang belum diganti. Tulis nama usahamu di situ dulu, kalau tidak pelanggan akan menerima tulisan itu apa adanya.`,
        };
      }
    }

    await prisma.agent.update({
      where: { id: agentId },
      data: {
        name: String(formData.get("name") ?? "").trim() || "AI Agent",
        behaviorPrompt,
        welcomeMessage: String(formData.get("welcomeMessage") ?? "").trim(),
        handoffCondition: String(formData.get("handoffCondition") ?? "").trim(),
        splitBubbles: formData.get("splitBubbles") === "on",
        temperature: num(formData, "temperature", 0.4, 0, 1),
        typingSpeedMs: num(formData, "typingSpeedMs", 25, 0, 120),
        isActive: formData.get("isActive") === "on",

        officeHoursEnabled: formData.get("officeHoursEnabled") === "on",
        officeHoursStart: String(formData.get("officeHoursStart") ?? "09:00"),
        officeHoursEnd: String(formData.get("officeHoursEnd") ?? "17:00"),

        followUpEnabled: formData.get("followUpEnabled") === "on",
        followUpAfterHours: num(formData, "followUpAfterHours", 24, 1, 720),
        followUpMaxAttempts: num(formData, "followUpMaxAttempts", 2, 1, 5),
        followUpPrompt: String(formData.get("followUpPrompt") ?? "").trim(),

        afterSalesEnabled: formData.get("afterSalesEnabled") === "on",
        afterSalesAfterDays: num(formData, "afterSalesAfterDays", 3, 1, 60),
        afterSalesPrompt: String(formData.get("afterSalesPrompt") ?? "").trim(),

        restockEnabled: formData.get("restockEnabled") === "on",
        restockAfterDays: num(formData, "restockAfterDays", 30, 3, 365),
        restockPrompt: String(formData.get("restockPrompt") ?? "").trim(),

        pengingatEnabled: formData.get("pengingatEnabled") === "on",
        pengingatJamSebelum: num(formData, "pengingatJamSebelum", 24, 1, 168),
        pengingatPrompt: String(formData.get("pengingatPrompt") ?? "").trim(),
      },
    });

    revalidatePath("/app/agent");
    return { ok: true, message: "Sudah tersimpan." };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Gagal menyimpan." };
  }
}
