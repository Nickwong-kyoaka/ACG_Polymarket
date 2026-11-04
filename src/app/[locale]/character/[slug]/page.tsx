import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { CharacterArt } from "@/components/character-art";
import { CharacterCard } from "@/components/character-card";
import { CharacterTradeDrawer } from "@/components/character-trade-drawer";
import { CharacterSections } from "@/components/character-sections/character-sections";
import { CharacterSourceNotes, CharacterSourceStatus } from "@/components/character-sections/source-notes";
import { CharacterComfortSection } from "@/components/character-sections/comfort-section";
import { CommentPanel } from "@/components/comment-panel";
import { MarketHistoryChart } from "@/components/market-history-chart";
import { MarketAlertPanel } from "@/components/market-alert-panel";
import { isPublicLocale, localePath, localizeAttribute, localizeCharacter, localizeReleaseSeason, pick } from "@/components/acg-locale";
import { WatchlistButton } from "@/components/watchlist-button";
import { EntityProposalForm } from "@/components/entity-proposal-form";
import { FollowButton } from "@/components/follow-button";
import { compactNumber, currencyLabel } from "@/lib/utils";
import { getCharacterView, getPortfolioView, getReactionSummary, getWatchlistIds } from "@/lib/store";
import { publishedVisuals } from "@/lib/public-assets";

export const dynamic = "force-dynamic";

