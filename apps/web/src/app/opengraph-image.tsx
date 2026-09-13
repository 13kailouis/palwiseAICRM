import { ImageResponse } from "next/og";

export const alt = "Palwise — asisten WhatsApp untuk kursus dan pelatihan";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Kartu berbagi ditulis bersama halaman agar pesannya mengikuti fokus produk. */
export default function OpenGraphImage() {
  return new ImageResponse(
    <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: "100%", height: "100%", background: "#ffffff", color: "#0b1220", padding: "64px 76px", borderLeft: "14px solid #1a5ce8", fontFamily: "sans-serif" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ fontSize: 40, fontWeight: 700 }}>Palwise</div>
        <div style={{ fontSize: 26, color: "#4a5568" }}>Untuk kursus, les & pelatihan</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ fontSize: 56, fontWeight: 700 }}>Pertanyaan kursus terjawab.</div>
        <div style={{ fontSize: 52, fontWeight: 700, color: "#4a5568" }}>Calon peserta tetap terpantau.</div>
      </div>
      <div style={{ fontSize: 26 }}>Jawab pertanyaan WhatsApp. Siapkan tindak lanjut bersama tim.</div>
    </div>,
    size,
  );
}
