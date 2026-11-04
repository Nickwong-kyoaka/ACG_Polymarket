"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { stripLocale } from "@/components/acg-locale";
import { trackEngagement } from "@/lib/client-analytics";

export function AnalyticsBeacon() {
  const pathname = usePathname();
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname || stripLocale(pathname).startsWith("/admin") || lastPath.current === pathname) return;
    lastPath.current = pathname;
    const locale = pathname.startsWith("/zh-Hant") ? "zh-Hant" : "en";
    trackEngagement("PAGE_VIEW", locale, pathname);
    if (stripLocale(pathname) === "/onboarding") trackEngagement("ONBOARDING_STARTED", locale, pathname, { emitter: "client-attribution" });
  }, [pathname]);

  return null;
}
