"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useSyncExternalStore } from "react";
import { Bell, ChartNoAxesCombined, Compass, Heart, LibraryBig, Plus, Search, UserRound } from "lucide-react";
import { localeFromPathname, localePath, pick, stripLocale } from "@/components/acg-locale";
import type { ExchangeFeatureFlags } from "@/lib/feature-flags";
import { localizedContextPath } from "@/lib/navigation-context";

function listenForHash(callback: () => void) {
  window.addEventListener("hashchange", callback);
  window.addEventListener("popstate", callback);
  return () => { window.removeEventListener("hashchange", callback); window.removeEventListener("popstate", callback); };
}

export function SiteHeader({ signedIn = false, viewerName, balance, unreadCount = 0, features = { community: true, predictions: true, submissions: true } }: { signedIn?: boolean; viewerName?: string | null; balance?: number; unreadCount?: number; features?: ExchangeFeatureFlags }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const hash = useSyncExternalStore(listenForHash, () => window.location.hash, () => "");
  const locale = localeFromPathname(pathname);
  const path = stripLocale(pathname);
  const zh = locale === "zh-Hant";
  if (path === "/admin" || path.startsWith("/admin/")) return null;
  const seasonal = path === "/" && searchParams.get("feed") === "seasonal";
  const nav = [
    { href: "/", label: zh ? "發現" : "Discover", icon: Compass, active: (path === "/" && !seasonal) || path === "/community" },
    { href: "/market", label: zh ? "角色" : "Characters", icon: Heart, active: path === "/market" || path.startsWith("/character/") },
    ...(features.predictions ? [{ href: "/predictions", label: zh ? "預測" : "Predictions", icon: ChartNoAxesCombined, active: path.startsWith("/predictions") }] : []),
    { href: "/?feed=seasonal#season", label: zh ? "追番" : "Season", icon: LibraryBig, active: seasonal || path.startsWith("/series/") },
  ];
  const createHref = signedIn ? localePath(locale, "/create") : `${localePath(locale, "/onboarding")}?next=${encodeURIComponent(localePath(locale, "/create"))}`;
  const mobile = [nav[0], nav[1], ...(features.community && features.submissions ? [{ href: "/create", label: zh ? "發布" : "Post", icon: Plus, active: path === "/create" }] : []), ...nav.filter((item) => item.href === "/predictions"), { href: "/me", label: zh ? "我的" : "Me", icon: UserRound, active: path.startsWith("/me") }];
  return <>
    <a className="skip-content-link" href="#main-content">{zh ? "跳至主要內容" : "Skip to content"}</a>
    <header className="exchange-header sticky top-0 z-50">
      <div className="site-toolbar">
        <Link href={localePath(locale)} className="exchange-logo" aria-label={zh ? "ACG Exchange 首頁" : "ACG Exchange home"}><span className="exchange-logo-mark" aria-hidden="true">推</span><span className="exchange-logo-word"><span className="hidden sm:inline">ACG EXCHANGE</span><span className="sm:hidden">ACG</span></span></Link>
        <nav className="hidden items-center gap-1 lg:flex" aria-label={zh ? "主要導覽" : "Primary navigation"}>{nav.map((item) => <Link key={item.href} href={localePath(locale, item.href)} aria-current={item.active ? "page" : undefined} className={`exchange-nav-link ${item.active ? "is-active" : ""}`}>{item.label}</Link>)}</nav>
        <div className="site-tools">
          <Link href={localePath(locale, "/search")} aria-label={features.community ? (zh ? "搜尋角色、筆記與作品" : "Search characters, notes and series") : (zh ? "搜尋角色與作品" : "Search characters and series")} className="toolbar-icon"><Search aria-hidden="true" /></Link>
          <Link href={localePath(locale, "/me/notifications")} className="toolbar-icon relative" aria-label={zh ? `消息${unreadCount ? `，${unreadCount} 則未讀` : ""}` : `Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`}><Bell aria-hidden="true" />{unreadCount > 0 ? <span className="notification-dot" aria-hidden="true" /> : null}</Link>
          {signedIn && typeof balance === "number" ? <Link href={localePath(locale, "/me?tab=records")} className="hidden text-sm font-bold tabular-nums xl:block">{balance.toLocaleString("en-US")} <span className="text-xs text-slate-500">SUP</span></Link> : null}
          {features.community && features.submissions ? <Link href={createHref} className="exchange-button-primary hidden lg:inline-flex"><Plus className="h-4 w-4" />{zh ? "發布" : "Post"}</Link> : null}
          <div className="locale-switch" role="group" aria-label={zh ? "語言" : "Language"}>{(["en", "zh-Hant"] as const).map((target) => <Link key={target} href={localizedContextPath(target, path, searchParams.toString(), hash)} hrefLang={target} aria-current={locale === target ? "true" : undefined} className={`locale-switch-link ${locale === target ? "is-active" : ""}`}>{target === "en" ? "EN" : "繁"}</Link>)}</div>
          {signedIn ? <details className="account-menu hidden sm:block"><summary className="toolbar-icon" aria-label={zh ? "個人選單" : "Account menu"}><UserRound aria-hidden="true" /></summary><div className="account-menu-sheet"><p className="border-b border-slate-100 px-3 py-2 font-bold">{viewerName || pick(locale, "Your account", "你的帳戶")}</p>{[{ href: "/me", en: "My room", zh: "我的空間" }, { href: "/me/collections", en: "Collections", zh: "我的收藏" }, { href: "/me/library", en: "Watch library", zh: "我的追番" }, { href: "/gallery", en: "Gallery", zh: "圖集" }, { href: "/comfort", en: "Comfort", zh: "陪伴" }, { href: "/shop", en: "Shop", zh: "外觀商店" }, { href: "/work", en: "Work", zh: "打工" }].filter((item) => features.community || item.href !== "/me/collections").map((item) => <Link key={item.href} href={localePath(locale, item.href)}>{zh ? item.zh : item.en}</Link>)}</div></details> : <Link href={localePath(locale, "/onboarding")} className="exchange-signin hidden sm:inline-flex">{zh ? "登入" : "Sign in"}</Link>}
        </div>
      </div>
    </header>
    <nav className="mobile-bottom-nav" style={{ gridTemplateColumns: `repeat(${mobile.length}, minmax(0, 1fr))` }} aria-label={zh ? "手機導覽" : "Mobile navigation"}>{mobile.map((item) => <Link key={item.href} href={item.href === "/create" ? createHref : localePath(locale, item.href)} aria-current={item.active ? "page" : undefined} className={`mobile-nav-link ${item.active ? "is-active" : ""} ${item.href === "/create" ? "is-compose" : ""}`}><item.icon aria-hidden="true" className="h-5 w-5" /><span>{item.label}</span></Link>)}</nav>
  </>;
}
