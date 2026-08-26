import Link from "next/link";
import { ArrowLeft, ArrowRight, Heart, LockKeyhole } from "lucide-react";
import { notFound } from "next/navigation";
import { CharacterArt } from "@/components/character-art";
import { isPublicLocale, localePath, localizeCharacter, pick } from "@/components/acg-locale";
import { ComfortModeCard, ComfortNotice, localizeComfortContent, localizeComfortMode, MiniComic } from "@/components/comfort-hub";
import { ComfortPlayer } from "@/components/comfort-player";
import { SectionHeading } from "@/components/ui/section-heading";
import { getCharacterComfortLine } from "@/data/character-voices";
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
  const line = character ? getCharacterComfortLine(character.slug, locale) : content?.body ?? mode.description;
  const related = allModes.filter((entry) => entry.slug !== view.slug).slice(0, 3);
  const copy = locale === "zh-Hant" ? { back: "返回全部安慰室", first: "今晚的第一句", contentEyebrow: "CHARACTER COMFORT", contentTitle: "先讓熟悉的聲音陪你坐一會", contentBody: "每名角色都有自己的合成聲線、說話節奏與安慰句。可以加上淡淡環境音，再把喜歡的片刻收藏進房間。", comicEyebrow: "FOUR-PANEL STORY", comicTitle: "今晚的小小連環畫", comicBody: "四個畫面，陪心情慢慢走到比較柔軟的地方。", unlockEyebrow: "ROOM KEEPSAKES", unlockTitle: "把今晚的心情留在房間裡", unlockBody: "完成安慰流程與每日任務後，可以用 SUP 帶回原創頭像框、主題與壁紙。", character: "看看角色房間", relatedEyebrow: "MORE ROOMS", relatedTitle: "也許另一間房，剛好適合現在的你", relatedBody: "孤單、疲憊、睡不著或想找回信心，都有不同的陪伴節奏。" } : { back: "Back to all comfort rooms", first: "Tonight's first line", contentEyebrow: "CHARACTER COMFORT", contentTitle: "Stay a while with a familiar voice", contentBody: "Each character has an original synth direction, speaking pace, and comfort line. Add a little ambience, then keep the moment in your room.", comicEyebrow: "FOUR-PANEL STORY", comicTitle: "A small story for tonight", comicBody: "Four gentle panels move the feeling somewhere a little softer.", unlockEyebrow: "ROOM KEEPSAKES", unlockTitle: "Leave a trace of tonight in your room", unlockBody: "Comfort sessions and daily missions open a path to original frames, themes, and wallpapers using SUP.", character: "Visit character room", relatedEyebrow: "MORE ROOMS", relatedTitle: "Another room may fit the feeling you have now", relatedBody: "Loneliness, fatigue, restless nights, and confidence each have their own pace of company." };

  return <div className="exchange-page pb-32 lg:pb-16"><Link href={localePath(locale, "/comfort")} className="inline-flex w-fit items-center gap-2 text-sm font-black text-slate-500 transition hover:text-[#e83c62]"><ArrowLeft className="h-4 w-4" />{copy.back}</Link>
    <section className="exchange-panel overflow-hidden text-white" style={{ background: `linear-gradient(135deg, ${view.accentFrom}, ${view.accentTo})` }}><div className="grid lg:grid-cols-[1fr_.9fr]"><div className="relative z-10 flex flex-col justify-center bg-[#111827]/62 p-7 backdrop-blur-sm sm:p-10 xl:p-12"><p className="exchange-kicker text-[#ffcc66] before:bg-[#ffcc66]">{mode.subtitle}</p><h1 className="mt-7 exchange-title text-white">{mode.title}</h1><p className="mt-6 max-w-2xl text-base leading-8 text-white/72">{mode.description}</p><div className="mt-8 rounded-[22px_5px_22px_5px] border border-white/15 bg-white/8 p-5"><p className="text-[10px] font-black uppercase tracking-[.2em] text-[#3ed6e0]">{copy.first}</p><p className="mt-3 font-display text-2xl leading-snug">&ldquo;{line}&rdquo;</p></div></div><div className="group relative min-h-[480px]">{character ? <CharacterArt character={character} className="absolute inset-0 h-full" priority /> : <div className="absolute inset-0 halftone bg-white/10" />}{character ? <div className="absolute inset-x-5 bottom-5 z-10 rounded-[18px_5px_18px_5px] bg-[#111827]/82 p-5 backdrop-blur-xl"><p className="font-display text-3xl">{character.name}</p><Link href={localePath(locale, `/character/${character.slug}`)} className="mt-3 inline-flex items-center gap-2 text-xs font-black text-[#ffcc66]">{copy.character}<ArrowRight className="h-4 w-4" /></Link></div> : null}</div></div></section>
    <ComfortNotice locale={locale} />
    <section className="grid gap-7"><SectionHeading eyebrow={copy.contentEyebrow} title={copy.contentTitle} description={copy.contentBody} /><div className="grid gap-6 lg:grid-cols-[.82fr_1.18fr]"><div className="exchange-panel p-6 sm:p-8"><p className="text-[10px] font-black uppercase tracking-[.2em] text-[#e83c62]">{content?.kind ?? "SWEET_TALK"}</p><h2 className="mt-4 font-display text-4xl">{content?.title ?? mode.title}</h2><p className="mt-5 text-base leading-8 text-slate-600">{line}</p><div className="mt-7 flex items-center justify-between rounded-[18px_5px_18px_5px] bg-[#fff1f3] p-4"><span className="inline-flex items-center gap-2 text-sm font-black text-[#d9375b]"><Heart className="h-4 w-4" />Sweetness</span><span className="font-display text-3xl text-[#d9375b]">{content?.sweetnessLevel ?? 88}%</span></div></div><ComfortPlayer locale={locale} modeSlug={view.slug} line={line} characterId={content?.characterId} characterSlug={character?.slug} characterName={character?.name} contentId={content?.id} /></div></section>
    <section className="grid gap-7"><SectionHeading eyebrow={copy.comicEyebrow} title={copy.comicTitle} description={copy.comicBody} /><MiniComic mode={view} locale={locale} /></section>
    <section className="exchange-panel grid gap-6 bg-[#111827] p-6 text-white sm:p-8 lg:grid-cols-[1fr_auto] lg:items-center"><SectionHeading eyebrow={copy.unlockEyebrow} title={copy.unlockTitle} description={copy.unlockBody} tone="light" /><Link href={localePath(locale, "/shop")} className="exchange-button-primary"><LockKeyhole className="h-4 w-4" />{pick(locale, "Browse unlocks", "查看可解鎖物品")}</Link></section>
    <section className="grid gap-7"><SectionHeading eyebrow={copy.relatedEyebrow} title={copy.relatedTitle} description={copy.relatedBody} /><div className="grid gap-5 md:grid-cols-3">{related.map((entry) => <ComfortModeCard key={entry.id} mode={entry} locale={locale} />)}</div></section>
  </div>;
}
