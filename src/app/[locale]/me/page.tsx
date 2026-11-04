import Link from "next/link";
import { Bell, BriefcaseBusiness, Eye, UserRound } from "lucide-react";
import { notFound } from "next/navigation";
import { CharacterArt } from "@/components/character-art";
import { formatHongKongDate, isPublicLocale, localePath, localizeCharacter, pick } from "@/components/acg-locale";
import { RewardClaimPanel } from "@/components/reward-claim-panel";
import { MissionPanel } from "@/components/mission-panel";
import { ShopPanel } from "@/components/shop-panel";
import { ProfileSettings } from "@/components/profile-settings";
import { ProfileAppearance } from "@/components/profile-appearance";
import { getPublishedRoomMedia } from "@/components/room-media.server";
import { currencyLabel } from "@/lib/utils";
import { getMeDashboard, getShopItems, listCharacters } from "@/lib/store";
import { localizeNotification } from "@/lib/notification-copy";
import { getExchangeFeatureFlags } from "@/lib/feature-flags";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };

export default async function PlayerRoom({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams?: Promise<{ tab?: string }> }) {
  const [{ locale }, query] = await Promise.all([params, searchParams ?? Promise.resolve({ tab: undefined })]);
  if (!isPublicLocale(locale)) notFound();
  const features = getExchangeFeatureFlags();
  const portfolio = await getMeDashboard(undefined, locale).catch(() => null);
  if (!portfolio) return <div className="exchange-page"><section className="exchange-panel mx-auto w-full max-w-xl p-8 text-center"><UserRound className="mx-auto h-10 w-10 text-[#c4455c]" /><h1 className="mt-5 text-2xl font-bold">{pick(locale, "Sign in to open your room", "登入後打開你的玩家房間")}</h1><p className="mt-4 text-slate-600">{pick(locale, "Your collections, activity, and personal settings stay here.", "你的收藏、參與記錄與個人設定都在這裡。")}</p><Link href={`${localePath(locale, "/onboarding")}?next=${encodeURIComponent(localePath(locale, "/me"))}`} className="exchange-button-primary mt-6">{pick(locale, "Open sign in", "前往登入")}</Link></section></div>;
  const tabs = [{ id: "collections", en: "Collections", zh: "收藏" }, { id: "records", en: "Activity", zh: "記錄" }, { id: "missions", en: "Daily", zh: "任務" }, { id: "appearance", en: "Appearance", zh: "外觀" }, { id: "settings", en: "Settings", zh: "設定" }];
  const tab = tabs.some((item) => item.id === query.tab) ? query.tab! : "collections";
  const [shopItems, characters] = await Promise.all([tab === "appearance" ? getShopItems(locale) : Promise.resolve([]), tab === "settings" ? listCharacters({ locale }) : Promise.resolve([])]);
  const assets = await getPublishedRoomMedia([portfolio.profile.equippedFrameAsset, portfolio.profile.equippedThemeAsset, ...shopItems.map((item) => item.unlockPayload.assetId)]);
  const zh = locale === "zh-Hant";
  const shortcuts = [
    ...(features.community ? [{ href: "/me/posts", label: zh ? "我的貼文 · 創作桌" : "My posts · Creator desk" }, { href: "/me/collections", label: zh ? "我的收藏" : "My collections" }, { href: "/me/series", label: zh ? "我的創作系列" : "My creator series" }] : []),
    { href: "/me/library", label: zh ? "追番資料庫" : "Watch library" },
    ...(features.predictions ? [{ href: "/me/predictions", label: zh ? "我的預測" : "My predictions" }] : []),
    { href: "/me/moderation", label: zh ? "審核與申訴" : "Reviews & appeals" },
  ];
  return <div className="exchange-page">
    <header className="flex flex-wrap items-center justify-between gap-4"><div><h1 className="text-2xl font-extrabold">{portfolio.profile.displayName}</h1><p className="mt-1 text-sm text-slate-500">{zh ? "我的空間" : "My room"}</p></div><Link href={localePath(locale, `/u/${portfolio.profile.handle}`)} className="exchange-button-secondary"><Eye className="h-4 w-4" />{zh ? "查看公開頁" : "View public profile"}</Link></header>
    <ProfileAppearance profile={portfolio.profile} assets={assets} locale={locale} />
    <nav className="room-tabs" aria-label={zh ? "個人空間分區" : "Room sections"}>{tabs.map((item) => <Link key={item.id} href={`${localePath(locale, "/me")}?tab=${item.id}`} aria-current={tab === item.id ? "page" : undefined}>{zh ? item.zh : item.en}</Link>)}</nav>
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="grid min-w-0 gap-6">
        {tab === "collections" ? <>
          <section><h2 className="mb-4 text-lg font-bold">{zh ? "我的收藏與創作" : "Your collections and creations"}</h2><div className="room-shortcuts">{shortcuts.map((item) => <Link key={item.href} href={localePath(locale, item.href)}>{item.label}</Link>)}</div></section>
          <section><h2 className="mb-4 text-lg font-bold">{zh ? "正在應援的角色" : "Characters you support"}</h2>{portfolio.positions.length ? <div className="grid grid-cols-2 gap-4 xl:grid-cols-3">{portfolio.positions.map((position) => { const character = localizeCharacter(position.character, locale); return <Link key={position.id} href={localePath(locale, `/character/${character.slug}`)} className="exchange-panel overflow-hidden"><CharacterArt locale={locale} character={character} className="!min-h-0 aspect-[4/5]" sizes="(min-width: 1024px) 25vw, 50vw" /><div className="p-3"><p className="text-sm font-bold">{character.name}</p><p className="mt-1 text-xs text-slate-500">{position.units} {zh ? "份應援" : "support units"}</p></div></Link>; })}</div> : <div className="exchange-panel p-6 text-sm text-slate-600">{zh ? "還沒有應援記錄。" : "No support activity yet."}<Link className="ml-2 font-bold text-[#c4455c]" href={localePath(locale, "/market")}>{zh ? "去看看角色" : "Find a character"}</Link></div>}</section>
          {portfolio.watchlist.length ? <section><h2 className="mb-3 text-lg font-bold">{zh ? "關注清單" : "Watchlist"}</h2><div className="flex flex-wrap gap-2">{portfolio.watchlist.map((item) => <Link key={item.id} href={localePath(locale, `/character/${item.slug}`)} className="exchange-button-secondary">{localizeCharacter(item, locale).name}</Link>)}</div></section> : null}
        </> : null}
        {tab === "records" ? <>
          <section className="exchange-panel p-5"><h2 className="text-lg font-bold">{zh ? "參與記錄" : "Your activity"}</h2><div className="room-shortcuts mt-4">{features.predictions ? <Link href={localePath(locale, "/me/predictions")}>{zh ? "我的預測" : "My predictions"}</Link> : null}<Link href={localePath(locale, "/campaigns")}>{zh ? "應援活動" : "Support campaigns"}</Link></div><div className="mt-5 grid gap-3">{portfolio.campaigns.filter((item) => item.viewerContribution).map((campaign) => <Link key={campaign.id} href={localePath(locale, `/campaigns/${campaign.slug}`)} className="rounded-lg border border-slate-200 p-4"><p className="font-bold">{campaign.title}</p><p className="mt-1 text-sm text-slate-600">{campaign.viewerContribution?.units} {zh ? "份貢獻" : "units contributed"} · {campaign.currentUnits} / {campaign.goalUnits}</p></Link>)}</div></section>
          <section><div className="section-heading-compact"><h2>{zh ? "最近消息" : "Recent notifications"}</h2><Link href={localePath(locale, "/me/notifications")}>{zh ? "全部消息" : "All notifications"}</Link></div><div className="grid gap-3">{portfolio.notifications.length ? portfolio.notifications.map((notice) => <article className="exchange-panel p-4" key={notice.id}><p className="font-bold">{localizeNotification(notice, locale).title}</p><p className="mt-2 text-sm text-slate-600">{localizeNotification(notice, locale).body}</p><time className="mt-2 block text-xs text-slate-500">{formatHongKongDate(notice.createdAt, locale)}</time></article>) : <p className="text-sm text-slate-500">{zh ? "暫時沒有新消息。" : "No new notifications."}</p>}</div></section>
        </> : null}
        {tab === "missions" ? <section className="exchange-panel p-5"><h2 className="mb-5 text-lg font-bold">{zh ? "每日任務" : "Daily missions"}</h2><MissionPanel missions={portfolio.missions} locale={locale} /><Link href={localePath(locale, "/work")} className="exchange-button-secondary mt-5"><BriefcaseBusiness className="h-4 w-4" />{zh ? "角色打工" : "Character work"}</Link><p className="mt-3 text-sm text-slate-500">{portfolio.work.earnedToday} / {portfolio.work.dailyLimit} SUP {zh ? "今日打工收入" : "earned from work today"}</p></section> : null}
        {tab === "appearance" ? <section><h2 className="mb-4 text-lg font-bold">{zh ? "外觀與預覽" : "Appearance and previews"}</h2><ShopPanel items={shopItems} inventory={portfolio.inventory} profile={portfolio.profile} assets={assets} locale={locale} /></section> : null}
        {tab === "settings" ? <ProfileSettings key={portfolio.profile.id} profile={{ displayName: portfolio.profile.displayName, bio: portfolio.profile.bio, holdingsVisibility: portfolio.profile.holdingsVisibility, favoriteTags: portfolio.profile.favoriteTags, pinnedCharacterIds: portfolio.profile.pinnedCharacterIds }} characters={characters.map(({ id, name }) => ({ id, name }))} locale={locale} /> : null}
      </div>
      <aside className="room-utility lg:sticky lg:top-24"><section className="exchange-panel p-5"><p className="text-sm text-slate-500">{zh ? "可用 SUP" : "Available SUP"}</p><p className="my-3 text-3xl font-extrabold tabular-nums">{currencyLabel(portfolio.wallet.softBalance)}</p><RewardClaimPanel locale={locale} /></section><Link href={localePath(locale, "/me/notifications")} className="exchange-button-secondary justify-start"><Bell className="h-4 w-4" />{zh ? "消息中心" : "Notifications"}</Link><nav className="room-shortcuts" aria-label={zh ? "房間工具" : "Room tools"}><Link href={localePath(locale, "/shop")}>{zh ? "外觀商店" : "Shop"}</Link><Link href={localePath(locale, "/comfort")}>{zh ? "陪伴" : "Comfort"}</Link><Link href={localePath(locale, "/gallery")}>{zh ? "圖集" : "Gallery"}</Link></nav></aside>
    </div>
  </div>;
}
