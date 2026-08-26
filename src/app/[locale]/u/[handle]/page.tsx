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
  return <div className="exchange-page"><section className="exchange-panel overflow-hidden bg-[#283338] text-white"><div className="grid gap-8 p-7 sm:p-10 lg:grid-cols-[1fr_auto] lg:items-end xl:p-12"><div><p className="exchange-kicker text-[#f0c884] before:bg-[#f0c884]">PUBLIC SUPPORT ROOM</p><h1 className="mt-7 font-display text-6xl">{profile.displayName}</h1><p className="mt-2 text-xs font-black uppercase tracking-[.2em] text-[#8fd0c4]">@{profile.handle}</p><p className="mt-6 max-w-2xl text-base leading-8 text-white/68">{profile.bio}</p></div><div className="grid gap-3"><span className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-5 py-4 text-sm font-bold text-white/70"><ShieldCheck className="h-5 w-5 text-[#8fd0c4]" />{pick(locale, "A shelf curated by its owner", "由房主親自整理的展示櫃")}</span><span className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-5 py-4 text-sm font-bold text-white/70"><Heart className="h-5 w-5 text-[#e99aa4]" />{favorites.length} {pick(locale, "favorite signals", "個本命訊號")}</span></div></div></section><section className="grid gap-7"><SectionHeading eyebrow="PINNED FAVORITES" title={pick(locale, "Characters this supporter keeps in the spotlight", "這位應援者留在聚光燈下的角色")} description={pick(locale, "A public room is a small introduction through chosen favorites, collection moments, and the feelings its owner wants to share.", "公開房間用房主挑選的本命、收藏時刻與想分享的心情，做一段小小的自我介紹。")}/><div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{favorites.map((position) => { const character = localizeCharacter(position.character, locale); return <Link key={character.id} href={localePath(locale, `/character/${character.slug}`)} className="exchange-panel group overflow-hidden"><CharacterArt character={character} className="min-h-[360px]" /><div className="p-5"><p className="text-[10px] font-black uppercase tracking-[.18em] text-[#e83c62]">{character.title}</p><h3 className="mt-2 font-display text-3xl">{character.name}</h3><p className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-slate-500"><Sparkles className="h-4 w-4 text-[#e2a525]" />{pick(locale, "Pinned with affection", "以喜愛置頂")}</p></div></Link>; })}</div></section></div>;
}
