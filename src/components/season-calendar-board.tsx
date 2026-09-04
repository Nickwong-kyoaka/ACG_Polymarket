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
    <section className="border border-[#2c2724] bg-[#283338] text-white shadow-[8px_8px_0_#c85d5a]">
      <header className="flex items-end justify-between gap-4 border-b border-white/20 p-5">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[.17em] text-[#f2ca61]">{eyebrow}</p>
          <h2 className="mt-2 font-display text-2xl sm:text-3xl">{title}</h2>
        </div>
        <CalendarDays className="h-6 w-6 text-[#f2ca61]" aria-hidden="true" />
      </header>
      {entries.length ? (
        <ol>
          {entries.slice(0, 7).map((entry, index) => (
            <li key={entry.id}>
              <Link href={entry.href} className="grid grid-cols-[42px_1fr_auto] items-center gap-3 border-b border-white/15 px-5 py-4 transition last:border-0 hover:bg-white/[.06] focus-visible:outline focus-visible:outline-3 focus-visible:outline-inset focus-visible:outline-[#f2ca61]">
                <span className="font-display text-xl text-[#f2ca61]">{String(index + 1).padStart(2, "0")}</span>
                <span className="min-w-0">
                  <strong className="block truncate text-sm">{entry.seriesTitle}</strong>
                  <small className="mt-1 block truncate text-[10px] text-white/50">{entry.episodeLabel}</small>
                </span>
                <span className="text-right text-[10px] font-black tracking-wide text-white/65">
                  {entry.dayLabel}<br />{entry.timeLabel}
                </span>
              </Link>
            </li>
          ))}
        </ol>
      ) : <p className="p-6 text-sm leading-6 text-white/55">{emptyLabel}</p>}
    </section>
  );
}
