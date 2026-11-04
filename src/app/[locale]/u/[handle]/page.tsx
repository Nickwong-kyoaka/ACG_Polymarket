import { notFound } from "next/navigation";
import Link from "next/link";
import { CharacterArt } from "@/components/character-art";
import { isPublicLocale, localePath, localizeCharacter, pick } from "@/components/acg-locale";
import { getUserByHandle } from "@/lib/store";
import { FollowButton } from "@/components/follow-button";
import { ProfileAppearance } from "@/components/profile-appearance";
import { getPublishedRoomMedia } from "@/components/room-media.server";

export const dynamic = "force-dynamic";

export default async function PublicProfilePage({ params }: { params: Promise<{ locale: string; handle: string }> }) {
  const { locale, handle } = await params;
  if (!isPublicLocale(locale)) notFound();
  const result = await getUserByHandle(handle).catch(() => null);
  if (!result) notFound();
  const { profile, positions } = result;
  const assets = await getPublishedRoomMedia([profile.equippedFrameAsset, profile.equippedThemeAsset]);
  const pinned = profile.pinnedCharacterIds.flatMap((id) => { const character = result.pinnedCharacters.find((entry) => entry.id === id); return character ? [{ character }] : []; });
  const favorites = pinned.length ? pinned : profile.holdingsVisibility ? positions.slice(0, 3) : [];
  return <div className="exchange-page"><ProfileAppearance profile={profile} assets={assets} locale={locale} /><header className="flex flex-wrap items-center justify-between gap-4"><div><h1 className="text-2xl font-extrabold">{profile.displayName}</h1><p className="mt-1 text-sm text-slate-500">@{profile.handle}</p></div><FollowButton targetType="user" targetId={result.user.id} locale={locale} /></header>{profile.bio ? <p className="max-w-3xl whitespace-pre-wrap leading-8 text-slate-600">{profile.bio}</p> : null}<section><h2 className="mb-4 text-xl font-bold">{pick(locale, "Favorite characters", "喜歡的角色")}</h2>{!favorites.length ? <p className="exchange-panel p-6 text-sm text-slate-500">{pick(locale, "No favorites are on display yet.", "目前尚未展示本命。")}</p> : null}<div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">{favorites.map((position) => { const character = localizeCharacter(position.character, locale); return <Link key={character.id} href={localePath(locale, `/character/${character.slug}`)} className="exchange-panel overflow-hidden"><CharacterArt locale={locale} character={character} className="!min-h-0 aspect-[4/5]" sizes="(min-width: 1024px) 25vw, 50vw" /><div className="p-3"><p className="text-sm font-bold">{character.name}</p><p className="mt-1 text-xs text-slate-500">{character.sourceTitle ?? character.title}</p></div></Link>; })}</div></section></div>;
}
