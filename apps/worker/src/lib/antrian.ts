/**
 * Pengantre sederhana per kunci.
 *
 * Pesan WhatsApp dari satu orang bisa datang berbarengan, dan kalau diproses
 * bersamaan hasilnya kacau: kontak atau obrolan bisa terbuat dua kali, sapaan
 * pembuka terkirim dobel, dan AI dipanggil beberapa kali untuk satu maksud.
 */
const berjalan = new Map<string, Promise<unknown>>();

export function berurutan<T>(kunci: string, tugas: () => Promise<T>): Promise<T> {
  const sebelumnya = berjalan.get(kunci) ?? Promise.resolve();

  // Kegagalan tugas sebelumnya tidak boleh menghentikan antrean berikutnya.
  const sekarang = sebelumnya.then(tugas, tugas);

  const penanda = sekarang.then(
    () => undefined,
    () => undefined,
  );
  berjalan.set(kunci, penanda);

  // Bersihkan supaya peta tidak tumbuh terus selama worker hidup.
  penanda.finally(() => {
    if (berjalan.get(kunci) === penanda) berjalan.delete(kunci);
  });

  return sekarang;
}

export function jumlahAntrean(): number {
  return berjalan.size;
}
