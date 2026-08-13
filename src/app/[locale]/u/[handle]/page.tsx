import { Heart, ShieldCheck, Sparkles } from "lucide-react";
import { notFound } from "next/navigation";
import { CharacterArt } from "@/components/character-art";
import { isPublicLocale, localePath, localizeCharacter, pick } from "@/components/acg-locale";
import { SectionHeading } from "@/components/ui/section-heading";
import { getUserByHandle } from "@/lib/store";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function PublicProfilePage({ params }: { params: Promise<{ locale: string; handle: string }> }) {
  const { locale: rawLocale, handle } = await params;
  if (!isPublicLocale(rawLocale)) notFound();
  const locale = rawLocale;
  const result = await getUserByHandle(handle).catch(() => null);
  if (!result) notFound();
  const { profile, positions } = result;
  const pinned = result.pinnedCharacters.map((character) => ({ character, milestone: "PINNED" }));
  const favorites = pinned.length ? pinned : positions.slice(0, 3);
  return <div className="exchange-page"><section className="exchange-panel overflow-hidden bg-[#111827] text-white"><div className="grid gap-8 p-7 sm:p-10 lg:grid-cols-[1fr_auto] lg:items-end xl:p-12"><div><p className="exchange-kicker text-[#ffcc66] before:bg-[#ffcc66]">PUBLIC SUPPORT ROOM</p><h1 className="mt-7 font-display text-6xl">{profile.displayName}</h1><p className="mt-2 text-xs font-black uppercase tracking-[.2em] text-[#3ed6e0]">@{profile.handle}</p><p className="mt-6 max-w-2xl text-base leading-8 text-white/62">{profile.bio}</p></div><div className="grid gap-3"><span className="inline-flex items-center gap-3 rounded-[18px_5px_18px_5px] border border-white/10 bg-white/5 px-5 py-4 text-sm font-bold text-white/65"><ShieldCheck className="h-5 w-5 text-[#3ed6e0]" />{pick(locale, "Wallet and cost basis stay private", "錢包與平均成本保持私密")}</span><span className="inline-flex items-center gap-3 rounded-[18px_5px_18px_5px] border border-white/10 bg-white/5 px-5 py-4 text-sm font-bold text-white/65"><Heart className="h-5 w-5 text-[#ff7d9a]" />{favorites.length} {pick(locale, "favorite signals", "個本命訊號")}</span></div></div></section><section className="grid gap-7"><SectionHeading eyebrow="PINNED FAVORITES" title={pick(locale, "Characters this supporter wants to spotlight", "這位應援者想放在聚光燈下的角色")} description={pick(locale, "Public rooms show affection and identity only. Wallet balance, average cost, and current position value are intentionally absent.", "公開房間只展示喜愛與身份；錢包、平均成本與持倉價值不會出現在這裡。")}/><div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{favorites.map((position) => { const character = localizeCharacter(position.character, locale); return <Link key={character.id} href={localePath(locale, `/character/${character.slug}`)} className="exchange-panel group overflow-hidden"><CharacterArt character={character} className="min-h-[360px]" /><div className="p-5"><p className="text-[10px] font-black uppercase tracking-[.18em] text-[#e83c62]">{character.title}</p><h3 className="mt-2 font-display text-3xl">{character.name}</h3><p className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-slate-500"><Sparkles className="h-4 w-4 text-[#e2a525]" />{pick(locale, "Pinned with affection", "以喜愛置頂")}</p></div></Link>; })}</div></section></div>;
}
