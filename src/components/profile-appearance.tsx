import Image from "next/image";
import { pick, type PublicLocale } from "@/components/acg-locale";
import { safeRoomMediaUrl, type RoomAppearance, type RoomMedia } from "@/components/room-ui";

export function ProfileAppearance({ profile, assets, locale, preview = false }: { profile: RoomAppearance; assets: RoomMedia[]; locale: PublicLocale; preview?: boolean }) {
  const frame = assets.find((asset) => asset.id === profile.equippedFrameAsset && asset.kind === "AVATAR_FRAME" && safeRoomMediaUrl(asset.url));
  const theme = assets.find((asset) => asset.id === profile.equippedThemeAsset && asset.kind === "PROFILE_THEME" && safeRoomMediaUrl(asset.url));
  return <div className={`relative isolate overflow-hidden rounded-xl border p-5 ${theme ? "border-slate-700 bg-slate-800 text-white" : "border-slate-200 bg-white text-slate-800"}`}>
    {theme ? <><Image src={theme.url} alt={theme.alt} fill sizes="(min-width: 768px) 60vw, 100vw" className="-z-20 object-cover" unoptimized /><div className="absolute inset-0 -z-10 bg-slate-950/70" /></> : null}
    <div className="flex items-center gap-4"><div className="relative grid h-20 w-20 shrink-0 place-items-center rounded-full bg-slate-100 text-3xl font-bold text-slate-700 sm:h-24 sm:w-24"><span aria-hidden="true">{profile.displayName.slice(0, 1)}</span>{frame ? <Image src={frame.url} alt={frame.alt} fill sizes="96px" className="object-contain" unoptimized /> : null}</div><div className="min-w-0"><p className={`text-xs font-bold ${theme ? "text-white" : "text-slate-600"}`}>{preview ? pick(locale, "Preview only · not equipped", "僅供預覽 · 尚未裝備") : pick(locale, "Current room appearance", "目前房間外觀")}</p><p className="mt-1 break-words text-xl font-bold">{profile.displayName}</p><p className={`mt-2 text-sm ${theme ? "text-slate-100" : "text-slate-600"}`}>{[frame?.label, theme?.label].filter(Boolean).join(" · ") || pick(locale, "Default appearance", "預設外觀")}</p></div></div>
  </div>;
}
