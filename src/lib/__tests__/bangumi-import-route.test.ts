import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthenticationError } from "@/lib/api";
const mocks = vi.hoisted(() => ({ admin: vi.fn(), stage: vi.fn() }));
vi.mock("@/lib/auth", () => ({ requireAdminSessionUserId: mocks.admin }));
vi.mock("@/lib/bangumi-import", async (original) => ({ ...(await original<object>()), stageBangumiSubjectImport: mocks.stage }));
import { POST } from "@/app/api/admin/bangumi/import-subject/route";
const request = (body: unknown) => new Request("https://app.example.org/api/admin/bangumi/import-subject", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
describe("live Bangumi import route", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.admin.mockResolvedValue("session-admin"); mocks.stage.mockResolvedValue({ proposalId: "staged", snapshot: { id: "snapshot" } }); });
  it("uses the authenticated admin and forwards numeric IDs to real staging", async () => {
    expect((await POST(request({ subjectId: "987654" }))).status).toBe(200);
    expect(mocks.stage).toHaveBeenCalledWith("session-admin", { subjectId: "987654", includeSummary: false, includeEpisodes: false });
  });
  it("rejects fake sample IDs, actor injection, and unlicensed summary import", async () => {
    for (const body of [{ subjectId: "summer-2026-bangumi" }, { subjectId: "49131", userId: "forged" }, { subjectId: "49131", includeSummary: true }]) expect((await POST(request(body))).status).toBe(422);
    expect(mocks.stage).not.toHaveBeenCalled();
  });
  it("requires admin authentication before any network or persistence work", async () => {
    mocks.admin.mockRejectedValue(new AuthenticationError());
    expect((await POST(request({ subjectId: "49131" }))).status).toBe(401);
    expect(mocks.stage).not.toHaveBeenCalled();
  });
});
