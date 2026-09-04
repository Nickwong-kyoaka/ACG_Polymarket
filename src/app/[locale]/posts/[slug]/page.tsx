import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isPublicLocale } from "@/components/acg-locale";
import type { PostComment } from "@/components/post-conversation";
import { SocialPostDetail } from "@/components/social-post-detail";
import type { SocialNote } from "@/components/social-note-types";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function getOrigin() {
  return (process.env.NEXTAUTH_URL ?? process.env.AUTH_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

function renderedUrl(media: { publicUrl: string | null; storageKey: string; derivatives: Array<{ kind: string; publicUrl: string }> }) {
  const derivative = media.derivatives.find((entry) => entry.kind === "HERO") ?? media.derivatives.find((entry) => entry.kind === "CARD") ?? media.derivatives[0];
  if (derivative?.publicUrl) return derivative.publicUrl;
  if (media.publicUrl?.startsWith("https://") || media.publicUrl?.startsWith("/")) return media.publicUrl;
  return media.storageKey.startsWith("assets/") ? `/${media.storageKey}` : null;
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }): Promise<Metadata> {
  const { locale, slug } = await params;
  const zh = locale === "zh-Hant";
  const post = await prisma.post.findFirst({
    where: { slug, status: "PUBLISHED" },
    select: { title: true, body: true, media: { where: { status: "APPROVED" }, orderBy: { sortOrder: "asc" }, take: 1, include: { asset: { select: { publicUrl: true, storageKey: true, derivatives: { select: { kind: true, publicUrl: true } } } } } } },
  }).catch(() => null);
  if (!post) return { title: zh ? "社群筆記" : "Clubroom note" };
  const path = `/${zh ? "zh-Hant" : "en"}/posts/${slug}`;
  const rawImage = post.media[0]?.publicUrl ?? (post.media[0]?.asset ? renderedUrl(post.media[0].asset) : null);
  const image = rawImage ? (rawImage.startsWith("http") ? rawImage : `${getOrigin()}${rawImage}`) : `${getOrigin()}${path}/opengraph-image`;
  const description = post.body.replace(/\s+/g, " ").slice(0, 155);
  return {
    title: post.title,
    description,
    alternates: { canonical: `${getOrigin()}${path}`, languages: { en: `${getOrigin()}/en/posts/${slug}`, "zh-Hant": `${getOrigin()}/zh-Hant/posts/${slug}` } },
    openGraph: { title: post.title, description, type: "article", url: `${getOrigin()}${path}`, images: [{ url: image, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", title: post.title, description, images: [image] },
  };
}

export default async function PostPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const [{ locale: rawLocale, slug }, session] = await Promise.all([params, auth()]);
  if (!isPublicLocale(rawLocale)) notFound();
  const locale = rawLocale;
  const dbLocale = locale === "zh-Hant" ? "ZH_HANT" : "EN";
  const post = await prisma.post.findFirst({
    where: { slug, status: "PUBLISHED" },
    include: {
      author: { select: { id: true, name: true, image: true, profile: { select: { handle: true, displayName: true } } } },
      primaryCharacter: { select: { id: true, slug: true, name: true, title: true, accentFrom: true, accentTo: true, locales: { select: { locale: true, name: true, title: true } } } },
      series: { select: { id: true, slug: true, title: true, locales: { select: { locale: true, title: true } } } },
      media: { where: { status: "APPROVED" }, orderBy: { sortOrder: "asc" }, include: { asset: { select: { publicUrl: true, storageKey: true, altText: true, sourceLabel: true, sourceUrl: true, locales: { select: { locale: true, altText: true } }, derivatives: { select: { kind: true, publicUrl: true } } } } } },
      topics: { include: { topic: { include: { locales: true } } } },
      comments: { where: { status: "VISIBLE", parentId: null }, orderBy: [{ pinnedByAuthor: "desc" }, { createdAt: "desc" }], take: 40, include: { user: { select: { name: true, profile: { select: { displayName: true, handle: true } } } }, replies: { where: { status: "VISIBLE" }, orderBy: { createdAt: "asc" }, take: 20, include: { user: { select: { name: true, profile: { select: { displayName: true, handle: true } } } } } } } },
      saves: { where: { userId: session?.user?.id ?? "anonymous" }, take: 1 },
      _count: { select: { saves: true, reactions: true, comments: true } },
    },
  }).catch(() => null);
  if (!post) notFound();

  const characterLocale = post.primaryCharacter?.locales.find((entry) => entry.locale === dbLocale);
  const seriesLocale = post.series?.locales.find((entry) => entry.locale === dbLocale);
  const note: SocialNote = {
    id: post.id,
    slug: post.slug,
    kind: post.kind,
    title: post.title,
    body: post.body,
    publishedAt: (post.publishedAt ?? post.createdAt).toISOString(),
    viewCount: post.viewCount,
    author: { id: post.author.id, handle: post.author.profile?.handle ?? "acg-desk", displayName: post.author.profile?.displayName ?? post.author.name ?? (locale === "zh-Hant" ? "ACG 編輯桌" : "ACG Exchange Desk"), imageUrl: post.author.image },
    character: post.primaryCharacter ? { id: post.primaryCharacter.id, slug: post.primaryCharacter.slug, name: characterLocale?.name ?? post.primaryCharacter.name, title: characterLocale?.title ?? post.primaryCharacter.title, accentFrom: post.primaryCharacter.accentFrom, accentTo: post.primaryCharacter.accentTo } : null,
    series: post.series ? { id: post.series.id, slug: post.series.slug, title: seriesLocale?.title ?? post.series.title } : null,
    media: post.media.map((entry) => { const localized = entry.asset?.locales.find((copy) => copy.locale === dbLocale); return { id: entry.id, url: entry.publicUrl ?? (entry.asset ? renderedUrl(entry.asset) : null), altText: entry.altText || localized?.altText || entry.asset?.altText || post.title, sourceLabel: entry.sourceLabel ?? entry.asset?.sourceLabel ?? null, sourceUrl: entry.sourceUrl ?? entry.asset?.sourceUrl ?? null }; }),
    topics: post.topics.map(({ topic }) => { const localized = topic.locales.find((entry) => entry.locale === dbLocale); return { slug: topic.slug, title: localized?.title ?? topic.title }; }),
    counts: { saves: post._count.saves, reactions: post._count.reactions, comments: post._count.comments },
    viewer: { saved: post.saves.length > 0, followingAuthor: false, followingCharacter: false },
  };
  const comments: PostComment[] = post.comments.map((comment) => ({ id: comment.id, content: comment.content, createdAt: comment.createdAt.toISOString(), pinnedByAuthor: comment.pinnedByAuthor, heartedByAuthor: comment.heartedByAuthor, author: { displayName: comment.user.profile?.displayName ?? comment.user.name ?? (locale === "zh-Hant" ? "應援者" : "Supporter"), handle: comment.user.profile?.handle ?? "supporter" }, replies: comment.replies.map((reply) => ({ id: reply.id, content: reply.content, createdAt: reply.createdAt.toISOString(), pinnedByAuthor: reply.pinnedByAuthor, heartedByAuthor: reply.heartedByAuthor, author: { displayName: reply.user.profile?.displayName ?? reply.user.name ?? (locale === "zh-Hant" ? "應援者" : "Supporter"), handle: reply.user.profile?.handle ?? "supporter" } })) }));
  const articleUrl = `${getOrigin()}/${locale}/posts/${post.slug}`;
  const jsonLd = { "@context": "https://schema.org", "@type": "Article", headline: post.title, description: post.body.replace(/\s+/g, " ").slice(0, 220), datePublished: (post.publishedAt ?? post.createdAt).toISOString(), dateModified: post.updatedAt.toISOString(), inLanguage: post.language === "ZH_HANT" ? "zh-Hant" : "en", mainEntityOfPage: articleUrl, author: { "@type": "Person", name: note.author.displayName, url: `${getOrigin()}/${locale}/u/${note.author.handle}` }, image: note.media.flatMap((media) => media.url ? [media.url.startsWith("http") ? media.url : `${getOrigin()}${media.url}`] : []) };
  return <><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} /><SocialPostDetail note={note} comments={comments} locale={locale} signedIn={Boolean(session?.user?.id)} canModerate={session?.user?.id === post.authorId} /></>;
}
