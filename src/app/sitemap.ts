import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

function siteOrigin() {
  const configured = process.env.NEXTAUTH_URL ?? process.env.AUTH_URL ?? "http://localhost:3000";
  try { return new URL(configured).origin; } catch { return "http://localhost:3000"; }
}

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = siteOrigin();
  const locales = ["en", "zh-Hant"] as const;
  const staticPaths = ["", "/community", "/market", "/predictions", "/campaigns", "/gallery", "/comfort", "/shop", "/sources", "/help/market-rules"];
  const [characters, campaigns, posts, predictions] = await Promise.all([
    prisma.character.findMany({ where: { publishStatus: "PUBLISHED" }, select: { slug: true, updatedAt: true } }).catch(() => []),
    prisma.supportCampaign.findMany({ where: { status: { in: ["ACTIVE", "COMPLETED"] } }, select: { slug: true, updatedAt: true } }).catch(() => []),
    prisma.post.findMany({ where: { status: "PUBLISHED" }, select: { slug: true, updatedAt: true } }).catch(() => []),
    prisma.predictionMarket.findMany({ where: { status: { not: "DRAFT" } }, select: { slug: true, updatedAt: true } }).catch(() => []),
  ]);

  const localized = (path: string, lastModified: Date, priority: number): MetadataRoute.Sitemap => locales.map((locale) => ({
    url: `${origin}/${locale}${path}`,
    lastModified,
    changeFrequency: path === "/community" || path === "/predictions" ? "hourly" : "daily",
    priority,
    alternates: { languages: { en: `${origin}/en${path}`, "zh-Hant": `${origin}/zh-Hant${path}` } },
  }));
  const now = new Date();

  return [
    ...staticPaths.flatMap((path) => localized(path, now, path === "" ? 1 : .8)),
    ...characters.flatMap((item) => localized(`/character/${item.slug}`, item.updatedAt, .8)),
    ...campaigns.flatMap((item) => localized(`/campaigns/${item.slug}`, item.updatedAt, .65)),
    ...posts.flatMap((item) => localized(`/posts/${item.slug}`, item.updatedAt, .75)),
    ...predictions.flatMap((item) => localized(`/predictions/${item.slug}`, item.updatedAt, .75)),
  ];
}
