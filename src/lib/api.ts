import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function apiOk<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function apiError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function parseJson<T>(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    throw new Error("Expected application/json payload.");
  }

  return (await request.json()) as T;
}

export function handleApiError(error: unknown) {
  if (error instanceof ZodError) {
    return apiError(error.issues.map((issue) => issue.message).join("; "), 422);
  }

  if (error instanceof Error) {
    return apiError(error.message, 400);
  }

  return apiError("Unexpected error.", 500);
}
