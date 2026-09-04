import Link from "next/link";
import { ArrowRight, BookOpen, HeartHandshake, PenLine, RadioTower, Sparkles } from "lucide-react";
import { notFound } from "next/navigation";
import { isPublicLocale, localePath, localizeCharacter, pick, type PublicLocale } from "@/components/acg-locale";
import { CampaignCard, type PublicCampaign } from "@/components/campaign-card";
import { CharacterArt } from "@/components/character-art";
import { LobbyPredictionTicket } from "@/components/lobby-prediction-ticket";
import { SeasonCalendarBoard } from "@/components/season-calendar-board";
import { SeasonTicker } from "@/components/season-ticker";
import { SocialFeed } from "@/components/social-feed";
import { normalizeSocialNote } from "@/components/social-note-types";
import { getOptionalSessionUserId } from "@/lib/auth";
import { getCatalogCalendar } from "@/lib/catalog-community";
import { selectDailyCover } from "@/lib/editorial-cover";
import { getExchangeFeatureFlags } from "@/lib/feature-flags";
import { getPositiveMarketFeed } from "@/lib/market-feed";
import { listPredictionEvents } from "@/lib/prediction-market";
import { listPublicGallery } from "@/lib/public-media";
import { getSocialFeed } from "@/lib/social";
import { getMeDashboard, listCharacters } from "@/lib/store";
import { listSupportCampaigns } from "@/lib/support-campaigns";
import { getHongKongDayKey } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function ExchangeLobby({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  if (!isPublicLocale(rawLocale)) notFound();
  const locale: PublicLocale = rawLocale;
  const userId = await getOptionalSessionUserId();
  const features = getExchangeFeatureFlags();
  const now = new Date();
  const calendarEnd = new Date(now.getTime() + 8 * 24 * 60 * 60 * 1_000);

  const [featured, gallery, marketFeed, socialPayload, predictionPayload, campaigns, calendar, dashboard] = await Promise.all([
    listCharacters({ featuredOnly: true, locale }),
    listPublicGallery({ locale, limit: 24 }),
    getPositiveMarketFeed({ featuredOnly: true, limit: 6, locale }),
    features.community ? getSocialFeed({ mode: "for-you", locale, viewerId: userId, limit: 12 }) : Promise.resolve({ items: [] }),
    features.predictions ? listPredictionEvents({ locale, limit: 4 }) : Promise.resolve({ events: [] }),
    listSupportCampaigns({ locale, userId, includeCompleted: false }),
    getCatalogCalendar({ from: now, to: calendarEnd, locale, userId }),
    userId ? getMeDashboard(userId, locale).catch(() => null) : Promise.resolve(null),
  ]);

  const galleryBySlug = new Map(gallery.items.map((entry) => [entry.character.slug, entry.assets]));
  const coverCandidates = featured.filter((character) => (galleryBySlug.get(character.slug)?.length ?? 0) > 0);
  const heroSource = selectDailyCover(coverCandidates, getHongKongDayKey()) ?? featured.find((character) => character.rightsType === "ORIGINAL") ?? featured[0];
  if (!heroSource) notFound();
  const hero = localizeCharacter(heroSource, locale);
  const heroAssetRecord = galleryBySlug.get(heroSource.slug)?.[0];
  const heroAsset = heroAssetRecord ? { publicUrl: heroAssetRecord.url, altText: heroAssetRecord.altText, sourceLabel: heroAssetRecord.sourceLabel, sourceKind: heroAssetRecord.sourceKind, permissionStatus: heroAssetRecord.permissionBadge } : undefined;
  const initialNotes = socialPayload.items.flatMap((item) => {
    const note = normalizeSocialNote(item);
    return note ? [note] : [];
  });
  const featuredPrediction = predictionPayload.events.flatMap((event) => event.markets.map((market) => ({ event, market }))).find(({ market }) => market.status === "OPEN");
  const zh = locale === "zh-Hant";
  const dayFormatter = new Intl.DateTimeFormat(zh ? "zh-HK" : "en", { weekday: "short", timeZone: "Asia/Hong_Kong" });
  const timeFormatter = new Intl.DateTimeFormat(zh ? "zh-HK" : "en", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Hong_Kong" });
  const calendarEntries = calendar.episodes.map((episode) => ({
    id: episode.id,
    href: `${localePath(locale, "/community")}?tab=seasonal`,
    dayLabel: episode.airAt ? dayFormatter.format(new Date(episode.airAt)) : pick(locale, "TBA", "待定"),
    timeLabel: episode.airAt ? timeFormatter.format(new Date(episode.airAt)) : "--:--",
    seriesTitle: episode.series.title,
    episodeLabel: episode.title || (zh ? `第 ${episode.number} 話` : `Episode ${episode.number}`),
    watched: episode.progress === "WATCHED",
  }));
  const completedMissions = dashboard?.missions.filter((mission) => mission.completed).length ?? 0;

  return (
    <div>
      <SeasonTicker locale={locale} />
      <div className="exchange-page">
        <section className="editorial-cover grid overflow-hidden lg:grid-cols-[1.12fr_.88fr]">
          <div className="editorial-hero-art group relative min-h-[470px] sm:min-h-[590px] lg:min-h-[710px]">
            <CharacterArt character={hero} asset={heroAsset} className="absolute inset-0 h-full" priority sizes="(min-width: 1024px) 58vw, 100vw" />
            <div className="absolute left-4 top-4 z-10 -rotate-1 border border-[#2c2724] bg-[#f2ca61] px-3 py-2 text-[#2c2724] shadow-[3px_3px_0_#2c2724] sm:left-6 sm:top-6"><p className="text-[9px] font-black tracking-[.16em]">ISSUE 09 / COVER</p></div>
            <div className="editorial-caption absolute inset-x-4 bottom-4 z-10 p-4 text-white sm:inset-x-6 sm:bottom-6 sm:p-5">
              <p className="text-[9px] font-black uppercase tracking-[.17em] text-white/55">{zh ? "今日封面角色" : "TODAY'S COVER"} · {hero.title}</p>
              <div className="mt-2 flex items-end justify-between gap-4"><div><p className="font-display text-3xl sm:text-4xl">{hero.name}</p><p className="mt-2 max-w-xl text-xs leading-6 text-white/65 sm:text-sm">{hero.favoritePhrase}</p></div><span className="hidden text-right text-[10px] font-bold leading-5 text-white/55 sm:block">{hero.supporterCount} {zh ? "位應援者" : "supporters"}<br />{hero.circulatingUnits} {zh ? "份應援" : "support units"}</span></div>
            </div>
          </div>
          <div className="editorial-cover-copy relative flex flex-col justify-center p-6 text-white sm:p-10 xl:p-14">
            <div className="issue-tab w-fit text-[#f2ca61]"><strong>09</strong><span>{zh ? "社團房間 · 夏季號" : "CLUB ROOM · SUMMER ISSUE"}</span></div>
            <h1 className="exchange-title relative z-10 mt-8 text-white">{zh ? "把今天想收藏的一幕，留在這張桌上。" : "Leave the scene you want to keep on this desk."}</h1>
            <p className="relative z-10 mt-7 max-w-xl text-base leading-8 text-white/68 sm:text-lg">{zh ? "翻新番、讀角色筆記、追一則官方消息，也替喜歡的角色添一份應援。每次回來，書架都會多一點熟悉的內容。" : "Browse the season, read character notes, follow an official signal, or add support for someone you like. Each return makes the shelf feel a little more yours."}</p>
            <div className="relative z-10 mt-8 flex flex-wrap gap-3">
              <Link href={localePath(locale, "/community")} className="exchange-button-primary"><BookOpen className="h-4 w-4" />{zh ? "翻開今日筆記" : "Open today's notes"}</Link>
              <Link href={localePath(locale, userId ? "/create" : "/onboarding")} className="inline-flex items-center gap-2 border border-white/35 px-5 py-3 text-sm font-black text-white transition hover:bg-white/10"><PenLine className="h-4 w-4" />{userId ? (zh ? "寫一篇應援筆記" : "Write a support note") : (zh ? "建立我的書架" : "Start my shelf")}</Link>
            </div>
            <div className="relative z-10 mt-10 grid grid-cols-3 gap-4 border-t border-white/20 pt-6">
              <Link href={localePath(locale, "/market")}><p className="text-[9px] font-black uppercase tracking-[.13em] text-white/45">SUP SIGNAL</p><p className="mt-2 text-sm font-black text-[#f2ca61]">{zh ? "角色應援" : "Support"}</p></Link>
              <Link href={localePath(locale, "/predictions")}><p className="text-[9px] font-black uppercase tracking-[.13em] text-white/45">YES / NO</p><p className="mt-2 text-sm font-black text-[#f2ca61]">{zh ? "季番預測" : "Predictions"}</p></Link>
              <Link href={localePath(locale, "/comfort")}><p className="text-[9px] font-black uppercase tracking-[.13em] text-white/45">AFTER HOURS</p><p className="mt-2 text-sm font-black text-[#f2ca61]">{zh ? "安慰室" : "Comfort"}</p></Link>
            </div>
          </div>
        </section>

        <section className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_340px] xl:items-start">
          <div className="min-w-0">
            <header className="mb-6 flex flex-wrap items-end justify-between gap-5 border-b border-[#2c2724] pb-5"><div><p className="exchange-kicker">THE COMMUNITY DESK</p><h2 className="mt-3 font-display text-4xl sm:text-5xl">{zh ? "今天，大家在收藏甚麼？" : "What is everyone keeping today?"}</h2></div><Link href={localePath(locale, "/community")} className="inline-flex items-center gap-2 text-xs font-black text-[#9a4c4a]">{zh ? "打開完整內容桌" : "Open the full desk"}<ArrowRight className="h-4 w-4" /></Link></header>
            {features.community ? <SocialFeed locale={locale} signedIn={Boolean(userId)} initialItems={initialNotes} /> : null}
          </div>
          <aside className="grid gap-8 xl:sticky xl:top-24">
            <SeasonCalendarBoard eyebrow="THIS WEEK / ON AIR" title={zh ? "本週放送簿" : "This week's broadcast book"} emptyLabel={zh ? "本週的放送時間還在整理。" : "This week's broadcast times are still being arranged."} entries={calendarEntries} />
            {featuredPrediction ? <LobbyPredictionTicket href={localePath(locale, `/predictions/${featuredPrediction.market.slug}`)} eyebrow={featuredPrediction.event.title} question={featuredPrediction.market.question} yesLabel="YES" noLabel="NO" yesProbability={(featuredPrediction.market.outcomes.find((outcome) => outcome.key === "YES")?.probabilityBps ?? 5_000) / 10_000} participants={featuredPrediction.market.participantCount} closesLabel={new Intl.DateTimeFormat(zh ? "zh-HK" : "en", { dateStyle: "medium", timeZone: "Asia/Hong_Kong" }).format(new Date(featuredPrediction.market.closesAt))} confidenceLabel={zh ? "早期判斷" : "EARLY READ"} /> : null}
          </aside>
        </section>

        <section className="grid gap-7 border-t border-[#2c2724] pt-7 xl:grid-cols-[.7fr_1.3fr]">
          <div>
            <p className="exchange-kicker">SUPPORT SIGNALS</p>
            <h2 className="mt-3 font-display text-4xl sm:text-5xl">{zh ? "喜歡的角色，最近收到了多少心意？" : "How much affection found each character lately?"}</h2>
            <p className="mt-5 max-w-xl text-sm leading-7 text-[#716862]">{zh ? "SUP / 份是一張會隨共同應援上升的角色訊號，不是機率。打開角色頁可查看 24 小時、7 日和 30 日活動。" : "SUP per unit is a character signal that moves with shared support, not a probability. Open a character page for 24-hour, 7-day, and 30-day activity."}</p>
            <Link href={localePath(locale, "/market")} className="exchange-button-primary mt-6"><RadioTower className="h-4 w-4" />{zh ? "逛角色應援所" : "Browse support signals"}</Link>
          </div>
          <div className="market-tape self-start">
            <div className="grid grid-cols-[34px_1fr_auto_auto] gap-3 border-b border-white/20 px-4 py-3 text-[9px] font-black uppercase tracking-[.13em] text-white/45"><span>#</span><span>{zh ? "角色" : "Character"}</span><span>24H</span><span>SUP</span></div>
            {marketFeed.items.slice(0, 6).map((item, index) => <Link key={item.id} href={localePath(locale, `/character/${item.slug}`)} className="grid grid-cols-[34px_minmax(0,1fr)_auto_auto] items-center gap-3 border-b border-white/12 px-4 py-4 last:border-0 hover:bg-white/[.05]"><span className="market-tape-rank">{String(index + 1).padStart(2, "0")}</span><span className="min-w-0"><strong className="block truncate text-sm">{item.name}</strong><small className="text-[10px] text-white/45">{item.activity24h.uniqueSupporters} {zh ? "人留下應援" : "supporters"}</small></span><span className="text-xs font-black text-[#8fc1b5]">+{item.activity24h.buyUnits}</span><span className="min-w-10 text-right text-sm font-black text-[#f2ca61]">{item.currentQuote}</span></Link>)}
          </div>
        </section>

        <section>
          <header className="mb-7 flex flex-wrap items-end justify-between gap-5"><div><p className="exchange-kicker">SHARED MILESTONES</p><h2 className="mt-3 font-display text-4xl sm:text-5xl">{zh ? "一起把活動翻到下一頁" : "Turn the campaign page together"}</h2></div><Link href={localePath(locale, "/campaigns")} className="exchange-button-secondary">{zh ? "全部應援活動" : "All campaigns"}<ArrowRight className="h-4 w-4" /></Link></header>
          <div className="grid gap-6 lg:grid-cols-2">{campaigns.slice(0, 2).map((campaign) => <CampaignCard key={campaign.id} campaign={campaign as PublicCampaign} locale={locale} />)}</div>
        </section>

        <section className="grid overflow-hidden border border-[#2c2724] bg-[#fffaf4] lg:grid-cols-[.85fr_1.15fr]">
          <div className="relative min-h-72 bg-[#c85d5a] p-7 text-white sm:p-10"><Sparkles className="h-8 w-8 text-[#f2ca61]" /><p className="mt-8 text-[10px] font-black uppercase tracking-[.17em] text-white/55">AFTER HOURS / COMFORT ROOM</p><h2 className="mt-3 font-display text-4xl sm:text-5xl">{zh ? "今晚，找一盞適合心情的燈。" : "Find a lamp that fits tonight's mood."}</h2><div className="absolute -bottom-10 -right-4 font-display text-[9rem] leading-none text-white/10">夜</div></div>
          <div className="p-7 sm:p-10"><p className="max-w-2xl text-base leading-8 text-[#716862]">{zh ? "孤單、壓力、讀書後的疲憊、睡不著，或只是想聽一句角色會說的溫柔話。安慰室裡有裝置端合成語音、環境音和原創小漫畫。" : "Loneliness, pressure, study fatigue, a restless night, or simply one gentle line in a character's voice. The comfort rooms hold on-device synth voices, ambience, and original mini comics."}</p><div className="mt-6 flex flex-wrap gap-3"><Link href={localePath(locale, "/comfort")} className="exchange-button-primary"><HeartHandshake className="h-4 w-4" />{zh ? "選一間安慰室" : "Choose a comfort room"}</Link>{dashboard ? <Link href={localePath(locale, "/me")} className="exchange-button-secondary">{zh ? `今日任務 ${completedMissions}/${dashboard.missions.length}` : `Today's missions ${completedMissions}/${dashboard.missions.length}`}</Link> : null}</div></div>
        </section>
      </div>
    </div>
  );
}
