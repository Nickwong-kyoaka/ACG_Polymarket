import { describe, expect, it } from "vitest";
import { localizeNotification, notificationHref } from "@/lib/notification-copy";

describe("notification language templates", () => {
  it.each([
    ["Daily reward claimed", "每日獎勵已領取"], ["Ad reward received", "廣告獎勵已領取"],
    ["Mission reward claimed", "任務獎勵已領取"], ["Part-time shift complete", "打工完成"],
  ])("localizes legacy reward title and body: %s", (title, translated) => {
    const copy = localizeNotification({ title, body: "You received 30 SUP.", type: "REWARD" }, "zh-Hant");
    expect(copy).toEqual({ title: translated, body: "你已收到 30 SUP，獎勵已存入錢包。" });
  });
  it("prefers locale-specific metadata and handles metadata-only templates", () => {
    expect(localizeNotification({ title: "Wrong English", body: "Wrong English", type: "REWARD", metadata: { localized: { "zh-Hant": { title: "今日獎勵", body: "已放進房間" } } } }, "zh-Hant")).toEqual({ title: "今日獎勵", body: "已放進房間" });
    expect(localizeNotification({ title: "Unknown", body: "Unknown", type: "REWARD", metadata: { template: "WORK_REWARD", amount: 60 } }, "zh-Hant").body).toContain("60 SUP");
  });
  it.each(["Post approved", "Post needs changes", "Post not published", "Proposal approved", "Changes requested", "Proposal not accepted", "Report reviewed"])("localizes generated review messages: %s", (title) => {
    const copy = localizeNotification({ title, body: "Open the creator desk for review details.", type: "SOCIAL" }, "zh-Hant");
    expect(copy.title).not.toBe(title);
    expect(copy.body).not.toContain("Open the creator desk");
  });
  it("retains actual reviewer notes and user-authored titles without preserving generated English wrappers", () => {
    const copy = localizeNotification({ title: "Post needs changes", body: "Please add the original source link.", type: "SOCIAL", metadata: { postId: "post", decision: "REQUEST_CHANGES" } }, "zh-Hant");
    expect(copy.title).toBe("投稿需要修改");
    expect(copy.body).toContain("請前往創作桌查看審核詳情。");
    expect(copy.body).toContain("Please add the original source link.");
    expect(localizeNotification({ title: "A new note reached your shelf", body: "My English fan essay", type: "SOCIAL" }, "zh-Hant")).toEqual({ title: "書架上有一篇新筆記", body: "My English fan essay" });
  });
  it("can render English from a known Chinese stored title and does not leak unknown English system copy", () => {
    expect(localizeNotification({ title: "每日獎勵已領取", body: "已存入錢包", type: "REWARD" }, "en").title).toBe("Daily reward claimed");
    const unknown = localizeNotification({ title: "Internal English system text", body: "English system body", type: "SYSTEM" }, "zh-Hant");
    expect(unknown).toEqual({ title: "房間有新消息", body: "打開相關內容查看詳情。" });
  });
  it("localizes closing times and report decisions without copying generated bodies", () => {
    const closing = localizeNotification({ title: "Prediction closing soon", body: "Trading closes at English date", type: "SYSTEM", metadata: { closesAt: "2026-11-04T12:00:00.000Z" } }, "zh-Hant");
    expect(closing.body).toContain("交易截止時間：");
    expect(closing.body).not.toContain("Trading closes");
    expect(localizeNotification({ title: "Report reviewed", body: "Your report was reviewed and dismissed.", type: "SYSTEM", metadata: { decision: "DISMISS" } }, "zh-Hant").body).toBe("你的檢舉已審閱，決定不採取管理措施。");
  });
  it("localizes cross-locale links but rejects external, script, API and traversal destinations", () => {
    expect(notificationHref("/en/me/posts?post=123", "zh-Hant")).toBe("/zh-Hant/me/posts?post=123");
    for (const href of ["https://evil.invalid", "//evil.invalid", "javascript:alert(1)", "/\\evil.invalid", "/api/auth", "/admin/posts", "/me/../admin"]) expect(notificationHref(href, "en")).toBeNull();
  });
});
