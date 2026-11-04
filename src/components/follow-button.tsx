"use client";

import { useEffect, useState } from "react";
import type { PublicLocale } from "@/components/acg-locale";

export function FollowButton({ targetType, targetId, initialFollowing, locale }: { targetType: "user" | "character" | "topic"; targetId: string; initialFollowing?: boolean; locale: PublicLocale }) {
  const [following, setFollowing] = useState(initialFollowing ?? false);
  const [resolved, setResolved] = useState(initialFollowing !== undefined);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const zh = locale === "zh-Hant";
  useEffect(() => {
    if (initialFollowing !== undefined) return;
    const controller = new AbortController();
    void fetch(`/api/follows?${new URLSearchParams({ targetType, targetId })}`, { signal: controller.signal }).then(async (response) => {
      if (response.ok && !controller.signal.aborted) setFollowing((await response.json()).following);
    }).catch(() => undefined).finally(() => { if (!controller.signal.aborted) setResolved(true); });
    return () => controller.abort();
  }, [initialFollowing, targetType, targetId]);
  async function toggle() {
    if (pending) return;
    setPending(true); setError("");
    try {
      const response = await fetch("/api/follows", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ targetType, targetId }) });
      const body = await response.json();
      if (!response.ok) throw new Error(response.status === 401 ? (zh ? "登入後就能關注。" : "Sign in to follow.") : body.error);
      setFollowing(body.following);
    } catch (failure) { setError(failure instanceof Error ? failure.message : (zh ? "暫時無法關注。" : "Could not follow.")); }
    finally { setPending(false); }
  }
  return <span className="inline-grid gap-1"><button type="button" disabled={pending || !resolved} aria-pressed={following} onClick={toggle} className="text-xs font-bold text-[#a34855] disabled:opacity-50">{following ? (zh ? "已關注" : "Following") : (zh ? "＋關注" : "+ Follow")}</button>{error ? <small role="status" className="text-xs text-rose-700">{error}</small> : null}</span>;
}
