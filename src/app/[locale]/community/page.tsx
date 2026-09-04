import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, BookMarked, CalendarDays, PenLine, RadioTower } from "lucide-react";
import { isPublicLocale, localePath } from "@/components/acg-locale";
import { SocialFeed } from "@/components/social-feed";
import type { SocialNote } from "@/components/social-note-types";
import { auth } from "@/lib/auth";
import { getExchangeFeatureFlags } from "@/lib/feature-flags";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function getOrigin() {
  return (process.env.NEXTAUTH_URL ?? process.env.AUTH_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const zh = locale === "zh-Hant";
  const path = `/${zh ? "zh-Hant" : "en"}/community`;
  const origin = getOrigin();
  return {
    title: zh ? "ACG 社群手帳" : "ACG Clubroom Notes",
    description: zh ? "收藏角色衣裝、季番觀後感、安慰片段與有來源的預測筆記。" : "Keep character outfits, seasonal impressions, comfort moments, and source-led prediction notes.",
    alternates: { canonical: `${origin}${path}`, languages: { en: `${origin}/en/community`, "zh-Hant": `${origin}/zh-Hant/community` } },
    openGraph: { title: zh ? "ACG 社群手帳" : "ACG Clubroom Notes", description: zh ? "和同好一起翻角色、作品與季番的新頁。" : "Turn new pages for characters, stories, and the season with fellow fans.", url: `${origin}${path}`, type: "website", images: [`${origin}${path}/opengraph-image`] },
    twitter: { card: "summary_large_image" },
  };
}

function mediaUrl(media: { publicUrl: string | null; storageKey: string; derivatives: Array<{ kind: string; publicUrl: string }> }) {
  const derivative = media.derivatives.find((entry) => entry.kind === "CARD") ?? media.derivatives[0];
  if (derivative?.publicUrl) return derivative.publicUrl;
  if (media.publicUrl?.startsWith("https://") || media.publicUrl?.startsWith("/")) return media.publicUrl;
  return media.storageKey.startsWith("assets/") ? `/${media.storageKey}` : null;
}

export default async function CommunityPage({ params }: { params: Promise<{ locale: string }> }) {
  const [{ locale: rawLocale }, session] = await Promise.all([params, auth()]);
  if (!isPublicLocale(rawLocale)) notFound();
  const features = getExchangeFeatureFlags();
  if (!features.community) notFound();
  const locale = rawLocale;
  const zh = locale === "zh-Hant";
  const dbLocale = zh ? "ZH_HANT" : "EN";

  const posts = await prisma.post.findMany({
    where: { status: "PUBLISHED", language: dbLocale },
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    take: 20,
    include: {
      author: { select: { id: true, name: true, image: true, profile: { select: { handle: true, displayName: true } } } },
      primaryCharacter: { select: { id: true, slug: true, name: true, title: true, accentFrom: true, accentTo: true, locales: { select: { locale: true, name: true, title: true } } } },
      series: { select: { id: true, slug: true, title: true, locales: { select: { locale: true, title: true } } } },
      media: { where: { status: "APPROVED" }, orderBy: { sortOrder: "asc" }, include: { asset: { select: { publicUrl: true, storageKey: true, altText: true, sourceLabel: true, sourceUrl: true, locales: { select: { locale: true, altText: true } }, derivatives: { select: { kind: true, publicUrl: true } } } } } },
      topics: { include: { topic: { include: { locales: true } } } },
      _count: { select: { saves: true, reactions: true, comments: true } },
    },
  }).catch(() => []);

  const initialItems: SocialNote[] = posts.map((post) => {
    const characterLocale = post.primaryCharacter?.locales.find((entry) => entry.locale === dbLocale);
    const seriesLocale = post.series?.locales.find((entry) => entry.locale === dbLocale);
    return {
      id: post.id,
      slug: post.slug,
      kind: post.kind,
      title: post.title,
      body: post.body,
      publishedAt: (post.publishedAt ?? post.createdAt).toISOString(),
      viewCount: post.viewCount,
      recommendationReason: zh ? "來自你可能喜歡的話題" : "From a topic you may like",
      author: { id: post.author.id, handle: post.author.profile?.handle ?? "acg-desk", displayName: post.author.profile?.displayName ?? post.author.name ?? (zh ? "ACG 編輯桌" : "ACG Exchange Desk"), imageUrl: post.author.image },
      character: post.primaryCharacter ? { id: post.primaryCharacter.id, slug: post.primaryCharacter.slug, name: characterLocale?.name ?? post.primaryCharacter.name, title: characterLocale?.title ?? post.primaryCharacter.title, accentFrom: post.primaryCharacter.accentFrom, accentTo: post.primaryCharacter.accentTo } : null,
      series: post.series ? { id: post.series.id, slug: post.series.slug, title: seriesLocale?.title ?? post.series.title } : null,
      media: post.media.map((entry) => { const assetLocale = entry.asset?.locales.find((copy) => copy.locale === dbLocale); return { id: entry.id, url: entry.publicUrl ?? (entry.asset ? mediaUrl(entry.asset) : null), altText: entry.altText || assetLocale?.altText || entry.asset?.altText || post.title, sourceLabel: entry.sourceLabel ?? entry.asset?.sourceLabel ?? null, sourceUrl: entry.sourceUrl ?? entry.asset?.sourceUrl ?? null }; }),
      topics: post.topics.map(({ topic }) => { const copy = topic.locales.find((entry) => entry.locale === dbLocale); return { slug: topic.slug, title: copy?.title ?? topic.title }; }),
      counts: { saves: post._count.saves, reactions: post._count.reactions, comments: post._count.comments },
      viewer: { saved: false, followingAuthor: false, followingCharacter: false },
    };
  });

  return (
    <div className="community-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", "@type": "CollectionPage", name: zh ? "ACG 社群手帳" : "ACG Clubroom Notes", url: `${getOrigin()}${localePath(locale, "/community")}`, inLanguage: locale, description: zh ? "角色衣裝、季番觀後感、安慰片段與預測筆記的社群手帳。" : "A clubroom journal for character outfits, seasonal impressions, comfort moments, and prediction notes." }).replace(/</g, "\\u003c") }} />
      <header className="community-masthead">
        <div className="community-masthead-copy"><span className="community-issue">CLUBROOM JOURNAL / VOL. 01</span><p>{zh ? "角色旁邊，總有值得留下的一小頁。" : "There is always another little page worth keeping beside a character."}</p><h1>{zh ? "今天的社群手帳" : "Today in the clubroom"}</h1><div>{features.submissions ? <Link href={localePath(locale, "/create")}><PenLine />{zh ? "寫一篇應援筆記" : "Write a support note"}</Link> : null}{features.predictions ? <Link href={localePath(locale, "/predictions")}><RadioTower />{zh ? "看看季番預測" : "Visit the prediction desk"}</Link> : null}</div></div>
        <aside className="community-masthead-aside"><span>THIS WEEK</span><strong>08</strong><p>{zh ? "夏日衣裝、慢慢追番，還有三張等待結算的觀測票。" : "Summer outfits, slow watchlists, and three observation tickets awaiting a result."}</p><Link href={localePath(locale, "/campaigns")}>{zh ? "翻開本月活動" : "Open this month's prompt"}<ArrowRight /></Link></aside>
      </header>

      <div className="community-shortcuts"><Link href={localePath(locale, "/gallery")}><BookMarked /><span><strong>{zh ? "角色衣裝簿" : "Character wardrobe"}</strong><small>{zh ? "依來源整理的角色圖片" : "Character visuals with source notes"}</small></span></Link><Link href={localePath(locale, "/market")}><RadioTower /><span><strong>{zh ? "應援訊號桌" : "Support signal desk"}</strong><small>{zh ? "看看今天誰正被想起" : "See who is on people's minds"}</small></span></Link><Link href={localePath(locale, "/comfort")}><CalendarDays /><span><strong>{zh ? "今晚的安慰角落" : "Tonight's comfort corner"}</strong><small>{zh ? "語音、漫畫和慢一點的時間" : "Voices, comics, and a slower moment"}</small></span></Link></div>

      <SocialFeed locale={locale} signedIn={Boolean(session?.user?.id)} initialItems={initialItems} />
    </div>
  );
}
