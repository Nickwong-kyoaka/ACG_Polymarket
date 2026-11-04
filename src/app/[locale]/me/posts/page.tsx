import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { isPublicLocale, localePath } from "@/components/acg-locale";
import { requireSessionUserId } from "@/lib/auth";
import { getExchangeFeatureFlags } from "@/lib/feature-flags";
import { listMyPosts } from "@/lib/social";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };

export default async function MyPosts({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isPublicLocale(locale) || !getExchangeFeatureFlags().community) notFound();
  const userId = await requireSessionUserId().catch(() => null);
  if (!userId) redirect(`${localePath(locale, "/onboarding")}?next=${encodeURIComponent(localePath(locale, "/me/posts"))}`);
  const { posts } = await listMyPosts(userId);
  const zh = locale === "zh-Hant";
  const labels: Record<string, string> = zh ? { DRAFT: "草稿", PENDING_REVIEW: "等待審核", HELD: "需要修改", PUBLISHED: "已發布", REMOVED: "已移除" } : { DRAFT: "Draft", PENDING_REVIEW: "In review", HELD: "Changes requested", PUBLISHED: "Published", REMOVED: "Removed" };
  return <div className="exchange-page"><header className="flex flex-wrap items-end justify-between gap-4"><div><p className="exchange-kicker">{zh ? "作者工作台" : "CREATOR DESK"}</p><h1 className="mt-4 font-display text-5xl">{zh ? "每一頁都留在這裡" : "Every page has a place"}</h1></div><Link href={localePath(locale, "/create")} className="exchange-button-primary">{zh ? "寫新筆記" : "New note"}</Link><Link href={localePath(locale, "/me/notifications")} className="exchange-button-secondary">{zh ? "審核回覆" : "Review messages"}</Link></header><div className="grid gap-4">{posts.map((post) => <article key={post.id} className="exchange-panel p-6"><p className="text-xs font-bold text-[#a34855]">{labels[post.status]}</p><h2 className="mt-3 font-display text-3xl">{post.title}</h2><p className="mt-3 line-clamp-3 whitespace-pre-wrap text-sm leading-7 text-slate-600">{post.body}</p><div className="mt-5 flex gap-3">{post.status !== "REMOVED" ? <Link className="exchange-button-secondary" href={`${localePath(locale, "/create")}?edit=${post.id}`}>{zh ? "編輯與預覽" : "Edit and preview"}</Link> : null}{post.status === "PUBLISHED" ? <Link className="exchange-button-secondary" href={localePath(locale, `/posts/${post.slug}`)}>{zh ? "公開頁面" : "Public page"}</Link> : null}</div></article>)}{!posts.length ? <p>{zh ? "第一篇筆記還在等你落筆。" : "Your first page is waiting."}</p> : null}</div></div>;
}
