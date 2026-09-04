"use client";

import { RefreshCcw } from "lucide-react";
import { usePathname } from "next/navigation";

export default function CreateError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const zh = usePathname().startsWith("/zh-Hant");
  return <div className="create-page"><div className="community-state is-error"><RefreshCcw /><span>{zh ? "編輯桌稍候" : "EDITORIAL DESK PAUSED"}</span><h1>{zh ? "編輯桌還沒準備好紙張。" : "The editorial desk is not quite ready."}</h1><p>{zh ? "你的本機草稿仍在瀏覽器裡，稍後再回來就好。" : "Your local draft stays in this browser. Try the desk again in a moment."}</p><button type="button" onClick={reset}>{zh ? "再試一次" : "Try again"}</button></div></div>;
}
