import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isPublicLocale, publicLocales } from "@/components/acg-locale";

export function generateStaticParams() {
  return publicLocales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isPublicLocale(locale)) return {};
  return {
    title: { default: locale === "zh-Hant" ? "ACG Exchange｜角色應援交易所" : "ACG Exchange | Character Support Signals", template: `%s | ACG Exchange` },
    description: locale === "zh-Hant" ? "把喜歡變成可收藏的應援訊號：角色市場、每日 SUP、安慰室與原創外觀。" : "Turn affection into collectible support signals through a positive-only character exchange, daily SUP, comfort rooms, and original cosmetics.",
    alternates: { languages: { en: "/en", "zh-Hant": "/zh-Hant" } },
  };
}

export default async function LocaleLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isPublicLocale(locale)) notFound();
  return <div lang={locale} data-public-locale={locale}>{children}</div>;
}
