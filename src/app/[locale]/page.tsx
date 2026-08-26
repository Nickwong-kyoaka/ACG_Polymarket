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
import { selectDailyCover } from "@/lib/editorial-cover";
import { getPositiveMarketFeed } from "@/lib/market-feed";
import { listPublicGallery } from "@/lib/public-media";
import { currencyLabel } from "@/lib/utils";
import { getCommentCount, getCurrentViewer, getMeDashboard, getRecentTrades, getShopItems, getWatchlistIds, listCharacters } from "@/lib/store";
import { getHongKongDayKey } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function ExchangeLobby({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  if (!isPublicLocale(rawLocale)) notFound();
  const locale = rawLocale;
  const [featured, recentTrades, shopItems, watchlistIds, viewer, marketFeed, gallery] = await Promise.all([
    listCharacters({ featuredOnly: true, locale }),
    getRecentTrades(6),
    getShopItems(locale),
    getWatchlistIds().catch(() => [] as string[]),
    getCurrentViewer().catch(() => null),
    getPositiveMarketFeed({ featuredOnly: true, limit: 5, locale }),
    listPublicGallery({ locale, limit: 24 }),
  ]);
  const dashboard = viewer ? await getMeDashboard(viewer.user.id, locale).catch(() => null) : null;
  const galleryBySlug = new Map(gallery.items.map((entry) => [entry.character.slug, entry.assets]));
  const coverCandidates = featured.filter((character) => (galleryBySlug.get(character.slug)?.length ?? 0) > 0);
  const heroSource = selectDailyCover(coverCandidates, getHongKongDayKey()) ?? featured.find((character) => character.rightsType === "ORIGINAL") ?? featured[0];
  if (!heroSource) notFound();
  const hero = localizeCharacter(heroSource, locale);
  const assetFor = (slug: string) => {
    const asset = galleryBySlug.get(slug)?.[0];
    return asset ? { publicUrl: asset.url, altText: asset.altText, sourceLabel: asset.sourceLabel, sourceKind: asset.sourceKind, permissionStatus: asset.permissionBadge } : undefined;
  };
  const heroAsset = assetFor(heroSource.slug);
  const cards = await Promise.all(featured.slice(0, 4).map(async (character) => ({ character, comments: await getCommentCount(character.id) })));
  const completedMissions = dashboard?.missions.filter((mission) => mission.completed).length ?? 0;
  const activeShift = dashboard?.work.shifts.find((shift) => shift.status === "ACTIVE" || shift.status === "READY");

  const copy = locale === "zh-Hant" ? {
    issue: "第 08 期", season: "2026 夏季應援場刊", title: "歡迎回來。今天想和誰待在一起？",
    lede: "翻翻新番、遇見角色，把心動收進自己的房間。每日 SUP、應援里程碑與安慰語音，會陪你把喜歡慢慢養成日常。",
    enter: "翻開角色目錄", comfort: "去安慰室坐坐", wallet: "房間裡的 SUP", live: "今天的封面角色",
    featuredKicker: "本期角色索引", featuredTitle: "從一名讓你想多看一眼的角色開始", featuredBody: "按作品、氣質或陪伴方式慢慢逛；角色小傳、服裝畫廊與今晚的語音都已經準備好。",
    deskKicker: "今日小桌", deskTitle: "今天想做的事，都放在手邊了", deskBody: "簽到、任務、角色打工與收藏提醒會跟著你的房間一起更新。",
    mission: "完成任務", shift: "打工狀態", watching: "關注角色", alerts: "訊號提醒", none: "尚未開始", ready: "可領取",
    guestTitle: "建立你的第一本應援手帳", guestBody: "登入會建立錢包並送出一次性的 300 SUP。之後可以簽到、打工、支持角色和收藏外觀。", signIn: "登入並領取 300 SUP",
    feedKicker: "最近來訪", feedTitle: "有人剛剛把心意留在角色身邊", feedBody: "每一筆應援都像場刊邊上的手寫註記，記下誰在此刻被想起。",
    boothKicker: "房間收藏", boothTitle: "替自己的角落換上今天的心情", boothBody: "頭像框、主題與原創壁紙會直接加入收藏櫃，想換時隨時回來。", booth: "逛逛收藏攤位", coverCycle: "今天的封面選角",
  } : {
    issue: "ISSUE 08", season: "SUMMER 2026 SUPPORT CATALOG", title: "Welcome back. Who do you want beside you today?",
    lede: "Browse the new season, meet a character, and bring that spark into your room. Daily SUP, shared milestones, and comfort voices turn affection into a small ritual.",
    enter: "Open the character catalog", comfort: "Sit in a comfort room", wallet: "SUP in your room", live: "Today's cover character",
    featuredKicker: "Character index", featuredTitle: "Start with someone who makes you look twice", featuredBody: "Browse by series, mood, or kind of company. Character notes, outfit galleries, and a voice for tonight are ready inside.",
    deskKicker: "Today's little desk", deskTitle: "Everything you may want today, within reach", deskBody: "Check-in, missions, character shifts, and collection reminders update with your room.",
    mission: "Missions done", shift: "Work shift", watching: "Watching", alerts: "Signal alerts", none: "Not started", ready: "Ready to claim",
    guestTitle: "Start your first support notebook", guestBody: "Signing in creates your wallet and grants 300 starter SUP once. Check in, take shifts, support characters, and collect room looks.", signIn: "Sign in and claim 300 SUP",
    feedKicker: "Recent visitors", feedTitle: "Someone just left a little affection beside a character", feedBody: "Each support entry feels like a handwritten note in the catalog, remembering who crossed someone's mind.",
    boothKicker: "Room collection", boothTitle: "Dress your corner in today's mood", boothBody: "Frames, themes, and original wallpapers join your collection shelf and stay ready whenever the room needs a change.", booth: "Browse the collection booth", coverCycle: "Today's cover picks",
  };

  return (
    <div>
      <SeasonTicker locale={locale} />
      <div className="exchange-page">
        <section className="editorial-cover grid overflow-hidden lg:grid-cols-[1.08fr_.92fr]">
          <div className="editorial-hero-art group relative min-h-[430px] sm:min-h-[560px] lg:min-h-[700px]">
            <CharacterArt character={hero} asset={heroAsset} className="absolute inset-0 h-full" priority sizes="(min-width: 1024px) 58vw, 100vw" />
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

        <nav aria-label={copy.coverCycle} className="-mt-10 grid overflow-hidden rounded-[22px_7px_22px_7px] border border-[#6d5e54]/20 bg-[#e7d9ca] shadow-[0_14px_35px_rgba(72,53,43,.1)] sm:grid-cols-3 xl:grid-cols-6">
          {coverCandidates.slice(0, 6).map((character) => {
            const active = character.id === heroSource.id;
            return <Link key={character.id} href={localePath(locale, `/character/${character.slug}`)} className={`flex min-h-20 items-center justify-between gap-3 border-r border-[#6d5e54]/10 px-4 py-3 text-xs font-black transition ${active ? "bg-[#e6b86d] text-[#342a25]" : "bg-[#fffaf4] text-slate-500 hover:bg-white hover:text-[#a34855]"}`}><span className="line-clamp-2">{localizeCharacter(character, locale).name}</span><span className="font-display text-xl">{active ? "●" : "○"}</span></Link>;
          })}
        </nav>

        <section className="grid gap-7">
          <div className="grid gap-6 lg:grid-cols-[1fr_310px] lg:items-end"><SectionHeading eyebrow={copy.featuredKicker} title={copy.featuredTitle} description={copy.featuredBody} /><div className="folio-number justify-self-end">01</div></div>
          <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-4">
            {cards.map(({ character, comments }) => <CharacterCard key={character.id} character={character} asset={assetFor(character.slug)} watching={watchlistIds.includes(character.id)} commentCount={comments} locale={locale} />)}
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
