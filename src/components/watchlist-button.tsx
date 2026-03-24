"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function WatchlistButton({
  characterId,
  watching,
}: {
  characterId: string;
  watching: boolean;
}) {
  const router = useRouter();
  const [isWatching, setIsWatching] = useState(watching);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

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
        className="rounded-full border border-black/10 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-[#db5d35] hover:text-[#db5d35] disabled:opacity-60"
      >
        {isWatching ? "Watching" : "Watch"}
      </button>
      {message ? <p className="text-xs text-[#b42318]">{message}</p> : null}
    </div>
  );
}
