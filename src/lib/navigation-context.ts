import { localePath, type PublicLocale } from "@/components/acg-locale";

const pageParameters = new Set(["feed", "feedFrom", "tab", "range", "search", "q", "tag", "season", "mood", "rightsType", "watching", "sort", "cursor", "edit", "post", "status", "outcome"]);

export function localizedContextPath(locale: PublicLocale, path: string, query: string, hash = "") {
  const retained = new URLSearchParams();
  for (const [key, value] of new URLSearchParams(query)) {
    if (pageParameters.has(key) && value.length <= 500) retained.append(key, value);
  }
  const suffix = retained.toString();
  const anchor = /^#[a-z][\w-]{0,80}$/i.test(hash) ? hash : "";
  return `${localePath(locale, path)}${suffix ? `?${suffix}` : ""}${anchor}`;
}
