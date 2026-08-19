"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BriefcaseBusiness, Flag, Heart, Images, Languages, Radio, UserRound } from "lucide-react";
import { getExchangeCopy, localeFromPathname, localePath, stripLocale } from "@/components/acg-locale";
import { cn } from "@/lib/utils";

const desktopNav = [
  { href: "/", key: "home" },
  { href: "/market", key: "market" },
  { href: "/campaigns", key: "campaigns" },
  { href: "/gallery", key: "gallery" },
  { href: "/comfort", key: "comfort" },
  { href: "/shop", key: "shop" },
  { href: "/me", key: "me" },
] as const;

const mobileNav = [
  { href: "/market", key: "market", icon: Radio },
  { href: "/campaigns", key: "campaigns", icon: Flag },
  { href: "/comfort", key: "comfort", icon: Heart },
  { href: "/gallery", key: "gallery", icon: Images },
  { href: "/me", key: "me", icon: UserRound },
] as const;

export function SiteHeader({ signedIn = false, viewerName }: { signedIn?: boolean; viewerName?: string | null }) {
  const pathname = usePathname();
  const locale = localeFromPathname(pathname);
  const copy = getExchangeCopy(locale);
  const basePath = stripLocale(pathname);
  const isAdmin = basePath === "/admin" || basePath.startsWith("/admin/");

  function isActive(href: string) {
    return href === "/" ? basePath === "/" : basePath === href || basePath.startsWith(`${href}/`);
  }

  if (isAdmin) return null;

  return (
    <>
      <header className="exchange-header sticky top-0 z-50">
        <div className="mx-auto flex h-[72px] max-w-[1480px] items-center justify-between gap-4 px-4 sm:px-6 xl:px-10">
          <Link href={localePath(locale)} className="exchange-logo group" aria-label="ACG Exchange home">
            <span className="exchange-logo-mark"><span>推</span></span>
            <span className="grid leading-none">
              <span className="exchange-logo-word">ACG EXCHANGE</span>
              <span className="exchange-logo-sub">AFFECTION SIGNAL NETWORK</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-1 xl:flex" aria-label="Primary navigation">
            {desktopNav.map((item) => (
              <Link
                key={item.href}
                href={localePath(locale, item.href)}
                className={cn("exchange-nav-link", isActive(item.href) && "is-active")}
              >
                {copy.nav[item.key]}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Link href={localePath(locale, "/work")} className="exchange-button-secondary hidden px-3 py-2 text-xs sm:inline-flex">
              <BriefcaseBusiness className="mr-1 h-4 w-4 text-[#bd3628]" />
              {copy.nav.work}
            </Link>
            <div className="locale-switch" aria-label="Language switch">
              <Languages className="h-4 w-4 text-white/50" />
              {(["en", "zh-Hant"] as const).map((target) => (
                <Link
                  key={target}
                  href={localePath(target, basePath)}
                  className={cn("locale-switch-link", locale === target && "is-active")}
                >
                  {target === "en" ? "EN" : "中"}
                </Link>
              ))}
            </div>
            <Link href={signedIn ? localePath(locale, "/me") : "/api/auth/signin"} className="exchange-signin hidden sm:inline-flex">
              {signedIn ? viewerName ?? copy.nav.me : copy.common.signIn}
            </Link>
          </div>
        </div>
      </header>

      <nav className="mobile-bottom-nav xl:hidden" aria-label="Mobile navigation">
        {mobileNav.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.href} href={localePath(locale, item.href)} className={cn("mobile-nav-link", isActive(item.href) && "is-active")}>
              <Icon className="h-[19px] w-[19px]" strokeWidth={2.2} />
              <span>{copy.nav[item.key]}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
