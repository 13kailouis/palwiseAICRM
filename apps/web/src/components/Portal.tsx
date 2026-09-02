"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

/**
 * Menggambar isinya langsung di bawah <body>, bukan di tempat dia ditulis.
 *
 * KENAPA MODAL WAJIB LEWAT SINI.
 *
 * `position: fixed` itu "terhadap layar", TAPI cuma selama tidak ada satu pun
 * induknya yang punya transform, filter, backdrop-filter, contain, atau
 * animasi yang menyentuh transform. Begitu ada satu saja, fixed berubah jadi
 * "terhadap induk itu", dan lapisan gelapnya berhenti menutup seluruh layar.
 *
 * Itu yang terjadi di halaman Asisten, dan bedanya kelihatan waktu dua modal
 * yang seharusnya kembar dibandingkan berdampingan: yang di Info bisnis
 * menutupi seluruh layar, yang di Asisten menyisakan kepala halamannya terang
 * benderang di atas. Formulir Asisten memakai animasi berurutan yang dipasang
 * ke SETIAP anak langsungnya, dan modalnya kebetulan jadi salah satu anak itu.
 *
 * Yang buruk dari kelas bug ini bukan tampilannya, tapi bahwa dia menular
 * tanpa pemberitahuan: cukup seseorang menambahkan satu animasi atau satu
 * hover-angkat di induk mana pun, berbulan-bulan kemudian, dan modal yang
 * sudah lama benar ikut rusak. Tidak ada galat, tidak ada tes yang gagal,
 * cuma lapisan gelap yang tiba-tiba berhenti di tempat yang salah.
 *
 * Portal memotong seluruh kelas itu sekaligus: anak langsung <body> tidak
 * mungkin punya induk yang ber-transform.
 *
 * Digambar cuma sesudah menempel di browser. Di server tidak ada document,
 * dan menggambar duluan lalu berbeda saat hidrasi bikin React membuang seluruh
 * pohonnya.
 */
export function Portal({ children }: { children: React.ReactNode }) {
  const [siap, setSiap] = useState(false);
  useEffect(() => setSiap(true), []);
  if (!siap) return null;
  return createPortal(children, document.body);
}
