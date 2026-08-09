import { bolehPakai, type Agent } from "@palwise/db";
import { env } from "../env.js";

function minutesNowIn(timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());

  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  return hour * 60 + minute;
}

function parseHHmm(value: string, fallback: number): number {
  const m = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!m) return fallback;
  return Number(m[1]) * 60 + Number(m[2]);
}

/**
 * Mode "AI Working Hours" seperti di Cekat: selama jam kerja, chat dipegang
 * tim manusia; di luar jam kerja AI yang ambil alih penuh.
 *
 * @returns true kalau AI boleh membalas sekarang.
 */
export function aiMayReplyNow(agent: Agent, plan?: string): boolean {
  if (!agent.officeHoursEnabled) return true;

  // Pengaman turun paket. Setelan jam kerja yang dulu dinyalakan waktu masih
  // Growth tetap tersimpan di database, dan kalau tidak diperiksa lagi di sini,
  // pengguna paket gratis tetap menikmati fiturnya. Kalau paketnya tidak
  // berhak, jadwalnya diabaikan dan AI membalas seperti biasa. Sengaja
  // diabaikan, bukan dibalik jadi diam: pelanggan tidak boleh jadi korban
  // urusan paket.
  if (plan !== undefined && !bolehPakai(plan, "jamKerja")) return true;

  const now = minutesNowIn(env.TIMEZONE);
  const start = parseHHmm(agent.officeHoursStart, 9 * 60);
  const end = parseHHmm(agent.officeHoursEnd, 17 * 60);

  const insideOfficeHours =
    start <= end
      ? now >= start && now < end
      : // Rentang yang melewati tengah malam, mis. 20:00–06:00
        now >= start || now < end;

  return !insideOfficeHours;
}
