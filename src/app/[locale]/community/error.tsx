"use client";

import { RefreshCcw } from "lucide-react";
import { usePathname } from "next/navigation";

export default function CommunityError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const zh = usePathname().startsWith("/zh-Hant");
  return <div className="community-page"><div className="community-state is-error"><RefreshCcw /><span>CLUBROOM PAUSED</span><h1>{zh ? "社群手帳需要多一點時間。" : "The clubroom notebook needs another moment."}</h1><p>{zh ? "內容沒有不見，再請編輯桌排一次頁就好。" : "Nothing was lost. Ask the desk to lay the pages out again."}</p><button type="button" onClick={reset}>{zh ? "重新整理" : "Try again"}</button></div></div>;
}
