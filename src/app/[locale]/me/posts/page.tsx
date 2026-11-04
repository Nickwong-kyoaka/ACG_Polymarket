import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { isPublicLocale, localePath } from "@/components/acg-locale";
import { creatorPostStatus, creatorPostStatuses, formatServerTimestamp, isCreatorPostStatus, serverTimestamp } from "@/components/creator-post-status";
import { requireSessionUserId } from "@/lib/auth";
import { getExchangeFeatureFlags } from "@/lib/feature-flags";
import { localizeNotification } from "@/lib/notification-copy";
import { prisma } from "@/lib/prisma";
import { listMyPosts } from "@/lib/social";

export const dynamic = "force-dynamic";
export const metadata = { robots: { index: false, follow: false } };

export default async function MyPosts({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams?: Promise<{ status?: string; post?: string }> }) {
  const { locale } = await params;
  if (!isPublicLocale(locale) || !getExchangeFeatureFlags().community) notFound();
  const userId = await requireSessionUserId().catch(() => null);
  if (!userId) redirect(`${localePath(locale, "/onboarding")}?next=${encodeURIComponent(localePath(locale, "/me/posts"))}`);
  const zh = locale === "zh-Hant";
  const query = await searchParams;
  const status = isCreatorPostStatus(query?.status) ? query.status : "ALL";
  const result = await listMyPosts(userId).catch(() => null);
  if (!result) return <div className="exchange-page"><h1>{zh ? "無法載入你的筆記" : "Could not load your posts"}</h1><p role="alert">{zh ? "請稍後重試。現有草稿未被更改。" : "Please try again. Your saved drafts have not changed."}</p><Link href={localePath(locale, "/me/posts")} className="exchange-button-secondary min-h-11">{zh ? "重新載入" : "Try again"}</Link></div>;
  const { posts } = result;
  // Read existing review messages only for this authenticated author's own posts.
  const notifications = posts.length ? await prisma.notification.findMany({
    where: { userId, type: "SYSTEM", OR: posts.map((post) => ({ metadata: { path: ["postId"], equals: post.id } })) },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 100,
    select: { title: true, body: true, type: true, locale: true, metadata: true },
  }).catch(() => null) : [];
  const reviewMessages = new Map<string, { title: string; body: string }>();
  for (const notification of notifications ?? []) {
    const meta = notification.metadata && typeof notification.metadata === "object" && !Array.isArray(notification.metadata) ? notification.metadata : {};
    if (typeof meta.postId !== "string" || !meta.decision || meta.commentId || reviewMessages.has(meta.postId) || !posts.some((post) => post.id === meta.postId)) continue;
    reviewMessages.set(meta.postId, localizeNotification(notification, locale));
  }
  const visible = posts.filter((post) => (status === "ALL" || post.status === status) && (!query?.post || post.id === query.post));

  return <div className="exchange-page creator-workbench-candidate [&_a]:min-h-11">
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div><p className="exchange-kicker">{zh ? "作者工作台" : "MY POSTS"}</p><h1 className="mt-4 font-display text-5xl">{zh ? "管理你的筆記" : "Manage your notes"}</h1><p className="mt-4 text-base">{zh ? "草稿僅你可見；送出不等於發布，圖片須經核准才會公開。" : "Drafts are private. Submitting is not publishing; images must be approved before public display."}</p></div>
      <Link href={localePath(locale, "/create")} className="exchange-button-primary">{zh ? "寫新筆記" : "New note"}</Link>
      <Link href={localePath(locale, "/me/notifications")} className="exchange-button-secondary">{zh ? "審核回覆" : "Review messages"}</Link>
    </header>
    <nav className="my-5 flex flex-wrap gap-2" aria-label={zh ? "依筆記狀態篩選" : "Filter posts by status"}>
      {["ALL", ...creatorPostStatuses].map((value) => <Link key={value} aria-current={status === value && !query?.post ? "page" : undefined} className="exchange-button-secondary" href={`${localePath(locale, "/me/posts")}${value === "ALL" ? "" : `?status=${value}`}`}>{value === "ALL" ? (zh ? "全部" : "All") : creatorPostStatus(value, locale).label} ({posts.filter((post) => value === "ALL" || post.status === value).length})</Link>)}
    </nav>
    {status !== "ALL" ? <p className="mb-5 text-base">{creatorPostStatus(status, locale).explanation}</p> : null}
    {notifications === null ? <p role="status">{zh ? "暫時無法載入審核回覆，請到通知頁重試。" : "Review messages could not load. Open notifications to try again."}</p> : null}
    <div className="grid gap-4">
      {visible.map((post) => {
        const copy = creatorPostStatus(post.status, locale);
        const message = reviewMessages.get(post.id);
        const updatedAt = serverTimestamp(post.updatedAt);
        return <article key={post.id} id={`post-${post.id}`} className="exchange-panel p-6">
          <p className="text-base font-bold">{copy.label}</p>
          <h2 className="mt-3 font-display text-3xl">{post.title}</h2>
          <p className="mt-3 line-clamp-3 whitespace-pre-wrap text-base leading-7">{post.body}</p>
          <p className="mt-3 text-base">{copy.explanation}</p>
          {post.media.some((media) => media.status === "PENDING_REVIEW") ? <p className="mt-3 text-base">{zh ? "圖片：等待審核，尚未公開。" : "Images: awaiting review, not public."}</p> : null}
          {post.media.some((media) => media.status === "PULLED" || media.status === "REJECTED") ? <p className="mt-3 text-base">{zh ? "部分圖片已拒絕或下架，不會公開顯示。請查看審核回覆。" : "Some images were rejected or pulled and are not shown publicly. Check the review message."}</p> : null}
          {updatedAt ? <p className="mt-3 text-sm">{zh ? "伺服器更新時間（香港）: " : "Server updated (HKT): "}<time dateTime={updatedAt}>{formatServerTimestamp(updatedAt, locale)}</time></p> : null}
          {message ? <section className="mt-4 border-l-2 pl-4" aria-label={zh ? "最近的審核回覆" : "Latest review message"}><h3 className="font-bold">{message.title}</h3><p className="whitespace-pre-wrap text-base leading-7">{message.body}</p></section> : null}
          <div className="mt-5 flex flex-wrap gap-3">
            {post.status !== "REMOVED" ? <Link className="exchange-button-secondary" href={`${localePath(locale, "/create")}?edit=${encodeURIComponent(post.id)}`}>{zh ? "繼續編輯" : "Continue editing"}</Link> : null}
            {post.status === "PUBLISHED" ? <Link className="exchange-button-secondary" href={localePath(locale, `/posts/${post.slug}`)}>{zh ? "公開頁面" : "Public page"}</Link> : null}
          </div>
        </article>;
      })}
      {!visible.length ? <div><p>{posts.length ? (zh ? "沒有符合篩選條件的筆記。" : "No posts match this filter.") : (zh ? "你尚未建立筆記。" : "You have not created any notes yet.")}</p><Link className="exchange-button-secondary" href={localePath(locale, posts.length ? "/me/posts" : "/create")}>{posts.length ? (zh ? "顯示全部筆記" : "Show all posts") : (zh ? "寫第一篇筆記" : "Create your first note")}</Link></div> : null}
    </div>
  </div>;
}
