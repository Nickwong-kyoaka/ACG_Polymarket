import Link from "next/link";
import { ArrowLeft, ArrowRight, Heart, LockKeyhole } from "lucide-react";
import { notFound } from "next/navigation";
import { CharacterArt } from "@/components/character-art";
import { isPublicLocale, localePath, localizeCharacter, pick } from "@/components/acg-locale";
import { ComfortModeCard, ComfortNotice, localizeComfortContent, localizeComfortMode, MiniComic } from "@/components/comfort-hub";
import { ComfortPlayer } from "@/components/comfort-player";
import { SectionHeading } from "@/components/ui/section-heading";
import { getComfortModeView, listComfortModes } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function ComfortModePage({ params }: { params: Promise<{ locale: string; mode: string }> }) {
  const { locale: rawLocale, mode: modeSlug } = await params;
  if (!isPublicLocale(rawLocale)) notFound();
  const locale = rawLocale;
  const [view, allModes] = await Promise.all([getComfortModeView(modeSlug, locale).catch(() => null), listComfortModes(locale)]);
  if (!view) notFound();
  const mode = localizeComfortMode(view, locale);
  const sourceContent = view.contents[0];
  const content = sourceContent ? localizeComfortContent(sourceContent, locale) : null;
  const character = sourceContent?.character ? localizeCharacter(sourceContent.character, locale) : null;
  const line = content?.body ?? mode.description;
  const related = allModes.filter((entry) => entry.slug !== view.slug).slice(0, 3);
  const copy = locale === "zh-Hant" ? { back: "返回全部安慰室", first: "今晚的第一句", contentEyebrow: "CHARACTER COMFORT", contentTitle: "讓一句話先替你接住現在", contentBody: "不用一次解決所有情緒。播放環境音、聽合成示範語音，再決定要不要把這次安慰收藏起來。", comicEyebrow: "FOUR-PANEL STORY", comicTitle: "一個不催促你的原創小故事", comicBody: "每格只向前一點，最後把明天留給明天。", unlockEyebrow: "SOFT UNLOCKS", unlockTitle: "喜歡可以變成房間裡的東西", unlockBody: "完成安慰流程與每日任務後，可用 SUP 解鎖原創頭像框、玩家主題與壁紙。", character: "前往角色訊號", relatedEyebrow: "OTHER FREQUENCIES", relatedTitle: "如果需要不同的陪伴，可以換一間房", relatedBody: "切換的是安慰需求，不是比較哪一名角色更好。" } : { back: "Back to all comfort rooms", first: "Tonight's first line", contentEyebrow: "CHARACTER COMFORT", contentTitle: "Let one line hold the present first", contentBody: "You do not have to solve the whole feeling. Play ambience, hear the synthesized demo voice, then decide whether to save this session.", comicEyebrow: "FOUR-PANEL STORY", comicTitle: "An original story that does not rush you", comicBody: "Each panel moves only a little; the final one leaves tomorrow for tomorrow.", unlockEyebrow: "SOFT UNLOCKS", unlockTitle: "Affection can become part of your room", unlockBody: "Complete comfort sessions and daily missions, then use SUP for original frames, player themes, and wallpapers.", character: "Open character signal", relatedEyebrow: "OTHER FREQUENCIES", relatedTitle: "Move rooms if you need a different kind of company", relatedBody: "You are changing the comfort need, not ranking one character above another." };

  return <div className="exchange-page pb-32 lg:pb-16"><Link href={localePath(locale, "/comfort")} className="inline-flex w-fit items-center gap-2 text-sm font-black text-slate-500 transition hover:text-[#e83c62]"><ArrowLeft className="h-4 w-4" />{copy.back}</Link>
    <section className="exchange-panel overflow-hidden text-white" style={{ background: `linear-gradient(135deg, ${view.accentFrom}, ${view.accentTo})` }}><div className="grid lg:grid-cols-[1fr_.9fr]"><div className="relative z-10 flex flex-col justify-center bg-[#111827]/62 p-7 backdrop-blur-sm sm:p-10 xl:p-12"><p className="exchange-kicker text-[#ffcc66] before:bg-[#ffcc66]">{mode.subtitle}</p><h1 className="mt-7 exchange-title text-white">{mode.title}</h1><p className="mt-6 max-w-2xl text-base leading-8 text-white/72">{mode.description}</p><div className="mt-8 rounded-[22px_5px_22px_5px] border border-white/15 bg-white/8 p-5"><p className="text-[10px] font-black uppercase tracking-[.2em] text-[#3ed6e0]">{copy.first}</p><p className="mt-3 font-display text-2xl leading-snug">&ldquo;{line}&rdquo;</p></div></div><div className="group relative min-h-[480px]">{character ? <CharacterArt character={character} className="absolute inset-0 h-full" priority /> : <div className="absolute inset-0 halftone bg-white/10" />}{character ? <div className="absolute inset-x-5 bottom-5 z-10 rounded-[18px_5px_18px_5px] bg-[#111827]/82 p-5 backdrop-blur-xl"><p className="font-display text-3xl">{character.name}</p><Link href={localePath(locale, `/character/${character.slug}`)} className="mt-3 inline-flex items-center gap-2 text-xs font-black text-[#ffcc66]">{copy.character}<ArrowRight className="h-4 w-4" /></Link></div> : null}</div></div></section>
    <ComfortNotice locale={locale} />
    <section className="grid gap-7"><SectionHeading eyebrow={copy.contentEyebrow} title={copy.contentTitle} description={copy.contentBody} /><div className="grid gap-6 lg:grid-cols-[.82fr_1.18fr]"><div className="exchange-panel p-6 sm:p-8"><p className="text-[10px] font-black uppercase tracking-[.2em] text-[#e83c62]">{content?.kind ?? "SWEET_TALK"}</p><h2 className="mt-4 font-display text-4xl">{content?.title ?? mode.title}</h2><p className="mt-5 text-base leading-8 text-slate-600">{line}</p><div className="mt-7 flex items-center justify-between rounded-[18px_5px_18px_5px] bg-[#fff1f3] p-4"><span className="inline-flex items-center gap-2 text-sm font-black text-[#d9375b]"><Heart className="h-4 w-4" />Sweetness</span><span className="font-display text-3xl text-[#d9375b]">{content?.sweetnessLevel ?? 88}%</span></div></div><ComfortPlayer locale={locale} modeSlug={view.slug} line={line} characterId={content?.characterId} contentId={content?.id} /></div></section>
    <section className="grid gap-7"><SectionHeading eyebrow={copy.comicEyebrow} title={copy.comicTitle} description={copy.comicBody} /><MiniComic mode={view} locale={locale} /></section>
    <section className="exchange-panel grid gap-6 bg-[#111827] p-6 text-white sm:p-8 lg:grid-cols-[1fr_auto] lg:items-center"><SectionHeading eyebrow={copy.unlockEyebrow} title={copy.unlockTitle} description={copy.unlockBody} tone="light" /><Link href={localePath(locale, "/shop")} className="exchange-button-primary"><LockKeyhole className="h-4 w-4" />{pick(locale, "Browse unlocks", "查看可解鎖物品")}</Link></section>
    <section className="grid gap-7"><SectionHeading eyebrow={copy.relatedEyebrow} title={copy.relatedTitle} description={copy.relatedBody} /><div className="grid gap-5 md:grid-cols-3">{related.map((entry) => <ComfortModeCard key={entry.id} mode={entry} locale={locale} />)}</div></section>
  </div>;
}
