import { headers } from "next/headers";
import { normalizeLocale } from "@/lib/i18n";

export async function getRequestLocale() {
  const requestHeaders = await headers();
  return normalizeLocale(requestHeaders.get("x-acg-locale"));
}
