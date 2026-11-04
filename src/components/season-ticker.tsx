import Link from "next/link";
import { localePath, pick, type PublicLocale } from "@/components/acg-locale";

export function SeasonTicker({ locale }: { locale: PublicLocale }) {
  return <nav className="season-ticker" aria-label={pick(locale, "Explore more", "更多探索")}><div className="season-ticker-track">{[
    { href: "/?feed=seasonal#season", label: pick(locale, "This season", "本季新番") },
    { href: "/gallery", label: pick(locale, "Character gallery", "角色圖集") },
    { href: "/comfort", label: pick(locale, "Comfort", "陪伴") },
    { href: "/campaigns", label: pick(locale, "Community campaigns", "應援活動") },
  ].map((item) => <Link key={item.href} href={localePath(locale, item.href)} className="season-ticker-item">{item.label}</Link>)}</div></nav>;
}
