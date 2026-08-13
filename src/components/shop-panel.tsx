"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { useState, useTransition } from "react";
import { Check, LockKeyhole, Sparkles } from "lucide-react";
import { getExchangeCopy, localizeShopItem, type PublicLocale } from "@/components/acg-locale";
import { cn, currencyLabel } from "@/lib/utils";
import type { InventoryItem, ShopItem } from "@/lib/types";

export function ShopPanel({ items, inventory, locale = "en" }: { items: ShopItem[]; inventory: Array<InventoryItem & { item: ShopItem }>; locale?: PublicLocale }) {
  const router = useRouter();
  const copy = getExchangeCopy(locale);
  const [status, setStatus] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [pending, startTransition] = useTransition();

  async function purchase(itemId: string) {
    if (submitting) return;
    setSubmitting(true);
    setStatus(null);
    const idempotencyKey = crypto.randomUUID();
    try {
      const response = await fetch("/api/shop/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": idempotencyKey },
        body: JSON.stringify({ itemId, equip: true, idempotencyKey }),
      });
      const payload = await response.json();
      if (!response.ok) {
        setStatus(payload.error ?? copy.shop.failed);
        return;
      }
      setStatus(copy.shop.done);
      startTransition(() => router.refresh());
    } catch {
      setStatus(copy.shop.failed);
    } finally {
      setSubmitting(false);
    }
  }

  const busy = submitting || pending;
  return (
    <div className="grid gap-5">
      {status ? <p className="rounded-[16px_4px_16px_4px] bg-[#e9f7ef] px-4 py-3 text-sm font-bold text-[#23744b]">{status}</p> : null}
      <div className="grid gap-5 xl:grid-cols-2">
        {items.map((sourceItem) => {
          const item = localizeShopItem(sourceItem, locale);
          const owned = inventory.find((entry) => entry.shopItemId === item.id);
          return (
            <article key={item.id} className="exchange-panel grid overflow-hidden md:grid-cols-[.8fr_1.2fr]">
              <div className={cn("shop-preview m-4 md:m-5", item.kind === "PROFILE_THEME" && "is-theme", item.kind === "WALLPAPER" && "is-wallpaper")}>
                {item.unlockPayload.previewUrl ? <Image src={item.unlockPayload.previewUrl} alt={`${item.title} preview`} fill sizes="(min-width: 768px) 36vw, 100vw" className="object-cover" unoptimized /> : null}
                <span className="absolute bottom-4 left-4 z-10 rounded-full bg-[#111827]/80 px-3 py-1 text-[10px] font-black uppercase tracking-[.16em] text-white">{item.previewLabel}</span>
              </div>
              <div className="flex flex-col p-5 md:py-6 md:pr-6 md:pl-0">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#e83c62]">{item.kind.replaceAll("_", " ")}</p>
                <h3 className="mt-3 font-display text-3xl text-[#111827]">{item.title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">{item.description}</p>
                <div className="mt-auto flex items-center justify-between gap-4 pt-5">
                  <p className="text-lg font-black text-slate-950">{currencyLabel(item.price)}</p>
                  <button type="button" disabled={busy} onClick={() => purchase(item.id)} className={cn("exchange-button-primary py-2.5 disabled:opacity-60", owned && "bg-[#111827]")}>
                    {owned ? (owned.equipped ? <Check className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />) : <LockKeyhole className="h-4 w-4" />}
                    {owned ? (owned.equipped ? copy.shop.equipped : copy.shop.equipAgain) : copy.shop.unlock}
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
