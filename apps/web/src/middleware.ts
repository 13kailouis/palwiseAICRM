import { NextResponse, type NextRequest } from "next/server";
import { ALAMAT_APP, ALAMAT_SITUS, DIPISAH, milikApp } from "@/lib/situs";

/**
 * Pengarah lalu lintas antara halaman jualan dan dashboard.
 *
 * Satu aplikasi melayani dua alamat. Berkas ini yang memastikan tiap halaman
 * muncul di alamat yang benar:
 *
 *   palwise.id/app        -> dilempar ke app.palwise.id/app
 *   app.palwise.id/       -> dilempar ke app.palwise.id/app
 *
 * Yang dilempar cuma alamat yang diketik atau diklik orang. Permintaan dari
 * dalam halaman yang sudah terbuka (/api, berkas Next.js, gambar) tidak
 * disentuh sama sekali, karena melemparnya ke alamat lain akan menggagalkan
 * permintaan itu dan halamannya rusak di tengah jalan.
 *
 * Kalau alamatnya belum dipisah di .env, berkas ini tidak melakukan apa-apa.
 */

function hostSaja(nilai: string): string {
  try {
    return new URL(nilai).host.toLowerCase();
  } catch {
    return "";
  }
}

const HOST_APP = hostSaja(ALAMAT_APP);
const HOST_SITUS = hostSaja(ALAMAT_SITUS);

export function middleware(request: NextRequest) {
  if (!DIPISAH) return NextResponse.next();

  const host = (request.headers.get("host") ?? "").toLowerCase();
  const { pathname, search } = request.nextUrl;

  // Di alamat dashboard, halaman depan bukan halaman jualan. Orang yang
  // mengetik app.palwise.id langsung dibawa ke dashboardnya.
  if (host === HOST_APP) {
    if (pathname === "/") {
      return NextResponse.redirect(new URL("/app", request.url));
    }
    return NextResponse.next();
  }

  // Di alamat halaman jualan, semua yang berbau dashboard dipindahkan.
  // "www." ikut dilayani karena banyak orang masih mengetiknya.
  if (host === HOST_SITUS || host === `www.${HOST_SITUS}`) {
    if (milikApp(pathname)) {
      // Tanda tanya di belakang ikut dibawa. Tautan ajakan bentuknya
      // palwise.id/daftar?ajak=XXXX, dan kodenya tidak boleh hilang di sini.
      return NextResponse.redirect(`${ALAMAT_APP}${pathname}${search}`);
    }
    return NextResponse.next();
  }

  // Alamat lain (IP server, localhost, pratinjau) dibiarkan apa adanya.
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Semua jalur KECUALI yang dipanggil dari dalam halaman.
    "/((?!api/|_next/|favicon.ico|robots.txt|sitemap.xml).*)",
  ],
};
