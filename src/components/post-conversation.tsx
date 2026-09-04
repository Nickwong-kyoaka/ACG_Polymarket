"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Flag, Heart, LoaderCircle, MessageCircle, Pin, Reply } from "lucide-react";
import { localePath, type PublicLocale } from "@/components/acg-locale";

export interface PostComment {
  id: string;
  content: string;
  createdAt: string;
  pinnedByAuthor: boolean;
  heartedByAuthor: boolean;
  author: { displayName: string; handle: string };
  replies?: PostComment[];
}

function dateLabel(value: string, locale: PublicLocale) {
  const date = new Date(value);
  return new Intl.DateTimeFormat(locale === "zh-Hant" ? "zh-HK" : "en-HK", { timeZone: "Asia/Hong_Kong", month: "short", day: "numeric", year: "numeric" }).format(date);
}

export function PostConversation({ postId, predictionMarketId, initialComments, locale, signedIn, canModerate, context = "post" }: { postId?: string; predictionMarketId?: string; initialComments: PostComment[]; locale: PublicLocale; signedIn: boolean; canModerate: boolean; context?: "post" | "prediction" }) {
  const zh = locale === "zh-Hant";
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [content, setContent] = useState("");
  const [replyTo, setReplyTo] = useState<PostComment | null>(null);
  const [status, setStatus] = useState("");

  async function submitComment() {
    setStatus("");
    const response = await fetch("/api/comments", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...(predictionMarketId ? { predictionMarketId } : { postId }), parentId: replyTo?.id, content }),
    });
    const payload = await response.json() as { error?: string; comment?: { status?: string } };
    if (!response.ok) {
      setStatus(payload.error ?? (zh ? "便條暫時沒有送出。" : "The note did not post yet."));
      return;
    }
    setContent("");
    setReplyTo(null);
    setStatus(payload.comment?.status === "HELD" ? (zh ? "便條已送到審核桌。" : "The note is waiting at the review desk.") : (zh ? "便條已放到桌上。" : "Your note is on the table."));
    startTransition(() => router.refresh());
  }

  async function report(commentId: string) {
    const response = await fetch("/api/reports", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ commentId, reason: "Community safety review" }) });
    setStatus(response.ok ? (zh ? "已送到管理員的審核桌。" : "Sent to the moderation desk.") : (zh ? "暫時未能送出檢舉。" : "The report could not be sent."));
  }

  async function mark(commentId: string, action: "PIN" | "HEART") {
    const response = await fetch(`/api/comments/${encodeURIComponent(commentId)}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ action }) });
    setStatus(response.ok ? (zh ? "作者標記已更新。" : "Author mark updated.") : (zh ? "標記暫時未更新。" : "The mark did not update."));
    if (response.ok) startTransition(() => router.refresh());
  }

  function CommentRow({ comment, reply = false }: { comment: PostComment; reply?: boolean }) {
    return <article className={reply ? "ml-8 border-l border-[#2c2724]/20 pl-4" : ""}>
      <span className="social-avatar">{comment.author.displayName.charAt(0)}</span>
      <div>
        <header><strong>{comment.author.displayName}</strong><small>@{comment.author.handle} · {dateLabel(comment.createdAt, locale)}</small>{comment.pinnedByAuthor ? <em>{zh ? "作者置頂" : "Pinned"}</em> : null}</header>
        <p>{comment.content}</p>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-[10px] font-black text-[#8a746c]">
          {!reply && signedIn ? <button type="button" onClick={() => { setReplyTo(comment); setContent(""); }} className="inline-flex items-center gap-1 hover:text-[#a15154]"><Reply className="h-3.5 w-3.5" />{zh ? "回覆" : "Reply"}</button> : null}
          <button type="button" onClick={() => report(comment.id)} className="inline-flex items-center gap-1 hover:text-[#a15154]"><Flag className="h-3.5 w-3.5" />{zh ? "檢舉" : "Report"}</button>
          {canModerate ? <button type="button" onClick={() => mark(comment.id, "PIN")} className="inline-flex items-center gap-1 hover:text-[#a15154]"><Pin className="h-3.5 w-3.5" />{zh ? "置頂" : "Pin"}</button> : null}
          {canModerate ? <button type="button" onClick={() => mark(comment.id, "HEART")} className="inline-flex items-center gap-1 hover:text-[#a15154]"><Heart className="h-3.5 w-3.5" />{zh ? "作者愛心" : "Author heart"}</button> : null}
        </div>
        {comment.heartedByAuthor ? <span className="author-heart"><Heart />{zh ? "作者喜歡" : "Loved by author"}</span> : null}
        {comment.replies?.length ? <div className="mt-4 grid gap-4">{comment.replies.map((child) => <CommentRow key={child.id} comment={child} reply />)}</div> : null}
      </div>
    </article>;
  }

  return (
    <section id="conversation" className="post-conversation">
      <div className="post-section-heading"><span>CONVERSATION</span><h2>{context === "prediction" ? (zh ? "圍著這張觀測票的討論" : "Notes around this prediction") : (zh ? "圍著這一頁的留言" : "Notes gathered around this page")}</h2><p>{context === "prediction" ? (zh ? "交換來源、時間線與不同判斷，讓每一次選擇都有脈絡。" : "Compare sources, timelines, and different reads so every choice keeps its context.") : (zh ? "看看大家留意到的細節，也把自己的想法放在頁邊。" : "Browse the details other readers noticed, then leave your own thought in the margin.")}</p></div>
      {signedIn ? <div className="mb-8 border border-[#2c2724]/20 bg-[#fffaf4] p-4 sm:p-5">
        {replyTo ? <div className="mb-3 flex items-center justify-between gap-3 border-l-3 border-[#c85d5a] bg-[#f3e8de] px-3 py-2 text-xs"><span>{zh ? `回覆 @${replyTo.author.handle}` : `Replying to @${replyTo.author.handle}`}</span><button type="button" onClick={() => setReplyTo(null)} className="font-black">×</button></div> : null}
        <textarea value={content} onChange={(event) => setContent(event.target.value)} rows={4} maxLength={280} placeholder={zh ? "把留意到的細節寫在這裡…" : "Leave the detail you noticed here…"} className="filter-field resize-y" />
        <div className="mt-3 flex items-center justify-between gap-4"><span className="text-[10px] font-bold text-[#8a8179]">{content.length}/280 · {zh ? "每 15 秒一則" : "one note per 15s"}</span><button type="button" disabled={pending || content.trim().length < 3} onClick={submitComment} className="exchange-button-primary py-2 disabled:opacity-45">{pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}{replyTo ? (zh ? "送出回覆" : "Post reply") : (zh ? "放上便條" : "Post note")}</button></div>
        {status ? <p role="status" className="mt-3 text-xs font-bold text-[#8a4e4e]">{status}</p> : null}
      </div> : <div className="mb-8 border-l-4 border-[#d59b42] bg-[#fffaf4] p-5"><p className="font-display text-xl">{zh ? "登入後，在頁邊留一張便條。" : "Sign in to leave a note in the margin."}</p><Link href={localePath(locale, "/onboarding")} className="mt-3 inline-flex items-center gap-2 text-xs font-black text-[#9a4c4a]">{zh ? "打開我的房間" : "Open my room"}</Link></div>}
      <div className="conversation-list">{initialComments.length ? initialComments.map((comment) => <CommentRow key={comment.id} comment={comment} />) : <div className="conversation-empty"><MessageCircle /><p>{zh ? "這一頁還沒有便條，先把它收藏起來，晚點再回來看看。" : "No notes have gathered here yet. Save the page and return when the table gets busier."}</p></div>}</div>
    </section>
  );
}
