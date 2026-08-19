import Link from "next/link";
import { ArrowRight, Bookmark, BriefcaseBusiness, Coins, HeartHandshake, RadioTower, ShoppingBag } from "lucide-react";
import { notFound } from "next/navigation";
import { CharacterArt } from "@/components/character-art";
import { CharacterCard } from "@/components/character-card";
import { formatHongKongDate, isPublicLocale, localePath, localizeCharacter, localizeShopItem, pick } from "@/components/acg-locale";
import { MissionPanel } from "@/components/mission-panel";
import { RewardClaimPanel } from "@/components/reward-claim-panel";
import { SeasonTicker } from "@/components/season-ticker";
import { SectionHeading } from "@/components/ui/section-heading";
import { getPositiveMarketFeed } from "@/lib/market-feed";
import { currencyLabel } from "@/lib/utils";
import { getCommentCount, getCurrentViewer, getMeDashboard, getRecentTrades, getShopItems, getWatchlistIds, listCharacters } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function ExchangeLobby({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  if (!isPublicLocale(rawLocale)) notFound();
  const locale = rawLocale;
  const [featured, recentTrades, shopItems, watchlistIds, viewer, marketFeed] = await Promise.all([
    listCharacters({ featuredOnly: true, locale }),
    getRecentTrades(6),
    getShopItems(locale),
    getWatchlistIds().catch(() => [] as string[]),
    getCurrentViewer().catch(() => null),
    getPositiveMarketFeed({ featuredOnly: true, limit: 5, locale }),
  ]);
  const dashboard = viewer ? await getMeDashboard(viewer.user.id, locale).catch(() => null) : null;
  const heroSource = featured.find((character) => character.rightsType === "ORIGINAL") ?? featured[0];
  if (!heroSource) notFound();
  const hero = localizeCharacter(heroSource, locale);
  const cards = await Promise.all(featured.slice(0, 4).map(async (character) => ({ character, comments: await getCommentCount(character.id) })));
  const completedMissions = dashboard?.missions.filter((mission) => mission.completed).length ?? 0;
  const activeShift = dashboard?.work.shifts.find((shift) => shift.status === "ACTIVE" || shift.status === "READY");

  const copy = locale === "zh-Hant" ? {
    issue: "第 08 期", season: "2026 夏季應援場刊", title: "喜歡誰，就替誰留下應援紀錄。",
    lede: "這裡沒有角色敗者榜。領取 SUP、收藏角色、一起完成應援里程碑，也在需要時走進安慰室。",
    enter: "翻開角色目錄", comfort: "進入安慰室", wallet: "可用 SUP", live: "本期封面角色",
    featuredKicker: "本期角色索引", featuredTitle: "從今天想陪伴你的角色開始", featuredBody: "價格只反映站內支持份數；喜歡可以並存，也不需要和任何人爭輸贏。",
    deskKicker: "今日應援桌", deskTitle: "登入後，今天該做的事都在這裡", deskBody: "任務、打工、簽到、關注與提醒使用真實帳戶資料，不是展示用數字。",
    mission: "完成任務", shift: "打工狀態", watching: "關注角色", alerts: "訊號提醒", none: "尚未開始", ready: "可領取",
    guestTitle: "建立你的第一本應援手帳", guestBody: "登入會建立錢包並送出一次性的 300 SUP。之後可以簽到、打工、支持角色和收藏外觀。", signIn: "登入並領取 300 SUP",
    feedKicker: "即時應援抄錄", feedTitle: "最近有人替喜歡留下了紀錄", feedBody: "只顯示正向活動與回收份數，不以獲利或虧損煽動比較。",
    boothKicker: "收藏攤位", boothTitle: "替自己的房間換一個版本", boothBody: "頭像框、主題與原創壁紙只改變收藏體驗，不增加市場優勢。", booth: "查看全部收藏",
  } : {
    issue: "ISSUE 08", season: "SUMMER 2026 SUPPORT CATALOG", title: "Keep showing up for the characters you love.",
    lede: "No loser board, no fandom war. Earn SUP, collect favorites, move shared milestones, and step into a comfort room when you need one.",
    enter: "Open character index", comfort: "Enter a comfort room", wallet: "Available SUP", live: "Issue cover character",
    featuredKicker: "Character index", featuredTitle: "Start with the character you want nearby today", featuredBody: "Quotes only reflect in-platform support units. Favorites can coexist, and affection is not a contest.",
    deskKicker: "Today's support desk", deskTitle: "Your actual tasks, rewards, and signals in one place", deskBody: "Missions, work, check-in, watchlist, and alerts come from your account rather than decorative demo numbers.",
    mission: "Missions done", shift: "Work shift", watching: "Watching", alerts: "Signal alerts", none: "Not started", ready: "Ready to claim",
    guestTitle: "Start your first support notebook", guestBody: "Signing in creates your wallet and grants 300 starter SUP once. Check in, take shifts, support characters, and collect room looks.", signIn: "Sign in and claim 300 SUP",
    feedKicker: "Live support log", feedTitle: "Someone just left a record for a favorite", feedBody: "The log shows support and returned units without turning profit or loss into social pressure.",
    boothKicker: "Collection booth", boothTitle: "Give your room a different edition", boothBody: "Frames, themes, and original wallpapers change your collection space, never market power.", booth: "View all collectibles",
  };

  return (
    <div>
      <SeasonTicker locale={locale} />
      <div className="exchange-page">
        <section className="editorial-cover grid overflow-hidden lg:grid-cols-[1.08fr_.92fr]">
          <div className="editorial-hero-art group relative min-h-[430px] sm:min-h-[560px] lg:min-h-[700px]">
            <CharacterArt character={hero} className="absolute inset-0 h-full" priority sizes="(min-width: 1024px) 58vw, 100vw" />
            <div className="absolute left-4 top-4 z-10 bg-[#f2ca61] px-3 py-2 text-[#181713] sm:left-6 sm:top-6">
              <p className="text-[9px] font-black tracking-[.16em]">{copy.issue} / COVER</p>
            </div>
            <div className="editorial-caption absolute inset-x-4 bottom-4 z-10 p-4 text-white sm:inset-x-6 sm:bottom-6 sm:p-5">
              <p className="text-[9px] font-black uppercase tracking-[.17em] text-white/55">{copy.live} · {hero.title}</p>
              <div className="mt-2 flex items-end justify-between gap-4"><div><p className="font-display text-3xl sm:text-4xl">{hero.name}</p><p className="mt-2 max-w-xl text-xs leading-6 text-white/65 sm:text-sm">{hero.favoritePhrase}</p></div><span className="hidden text-right text-[10px] font-bold leading-5 text-white/55 sm:block">{hero.supporterCount} {pick(locale, "supporters", "位應援者")}<br />{hero.circulatingUnits} {pick(locale, "units", "份應援")}</span></div>
            </div>
          </div>
          <div className="editorial-cover-copy relative flex flex-col justify-center p-6 text-white sm:p-10 xl:p-14">
            <div className="issue-tab w-fit text-[#f2ca61]"><strong>{copy.issue}</strong><span>{copy.season}</span></div>
            <h1 className="exchange-title relative z-10 mt-8 text-white">{copy.title}</h1>
            <p className="relative z-10 mt-7 max-w-xl text-base leading-8 text-white/68 sm:text-lg">{copy.lede}</p>
            <div className="relative z-10 mt-8 flex flex-wrap gap-3">
              <Link href={localePath(locale, "/market")} className="exchange-button-primary">{copy.enter}<ArrowRight className="h-4 w-4" /></Link>
              <Link href={localePath(locale, "/comfort")} className="inline-flex items-center gap-2 border border-white/35 px-5 py-3 text-sm font-black text-white transition hover:bg-white/10"><HeartHandshake className="h-4 w-4" />{copy.comfort}</Link>
            </div>
            <div className="relative z-10 mt-10 grid grid-cols-2 gap-5 border-t border-white/20 pt-6">
              <div><p className="text-[9px] font-black uppercase tracking-[.16em] text-white/45">{copy.wallet}</p><p className="mt-2 font-display text-3xl text-[#f2ca61]">{viewer ? currencyLabel(viewer.wallet.softBalance) : "--- SUP"}</p></div>
              <div><p className="text-[9px] font-black uppercase tracking-[.16em] text-white/45">{pick(locale, "Catalog", "角色目錄")}</p><p className="mt-2 font-display text-3xl">24</p></div>
            </div>
          </div>
        </section>

        <section className="grid gap-7">
          <div className="grid gap-6 lg:grid-cols-[1fr_310px] lg:items-end"><SectionHeading eyebrow={copy.featuredKicker} title={copy.featuredTitle} description={copy.featuredBody} /><div className="folio-number justify-self-end">01</div></div>
          <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-4">
            {cards.map(({ character, comments }) => <CharacterCard key={character.id} character={character} watching={watchlistIds.includes(character.id)} commentCount={comments} locale={locale} />)}
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.2fr_.8fr]">
          <div className="exchange-panel p-6 sm:p-8">
            <SectionHeading eyebrow={copy.deskKicker} title={dashboard ? copy.deskTitle : copy.guestTitle} description={dashboard ? copy.deskBody : copy.guestBody} />
            {dashboard ? <>
              <div className="mt-8 grid grid-cols-2 gap-5 border-y border-black/20 py-5 sm:grid-cols-4">
                <div className="desk-stat"><p className="desk-stat-label">{copy.mission}</p><p className="desk-stat-value">{completedMissions}/{dashboard.missions.length}</p></div>
                <div className="desk-stat"><p className="desk-stat-label">{copy.shift}</p><p className="desk-stat-value text-lg">{activeShift?.status === "READY" ? copy.ready : activeShift ? pick(locale, "In progress", "進行中") : copy.none}</p></div>
                <div className="desk-stat"><p className="desk-stat-label">{copy.watching}</p><p className="desk-stat-value">{dashboard.watchlist.length}</p></div>
                <div className="desk-stat"><p className="desk-stat-label">{copy.alerts}</p><p className="desk-stat-value">{dashboard.alerts.length}</p></div>
              </div>
              <div className="mt-7"><MissionPanel missions={dashboard.missions} locale={locale} /></div>
              <div className="mt-6 flex flex-wrap gap-3"><Link href={localePath(locale, "/work")} className="exchange-button-primary"><BriefcaseBusiness className="h-4 w-4" />{pick(locale, "Open work dispatch", "前往角色打工")}</Link><Link href={localePath(locale, "/me")} className="exchange-button-secondary"><Bookmark className="h-4 w-4" />{pick(locale, "Open my room", "打開玩家房間")}</Link></div>
            </> : <div className="mt-8 border-t border-black/20 pt-7"><ol className="grid gap-0 sm:grid-cols-3">{[
              pick(locale, "Receive 300 starter SUP", "領取 300 起始 SUP"),
              pick(locale, "Watch or support a favorite", "關注或支持一位角色"),
              pick(locale, "Unlock a room collectible", "解鎖一件房間收藏"),
            ].map((step, index) => <li key={step} className="flex gap-3 border-b border-black/15 p-4 sm:border-r"><strong className="font-display text-2xl text-[#bd3628]">0{index + 1}</strong><span className="pt-1 text-sm font-bold leading-6">{step}</span></li>)}</ol><Link href="/api/auth/signin" className="exchange-button-primary mt-6">{copy.signIn}<ArrowRight className="h-4 w-4" /></Link></div>}
          </div>
          <div className="grid content-start gap-5">
            {dashboard ? <RewardClaimPanel locale={locale} /> : null}
            <div className="market-tape">
              <div className="border-b border-white/20 p-4"><p className="text-[10px] font-black uppercase tracking-[.17em] text-[#f2ca61]">{pick(locale, "LIVE MARKET DESK", "即時市場桌")}</p></div>
              {marketFeed.items.slice(0, 5).map((item, index) => <Link key={item.id} href={localePath(locale, `/character/${item.slug}`)} className="market-tape-item"><span className="market-tape-rank">{String(index + 1).padStart(2, "0")}</span><span className="min-w-0"><strong className="block truncate text-sm">{item.name}</strong><small className="text-[10px] text-white/45">+{item.activity24h.buyUnits} / 24H · {item.activity24h.uniqueSupporters} {pick(locale, "fans", "人")}</small></span><span className="text-sm font-black text-[#f2ca61]">{item.currentQuote}</span></Link>)}
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[.9fr_1.1fr]">
          <div><SectionHeading eyebrow={copy.feedKicker} title={copy.feedTitle} description={copy.feedBody} /><div className="folio-number mt-12">02</div></div>
          <div className="exchange-panel bg-[#182033] p-5 text-white sm:p-7">
            <div className="grid gap-0">{recentTrades.slice(0, 6).map((trade, index) => { const character = localizeCharacter(trade.character, locale); return <div key={trade.id} className="grid grid-cols-[34px_1fr_auto] items-center gap-4 border-b border-white/12 py-4 last:border-0"><span className="font-display text-lg text-[#f2ca61]">{String(index + 1).padStart(2, "0")}</span><div><p className="text-sm font-bold">{character.name}</p><p className="mt-1 text-[10px] tracking-[.1em] text-white/38">{formatHongKongDate(trade.createdAt, locale)}</p></div><span className="flex items-center gap-1 text-sm font-black text-[#f2ca61]"><RadioTower className="h-3.5 w-3.5" />{trade.side === "BUY" ? "+" : "RETURN "}{trade.quantity}</span></div>; })}</div>
          </div>
        </section>

        <section className="grid gap-7">
          <div className="flex flex-wrap items-end justify-between gap-5"><SectionHeading eyebrow={copy.boothKicker} title={copy.boothTitle} description={copy.boothBody} /><Link href={localePath(locale, "/shop")} className="exchange-button-secondary"><ShoppingBag className="h-4 w-4" />{copy.booth}</Link></div>
          <div className="grid gap-5 md:grid-cols-3">
            {shopItems.slice(0, 3).map((sourceItem) => { const item = localizeShopItem(sourceItem, locale); return <Link key={item.id} href={localePath(locale, "/shop")} className="exchange-panel group p-5"><div className={`shop-preview ${item.kind === "PROFILE_THEME" ? "is-theme" : item.kind === "WALLPAPER" ? "is-wallpaper" : ""}`} /><p className="mt-5 text-[10px] font-black uppercase tracking-[.14em] text-[#bd3628]">{item.kind.replaceAll("_", " ")}</p><h3 className="mt-2 font-display text-2xl">{item.title}</h3><p className="mt-3 flex items-center gap-2 text-sm font-black"><Coins className="h-4 w-4 text-[#9b7417]" />{currencyLabel(item.price)}</p></Link>; })}
          </div>
        </section>
      </div>
    </div>
  );
}
