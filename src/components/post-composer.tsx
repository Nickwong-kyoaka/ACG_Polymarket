"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, ImagePlus, PenLine, Sparkles } from "lucide-react";
import { localePath, type PublicLocale } from "@/components/acg-locale";
import { CreatorSeriesSelector, type CreatorSeriesOption } from "@/components/creator-series-selector";

interface ComposerOption { id: string; slug: string; title: string; }
export interface EditablePost { id: string; kind: string; title: string; body: string; primaryCharacterId: string | null; creatorSeriesId: string | null; sourceUrl: string | null; aiGenerated: boolean; topics: Array<{ topicId: string }>; media: Array<{ assetId: string | null; publicUrl: string | null; sourceUrl: string | null; sourceLabel: string | null; altText: string }> }

export function PostComposer({ locale, characters, topics, initialPost, creatorSeries = [], initialCreatorSeriesId = "" }: { locale: PublicLocale; characters: ComposerOption[]; topics: ComposerOption[]; initialPost?: EditablePost; creatorSeries?: CreatorSeriesOption[]; initialCreatorSeriesId?: string }) {
  const zh = locale === "zh-Hant";
  const [postId, setPostId] = useState(initialPost?.id);
  const [kind, setKind] = useState(initialPost?.kind ?? "NOTE");
  const [title, setTitle] = useState(initialPost?.title ?? "");
  const [body, setBody] = useState(initialPost?.body ?? "");
  const [characterId, setCharacterId] = useState(initialPost?.primaryCharacterId ?? "");
  const [topicId, setTopicId] = useState(initialPost?.topics[0]?.topicId ?? "");
  const [creatorSeriesId, setCreatorSeriesId] = useState(initialPost?.creatorSeriesId ?? initialCreatorSeriesId);
  const [mediaUrl, setMediaUrl] = useState("");
  const [sourceUrl, setSourceUrl] = useState(initialPost?.sourceUrl ?? "");
  const [sourceLabel, setSourceLabel] = useState("");
  const [altText, setAltText] = useState("");
  const [aiGenerated, setAiGenerated] = useState(initialPost?.aiGenerated ?? false);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<{ message: string; slug?: string } | null>(null);

  function restoreDraft() {
    const stored = localStorage.getItem(`acg-post-draft-${locale}`);
    if (!stored) {
      setResult({ message: zh ? "這個瀏覽器還沒有保存草稿。" : "There is no saved draft in this browser yet." });
      return;
    }
    try {
      const draft = JSON.parse(stored) as Record<string, unknown>;
      if (typeof draft.kind === "string") setKind(draft.kind);
      if (typeof draft.title === "string") setTitle(draft.title);
      if (typeof draft.body === "string") setBody(draft.body);
      if (typeof draft.characterId === "string") setCharacterId(draft.characterId);
      if (typeof draft.topicId === "string") setTopicId(draft.topicId);
      if (typeof draft.mediaUrl === "string") setMediaUrl(draft.mediaUrl);
      if (typeof draft.sourceUrl === "string") setSourceUrl(draft.sourceUrl);
      if (typeof draft.sourceLabel === "string") setSourceLabel(draft.sourceLabel);
      if (typeof draft.altText === "string") setAltText(draft.altText);
      if (typeof draft.aiGenerated === "boolean") setAiGenerated(draft.aiGenerated);
      setResult({ message: zh ? "已從這個瀏覽器找回上次的草稿。" : "Your last local draft is back on the desk." });
    } catch {
      localStorage.removeItem(`acg-post-draft-${locale}`);
      setResult({ message: zh ? "舊草稿無法讀取，已替你清理。" : "The old draft could not be read and was cleared." });
    }
  }

  const kinds = [
    { value: "NOTE", en: "Character note", zh: "角色手帳" },
    { value: "OUTFIT", en: "Outfit", zh: "衣裝筆記" },
    { value: "COMIC", en: "Comic", zh: "漫畫小頁" },
    { value: "VOICE", en: "Voice", zh: "語音片段" },
    { value: "GUIDE", en: "Lore guide", zh: "角色考據" },
    { value: "PREDICTION_TAKE", en: "Prediction take", zh: "預測觀察" },
  ];

  async function submit(intent: "DRAFT" | "SUBMIT" = "SUBMIT") {
    if (pending) return;
    if (mediaUrl.trim() && (!sourceUrl.trim() || !sourceLabel.trim() || !altText.trim())) {
      setResult({ message: zh ? "加入新圖片時，請一併填寫原始來源頁、來源名稱和圖片說明。" : "New visuals need an original source page, source label, and alt text." });
      return;
    }
    setPending(true);
    setResult(null);
    const media = mediaUrl.trim() ? [{ publicUrl: mediaUrl.trim(), sourceUrl: sourceUrl.trim() || undefined, sourceLabel: sourceLabel.trim() || undefined, altText: altText.trim() || title.trim() }] : (initialPost?.media ?? []).map((item) => item.assetId ? { assetId: item.assetId } : { publicUrl: item.publicUrl ?? undefined, sourceUrl: item.sourceUrl ?? undefined, sourceLabel: item.sourceLabel ?? undefined, altText: item.altText });
    try {
    const response = await fetch(postId ? `/api/posts/${postId}` : "/api/posts", {
      method: postId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ language: locale, intent, kind, title: title.trim(), body: body.trim(), primaryCharacterId: characterId || undefined, creatorSeriesId: creatorSeriesId || undefined, topicIds: topicId ? [topicId] : [], sourceUrl: sourceUrl.trim() || undefined, aiGenerated, media }),
    });
    const payload = await response.json().catch(() => ({})) as { error?: string; post?: { id?: string; slug?: string; status?: string }; slug?: string; status?: string };
    if (response.ok) {
      if (payload.post?.id) setPostId(payload.post.id);
      const status = payload.post?.status ?? payload.status;
      setResult({ message: status === "DRAFT" ? (zh ? "草稿已存入你的作者工作台。" : "Draft saved to your creator desk.") : status === "PUBLISHED" ? (zh ? "筆記已放上社群桌面。" : "Your note is now on the clubroom table.") : (zh ? "筆記已送到編輯桌，審核後會出現在社群。" : "Your note reached the editorial desk and will appear after review."), slug: status === "PUBLISHED" ? payload.post?.slug ?? payload.slug : undefined });
    } else {
      setResult({ message: response.status === 401 ? (zh ? "登入後就能保存這篇筆記。" : "Sign in to keep this note.") : payload.error ?? (zh ? "編輯桌暫時沒有收到，請再試一次。" : "The editorial desk did not receive this. Please try again.") });
    }
    } catch { setResult({ message: zh ? "連線中斷，文字仍留在這裡，請再試一次。" : "Connection lost. Your writing is still here; please try again." }); }
    finally { setPending(false); }
  }

  return (
    <form className="post-composer" onSubmit={(event) => { event.preventDefault(); void submit("SUBMIT"); }}>
      <section className="composer-main-sheet">
        <div className="composer-section-heading"><span>01 / NOTE</span><h2>{zh ? "今天想留下哪一頁？" : "Which page do you want to leave today?"}</h2></div>
        <div className="composer-kind-grid">{kinds.map((entry) => <button key={entry.value} type="button" aria-pressed={kind === entry.value} className={kind === entry.value ? "is-selected" : ""} onClick={() => setKind(entry.value)}>{zh ? entry.zh : entry.en}</button>)}</div>
        <label>{zh ? "標題" : "Title"}<input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={120} required placeholder={zh ? "例如：這套衣裝讓我想到夏天的傍晚" : "For example: this outfit feels like a summer evening"} /></label>
        <label>
          <span id="post-body-label">{zh ? "內文" : "Note"}</span>
          <textarea aria-labelledby="post-body-label" aria-describedby="post-body-count" value={body} onChange={(event) => setBody(event.target.value)} maxLength={10000} rows={9} required placeholder={zh ? "寫下你留意到的細節、感受，或可以查閱的資料……" : "Write down the details, feeling, or source you want others to discover…"} />
          <small id="post-body-count">{body.length}/10000</small>
        </label>
        <div className="composer-row">
          <label>{zh ? "主要角色" : "Main character"}<select value={characterId} onChange={(event) => setCharacterId(event.target.value)}><option value="">{zh ? "不指定" : "Not attached"}</option>{characters.map((entry) => <option key={entry.id} value={entry.id}>{entry.title}</option>)}</select></label>
          <label>{zh ? "話題" : "Topic"}<select value={topicId} onChange={(event) => setTopicId(event.target.value)}><option value="">{zh ? "選一個話題" : "Choose a topic"}</option>{topics.map((entry) => <option key={entry.id} value={entry.id}>{entry.title}</option>)}</select></label>
        </div>
      </section>

      <aside className="composer-media-sheet"><div className="composer-section-heading"><span>02 / VISUAL</span><h2>{zh ? "替這頁配一張圖" : "Give this page a visual"}</h2></div><div className="composer-image-preview" style={mediaUrl.trim() ? { backgroundImage: `url(${JSON.stringify(mediaUrl.trim())})` } : undefined}>{!mediaUrl.trim() ? <><ImagePlus /><span>{zh ? "貼上公開 HTTPS 圖片網址" : "Paste a public HTTPS image URL"}</span></> : null}</div><label>{zh ? "圖片網址" : "Image URL"}<input type="url" value={mediaUrl} onChange={(event) => setMediaUrl(event.target.value)} placeholder="https://…" /></label><label>{zh ? "原始來源頁" : "Original source page"}<input type="url" value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} placeholder="https://…" /></label><label>{zh ? "作者／來源名稱" : "Creator / source label"}<input value={sourceLabel} onChange={(event) => setSourceLabel(event.target.value)} maxLength={100} /></label><label>{zh ? "圖片說明" : "Alt text"}<input value={altText} onChange={(event) => setAltText(event.target.value)} maxLength={180} placeholder={zh ? "描述畫面，讓更多人能讀懂" : "Describe the image so more people can read it"} /></label><label className="composer-check"><input type="checkbox" checked={aiGenerated} onChange={(event) => setAiGenerated(event.target.checked)} /><span><Sparkles />{zh ? "這張圖含有 AI 生成內容" : "This visual includes AI-generated content"}</span></label><p className="composer-review-note">{zh ? "新圖片會先到素材桌檢查來源與安全標記；文字不會因此消失。新創作者的前三篇筆記也會先經過一次輕量審核。" : "New visuals visit the media desk for source and safety checks first; your writing stays intact. A new creator's first three notes also receive a light review."}</p></aside>

      <CreatorSeriesSelector series={creatorSeries} value={creatorSeriesId} onChange={setCreatorSeriesId} locale={locale} disabled={pending} />
      <footer className="composer-footer">
        <div>{result ? <p role="status">{result.message}{result.slug ? <Link href={localePath(locale, `/posts/${result.slug}`)}>{zh ? "查看筆記" : "Open note"}<ArrowRight /></Link> : null}</p> : <p><PenLine />{zh ? "寫真實、具體、值得收藏的一小頁就很好。" : "A specific, sincere little page is more than enough."}</p>}<Link href={localePath(locale, "/me/posts")}>{zh ? "作者工作台" : "My creator desk"}</Link></div>
        <div><button type="button" onClick={restoreDraft}>{zh ? "找回本機草稿" : "Restore local draft"}</button><button type="button" disabled={pending || !title.trim() || !body.trim()} onClick={() => void submit("DRAFT")}>{zh ? "存到工作台" : "Save draft"}</button><button type="submit" disabled={pending || !title.trim() || !body.trim()}>{pending ? (zh ? "儲存中…" : "Saving…") : (zh ? "送出筆記" : "Submit note")}</button></div>
      </footer>
    </form>
  );
}
