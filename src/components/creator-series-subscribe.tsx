"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { localePath, type PublicLocale } from "@/components/acg-locale";

export function CreatorSeriesSubscribe({ seriesId, subscribed, signedIn, locale }: {
  seriesId: string; subscribed: boolean; signedIn: boolean; locale: PublicLocale;
}) {
  const [value, setValue] = useState(subscribed);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const zh = locale === "zh-Hant";
  async function toggle() {
    setPending(true); setError("");
    try {
      const response = await fetch(`/api/creator-series/${encodeURIComponent(seriesId)}/subscribe`, {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ subscribed: !value }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Subscription could not be updated.");
      setValue(payload.subscribed);
      router.refresh();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "The connection failed.");
    } finally {
      setPending(false);
    }
  }
  if (!signedIn) return <a className="exchange-button-primary" href={localePath(locale, "/onboarding")}>{zh ? "登入訂閱" : "Sign in to subscribe"}</a>;
  return <div className="grid gap-2"><button className="exchange-button-primary" type="button" disabled={pending} aria-pressed={value} onClick={toggle}>{pending ? (zh ? "儲存中" : "Saving") : value ? (zh ? "取消訂閱" : "Unsubscribe") : (zh ? "訂閱連載" : "Subscribe to series")}</button>{error ? <p role="alert" className="text-xs text-rose-700">{error}</p> : null}</div>;
}
