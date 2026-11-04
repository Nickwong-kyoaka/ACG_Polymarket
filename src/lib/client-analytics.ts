"use client";

import type { PublicLocale } from "@/components/acg-locale";

const sessionStorageKey = "acg-exchange-session";
const attributionStorageKey = "acg-exchange-attribution";
let memorySession: string | undefined;
let memoryAttribution: Attribution | undefined;
type Attribution = { source: string; entryPath: string; medium?: string; campaign?: string };
type Metadata = Record<string, string | number | boolean | null>;

function sessionKey() {
  try {
    const stored = localStorage.getItem(sessionStorageKey);
    if (stored && stored.length >= 16 && stored.length <= 128) return stored;
  } catch { /* Storage can be unavailable in private or restricted browsers. */ }
  memorySession ??= crypto.randomUUID();
  try { localStorage.setItem(sessionStorageKey, memorySession); } catch { /* Memory is enough for this visit. */ }
  return memorySession;
}

export function captureSignupAttribution(): Attribution {
  const safeCode = (value: string | null) => value && /^[\w .-]{1,120}$/.test(value) ? value : undefined;
  try {
    const stored = JSON.parse(localStorage.getItem(attributionStorageKey) ?? "null") as Attribution | null;
    if (stored && safeCode(stored.source) && typeof stored.entryPath === "string" && stored.entryPath.startsWith("/") && stored.entryPath.length <= 240) return { source: stored.source, entryPath: stored.entryPath.split(/[?#]/)[0], medium: safeCode(stored.medium ?? null), campaign: safeCode(stored.campaign ?? null) };
  } catch { /* Malformed or blocked storage must not affect navigation. */ }
  if (memoryAttribution) return memoryAttribution;
  const query = new URLSearchParams(window.location.search);
  memoryAttribution = {
    source: safeCode(query.get("utm_source")) ?? (query.get("ref") === "share" ? "share" : "direct"),
    entryPath: window.location.pathname.slice(0, 240),
    medium: safeCode(query.get("utm_medium")), campaign: safeCode(query.get("utm_campaign")),
  };
  try { localStorage.setItem(attributionStorageKey, JSON.stringify(memoryAttribution)); } catch { /* Best effort only. */ }
  return memoryAttribution;
}

export function trackEngagement(name: "PAGE_VIEW" | "SHARE" | "ONBOARDING_STARTED" | "ONBOARDING_COMPLETED", locale: PublicLocale, path: string, metadata: Metadata = {}) {
  try {
    const attribution = captureSignupAttribution();
    const body = JSON.stringify({ name, locale, path: path.split(/[?#]/)[0].slice(0, 500), sessionKey: sessionKey(), source: attribution.source,
      metadata: { entryPath: attribution.entryPath, ...(attribution.medium ? { utmMedium: attribution.medium } : {}), ...(attribution.campaign ? { utmCampaign: attribution.campaign } : {}), ...metadata },
    });
    void fetch("/api/analytics", { method: "POST", headers: { "content-type": "application/json" }, body, keepalive: true }).catch(() => undefined);
  } catch { /* Analytics must never prevent a share, signup, or page view. */ }
}
