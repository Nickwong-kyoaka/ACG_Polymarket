import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthenticationError } from "@/lib/api";

const mocks = vi.hoisted(() => ({
  requireSessionUserId: vi.fn(),
  requireAdminSessionUserId: vi.fn(),
  getOptionalSessionUserId: vi.fn(),
  getCatalogCalendar: vi.fn(),
  updateLibraryEntry: vi.fn(),
  updateEpisodeProgress: vi.fn(),
  submitEditProposal: vi.fn(),
  listMyEditProposals: vi.fn(),
  listEntityRevisions: vi.fn(),
  normalizeEntityType: vi.fn(),
  decideEditProposal: vi.fn(),
  reviewCommunityPost: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  requireSessionUserId: mocks.requireSessionUserId,
  requireAdminSessionUserId: mocks.requireAdminSessionUserId,
  getOptionalSessionUserId: mocks.getOptionalSessionUserId,
}));

vi.mock("@/lib/catalog-community", () => ({
  getCatalogCalendar: mocks.getCatalogCalendar,
  updateLibraryEntry: mocks.updateLibraryEntry,
  updateEpisodeProgress: mocks.updateEpisodeProgress,
  submitEditProposal: mocks.submitEditProposal,
  listMyEditProposals: mocks.listMyEditProposals,
  listEntityRevisions: mocks.listEntityRevisions,
  normalizeEntityType: mocks.normalizeEntityType,
  decideEditProposal: mocks.decideEditProposal,
  reviewCommunityPost: mocks.reviewCommunityPost,
}));

import { GET as getCalendar } from "@/app/api/catalog/calendar/route";
import { GET as listProposals, POST as submitProposal } from "@/app/api/edit-proposals/route";
import { GET as getRevisions } from "@/app/api/entities/[type]/[id]/revisions/route";
import { POST as decideProposal } from "@/app/api/admin/edit-proposals/[id]/decision/route";
import { POST as reviewPost } from "@/app/api/admin/posts/[id]/review/route";
import { PUT as updateEpisode } from "@/app/api/me/episodes/[episodeId]/route";
import { PUT as updateLibrary } from "@/app/api/me/library/[seriesId]/route";

