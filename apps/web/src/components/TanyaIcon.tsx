import type { ReactNode } from "react";

const paths = {
  panel: <><rect x="3" y="4" width="18" height="16" rx="3" /><path d="M9 4v16M6 8h.01M6 11h.01" /></>,
  baru: <><path d="M12 4H6a3 3 0 0 0-3 3v11a3 3 0 0 0 3 3h11a3 3 0 0 0 3-3v-6M14.5 4.5l5 5M10 14l1-5 7-7a2 2 0 0 1 3 3l-7 7-4 2Z" /></>,
  cari: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 4.5 4.5" /></>,
  atas: <path d="M12 19V5m-6 6 6-6 6 6" />,
  bawah: <path d="M12 5v14m-6-6 6 6 6-6" />,
  kanan: <path d="M5 12h14m-6-6 6 6-6 6" />,
  kembali: <path d="M19 12H5m6-6-6 6 6 6" />,
  hapus: <><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7" /></>,
  ide: <><path d="M9 18h6M10 21h4M8 14a6 6 0 1 1 8 0c-1 1-1 2-1 2H9s0-1-1-2Z" /></>,
  chat: <><path d="M21 11a8 8 0 0 1-8 8H8l-5 3V11a9 9 0 0 1 18 0Z" /><path d="M7 9h10M7 13h6" /></>,
  analisis: <><path d="M4 4v16h16M8 15l4-5 4 2 5-7M17 5h4v4" /></>,
  centang: <path d="m5 12 4 4L19 6" />,
  tutup: <path d="m6 6 12 12M6 18 18 6" />,
} satisfies Record<string, ReactNode>;

export function TanyaIcon({ nama, size = 20 }: { nama: keyof typeof paths; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[nama]}</svg>;
}
