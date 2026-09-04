import { describe, expect, it } from "vitest";
import { commentSchema, reportSchema } from "@/lib/schemas";

describe("discussion request schemas", () => {
  it("accepts exactly one comment target", () => {
    expect(commentSchema.safeParse({ postId: "post-1", content: "A thoughtful note" }).success).toBe(true);
    expect(commentSchema.safeParse({ predictionMarketId: "market-1", content: "The source looks strong" }).success).toBe(true);
    expect(commentSchema.safeParse({ content: "No target" }).success).toBe(false);
    expect(commentSchema.safeParse({ characterId: "character-1", postId: "post-1", content: "Two targets" }).success).toBe(false);
  });

  it("requires a report target and supports published posts", () => {
    expect(reportSchema.safeParse({ postId: "post-1", reason: "Source review" }).success).toBe(true);
    expect(reportSchema.safeParse({ commentId: "comment-1", reason: "Safety review" }).success).toBe(true);
    expect(reportSchema.safeParse({ reason: "No target" }).success).toBe(false);
  });
});
