import Link from "next/link";
import { ArrowUpRight, Clock3, UsersRound } from "lucide-react";

interface LobbyPredictionTicketProps {
  href: string;
  eyebrow: string;
  question: string;
  yesLabel: string;
  noLabel: string;
  yesProbability: number;
  participants: number;
  closesLabel: string;
  confidenceLabel: string;
}

export function LobbyPredictionTicket({
  href,
  eyebrow,
  question,
  yesLabel,
  noLabel,
  yesProbability,
  participants,
  closesLabel,
  confidenceLabel,
}: LobbyPredictionTicketProps) {
  const yes = Math.min(99, Math.max(1, Math.round(yesProbability * 100)));

  return (
    <Link
      href={href}
      className="group block border border-[#2c2724] bg-[#f2ca61] p-1 shadow-[7px_8px_0_#2c2724] transition hover:-translate-y-1 hover:shadow-[9px_11px_0_#2c2724] focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-[#5f8f87]"
    >
      <article className="relative min-h-full border border-dashed border-[#2c2724]/55 bg-[#fffaf4] p-5 sm:p-6">
        <span className="absolute -right-px top-6 h-5 w-2.5 rounded-l-full border-y border-l border-[#2c2724] bg-[#f5efe5]" />
        <p className="text-[10px] font-black uppercase tracking-[.17em] text-[#9a4c4a]">{eyebrow}</p>
        <h3 className="mt-3 pr-5 font-display text-2xl leading-tight text-[#2c2724]">{question}</h3>
        <div className="mt-6 grid grid-cols-[auto_1fr_auto] items-center gap-3">
          <strong className="font-display text-4xl text-[#3e786f]">{yes}%</strong>
          <div className="h-2 border border-[#2c2724]/30 bg-[#eadfd1]">
            <div className="h-full bg-[#5f8f87]" style={{ width: `${yes}%` }} />
          </div>
          <span className="text-[10px] font-black text-[#716862]">{100 - yes}%</span>
        </div>
        <div className="mt-2 flex justify-between text-[10px] font-black uppercase tracking-[.12em]">
          <span className="text-[#3e786f]">{yesLabel}</span>
          <span className="text-[#a15154]">{noLabel}</span>
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-[#2c2724]/20 pt-4 text-[10px] font-bold text-[#716862]">
          <span className="inline-flex items-center gap-1.5"><UsersRound className="h-3.5 w-3.5" />{participants}</span>
          <span className="inline-flex items-center gap-1.5"><Clock3 className="h-3.5 w-3.5" />{closesLabel}</span>
          <span className="ml-auto text-[#9a4c4a]">{confidenceLabel}</span>
          <ArrowUpRight className="h-4 w-4 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </div>
      </article>
    </Link>
  );
}
