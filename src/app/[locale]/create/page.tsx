import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Feather } from "lucide-react";
import { AuthEntry } from "@/components/auth-entry";
import { isPublicLocale, localePath } from "@/components/acg-locale";
import { PostComposer } from "@/components/post-composer";
import { getAuthAvailability, auth } from "@/lib/auth";
import { getExchangeFeatureFlags } from "@/lib/feature-flags";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  return { title: locale === "zh-Hant" ? "寫一篇應援筆記" : "Write a support note", description: locale === "zh-Hant" ? "把角色衣裝、季番片段、安慰時刻或資料考據收進社群手帳。" : "Add a character outfit, seasonal moment, comfort page, or lore note to the clubroom journal.", robots: { index: false, follow: false } };
}

export default async function CreatePage({ params }: { params: Promise<{ locale: string }> }) {
  const [{ locale: rawLocale }, session] = await Promise.all([params, auth()]);
  if (!isPublicLocale(rawLocale)) notFound();
  const features = getExchangeFeatureFlags();
  if (!features.community || !features.submissions) notFound();
  const locale = rawLocale;
  const zh = locale === "zh-Hant";
  const dbLocale = zh ? "ZH_HANT" : "EN";
  const availability = getAuthAvailability();

  const [characters, topics] = session?.user?.id ? await Promise.all([
    prisma.character.findMany({ where: { publishStatus: "PUBLISHED" }, orderBy: [{ isFeatured: "desc" }, { name: "asc" }], select: { id: true, slug: true, name: true, locales: { select: { locale: true, name: true } } } }),
    prisma.topic.findMany({ orderBy: [{ featured: "desc" }, { title: "asc" }], select: { id: true, slug: true, title: true, locales: { select: { locale: true, title: true } } } }),
  ]) : [[], []];

  return <div className="create-page"><Link href={localePath(locale, "/community")} className="post-back-link"><ArrowLeft />{zh ? "回到社群手帳" : "Back to the clubroom"}</Link><header className="create-masthead"><span><Feather />CREATOR DESK / OPEN</span><h1>{zh ? "寫下一頁，讓同好剛好遇見。" : "Leave a page for another fan to find."}</h1><p>{zh ? "衣裝細節、角色考據、季番觀後感、安慰片段或一個有來源的預測想法，都可以從這張桌開始。" : "An outfit detail, lore note, seasonal impression, comfort moment, or source-led prediction can all begin at this desk."}</p></header>{session?.user?.id ? <PostComposer locale={locale} characters={characters.map((item) => ({ id: item.id, slug: item.slug, title: item.locales.find((copy) => copy.locale === dbLocale)?.name ?? item.name }))} topics={topics.map((item) => ({ id: item.id, slug: item.slug, title: item.locales.find((copy) => copy.locale === dbLocale)?.title ?? item.title }))} /> : <section className="create-signin"><div><span>01 / SIGN IN</span><h2>{zh ? "先認領你的作者頁。" : "Claim your creator page first."}</h2><p>{zh ? "登入後可以保存草稿、追蹤審核狀態，也能在留言出現時收到通知。" : "Sign in to keep drafts, follow review status, and hear when readers leave a note."}</p></div><AuthEntry locale={locale} googleEnabled={availability.google} demoEnabled={availability.demo} redirectTo={localePath(locale, "/create")} /></section>}</div>;
}
