export type RetryablePrismaConflict = "WRITE_CONFLICT" | "UNIQUE_CONFLICT";

export function classifyRetryablePrismaConflict(error: unknown): RetryablePrismaConflict | null {
  if (!error || typeof error !== "object") return null;
  const candidate = error as { code?: unknown; cause?: unknown };
  if (candidate.code === "P2034") return "WRITE_CONFLICT";
  if (candidate.code === "P2002") return "UNIQUE_CONFLICT";
  if (!candidate.cause || typeof candidate.cause !== "object") return null;
  const kind = (candidate.cause as { kind?: unknown }).kind;
  if (kind === "TransactionWriteConflict") return "WRITE_CONFLICT";
  if (kind === "UniqueConstraintViolation") return "UNIQUE_CONFLICT";
  return null;
}

export async function waitForSerializableRetry(retryNumber: number) {
  await new Promise((resolve) => setTimeout(resolve, 20 * retryNumber));
}
