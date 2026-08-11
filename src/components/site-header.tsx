"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { getCopy, hrefWithLocale, normalizeLocale, type Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", key: "discover" },
  { href: "/market", key: "market" },
  { href: "/comfort", key: "comfort" },
  { href: "/me", key: "me" },
  { href: "/admin", key: "admin" },
] as const;

function currentHrefWithLocale(pathname: string, searchParams: URLSearchParams, locale: Locale) {
  const params = new URLSearchParams(searchParams);
  params.set("lang", locale);
  return `${pathname}?${params.toString()}`;
}

export function SiteHeader({ initialLocale = "en" }: { initialLocale?: Locale }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const locale = normalizeLocale(searchParams.get("lang") ?? initialLocale);
  const copy = getCopy(locale);
  const params = new URLSearchParams(searchParams.toString());

  const isActive = (href: string) => {
    if (href === "/") {
      return pathname === "/";
    }

    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const languageTargets: Array<{ locale: Locale; label: string }> = [
    { locale: "en", label: "ENG" },
    { locale: "cn", label: "CN" },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-[#171126]/10 bg-[#fff8ed]/78 backdrop-blur-2xl">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href={hrefWithLocale("/", locale)} className="group flex items-center gap-3">
            <span className="relative flex h-12 w-12 items-center justify-center rounded-[1.2rem] bg-[#171126] text-lg font-black text-white shadow-[0_18px_45px_-28px_rgba(23,17,38,0.85)]">
              <span className="absolute -right-1 -top-1 h-4 w-4 rounded-full bg-[#ff3d7f]" />
              A
            </span>
            <span className="grid">
              <span className="font-display text-xl leading-none tracking-wide text-[#171126] transition group-hover:text-[#ff3d7f] sm:text-2xl">
                {copy.brand.name}
              </span>
              <span className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-500">
                {copy.brand.pulse}
              </span>
            </span>
          </Link>
          <Badge tone="warm">{copy.brand.badge}</Badge>
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between lg:justify-end">
          <nav className="flex items-center gap-1 overflow-x-auto rounded-full border border-[#171126]/10 bg-white/70 p-1 text-sm font-black text-slate-700 shadow-[0_18px_55px_-42px_rgba(23,17,38,0.7)]">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={hrefWithLocale(item.href, locale)}
                className={cn(
                  "whitespace-nowrap rounded-full px-4 py-2 transition",
                  isActive(item.href)
                    ? "bg-[#171126] text-white shadow-[0_10px_24px_-18px_rgba(23,17,38,0.9)]"
                    : "hover:bg-[#fff2c5] hover:text-[#171126]",
                )}
              >
                {copy.nav[item.key]}
              </Link>
            ))}
          </nav>

          <div className="lang-switch flex w-fit items-center gap-1 rounded-full border border-[#171126]/10 p-1 shadow-[0_18px_55px_-42px_rgba(23,17,38,0.7)]">
            {languageTargets.map((target) => (
              <Link
                key={target.locale}
                href={currentHrefWithLocale(pathname, params, target.locale)}
                className={cn(
                  "rounded-full px-3 py-2 text-xs font-black uppercase tracking-[0.18em] transition",
                  locale === target.locale
                    ? "bg-[#ff3d7f] text-white"
                    : "text-slate-600 hover:bg-white hover:text-[#171126]",
                )}
                aria-label={`Switch to ${target.label}`}
              >
                {target.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}
