export type SocialFeedTab = "for-you" | "following" | "seasonal";

export interface SocialNoteMedia {
  id: string;
  url: string | null;
  altText: string;
  sourceLabel: string | null;
  sourceUrl: string | null;
}

export interface SocialNote {
  id: string;
  slug: string;
  href?: string;
  kind: string;
  title: string;
  body: string;
  publishedAt: string | null;
  viewCount: number;
  recommendationReason?: string | null;
  author: {
    id: string;
    handle: string;
    displayName: string;
    imageUrl: string | null;
  };
  character: {
    id: string;
    slug: string;
    name: string;
    title: string;
    accentFrom: string;
    accentTo: string;
  } | null;
  series: { id: string; slug: string; title: string } | null;
  media: SocialNoteMedia[];
  topics: Array<{ slug: string; title: string }>;
  counts: { saves: number; reactions: number; comments: number };
  viewer: { saved: boolean; followingAuthor: boolean; followingCharacter: boolean };
}

export interface SocialFeedPayload {
  items: SocialNote[];
  nextCursor: string | null;
  topics?: Array<{ slug: string; title: string; description?: string }>;
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

function text(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function number(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function boolean(value: unknown) {
  return value === true;
}

function imageUrl(value: Record<string, unknown>) {
  const direct = text(value.url) || text(value.publicUrl);
  if (direct.startsWith("https://") || direct.startsWith("/")) return direct;
  const derivative = Array.isArray(value.derivatives) ? record(value.derivatives[0]) : {};
  const derivativeUrl = text(derivative.publicUrl);
  if (derivativeUrl.startsWith("https://") || derivativeUrl.startsWith("/")) return derivativeUrl;
  const storageKey = text(value.storageKey);
  return storageKey.startsWith("assets/") ? `/${storageKey}` : null;
}

export function normalizeSocialNote(value: unknown): SocialNote | null {
  const item = record(value);
  const id = text(item.id);
  const slug = text(item.slug);
  const title = text(item.title);
  if (!id || !slug || !title) return null;

  const rawAuthor = record(item.author);
  const authorProfile = record(rawAuthor.profile);
  const rawCharacter = record(item.character ?? item.primaryCharacter);
  const rawSeries = record(item.series);
  const rawCounts = record(item.counts ?? item.metrics ?? item._count);
  const rawViewer = record(item.viewer);
  const rawMedia = Array.isArray(item.media) ? item.media : item.primaryImage ? [item.primaryImage] : [];
  const rawTopics = Array.isArray(item.topics) ? item.topics : [];

  return {
    id,
    slug,
    href: text(item.href) || undefined,
    kind: text(item.kind, "NOTE"),
    title,
    body: text(item.body, text(item.description)),
    publishedAt: text(item.publishedAt) || text(item.createdAt) || null,
    viewCount: number(item.viewCount),
    recommendationReason: text(item.recommendationReason) || null,
    author: {
      id: text(rawAuthor.id, "editorial"),
      handle: text(authorProfile.handle, text(rawAuthor.handle, "acg-desk")),
      displayName: text(authorProfile.displayName, text(rawAuthor.displayName, text(rawAuthor.name, "ACG Exchange Desk"))),
      imageUrl: text(rawAuthor.imageUrl, text(rawAuthor.image)) || null,
    },
    character: text(rawCharacter.id) ? {
      id: text(rawCharacter.id),
      slug: text(rawCharacter.slug),
      name: text(rawCharacter.name),
      title: text(rawCharacter.title),
      accentFrom: text(rawCharacter.accentFrom, "#c85d5a"),
      accentTo: text(rawCharacter.accentTo, "#5f8f87"),
    } : null,
    series: text(rawSeries.id) ? { id: text(rawSeries.id), slug: text(rawSeries.slug), title: text(rawSeries.title) } : null,
    media: rawMedia.map((entry, index) => {
      const media = record(entry);
      const asset = Object.keys(record(media.asset)).length ? record(media.asset) : media;
      return {
        id: text(media.id, `${id}-media-${index}`),
        url: imageUrl(asset) ?? imageUrl(media),
        altText: text(media.altText, text(asset.altText, `${title} visual`)),
        sourceLabel: text(media.sourceLabel, text(asset.sourceLabel)) || null,
        sourceUrl: text(media.sourceUrl, text(asset.sourceUrl)) || null,
      };
    }),
    topics: rawTopics.map((entry) => {
      const wrapper = record(entry);
      const topic = Object.keys(record(wrapper.topic)).length ? record(wrapper.topic) : wrapper;
      return { slug: text(topic.slug), title: text(topic.title, text(topic.slug)) };
    }).filter((topic) => topic.slug),
    counts: {
      saves: number(rawCounts.saves),
      reactions: number(rawCounts.reactions),
      comments: number(rawCounts.comments),
    },
    viewer: {
      saved: boolean(rawViewer.saved ?? item.saved),
      followingAuthor: boolean(rawViewer.followingAuthor),
      followingCharacter: boolean(rawViewer.followingCharacter),
    },
  };
}

export function normalizeFeedPayload(value: unknown): SocialFeedPayload | null {
  const payload = record(value);
  if (!Array.isArray(payload.items)) return null;
  const items = payload.items.flatMap((entry) => {
    const note = normalizeSocialNote(entry);
    return note ? [note] : [];
  });
  const topics = Array.isArray(payload.topics) ? payload.topics.map((entry) => {
    const topic = record(entry);
    return { slug: text(topic.slug), title: text(topic.title, text(topic.slug)), description: text(topic.description) };
  }).filter((topic) => topic.slug) : undefined;
  return { items, nextCursor: text(payload.nextCursor) || null, topics };
}
