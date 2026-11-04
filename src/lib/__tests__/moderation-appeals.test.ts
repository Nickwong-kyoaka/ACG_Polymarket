import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ findReport: vi.fn(), upsert: vi.fn(), event: vi.fn(), transaction: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { report: { findFirst: mocks.findReport }, contributorTrustEvent: { upsert: mocks.upsert }, $transaction: mocks.transaction } }));
import { decideModerationAppeal, submitModerationAppeal } from "@/lib/moderation-appeals";

beforeEach(() => { vi.clearAllMocks(); mocks.transaction.mockImplementation((operation) => operation({ contributorTrustEvent: { findUnique: mocks.event } })); });
describe("moderation appeals", () => {
  it("does not allow unrelated members to appeal another user's decision", async () => {
    mocks.findReport.mockResolvedValue(null);
    await expect(submitModerationAppeal("other", "report-1", "Please review this decision with the additional context.")).rejects.toMatchObject({ status: 404 });
    expect(mocks.upsert).not.toHaveBeenCalled();
    expect(mocks.findReport.mock.calls[0][0].where.OR).toContainEqual({ commentId: null, post: { is: { authorId: "other" } } });
  });
  it("deduplicates a member's appeal without awarding SUP or trust points", async () => {
    mocks.findReport.mockResolvedValue({ id: "report-1" }); mocks.upsert.mockResolvedValue({ id: "appeal:report-1:owner" });
    await expect(submitModerationAppeal("owner", "report-1", "Here is the missing context for this moderation decision.")).resolves.toMatchObject({ submitted: true });
    expect(mocks.upsert).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "appeal:report-1:owner" }, update: {}, create: expect.objectContaining({ userId: "owner", points: 0 }) }));
  });
  it("requires a reviewer distinct from the affected member", async () => {
    mocks.event.mockResolvedValue({ id: "appeal:report-1:owner", userId: "owner", referenceId: "appeal:report-1" });
    await expect(decideModerationAppeal("owner", "appeal:report-1:owner", { accepted: true, note: "Checked the additional context." })).rejects.toMatchObject({ status: 403 });
  });
  it("does not change an appeal after a final decision exists", async () => {
    mocks.event.mockResolvedValueOnce({ id: "appeal:report-1:owner", userId: "owner", referenceId: "appeal:report-1" }).mockResolvedValueOnce({ id: "decision" });
    await expect(decideModerationAppeal("admin", "appeal:report-1:owner", { accepted: false, note: "The evidence supports the original decision." })).rejects.toMatchObject({ status: 409, code: "APPEAL_CLOSED" });
  });
});
