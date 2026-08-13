import { cookies, headers } from "next/headers";
import { permanentRedirect } from "next/navigation";
import { localePath, normalizePublicLocale, type PublicLocale } from "@/components/acg-locale";

type LegacySearchParams = Promise<Record<string, string | string[] | undefined>>;

function languageFromHeader(value: string | null): PublicLocale {
  return value?.toLowerCase().includes("zh") ? "zh-Hant" : "en";
}

export async function LegacyRedirect({
  path,
  searchParams,
}: {
  path: string;
  searchParams?: LegacySearchParams;
}): Promise<never> {
  const [cookieStore, headerStore, incoming] = await Promise.all([
    cookies(),
    headers(),
    searchParams ?? Promise.resolve({}),
  ]);
  const requestValues = incoming as Record<string, string | string[] | undefined>;
  const requestedLanguage = Array.isArray(requestValues.lang) ? requestValues.lang[0] : requestValues.lang;
  const locale = requestedLanguage
    ? normalizePublicLocale(requestedLanguage)
    : cookieStore.get("acg-locale")?.value
      ? normalizePublicLocale(cookieStore.get("acg-locale")?.value)
      : languageFromHeader(headerStore.get("accept-language"));
  const query = new URLSearchParams();

  for (const [key, value] of Object.entries(requestValues)) {
    if (key === "lang" || value === undefined) continue;
    for (const entry of Array.isArray(value) ? value : [value]) query.append(key, entry);
  }

  const target = localePath(locale, path);
  return permanentRedirect(query.size ? `${target}?${query.toString()}` : target);
}
