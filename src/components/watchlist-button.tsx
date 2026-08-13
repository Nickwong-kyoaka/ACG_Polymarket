"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Bookmark } from "lucide-react";
import { getExchangeCopy, type PublicLocale } from "@/components/acg-locale";

export function WatchlistButton({
  characterId,
  watching,
  locale = "en",
}: {
  characterId: string;
  watching: boolean;
  locale?: PublicLocale;
}) {
  const router = useRouter();
  const [isWatching, setIsWatching] = useState(watching);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const copy = getExchangeCopy(locale);

  async function toggle() {
    setMessage(null);
    const response = await fetch(
      isWatching ? `/api/watchlist/${characterId}` : "/api/watchlist",
      {
        method: isWatching ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: isWatching ? undefined : JSON.stringify({ characterId }),
      },
    );
    const payload = await response.json();

    if (!response.ok) {
      setMessage(payload.error ?? "Unable to update watchlist.");
      return;
    }

    setIsWatching(payload.watching);
    startTransition(() => router.refresh());
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
      className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/70 px-3 py-2 text-xs font-black text-slate-600 transition hover:border-[#ff4e72] hover:text-[#e83c62] disabled:opacity-60"
      >
        <Bookmark className="h-4 w-4" fill={isWatching ? "currentColor" : "none"} />
        {isWatching ? copy.common.watching : copy.common.watch}
      </button>
      {message ? <p className="text-xs text-[#b42318]">{message}</p> : null}
    </div>
  );
}
