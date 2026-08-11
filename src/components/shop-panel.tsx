"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { getCopy, type Locale } from "@/lib/i18n";
import { currencyLabel } from "@/lib/utils";
import type { InventoryItem, ShopItem } from "@/lib/types";

export function ShopPanel({
  items,
  inventory,
  locale = "en",
}: {
  items: ShopItem[];
  inventory: Array<InventoryItem & { item: ShopItem }>;
  locale?: Locale;
}) {
  const router = useRouter();
  const copy = getCopy(locale);
  const [status, setStatus] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [pending, startTransition] = useTransition();

  async function purchase(itemId: string) {
    if (submitting) {
      return;
    }

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
    } finally {
      setSubmitting(false);
    }
  }

  const busy = submitting || pending;

  return (
    <div className="grid gap-5">
      {status ? <p className="text-sm font-medium text-[#23744b]">{status}</p> : null}
      <div className="grid gap-4 lg:grid-cols-2">
        {items.map((item) => {
          const owned = inventory.find((entry) => entry.shopItemId === item.id);
          return (
            <div
              key={item.id}
              className="manga-panel rounded-[2rem] bg-white/92 p-5"
            >
              <p className="text-xs font-black uppercase tracking-[0.22em] text-[#ff3d7f]">
                {item.kind.replaceAll("_", " ")}
              </p>
              <h3 className="mt-3 font-display text-3xl text-[#171126]">{item.title}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">{item.description}</p>
              <div className="mt-4 flex items-center justify-between">
                <p className="text-lg font-semibold text-slate-950">{currencyLabel(item.price)}</p>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => purchase(item.id)}
                  className="rounded-full bg-[#171126] px-4 py-2 text-sm font-black text-white transition hover:bg-[#ff3d7f] disabled:opacity-60"
                >
                  {owned ? (owned.equipped ? copy.shop.equipped : copy.shop.equipAgain) : copy.shop.unlock}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
