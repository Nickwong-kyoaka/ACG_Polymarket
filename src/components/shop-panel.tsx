"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { currencyLabel } from "@/lib/utils";
import type { InventoryItem, ShopItem } from "@/lib/types";

export function ShopPanel({
  items,
  inventory,
}: {
  items: ShopItem[];
  inventory: Array<InventoryItem & { item: ShopItem }>;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function purchase(itemId: string) {
    const response = await fetch("/api/shop/purchase", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId, equip: true }),
    });
    const payload = await response.json();

    if (!response.ok) {
      setStatus(payload.error ?? "Purchase failed.");
      return;
    }

    setStatus("Cosmetic unlocked and equipped.");
    startTransition(() => router.refresh());
  }

  return (
    <div className="grid gap-5">
      {status ? <p className="text-sm font-medium text-[#23744b]">{status}</p> : null}
      <div className="grid gap-4 lg:grid-cols-2">
        {items.map((item) => {
          const owned = inventory.find((entry) => entry.shopItemId === item.id);
          return (
            <div
              key={item.id}
              className="rounded-[2rem] border border-black/10 bg-white p-5 shadow-[0_20px_80px_-40px_rgba(15,23,42,0.45)]"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#db5d35]">
                {item.kind.replaceAll("_", " ")}
              </p>
              <h3 className="mt-3 font-display text-3xl text-slate-950">{item.title}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-600">{item.description}</p>
              <div className="mt-4 flex items-center justify-between">
                <p className="text-lg font-semibold text-slate-950">{currencyLabel(item.price)}</p>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => purchase(item.id)}
                  className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
                >
                  {owned ? (owned.equipped ? "Equipped" : "Equip again") : "Unlock"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
