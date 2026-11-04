import Link from "next/link";
import { notFound } from "next/navigation";
import { isPublicLocale, localePath } from "@/components/acg-locale";
import { ShareButton } from "@/components/share-button";
import { getOptionalSessionUserId } from "@/lib/auth";
import { getExchangeFeatureFlags } from "@/lib/feature-flags";
import { getVisibleCollection } from "@/lib/social";

export const dynamic = "force-dynamic";
export default async function CollectionPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  if (!isPublicLocale(locale) || !getExchangeFeatureFlags().community) notFound();
  const collection = await getVisibleCollection(slug, locale, await getOptionalSessionUserId()).catch(() => null);
  if (!collection) notFound();
  return <div className="exchange-page"><header className="exchange-panel p-8"><p className="exchange-kicker">@{collection.owner.handle}</p><h1 className="mt-4 font-display text-5xl">{collection.title}</h1><p className="my-5 whitespace-pre-wrap leading-8">{collection.description}</p>{collection.isPublic ? <ShareButton title={collection.title} text={collection.description} path={localePath(locale, `/collections/${collection.slug}`)} locale={locale} /> : <p>{locale === "zh-Hant" ? "這是你的私人收藏櫃。" : "This is your private shelf."}</p>}</header><section className="grid gap-4 sm:grid-cols-2">{collection.previewItems.map((item) => <article key={item.id} className="exchange-panel p-6">{item.type === "post" ? <Link href={localePath(locale, `/posts/${item.post.slug}`)} className="font-display text-2xl">{item.post.title}</Link> : item.type === "character" ? <Link href={localePath(locale, `/character/${item.character.slug}`)} className="font-display text-2xl">{item.character.name}</Link> : <a href={item.asset.url} target="_blank" rel="noreferrer" className="font-bold">{item.asset.altText}</a>}{item.note ? <p className="mt-4 text-sm text-slate-600">{item.note}</p> : null}</article>)}</section></div>;
}
