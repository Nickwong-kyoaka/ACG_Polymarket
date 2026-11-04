import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireSessionUserId: vi.fn(),
  buyPredictionShares: vi.fn(),
  requireAdminSessionUserId: vi.fn(),
  reviewPredictionChallenge: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  requireSessionUserId: mocks.requireSessionUserId,
  requireAdminSessionUserId: mocks.requireAdminSessionUserId,
}));

vi.mock("@/lib/prediction-market", () => ({
  buyPredictionShares: mocks.buyPredictionShares,
  reviewPredictionChallenge: mocks.reviewPredictionChallenge,
}));

import { POST } from "@/app/api/predictions/[identifier]/buy/route";
import { POST as reviewChallenge } from "@/app/api/admin/predictions/[identifier]/challenges/[challengeId]/route";

describe("prediction trade API identity", () => {
  beforeEach(() => {
    mocks.requireSessionUserId.mockReset();
    mocks.buyPredictionShares.mockReset();
    mocks.requireSessionUserId.mockResolvedValue("session-user");
    mocks.buyPredictionShares.mockResolvedValue({ trade: { id: "trade-1" } });
  });

  it("uses the session identity and ignores a forged body userId", async () => {
    const request = new Request("http://localhost/api/predictions/market-1/buy", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "idempotency-key": "prediction-request-1",
      },
      body: JSON.stringify({
        outcome: "YES",
        quantity: 1,
        quoteToken: "q".repeat(32),
        userId: "forged-user",
      }),
    });
    const response = await POST(request, {
      params: Promise.resolve({ identifier: "market-1" }),
    });

    expect(response.status).toBe(200);
    expect(mocks.buyPredictionShares).toHaveBeenCalledWith({
      identifier: "market-1",
      outcome: "YES",
      quantity: 1,
      quoteToken: "q".repeat(32),
      userId: "session-user",
      idempotencyKey: "prediction-request-1",
    });
  });

  it("rejects a mutation without an Idempotency-Key", async () => {
    const request = new Request("http://localhost/api/predictions/market-1/buy", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        outcome: "YES",
        quantity: 1,
        quoteToken: "q".repeat(32),
      }),
    });
    const response = await POST(request, {
      params: Promise.resolve({ identifier: "market-1" }),
    });

    expect(response.status).toBe(422);
    await expect(response.json()).resolves.toMatchObject({
      code: "IDEMPOTENCY_KEY_REQUIRED",
    });
    expect(mocks.buyPredictionShares).not.toHaveBeenCalled();
  });

  it("requires an explicit per-challenge decision and authenticated admin identity", async () => {
    mocks.requireAdminSessionUserId.mockResolvedValue("session-admin");
    mocks.reviewPredictionChallenge.mockResolvedValue({ accepted: true });
    const payload = { accepted: true, reasoning: "Dated official evidence overturns the proposal.", evidenceUrl: "https://example.test/review", adminUserId: "forged-admin" };
    const response = await reviewChallenge(new Request("http://localhost/api/admin/predictions/market/challenges/challenge", {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload),
    }), { params: Promise.resolve({ identifier: "market", challengeId: "challenge" }) });
    expect(response.status).toBe(200);
    expect(mocks.reviewPredictionChallenge).toHaveBeenCalledWith({
      identifier: "market", challengeId: "challenge", accepted: true, reasoning: payload.reasoning,
      evidenceUrl: payload.evidenceUrl, adminUserId: "session-admin",
    });
  });
});
