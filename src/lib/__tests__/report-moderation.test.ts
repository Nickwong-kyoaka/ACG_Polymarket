import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  transaction: vi.fn(), reportRead: vi.fn(), reportWrite: vi.fn(), post: vi.fn(), comment: vi.fn(), creator: vi.fn(), trust: vi.fn(), notification: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({ prisma: { $transaction: mocks.transaction } }));
import { decideReport } from "@/lib/report-moderation";
const report = { id: "report-1", userId: "reporter", postId: "post-1", commentId: null, characterId: null, status: "OPEN", resolution: null, createdAt: new Date(), post: { id: "post-1", slug: "post", authorId: "creator", title: "Title", body: "Body", language: "EN", status: "PUBLISHED" }, comment: null, character: null };

describe("persistent report decisions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.reportRead.mockResolvedValue(report);
    mocks.reportWrite.mockResolvedValue({ count: 1 });
    mocks.transaction.mockImplementation(async (work) => work({ report: { findUnique: mocks.reportRead, updateMany: mocks.reportWrite }, post: { update: mocks.post }, comment: { update: mocks.comment }, creatorProfile: { upsert: mocks.creator }, contributorTrustEvent: { create: mocks.trust }, notification: { create: mocks.notification } }));
  });

  it("removes the reported post, persists actor/note, and notifies both parties", async () => {
    const result = await decideReport("admin", report.id, { decision: "REMOVE", note: "Violates the community safety policy." });
    expect(result).toMatchObject({ replayed: false, report: { status: "RESOLVED" } });
    expect(mocks.post).toHaveBeenCalledWith({ where: { id: "post-1" }, data: { status: "REMOVED", publishedAt: null } });
    expect(JSON.parse(result.report.resolution!)).toMatchObject({ decision: "REMOVE", actorUserId: "admin", note: "Violates the community safety policy." });
    expect(mocks.trust).toHaveBeenCalledWith({ data: expect.objectContaining({ userId: "creator", actorUserId: "admin", kind: "MODERATION_ACTION", referenceId: report.id, points: -3 }) });
    expect(mocks.notification).toHaveBeenCalledTimes(2);
  });

  it("targets a comment rather than its contextual post, and suspends the comment author", async () => {
    mocks.reportRead.mockResolvedValue({ ...report, commentId: "comment-1", comment: { id: "comment-1", userId: "commenter" } });
    await decideReport("admin", report.id, { decision: "SUSPEND", note: "Repeated harassment and abuse." });
    expect(mocks.comment).toHaveBeenCalledWith({ where: { id: "comment-1" }, data: { status: "REMOVED" } });
    expect(mocks.post).not.toHaveBeenCalled();
    expect(mocks.creator).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: "commenter" }, update: { status: "SUSPENDED" } }));
  });

  it("warns without removing content and dismisses without penalizing its creator", async () => {
    await decideReport("admin", report.id, { decision: "WARN", note: "Please follow the sourcing policy." });
    expect(mocks.post).not.toHaveBeenCalled();
    expect(mocks.trust).toHaveBeenLastCalledWith({ data: expect.objectContaining({ points: -1 }) });
    await decideReport("admin", report.id, { decision: "DISMISS", note: "No policy violation was found." });
    expect(mocks.reportWrite).toHaveBeenLastCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "DISMISSED" }) }));
    expect(mocks.trust).toHaveBeenLastCalledWith({ data: expect.objectContaining({ points: 0 }) });
    expect(mocks.post).not.toHaveBeenCalled();
  });

  it("replays an identical decision without duplicate actions, audits, or notifications", async () => {
    const input = { decision: "WARN" as const, note: "Please follow the sourcing policy." };
    mocks.reportRead.mockResolvedValue({ ...report, status: "RESOLVED", resolution: JSON.stringify(input) });
    expect(await decideReport("admin", report.id, input)).toMatchObject({ replayed: true });
    expect(mocks.reportWrite).not.toHaveBeenCalled();
    expect(mocks.trust).not.toHaveBeenCalled();
    expect(mocks.notification).not.toHaveBeenCalled();
    await expect(decideReport("admin", report.id, { ...input, decision: "REMOVE" })).rejects.toMatchObject({ code: "REPORT_CLOSED" });
  });

  it("does not act after losing the atomic claim to another moderator", async () => {
    mocks.reportWrite.mockResolvedValue({ count: 0 });
    await expect(decideReport("admin", report.id, { decision: "REMOVE", note: "Violates the safety policy." })).rejects.toMatchObject({ code: "REPORT_CLOSED" });
    expect(mocks.post).not.toHaveBeenCalled();
    expect(mocks.trust).not.toHaveBeenCalled();
  });

  it("never mistakes the reporter for a missing target's creator", async () => {
    mocks.reportRead.mockResolvedValue({ ...report, post: null });
    await expect(decideReport("admin", report.id, { decision: "SUSPEND", note: "Repeated policy violation." })).rejects.toMatchObject({ code: "REPORT_CREATOR_MISSING" });
    expect(mocks.creator).not.toHaveBeenCalled();
    expect(mocks.reportWrite).not.toHaveBeenCalled();
  });
});
