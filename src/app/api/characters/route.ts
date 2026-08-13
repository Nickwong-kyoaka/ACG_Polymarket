import { apiOk, handleApiError } from "@/lib/api";
import { getCommentCount, getWatchlistIds, listCharacters } from "@/lib/store";
import { getBuyQuote, getSellQuote } from "@/lib/market";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") ?? undefined;
    const tag = searchParams.get("tag") ?? undefined;
    const rightsType = searchParams.get("rightsType") ?? undefined;
    const locale = searchParams.get("locale") === "zh-Hant" ? "zh-Hant" : "en";
    const watchlistIds = await getWatchlistIds();

    const characters = await listCharacters({ search, tag, rightsType, locale });
    const items = await Promise.all(
      characters.map(async (character) => ({
        ...character,
        quote: getBuyQuote(character),
        sellQuote: getSellQuote(character),
        commentCount: await getCommentCount(character.id),
        watching: watchlistIds.includes(character.id),
      })),
    );

    return apiOk({ items });
  } catch (error) {
    return handleApiError(error);
  }
}
