import Link from "next/link";
import { ArrowRight, AudioLines, BookHeart, HeartHandshake, MoonStar } from "lucide-react";
import { notFound } from "next/navigation";
import { CharacterArt } from "@/components/character-art";
import { isPublicLocale, localePath, localizeCharacter } from "@/components/acg-locale";
import { ComfortModeCard, ComfortNotice, localizeComfortContent, localizeComfortMode, MiniComic } from "@/components/comfort-hub";
import { ComfortPlayer } from "@/components/comfort-player";
import { SectionHeading } from "@/components/ui/section-heading";
import { getCharacterComfortLine } from "@/data/character-voices";
import { getComfortModeView, listComfortModes } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function ComfortHubPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  if (!isPublicLocale(rawLocale)) notFound();
  const locale = rawLocale;
  const modes = await listComfortModes(locale);
  const featuredView = modes[0] ? await getComfortModeView(modes[0].slug, locale).catch(() => null) : null;
  const featuredMode = featuredView ? localizeComfortMode(featuredView, locale) : null;
  const featuredSource = featuredView?.contents.find((content) => content.character);
  const featuredCharacter = featuredSource?.character ? localizeCharacter(featuredSource.character, locale) : null;
  const featuredContent = featuredSource ? localizeComfortContent(featuredSource, locale) : null;
  const featuredLine = featuredCharacter ? getCharacterComfortLine(featuredCharacter.slug, locale) : featuredContent?.body;
  const copy = locale === "zh-Hant" ? { eyebrow: "ACG COMFORT ROOMS", title: "今晚想在哪一間房坐坐？", body: "孤單、壓力、讀書後的疲憊、睡不著、想找回信心，或只是心裡有點酸，都可以挑一盞適合現在的燈。", choose: "看看今晚的房間", market: "去角色目錄散步", modesEyebrow: "SIX COMFORT ROOMS", modesTitle: "從現在最需要的陪伴開始", modesBody: "六間房各自有角色聲線、呼吸節奏、四格故事與可以帶回收藏櫃的小物。", sampleEyebrow: "TONIGHT'S FEATURED ROOM", sampleTitle: "先在這段角色時間裡停一會", sampleBody: "角色專屬台詞會用裝置端合成聲線播放，環境音也只在你的房間裡輕輕響起。", comicEyebrow: "ORIGINAL MINI COMIC", comicTitle: "四格之後，世界小聲了一點", comicBody: "每間房都有一段原創小故事，把情緒慢慢帶到比較柔軟的地方。" } : { eyebrow: "ACG COMFORT ROOMS", title: "Which room would feel good tonight?", body: "Loneliness, pressure, study fatigue, restless sleep, confidence, or a tender ache can each find a lamp that suits the moment.", choose: "See tonight's rooms", market: "Wander through the catalog", modesEyebrow: "SIX COMFORT ROOMS", modesTitle: "Begin with the company you need right now", modesBody: "Each room has its own character voice, breathing pace, four-panel story, and a small keepsake for your collection shelf.", sampleEyebrow: "TONIGHT'S FEATURED ROOM", sampleTitle: "Stay inside this character moment for a while", sampleBody: "Character-specific lines use on-device synth direction, with ambience playing softly inside your room.", comicEyebrow: "ORIGINAL MINI COMIC", comicTitle: "Four panels later, the world is a little quieter", comicBody: "Every room has an original small story that carries the feeling somewhere softer." };

  return <div className="exchange-page">
    <section className="exchange-panel overflow-hidden bg-[#111827] text-white"><div className="grid lg:grid-cols-[.95fr_1.05fr]"><div className="flex flex-col justify-center p-7 sm:p-10 xl:p-12"><p className="exchange-kicker text-[#ffcc66] before:bg-[#ffcc66]">{copy.eyebrow}</p><h1 className="mt-7 exchange-title text-white">{copy.title}</h1><p className="mt-6 max-w-2xl text-base leading-8 text-white/62">{copy.body}</p><div className="mt-8 flex flex-wrap gap-3"><Link href="#comfort-modes" className="exchange-button-primary"><HeartHandshake className="h-4 w-4" />{copy.choose}</Link><Link href={localePath(locale, "/market")} className="inline-flex items-center gap-2 rounded-[14px_4px_14px_4px] border border-white/15 px-5 py-3 text-sm font-black text-white hover:bg-white/8">{copy.market}<ArrowRight className="h-4 w-4" /></Link></div></div><div className="group relative min-h-[520px]">{featuredCharacter ? <CharacterArt character={featuredCharacter} className="absolute inset-0 h-full" priority /> : <div className="absolute inset-0 bg-[radial-gradient(circle_at_60%_30%,rgba(62,214,224,.35),transparent_25%),linear-gradient(135deg,#15233d,#553a61)]" />}{featuredMode ? <div className="absolute inset-x-6 bottom-6 z-10 rounded-[22px_5px_22px_5px] border border-white/15 bg-[#111827]/84 p-5 backdrop-blur-xl"><p className="text-[10px] font-black uppercase tracking-[.2em] text-[#3ed6e0]">{featuredMode.subtitle}</p><h2 className="mt-2 font-display text-4xl">{featuredMode.title}</h2><p className="mt-3 text-sm leading-7 text-white/62">{featuredMode.description}</p></div> : null}</div></div></section>
    <ComfortNotice locale={locale} />
    <section id="comfort-modes" className="grid gap-7"><SectionHeading eyebrow={copy.modesEyebrow} title={copy.modesTitle} description={copy.modesBody} /><div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{modes.map((mode) => <ComfortModeCard key={mode.id} mode={mode} locale={locale} />)}</div></section>
    {featuredView && featuredMode && featuredContent && featuredLine ? <section className="grid gap-7"><SectionHeading eyebrow={copy.sampleEyebrow} title={copy.sampleTitle} description={copy.sampleBody} /><div className="grid gap-6 lg:grid-cols-[.9fr_1.1fr]"><div className="exchange-panel p-6 sm:p-8"><div className="flex items-center gap-3"><MoonStar className="h-6 w-6 text-[#e83c62]" /><p className="text-[10px] font-black uppercase tracking-[.2em] text-[#e83c62]">{featuredContent.kind}</p></div><h3 className="mt-5 font-display text-4xl">{featuredContent.title}</h3><p className="mt-5 text-base leading-8 text-slate-600">{featuredLine}</p><div className="mt-7 flex gap-3"><span className="inline-flex items-center gap-2 rounded-full bg-[#fff1f3] px-4 py-2 text-xs font-black text-[#d9375b]"><BookHeart className="h-4 w-4" />{featuredContent.sweetnessLevel}% sweetness</span><span className="inline-flex items-center gap-2 rounded-full bg-[#e9f8f7] px-4 py-2 text-xs font-black text-[#19757a]"><AudioLines className="h-4 w-4" />Character synth</span></div></div><ComfortPlayer locale={locale} modeSlug={featuredView.slug} line={featuredLine} characterId={featuredContent.characterId} characterSlug={featuredCharacter?.slug} characterName={featuredCharacter?.name} contentId={featuredContent.id} /></div></section> : null}
    {featuredView ? <section className="grid gap-7"><SectionHeading eyebrow={copy.comicEyebrow} title={copy.comicTitle} description={copy.comicBody} /><MiniComic mode={featuredView} locale={locale} /></section> : null}
  </div>;
}
