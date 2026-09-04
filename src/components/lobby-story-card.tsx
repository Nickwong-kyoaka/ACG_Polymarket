import Link from "next/link";
import { Bookmark, Heart, MessageCircle, Sparkles } from "lucide-react";

export type LobbyStoryKind = "note" | "character" | "campaign";

export interface LobbyStoryCardProps {
  href: string;
  imageUrl?: string | null;
  imageAlt: string;
  kind: LobbyStoryKind;
  label: string;
  title: string;
  excerpt?: string | null;
  author?: string | null;
  meta?: string | null;
  tags?: string[];
  likes?: number;
  saves?: number;
  comments?: number;
  priority?: boolean;
}

const inkByKind: Record<LobbyStoryKind, string> = {
  note: "#c85d5a",
  character: "#5f8f87",
  campaign: "#d59b42",
};

export function LobbyStoryCard({
  href,
  imageUrl,
  imageAlt,
  kind,
  label,
  title,
  excerpt,
  author,
  meta,
  tags = [],
  likes = 0,
  saves = 0,
  comments = 0,
  priority = false,
}: LobbyStoryCardProps) {
  const accent = inkByKind[kind];

  return (
    <article
      className={`group mb-5 break-inside-avoid border border-[#2c2724]/20 bg-[#fffaf4] shadow-[5px_6px_0_rgba(44,39,36,.08)] transition hover:-translate-y-1 hover:shadow-[8px_10px_0_rgba(44,39,36,.12)] ${
        priority ? "md:col-span-2" : ""
      }`}
    >
      <Link href={href} className="block focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-[#5f8f87]">
        <div className={`relative overflow-hidden bg-[#e9dfd1] ${priority ? "aspect-[16/9]" : "aspect-[4/5]"}`}>
          {imageUrl ? (
            <div
              role="img"
              aria-label={imageAlt}
              className="absolute inset-0 bg-cover bg-center transition duration-500 group-hover:scale-[1.025]"
              style={{ backgroundImage: `url(${JSON.stringify(imageUrl)})` }}
            />
          ) : (
            <div className="absolute inset-0 grid place-items-center bg-[linear-gradient(135deg,#e8c9bd,#f1d98e_48%,#9fc0b8)]">
              <Sparkles className="h-12 w-12 text-white/80" aria-hidden="true" />
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/55 to-transparent" />
          <span
            className="absolute left-3 top-3 -rotate-1 border border-[#2c2724]/75 px-2.5 py-1 text-[10px] font-black tracking-[.13em] text-white shadow-[2px_2px_0_#2c2724]"
            style={{ backgroundColor: accent }}
          >
            {label}
          </span>
          {meta ? <span className="absolute bottom-3 right-3 text-[10px] font-black tracking-wide text-white">{meta}</span> : null}
        </div>
        <div className="p-4 sm:p-5">
          <h3 className="font-display text-[1.35rem] leading-[1.15] tracking-[-.035em] text-[#2c2724] sm:text-2xl">{title}</h3>
          {excerpt ? <p className="mt-2 line-clamp-3 text-xs leading-6 text-[#716862] sm:text-sm">{excerpt}</p> : null}
          {tags.length ? (
            <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[10px] font-black text-[#9a4c4a]">
              {tags.slice(0, 3).map((tag) => <span key={tag}>#{tag}</span>)}
            </div>
          ) : null}
          <div className="mt-4 flex items-center justify-between border-t border-[#2c2724]/15 pt-3 text-[10px] font-bold text-[#716862]">
            <span className="max-w-[45%] truncate">{author ?? "ACG Exchange"}</span>
            <span className="flex items-center gap-3" aria-label={`${likes} likes, ${saves} saves, ${comments} comments`}>
              <span className="inline-flex items-center gap-1"><Heart className="h-3.5 w-3.5" />{likes}</span>
              <span className="inline-flex items-center gap-1"><Bookmark className="h-3.5 w-3.5" />{saves}</span>
              <span className="inline-flex items-center gap-1"><MessageCircle className="h-3.5 w-3.5" />{comments}</span>
            </span>
          </div>
        </div>
      </Link>
    </article>
  );
}
