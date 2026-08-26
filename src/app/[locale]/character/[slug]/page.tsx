import Link from "next/link";
import { ArrowLeft, AudioLines, BookHeart, BookOpenText, ExternalLink, HeartHandshake, Images, Radio, ShieldCheck, Sparkles, Users } from "lucide-react";
import { notFound } from "next/navigation";
import { CharacterArt } from "@/components/character-art";
import { CharacterCard } from "@/components/character-card";
import { CharacterVoicePlayer } from "@/components/character-voice-player";
import { CharacterTradeDrawer } from "@/components/character-trade-drawer";
import { CommentPanel } from "@/components/comment-panel";
import { MarketHistoryChart } from "@/components/market-history-chart";
import { MarketAlertPanel } from "@/components/market-alert-panel";
import { getExchangeCopy, isPublicLocale, localePath, localizeAttribute, localizeCharacter, localizeReleaseSeason, pick } from "@/components/acg-locale";
import { Badge } from "@/components/ui/badge";
import { SectionHeading } from "@/components/ui/section-heading";
import { WatchlistButton } from "@/components/watchlist-button";
import { compactNumber, currencyLabel } from "@/lib/utils";
import { getCharacterView, getPortfolioView, getReactionSummary, getWatchlistIds } from "@/lib/store";
import { publishedVisuals } from "@/lib/public-assets";

export const dynamic = "force-dynamic";

