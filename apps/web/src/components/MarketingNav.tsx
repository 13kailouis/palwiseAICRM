"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { LogoNama } from "./Logo";

export function MarketingNav({
  daftar,
  masuk,
  anchorBase = "",
}: {
  daftar: string;
  masuk: string;
  anchorBase?: string;
}) {
  const [open, setOpen] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);
  const links = [
    [`${anchorBase}#fitur`, "Produk"],
    [`${anchorBase}#bidang`, "Solusi"],
    [`${anchorBase}#harga`, "Harga"],
    ["/panduan", "Panduan"],
  ];
  return (
    <header
      className="pw-nav"
      onKeyDown={(e) => {
        if (e.key === "Escape" && open) {
          setOpen(false);
          toggle.current?.focus();
        }
      }}
    >
      <div className="pw-container pw-nav-inner">
        <Link href="/" aria-label="Palwise — halaman utama">
          <LogoNama />
        </Link>
        <nav className="pw-nav-desktop" aria-label="Navigasi utama">
          {links.map(([href, label]) => (
            <Link key={href} href={href}>
              {label}
            </Link>
          ))}
        </nav>
        <div className="pw-nav-actions">
          <Link className="pw-login" href={masuk}>
            Masuk
          </Link>
          <Link className="pw-button pw-button-small" href={daftar}>
            Mulai gratis <span aria-hidden>↗</span>
          </Link>
          <button
            className="pw-menu-toggle"
            ref={toggle}
            type="button"
            aria-label={open ? "Tutup menu" : "Buka menu"}
            aria-expanded={open}
            aria-controls="pw-mobile-menu"
            onClick={() => setOpen(!open)}
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              aria-hidden
            >
              <path d={open ? "m6 6 12 12M6 18 18 6" : "M4 8h16M4 16h16"} />
            </svg>
          </button>
        </div>
      </div>
      {open && (
        <nav
          id="pw-mobile-menu"
          className="pw-mobile-menu"
          aria-label="Menu handphone"
        >
          {[...links, [masuk, "Masuk ke akun"]].map(([href, label]) => (
            <Link key={href} href={href} onClick={() => setOpen(false)}>
              {label}
              <span aria-hidden>↗</span>
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
