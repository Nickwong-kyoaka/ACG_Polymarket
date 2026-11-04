// @vitest-environment node
import { createHash } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ transaction: vi.fn(), count: vi.fn(), event: vi.fn(), existing: vi.fn(), series: vi.fn(), snapshot: vi.fn(), pending: vi.fn(), proposal: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: {
  $transaction: mocks.transaction,
  series: { findFirst: mocks.existing, findUnique: mocks.existing },
  externalSnapshot: { upsert: mocks.snapshot },
} }));
import { bangumiImportInputSchema, stageBangumiSubjectImport } from "@/lib/bangumi-import";

const subject = { id: 123456, name: "\u65e5\u672c\u8a9e\u306e\u539f\u984c", name_cn: "Source localized title", summary: "Original source summary, not a translated catalog field.", nsfw: false };
const series = { id: "series-1", title: "Current editorial title", summary: "Current editorial summary", bangumiUrl: "https://bangumi.tv/subject/123456" };
const licensed = { includeSummary: true, licenseName: "Owner-supplied license", attributionText: "Original description by the credited contributors.", originalAuthor: "Source contributors" };
const response = (value: unknown) => new Response(JSON.stringify(value), { headers: { "Content-Type": "application/json" } });
const execute = (input: Parameters<typeof stageBangumiSubjectImport>[1] = { subjectId: "123456" }, fetchImpl = vi.fn(async () => response(subject))) => stageBangumiSubjectImport("admin", input, { fetchImpl });

