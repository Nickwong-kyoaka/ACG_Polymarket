"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

const storageKey = "acg-exchange-session";

export function AnalyticsBeacon() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname || pathname.startsWith("/admin")) return;
    let sessionKey = window.localStorage.getItem(storageKey);
    if (!sessionKey) {
      sessionKey = crypto.randomUUID();
      window.localStorage.setItem(storageKey, sessionKey);
    }
    const locale = pathname.startsWith("/zh-Hant") ? "zh-Hant" : "en";
    const body = JSON.stringify({ name: "PAGE_VIEW", sessionKey, locale, path: pathname });
    void fetch("/api/analytics", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => undefined);
  }, [pathname]);

  return null;
}
