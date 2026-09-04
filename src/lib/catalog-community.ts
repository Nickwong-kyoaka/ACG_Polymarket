import {
  Prisma,
  type EditProposalStatus,
  type EntityType,
  type EpisodeProgressStatus,
  type LibraryStatus,
  type ReviewDecisionKind,
} from "@prisma/client";
import { z } from "zod";
import { AppError, ConflictError, NotFoundError } from "@/lib/api";
import { prisma } from "@/lib/prisma";

type DbClient = Prisma.TransactionClient | typeof prisma;
type JsonScalar = string | number | boolean | null;

const entityTypes = ["SERIES", "CHARACTER", "PERSON", "EPISODE", "POST"] as const;
const editableFieldSchemas: Record<EntityType, Record<string, z.ZodType>> = {
  SERIES: {
    title: z.string().trim().min(1).max(160),
    summary: z.string().trim().min(1).max(6_000),
    bangumiUrl: nullableHttpsUrl(),
  },
  CHARACTER: {
    name: z.string().trim().min(1).max(120),
    title: z.string().trim().min(1).max(180),
    summary: z.string().trim().min(1).max(6_000),
    fandomPrompt: z.string().trim().min(1).max(1_000),
    mood: z.string().trim().min(1).max(80),
    releaseSeason: nullableShortText(80),
    sourceTitle: nullableShortText(180),
    favoritePhrase: nullableShortText(500),
  },
  PERSON: {
    name: z.string().trim().min(1).max(120),
    description: z.string().trim().min(1).max(6_000),
    sourceUrl: nullableHttpsUrl(),
  },
  EPISODE: {
    title: z.string().trim().min(1).max(240),
    number: z.number().int().min(0).max(10_000),
    airAt: z.union([z.iso.datetime(), z.null()]),
    sourceUrl: nullableHttpsUrl(),
  },
  POST: {
    title: z.string().trim().min(1).max(200),
    body: z.string().trim().min(1).max(20_000),
    sourceUrl: nullableHttpsUrl(),
  },
};

const localizedFieldSchemas: Partial<Record<EntityType, Record<string, z.ZodType>>> = {
  SERIES: {
    title: z.string().trim().min(1).max(160),
    summary: z.string().trim().min(1).max(6_000),
  },
  CHARACTER: {
    name: z.string().trim().min(1).max(120),
    title: z.string().trim().min(1).max(180),
    summary: z.string().trim().min(1).max(6_000),
    fandomPrompt: z.string().trim().min(1).max(1_000),
    mood: z.string().trim().min(1).max(80),
    favoritePhrase: nullableShortText(500),
  },
  PERSON: {
    name: z.string().trim().min(1).max(120),
    description: z.string().trim().min(1).max(6_000),
  },
  EPISODE: { title: z.string().trim().min(1).max(240) },
};

for (const [entityType, fields] of Object.entries(localizedFieldSchemas)) {
  for (const locale of ["EN", "ZH_HANT"] as const) {
    for (const [fieldKey, schema] of Object.entries(fields ?? {})) {
      editableFieldSchemas[entityType as EntityType][`locales.${locale}.${fieldKey}`] = schema;
    }
  }
}

const serializableOptions = {
  isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
  maxWait: 5_000,
  timeout: 15_000,
} as const;

export type ProposalChangeInput = {
  fieldKey: string;
  newValue: unknown;
  sourceUrl: string;
};

export type CreateProposalInput = {
  proposalId?: string;
  entityType: EntityType;
  entityId: string;
  reason: string;
  changes: ProposalChangeInput[];
};

export type ProposalDecisionInput = {
  decision: ReviewDecisionKind;
  note: string;
};

export type PostReviewInput = {
  decision: ReviewDecisionKind;
  note: string;
};

function nullableHttpsUrl() {
  return z
    .union([z.url(), z.literal(""), z.null()])
    .transform((value) => (value === "" ? null : value))
    .refine((value) => value === null || value.startsWith("https://"), "Source URLs must use HTTPS.");
}

function nullableShortText(max: number) {
  return z
    .union([z.string().trim().max(max), z.null()])
    .transform((value) => (value === "" ? null : value));
}

function parseHttpsSource(value: string) {
  const parsed = z.url().safeParse(value.trim());
  if (!parsed.success || !parsed.data.startsWith("https://")) {
    throw new AppError("Every proposed field needs an HTTPS source URL.", 422, "SOURCE_REQUIRED");
  }
  return parsed.data;
}

function toJsonInput(value: JsonScalar): Prisma.InputJsonValue | Prisma.NullTypes.JsonNull {
  return value === null ? Prisma.JsonNull : value;
}

function publicLocale(locale?: string | null) {
  return locale === "zh-Hant" || locale === "cn" || locale === "ZH_HANT" ? "ZH_HANT" : "EN";
}

