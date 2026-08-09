import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { prisma } from "@palwise/db";

const COOKIE = "palwise_session";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 hari

function secret(): Uint8Array {
  const value = process.env.AUTH_SECRET;
  if (!value) {
    throw new Error("AUTH_SECRET belum diisi di file .env");
  }
  return new TextEncoder().encode(value);
}

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: string;
  workspaceId: string;
}

export async function createSession(userId: string) {
  // Nomor sesi ikut dititipkan di dalam tanda login. Waktu password diganti,
  // nomornya naik, dan semua tanda login lama otomatis basi.
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { sessionVersion: true },
  });

  const token = await new SignJWT({ sub: userId, sv: user.sessionVersion })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());

  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function destroySession() {
  (await cookies()).delete(COOKIE);
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, secret());
    const userId = String(payload.sub ?? "");
    if (!userId) return null;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return null;

    // Tanda login yang dibuat sebelum password terakhir diganti ditolak.
    // Tanda login lama sekali (dari sebelum fitur ini ada) tidak membawa
    // nomor sama sekali, dan itu dianggap nomor 0.
    const nomorSesi = typeof payload.sv === "number" ? payload.sv : 0;
    if (nomorSesi !== user.sessionVersion) return null;

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      workspaceId: user.workspaceId,
    };
  } catch {
    return null;
  }
}

/** Dipakai di setiap halaman dashboard. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/masuk");
  return user;
}

export function hashPassword(plain: string) {
  return bcrypt.hash(plain, 10);
}

export function verifyPassword(plain: string, hash: string) {
  return bcrypt.compare(plain, hash);
}
