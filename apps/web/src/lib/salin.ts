/**
 * Salin teks ke papan klip, dengan jalan cadangan.
 *
 * KENAPA TIDAK CUKUP navigator.clipboard SAJA.
 *
 * Browser cuma menyediakannya di "konteks aman": HTTPS, atau localhost. Alamat
 * seperti http://192.168.100.5:3000 TIDAK termasuk, dan di situ
 * navigator.clipboard bukan cuma gagal, dia tidak ada sama sekali. Itu persis
 * cara pemiliknya menguji Palwise dari HP, dan artinya semua tombol salin
 * benar-benar mati tanpa satu tanda pun.
 *
 * Yang paling merugikan itu tombol salin kode ajakan: seluruh gunanya memang
 * menyalin, jadi kalau gagal diam-diam, fiturnya mati dan orangnya cuma
 * mengira dirinya salah pencet.
 *
 * Jalan cadangannya cara lama: taruh teksnya di kotak tersembunyi, blok
 * seluruhnya, lalu suruh browser menyalin. Sudah usang, tapi jalan di HTTP dan
 * di browser lama, dan itu yang dibutuhkan di sini.
 */
export async function salinTeks(teks: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(teks);
      return true;
    }
  } catch {
    // Ditolak izinnya atau bukan konteks aman. Coba cara lama di bawah.
  }

  try {
    const kotak = document.createElement("textarea");
    kotak.value = teks;
    // Di luar layar, tapi TIDAK display:none dan TIDAK hidden. Elemen yang
    // benar-benar disembunyikan tidak bisa diblok, dan tanpa blokan tidak ada
    // yang bisa disalin.
    kotak.setAttribute("readonly", "");
    kotak.style.position = "fixed";
    kotak.style.top = "-1000px";
    kotak.style.opacity = "0";
    document.body.appendChild(kotak);

    kotak.select();
    // Untuk Safari di iOS, select() saja tidak cukup.
    kotak.setSelectionRange(0, teks.length);

    const berhasil = document.execCommand("copy");
    document.body.removeChild(kotak);
    return berhasil;
  } catch {
    return false;
  }
}
