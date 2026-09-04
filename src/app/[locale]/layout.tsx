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
    title: { default: locale === "zh-Hant" ? "ACG Exchange｜角色手帳與季番預測" : "ACG Exchange | Fandom and Season Predictions", template: `%s | ACG Exchange` },
    description: locale === "zh-Hant" ? "收藏角色、交換應援訊號、追蹤新番，也用有來源的問題記下你對下一則消息的判斷。" : "Collect character stories, exchange support signals, follow the season, and record source-led predictions about what comes next.",
    alternates: { languages: { en: "/en", "zh-Hant": "/zh-Hant" } },
  };
}

export default async function LocaleLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isPublicLocale(locale)) notFound();
  return <div lang={locale} data-public-locale={locale}>{children}</div>;
}
