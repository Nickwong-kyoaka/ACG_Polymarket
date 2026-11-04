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

export default async function CreatePage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ edit?: string; creatorSeriesId?: string }> }) {
  const [{ locale: rawLocale }, session] = await Promise.all([params, auth()]);
  if (!isPublicLocale(rawLocale)) notFound();
  const features = getExchangeFeatureFlags();
  if (!features.community || !features.submissions) notFound();
  const locale = rawLocale;
  const zh = locale === "zh-Hant";
  const dbLocale = zh ? "ZH_HANT" : "EN";
  const availability = getAuthAvailability();
  const { edit, creatorSeriesId: initialCreatorSeriesId } = await searchParams;
  const creatorSeries = session?.user?.id ? await prisma.creatorSeries.findMany({ where: { creatorId: session.user.id }, select: { id: true, title: true, published: true }, orderBy: { updatedAt: "desc" } }) : [];
  const initialPost = edit && session?.user?.id ? await prisma.post.findFirst({ where: { id: edit, authorId: session.user.id }, include: { media: { orderBy: { sortOrder: "asc" } }, topics: { select: { topicId: true } } } }) : undefined;
  if (edit && !initialPost) notFound();

  const [characters, topics] = session?.user?.id ? await Promise.all([
    prisma.character.findMany({ where: { publishStatus: "PUBLISHED" }, orderBy: [{ isFeatured: "desc" }, { name: "asc" }], select: { id: true, slug: true, name: true, locales: { select: { locale: true, name: true } } } }),
    prisma.topic.findMany({ orderBy: [{ featured: "desc" }, { title: "asc" }], select: { id: true, slug: true, title: true, locales: { select: { locale: true, title: true } } } }),
  ]) : [[], []];

  return <div className="create-page">
    <Link href={localePath(locale, "/community")} className="post-back-link"><ArrowLeft />{zh ? "返回社群" : "Back to community"}</Link>
    <header className="create-masthead"><span><Feather />{zh ? "創作" : "Create"}</span><h1>{zh ? "寫筆記" : "Write a note"}</h1><p>{zh ? "分享你留意到的衣裝細節、作品感想，或一個有資料支持的猜想。" : "Share an outfit detail, your thoughts on a series, or a prediction backed by a source."}</p></header>
    {session?.user?.id ? <PostComposer initialPost={initialPost ?? undefined} locale={locale} creatorSeries={creatorSeries} initialCreatorSeriesId={creatorSeries.some((item) => item.id === initialCreatorSeriesId) ? initialCreatorSeriesId : undefined}
      characters={characters.map((item) => ({ id: item.id, slug: item.slug, title: item.locales.find((copy) => copy.locale === dbLocale)?.name ?? item.name }))}
      topics={topics.map((item) => ({ id: item.id, slug: item.slug, title: item.locales.find((copy) => copy.locale === dbLocale)?.title ?? item.title }))} />
      : <section className="create-signin"><div><span>{zh ? "登入" : "Sign in"}</span><h2>{zh ? "登入後開始創作" : "Sign in to start writing"}</h2><p>{zh ? "保存草稿、查看審核進度，也能收到讀者的回覆。" : "Save drafts, check review progress, and hear from your readers."}</p></div><AuthEntry locale={locale} googleEnabled={availability.google} demoEnabled={availability.demo} redirectTo={localePath(locale, "/create")} /></section>}
  </div>;
}
