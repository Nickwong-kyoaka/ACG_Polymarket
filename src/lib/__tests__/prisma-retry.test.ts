import { describe, expect, it } from "vitest";
import { classifyRetryablePrismaConflict } from "@/lib/prisma-retry";

describe("Prisma transaction conflict classification", () => {
  it("recognizes Prisma client conflict codes", () => {
    expect(classifyRetryablePrismaConflict({ code: "P2034" })).toBe("WRITE_CONFLICT");
    expect(classifyRetryablePrismaConflict({ code: "P2002" })).toBe("UNIQUE_CONFLICT");
  });

  it("recognizes Prisma 7 driver adapter conflicts", () => {
    expect(classifyRetryablePrismaConflict({ name: "DriverAdapterError", cause: { kind: "TransactionWriteConflict" } })).toBe("WRITE_CONFLICT");
    expect(classifyRetryablePrismaConflict({ name: "DriverAdapterError", cause: { kind: "UniqueConstraintViolation" } })).toBe("UNIQUE_CONFLICT");
  });

  it("does not retry unrelated application failures", () => {
    expect(classifyRetryablePrismaConflict(new Error("validation failed"))).toBeNull();
  });
});
