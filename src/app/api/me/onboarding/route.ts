import { z } from "zod";
import { AppError, apiOk, handleApiError, parseJson } from "@/lib/api";
import { requireSessionUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const onboardingSchema = z.object({
  locale: z.enum(["en", "zh-Hant"]),
  favoriteTags: z.array(z.string().trim().min(1).max(40)).min(1).max(5).transform((values) => [...new Set(values)]),
  characterIds: z.array(z.string().trim().min(1)).min(1).max(3).transform((values) => [...new Set(values)]),
});

export async function POST(request: Request) {
  try {
    const userId = await requireSessionUserId();
    const input = onboardingSchema.parse(await parseJson(request));
    const publishedCharacters = await prisma.character.findMany({
      where: { id: { in: input.characterIds }, publishStatus: "PUBLISHED" },
      select: { id: true },
    });
    if (publishedCharacters.length !== input.characterIds.length) {
      throw new AppError("One or more selected characters are unavailable.", 422, "INVALID_CHARACTER_SELECTION");
    }

    const completedAt = new Date();
    const result = await prisma.$transaction(async (tx) => {
      const profile = await tx.profile.update({
        where: { userId },
        data: {
          favoriteTags: input.favoriteTags,
          preferredLocale: input.locale === "zh-Hant" ? "ZH_HANT" : "EN",
          onboardingCompletedAt: completedAt,
        },
        select: { handle: true, favoriteTags: true, preferredLocale: true, onboardingCompletedAt: true },
      });
      await tx.characterFollow.deleteMany({ where: { userId } });
      await tx.characterFollow.createMany({
        data: publishedCharacters.map(({ id }) => ({ userId, characterId: id })),
        skipDuplicates: true,
      });
      return { profile, characterIds: publishedCharacters.map(({ id }) => id) };
    });

    const response = apiOk({
      ...result,
      profile: { ...result.profile, onboardingCompletedAt: result.profile.onboardingCompletedAt?.toISOString() ?? null },
    });
    response.cookies.set("acg-locale", input.locale, { httpOnly: false, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 365 });
    return response;
  } catch (error) {
    return handleApiError(error);
  }
}
