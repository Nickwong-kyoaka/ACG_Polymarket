import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Plus } from "lucide-react";
import { isPublicLocale, localePath } from "@/components/acg-locale";
import { SocialFeed } from "@/components/social-feed";
import { normalizeSocialNote, type SocialFeedTab } from "@/components/social-note-types";
import { getOptionalSessionUserId } from "@/lib/auth";
import { getExchangeFeatureFlags } from "@/lib/feature-flags";
import { getSocialFeed } from "@/lib/social";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const zh = locale === "zh-Hant";
  return { title: zh ? "社群分享" : "Community", description: zh ? "角色衣裝、觀後感、創作與季番預測。" : "Character looks, impressions, fan creations, and seasonal predictions.", alternates: { canonical: `/${locale}/community`, languages: { en: "/en/community", "zh-Hant": "/zh-Hant/community" } } };
}

export default async function CommunityPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams?: Promise<{ feed?: string }> }) {
  const [{ locale }, query] = await Promise.all([params, searchParams ?? Promise.resolve({ feed: undefined })]);
  const features = getExchangeFeatureFlags();
  if (!isPublicLocale(locale) || !features.community) notFound();
  const userId = await getOptionalSessionUserId();
  const mode: SocialFeedTab = query.feed === "following" || query.feed === "seasonal" ? query.feed : "for-you";
  const payload = await getSocialFeed({ mode, locale, viewerId: userId, limit: 20 }).catch(() => null);
  const initialItems = payload?.items.flatMap((item) => { const note = normalizeSocialNote(item); return note ? [note] : []; }) ?? [];
  const zh = locale === "zh-Hant";
  return <div className="exchange-page discovery-page"><header className="section-heading-compact"><div><h1 className="text-2xl font-extrabold">{zh ? "社群分享" : "Community"}</h1><p className="mt-1 text-sm text-slate-600">{zh ? "角色、作品，和你想分享的小發現。" : "Characters, stories, and discoveries worth sharing."}</p></div>{features.submissions ? <Link href={localePath(locale, "/create")} className="exchange-button-primary"><Plus className="mr-1 h-4 w-4" />{zh ? "發布" : "Post"}</Link> : null}</header><SocialFeed locale={locale} viewerId={userId} signedIn={Boolean(userId)} initialItems={initialItems} /></div>;
}
