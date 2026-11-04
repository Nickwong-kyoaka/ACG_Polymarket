import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { AppError, ConflictError, NotFoundError } from "@/lib/api";
import { validateProposalChanges } from "@/lib/catalog-community";
import { prisma } from "@/lib/prisma";

const API = "https://api.bgm.tv";
const MAX_BODY_BYTES = 2 * 1024 * 1024;
const TIMEOUT_MS = 10_000;
export const bangumiImportInputSchema = z.object({
  subjectId: z.union([z.string(), z.number().int().positive().safe()]).transform(String)
    .pipe(z.string().regex(/^[1-9][0-9]{0,14}$/, "Use a positive numeric Bangumi subject ID.")),
  seriesId: z.string().trim().min(1).max(191).optional(),
  includeSummary: z.boolean().default(false),
  includeEpisodes: z.boolean().default(false),
  licenseName: z.string().trim().min(2).max(120).optional(),
  attributionText: z.string().trim().min(8).max(1000).optional(),
  originalAuthor: z.string().trim().min(2).max(180).optional(),
}).strict().superRefine((value, context) => {
  if (value.includeSummary && (!value.licenseName || !value.attributionText || !value.originalAuthor)) {
    context.addIssue({ code: "custom", message: "Importing summary text requires licenseName, attributionText, and originalAuthor." });
  }
});
export type BangumiImportInput = z.input<typeof bangumiImportInputSchema>;

async function serializable<T>(work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try { return await prisma.$transaction(work, { isolationLevel: "Serializable", maxWait: 5000, timeout: 15000 }); }
    catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && ["P2034", "P2002"].includes(error.code) && attempt < 2) continue;
      throw error;
    }
  }
  throw new ConflictError("Import could not be staged safely.");
}

async function reserveImportAttempt(adminId: string, subjectId: string) {
  await serializable(async (tx) => {
    const where = { name: "BANGUMI_IMPORT_STARTED", createdAt: { gte: new Date(Date.now() - 60_000) } };
    const own = await tx.analyticsEvent.count({ where: { ...where, userId: adminId } });
    const global = await tx.analyticsEvent.count({ where });
    if (own >= 5 || global >= 20) throw new AppError("Bangumi imports are rate limited. Please wait a minute.", 429, "IMPORT_RATE_LIMITED");
    await tx.analyticsEvent.create({ data: { userId: adminId, name: where.name, metadata: { subjectId } } });
  });
}

async function fetchRaw(path: string, fetchImpl: typeof fetch) {
  try {
    const response = await fetchImpl(`${API}${path}`, {
      method: "GET", redirect: "error", cache: "no-store", credentials: "omit",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { Accept: "application/json", "User-Agent": process.env.BANGUMI_USER_AGENT ?? "ACG-Exchange/1.0 (admin metadata review)" },
    });
    if (!response.ok) {
      await response.body?.cancel();
      throw new AppError(`Bangumi returned HTTP ${response.status}.`, response.status === 404 ? 404 : response.status === 429 ? 429 : 502, "BANGUMI_UPSTREAM_ERROR");
    }
    if (!response.headers.get("content-type")?.toLowerCase().includes("application/json")) {
      await response.body?.cancel();
      throw new AppError("Bangumi did not return JSON.", 502, "BANGUMI_INVALID_RESPONSE");
    }
    if (Number(response.headers.get("content-length")) > MAX_BODY_BYTES) {
      await response.body?.cancel();
      throw new AppError("Bangumi response exceeds the 2 MB limit.", 502, "BANGUMI_BODY_TOO_LARGE");
    }
    if (!response.body) throw new AppError("Bangumi response is empty.", 502, "BANGUMI_INVALID_RESPONSE");
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let length = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        length += value.byteLength;
        if (length > MAX_BODY_BYTES) throw new AppError("Bangumi response exceeds the 2 MB limit.", 502, "BANGUMI_BODY_TOO_LARGE");
        chunks.push(value);
      }
    } catch (error) { await reader.cancel().catch(() => {}); throw error; }
    const bytes = Buffer.concat(chunks);
    const rawBody = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    const data: unknown = JSON.parse(rawBody);
    return { rawBody, data, checksum: createHash("sha256").update(bytes).digest("hex"), sourceUrl: `${API}${path}` };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError("Bangumi could not be fetched within the timeout or returned invalid JSON.", 502, "BANGUMI_FETCH_FAILED");
  }
}

async function saveSnapshot(raw: Awaited<ReturnType<typeof fetchRaw>>, entityId: string, subjectId: string, provider: string) {
  // Committed independently: even validation/staging failures retain raw evidence.
  return prisma.externalSnapshot.upsert({
    where: { provider_entityType_entityId_checksum: { provider, entityType: "SERIES", entityId, checksum: raw.checksum } },
    create: { provider, entityType: "SERIES", entityId, externalId: subjectId, sourceUrl: raw.sourceUrl, checksum: raw.checksum, payload: { rawBody: raw.rawBody, data: raw.data as Prisma.InputJsonValue } },
    update: {}, select: { id: true, checksum: true },
  });
}

const subjectSchema = z.object({ id: z.number().int().positive().safe(), name: z.string().trim().min(1).max(160), summary: z.string().max(100_000).default(""), nsfw: z.boolean() });

