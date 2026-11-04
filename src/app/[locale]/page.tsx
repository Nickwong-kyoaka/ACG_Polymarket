import Link from "next/link";
import { ArrowRight, CalendarDays, Heart, Image as GalleryIcon, Sparkles } from "lucide-react";
import { notFound } from "next/navigation";
import { isPublicLocale, localePath, localizeCharacter, pick } from "@/components/acg-locale";
import { CampaignCard, type PublicCampaign } from "@/components/campaign-card";
import { CharacterArt } from "@/components/character-art";
import { SeasonCalendarBoard } from "@/components/season-calendar-board";
import { SocialFeed } from "@/components/social-feed";
import { normalizeSocialNote, type SocialFeedTab } from "@/components/social-note-types";
import { getOptionalSessionUserId } from "@/lib/auth";
import { getCatalogCalendar } from "@/lib/catalog-community";
import { selectDailyCover } from "@/lib/editorial-cover";
import { getExchangeFeatureFlags } from "@/lib/feature-flags";
import { getPositiveMarketFeed } from "@/lib/market-feed";
import { listPredictionEvents } from "@/lib/prediction-market";
import { listPublicGallery } from "@/lib/public-media";
import { getSocialFeed } from "@/lib/social";
import { listCharacters } from "@/lib/store";
import { listSupportCampaigns } from "@/lib/support-campaigns";
import { getHongKongDayKey } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function ExchangeLobby({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams?: Promise<{ feed?: string }> }) {
  const [{ locale }, query] = await Promise.all([params, searchParams ?? Promise.resolve({ feed: undefined })]);
  if (!isPublicLocale(locale)) notFound();
  const userId = await getOptionalSessionUserId();
  const features = getExchangeFeatureFlags();
  const mode: SocialFeedTab = query.feed === "following" || query.feed === "seasonal" ? query.feed : "for-you";
  const now = new Date();
  const [featured, gallery, marketFeed, socialPayload, predictions, campaigns, calendar] = await Promise.all([
    listCharacters({ featuredOnly: true, locale }).catch(() => []),
    listPublicGallery({ locale, limit: 24 }).catch(() => null),
    getPositiveMarketFeed({ limit: 6, locale }).catch(() => null),
    features.community ? getSocialFeed({ mode, locale, viewerId: userId, limit: 20 }).catch(() => null) : Promise.resolve(null),
    features.predictions ? listPredictionEvents({ locale, limit: 4 }).catch(() => null) : Promise.resolve(null),
    listSupportCampaigns({ locale, userId, includeCompleted: false }).catch(() => []),
    getCatalogCalendar({ from: now, to: new Date(now.getTime() + 8 * 86_400_000), locale, userId }).catch(() => null),
  ]);
  const zh = locale === "zh-Hant";
  const galleryBySlug = new Map(gallery?.items.map((entry) => [entry.character.slug, entry.assets]) ?? []);
  const candidates = featured.filter((character) => galleryBySlug.get(character.slug)?.length);
  const heroSource = selectDailyCover(candidates, getHongKongDayKey()) ?? featured[0];
  const hero = heroSource ? localizeCharacter(heroSource, locale) : null;
  const image = heroSource ? galleryBySlug.get(heroSource.slug)?.[0] : undefined;
  const featuredPrediction = predictions?.events.flatMap((event) => event.markets.map((market) => ({ event, market }))).find(({ market }) => market.status === "OPEN");
  const notes = socialPayload?.items.flatMap((item) => { const note = normalizeSocialNote(item); return note ? [note] : []; }) ?? [];
  const yes = featuredPrediction?.market.outcomes.find((outcome) => outcome.key === "YES")?.probabilityBps ?? 5000;
  const day = new Intl.DateTimeFormat(zh ? "zh-HK" : "en", { weekday: "short", timeZone: "Asia/Hong_Kong" });
  const time = new Intl.DateTimeFormat(zh ? "zh-HK" : "en", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Hong_Kong" });
  return <div className="exchange-page discovery-page">
    <div className="discovery-heading"><h1>{zh ? "發現" : "Discover"}</h1><p>{zh ? "角色、作品，還有同好的新分享。" : "Characters, stories, and new shares from fellow fans."}</p></div>
    <section className="discovery-highlights" aria-label={zh ? "今日精選" : "Today's highlights"}>
      {hero ? <div className="daily-character"><CharacterArt locale={locale} character={hero} asset={image ? { publicUrl: image.url, altText: image.altText } : undefined} priority sizes="112px" /><div className="daily-character-copy"><p>{zh ? "今日角色" : "Character of the day"}</p><h2 className="line-clamp-1">{hero.name}</h2><p>{hero.sourceTitle ?? hero.title}</p><Link href={localePath(locale, `/character/${hero.slug}`)}>{zh ? "認識角色" : "Meet character"}<ArrowRight className="h-4 w-4" /></Link></div></div> : <div className="daily-character !grid-cols-1"><div className="daily-character-copy"><h2>{zh ? "從喜歡的作品開始" : "Start with a favorite story"}</h2><Link href={localePath(locale, "/market")}>{zh ? "瀏覽角色" : "Browse characters"}<ArrowRight className="h-4 w-4" /></Link></div></div>}
      {featuredPrediction ? <div className="prediction-highlight exchange-panel flex flex-col justify-center gap-2 p-4"><p className="text-xs font-semibold text-slate-500">{zh ? "正在預測" : "Open prediction"} · {featuredPrediction.event.title}</p><Link href={localePath(locale, `/predictions/${featuredPrediction.market.slug}`)} className="line-clamp-2 text-base font-bold">{featuredPrediction.market.question}</Link><div className="flex items-center gap-3 text-sm"><Link className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#e6f4ee] px-3 font-bold text-[#177b65]" href={`${localePath(locale, `/predictions/${featuredPrediction.market.slug}`)}?outcome=YES`}>Yes {(yes / 100).toFixed(0)}%</Link><Link className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#fff0f3] px-3 font-bold text-[#b8495e]" href={`${localePath(locale, `/predictions/${featuredPrediction.market.slug}`)}?outcome=NO`}>No {((10000 - yes) / 100).toFixed(0)}%</Link><span className="text-xs text-slate-500">{featuredPrediction.market.participantCount} {zh ? "人參與" : "participants"}</span></div></div> : <div className="prediction-highlight exchange-panel flex flex-col justify-center gap-3 p-5"><p className="text-sm font-semibold text-slate-600">{zh ? "探索角色的新分享" : "Explore something new"}</p><div className="discovery-links"><Link href={localePath(locale, "/gallery")}><GalleryIcon className="h-4 w-4" />{zh ? "圖集" : "Gallery"}</Link><Link href={localePath(locale, "/comfort")}><Sparkles className="h-4 w-4" />{zh ? "陪伴" : "Comfort"}</Link><Link href={localePath(locale, "/campaigns")}><Heart className="h-4 w-4" />{zh ? "活動" : "Campaigns"}</Link></div></div>}
    </section>
    {features.community ? <SocialFeed locale={locale} signedIn={Boolean(userId)} viewerId={userId} initialItems={notes} /> : <section className="exchange-panel p-6"><h2 className="text-lg font-bold">{zh ? "瀏覽角色" : "Browse characters"}</h2><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{marketFeed?.items.map((item) => <Link key={item.id} href={localePath(locale, `/character/${item.slug}`)} className="rounded-xl border border-slate-200 p-4"><p className="font-bold">{item.name}</p><p className="mt-1 text-sm text-slate-600">{item.currentQuote} SUP / {zh ? "份" : "unit"}</p></Link>)}</div></section>}
    <section id="season" className="season-board"><div className="section-heading-compact"><h2>{zh ? "本週放送" : "This week's schedule"}</h2><Link href={localePath(locale, "/me/library")}><CalendarDays className="mr-2 h-4 w-4" />{zh ? "我的追番" : "My watchlist"}</Link></div><SeasonCalendarBoard eyebrow={zh ? "時間以香港時區顯示" : "Times in Hong Kong (UTC+8)"} title={zh ? "新番日曆" : "Season calendar"} emptyLabel={calendar ? (zh ? "本週暫無放送資料。" : "No episodes are scheduled this week.") : (zh ? "放送資料暫時載入失敗，稍後再試。" : "Could not load the schedule. Please try again later.")} entries={calendar?.episodes.map((episode) => ({ id: episode.id, href: localePath(locale, `/series/${episode.series.slug}`), dayLabel: episode.airAt ? day.format(new Date(episode.airAt)) : pick(locale, "TBA", "待定"), timeLabel: episode.airAt ? time.format(new Date(episode.airAt)) : "--:--", seriesTitle: episode.series.title, episodeLabel: episode.title || (zh ? `第 ${episode.number} 話` : `Episode ${episode.number}`), watched: episode.progress === "WATCHED" })) ?? []} /></section>
    {campaigns.length ? <section><div className="section-heading-compact"><h2>{zh ? "一起參與的活動" : "Community campaigns"}</h2><Link href={localePath(locale, "/campaigns")}>{zh ? "全部活動" : "All campaigns"}<ArrowRight className="ml-2 h-4 w-4" /></Link></div><div className="grid gap-4 lg:grid-cols-2">{campaigns.slice(0, 2).map((campaign) => <CampaignCard key={campaign.id} campaign={campaign as PublicCampaign} locale={locale} />)}</div></section> : null}
    <div className="discovery-links"><Link href={localePath(locale, "/gallery")}><GalleryIcon className="h-4 w-4" />{zh ? "角色圖集" : "Character gallery"}</Link><Link href={localePath(locale, "/comfort")}><Sparkles className="h-4 w-4" />{zh ? "找一點陪伴" : "Find some comfort"}</Link><Link href={localePath(locale, "/shop")}>{zh ? "外觀商店" : "Cosmetic shop"}</Link></div>
  </div>;
}
