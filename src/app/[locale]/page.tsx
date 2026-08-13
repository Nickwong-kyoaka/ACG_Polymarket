import Link from "next/link";
import { ArrowRight, BriefcaseBusiness, CheckCircle2, Coins, HeartHandshake, RadioTower, ShoppingBag } from "lucide-react";
import { notFound } from "next/navigation";
import { CharacterArt } from "@/components/character-art";
import { CharacterCard } from "@/components/character-card";
import { formatHongKongDate, isPublicLocale, localePath, localizeCharacter, localizeShopItem, pick } from "@/components/acg-locale";
import { SeasonTicker } from "@/components/season-ticker";
import { SectionHeading } from "@/components/ui/section-heading";
import { currencyLabel } from "@/lib/utils";
import { getCommentCount, getCurrentViewer, getRecentTrades, getShopItems, getWatchlistIds, listCharacters } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function ExchangeLobby({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  if (!isPublicLocale(rawLocale)) notFound();
  const locale = rawLocale;
  const [featured, recentTrades, shopItems, watchlistIds, viewer] = await Promise.all([
    listCharacters({ featuredOnly: true, locale }),
    getRecentTrades(6),
    getShopItems(locale),
    getWatchlistIds().catch(() => [] as string[]),
    getCurrentViewer().catch(() => null),
  ]);
  const heroSource = featured.find((character) => character.rightsType === "ORIGINAL") ?? featured[0];
  if (!heroSource) notFound();
  const hero = localizeCharacter(heroSource, locale);
  const cards = await Promise.all(featured.slice(0, 4).map(async (character) => ({ character, comments: await getCommentCount(character.id) })));
  const copy = locale === "zh-Hant" ? {
    kicker: "角色訊號交易所 / 2026 夏季",
    title: "把喜歡，變成每天都會亮起的訊號。",
    lede: "不是賭誰會輸，而是把對角色的喜愛變成應援份數、收藏外觀與一間願意接住你的安慰室。",
    enter: "進入訊號市場", comfort: "今晚需要安慰", booth: "逛原創外觀",
    wallet: "我的 SUP 錢包", guest: "登入後領取 300 SUP 起始能量", live: "目前最亮訊號",
    featuredKicker: "LIVE CHARACTER SIGNALS", featuredTitle: "本季值得靠近的角色", featuredBody: "價格代表平台內的應援熱度，不是現金價值；你可以同時喜歡很多角色。",
    loopKicker: "DAILY SUPPORT LOOP", loopTitle: "今天也有一點喜歡可以完成", loopBody: "簽到、打工、進入安慰室，再把 SUP 交給真正讓你心動的角色。",
    feedKicker: "AFFECTION FEED", feedTitle: "應援正在發生", feedBody: "只顯示正向流動，不以損益或輸家作為焦點。",
    boothKicker: "CONVENTION BOOTH", boothTitle: "把你的房間換成喜歡的顏色", boothBody: "頭像框、主題與 AI 原創壁紙只改變你的收藏體驗，不增加市場優勢。",
  } : {
    kicker: "CHARACTER SIGNAL EXCHANGE / SUMMER 2026",
    title: "Turn affection into a signal that lights up every day.",
    lede: "This is not a bet on who loses. Collect support units, unlock original cosmetics, and enter comfort rooms built around the characters you love.",
    enter: "Enter signal market", comfort: "Find comfort tonight", booth: "Browse original drops",
    wallet: "My SUP wallet", guest: "Sign in to receive 300 starter SUP", live: "Brightest live signal",
    featuredKicker: "LIVE CHARACTER SIGNALS", featuredTitle: "Characters worth moving closer to", featuredBody: "Quotes show in-platform affection, never cash value. You are free to love more than one favorite.",
    loopKicker: "DAILY SUPPORT LOOP", loopTitle: "A little affection to complete today", loopBody: "Check in, work a shift, enter a comfort room, then send SUP to whoever made your day softer.",
    feedKicker: "AFFECTION FEED", feedTitle: "Support is happening now", feedBody: "The feed centers positive movement, never profit, loss, or a loser board.",
    boothKicker: "CONVENTION BOOTH", boothTitle: "Dress your room in favorite colors", boothBody: "Frames, themes, and original AI-friendly wallpapers change your collection space, not market power.",
  };

  return (
    <div>
      <SeasonTicker locale={locale} />
      <div className="exchange-page">
        <section className="exchange-panel grid min-h-[650px] overflow-hidden bg-[#111827] text-white lg:grid-cols-[.92fr_1.08fr]">
          <div className="relative z-10 flex flex-col justify-center p-6 sm:p-10 xl:p-14">
            <p className="exchange-kicker text-[#ffcc66] before:bg-[#ffcc66]">{copy.kicker}</p>
            <h1 className="exchange-title mt-7 text-white">{copy.title}</h1>
            <p className="mt-7 max-w-2xl text-base leading-8 text-white/66 sm:text-lg">{copy.lede}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href={localePath(locale, "/market")} className="exchange-button-primary">{copy.enter}<ArrowRight className="h-4 w-4" /></Link>
              <Link href={localePath(locale, "/comfort")} className="inline-flex items-center gap-2 rounded-[14px_4px_14px_4px] border border-white/15 px-5 py-3 text-sm font-black text-white transition hover:bg-white/10"><HeartHandshake className="h-4 w-4" />{copy.comfort}</Link>
            </div>
            <div className="mt-10 grid gap-3 sm:grid-cols-2">
              <div className="rounded-[20px_5px_20px_5px] border border-white/10 bg-white/6 p-5">
                <p className="text-[10px] font-black uppercase tracking-[.2em] text-white/45">{copy.wallet}</p>
                <p className="mt-2 font-display text-4xl text-[#ffcc66]">{viewer ? currencyLabel(viewer.wallet.softBalance) : "--- SUP"}</p>
                {!viewer ? <Link href="/api/auth/signin" className="mt-3 inline-flex text-xs font-bold text-white/65 underline decoration-[#ff4e72] underline-offset-4">{copy.guest}</Link> : null}
              </div>
              <div className="rounded-[20px_5px_20px_5px] border border-white/10 bg-white/6 p-5">
                <p className="text-[10px] font-black uppercase tracking-[.2em] text-white/45">{copy.live}</p>
                <p className="mt-2 font-display text-2xl">{hero.name}</p>
                <p className="mt-2 text-xs text-white/50">{hero.supporterCount} {pick(locale, "supporters", "位應援者")} · {hero.circulatingUnits} {pick(locale, "units", "份應援")}</p>
              </div>
            </div>
          </div>
          <div className="group relative min-h-[520px] lg:min-h-full">
            <CharacterArt character={hero} className="absolute inset-0 h-full" priority sizes="(min-width: 1024px) 55vw, 100vw" />
            <div className="absolute right-5 top-5 z-10 rounded-[16px_4px_16px_4px] bg-[#ffcc66] px-4 py-3 text-[#111827] shadow-xl"><p className="text-[9px] font-black uppercase tracking-[.18em]">FEATURED / 001</p><p className="mt-1 text-sm font-black">{hero.title}</p></div>
            <div className="absolute inset-x-5 bottom-5 z-10 rounded-[24px_6px_24px_6px] border border-white/15 bg-[#111827]/82 p-5 backdrop-blur-xl sm:inset-x-8 sm:bottom-8">
              <p className="font-display text-3xl">{hero.name}</p><p className="mt-2 text-sm leading-6 text-white/65">{hero.favoritePhrase}</p>
            </div>
          </div>
        </section>

        <section className="grid gap-7">
          <SectionHeading eyebrow={copy.featuredKicker} title={copy.featuredTitle} description={copy.featuredBody} />
          <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-4">
            {cards.map(({ character, comments }) => <CharacterCard key={character.id} character={character} watching={watchlistIds.includes(character.id)} commentCount={comments} locale={locale} />)}
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.05fr_.95fr]">
          <div className="exchange-panel p-6 sm:p-8">
            <SectionHeading eyebrow={copy.loopKicker} title={copy.loopTitle} description={copy.loopBody} />
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {[
                { icon: CheckCircle2, en: "Daily check-in", zh: "每日簽到", reward: "+100 SUP", href: "/me" },
                { icon: BriefcaseBusiness, en: "Character work", zh: "角色打工", reward: "+10–60 SUP", href: "/work" },
                { icon: HeartHandshake, en: "Comfort session", zh: "完成安慰流程", reward: pick(locale, "+10 mission SUP", "+10 任務 SUP"), href: "/comfort" },
              ].map((mission) => <Link key={mission.en} href={localePath(locale, mission.href)} className="group rounded-[20px_5px_20px_5px] border border-black/10 bg-[#f5f1e8] p-5 transition hover:-translate-y-1 hover:border-[#ff4e72]"><mission.icon className="h-6 w-6 text-[#e83c62]" /><h3 className="mt-5 font-display text-2xl">{pick(locale, mission.en, mission.zh)}</h3><p className="mt-2 text-sm font-black text-[#19757a]">{mission.reward}</p></Link>)}
            </div>
          </div>
          <div className="exchange-panel bg-[#111827] p-6 text-white sm:p-8">
            <SectionHeading eyebrow={copy.feedKicker} title={copy.feedTitle} description={copy.feedBody} tone="light" />
            <div className="mt-7 grid gap-3">
              {recentTrades.slice(0, 5).map((trade) => {
                const character = localizeCharacter(trade.character, locale);
                return <div key={trade.id} className="flex items-center justify-between gap-4 rounded-[17px_4px_17px_4px] border border-white/8 bg-white/5 p-4"><div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-[12px_3px_12px_3px] bg-[#ff4e72]/18 text-[#ff7d9a]"><RadioTower className="h-4 w-4" /></span><div><p className="text-sm font-bold">{character.name}</p><p className="mt-1 text-[10px] uppercase tracking-[.14em] text-white/38">{formatHongKongDate(trade.createdAt, locale)}</p></div></div><span className="text-sm font-black text-[#ffcc66]">{trade.side === "BUY" ? "+" : "↺"}{trade.quantity}</span></div>;
              })}
            </div>
          </div>
        </section>

        <section className="grid gap-7">
          <div className="flex flex-wrap items-end justify-between gap-5"><SectionHeading eyebrow={copy.boothKicker} title={copy.boothTitle} description={copy.boothBody} /><Link href={localePath(locale, "/shop")} className="exchange-button-secondary"><ShoppingBag className="h-4 w-4" />{copy.booth}</Link></div>
          <div className="grid gap-5 md:grid-cols-3">
            {shopItems.slice(0, 3).map((sourceItem) => { const item = localizeShopItem(sourceItem, locale); return <Link key={item.id} href={localePath(locale, "/shop")} className="exchange-panel group p-5"><div className={`shop-preview ${item.kind === "PROFILE_THEME" ? "is-theme" : item.kind === "WALLPAPER" ? "is-wallpaper" : ""}`} /><p className="mt-5 text-[10px] font-black uppercase tracking-[.2em] text-[#e83c62]">{item.kind.replaceAll("_", " ")}</p><h3 className="mt-2 font-display text-2xl">{item.title}</h3><p className="mt-3 flex items-center gap-2 text-sm font-black"><Coins className="h-4 w-4 text-[#e2a525]" />{currencyLabel(item.price)}</p></Link>; })}
          </div>
        </section>
      </div>
    </div>
  );
}
