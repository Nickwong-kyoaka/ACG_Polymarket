import type { PublicLocale } from "@/components/acg-locale";

export const creatorPostStatuses = ["DRAFT", "PENDING_REVIEW", "HELD", "PUBLISHED", "REMOVED"] as const;
export type CreatorPostStatus = typeof creatorPostStatuses[number];

export function isCreatorPostStatus(value: unknown): value is CreatorPostStatus {
  return creatorPostStatuses.some((status) => status === value);
}

export function creatorPostStatus(status: string, locale: PublicLocale) {
  const zh = locale === "zh-Hant";
  const copy: Record<string, [string, string]> = zh ? {
    DRAFT: ["草稿已儲存", "僅你可見。編輯完成後，送出筆記以供審核或發布。"],
    PENDING_REVIEW: ["已提交，等待審核", "筆記尚未公開。審核結果會顯示在通知中。"],
    HELD: ["需要修改", "請查看審核回覆，修改原稿後重新送出。"],
    PUBLISHED: ["已發布", "公開筆記可供其他讀者查看；僅經核准的圖片會公開顯示。"],
    REMOVED: ["已移除", "筆記不再公開，也無法編輯。請查看審核通知了解原因。"],
  } : {
    DRAFT: ["Draft saved", "Only you can see this draft. Submit when ready for review or publication."],
    PENDING_REVIEW: ["Submitted, awaiting review", "Your note is not public yet. Review results appear in notifications."],
    HELD: ["Changes requested", "Read the review message, edit this draft, and submit again."],
    PUBLISHED: ["Published", "Readers can view your note. Only approved images are shown publicly."],
    REMOVED: ["Removed", "This note is no longer public and cannot be edited. Check the review notification for the reason."],
  };
  const [label, explanation] = copy[status] ?? [zh ? "狀態未確認" : "Status unconfirmed", zh ? "請重新載入工作台。" : "Reload your posts to check the status."];
  return { label, explanation };
}

export function serverTimestamp(value: unknown): string | null {
  const text = value instanceof Date ? value.toISOString() : value;
  return typeof text === "string" && Number.isFinite(Date.parse(text)) ? text : null;
}

export function formatServerTimestamp(value: string, locale: PublicLocale) {
  return new Intl.DateTimeFormat(locale === "zh-Hant" ? "zh-HK" : "en-HK", { dateStyle: "medium", timeStyle: "medium", timeZone: "Asia/Hong_Kong" }).format(new Date(value));
}
