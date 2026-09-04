import { describe, expect, it } from "vitest";
import {
  assertProposalFresh,
  nextCreatorApprovalState,
  nextRevisionNumber,
  normalizeEntityType,
  validateProposalChanges,
} from "@/lib/catalog-community";

describe("catalog community policy", () => {
  it("accepts supported sourced changes and normalizes nullable values", () => {
    expect(
      validateProposalChanges("CHARACTER", [
        {
          fieldKey: "favoritePhrase",
          newValue: "  Welcome home.  ",
          sourceUrl: "https://example.com/character/profile",
        },
        {
          fieldKey: "releaseSeason",
          newValue: "",
          sourceUrl: "https://example.com/season",
        },
      ]),
    ).toEqual([
      {
        fieldKey: "favoritePhrase",
        newValue: "Welcome home.",
        sourceUrl: "https://example.com/character/profile",
      },
      {
        fieldKey: "releaseSeason",
        newValue: null,
        sourceUrl: "https://example.com/season",
      },
    ]);
  });

  it("accepts independently sourced English and Traditional Chinese locale fields", () => {
    expect(
      validateProposalChanges("PERSON", [
        {
          fieldKey: "locales.ZH_HANT.description",
          newValue: "角色聲優與製作人員資料。",
          sourceUrl: "https://example.com/zh/person",
        },
      ]),
    ).toEqual([
      {
        fieldKey: "locales.ZH_HANT.description",
        newValue: "角色聲優與製作人員資料。",
        sourceUrl: "https://example.com/zh/person",
      },
    ]);
  });

  it("requires one HTTPS source for every field", () => {
    expect(() =>
      validateProposalChanges("SERIES", [
        { fieldKey: "title", newValue: "New title", sourceUrl: "" },
      ]),
    ).toThrowError(expect.objectContaining({ code: "SOURCE_REQUIRED", status: 422 }));
    expect(() =>
      validateProposalChanges("SERIES", [
        { fieldKey: "title", newValue: "New title", sourceUrl: "http://example.com" },
      ]),
    ).toThrowError(expect.objectContaining({ code: "SOURCE_REQUIRED", status: 422 }));
  });

  it("rejects unsupported and duplicate fields", () => {
    expect(() =>
      validateProposalChanges("CHARACTER", [
        { fieldKey: "circulatingUnits", newValue: 1, sourceUrl: "https://example.com" },
      ]),
    ).toThrowError(expect.objectContaining({ code: "FIELD_NOT_EDITABLE" }));
    expect(() =>
      validateProposalChanges("PERSON", [
        { fieldKey: "name", newValue: "One", sourceUrl: "https://example.com/one" },
        { fieldKey: "name", newValue: "Two", sourceUrl: "https://example.com/two" },
      ]),
    ).toThrowError(expect.objectContaining({ code: "DUPLICATE_FIELD" }));
  });

  it("detects stale proposals before an admin can overwrite newer data", () => {
    expect(() =>
      assertProposalFresh(
        { title: "Already updated" },
        [{ fieldKey: "title", oldValue: "Original" }],
      ),
    ).toThrowError(expect.objectContaining({ code: "PROPOSAL_STALE", status: 409 }));
    expect(() =>
      assertProposalFresh({ title: "Original" }, [{ fieldKey: "title", oldValue: "Original" }]),
    ).not.toThrow();
  });

  it("advances immutable revisions and completes creator probation at three approvals", () => {
    expect(nextRevisionNumber()).toBe(1);
    expect(nextRevisionNumber(4)).toBe(5);
    expect(nextCreatorApprovalState(1)).toEqual({ approvedPostCount: 2, probationComplete: false });
    expect(nextCreatorApprovalState(2)).toEqual({ approvedPostCount: 3, probationComplete: true });
    expect(nextCreatorApprovalState(8)).toEqual({ approvedPostCount: 9, probationComplete: true });
  });

  it("normalizes public entity route values", () => {
    expect(normalizeEntityType("character")).toBe("CHARACTER");
    expect(() => normalizeEntityType("wallet")).toThrowError(
      expect.objectContaining({ code: "INVALID_ENTITY_TYPE" }),
    );
  });
});