export function normalizeEntityType(value: string): EntityType {
  const normalized = value.trim().toUpperCase();
  if (!entityTypes.includes(normalized as (typeof entityTypes)[number])) {
    throw new AppError("Unsupported entity type.", 422, "INVALID_ENTITY_TYPE");
  }
  return normalized as EntityType;
}

export function validateProposalChanges(entityType: EntityType, changes: ProposalChangeInput[]) {
  if (changes.length < 1 || changes.length > 20) {
    throw new AppError("A proposal must contain between 1 and 20 field changes.", 422, "INVALID_CHANGES");
  }

  const seen = new Set<string>();
  return changes.map((change) => {
    const fieldKey = change.fieldKey.trim();
    if (seen.has(fieldKey)) {
      throw new AppError(`Field ${fieldKey} appears more than once.`, 422, "DUPLICATE_FIELD");
    }
    seen.add(fieldKey);

    const schema = editableFieldSchemas[entityType][fieldKey];
    if (!schema) {
      throw new AppError(`Field ${fieldKey} cannot be edited by proposal.`, 422, "FIELD_NOT_EDITABLE");
    }

    const parsed = schema.safeParse(change.newValue);
    if (!parsed.success) {
      throw new AppError(
        `${fieldKey}: ${parsed.error.issues.map((issue) => issue.message).join("; ")}`,
        422,
        "INVALID_FIELD_VALUE",
      );
    }

    return {
      fieldKey,
      newValue: parsed.data as JsonScalar,
      sourceUrl: parseHttpsSource(change.sourceUrl),
    };
  });
}

export function proposalValueMatches(current: unknown, proposedOldValue: unknown) {
  return JSON.stringify(current ?? null) === JSON.stringify(proposedOldValue ?? null);
}

export function assertProposalFresh(
  current: Record<string, unknown>,
  changes: Array<{ fieldKey: string; oldValue: unknown }>,
) {
  for (const change of changes) {
    if (!proposalValueMatches(current[change.fieldKey], change.oldValue)) {
      throw new ConflictError(
        `${change.fieldKey} changed after this proposal was submitted. Ask the author to refresh it.`,
        "PROPOSAL_STALE",
      );
    }
  }
}

export function nextRevisionNumber(latestRevision?: number | null) {
  return Math.max(0, latestRevision ?? 0) + 1;
}

export function nextCreatorApprovalState(currentApprovedPostCount: number) {
  const approvedPostCount = Math.max(0, currentApprovedPostCount) + 1;
  return { approvedPostCount, probationComplete: approvedPostCount >= 3 };
}

async function withSerializableRetry<T>(work: (tx: Prisma.TransactionClient) => Promise<T>) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await prisma.$transaction(work, serializableOptions);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2034" && attempt < 2) continue;
        if (error.code === "P2002") {
          throw new ConflictError("A catalog record already uses this value.", "UNIQUE_CONFLICT");
        }
        if (error.code === "P2025") throw new NotFoundError();
      }
      throw error;
    }
  }
  throw new ConflictError("The operation could not be completed safely.");
}

async function readEntitySnapshot(
  db: DbClient,
  entityType: EntityType,
  entityId: string,
): Promise<Record<string, JsonScalar>> {
  if (entityType === "SERIES") {
    const value = await db.series.findUnique({
      where: { id: entityId },
      select: { title: true, summary: true, bangumiUrl: true, locales: true },
    });
    if (!value) throw new NotFoundError("The proposed entity was not found.");
    return withLocaleSnapshot(
      { title: value.title, summary: value.summary, bangumiUrl: value.bangumiUrl },
      value.locales,
    );
  } else if (entityType === "CHARACTER") {
    const value = await db.character.findUnique({
      where: { id: entityId },
      select: {
        name: true,
        title: true,
        summary: true,
        fandomPrompt: true,
        mood: true,
        releaseSeason: true,
        sourceTitle: true,
        favoritePhrase: true,
        locales: true,
      },
    });
    if (!value) throw new NotFoundError("The proposed entity was not found.");
    const { locales, ...base } = value;
    return withLocaleSnapshot(base, locales);
  } else if (entityType === "PERSON") {
    const value = await db.person.findUnique({
      where: { id: entityId },
      select: { name: true, description: true, sourceUrl: true, locales: true },
    });
    if (!value) throw new NotFoundError("The proposed entity was not found.");
    return withLocaleSnapshot(
      { name: value.name, description: value.description, sourceUrl: value.sourceUrl },
      value.locales,
    );
  } else if (entityType === "EPISODE") {
    const episode = await db.episode.findUnique({
      where: { id: entityId },
      select: { title: true, number: true, airAt: true, sourceUrl: true, locales: true },
    });
    if (!episode) throw new NotFoundError("The proposed entity was not found.");
    return withLocaleSnapshot(
      {
        title: episode.title,
        number: episode.number,
        airAt: episode.airAt?.toISOString() ?? null,
        sourceUrl: episode.sourceUrl,
      },
      episode.locales,
    );
  } else {
    const value = await db.post.findUnique({
      where: { id: entityId },
      select: { title: true, body: true, sourceUrl: true },
    });
    if (!value) throw new NotFoundError("The proposed entity was not found.");
    return value as Record<string, JsonScalar>;
  }
}

