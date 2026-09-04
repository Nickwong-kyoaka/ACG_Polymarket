"use client";

import { useState } from "react";
import { Check, Share2 } from "lucide-react";
import type { PublicLocale } from "@/components/acg-locale";

export function ShareButton({ title, text, path, locale, compact = false }: { title: string; text: string; path: string; locale: PublicLocale; compact?: boolean }) {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);
  const zh = locale === "zh-Hant";

  async function share() {
    setFailed(false);
    const url = new URL(path, window.location.origin).toString();
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setFailed(true);
      window.setTimeout(() => setFailed(false), 2400);
    }
  }

  return (
    <button type="button" onClick={share} className={compact ? "social-action is-compact" : "social-share-button"} aria-label={zh ? `分享：${title}` : `Share: ${title}`}>
      {copied ? <Check aria-hidden="true" /> : <Share2 aria-hidden="true" />}
      <span>{failed ? (zh ? "未能複製" : "Copy unavailable") : copied ? (zh ? "已複製" : "Copied") : (zh ? "分享" : "Share")}</span>
    </button>
  );
}
