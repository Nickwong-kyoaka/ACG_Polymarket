"use client";

import { usePathname } from "next/navigation";
import { RefreshCcw } from "lucide-react";

export default function PostError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const zh = usePathname().startsWith("/zh-Hant");
  return <div className="post-detail-page"><div className="community-state is-error"><RefreshCcw /><span>PAGE PAUSED</span><h1>{zh ? "這張筆記暫時翻不開。" : "This note will not open just yet."}</h1><p>{zh ? "再試一次，內容仍然好好地留在書架上。" : "Try once more. The page is still safe on the shelf."}</p><button type="button" onClick={reset}>{zh ? "再翻一次" : "Try again"}</button></div></div>;
}