function withLocaleSnapshot(
  base: Record<string, JsonScalar>,
  locales: Array<Record<string, unknown> & { locale: string }>,
) {
  const snapshot: Record<string, JsonScalar> = { ...base };
  for (const locale of locales) {
    for (const [fieldKey, value] of Object.entries(locale)) {
      if (["id", "locale", "seriesId", "characterId", "personId", "episodeId"].includes(fieldKey)) continue;
      if (typeof value === "string" || typeof value === "number" || typeof value === "boolean" || value === null) {
        snapshot[`locales.${locale.locale}.${fieldKey}`] = value;
      }
    }
  }
  return snapshot;
}

async function applyEntityChanges(
  tx: Prisma.TransactionClient,
  entityType: EntityType,
  entityId: string,
  values: Record<string, JsonScalar>,
) {
  const canonical = Object.fromEntries(
    Object.entries(values).filter(([fieldKey]) => !fieldKey.startsWith("locales.")),
  ) as Record<string, JsonScalar>;
  if (entityType === "SERIES") {
    await tx.series.update({
      where: { id: entityId },
      data: {
        title: canonical.title as string | undefined,
        summary: canonical.summary as string | undefined,
        bangumiUrl: canonical.bangumiUrl as string | null | undefined,
      },
    });
  } else if (entityType === "CHARACTER") {
    await tx.character.update({
      where: { id: entityId },
      data: {
        name: canonical.name as string | undefined,
        title: canonical.title as string | undefined,
        summary: canonical.summary as string | undefined,
        fandomPrompt: canonical.fandomPrompt as string | undefined,
        mood: canonical.mood as string | undefined,
        releaseSeason: canonical.releaseSeason as string | null | undefined,
        sourceTitle: canonical.sourceTitle as string | null | undefined,
        favoritePhrase: canonical.favoritePhrase as string | null | undefined,
      },
    });
  } else if (entityType === "PERSON") {
    await tx.person.update({
      where: { id: entityId },
      data: {
        name: canonical.name as string | undefined,
        description: canonical.description as string | undefined,
        sourceUrl: canonical.sourceUrl as string | null | undefined,
      },
    });
  } else if (entityType === "EPISODE") {
    await tx.episode.update({
      where: { id: entityId },
      data: {
        title: canonical.title as string | undefined,
        number: canonical.number as number | undefined,
        airAt:
          canonical.airAt === null
            ? null
            : typeof canonical.airAt === "string"
              ? new Date(canonical.airAt)
              : undefined,
        sourceUrl: canonical.sourceUrl as string | null | undefined,
      },
    });
  } else {
    await tx.post.update({
      where: { id: entityId },
      data: {
        title: canonical.title as string | undefined,
        body: canonical.body as string | undefined,
        sourceUrl: canonical.sourceUrl as string | null | undefined,
      },
    });
  }

  const base = await readEntitySnapshot(tx, entityType, entityId);
  for (const locale of ["EN", "ZH_HANT"] as const) {
    const prefix = `locales.${locale}.`;
    const localized = Object.fromEntries(
      Object.entries(values)
        .filter(([fieldKey]) => fieldKey.startsWith(prefix))
        .map(([fieldKey, value]) => [fieldKey.slice(prefix.length), value]),
    ) as Record<string, JsonScalar>;
    if (Object.keys(localized).length === 0) continue;

    if (entityType === "SERIES") {
      await tx.seriesLocale.upsert({
        where: { seriesId_locale: { seriesId: entityId, locale } },
        create: {
          seriesId: entityId,
          locale,
          title: (localized.title ?? base.title) as string,
          summary: (localized.summary ?? base.summary) as string,
        },
        update: {
          title: localized.title as string | undefined,
          summary: localized.summary as string | undefined,
        },
      });
    } else if (entityType === "CHARACTER") {
      await tx.characterLocale.upsert({
        where: { characterId_locale: { characterId: entityId, locale } },
        create: {
          characterId: entityId,
          locale,
          name: (localized.name ?? base.name) as string,
          title: (localized.title ?? base.title) as string,
          summary: (localized.summary ?? base.summary) as string,
          fandomPrompt: (localized.fandomPrompt ?? base.fandomPrompt) as string,
          mood: (localized.mood ?? base.mood) as string,
          favoritePhrase: (localized.favoritePhrase ?? base.favoritePhrase) as string | null,
        },
        update: {
          name: localized.name as string | undefined,
          title: localized.title as string | undefined,
          summary: localized.summary as string | undefined,
          fandomPrompt: localized.fandomPrompt as string | undefined,
          mood: localized.mood as string | undefined,
          favoritePhrase: localized.favoritePhrase as string | null | undefined,
        },
      });
    } else if (entityType === "PERSON") {
      await tx.personLocale.upsert({
        where: { personId_locale: { personId: entityId, locale } },
        create: {
          personId: entityId,
          locale,
          name: (localized.name ?? base.name) as string,
          description: (localized.description ?? base.description) as string,
        },
        update: {
          name: localized.name as string | undefined,
          description: localized.description as string | undefined,
        },
      });
    } else if (entityType === "EPISODE") {
      await tx.episodeLocale.upsert({
        where: { episodeId_locale: { episodeId: entityId, locale } },
        create: {
          episodeId: entityId,
          locale,
          title: (localized.title ?? base.title) as string,
        },
        update: { title: localized.title as string | undefined },
      });
    }
  }

  return readEntitySnapshot(tx, entityType, entityId);
}

