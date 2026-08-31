"use client";

import { useState } from "react";

/**
 * Lapisan foto di atas avatar huruf awal.
 *
 * Dipisah jadi komponen klien sendiri cuma demi satu hal: `onError`. Kalau
 * fotonya gagal dimuat (berkasnya keburu terhapus, mesin sesaat tak terjangkau),
 * dia menyembunyikan diri supaya huruf awal di belakangnya yang muncul, bukan
 * lambang "gambar rusak" bawaan browser. `Avatar` sendiri tetap komponen server.
 */
export function AvatarFoto({ src }: { src: string }) {
  const [gagal, setGagal] = useState(false);
  if (gagal) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      loading="lazy"
      onError={() => setGagal(true)}
      className="absolute inset-0 h-full w-full object-cover"
    />
  );
}
