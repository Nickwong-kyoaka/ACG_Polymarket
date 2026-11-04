"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { useRef, useState, useTransition } from "react";
import { Check, LockKeyhole, Sparkles } from "lucide-react";
import { getExchangeCopy, localizeShopItem, pick, type PublicLocale } from "@/components/acg-locale";
import { ProfileAppearance } from "@/components/profile-appearance";
import { roomRequest, type RoomAppearance, type RoomMedia } from "@/components/room-ui";
import { useRoomMutationKeys } from "@/components/room-mutation-keys";
import { cn, currencyLabel } from "@/lib/utils";
import type { InventoryItem, ShopItem } from "@/lib/types";

export function ShopPanel({ items, inventory, profile, assets = [], locale = "en" }: { items: ShopItem[]; inventory: Array<InventoryItem & { item: ShopItem }>; profile?: RoomAppearance; assets?: RoomMedia[]; locale?: PublicLocale }) {
  const router = useRouter();
  const copy = getExchangeCopy(locale);
  const [status, setStatus] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [pending, startTransition] = useTransition();
  const [previewId, setPreviewId] = useState<string | null>(null);
  const locked = useRef(false);
  const keys = useRoomMutationKeys();

  async function purchase(itemId: string) {
    if (locked.current) return;
    locked.current = true;
    setSubmitting(true);
    setStatus(null);
    const idempotencyKey = keys.get(itemId);
    const owned = inventory.some((entry) => entry.shopItemId === itemId);
    try {
      await roomRequest(owned ? `/api/me/inventory/${encodeURIComponent(itemId)}/equip` : "/api/shop/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": idempotencyKey },
        body: JSON.stringify({ itemId, equip: true, idempotencyKey }),
      });
      keys.done(itemId);
      setPreviewId(null);
      setStatus(copy.shop.done);
      startTransition(() => router.refresh());
    } catch (error) {
      setStatus(error instanceof Error ? error.message : copy.shop.failed);
    } finally {
      locked.current = false;
      setSubmitting(false);
    }
  }

  const busy = submitting || pending;
  const preview = items.find((item) => item.id === previewId);
  const appearance = profile && preview ? { ...profile, ...(preview.kind === "AVATAR_FRAME" ? { equippedFrameAsset: preview.unlockPayload.assetId } : preview.kind === "PROFILE_THEME" ? { equippedThemeAsset: preview.unlockPayload.assetId } : {}) } : profile;
  return (
    <div className="grid gap-5">
      {appearance ? <ProfileAppearance profile={appearance} assets={assets} locale={locale} preview={Boolean(preview)} /> : null}
      {preview ? <button type="button" onClick={() => setPreviewId(null)} className="exchange-button-secondary w-fit">{pick(locale, "Return to equipped look", "返回已裝備外觀")}</button> : null}
      {status ? <p role="status" className="rounded-[16px_4px_16px_4px] bg-[#f5f1e8] px-4 py-3 text-sm font-bold text-slate-700">{status}</p> : null}
      <div className="grid gap-5 xl:grid-cols-2">
        {items.map((sourceItem) => {
          const item = localizeShopItem(sourceItem, locale);
          const owned = inventory.find((entry) => entry.shopItemId === item.id);
          const asset = assets.find((entry) => entry.id === item.unlockPayload.assetId && entry.kind === item.kind);
          const equipped = Boolean(owned && (item.kind === "AVATAR_FRAME" ? profile?.equippedFrameAsset === item.unlockPayload.assetId : item.kind === "PROFILE_THEME" ? profile?.equippedThemeAsset === item.unlockPayload.assetId : owned.equipped));
          return (
            <article key={item.id} className="exchange-panel grid overflow-hidden md:grid-cols-[.8fr_1.2fr]">
              <div className={cn("shop-preview m-4 md:m-5", item.kind === "PROFILE_THEME" && "is-theme", item.kind === "WALLPAPER" && "is-wallpaper")}>
                {asset ? <Image src={asset.url} alt={asset.alt} fill sizes="(min-width: 768px) 36vw, 100vw" className="object-contain" unoptimized /> : <span className="p-4 text-xs">{pick(locale, "Published preview unavailable", "暫無已發佈預覽")}</span>}
                <span className="absolute bottom-4 left-4 z-10 rounded-full bg-[#111827]/80 px-3 py-1 text-[10px] font-black uppercase tracking-[.16em] text-white">{item.previewLabel}</span>
              </div>
              <div className="flex flex-col p-5 md:py-6 md:pr-6 md:pl-0">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#e83c62]">{item.kind.replaceAll("_", " ")}</p>
                <h3 className="mt-3 font-display text-3xl text-[#111827]">{item.title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">{item.description}</p>
                <div className="mt-auto flex items-center justify-between gap-4 pt-5">
                  <p className="text-lg font-black text-slate-950">{currencyLabel(item.price)}</p>
                  <button type="button" disabled={busy || equipped || !profile} onClick={() => purchase(item.id)} className={cn("exchange-button-primary py-2.5 disabled:opacity-60", owned && "bg-[#111827]")}>
                    {owned ? (equipped ? <Check className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />) : <LockKeyhole className="h-4 w-4" />}
                    {!profile ? pick(locale, "Sign in to unlock", "登入後解鎖") : owned ? (equipped ? copy.shop.equipped : copy.shop.equipAgain) : copy.shop.unlock}
                  </button>
                </div>
                {profile && asset && ["AVATAR_FRAME", "PROFILE_THEME"].includes(item.kind) ? <button type="button" onClick={() => setPreviewId(item.id)} className="mt-3 w-fit text-xs font-black underline">{pick(locale, "Preview in my room", "在我的房間預覽")}</button> : null}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
