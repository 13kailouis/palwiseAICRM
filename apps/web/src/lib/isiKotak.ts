/**
 * Isi kotak lewat penyetel bawaan browser, bukan lewat `el.value = ...`.
 *
 * React menyimpan catatan sendiri soal nilai terakhir tiap kotak. Kalau
 * nilainya diubah langsung, catatan itu tidak ikut berubah, jadi React
 * menganggap tidak ada yang terjadi dan kotak yang tingginya menyesuaikan isi
 * tidak pernah memanjang. Lewat penyetel prototipe, catatannya ikut basi dan
 * peristiwa "input" diproses seperti orang mengetik sungguhan.
 *
 * Dipakai dua tempat: "Mulai dari contoh" yang mengisi tujuh kotak sekaligus,
 * dan kotak besar yang menulis balik ke kotak aslinya. Siasat sehalus ini
 * tidak boleh punya dua salinan yang bisa berjalan sendiri-sendiri.
 */
export function setNilaiKotak(
  el: HTMLTextAreaElement | HTMLInputElement,
  nilai: string,
) {
  const proto =
    el instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
  if (setter) setter.call(el, nilai);
  else el.value = nilai;
  el.dispatchEvent(new Event("input", { bubbles: true }));
}
