import { localePath, stripLocale, type PublicLocale } from "@/components/acg-locale";

export interface NotificationMessage {
  title: string;
  body: string;
  type: string;
  locale?: string | null;
  metadata?: unknown;
}
type Copy = { title: string; body: string };
const object = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
const string = (value: unknown) => typeof value === "string" ? value : undefined;
const templates: Record<string, [string, string, string, string]> = {
  DAILY_REWARD: ["Daily reward claimed", "每日獎勵已領取", "Your daily SUP reward is in your wallet.", "每日 SUP 獎勵已存入錢包。"],
  AD_REWARD: ["Ad reward received", "廣告獎勵已領取", "Your ad reward is in your wallet.", "廣告 SUP 獎勵已存入錢包。"],
  MISSION_REWARD: ["Mission reward claimed", "任務獎勵已領取", "Your mission reward is in your wallet.", "任務 SUP 獎勵已存入錢包。"],
  WORK_REWARD: ["Part-time shift complete", "打工完成", "Your shift reward is in your wallet.", "打工 SUP 獎勵已存入錢包。"],
  COSMETIC_UNLOCKED: ["Cosmetic unlocked", "外觀已解鎖", "A new cosmetic is in your locker.", "新外觀已加入收藏櫃。"],
  POST_APPROVED: ["Post approved", "投稿已通過", "Your post is now part of the community feed.", "你的投稿已加入社群動態。"],
  POST_CHANGES: ["Post needs changes", "投稿需要修改", "Open the creator desk for review details.", "請前往創作桌查看審核詳情。"],
  POST_REJECTED: ["Post not published", "投稿未獲刊登", "Open the creator desk for review details.", "請前往創作桌查看審核詳情。"],
  PROPOSAL_APPROVED: ["Proposal approved", "修訂建議已通過", "Your sourced catalog edit is now live.", "你附有來源的資料修訂已公開。"],
  PROPOSAL_CHANGES: ["Changes requested", "修訂建議需要修改", "Open your proposal to read the review.", "請打開修訂建議查看審核詳情。"],
  PROPOSAL_REJECTED: ["Proposal not accepted", "修訂建議未獲接納", "Open your proposal to read the review.", "請打開修訂建議查看審核詳情。"],
  REPORT_REVIEWED: ["Report reviewed", "檢舉已審閱", "Your report was reviewed and moderation action was taken.", "你的檢舉已審閱，並已採取管理措施。"],
  CONTENT_REMOVED: ["Content removed", "內容已移除", "Open your room to read the moderation decision.", "請打開房間查看管理決定。"],
  COMMUNITY_WARNING: ["Community warning", "社群提醒", "Open your room to read the moderation decision.", "請打開房間查看管理決定。"],
  CREATOR_SUSPENDED: ["Creator publishing suspended", "創作者刊登權限已暫停", "Open your room to read the moderation decision.", "請打開房間查看管理決定。"],
  NEW_POST: ["A new note reached your shelf", "書架上有一篇新筆記", "Open the new note from your follows.", "打開你關注對象的新筆記。"],
  PREDICTION_ADDED: ["Prediction added", "已加入預測", "Your prediction position was updated.", "你的預測持有已更新。"],
  PREDICTION_REDUCED: ["Prediction reduced", "已減少預測持有", "Your prediction position was updated.", "你的預測持有已更新。"],
  PREDICTION_CLOSING: ["Prediction closing soon", "預測即將截止", "Open the prediction to check its closing time.", "請打開預測查看截止時間。"],
  CHALLENGE_ACCEPTED: ["Prediction challenge accepted", "預測異議已獲接納", "Your prediction challenge was reviewed.", "你的預測異議已完成審閱。"],
  CHALLENGE_REJECTED: ["Prediction challenge rejected", "預測異議未獲接納", "Your prediction challenge was reviewed.", "你的預測異議已完成審閱。"],
  PREDICTION_RESOLVED: ["Prediction resolved", "預測已結算", "Open the prediction to read its resolution.", "請打開預測查看結算結果。"],
  SUPPORT_TRADE: ["Support trade completed", "應援紀錄已更新", "Your support collection was updated.", "你的應援收藏已更新。"],
};
const generatedBodies = new Set(Object.values(templates).flatMap((entry) => [entry[2], entry[3]]).concat([
  "Your report was reviewed and dismissed.",
]));

