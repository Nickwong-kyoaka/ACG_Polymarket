"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { ArrowRight, ImagePlus, PenLine, Sparkles } from "lucide-react";
import { localePath, type PublicLocale } from "@/components/acg-locale";
import { CreatorSeriesSelector, type CreatorSeriesOption } from "@/components/creator-series-selector";
import { creatorPostStatus, formatServerTimestamp, isCreatorPostStatus, serverTimestamp } from "@/components/creator-post-status";

interface ComposerOption { id: string; slug: string; title: string; }
export interface EditablePost { id: string; kind: string; title: string; body: string; status?: string; updatedAt?: string | Date; primaryCharacterId: string | null; creatorSeriesId: string | null; sourceUrl: string | null; aiGenerated: boolean; topics: Array<{ topicId: string }>; media: Array<{ assetId: string | null; publicUrl: string | null; sourceUrl: string | null; sourceLabel: string | null; altText: string; status?: string }> }

export function PostComposer({ locale, characters, topics, initialPost, creatorSeries = [], initialCreatorSeriesId = "" }: { locale: PublicLocale; characters: ComposerOption[]; topics: ComposerOption[]; initialPost?: EditablePost; creatorSeries?: CreatorSeriesOption[]; initialCreatorSeriesId?: string }) {
  const zh = locale === "zh-Hant";
  const postId = useRef(initialPost?.id);
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
  const saving = useRef(false);
  const editVersion = useRef(0);
  const [dirty, setDirty] = useState(!initialPost);
  const [savedStatus, setSavedStatus] = useState(initialPost?.status ?? "");
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [mediaAwaitingReview, setMediaAwaitingReview] = useState(initialPost?.media.some((media) => media.status === "PENDING_REVIEW") ?? false);

  function changed() {
    editVersion.current++;
    setDirty(true);
  }

  function restoreDraft() {
    if (saving.current) return;
    try {
      const stored = localStorage.getItem(`acg-post-draft-${locale}`);
      if (!stored) {
        setResult({ message: zh ? "此瀏覽器沒有舊草稿。這裡不會自動儲存本機草稿；請使用「儲存草稿」。" : "No previous browser draft found. Local autosave is not enabled; use Save draft." });
        return;
      }
      const draft = JSON.parse(stored) as Record<string, unknown>;
      if (!draft || typeof draft !== "object" || typeof draft.title !== "string" || typeof draft.body !== "string") throw new Error("invalid local draft");
      if (typeof draft.kind === "string") setKind(draft.kind);
      if (typeof draft.title === "string") setTitle(draft.title);
      if (typeof draft.body === "string") setBody(draft.body);
      if (typeof draft.characterId === "string") setCharacterId(draft.characterId);
      if (typeof draft.topicId === "string") setTopicId(draft.topicId);
      if (typeof draft.creatorSeriesId === "string" && creatorSeries.some((series) => series.id === draft.creatorSeriesId)) setCreatorSeriesId(draft.creatorSeriesId);
      if (typeof draft.mediaUrl === "string") setMediaUrl(draft.mediaUrl);
      if (typeof draft.sourceUrl === "string") setSourceUrl(draft.sourceUrl);
      if (typeof draft.sourceLabel === "string") setSourceLabel(draft.sourceLabel);
      if (typeof draft.altText === "string") setAltText(draft.altText);
      if (typeof draft.aiGenerated === "boolean") setAiGenerated(draft.aiGenerated);
      changed();
      setResult({ message: zh ? "已匯入此瀏覽器的舊草稿，尚未儲存至伺服器。請確認內容後儲存。" : "Imported a previous browser draft. This copy is not saved to the server; review it and save." });
    } catch {
      setResult({ message: zh ? "無法讀取本機草稿，瀏覽器可能已停用儲存。現有文字未變更。" : "Could not read a browser draft. Storage may be disabled. Your current writing is unchanged." });
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
    if (saving.current || !title.trim() || !body.trim()) return;
    if (mediaUrl.trim() && (!sourceUrl.trim() || !sourceLabel.trim() || !altText.trim())) {
      setResult({ message: zh ? "加入新圖片時，請一併填寫原始來源頁、來源名稱和圖片說明。" : "New visuals need an original source page, source label, and alt text." });
      return;
    }
    saving.current = true;
    const submittedVersion = editVersion.current;
    setPending(true);
    setResult(null);
    const media = mediaUrl.trim() ? [{ publicUrl: mediaUrl.trim(), sourceUrl: sourceUrl.trim() || undefined, sourceLabel: sourceLabel.trim() || undefined, altText: altText.trim() || title.trim() }] : (initialPost?.media ?? []).map((item) => item.assetId ? { assetId: item.assetId } : { publicUrl: item.publicUrl ?? undefined, sourceUrl: item.sourceUrl ?? undefined, sourceLabel: item.sourceLabel ?? undefined, altText: item.altText });
    try {
    const response = await fetch(postId.current ? `/api/posts/${encodeURIComponent(postId.current)}` : "/api/posts", {
      method: postId.current ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ language: locale, intent, kind, title: title.trim(), body: body.trim(), primaryCharacterId: characterId || undefined, creatorSeriesId: creatorSeriesId || undefined, topicIds: topicId ? [topicId] : [], sourceUrl: sourceUrl.trim() || undefined, aiGenerated, media }),
    });
    const payload = await response.json().catch(() => ({})) as { error?: string; post?: { id?: string; slug?: string; status?: string; updatedAt?: string; createdAt?: string }; moderation?: { reason?: string }; slug?: string; status?: string };
    if (response.ok) {
      const status = payload.post?.status ?? payload.status;
      if (!payload.post?.id || !isCreatorPostStatus(status)) {
        setResult({ message: zh ? "伺服器回覆不完整，無法確認保存狀態。文字仍在，請先到工作台確認，避免重複投稿。" : "The server response was incomplete. Your text is still here. Check My posts before retrying to avoid a duplicate." });
        return;
      }
      postId.current = payload.post.id;
      setSavedStatus(status);
      const timestamp = serverTimestamp(payload.post.updatedAt ?? payload.post.createdAt);
      if (timestamp) setSavedAt(timestamp);
      setDirty(submittedVersion !== editVersion.current);
      setMediaAwaitingReview(payload.moderation?.reason === "NEW_MEDIA_REVIEW" || media.some((item) => !item.assetId));
      setResult({ message: creatorPostStatus(status, locale).label, slug: status === "PUBLISHED" ? payload.post.slug ?? payload.slug : undefined });
    } else {
      const message = response.status === 401 ? (zh ? "登入已過期。請重新登入，文字仍保留在這裡。" : "Your session expired. Sign in again; your writing is still here.")
        : response.status === 403 ? (zh ? "目前無法儲存此筆記。請查看帳號或審核通知，文字仍保留。" : "You cannot save this note right now. Check your account or review notifications. Your writing is kept here.")
        : response.status === 404 ? (zh ? "找不到原稿。文字仍保留，請到工作台確認。" : "The original draft was not found. Your writing is kept here; check My posts.")
        : response.status === 409 ? (zh ? "保存時發生衝突。文字仍保留，請到工作台確認後重試。" : "There was a save conflict. Your writing is kept here; check My posts before retrying.")
        : (zh ? "儲存失敗，文字仍保留在這裡。請檢查內容或連線後重試。" : "Save failed. Your writing is still here. Check the content or connection and retry.");
      setResult({ message });
    }
    } catch { setResult({ message: zh ? "連線中斷，文字仍留在這裡，請再試一次。" : "Connection lost. Your writing is still here; please try again." }); }
    finally { saving.current = false; setPending(false); }
  }

  return (
    <form className="post-composer creator-composer-candidate [&_button]:min-h-11 [&_button]:min-w-11 [&_a]:min-h-11" onChangeCapture={changed} onSubmit={(event) => { event.preventDefault(); void submit("SUBMIT"); }}>
      <section className="composer-main-sheet">
        <div className="composer-section-heading"><span>{zh ? "筆記內容" : "Note"}</span><h2>{zh ? "撰寫筆記" : "Write a note"}</h2></div>
        <div className="composer-kind-grid">{kinds.map((entry) => <button key={entry.value} type="button" aria-pressed={kind === entry.value} className={kind === entry.value ? "is-selected" : ""} onClick={() => { setKind(entry.value); changed(); }}>{zh ? entry.zh : entry.en}</button>)}</div>
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

      <aside className="composer-media-sheet">
        <div className="composer-section-heading"><span>{zh ? "圖片與來源" : "Visual and source"}</span><h2>{zh ? "新增圖片（選填）" : "Add an image (optional)"}</h2></div>
        <div className="composer-image-preview" style={mediaUrl.trim() ? { backgroundImage: `url(${JSON.stringify(mediaUrl.trim())})` } : undefined}>{!mediaUrl.trim() ? <><ImagePlus /><span>{zh ? "貼上公開 HTTPS 圖片網址" : "Paste a public HTTPS image URL"}</span></> : null}</div>
        <label>{zh ? "圖片網址" : "Image URL"}<input type="url" value={mediaUrl} onChange={(event) => setMediaUrl(event.target.value)} placeholder="https://…" /></label>
        <label>{zh ? "原始來源頁" : "Original source page"}<input type="url" value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} placeholder="https://…" /></label>
        {mediaUrl.trim() ? <div className="grid gap-4">
          <label>{zh ? "作者／來源名稱" : "Creator / source label"}<input value={sourceLabel} onChange={(event) => setSourceLabel(event.target.value)} maxLength={100} /></label>
          <label>{zh ? "圖片說明" : "Alt text"}<input value={altText} onChange={(event) => setAltText(event.target.value)} maxLength={180} placeholder={zh ? "描述畫面，讓更多人能讀懂" : "Describe the image so more people can read it"} /></label>
        </div> : null}
        <label className="composer-check"><input type="checkbox" checked={aiGenerated} onChange={(event) => setAiGenerated(event.target.checked)} /><span><Sparkles />{zh ? "這張圖含有 AI 生成內容" : "This visual includes AI-generated content"}</span></label>
        <p className="composer-review-note">{zh ? "新圖片須通過來源與安全審核才會公開。新創作者的前三篇筆記也須審核。儲存草稿不等於送出或發布；送出後若需審核，整篇筆記暫不公開。" : "New images need source and safety approval before public display. A new creator's first three notes also need review. Saving a draft does not submit or publish it; a submitted note stays private while review is required."}</p>
      </aside>

      <CreatorSeriesSelector series={creatorSeries} value={creatorSeriesId} onChange={setCreatorSeriesId} locale={locale} disabled={pending} />
      <footer className="composer-footer">
        <div>
          <div className="composer-save-status-candidate" role="status" aria-live="polite">
            <p><strong>{savedStatus ? creatorPostStatus(savedStatus, locale).label : (zh ? "尚未儲存至伺服器" : "Not saved to server yet")}</strong></p>
            {savedStatus ? <p>{creatorPostStatus(savedStatus, locale).explanation}</p> : null}
            {savedAt ? <p>{zh ? "上次確認的伺服器儲存時間（香港）: " : "Last confirmed server save (HKT): "}<time dateTime={savedAt}>{formatServerTimestamp(savedAt, locale)}</time></p> : <p>{zh ? "尚無已確認的儲存時間" : "No confirmed save timestamp"}</p>}
            {dirty ? <p>{zh ? "目前有未儲存的變更。" : "You have unsaved changes."}</p> : null}
            {mediaAwaitingReview ? <p>{zh ? "圖片：等待審核，尚未公開。" : "Images: awaiting review, not public."}</p> : null}
          </div>
          {result ? <p role="status">{result.message}{result.slug ? <Link href={localePath(locale, `/posts/${result.slug}`)}>{zh ? "查看筆記" : "Open note"}<ArrowRight /></Link> : null}</p> : <p><PenLine />{zh ? "使用「儲存草稿」保存至伺服器；不會自動儲存至本機。" : "Use Save draft to save to the server. There is no local autosave."}</p>}
          <Link href={localePath(locale, "/me/posts")}>{zh ? "作者工作台" : "My posts"}</Link>
        </div>
        <div><button type="button" disabled={pending} onClick={restoreDraft}>{zh ? "匯入瀏覽器舊草稿" : "Import browser draft"}</button><button type="button" disabled={pending || !title.trim() || !body.trim()} onClick={() => void submit("DRAFT")}>{zh ? "儲存草稿" : "Save draft"}</button><button type="submit" disabled={pending || !title.trim() || !body.trim()}>{pending ? (zh ? "儲存中…" : "Saving…") : (zh ? "送出筆記" : "Submit note")}</button></div>
      </footer>
    </form>
  );
}
