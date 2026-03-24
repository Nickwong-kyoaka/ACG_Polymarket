import { apiOk } from "@/lib/api";
import { getCommentCount, getWatchlistIds, listCharacters } from "@/lib/store";
import { getBuyQuote, getSellQuote } from "@/lib/market";

export function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") ?? undefined;
  const tag = searchParams.get("tag") ?? undefined;
  const rightsType = searchParams.get("rightsType") ?? undefined;
  const watchlistIds = getWatchlistIds();

  const items = listCharacters({ search, tag, rightsType }).map((character) => ({
    ...character,
    quote: getBuyQuote(character),
    sellQuote: getSellQuote(character),
    commentCount: getCommentCount(character.id),
    watching: watchlistIds.includes(character.id),
  }));

  return apiOk({ items });
}