export async function getCatalogCalendar(input: {
  from: Date;
  to: Date;
  locale?: string | null;
  userId?: string;
}) {
  if (Number.isNaN(input.from.getTime()) || Number.isNaN(input.to.getTime()) || input.to < input.from) {
    throw new AppError("Calendar range is invalid.", 422, "INVALID_DATE_RANGE");
  }
  if (input.to.getTime() - input.from.getTime() > 62 * 24 * 60 * 60 * 1_000) {
    throw new AppError("Calendar ranges cannot exceed 62 days.", 422, "DATE_RANGE_TOO_LARGE");
  }

  const locale = publicLocale(input.locale);
  const episodes = await prisma.episode.findMany({
    where: { airAt: { gte: input.from, lte: input.to } },
    include: {
      locales: { where: { locale } },
      series: {
        include: {
          locales: { where: { locale } },
          libraryEntries: input.userId ? { where: { userId: input.userId } } : false,
          ratings: input.userId ? { where: { userId: input.userId } } : false,
        },
      },
      progress: input.userId ? { where: { userId: input.userId } } : false,
    },
    orderBy: [{ airAt: "asc" }, { seriesId: "asc" }, { number: "asc" }],
  });

  return {
    from: input.from.toISOString(),
    to: input.to.toISOString(),
    locale: locale === "ZH_HANT" ? "zh-Hant" : "en",
    episodes: episodes.map((episode) => ({
      id: episode.id,
      number: episode.number,
      title: episode.locales[0]?.title ?? episode.title,
      airAt: episode.airAt?.toISOString() ?? null,
      sourceUrl: episode.sourceUrl,
      series: {
        id: episode.series.id,
        slug: episode.series.slug,
        title: episode.series.locales[0]?.title ?? episode.series.title,
        libraryStatus:
          "libraryEntries" in episode.series ? episode.series.libraryEntries[0]?.status ?? null : null,
        rating: "ratings" in episode.series ? episode.series.ratings[0]?.score ?? null : null,
      },
      progress: "progress" in episode ? episode.progress[0]?.status ?? null : null,
    })),
  };
}

export async function updateLibraryEntry(
  userId: string,
  seriesId: string,
  input: {
    status: LibraryStatus;
    private?: boolean;
    startedAt?: Date | null;
    completedAt?: Date | null;
    rating?: { score: number; note?: string | null; private?: boolean } | null;
  },
) {
  return withSerializableRetry(async (tx) => {
    const series = await tx.series.findUnique({ where: { id: seriesId }, select: { id: true } });
    if (!series) throw new NotFoundError("Series not found.");

    const now = new Date();
    const startedAt =
      input.startedAt === undefined && input.status === "WATCHING" ? now : input.startedAt;
    const completedAt =
      input.completedAt !== undefined ? input.completedAt : input.status === "COMPLETED" ? now : null;
    const entry = await tx.libraryEntry.upsert({
      where: { userId_seriesId: { userId, seriesId } },
      create: {
        userId,
        seriesId,
        status: input.status,
        private: input.private ?? false,
        startedAt: startedAt ?? null,
        completedAt: completedAt ?? null,
      },
      update: {
        status: input.status,
        private: input.private,
        startedAt,
        completedAt,
      },
      include: { series: { select: { id: true, slug: true, title: true } } },
    });

    let rating = await tx.userRating.findUnique({ where: { userId_seriesId: { userId, seriesId } } });
    if (input.rating === null) {
      await tx.userRating.deleteMany({ where: { userId, seriesId } });
      rating = null;
    } else if (input.rating) {
      rating = await tx.userRating.upsert({
        where: { userId_seriesId: { userId, seriesId } },
        create: {
          userId,
          seriesId,
          score: input.rating.score,
          note: input.rating.note,
          private: input.rating.private ?? input.private ?? false,
        },
        update: {
          score: input.rating.score,
          note: input.rating.note,
          private: input.rating.private,
        },
      });
    }

    return {
      ...entry,
      createdAt: entry.createdAt.toISOString(),
      updatedAt: entry.updatedAt.toISOString(),
      startedAt: entry.startedAt?.toISOString() ?? null,
      completedAt: entry.completedAt?.toISOString() ?? null,
      rating: rating
        ? {
            score: rating.score,
            note: rating.note,
            private: rating.private,
            updatedAt: rating.updatedAt.toISOString(),
          }
        : null,
    };
  });
}