export async function stageBangumiSubjectImport(adminId: string, rawInput: BangumiImportInput, dependencies: { fetchImpl?: typeof fetch } = {}) {
  const input = bangumiImportInputSchema.parse(rawInput);
  await reserveImportAttempt(adminId, input.subjectId);
  const sourceUrl = `https://bangumi.tv/subject/${input.subjectId}`;
  const existing = input.seriesId
    ? await prisma.series.findUnique({ where: { id: input.seriesId } })
    : await prisma.series.findFirst({ where: { OR: [{ bangumiUrl: sourceUrl }, { bangumiUrl: `https://bgm.tv/subject/${input.subjectId}` }, { slug: `bangumi-${input.subjectId}` }] } });
  if (input.seriesId && !existing) throw new NotFoundError("Target series not found.");
  const entityId = existing?.id ?? `bangumi-series-${input.subjectId}`;
  const fetchImpl = dependencies.fetchImpl ?? fetch;
  const raw = await fetchRaw(`/v0/subjects/${input.subjectId}`, fetchImpl);
  const snapshot = await saveSnapshot(raw, entityId, input.subjectId, "BANGUMI");
  const parsed = subjectSchema.safeParse(raw.data);
  if (!parsed.success || String(parsed.data.id) !== input.subjectId) throw new AppError("Bangumi returned an invalid or mismatched subject. Raw evidence was retained.", 502, "BANGUMI_INVALID_SUBJECT");
  const subject = parsed.data;
  if (subject.nsfw) throw new AppError("NSFW subjects cannot be staged in this SFW catalog. Raw evidence was retained.", 422, "BANGUMI_NSFW");

  const warnings: string[] = [];
  let episodes: { snapshotId: string; count: number; total: number; truncated: boolean } | null = null;
  if (input.includeEpisodes) {
    try {
      const episodeRaw = await fetchRaw(`/v0/episodes?subject_id=${input.subjectId}&limit=100&offset=0`, fetchImpl);
      const episodeSnapshot = await saveSnapshot(episodeRaw, entityId, input.subjectId, "BANGUMI_EPISODES");
      const page = z.object({ total: z.number().int().nonnegative(), data: z.array(z.unknown()).max(100) }).parse(episodeRaw.data);
      episodes = { snapshotId: episodeSnapshot.id, count: page.data.length, total: page.total, truncated: page.total > page.data.length };
      if (episodes.truncated) warnings.push("Only the first episode page (up to 100 records) was snapshotted; no episodes or translations were published.");
    } catch { warnings.push("Episode snapshot failed. Subject evidence and staging are still available; no episodes were published."); }
  }
  if (!input.includeSummary) warnings.push("Metadata-only: summary text was not proposed. Original source text remains private raw evidence.");
  if (input.includeSummary && subject.summary.trim().length > 6000) throw new AppError("Source summary exceeds the reviewable 6,000-character field limit. Raw evidence was retained.", 422, "BANGUMI_SUMMARY_TOO_LONG");

  const staged = await serializable(async (tx) => {
    const series = await tx.series.upsert({
      where: { id: entityId },
      create: { id: entityId, slug: `bangumi-${input.subjectId}`, title: `Bangumi subject ${input.subjectId}`, summary: "Metadata-only shell awaiting source review.", metadataOnly: true, rightsType: "LICENSED", bangumiUrl: sourceUrl },
      update: {},
    });
    const candidates = [
      { fieldKey: "title", newValue: subject.name, sourceUrl },
      { fieldKey: "bangumiUrl", newValue: sourceUrl, sourceUrl },
      ...(input.includeSummary && subject.summary.trim() ? [{ fieldKey: "summary", newValue: subject.summary.trim(), sourceUrl }] : []),
    ];
    const values = { title: series.title, summary: series.summary, bangumiUrl: series.bangumiUrl };
    const different = candidates.filter((item) => values[item.fieldKey as keyof typeof values] !== item.newValue);
    const changes = different.length ? validateProposalChanges("SERIES", different) : [];
    const policyKey = createHash("sha256").update(JSON.stringify({ includeSummary: input.includeSummary, licenseName: input.licenseName, attributionText: input.attributionText, originalAuthor: input.originalAuthor })).digest("hex").slice(0, 16);
    const marker = `Bangumi snapshot ${snapshot.id}; policy ${policyKey}`;
    const pending = await tx.editProposal.findFirst({ where: { entityType: "SERIES", entityId, status: "SUBMITTED", reason: { startsWith: marker } }, select: { id: true } });
    if (pending) return { seriesId: series.id, proposalId: pending.id, changedFields: changes.map((change) => change.fieldKey), replayed: true };
    if (!changes.length) return { seriesId: series.id, proposalId: null, changedFields: [], replayed: false };
    const rights = input.includeSummary ? `\nSummary license: ${input.licenseName}\nOriginal author: ${input.originalAuthor}\nAttribution: ${input.attributionText}` : "\nMetadata only; no source summary licensed for publication.";
    const proposal = await tx.editProposal.create({ data: {
      authorId: adminId, entityType: "SERIES", entityId, status: "SUBMITTED", submittedAt: new Date(),
      reason: `${marker}. Original-language title only; no English or Traditional Chinese translation asserted.${rights}`,
      changes: { create: changes.map((change) => ({ fieldKey: change.fieldKey, oldValue: values[change.fieldKey as keyof typeof values] ?? Prisma.JsonNull, newValue: change.newValue as Prisma.InputJsonValue, sourceUrl: change.sourceUrl })) },
    }, select: { id: true } });
    await tx.analyticsEvent.create({ data: { userId: adminId, name: "BANGUMI_IMPORT_STAGED", metadata: { subjectId: input.subjectId, snapshotId: snapshot.id, proposalId: proposal.id, seriesId: series.id, includeSummary: input.includeSummary, ...(input.includeSummary ? { licenseName: input.licenseName, attributionText: input.attributionText, originalAuthor: input.originalAuthor } : {}) } } });
    return { seriesId: series.id, proposalId: proposal.id, changedFields: changes.map((change) => change.fieldKey), replayed: false };
  });
  return { ...staged, snapshot, episodes, warnings, reviewUrl: "/admin/knowledge", metadataOnly: !input.includeSummary };
}
