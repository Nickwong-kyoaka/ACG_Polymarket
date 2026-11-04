import { prisma } from "@/lib/prisma";
import { safeRoomMediaUrl, type RoomMedia } from "@/components/room-ui";
import type { ComfortContent } from "@/lib/types";
import { publicAssetWhere } from "@/lib/public-assets";

export async function getPublishedRoomMedia(ids: Array<string | undefined>): Promise<RoomMedia[]> {
  const unique = [...new Set(ids.filter((id): id is string => Boolean(id)))];
  if (!unique.length) return [];
  const assets = await prisma.characterAsset.findMany({
    where: { ...publicAssetWhere, id: { in: unique } },
    select: { id: true, kind: true, publicUrl: true, storageKey: true, altText: true, label: true },
  });
  return assets.flatMap((asset) => {
    const url = safeRoomMediaUrl(asset.publicUrl) ?? safeRoomMediaUrl(`/${asset.storageKey}`);
    return url ? [{ id: asset.id, kind: asset.kind, url, alt: asset.altText, label: asset.label }] : [];
  });
}

export type ComfortMediaView = {
  audio?: RoomMedia;
  comic?: RoomMedia;
  panels: Array<{ id: string; imageUrl: string; altText: string; caption: string }>;
};

export async function getComfortRoomMedia(contents: ComfortContent[], ownedItemIds: string[], locale: "en" | "zh-Hant"): Promise<ComfortMediaView> {
  const accessible = contents.filter((content) => content.published && (!content.unlockShopItemId || ownedItemIds.includes(content.unlockShopItemId)));
  const assets = await getPublishedRoomMedia(accessible.map((content) => content.assetId));
  const audioContent = accessible.find((content) => ["VOICE", "ASMR"].includes(content.kind) && (assets.some((asset) => asset.id === content.assetId && asset.kind === "VOICE") || (!content.assetId && safeRoomMediaUrl(content.mediaUrl))));
  const audio = audioContent ? assets.find((asset) => asset.id === audioContent.assetId && asset.kind === "VOICE") ?? { id: audioContent.id, kind: "VOICE", url: safeRoomMediaUrl(audioContent.mediaUrl)!, alt: audioContent.title, label: audioContent.title } : undefined;
  const comicIds = accessible.filter((content) => content.kind === "COMIC" && (!content.assetId || assets.some((asset) => asset.id === content.assetId))).map((content) => content.id);
  const panels = comicIds.length ? await prisma.comicPanel.findMany({
    where: { contentId: { in: comicIds } },
    select: { id: true, contentId: true, imageUrl: true, altText: true, sortOrder: true, locales: { where: { locale: locale === "zh-Hant" ? "ZH_HANT" : "EN" }, select: { caption: true } } },
    orderBy: { sortOrder: "asc" },
  }) : [];
  const firstComic = comicIds.find((id) => panels.some((panel) => panel.contentId === id));
  const comicContent = accessible.find((content) => content.kind === "COMIC" && (assets.some((asset) => asset.id === content.assetId) || (!content.assetId && safeRoomMediaUrl(content.mediaUrl))));
  const comic = comicContent ? assets.find((asset) => asset.id === comicContent.assetId) ?? { id: comicContent.id, kind: "COMIC", url: safeRoomMediaUrl(comicContent.mediaUrl)!, alt: comicContent.title, label: comicContent.title } : undefined;
  return {
    audio,
    comic,
    panels: panels.filter((panel) => panel.contentId === firstComic).flatMap((panel) => {
      const imageUrl = safeRoomMediaUrl(panel.imageUrl);
      return imageUrl ? [{ id: panel.id, imageUrl, altText: panel.altText, caption: panel.locales[0]?.caption ?? "" }] : [];
    }),
  };
}