export async function updateEpisodeProgress(
  userId: string,
  episodeId: string,
  status: EpisodeProgressStatus,
) {
  const episode = await prisma.episode.findUnique({
    where: { id: episodeId },
    select: { id: true, seriesId: true, number: true },
  });
  if (!episode) throw new NotFoundError("Episode not found.");

  return withSerializableRetry(async (tx) => {
    await tx.libraryEntry.upsert({
      where: { userId_seriesId: { userId, seriesId: episode.seriesId } },
      create: {
        userId,
        seriesId: episode.seriesId,
        status: status === "PLANNED" ? "WANT" : "WATCHING",
        startedAt: status === "WATCHED" ? new Date() : null,
      },
      update: {},
    });
    const progress = await tx.episodeProgress.upsert({
      where: { userId_episodeId: { userId, episodeId } },
      create: { userId, episodeId, status },
      update: { status },
    });
    return {
      episodeId: progress.episodeId,
      seriesId: episode.seriesId,
      episodeNumber: episode.number,
      status: progress.status,
      updatedAt: progress.updatedAt.toISOString(),
    };
  });
}

export async function submitEditProposal(authorId: string, input: CreateProposalInput) {
  const entityType = normalizeEntityType(input.entityType);
  const reason = input.reason.trim();
  if (reason.length < 8 || reason.length > 2_000) {
    throw new AppError("Explain the proposal in 8 to 2,000 characters.", 422, "INVALID_REASON");
  }
  const changes = validateProposalChanges(entityType, input.changes);

  return withSerializableRetry(async (tx) => {
    const snapshot = await readEntitySnapshot(tx, entityType, input.entityId);
    const prepared = changes.map((change) => {
      const oldValue = snapshot[change.fieldKey] ?? null;
      if (proposalValueMatches(oldValue, change.newValue)) {
        throw new AppError(`${change.fieldKey} is unchanged.`, 422, "UNCHANGED_FIELD");
      }
      return { ...change, oldValue };
    });

    if (input.proposalId) {
      const existing = await tx.editProposal.findFirst({
        where: { id: input.proposalId, authorId },
        select: { id: true, status: true, entityType: true, entityId: true },
      });
      if (!existing) throw new NotFoundError("Edit proposal not found.");
      if (!(["DRAFT", "NEEDS_CHANGES"] as EditProposalStatus[]).includes(existing.status)) {
        throw new ConflictError("Only draft or returned proposals can be resubmitted.", "PROPOSAL_CLOSED");
      }
      if (existing.entityType !== entityType || existing.entityId !== input.entityId) {
        throw new AppError("A resubmission cannot change its target entity.", 422, "TARGET_CHANGED");
      }
      await tx.proposalChange.deleteMany({ where: { proposalId: existing.id } });
      return tx.editProposal.update({
        where: { id: existing.id },
        data: {
          reason,
          status: "SUBMITTED",
          submittedAt: new Date(),
          changes: {
            create: prepared.map((change) => ({
              fieldKey: change.fieldKey,
              oldValue: toJsonInput(change.oldValue),
              newValue: toJsonInput(change.newValue),
              sourceUrl: change.sourceUrl,
            })),
          },
        },
        include: { changes: true, decisions: { orderBy: { createdAt: "asc" } } },
      });
    }

    return tx.editProposal.create({
      data: {
        authorId,
        entityType,
        entityId: input.entityId,
        reason,
        status: "SUBMITTED",
        submittedAt: new Date(),
        changes: {
          create: prepared.map((change) => ({
            fieldKey: change.fieldKey,
            oldValue: toJsonInput(change.oldValue),
            newValue: toJsonInput(change.newValue),
            sourceUrl: change.sourceUrl,
          })),
        },
      },
      include: { changes: true, decisions: true },
    });
  });
}

