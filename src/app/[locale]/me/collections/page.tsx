import { notFound, redirect } from "next/navigation";
import { isPublicLocale, localePath } from "@/components/acg-locale";
import { CollectionDesk } from "@/components/collection-desk";
import { SocialNoteCard } from "@/components/social-note-card";
import { normalizeSocialNote } from "@/components/social-note-types";
import { requireSessionUserId } from "@/lib/auth";
import { getExchangeFeatureFlags } from "@/lib/feature-flags";
import { listCollections, listSavedPosts } from "@/lib/social";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };
export default async function MyCollections({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isPublicLocale(locale) || !getExchangeFeatureFlags().community) notFound();
  const userId = await requireSessionUserId().catch(() => null);
  if (!userId) redirect(`${localePath(locale, "/onboarding")}?next=${encodeURIComponent(localePath(locale, "/me/collections"))}`);
  const [collections, saved] = await Promise.all([listCollections({ mine: true, viewerId: userId, locale, limit: 40 }), listSavedPosts(userId, locale)]);
  const zh = locale === "zh-Hant";
  return <div className="exchange-page"><header><p className="exchange-kicker">{zh ? "我的收藏" : "MY SHELVES"}</p><h1 className="mt-4 font-display text-5xl">{zh ? "想再翻開的那些頁" : "Pages to return to"}</h1></header><CollectionDesk locale={locale} collections={collections.items} savedPosts={saved} /><section className="grid gap-5"><h2 className="font-display text-3xl">{zh ? "已收藏的筆記" : "Saved notes"}</h2><div className="social-note-grid">{saved.flatMap((post) => { const note = normalizeSocialNote(post); return note ? [<SocialNoteCard key={note.id} note={note} locale={locale} />] : []; })}</div>{!saved.length ? <p>{zh ? "在喜歡的筆記按下收藏，就會出現在這裡。" : "Save a note you like and it will appear here."}</p> : null}</section></div>;
}
