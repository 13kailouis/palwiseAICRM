import Link from "next/link";

/**
 * Pemilih asisten sederhana untuk halaman yang isinya menempel ke satu asisten.
 * Tidak muncul kalau asistennya cuma satu, supaya tidak menambah keramaian.
 */
export function AgentTabs({
  agents,
  activeId,
  basePath,
  note,
}: {
  agents: { id: string; name: string }[];
  activeId: string;
  basePath: string;
  note?: string;
}) {
  if (agents.length <= 1) return null;

  return (
    // Sama seperti AgentPicker: tanpa pt-4 barisnya menempel di garis bawah
    // kepala halaman dan terlihat seperti terpotong.
    <div className="border-b border-ink-200 bg-white px-4 pb-4 pt-4 sm:px-6">
      <div className="flex flex-wrap items-center gap-2">
        {agents.map((a) => (
          <Link
            key={a.id}
            href={`${basePath}?a=${a.id}`}
            className={`rounded-lg border px-3 py-1.5 text-sm transition ${
              a.id === activeId
                ? "border-brand-500 bg-brand-50 font-medium text-brand-800"
                : "border-ink-200 text-ink-600 hover:bg-ink-50"
            }`}
          >
            {a.name}
          </Link>
        ))}
      </div>
      {note && <p className="mt-3 text-xs leading-relaxed text-ink-500">{note}</p>}
    </div>
  );
}
