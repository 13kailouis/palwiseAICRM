import Link from "next/link";

const setup = [
  ["/app/agent", "Asisten"],
  ["/app/knowledge", "Info bisnis"],
  ["/app/coba", "Coba dulu"],
  ["/app/whatsapp", "WhatsApp"],
];
const account = [
  ["/app/akun", "Akun & keamanan"],
  ["/app/tagihan", "Paket & pemakaian"],
];

export function PlatformNav({
  active,
  kind = "setup",
  agentId,
}: {
  active: string;
  agentId?: string;
  kind?: "setup" | "account";
}) {
  return (
    <nav
      className="pw-platform-nav"
      aria-label={kind === "setup" ? "Pengaturan layanan" : "Pengaturan akun"}
    >
      <div>
        {(kind === "setup" ? setup : account).map(([href, label]) => (
          <Link
            key={href}
            href={
              agentId && href !== "/app/whatsapp"
                ? `${href}?a=${encodeURIComponent(agentId)}`
                : href
            }
            aria-current={active === href ? "page" : undefined}
          >
            {label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
