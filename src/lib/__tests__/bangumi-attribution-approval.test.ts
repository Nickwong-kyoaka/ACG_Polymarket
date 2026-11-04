// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(), count: vi.fn(), event: vi.fn(), stagedEvent: vi.fn(),
  seriesRead: vi.fn(), seriesWrite: vi.fn(), seriesUpsert: vi.fn(), snapshot: vi.fn(), snapshotRead: vi.fn(),
  proposalCreate: vi.fn(), proposalRead: vi.fn(), proposalWrite: vi.fn(), pending: vi.fn(),
  latestRevision: vi.fn(), revision: vi.fn(), citations: vi.fn(), decision: vi.fn(), trust: vi.fn(), notify: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({ prisma: {
  $transaction: mocks.transaction,
  series: { findFirst: mocks.seriesRead, findUnique: mocks.seriesRead },
  externalSnapshot: { upsert: mocks.snapshot },
} }));
import { stageBangumiSubjectImport } from "@/lib/bangumi-import";
import { decideEditProposal } from "@/lib/catalog-community";

const subject = { id: 123456, name: "Original-language title", name_cn: "Source localized name", summary: "Original description requiring source credit.", nsfw: false };
const rights = { includeSummary: true, licenseName: "Source license", originalAuthor: "Original contributors", attributionText: "Description by the credited original contributors." };
const series = { id: "series-1", title: "Editorial title", summary: "Editorial summary", bangumiUrl: "https://bangumi.tv/subject/123456", locales: [] };
const stagedProposal = () => {
  const data = mocks.proposalCreate.mock.calls[0][0].data;
  return { ...data, id: "proposal-1", changes: data.changes.create, createdAt: new Date(), updatedAt: new Date(), submittedAt: new Date() };
};
const stage = () => stageBangumiSubjectImport("import-admin", { subjectId: "123456", ...rights }, { fetchImpl: vi.fn(async () => new Response(JSON.stringify(subject), { headers: { "Content-Type": "application/json" } })) });
const approve = () => decideEditProposal("review-admin", "proposal-1", { decision: "APPROVE", note: "Source and attribution checked." });