export default async function CharacterPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale: rawLocale, slug } = await params;
  if (!isPublicLocale(rawLocale)) notFound();
  const locale = rawLocale;
  const view = await getCharacterView(slug, locale).catch(() => null);
  if (!view) notFound();
  const [portfolio, reactions, watchlist] = await Promise.all([
    getPortfolioView().catch(() => null),
    getReactionSummary(view.character.id),
    getWatchlistIds().catch(() => [] as string[]),
  ]);
  const character = localizeCharacter(view.character, locale);
  const ownedPosition = portfolio?.positions.find((position) => position.character.id === character.id);
  const copy = getExchangeCopy(locale);
  const page = locale === "zh-Hant" ? {
    back: "返回角色目錄", live: "TODAY'S SUPPORT", support: "目前應援價", holders: "應援者", units: "收藏份數", spread: "退回參考價", bioEyebrow: "CHARACTER BIO", bioTitle: "從故事、性格與讓人心動的小地方認識角色。", bioBody: "角色小傳依作品官方資料整理，並以百科交叉核對；內容重新撰寫，適合初次認識。", background: "角色背景", resonance: "讓人留下的理由", profile: "角色手帳", voiceEyebrow: "A VOICE FOR TONIGHT", voiceTitle: "今晚，讓角色親自留一句話給你", voiceBody: "每名角色都有獨立的雙語安慰台詞與合成聲線設定，可以直接在瀏覽器播放。", attributesEyebrow: "CHARACTER PROFILE", attributesTitle: "把角色的氣質收進一張小小檔案卡。", attributesBody: "甜度、陪伴方式、聲線、角色類型與作品資料都可以慢慢翻閱。", galleryEyebrow: "WARDROBE & VISUAL FILE", galleryTitle: "服裝、表情與不同時期的角色模樣", galleryBody: "每張公開素材都附上來源與整理狀態，方便繼續探索喜歡的造型。", openGallery: "打開完整角色畫廊", trendEyebrow: "SUPPORT PULSE", trendTitle: "最近有多少心意來到這裡", trendBody: "圖表記錄近期應援份數、收藏者與共同里程碑的變化。", mediaEyebrow: "COMFORT ROUTE", mediaTitle: "把角色帶進今晚的安慰房", mediaBody: "甜言卡、合成語音、原創小漫畫與壁紙，讓陪伴延伸到收藏房間。", rightsEyebrow: "SOURCE NOTES", rightsTitle: "每張圖都有可以回去的地方", rightsBody: "素材旁保留作品來源、整理狀態與聯絡入口，畫廊也可以查看完整記錄。", commentsEyebrow: "SUPPORT WALL", commentsTitle: "把心動的理由寫在這裡", commentsBody: "留下加油、心動或閃耀，也看看其他人珍惜這名角色的瞬間。", relatedEyebrow: "RELATED CHARACTERS", relatedTitle: "沿著作品與氣質，再認識幾名角色", relatedBody: "收藏櫃還有很多位置，下一份喜歡也可以自然地來。", visit: "走進安慰房", source: "查看來源" } : {
    back: "Back to character catalog", live: "TODAY'S SUPPORT", support: "Current support quote", holders: "Supporters", units: "Collected units", spread: "Return reference", bioEyebrow: "CHARACTER BIO", bioTitle: "Meet the story, personality, and small details fans hold onto.", bioBody: "Character notes are rewritten from official references and encyclopedia cross-checks, with an easy first introduction in mind.", background: "Background", resonance: "Why fans stay", profile: "Character notebook", voiceEyebrow: "A VOICE FOR TONIGHT", voiceTitle: "Let this character leave you a line tonight", voiceBody: "Every character has an original bilingual comfort script and synth direction that plays directly in the browser.", attributesEyebrow: "CHARACTER PROFILE", attributesTitle: "Keep the character's mood in one small profile card.", attributesBody: "Browse sweetness, company style, voice direction, archetype, and series notes at your own pace.", galleryEyebrow: "WARDROBE & VISUAL FILE", galleryTitle: "Outfits, expressions, and different sides of the character", galleryBody: "Published visuals include their source and editorial state, making each look easy to explore further.", openGallery: "Open the full character gallery", trendEyebrow: "SUPPORT PULSE", trendTitle: "How much affection has arrived lately", trendBody: "The chart follows recent support, collectors, and movement toward the shared milestone.", mediaEyebrow: "COMFORT ROUTE", mediaTitle: "Bring this character into tonight's comfort room", mediaBody: "Sweet-talk cards, synth voice, original mini comics, and wallpapers carry the company into your collection room.", rightsEyebrow: "SOURCE NOTES", rightsTitle: "Every image has a way back to its source", rightsBody: "Series references, editorial status, and contact access stay beside each asset, with the full record in Gallery.", commentsEyebrow: "SUPPORT WALL", commentsTitle: "Write down the detail that made you stay", commentsBody: "Leave a cheer, heart, or spark, and discover the moments other fans treasure too.", relatedEyebrow: "RELATED CHARACTERS", relatedTitle: "Follow the series and mood toward someone new", relatedBody: "There is always another space on the shelf when a new favorite arrives.", visit: "Enter comfort room", source: "Open source" };
  const attributes = view.attributes.filter((attribute) => attribute.displayable).map((attribute) => localizeAttribute(character, attribute, locale));
  const visualAssets = publishedVisuals(view.assets);
  const primaryAsset = visualAssets[0];

  return <div className="exchange-page pb-36 lg:pb-16">
    <Link href={localePath(locale, "/market")} className="inline-flex w-fit items-center gap-2 text-sm font-black text-slate-500 transition hover:text-[#e83c62]"><ArrowLeft className="h-4 w-4" />{page.back}</Link>

    <section className="exchange-panel overflow-hidden bg-[#111827] text-white">
      <div className="grid lg:grid-cols-[1.1fr_.9fr]">
        <div className="group relative min-h-[560px] lg:min-h-[760px]"><CharacterArt character={character} asset={primaryAsset} className="absolute inset-0 h-full" priority sizes="(min-width: 1024px) 58vw, 100vw" /><div className="absolute left-5 top-5 z-10 flex flex-wrap gap-2 sm:left-8 sm:top-8"><Badge tone={character.rightsType === "ORIGINAL" ? "warm" : "cool"}>{character.rightsType === "ORIGINAL" ? copy.common.original : copy.common.metadata}</Badge>{primaryAsset?.permissionBadge ? <Badge>{primaryAsset.permissionBadge}</Badge> : null}{character.releaseSeason ? <Badge>{localizeReleaseSeason(character.releaseSeason, locale)}</Badge> : null}</div></div>
        <div className="relative flex flex-col justify-center p-6 sm:p-9 xl:p-12">
          <p className="exchange-kicker text-[#ffcc66] before:bg-[#ffcc66]">{page.live}</p>
          <p className="mt-7 text-xs font-black uppercase tracking-[.2em] text-white/42">{character.sourceTitle ?? view.series.title}</p>
          <h1 className="mt-3 font-display text-5xl leading-[.92] sm:text-6xl xl:text-7xl">{character.name}</h1>
          <p className="mt-4 text-sm font-bold uppercase tracking-[.16em] text-[#3ed6e0]">{character.title}</p>
          <p className="mt-7 text-base leading-8 text-white/68">{character.summary}</p>
          {character.favoritePhrase ? <blockquote className="mt-6 border-l-4 border-[#ffcc66] pl-5 font-display text-2xl leading-snug text-white">&ldquo;{character.favoritePhrase}&rdquo;</blockquote> : null}
          <div className="mt-7 flex flex-wrap gap-2">{character.tags.map((tag) => <span key={tag} className="rounded-full border border-white/12 bg-white/6 px-3 py-1 text-[10px] font-black uppercase tracking-[.15em] text-white/58">#{tag}</span>)}</div>
          <div className="mt-8 grid grid-cols-3 gap-3 border-y border-white/10 py-5">
            <div><Radio className="h-4 w-4 text-[#ffcc66]" /><p className="mt-3 text-[9px] font-black uppercase tracking-[.15em] text-white/40">{page.support}</p><p className="mt-1 text-xl font-black">{currencyLabel(view.quote)}</p></div>
            <div><Users className="h-4 w-4 text-[#3ed6e0]" /><p className="mt-3 text-[9px] font-black uppercase tracking-[.15em] text-white/40">{page.holders}</p><p className="mt-1 text-xl font-black">{compactNumber(character.supporterCount)}</p></div>
            <div><Sparkles className="h-4 w-4 text-[#ff7d9a]" /><p className="mt-3 text-[9px] font-black uppercase tracking-[.15em] text-white/40">{page.units}</p><p className="mt-1 text-xl font-black">{compactNumber(character.circulatingUnits)}</p></div>
          </div>
          <div className="mt-7 flex items-center gap-3"><WatchlistButton characterId={character.id} watching={watchlist.includes(character.id)} locale={locale} /><Link href={localePath(locale, "/comfort")} className="exchange-button-secondary border-white/12 bg-white/6 text-white hover:bg-white/12 hover:text-white"><HeartHandshake className="h-4 w-4" />{page.visit}</Link></div>
        </div>
      </div>
    </section>

    <section className="grid gap-7"><SectionHeading eyebrow={page.bioEyebrow} title={page.bioTitle} description={page.bioBody} /><div className="exchange-panel grid lg:grid-cols-[1.15fr_.85fr]"><article className="bg-[#fffaf4] p-6 sm:p-8"><div className="flex items-center gap-3 text-[#a34855]"><BookOpenText className="h-5 w-5" /><p className="text-[10px] font-black uppercase tracking-[.18em]">{page.background}</p></div><p className="mt-5 text-base leading-8 text-slate-700">{character.summary}</p><h3 className="mt-8 text-[10px] font-black uppercase tracking-[.18em] text-[#5f8f87]">{page.resonance}</h3><p className="mt-3 font-display text-2xl leading-snug">{character.fandomPrompt}</p></article><aside className="bg-[#283338] p-6 text-white sm:p-8"><p className="text-[10px] font-black uppercase tracking-[.18em] text-[#f0c884]">{page.profile}</p><dl className="mt-6 grid gap-5">{[[pick(locale, "Series", "作品"), character.sourceTitle ?? view.series.title], [pick(locale, "Release", "登場季別"), localizeReleaseSeason(character.releaseSeason ?? "—", locale)], [pick(locale, "Comfort style", "陪伴方式"), character.mood], [pick(locale, "Support theme", "應援主題"), character.title]].map(([label, value]) => <div key={label} className="border-b border-white/12 pb-4"><dt className="text-[9px] font-black uppercase tracking-[.15em] text-white/42">{label}</dt><dd className="mt-2 text-sm font-bold leading-6 text-white/84">{value}</dd></div>)}</dl></aside></div></section>

    <section className="grid gap-7"><SectionHeading eyebrow={page.voiceEyebrow} title={page.voiceTitle} description={page.voiceBody} /><CharacterVoicePlayer locale={locale} characterSlug={character.slug} characterName={character.name} /></section>

    <section className="grid gap-7"><div className="flex flex-wrap items-end justify-between gap-5"><SectionHeading eyebrow={page.galleryEyebrow} title={page.galleryTitle} description={page.galleryBody} /><Link href={localePath(locale, `/gallery/${character.slug}`)} className="exchange-button-secondary"><Images className="h-4 w-4" />{page.openGallery}</Link></div><div className={`grid gap-5 ${visualAssets.length > 1 ? "md:grid-cols-2 xl:grid-cols-3" : "max-w-2xl"}`}>{visualAssets.length ? visualAssets.slice(0, 6).map((asset, index) => <article key={asset.id} className="exchange-panel group overflow-hidden"><CharacterArt character={character} asset={asset} className="min-h-[380px]" sizes="(min-width: 1280px) 32vw, (min-width: 768px) 50vw, 100vw" /><div className="flex items-center justify-between gap-4 p-4"><div><p className="text-[9px] font-black uppercase tracking-[.15em] text-[#bd3628]">LOOK {String(index + 1).padStart(2, "0")}</p><p className="mt-2 text-xs font-bold text-slate-600">{asset.label}</p></div><Badge>{asset.permissionBadge ?? asset.sourceKind?.replaceAll("_", " ") ?? "SOURCE ON FILE"}</Badge></div></article>) : <div className="exchange-panel p-8 text-sm font-bold text-slate-500">{pick(locale, "Additional outfit references are still in the review queue.", "更多服裝參考仍在素材審核佇列中。")}</div>}</div></section>

    <div className="grid gap-6 lg:grid-cols-[1fr_380px] xl:grid-cols-[1fr_430px]">
      <section className="exchange-panel bg-[#111827] p-6 text-white sm:p-8"><SectionHeading eyebrow={page.trendEyebrow} title={page.trendTitle} description={page.trendBody} tone="light" /><div className="mt-8"><MarketHistoryChart characterId={character.id} locale={locale} /></div></section>
      <CharacterTradeDrawer characterId={character.id} quote={view.quote} sellQuote={view.sellQuote} balance={portfolio?.wallet.softBalance ?? 0} ownedUnits={ownedPosition?.units ?? 0} locale={locale} signedIn={Boolean(portfolio)} />
    </div>
    <MarketAlertPanel characterId={character.id} locale={locale} signedIn={Boolean(portfolio)} />

    <section className="grid gap-7"><SectionHeading eyebrow={page.attributesEyebrow} title={page.attributesTitle} description={page.attributesBody} /><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{attributes.map((attribute, index) => <article key={attribute.id} className="exchange-panel p-5"><div className="flex items-start justify-between gap-4"><p className="text-[10px] font-black uppercase tracking-[.18em] text-[#e83c62]">{attribute.label}</p><span className="text-3xl font-black text-slate-100">{String(index + 1).padStart(2, "0")}</span></div><p className="mt-5 text-sm leading-7 text-slate-600">{attribute.value}</p></article>)}</div></section>

    <section className="grid gap-6 lg:grid-cols-[.9fr_1.1fr]">
      <div className="exchange-panel bg-[#111827] p-6 text-white sm:p-8"><SectionHeading eyebrow={page.mediaEyebrow} title={page.mediaTitle} description={page.mediaBody} tone="light" /><div className="mt-8 grid gap-3 sm:grid-cols-3">{[{ icon: BookHeart, en: "Sweet comic", zh: "甜度漫畫" }, { icon: AudioLines, en: "Voice / ASMR", zh: "語音 / ASMR" }, { icon: Sparkles, en: "Wallpaper", zh: "原創壁紙" }].map((item) => <Link key={item.en} href={localePath(locale, "/comfort")} className="rounded-[18px_5px_18px_5px] border border-white/10 bg-white/6 p-5 text-sm font-black transition hover:bg-white/10"><item.icon className="mb-5 h-6 w-6 text-[#ffcc66]" />{pick(locale, item.en, item.zh)}</Link>)}</div></div>
      <div className="exchange-panel p-6 sm:p-8"><SectionHeading eyebrow={page.rightsEyebrow} title={page.rightsTitle} description={page.rightsBody} /><div className="mt-7 grid gap-3"><div className="flex gap-3 rounded-[18px_5px_18px_5px] bg-[#eef8f7] p-4"><ShieldCheck className="mt-1 h-5 w-5 shrink-0 text-[#19757a]" /><p className="text-sm leading-7 text-slate-600">{primaryAsset ? pick(locale, `Published as ${primaryAsset.permissionBadge ?? "source on file"}. The image source and takedown path remain visible.`, `此素材以「${primaryAsset.permissionBadge ?? "已有來源記錄"}」狀態發布，來源與下架入口持續公開。`) : character.rightsType === "ORIGINAL" ? pick(locale, "Original first-party character and demo asset pack.", "平台原創角色與自有示範素材，可在公開版使用。") : pick(locale, "Metadata-only listing. Official art, voice, logos, and comic pages are not bundled.", "只展示資料型角色資訊，不內含官方立繪、語音、標誌或漫畫頁。")}</p></div><div className="flex flex-wrap gap-3">{view.sourceAttribution ? <a href={view.sourceAttribution.sourceUrl} target="_blank" rel="noreferrer" className="exchange-button-secondary"><ExternalLink className="h-4 w-4" />{page.source}</a> : null}<Link href={localePath(locale, `/gallery/${character.slug}`)} className="exchange-button-secondary">{pick(locale, "Open gallery & credits", "查看畫廊與素材來源")}</Link></div></div></div>
    </section>

    <section className="grid gap-7"><SectionHeading eyebrow={page.commentsEyebrow} title={page.commentsTitle} description={page.commentsBody} /><CommentPanel characterId={character.id} comments={view.comments} reactions={reactions} locale={locale} /></section>

    {view.relatedCharacters.length ? <section className="grid gap-7"><SectionHeading eyebrow={page.relatedEyebrow} title={page.relatedTitle} description={page.relatedBody} /><div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">{view.relatedCharacters.map((related) => <CharacterCard key={related.id} character={related} locale={locale} />)}</div></section> : null}
  </div>;
}