export default async function CharacterPage({ params, searchParams }: {
  params: Promise<{ locale: string; slug: string }>;
  searchParams?: Promise<{ tab?: string | string[] }>;
}) {
  const { locale: rawLocale, slug } = await params;
  if (!isPublicLocale(rawLocale)) notFound();
  const locale = rawLocale;
  const view = await getCharacterView(slug, locale).catch(() => null);
  if (!view) notFound();
  const [portfolio, reactions, watchlist, query] = await Promise.all([
    getPortfolioView().catch(() => null),
    getReactionSummary(view.character.id),
    getWatchlistIds().catch(() => [] as string[]),
    searchParams ?? Promise.resolve({ tab: undefined }),
  ]);
  const character = localizeCharacter(view.character, locale);
  const ownedPosition = portfolio?.positions.find((position) => position.character.id === character.id);
  const attributes = view.attributes.filter((attribute) => attribute.displayable).map((attribute) => localizeAttribute(character, attribute, locale));
  const visualAssets = publishedVisuals(view.assets);
  const primaryAsset = visualAssets[0];
  const initialTab = typeof query.tab === "string" ? query.tab : "overview";

  return <div className="exchange-page character-detail pb-40 lg:pb-12">
    <Link href={localePath(locale, "/market")} className="inline-flex min-h-11 w-fit items-center gap-2 text-sm font-bold text-slate-600 hover:underline"><ArrowLeft aria-hidden="true" className="h-4 w-4" />{pick(locale, "Back to characters", "返回角色目錄")}</Link>

    <section aria-labelledby="character-name" className="exchange-panel overflow-hidden bg-white">
      <div className="grid gap-0 sm:grid-cols-[minmax(0,240px)_1fr] lg:grid-cols-[minmax(0,280px)_1fr]">
        <CharacterArt character={character} asset={primaryAsset} locale={locale} priority className="!min-h-0 max-h-56 w-full sm:max-h-none sm:h-full" sizes="(min-width: 1024px) 280px, (min-width: 640px) 240px, 100vw" />
        <div className="min-w-0 p-5 sm:p-7">
          <Link href={localePath(locale, `/series/${view.series.slug}`)} className="inline-flex min-h-11 items-center text-sm font-bold text-slate-600 hover:underline">{character.sourceTitle ?? view.series.title}</Link>
          <h1 id="character-name" className="mt-1 font-display text-3xl leading-tight sm:text-4xl">{character.name}</h1>
          <p className="mt-2 text-sm font-bold text-slate-600">{character.title}</p>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-700">{character.summary}</p>
          {character.favoritePhrase ? <blockquote className="mt-3 border-l-2 border-slate-300 pl-3 text-sm leading-6 text-slate-600">&ldquo;{character.favoritePhrase}&rdquo;</blockquote> : null}
          <div id="character-actions" className="mt-5 flex flex-wrap items-center gap-3 [&_button]:min-h-11 [&_button]:!text-sm">
            <CharacterTradeDrawer characterId={character.id} quote={view.quote} sellQuote={view.sellQuote} balance={portfolio?.wallet.softBalance ?? 0} ownedUnits={ownedPosition?.units ?? 0} locale={locale} signedIn={Boolean(portfolio)} />
            <span className="rounded-full border border-slate-200 px-4"><FollowButton locale={locale} targetType="character" targetId={character.id} /></span>
            <WatchlistButton characterId={character.id} watching={watchlist.includes(character.id)} locale={locale} />
          </div>
          <p className="mt-3 text-xs leading-5 text-slate-500">{pick(locale, "Support-unit price", "每份應援價格")}: {currencyLabel(view.quote)} · {pick(locale, "Virtual units, not probability or cash value", "虛擬份數，非機率或現金價值")}</p>
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
            {primaryAsset ? <CharacterSourceStatus locale={locale} sourceKind={primaryAsset.sourceKind} permissionStatus={primaryAsset.permissionBadge} /> : <p className="text-xs text-slate-600">{character.rightsType === "ORIGINAL" ? pick(locale, "Platform original", "平台原創") : pick(locale, "Metadata listing; no image bundled", "資料型條目，不內含角色圖片")}</p>}
            <a href="#sources" className="inline-flex min-h-11 items-center text-sm font-bold underline">{pick(locale, "Sources & permissions", "來源與授權")}</a>
          </div>
        </div>
      </div>
    </section>

    <CharacterSections locale={locale} initialTab={initialTab} sections={[
      { id: "overview", label: pick(locale, "Overview", "概覽"), content: <div className="grid gap-7">
        <section aria-labelledby="profile-title" className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 id="profile-title" className="font-display text-2xl">{pick(locale, "Character notebook", "角色手帳")}</h2>
          <p className="mt-3 text-sm leading-7 text-slate-700">{character.fandomPrompt}</p>
          <dl className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[
            [pick(locale, "Series", "作品"), character.sourceTitle ?? view.series.title],
            [pick(locale, "Release", "登場季別"), localizeReleaseSeason(character.releaseSeason ?? "-", locale)],
            [pick(locale, "Comfort style", "陪伴方式"), character.mood],
            [pick(locale, "Supporters / collected units", "應援者／收藏份數"), `${compactNumber(character.supporterCount)} / ${compactNumber(character.circulatingUnits)}`],
          ].map(([label, value]) => <div key={label}><dt className="text-xs text-slate-500">{label}</dt><dd className="mt-1 text-sm font-bold leading-6">{value}</dd></div>)}</dl>
          <div className="mt-5 flex flex-wrap gap-2">{character.tags.map((tag) => <span key={tag} className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">#{tag}</span>)}</div>
        </section>
        <section aria-labelledby="attributes-title"><h2 id="attributes-title" className="font-display text-2xl">{pick(locale, "Attributes", "角色屬性")}</h2><dl className="mt-4 grid gap-x-6 rounded-xl border border-slate-200 bg-white px-5 sm:grid-cols-2">{attributes.map((attribute) => <div key={attribute.id} className="border-b border-slate-100 py-4"><dt className="text-xs font-bold text-slate-500">{attribute.label}</dt><dd className="mt-2 text-sm leading-6 text-slate-700">{attribute.value}</dd></div>)}</dl></section>
        {view.relatedCharacters.length ? <section aria-labelledby="related-title"><h2 id="related-title" className="font-display text-2xl">{pick(locale, "Related characters", "相關角色")}</h2><div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{view.relatedCharacters.map((related) => <CharacterCard key={related.id} character={related} locale={locale} />)}</div></section> : null}
      </div> },
      { id: "gallery", label: pick(locale, "Gallery", "畫廊"), content: <section aria-labelledby="gallery-title" className="grid gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3"><h2 id="gallery-title" className="font-display text-2xl">{pick(locale, "Published visuals", "已發布圖片")}</h2><Link href={localePath(locale, `/gallery/${character.slug}`)} className="exchange-button-secondary min-h-11 text-sm">{pick(locale, "Full gallery & credits", "完整畫廊與來源")}</Link></div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{visualAssets.length ? visualAssets.map((asset) => <article key={asset.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white"><CharacterArt character={character} asset={asset} locale={locale} className="!min-h-0 aspect-[4/5]" sizes="(min-width: 1024px) 30vw, (min-width: 640px) 50vw, 100vw" /><div className="grid gap-2 p-4"><h3 className="text-sm font-bold">{asset.label}</h3><CharacterSourceStatus locale={locale} sourceKind={asset.sourceKind} permissionStatus={asset.permissionBadge} /><a href="#sources" className="inline-flex min-h-11 items-center text-sm font-bold underline">{pick(locale, "Source record", "來源記錄")}</a></div></article>) : <p className="text-sm leading-6 text-slate-600">{pick(locale, "No additional published SFW visuals are available. Source records remain below.", "目前沒有其他已發布的 SFW 圖片，來源記錄仍保留於下方。")}</p>}</div>
      </section> },
      { id: "notes", label: pick(locale, "Notes", "筆記"), anchors: ["comments", "proposals"], content: <div className="grid gap-7">
        <section id="comments" aria-labelledby="comments-title"><h2 id="comments-title" className="mb-4 font-display text-2xl">{pick(locale, "Support wall", "應援留言牆")}</h2><CommentPanel characterId={character.id} comments={view.comments} reactions={reactions} locale={locale} /></section>
        <section id="proposals" aria-labelledby="proposals-title"><h2 id="proposals-title" className="mb-4 font-display text-2xl">{pick(locale, "Suggest a correction", "提出資料修訂")}</h2><EntityProposalForm entityType="CHARACTER" entityId={character.id} currentSummary={character.summary} locale={locale} fields={[
          { key: "summary", label: pick(locale, "Summary", "介紹"), value: character.summary },
          { key: "name", label: pick(locale, "Name", "名稱"), value: character.name },
          { key: "title", label: pick(locale, "Headline", "標題"), value: character.title },
          { key: "mood", label: pick(locale, "Comfort style", "陪伴氣質"), value: character.mood },
          { key: "fandomPrompt", label: pick(locale, "Fan note", "角色筆記"), value: character.fandomPrompt },
          { key: "favoritePhrase", label: pick(locale, "Favorite phrase", "喜歡的一句話"), value: character.favoritePhrase ?? "" },
          { key: "releaseSeason", label: pick(locale, "Release season", "登場季別"), value: character.releaseSeason ?? "", localized: false },
        ]} /></section>
      </div> },
      { id: "support", label: pick(locale, "Support", "應援"), content: <div className="grid gap-6">
        <div><h2 className="font-display text-2xl">{pick(locale, "Support history", "應援記錄")}</h2><p className="mt-2 text-sm leading-6 text-slate-600">{pick(locale, "Virtual support-unit activity, not a prediction probability or a financial return.", "虛擬應援份數的活動記錄，並非預測機率或投資回報。")}</p><a href="#character-actions" className="inline-flex min-h-11 items-center text-sm font-bold underline">{pick(locale, "Open support from the character header", "前往角色頁首的應援按鈕")}</a></div>
        <div className="rounded-xl bg-slate-900 p-5 text-white [&_p]:!text-xs [&_span]:!text-xs [&_button]:!text-sm"><MarketHistoryChart characterId={character.id} locale={locale} /></div>
        <div className="[&_p]:!text-xs [&_button]:!text-sm"><MarketAlertPanel characterId={character.id} locale={locale} signedIn={Boolean(portfolio)} /></div>
      </div> },
      { id: "comfort", label: pick(locale, "Comfort", "陪伴"), content: <CharacterComfortSection locale={locale} characterSlug={character.slug} characterName={character.name} /> },
    ]} />

    <CharacterSourceNotes locale={locale} characterSlug={character.slug} assets={visualAssets} attribution={view.sourceAttribution} />
  </div>;
}