function jsonRequest(url: string, method: string, body: unknown) {
  return new Request(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("catalog community routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireSessionUserId.mockResolvedValue("session-user");
    mocks.requireAdminSessionUserId.mockResolvedValue("admin-user");
    mocks.getOptionalSessionUserId.mockResolvedValue(undefined);
    mocks.getCatalogCalendar.mockResolvedValue({ episodes: [] });
    mocks.updateLibraryEntry.mockResolvedValue({ userId: "session-user", seriesId: "series-1" });
    mocks.updateEpisodeProgress.mockResolvedValue({ userId: "session-user", episodeId: "episode-1" });
    mocks.submitEditProposal.mockResolvedValue({ id: "proposal-1", status: "SUBMITTED" });
    mocks.listMyEditProposals.mockResolvedValue({ proposals: [], nextCursor: null });
    mocks.listEntityRevisions.mockResolvedValue([]);
    mocks.normalizeEntityType.mockReturnValue("CHARACTER");
    mocks.decideEditProposal.mockResolvedValue({ proposal: { id: "proposal-1", status: "APPROVED" } });
    mocks.reviewCommunityPost.mockResolvedValue({ post: { id: "post-1", status: "PUBLISHED" } });
  });

  it("uses session identity for library and episode updates", async () => {
    const libraryResponse = await updateLibrary(
      jsonRequest("http://localhost/api/me/library/series-1", "PUT", {
        status: "WATCHING",
        private: true,
        userId: "forged-user",
      }),
      { params: Promise.resolve({ seriesId: "series-1" }) },
    );
    const episodeResponse = await updateEpisode(
      jsonRequest("http://localhost/api/me/episodes/episode-1", "PUT", {
        status: "WATCHED",
        userId: "forged-user",
      }),
      { params: Promise.resolve({ episodeId: "episode-1" }) },
    );

    expect(libraryResponse.status).toBe(200);
    expect(episodeResponse.status).toBe(200);
    expect(mocks.updateLibraryEntry).toHaveBeenCalledWith(
      "session-user",
      "series-1",
      expect.objectContaining({ status: "WATCHING", private: true }),
    );
    expect(mocks.updateEpisodeProgress).toHaveBeenCalledWith("session-user", "episode-1", "WATCHED");
  });

  it("submits edits for the signed-in author, never a body userId", async () => {
    const response = await submitProposal(
      jsonRequest("http://localhost/api/edit-proposals", "POST", {
        entityType: "CHARACTER",
        entityId: "character-1",
        reason: "Correct the profile title.",
        userId: "forged-user",
        changes: [
          {
            fieldKey: "title",
            newValue: "Correct title",
            sourceUrl: "https://example.com/source",
          },
        ],
      }),
    );

    expect(response.status).toBe(201);
    expect(mocks.submitEditProposal).toHaveBeenCalledWith(
      "session-user",
      expect.not.objectContaining({ userId: expect.anything() }),
    );
  });

  it("lists only the signed-in author's proposal queue", async () => {
    const response = await listProposals(
      new Request("http://localhost/api/edit-proposals?status=NEEDS_CHANGES&limit=10"),
    );

    expect(response.status).toBe(200);
    expect(mocks.listMyEditProposals).toHaveBeenCalledWith("session-user", {
      status: "NEEDS_CHANGES",
      cursor: undefined,
      limit: 10,
    });
  });

  it("keeps public calendar and revision reads available", async () => {
    const calendarResponse = await getCalendar(
      new Request("http://localhost/api/catalog/calendar?locale=zh-Hant&from=2026-09-01T00:00:00.000Z&to=2026-09-08T00:00:00.000Z"),
    );
    const revisionResponse = await getRevisions(
      new Request("http://localhost/api/entities/character/character-1/revisions"),
      { params: Promise.resolve({ type: "character", id: "character-1" }) },
    );

    expect(calendarResponse.status).toBe(200);
    expect(revisionResponse.status).toBe(200);
    expect(mocks.getCatalogCalendar).toHaveBeenCalledWith(
      expect.objectContaining({ locale: "zh-Hant", userId: undefined }),
    );
    expect(mocks.listEntityRevisions).toHaveBeenCalledWith("CHARACTER", "character-1", undefined);
  });

  it("gates proposal and post decisions with the admin session", async () => {
    const proposalResponse = await decideProposal(
      jsonRequest("http://localhost/api/admin/edit-proposals/proposal-1/decision", "POST", {
        decision: "APPROVE",
        note: "Source checked.",
      }),
      { params: Promise.resolve({ id: "proposal-1" }) },
    );
    const postResponse = await reviewPost(
      jsonRequest("http://localhost/api/admin/posts/post-1/review", "POST", {
        decision: "APPROVE",
        note: "Media checked.",
      }),
      { params: Promise.resolve({ id: "post-1" }) },
    );

    expect(proposalResponse.status).toBe(200);
    expect(postResponse.status).toBe(200);
    expect(mocks.decideEditProposal).toHaveBeenCalledWith("admin-user", "proposal-1", {
      decision: "APPROVE",
      note: "Source checked.",
    });
    expect(mocks.reviewCommunityPost).toHaveBeenCalledWith("admin-user", "post-1", {
      decision: "APPROVE",
      note: "Media checked.",
    });
  });

  it("returns 401 when a personal route has no authenticated user", async () => {
    mocks.requireSessionUserId.mockRejectedValueOnce(new AuthenticationError());
    const response = await updateLibrary(
      jsonRequest("http://localhost/api/me/library/series-1", "PUT", { status: "WANT" }),
      { params: Promise.resolve({ seriesId: "series-1" }) },
    );
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({ code: "UNAUTHENTICATED" });
    expect(mocks.updateLibraryEntry).not.toHaveBeenCalled();
  });
});