export async function listMyEditProposals(
  authorId: string,
  input: { status?: EditProposalStatus; cursor?: string; limit?: number },
) {
  const limit = Math.min(Math.max(input.limit ?? 20, 1), 50);
  const proposals = await prisma.editProposal.findMany({
    where: { authorId, status: input.status },
    include: {
      changes: { orderBy: { fieldKey: "asc" } },
      decisions: { orderBy: { createdAt: "asc" }, select: { decision: true, note: true, createdAt: true } },
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    cursor: input.cursor ? { id: input.cursor } : undefined,
    skip: input.cursor ? 1 : 0,
    take: limit + 1,
  });
  const hasMore = proposals.length > limit;
  const page = proposals.slice(0, limit);
  return {
    proposals: page.map(serializeProposal),
    nextCursor: hasMore ? page.at(-1)?.id ?? null : null,
  };
}

export async function listEntityRevisions(entityType: EntityType, entityId: string, limit = 30) {
  if (entityType === "POST") {
    const published = await prisma.post.findFirst({
      where: { id: entityId, status: "PUBLISHED" },
      select: { id: true },
    });
    if (!published) throw new NotFoundError("Published entity not found.");
  }
  if (entityType === "CHARACTER") {
    const published = await prisma.character.findFirst({
      where: { id: entityId, publishStatus: "PUBLISHED" },
      select: { id: true },
    });
    if (!published) throw new NotFoundError("Published entity not found.");
  }
  await readEntitySnapshot(prisma, entityType, entityId);
  const revisions = await prisma.entityRevision.findMany({
    where: { entityType, entityId },
    orderBy: { revision: "desc" },
    take: Math.min(Math.max(limit, 1), 100),
  });
  return revisions.map((revision) => ({ ...revision, createdAt: revision.createdAt.toISOString() }));
}

export async function decideEditProposal(
  reviewerId: string,
  proposalId: string,
  input: ProposalDecisionInput,
) {
  const note = input.note.trim();
  if (input.decision !== "APPROVE" && note.length < 4) {
    throw new AppError("A review note is required for this decision.", 422, "REVIEW_NOTE_REQUIRED");
  }

  return withSerializableRetry(async (tx) => {
    const proposal = await tx.editProposal.findUnique({
      where: { id: proposalId },
      include: { changes: { orderBy: { fieldKey: "asc" } } },
    });
    if (!proposal) throw new NotFoundError("Edit proposal not found.");
    if (proposal.status !== "SUBMITTED") {
      throw new ConflictError("This proposal is not awaiting review.", "PROPOSAL_CLOSED");
    }

    if (input.decision === "REQUEST_CHANGES") {
      await tx.reviewDecision.create({
        data: { proposalId, reviewerId, decision: input.decision, note },
      });
      const updated = await tx.editProposal.update({
        where: { id: proposalId },
        data: { status: "NEEDS_CHANGES" },
      });
      await Promise.all([
        tx.contributorTrustEvent.create({
          data: {
            userId: proposal.authorId,
            actorUserId: reviewerId,
            kind: "MODERATION_ACTION",
            points: 0,
            referenceId: proposalId,
            note,
          },
        }),
        createReviewNotification(tx, proposal.authorId, proposalId, "Changes requested", note),
      ]);
      return { proposal: serializeProposal(updated), revision: null };
    }

    if (input.decision === "REJECT") {
      await tx.reviewDecision.create({
        data: { proposalId, reviewerId, decision: input.decision, note },
      });
      const updated = await tx.editProposal.update({
        where: { id: proposalId },
        data: { status: "REJECTED" },
      });
      await Promise.all([
        tx.contributorTrustEvent.create({
          data: {
            userId: proposal.authorId,
            actorUserId: reviewerId,
            kind: "PROPOSAL_REJECTED",
            points: -2,
            referenceId: proposalId,
            note,
          },
        }),
        createReviewNotification(tx, proposal.authorId, proposalId, "Proposal not accepted", note),
      ]);
      return { proposal: serializeProposal(updated), revision: null };
    }

    const current = await readEntitySnapshot(tx, proposal.entityType, proposal.entityId);
    assertProposalFresh(current, proposal.changes);
    const values: Record<string, JsonScalar> = {};
    for (const change of proposal.changes) {
      const parsed = validateProposalChanges(proposal.entityType, [
        { fieldKey: change.fieldKey, newValue: change.newValue, sourceUrl: change.sourceUrl },
      ])[0];
      values[change.fieldKey] = parsed.newValue;
    }

    const snapshot = await applyEntityChanges(tx, proposal.entityType, proposal.entityId, values);
    const latest = await tx.entityRevision.findFirst({
      where: { entityType: proposal.entityType, entityId: proposal.entityId },
      orderBy: { revision: "desc" },
      select: { revision: true },
    });
    const revision = await tx.entityRevision.create({
      data: {
        entityType: proposal.entityType,
        entityId: proposal.entityId,
        revision: nextRevisionNumber(latest?.revision),
        snapshot: snapshot as Prisma.InputJsonValue,
        summary: proposal.reason,
        actorUserId: reviewerId,
      },
    });
    await tx.sourceCitation.createMany({
      data: proposal.changes.map((change) => ({
        entityType: proposal.entityType,
        entityId: proposal.entityId,
        fieldKey: change.fieldKey,
        sourceLabel: new URL(change.sourceUrl).hostname.replace(/^www\./, ""),
        sourceUrl: change.sourceUrl,
      })),
    });
    await tx.reviewDecision.create({
      data: { proposalId, reviewerId, decision: "APPROVE", note: note || "Sources verified and changes approved." },
    });
    const updated = await tx.editProposal.update({
      where: { id: proposalId },
      data: { status: "APPROVED" },
    });
    await Promise.all([
      tx.contributorTrustEvent.create({
        data: {
          userId: proposal.authorId,
          actorUserId: reviewerId,
          kind: "PROPOSAL_ACCEPTED",
          points: 10,
          referenceId: proposalId,
          note: note || proposal.reason,
        },
      }),
      createReviewNotification(tx, proposal.authorId, proposalId, "Proposal approved", "Your sourced catalog edit is now live."),
    ]);

    return {
      proposal: serializeProposal(updated),
      revision: { ...revision, createdAt: revision.createdAt.toISOString() },
    };
  });
}

async function createReviewNotification(
  tx: Prisma.TransactionClient,
  userId: string,
  proposalId: string,
  title: string,
  body: string,
) {
  return tx.notification.create({
    data: {
      userId,
      type: "SOCIAL",
      title,
      body,
      href: `/me?proposal=${encodeURIComponent(proposalId)}`,
      metadata: { proposalId },
    },
  });
}

export async function reviewCommunityPost(reviewerId: string, postId: string, input: PostReviewInput) {
  const note = input.note.trim();
  if (input.decision !== "APPROVE" && note.length < 4) {
    throw new AppError("A review note is required for this decision.", 422, "REVIEW_NOTE_REQUIRED");
  }

  return withSerializableRetry(async (tx) => {
    const post = await tx.post.findUnique({
      where: { id: postId },
      include: {
        media: {
          include: {
            asset: {
              select: { workflowStatus: true, permissionStatus: true, contentRating: true },
            },
          },
        },
      },
    });
    if (!post) throw new NotFoundError("Post not found.");

    const targetStatus =
      input.decision === "APPROVE" ? "PUBLISHED" : input.decision === "REQUEST_CHANGES" ? "HELD" : "REMOVED";
    if (post.status === targetStatus) {
      const creator = await tx.creatorProfile.findUnique({ where: { userId: post.authorId } });
      return { post: serializePost(post), creator, replayed: true };
    }
    if (!(["PENDING_REVIEW", "HELD"] as const).includes(post.status as "PENDING_REVIEW" | "HELD")) {
      throw new ConflictError("This post is not awaiting moderation.", "POST_NOT_REVIEWABLE");
    }

    if (input.decision === "APPROVE") {
      for (const media of post.media) {
        if (media.status === "REJECTED" || media.status === "PULLED") {
          throw new AppError(
            "Rejected or pulled media must be replaced before publishing.",
            422,
            "MEDIA_REVIEW_INCOMPLETE",
          );
        }
        const approvedAsset =
          media.asset?.workflowStatus === "PUBLISHED" &&
          media.asset.permissionStatus !== "REJECTED" &&
          media.asset.permissionStatus !== "TAKEDOWN_REQUESTED" &&
          media.asset.contentRating === "SFW";
        const sourcedDirectMedia =
          !media.assetId &&
          Boolean(media.altText.trim()) &&
          Boolean(media.sourceLabel?.trim()) &&
          Boolean(media.sourceUrl?.startsWith("https://")) &&
          Boolean(media.publicUrl || media.storageKey);
        if (!approvedAsset && !sourcedDirectMedia) {
          throw new AppError(
            "Every image must be SFW, source-labelled, and individually reviewable before publishing.",
            422,
            "MEDIA_REVIEW_INCOMPLETE",
          );
        }
      }
    }

    const mediaUpdate =
      input.decision === "REQUEST_CHANGES"
        ? undefined
        : {
            updateMany: {
              where: { status: "PENDING_REVIEW" as const },
              data: {
                status: input.decision === "APPROVE" ? ("APPROVED" as const) : ("REJECTED" as const),
                reviewedAt: new Date(),
                reviewedById: reviewerId,
              },
            },
          };
    const updatedPost = await tx.post.update({
      where: { id: postId },
      data: {
        status: targetStatus,
        publishedAt: input.decision === "APPROVE" ? post.publishedAt ?? new Date() : null,
        media: mediaUpdate,
      },
      include: { media: { orderBy: { sortOrder: "asc" } } },
    });

    let creator = await tx.creatorProfile.findUnique({ where: { userId: post.authorId } });
    if (input.decision === "APPROVE") {
      const next = nextCreatorApprovalState(creator?.approvedPostCount ?? 0);
      creator = await tx.creatorProfile.upsert({
        where: { userId: post.authorId },
        create: { userId: post.authorId, ...next },
        update: next,
      });
    }

    await Promise.all([
      tx.contributorTrustEvent.create({
        data: {
          userId: post.authorId,
          actorUserId: reviewerId,
          kind: "MODERATION_ACTION",
          points: input.decision === "APPROVE" ? 2 : input.decision === "REJECT" ? -2 : 0,
          referenceId: postId,
          note: note || `Post review: ${input.decision}`,
        },
      }),
      tx.notification.create({
        data: {
          userId: post.authorId,
          type: "SOCIAL",
          title: input.decision === "APPROVE" ? "Post approved" : input.decision === "REQUEST_CHANGES" ? "Post needs changes" : "Post not published",
          body: note || (input.decision === "APPROVE" ? "Your post is now part of the community feed." : "Open the creator desk for review details."),
          href: `/posts/${post.slug}`,
          metadata: { postId, decision: input.decision },
        },
      }),
    ]);

    return { post: serializePost(updatedPost), creator, replayed: false };
  });
}

export async function getKnowledgeAdminSnapshot() {
  const [counts, proposals, revisions, recentSnapshots, recentPeople] = await Promise.all([
    Promise.all([
      prisma.episode.count(),
      prisma.person.count(),
      prisma.entityRelation.count(),
      prisma.sourceCitation.count(),
      prisma.externalSnapshot.count(),
      prisma.libraryEntry.count(),
      prisma.episodeProgress.count(),
      prisma.userRating.count(),
      prisma.curatedList.count(),
      prisma.contributorTrustEvent.count(),
    ]),
    prisma.editProposal.findMany({
      where: { status: { in: ["SUBMITTED", "NEEDS_CHANGES"] } },
      include: {
        changes: { orderBy: { fieldKey: "asc" } },
        author: { select: { name: true, email: true, profile: { select: { handle: true } } } },
        decisions: { orderBy: { createdAt: "asc" } },
      },
      orderBy: { createdAt: "asc" },
      take: 100,
    }),
    prisma.entityRevision.findMany({ orderBy: { createdAt: "desc" }, take: 20 }),
    prisma.externalSnapshot.findMany({ orderBy: { retrievedAt: "desc" }, take: 10 }),
    prisma.person.findMany({
      include: { locales: { orderBy: { locale: "asc" } } },
      orderBy: { updatedAt: "desc" },
      take: 10,
    }),
  ]);

  const [episodes, people, relations, citations, snapshots, library, progress, ratings, lists, trustEvents] = counts;
  return {
    counts: { episodes, people, relations, citations, snapshots, library, progress, ratings, lists, trustEvents },
    proposals: proposals.map((proposal) => ({
      ...serializeProposal(proposal),
      author: {
        name: proposal.author.name,
        email: proposal.author.email,
        handle: proposal.author.profile?.handle ?? null,
      },
    })),
    revisions: revisions.map((revision) => ({ ...revision, createdAt: revision.createdAt.toISOString() })),
    recentSnapshots: recentSnapshots.map((snapshot) => ({
      id: snapshot.id,
      provider: snapshot.provider,
      entityType: snapshot.entityType,
      entityId: snapshot.entityId,
      externalId: snapshot.externalId,
      sourceUrl: snapshot.sourceUrl,
      checksum: snapshot.checksum,
      retrievedAt: snapshot.retrievedAt.toISOString(),
    })),
    recentPeople: recentPeople.map((person) => ({
      id: person.id,
      slug: person.slug,
      name: person.name,
      sourceUrl: person.sourceUrl,
      locales: person.locales.map((locale) => ({
        locale: locale.locale,
        name: locale.name,
        description: locale.description,
      })),
    })),
  };
}

export async function getCommunityAdminSnapshot() {
  const [posts, creatorCount, probationCount] = await Promise.all([
    prisma.post.findMany({
      where: { status: { in: ["PENDING_REVIEW", "HELD"] } },
      include: {
        author: { select: { name: true, email: true, profile: { select: { handle: true } } } },
        media: { orderBy: { sortOrder: "asc" } },
      },
      orderBy: { createdAt: "asc" },
      take: 100,
    }),
    prisma.creatorProfile.count(),
    prisma.creatorProfile.count({ where: { probationComplete: false } }),
  ]);
  return {
    creatorCount,
    probationCount,
    posts: posts.map((post) => ({
      ...serializePost(post),
      author: {
        name: post.author.name,
        email: post.author.email,
        handle: post.author.profile?.handle ?? null,
      },
    })),
  };
}

function serializeProposal<T extends {
  id: string;
  entityType: EntityType;
  entityId: string;
  status: EditProposalStatus;
  reason: string;
  createdAt: Date;
  updatedAt: Date;
  submittedAt: Date | null;
}>(proposal: T) {
  return {
    ...proposal,
    createdAt: proposal.createdAt.toISOString(),
    updatedAt: proposal.updatedAt.toISOString(),
    submittedAt: proposal.submittedAt?.toISOString() ?? null,
  };
}

function serializePost<T extends {
  id: string;
  slug: string;
  authorId: string;
  status: string;
  title: string;
  body: string;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}>(post: T) {
  return {
    ...post,
    publishedAt: post.publishedAt?.toISOString() ?? null,
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString(),
  };
}