export function localizeNotification(item: NotificationMessage, locale: PublicLocale): Copy {
  const zh = locale === "zh-Hant";
  const meta = object(item.metadata);
  const localized = object(object(meta.localized)[locale] ?? object(meta.copy)[locale]);
  if (string(localized.title) && string(localized.body)) return { title: localized.title as string, body: localized.body as string };
  let key = string(meta.template) ?? string(meta.templateKey);
  if (!key || !templates[key]) key = Object.keys(templates).find((candidate) => templates[candidate].slice(0, 2).includes(item.title));
  if (!key && meta.kind === "prediction-closing") key = "PREDICTION_CLOSING";
  if (!key && meta.postId && meta.decision) key = meta.decision === "APPROVE" ? "POST_APPROVED" : meta.decision === "REQUEST_CHANGES" ? "POST_CHANGES" : "POST_REJECTED";
  if (!key && /^(Supported|Trimmed) /.test(item.title)) key = "SUPPORT_TRADE";
  if (key && templates[key]) {
    const template = templates[key];
    let title = template[zh ? 1 : 0];
    let body = template[zh ? 3 : 2];
    if (["DAILY_REWARD", "AD_REWARD", "MISSION_REWARD", "WORK_REWARD"].includes(key)) {
      const amount = Number(meta.amount ?? meta.reward ?? item.body.match(/(?:received|picked up)\s+(\d+)\s+SUP/i)?.[1]);
      if (Number.isFinite(amount) && amount >= 0) body = zh ? `你已收到 ${amount} SUP，獎勵已存入錢包。` : `You received ${amount} SUP. Your reward is in your wallet.`;
    }
    if (key === "COSMETIC_UNLOCKED") {
      const itemTitle = string(meta.itemTitle) ?? item.body.match(/^(.+) is now in your locker\.$/)?.[1];
      if (itemTitle) body = zh ? `「${itemTitle}」已加入收藏櫃。` : `${itemTitle} is now in your locker.`;
    }
    if (key === "REPORT_REVIEWED" && (meta.decision === "DISMISS" || item.body === "Your report was reviewed and dismissed.")) body = zh ? "你的檢舉已審閱，決定不採取管理措施。" : "Your report was reviewed and dismissed.";
    if (key === "NEW_POST") body = string(meta.postTitle) ?? item.body;
    if (key.startsWith("POST_") || key.startsWith("PROPOSAL_") || ["CONTENT_REMOVED", "COMMUNITY_WARNING", "CREATOR_SUSPENDED", "CHALLENGE_ACCEPTED", "CHALLENGE_REJECTED"].includes(key)) {
      const note = string(meta.note) ?? string(meta.reasoning) ?? (!generatedBodies.has(item.body) ? item.body : undefined);
      if (note) body += `\n${note}`;
    }
    if (key === "PREDICTION_CLOSING" && string(meta.closesAt)) {
      const closesAt = new Date(meta.closesAt as string);
      if (Number.isFinite(closesAt.getTime())) body = (zh ? "交易截止時間：" : "Trading closes: ") + new Intl.DateTimeFormat(zh ? "zh-HK" : "en-HK", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Hong_Kong" }).format(closesAt);
    }
    if (key === "SUPPORT_TRADE") {
      const name = string(meta.characterName) ?? item.title.match(/^(?:Supported|Trimmed) (.+)$/)?.[1];
      if (name) title = zh ? `「${name}」的應援紀錄已更新` : `${name} support updated`;
      const match = item.body.match(/You (added|sold) (\d+) support units? for (\d+) SUP\./);
      if (match) body = zh ? `已${match[1] === "added" ? "加入" : "減少"} ${match[2]} 份應援，共 ${match[3]} SUP。` : item.body;
    }
    return { title, body };
  }
  if (item.locale === locale || item.locale === (zh ? "ZH_HANT" : "EN")) return { title: item.title, body: item.body };
  return {
    title: zh ? "房間有新消息" : "A new room update",
    body: meta.bodyIsUserContent === true ? item.body : zh ? "打開相關內容查看詳情。" : "Open the related content for details.",
  };
}

export function notificationHref(href: string | null | undefined, locale: PublicLocale) {
  if (!href || !href.startsWith("/") || href.startsWith("//") || /[\\\u0000-\u0020]/.test(href)) return null;
  const path = stripLocale(href.split(/[?#]/)[0]);
  if (path.startsWith("/api") || path.startsWith("/admin") || path.includes("..")) return null;
  return localePath(locale, stripLocale(href));
}