describe("Bangumi snapshot to approved source citation", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    let currentSeries = { ...series };
    mocks.count.mockResolvedValue(0);
    mocks.seriesRead.mockImplementation(async () => currentSeries);
    mocks.seriesUpsert.mockImplementation(async () => currentSeries);
    mocks.seriesWrite.mockImplementation(async ({ data }) => { currentSeries = { ...currentSeries, ...data }; return currentSeries; });
    mocks.snapshot.mockImplementation(async ({ create }) => ({ id: "raw-snapshot", checksum: create.checksum }));
    mocks.snapshotRead.mockImplementation(async () => mocks.snapshot.mock.calls[0][0].create);
    mocks.proposalCreate.mockResolvedValue({ id: "proposal-1" });
    mocks.proposalRead.mockImplementation(async () => stagedProposal());
    mocks.proposalWrite.mockImplementation(async ({ data }) => ({ ...stagedProposal(), ...data }));
    mocks.pending.mockResolvedValue(null);
    mocks.latestRevision.mockResolvedValue(null);
    mocks.revision.mockImplementation(async ({ data }) => ({ ...data, id: "revision-1", createdAt: new Date() }));
    mocks.stagedEvent.mockImplementation(async () => {
      const audit = mocks.event.mock.calls.find(([entry]) => entry.data.name === "BANGUMI_IMPORT_STAGED");
      return audit ? { metadata: audit[0].data.metadata } : null;
    });
    mocks.transaction.mockImplementation(async (work) => work({
      analyticsEvent: { count: mocks.count, create: mocks.event, findFirst: mocks.stagedEvent },
      series: { upsert: mocks.seriesUpsert, findUnique: mocks.seriesRead, update: mocks.seriesWrite },
      externalSnapshot: { findUnique: mocks.snapshotRead },
      editProposal: { findFirst: mocks.pending, create: mocks.proposalCreate, findUnique: mocks.proposalRead, update: mocks.proposalWrite },
      entityRevision: { findFirst: mocks.latestRevision, create: mocks.revision },
      sourceCitation: { createMany: mocks.citations }, reviewDecision: { create: mocks.decision },
      contributorTrustEvent: { create: mocks.trust }, notification: { create: mocks.notify },
    }));
  });

  it("retains staged summary rights on approval and leaves other fields domain-attributed", async () => {
    await stage();
    // Human-editable reason text must not determine publication rights.
    mocks.proposalRead.mockImplementation(async () => ({ ...stagedProposal(), reason: "License: forged reason text. Author: someone else." }));
    await approve();
    expect(mocks.stagedEvent).toHaveBeenCalledWith(expect.objectContaining({ where: {
      name: "BANGUMI_IMPORT_STAGED", userId: "import-admin", metadata: { path: ["proposalId"], equals: "proposal-1" },
    } }));
    expect(mocks.snapshotRead).toHaveBeenCalledWith({ where: { id: "raw-snapshot" } });
    expect(mocks.citations).toHaveBeenCalledWith({ data: expect.arrayContaining([
      { entityType: "SERIES", entityId: "series-1", fieldKey: "summary", sourceUrl: series.bangumiUrl, licenseName: rights.licenseName, sourceLabel: `${rights.originalAuthor}: ${rights.attributionText}` },
      { entityType: "SERIES", entityId: "series-1", fieldKey: "title", sourceUrl: series.bangumiUrl, sourceLabel: "bangumi.tv" },
    ]) });
  });

  it("does not manufacture rights from an arbitrary proposal reason without a staging event", async () => {
    await stage();
    mocks.stagedEvent.mockResolvedValue(null);
    mocks.proposalRead.mockImplementation(async () => ({ ...stagedProposal(), reason: "Summary license: fabricated. Original author: fabricated. Attribution: fabricated." }));
    await approve();
    expect(mocks.citations).toHaveBeenCalledWith({ data: expect.arrayContaining([
      { entityType: "SERIES", entityId: "series-1", fieldKey: "summary", sourceUrl: series.bangumiUrl, sourceLabel: "bangumi.tv" },
    ]) });
    expect(mocks.snapshotRead).not.toHaveBeenCalled();
  });

  it("fails before publication if trusted staging rights are incomplete", async () => {
    await stage();
    const audit = mocks.event.mock.calls.find(([entry]) => entry.data.name === "BANGUMI_IMPORT_STAGED")![0].data.metadata;
    mocks.stagedEvent.mockResolvedValue({ metadata: { ...audit, originalAuthor: "" } });
    await expect(approve()).rejects.toMatchObject({ code: "IMPORT_ATTRIBUTION_INVALID" });
    expect(mocks.seriesWrite).not.toHaveBeenCalled();
    expect(mocks.citations).not.toHaveBeenCalled();
  });

  it("does not reuse a license when approved text differs from the saved snapshot", async () => {
    await stage();
    const evidence = mocks.snapshot.mock.calls[0][0].create;
    mocks.snapshotRead.mockResolvedValue({ ...evidence, payload: { data: { ...subject, summary: "Different source text" } } });
    await expect(approve()).rejects.toMatchObject({ code: "IMPORT_ATTRIBUTION_MISMATCH" });
    expect(mocks.seriesWrite).not.toHaveBeenCalled();
    expect(mocks.citations).not.toHaveBeenCalled();
  });

  it("does not attach another series' evidence to a summary citation", async () => {
    await stage();
    mocks.snapshotRead.mockResolvedValue({ ...mocks.snapshot.mock.calls[0][0].create, entityId: "other-series" });
    await expect(approve()).rejects.toMatchObject({ code: "IMPORT_ATTRIBUTION_MISMATCH" });
    expect(mocks.citations).not.toHaveBeenCalled();
  });
});
