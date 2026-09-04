import { describe, expect, it } from "vitest";
import robots from "@/app/robots";
import { normalizeFeedPayload, normalizeSocialNote } from "@/components/social-note-types";

describe("social feed DTO compatibility", () => {
  it("normalizes the public social API shape without exposing private records", () => {
    const note = normalizeSocialNote({
      id: "post-1",
      slug: "warm-evening",
      kind: "OUTFIT",
      title: "A warm evening look",
      body: "A page worth keeping.",
      author: { id: "user-1", image: "/avatar.png", profile: { handle: "akari-fan", displayName: "Akari fan" } },
      primaryCharacter: { id: "char-akari", slug: "akari", name: "Akari", title: "Stage light", accentFrom: "#c85d5a", accentTo: "#5f8f87" },
      media: [{ id: "media-1", url: "https://cdn.example.test/card.webp", altText: "Akari in evening clothes", sourceLabel: "Creator upload" }],
      topics: [{ topic: { slug: "outfit-notes", title: "Outfit notes" } }],
      counts: { saves: 4, reactions: 7, comments: 2 },
      viewer: { saved: true },
    });
    expect(note).toMatchObject({ slug: "warm-evening", author: { handle: "akari-fan" }, character: { slug: "akari" }, counts: { saves: 4, reactions: 7, comments: 2 }, viewer: { saved: true } });
    expect(JSON.stringify(note)).not.toContain("permissionEvidence");
  });

  it("drops malformed feed entries but preserves pagination", () => {
    expect(normalizeFeedPayload({ items: [{ id: "missing-title" }, { id: "ok", slug: "ok", title: "Okay", author: {} }], nextCursor: "next-page" })).toMatchObject({ items: [{ id: "ok" }], nextCursor: "next-page" });
  });
});

describe("public crawler policy", () => {
  it("indexes public discovery while keeping member and API routes out", () => {
    const policy = robots();
    expect(policy.rules).toEqual(expect.arrayContaining([expect.objectContaining({ allow: "/", disallow: expect.arrayContaining(["/api/", "/en/me", "/zh-Hant/create"]) })]));
    expect(policy.sitemap).toMatch(/\/sitemap\.xml$/);
  });
});
