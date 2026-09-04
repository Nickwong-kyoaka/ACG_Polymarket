import { beforeEach, describe, expect, it, vi } from "vitest";

import { AuthenticationError } from "@/lib/api";

const mocks = vi.hoisted(() => ({
  requireSessionUserId: vi.fn(),
  getOptionalSessionUserId: vi.fn(),
  createPost: vi.fn(),
  getSocialFeed: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  requireSessionUserId: mocks.requireSessionUserId,
  getOptionalSessionUserId: mocks.getOptionalSessionUserId,
}));

vi.mock("@/lib/social", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/social")>();
  return {
    ...actual,
    createPost: mocks.createPost,
    getSocialFeed: mocks.getSocialFeed,
  };
});

import { POST } from "@/app/api/posts/route";
import { GET as GET_FEED } from "@/app/api/feed/route";

function postRequest(body: unknown) {
  return new Request("http://localhost/api/posts", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const validPost = {
  language: "en",
  title: "A small appreciation note",
  body: "This moment stayed with me.",
};

describe("POST /api/posts", () => {
  beforeEach(() => {
    mocks.requireSessionUserId.mockReset();
    mocks.createPost.mockReset();
  });

  it("returns 401 when no session identity is available", async () => {
    mocks.requireSessionUserId.mockRejectedValue(new AuthenticationError());
    const response = await POST(postRequest(validPost));
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toMatchObject({ code: "UNAUTHENTICATED" });
    expect(mocks.createPost).not.toHaveBeenCalled();
  });

  it("rejects a body-supplied identity with 422", async () => {
    mocks.requireSessionUserId.mockResolvedValue("session-user");
    const response = await POST(postRequest({ ...validPost, userId: "spoofed-user" }));
    expect(response.status).toBe(422);
    expect(mocks.createPost).not.toHaveBeenCalled();
  });

  it("passes only the authenticated identity to the domain service", async () => {
    mocks.requireSessionUserId.mockResolvedValue("session-user");
    mocks.createPost.mockResolvedValue({
      post: { id: "post-1", status: "PENDING_REVIEW" },
      moderation: { requiresReview: true },
    });
    const response = await POST(postRequest(validPost));
    expect(response.status).toBe(201);
    expect(mocks.createPost).toHaveBeenCalledWith(
      "session-user",
      expect.objectContaining({ title: validPost.title }),
    );
  });
});

describe("GET /api/feed", () => {
  beforeEach(() => {
    mocks.getOptionalSessionUserId.mockReset();
    mocks.getSocialFeed.mockReset();
  });

  it("keeps feed public and accepts the UI tab alias", async () => {
    mocks.getOptionalSessionUserId.mockResolvedValue(undefined);
    mocks.getSocialFeed.mockResolvedValue({ items: [], nextCursor: null });
    const response = await GET_FEED(
      new Request("http://localhost/api/feed?tab=seasonal&locale=zh-Hant&limit=12"),
    );
    expect(response.status).toBe(200);
    expect(mocks.getSocialFeed).toHaveBeenCalledWith({
      mode: "seasonal",
      locale: "zh-Hant",
      limit: 12,
      viewerId: undefined,
    });
  });

  it("returns 422 for invalid pagination", async () => {
    mocks.getOptionalSessionUserId.mockResolvedValue(undefined);
    const response = await GET_FEED(
      new Request("http://localhost/api/feed?mode=for-you&limit=500"),
    );
    expect(response.status).toBe(422);
    expect(mocks.getSocialFeed).not.toHaveBeenCalled();
  });
});
