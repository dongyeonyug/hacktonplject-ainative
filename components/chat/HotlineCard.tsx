import type { Hotline } from "@/lib/safety/hotlines";

/**
 * Korean crisis hotline card (plan AD-2 / AC-12). Rendered immediately when the
 * input-side classifier flags a crisis (or on the fail-safe path). The notice
 * is honest that no human is monitoring the chat in real time — the hotlines
 * ARE the escalation.
 */
export function HotlineCard({
  hotlines,
  notice,
}: {
  hotlines: Hotline[];
  notice: string;
}) {
  return (
    <div
      role="alert"
      className="rounded-xl border border-rose-300 bg-rose-50 p-4 text-rose-950 shadow-sm dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-50"
    >
      <p className="text-sm font-semibold">지금 도움이 필요하신가요?</p>
      <p className="mt-1 text-sm leading-relaxed">{notice}</p>
      <ul className="mt-3 space-y-2">
        {hotlines.map((h) => (
          <li key={h.phone} className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{h.name}</p>
              <p className="truncate text-xs text-rose-800 dark:text-rose-200">
                {h.description}
              </p>
            </div>
            <a
              href={`tel:${h.phone.replace(/[^0-9]/g, "")}`}
              className="shrink-0 rounded-lg bg-rose-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-rose-500"
            >
              {h.phone} 전화
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
