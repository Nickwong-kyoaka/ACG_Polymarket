import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isPublicLocale, localePath } from "@/components/acg-locale";
import { CreatorSeriesSubscribe } from "@/components/creator-series-subscribe";
import { AppError } from "@/lib/api";
import { auth } from "@/lib/auth";
import { getPublicCreatorSeries } from "@/lib/creator-series";
import { getExchangeFeatureFlags } from "@/lib/feature-flags";

export const dynamic = "force-dynamic";
async function readSeries(slug: string, viewerId?: string) {
  try { return await getPublicCreatorSeries(slug, viewerId); }
  catch (error) { if (error instanceof AppError && error.status === 404) notFound(); throw error; }
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isPublicLocale(locale) || !getExchangeFeatureFlags().community) return {};
  const { series } = await readSeries(slug);
  return { title: series.title, description: series.description.slice(0, 200), alternates: { canonical: localePath(locale, `/creators/series/${series.slug}`) } };
}

export default async function CreatorSeriesPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  if (!isPublicLocale(locale) || !getExchangeFeatureFlags().community) notFound();
  const session = await auth();
  const { series, posts, subscribed, isOwner } = await readSeries(slug, session?.user?.id);
  const zh = locale === "zh-Hant";
  return <div className="exchange-page">
    <header className="grid gap-6 border-y border-[#2c2724] py-8 md:grid-cols-[1fr_auto]">
      <div><p className="exchange-kicker">{zh ? "作者連載" : "CREATOR SERIES"} / {series.kind}</p><h1 className="mt-4 font-display text-5xl sm:text-6xl">{series.title}</h1><p className="mt-4 max-w-3xl whitespace-pre-wrap text-sm leading-7 text-[#716862]">{series.description}</p><p className="mt-5 text-sm font-bold">{series.creator.handle ? <Link className="underline" href={localePath(locale, `/u/${series.creator.handle}`)}>{series.creator.name}</Link> : series.creator.name}</p></div>
      <div className="self-end">{isOwner ? <Link className="exchange-button-secondary" href={localePath(locale, "/me/series")}>{zh ? "管理連載" : "Manage series"}</Link> : <CreatorSeriesSubscribe key={`${series.id}:${subscribed}`} seriesId={series.id} subscribed={subscribed} signedIn={Boolean(session?.user?.id)} locale={locale} />}</div>
    </header>
    <section><h2 className="font-display text-3xl">{zh ? "已發布篇章" : "Published chapters"}</h2><p className="mt-2 text-xs text-[#716862]">{zh ? "最新 100 篇；訂閱通知依你的通知偏好發送。" : "Latest 100 chapters. Subscription alerts follow your notification preferences."}</p><div className="mt-5 grid gap-4 md:grid-cols-2">{posts.map((post, index) => <Link key={post.id} href={localePath(locale, `/posts/${post.slug}`)} className="exchange-panel p-6"><p className="exchange-kicker">{String(index + 1).padStart(2, "0")} / {post.kind}</p><h3 className="mt-3 font-display text-3xl">{post.title}</h3><p className="mt-3 line-clamp-3 whitespace-pre-wrap text-sm leading-7 text-[#716862]">{post.body}</p><time className="mt-4 block text-xs">{new Date(post.publishedAt).toLocaleDateString(zh ? "zh-HK" : "en", { timeZone: "Asia/Hong_Kong" })}</time></Link>)}</div>{!posts.length ? <p className="mt-6 border border-dashed border-[#2c2724]/30 p-8">{zh ? "第一篇章尚未發布。" : "The first chapter has not been published yet."}</p> : null}</section>
  </div>;
}
