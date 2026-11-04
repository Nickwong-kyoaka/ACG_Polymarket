import Image from "next/image";
import { pick, type PublicLocale } from "@/components/acg-locale";
import { safeRoomMediaUrl, type RoomAppearance, type RoomMedia } from "@/components/room-ui";

export function ProfileAppearance({ profile, assets, locale, preview = false }: { profile: RoomAppearance; assets: RoomMedia[]; locale: PublicLocale; preview?: boolean }) {
  const frame = assets.find((asset) => asset.id === profile.equippedFrameAsset && asset.kind === "AVATAR_FRAME" && safeRoomMediaUrl(asset.url));
  const theme = assets.find((asset) => asset.id === profile.equippedThemeAsset && asset.kind === "PROFILE_THEME" && safeRoomMediaUrl(asset.url));
  return <div className="relative isolate overflow-hidden rounded-[22px_5px_22px_5px] border border-white/15 bg-[#283338] p-6 text-white">
    {theme ? <Image src={theme.url} alt={theme.alt} fill sizes="(min-width: 768px) 40vw, 100vw" className="-z-10 object-cover opacity-60" unoptimized /> : null}
    <div className="flex flex-wrap items-center gap-5"><div className="relative grid h-28 w-28 shrink-0 place-items-center rounded-full bg-[#111827]/80 text-4xl font-black"><span aria-hidden="true">{profile.displayName.slice(0, 1)}</span>{frame ? <Image src={frame.url} alt={frame.alt} fill sizes="112px" className="object-contain" unoptimized /> : null}</div><div><p className="text-[10px] font-black uppercase tracking-[.18em] text-[#ffcc66]">{preview ? pick(locale, "Preview only · not equipped", "僅供預覽 · 尚未裝備") : pick(locale, "Current room appearance", "目前房間外觀")}</p><p className="mt-2 font-display text-3xl">{profile.displayName}</p><p className="mt-2 text-xs">{[frame?.label, theme?.label].filter(Boolean).join(" · ") || pick(locale, "Original room look", "房間原始外觀")}</p></div></div>
  </div>;
}
