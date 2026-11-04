import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthenticationError } from "@/lib/api";

const mocks = vi.hoisted(() => ({ requireSessionUserId: vi.fn(), createCreatorSeries: vi.fn(), updateCreatorSeries: vi.fn(), setCreatorSeriesSubscription: vi.fn(), listCreatorSeries: vi.fn(), listMyCreatorSeries: vi.fn() }));
vi.mock("@/lib/auth", () => ({ requireSessionUserId: mocks.requireSessionUserId }));
vi.mock("@/lib/creator-series", async (importOriginal) => ({ ...await importOriginal<typeof import("@/lib/creator-series")>(), ...mocks }));

import { GET, POST } from "@/app/api/creator-series/route";
import { PATCH } from "@/app/api/creator-series/[id]/route";
import { POST as subscribe } from "@/app/api/creator-series/[id]/subscribe/route";

function request(body: unknown, method = "POST") {
  return new Request("http://localhost/api/creator-series", { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
}

describe("creator series API identity", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.requireSessionUserId.mockResolvedValue("session-user");
    mocks.createCreatorSeries.mockResolvedValue({ series: { id: "series" } });
    mocks.updateCreatorSeries.mockResolvedValue({ series: { id: "series" } });
    mocks.setCreatorSeriesSubscription.mockResolvedValue({ subscribed: true });
  });

  it("creates and patches using only the session identity", async () => {
    expect((await POST(request({ title: "My series" }))).status).toBe(201);
    expect(mocks.createCreatorSeries).toHaveBeenCalledWith("session-user", { title: "My series" });
    expect((await PATCH(request({ published: false }, "PATCH"), { params: Promise.resolve({ id: "series" }) })).status).toBe(200);
    expect(mocks.updateCreatorSeries).toHaveBeenCalledWith("session-user", "series", { published: false });
  });

  it("validates an explicit subscription boolean and rejects unknown identity fields", async () => {
    const ctx = { params: Promise.resolve({ id: "series" }) };
    expect((await subscribe(request({}), ctx)).status).toBe(422);
    expect((await subscribe(request({ subscribed: true, userId: "victim" }), ctx)).status).toBe(422);
    expect(mocks.setCreatorSeriesSubscription).not.toHaveBeenCalled();
    expect((await subscribe(request({ subscribed: true }), ctx)).status).toBe(200);
    expect(mocks.setCreatorSeriesSubscription).toHaveBeenCalledWith("session-user", "series", true);
  });

  it("requires authentication for creation and the private management listing", async () => {
    mocks.requireSessionUserId.mockRejectedValue(new AuthenticationError());
    expect((await POST(request({ title: "Notes" }))).status).toBe(401);
    expect((await GET(new Request("http://localhost/api/creator-series?mine=1"))).status).toBe(401);
    expect(mocks.createCreatorSeries).not.toHaveBeenCalled();
    expect(mocks.listMyCreatorSeries).not.toHaveBeenCalled();
  });
});