describe("Bangumi snapshot and proposal intake", () => {
  beforeEach(() => {
    vi.clearAllMocks(); mocks.count.mockResolvedValue(0); mocks.existing.mockResolvedValue(series); mocks.series.mockResolvedValue(series);
    mocks.snapshot.mockImplementation(async ({ create }) => ({ id: create.provider === "BANGUMI" ? "subject-snapshot" : "episodes-snapshot", checksum: create.checksum }));
    mocks.pending.mockResolvedValue(null); mocks.proposal.mockResolvedValue({ id: "proposal-1" });
    mocks.transaction.mockImplementation(async (work) => work({ analyticsEvent: { count: mocks.count, create: mocks.event }, series: { upsert: mocks.series }, editProposal: { findFirst: mocks.pending, create: mocks.proposal } }));
  });

  it("uses fixed numeric API paths and saves raw/checksum before staging metadata-only differences", async () => {
    const fetchImpl = vi.fn(async () => response(subject));
    const result = await execute({ subjectId: "123456" }, fetchImpl);
    expect(fetchImpl).toHaveBeenCalledWith("https://api.bgm.tv/v0/subjects/123456", expect.objectContaining({ redirect: "error", credentials: "omit", signal: expect.any(AbortSignal) }));
    const snapshot = mocks.snapshot.mock.calls[0][0].create;
    expect(snapshot.payload).toEqual({ rawBody: JSON.stringify(subject), data: subject });
    expect(snapshot.checksum).toBe(createHash("sha256").update(JSON.stringify(subject)).digest("hex"));
    expect(mocks.snapshot.mock.invocationCallOrder[0]).toBeLessThan(mocks.series.mock.invocationCallOrder[0]);
    const staged = mocks.proposal.mock.calls[0][0].data;
    expect(staged).toMatchObject({ entityType: "SERIES", entityId: "series-1", status: "SUBMITTED" });
    expect(staged.changes.create).toEqual([{ fieldKey: "title", oldValue: series.title, newValue: subject.name, sourceUrl: series.bangumiUrl }]);
    expect(staged.reason).toContain("no English or Traditional Chinese translation asserted");
    expect(mocks.series).toHaveBeenCalledWith(expect.objectContaining({ update: {} }));
    expect(JSON.stringify(mocks.series.mock.calls)).not.toContain("locales");
    expect(result).toMatchObject({ proposalId: "proposal-1", metadataOnly: true, reviewUrl: "/admin/knowledge" });
  });

  it("requires explicit summary rights and preserves them in the review/audit record", async () => {
    await expect(execute({ subjectId: "123456", includeSummary: true })).rejects.toThrow("licenseName");
    expect(mocks.transaction).not.toHaveBeenCalled();
    await execute({ subjectId: "123456", ...licensed });
    const staged = mocks.proposal.mock.calls[0][0].data;
    expect(staged.changes.create).toContainEqual(expect.objectContaining({ fieldKey: "summary", oldValue: series.summary, newValue: subject.summary }));
    expect(staged.reason).toContain(licensed.attributionText);
    expect(staged.reason).toContain(licensed.originalAuthor);
    expect(mocks.event).toHaveBeenLastCalledWith({ data: expect.objectContaining({ name: "BANGUMI_IMPORT_STAGED", metadata: expect.objectContaining({ snapshotId: "subject-snapshot", licenseName: licensed.licenseName }) }) });
  });

  it("creates only a neutral metadata shell before review for an unknown subject", async () => {
    mocks.existing.mockResolvedValue(null);
    mocks.series.mockImplementation(async ({ create }) => create);
    await execute();
    expect(mocks.series).toHaveBeenCalledWith(expect.objectContaining({ create: expect.objectContaining({ id: "bangumi-series-123456", slug: "bangumi-123456", title: "Bangumi subject 123456", summary: "Metadata-only shell awaiting source review.", metadataOnly: true }), update: {} }));
    expect(mocks.proposal.mock.calls[0][0].data.changes.create[0]).toMatchObject({ fieldKey: "title", newValue: subject.name });
  });

  it("retains raw evidence on a mismatched or unsafe subject without staging any writes", async () => {
    await expect(execute({ subjectId: "123456" }, vi.fn(async () => response({ ...subject, id: 999 })))).rejects.toMatchObject({ code: "BANGUMI_INVALID_SUBJECT" });
    expect(mocks.snapshot).toHaveBeenCalledTimes(1); expect(mocks.series).not.toHaveBeenCalled();
    await expect(execute({ subjectId: "123456" }, vi.fn(async () => response({ ...subject, nsfw: true })))).rejects.toMatchObject({ code: "BANGUMI_NSFW" });
    expect(mocks.proposal).not.toHaveBeenCalled();
  });

  it("snapshots an optional bounded episode page without creating episodes/translations", async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(response(subject)).mockResolvedValueOnce(response({ total: 120, data: [{ id: 1, name: "Original episode title", name_cn: "Source title" }] }));
    const result = await execute({ subjectId: "123456", includeEpisodes: true }, fetchImpl);
    expect(fetchImpl.mock.calls[1][0]).toBe("https://api.bgm.tv/v0/episodes?subject_id=123456&limit=100&offset=0");
    expect(result.episodes).toEqual({ snapshotId: "episodes-snapshot", count: 1, total: 120, truncated: true });
    expect(mocks.snapshot).toHaveBeenCalledTimes(2);
    expect(result.warnings.join(" ")).toContain("not");
  });

  it("does not lose a subject proposal if optional episodes fail", async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(response(subject)).mockRejectedValueOnce(new Error("timeout"));
    const result = await execute({ subjectId: "123456", includeEpisodes: true }, fetchImpl);
    expect(result.proposalId).toBe("proposal-1"); expect(result.episodes).toBeNull();
    expect(result.warnings.join(" ")).toContain("Episode snapshot failed");
  });

  it("deduplicates pending proposals and handles an unchanged catalog without an empty proposal", async () => {
    mocks.pending.mockResolvedValue({ id: "already-staged" });
    expect(await execute()).toMatchObject({ proposalId: "already-staged", replayed: true });
    expect(mocks.proposal).not.toHaveBeenCalled();
    mocks.pending.mockResolvedValue(null); mocks.series.mockResolvedValue({ ...series, title: subject.name });
    expect(await execute()).toMatchObject({ proposalId: null, changedFields: [] });
    expect(mocks.proposal).not.toHaveBeenCalled();
  });

  it("enforces numeric input and persisted limits before contacting Bangumi", async () => {
    expect(bangumiImportInputSchema.safeParse({ subjectId: "summer-2026-bangumi" }).success).toBe(false);
    expect(bangumiImportInputSchema.safeParse({ subjectId: "../123" }).success).toBe(false);
    mocks.count.mockResolvedValue(5);
    const fetchImpl = vi.fn();
    await expect(execute({ subjectId: "123456" }, fetchImpl)).rejects.toMatchObject({ code: "IMPORT_RATE_LIMITED" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("rejects oversized bodies, upstream throttles, and timeouts without creating proposals", async () => {
    const oversized = vi.fn(async () => new Response(new Uint8Array(2 * 1024 * 1024 + 1), { headers: { "Content-Type": "application/json" } }));
    await expect(execute({ subjectId: "123456" }, oversized)).rejects.toMatchObject({ code: "BANGUMI_BODY_TOO_LARGE" });
    await expect(execute({ subjectId: "123456" }, vi.fn(async () => new Response(null, { status: 429 })))).rejects.toMatchObject({ status: 429, code: "BANGUMI_UPSTREAM_ERROR" });
    await expect(execute({ subjectId: "123456" }, vi.fn(async () => { throw new DOMException("Timed out", "TimeoutError"); }))).rejects.toMatchObject({ code: "BANGUMI_FETCH_FAILED" });
    expect(mocks.snapshot).not.toHaveBeenCalled(); expect(mocks.proposal).not.toHaveBeenCalled();
  });
});
