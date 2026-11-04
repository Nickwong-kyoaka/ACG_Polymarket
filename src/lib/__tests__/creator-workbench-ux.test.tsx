import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import MyPosts from "@/app/[locale]/me/posts/page";
import { requireSessionUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { listMyPosts } from "@/lib/social";

vi.mock("@/lib/auth", () => ({ requireSessionUserId: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { notification: { findMany: vi.fn() } } }));
vi.mock("@/lib/social", () => ({ listMyPosts: vi.fn() }));
vi.mock("@/lib/feature-flags", () => ({ getExchangeFeatureFlags: () => ({ community: true }) }));
vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("not found"); }, redirect: (path: string) => { throw new Error(`redirect:${path}`); } }));

const posts = [
  { id: "held", slug: "held", title: "Needs edits", body: "Author draft text", status: "HELD", updatedAt: "2026-11-04T08:00:00Z", media: [{ status: "REJECTED" }] },
  { id: "pending", slug: "pending", title: "Waiting", body: "Private pending text", status: "PENDING_REVIEW", updatedAt: "2026-11-04T08:00:00Z", media: [{ status: "PENDING_REVIEW", publicUrl: "https://example.test/unapproved.jpg" }] },
  { id: "published", slug: "published", title: "Public", body: "Public text", status: "PUBLISHED", updatedAt: "2026-11-04T08:00:00Z", media: [] },
  { id: "removed", slug: "removed", title: "Removed post", body: "Removed text", status: "REMOVED", updatedAt: "2026-11-04T08:00:00Z", media: [] },
];

beforeEach(() => {
  vi.mocked(requireSessionUserId).mockResolvedValue("alice");
  vi.mocked(listMyPosts).mockResolvedValue({ posts } as unknown as Awaited<ReturnType<typeof listMyPosts>>);
  vi.mocked(prisma.notification.findMany).mockResolvedValue([]);
});
afterEach(() => { cleanup(); vi.resetAllMocks(); });

it("filters by status, explains the next step, and reads review messages only for the authenticated owner's posts", async () => {
  vi.mocked(prisma.notification.findMany).mockResolvedValue([
    { title: "Changes requested", body: "Please add a source.", type: "SYSTEM", locale: "EN", metadata: { postId: "held", decision: "REQUEST_CHANGES" } },
    { title: "Other user's decision", body: "Must not leak", type: "SYSTEM", locale: "EN", metadata: { postId: "other-user-post", decision: "REQUEST_CHANGES" } },
  ] as never);
  render(await MyPosts({ params: Promise.resolve({ locale: "en" }), searchParams: Promise.resolve({ status: "HELD" }) }));
  expect(listMyPosts).toHaveBeenCalledWith("alice");
  expect(prisma.notification.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: "alice", type: "SYSTEM", OR: posts.map((post) => ({ metadata: { path: ["postId"], equals: post.id } })) } }));
  expect(screen.getByRole("heading", { name: "Needs edits" })).toBeInTheDocument();
  expect(screen.queryByRole("heading", { name: "Waiting" })).not.toBeInTheDocument();
  expect(screen.getByText(/Please add a source/)).toBeInTheDocument();
  expect(screen.queryByText("Must not leak")).not.toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Continue editing" })).toHaveAttribute("href", "/en/create?edit=held");
  expect(screen.queryByRole("link", { name: "Public page" })).not.toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Changes requested (1)" })).toHaveAttribute("aria-current", "page");
});

it("keeps pending image URLs out of the workbench and preserves removed-post restrictions", async () => {
  const view = render(await MyPosts({ params: Promise.resolve({ locale: "en" }) }));
  expect(view.container.innerHTML).not.toContain("unapproved.jpg");
  expect(screen.getByText("Images: awaiting review, not public.")).toBeInTheDocument();
  expect(screen.getAllByRole("link", { name: "Continue editing" })).toHaveLength(3);
  expect(screen.getAllByRole("link", { name: "Public page" })).toHaveLength(1);
});

it("redirects unauthenticated viewers before any post or notification read", async () => {
  vi.mocked(requireSessionUserId).mockRejectedValue(new Error("no session"));
  await expect(MyPosts({ params: Promise.resolve({ locale: "en" }) })).rejects.toThrow("redirect:/en/onboarding");
  expect(listMyPosts).not.toHaveBeenCalled();
  expect(prisma.notification.findMany).not.toHaveBeenCalled();
});

it("separates load failure from empty results and gives a retry", async () => {
  vi.mocked(listMyPosts).mockRejectedValue(new Error("offline"));
  render(await MyPosts({ params: Promise.resolve({ locale: "zh-Hant" }) }));
  expect(screen.getByRole("alert")).toHaveTextContent("現有草稿未被更改");
  expect(screen.getByRole("link", { name: "重新載入" })).toHaveAttribute("href", "/zh-Hant/me/posts");
});

it("shows a clear empty-filter action without inventing moderation explanations", async () => {
  vi.mocked(prisma.notification.findMany).mockRejectedValue(new Error("unavailable"));
  render(await MyPosts({ params: Promise.resolve({ locale: "en" }), searchParams: Promise.resolve({ status: "DRAFT" }) }));
  expect(screen.getByText("No posts match this filter.")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Show all posts" })).toHaveAttribute("href", "/en/me/posts");
  expect(screen.getByRole("status")).toHaveTextContent("Review messages could not load");
});
