import { ImageResponse } from "next/og";

export const alt = "Palwise — Layani lebih banyak. Urus bisnis lebih tenang.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#eeeeee",
          color: "#2b2b2b",
          display: "flex",
          flexDirection: "column",
          padding: "62px 74px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 26,
          }}
        >
          <span style={{ fontWeight: 700 }}>Palwise</span>
          <span style={{ fontSize: 20, color: "#757575" }}>palwise.id</span>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginTop: 73,
            fontSize: 68,
            lineHeight: 1.13,
            letterSpacing: -3,
          }}
        >
          <span>Layani lebih banyak.</span>
          <span style={{ color: "#757575" }}>Urus bisnis lebih tenang.</span>
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 24,
            color: "#5c5c5c",
            marginTop: 30,
          }}
        >
          Asisten WhatsApp untuk pelanggan. Rekan AI untuk pemilik.
        </div>
        <div style={{ display: "flex", marginTop: 42 }}>
          <span
            style={{
              display: "flex",
              background: "#2b2b2b",
              color: "white",
              padding: "17px 28px",
              borderRadius: 9,
              fontSize: 23,
            }}
          >
            Mulai gratis
          </span>
        </div>
      </div>
    ),
    size,
  );
}
