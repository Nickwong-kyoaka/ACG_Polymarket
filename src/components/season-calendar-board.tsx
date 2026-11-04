import Link from "next/link";
import { CalendarDays } from "lucide-react";

export interface SeasonCalendarEntry {
  id: string;
  href: string;
  dayLabel: string;
  timeLabel: string;
  seriesTitle: string;
  episodeLabel: string;
  watched?: boolean;
}

export function SeasonCalendarBoard({
  title,
  eyebrow,
  emptyLabel,
  entries,
}: {
  title: string;
  eyebrow: string;
  emptyLabel: string;
  entries: SeasonCalendarEntry[];
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white text-slate-800">
      <header className="flex items-end justify-between gap-4 border-b border-slate-100 p-5">
        <div>
          <p className="text-xs font-medium text-slate-500">{eyebrow}</p>
          <h3 className="mt-2 text-lg font-bold">{title}</h3>
        </div>
        <CalendarDays className="h-5 w-5 text-[#c4455c]" aria-hidden="true" />
      </header>
      {entries.length ? (
        <ol className="grid md:grid-cols-2">
          {entries.slice(0, 7).map((entry, index) => (
            <li key={entry.id}>
              <Link href={entry.href} className="grid min-h-16 grid-cols-[28px_minmax(0,1fr)_auto] items-center gap-3 border-b border-slate-100 px-5 py-4 transition hover:bg-slate-50">
                <span className="text-sm font-semibold text-slate-400">{String(index + 1).padStart(2, "0")}</span>
                <span className="min-w-0">
                  <strong className="block truncate text-sm">{entry.seriesTitle}</strong>
                  <small className="mt-1 block truncate text-xs text-slate-500">{entry.episodeLabel}</small>
                </span>
                <span className="text-right text-xs font-semibold tabular-nums text-slate-500">
                  {entry.dayLabel}<br />{entry.timeLabel}
                </span>
              </Link>
            </li>
          ))}
        </ol>
      ) : <p className="p-6 text-sm leading-6 text-slate-500">{emptyLabel}</p>}
    </section>
  );
}
