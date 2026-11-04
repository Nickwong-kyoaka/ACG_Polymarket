"use client";

import { useState } from "react";
import { safePublicMediaUrl } from "@/lib/public-assets";

export function SocialNoteImage({ url, alt, locale, className = "", priority = false }: { url?: string | null; alt: string; locale: "en" | "zh-Hant"; className?: string; priority?: boolean }) {
  const source = safePublicMediaUrl(url);
  const [failed, setFailed] = useState<string | null>(null);
  const available = source && source !== failed;
  const fallback = locale === "zh-Hant" ? (source ? "圖片暫時無法載入" : "文字筆記") : (source ? "Image temporarily unavailable" : "Text note");
  return <span className={`social-image relative block overflow-hidden bg-slate-100 ${className}`}>
    {available ? (
      // Published URLs are already reviewed; no additional image proxy is introduced.
      // eslint-disable-next-line @next/next/no-img-element
      <img src={source} alt={alt} width={800} height={1000} loading={priority ? "eager" : "lazy"} decoding="async" referrerPolicy="no-referrer" onError={() => setFailed(source)} className="absolute inset-0 h-full w-full object-cover object-top" />
    ) : <span role="img" aria-label={`${alt}: ${fallback}`} className="absolute inset-0 grid place-content-center gap-2 bg-slate-100 px-4 text-center text-slate-600"><span aria-hidden="true" className="text-3xl font-bold">{alt.trim().charAt(0)}</span><span className="text-xs">{fallback}</span></span>}
  </span>;
}
