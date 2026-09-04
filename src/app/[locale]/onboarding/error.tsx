"use client";

import { RefreshCcw } from "lucide-react";
import { usePathname } from "next/navigation";

export default function OnboardingError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const zh = usePathname().startsWith("/zh-Hant");
  return <div className="onboarding-page"><div className="community-state is-error"><RefreshCcw /><span>{zh ? "迎賓桌稍候" : "WELCOME DESK PAUSED"}</span><h1>{zh ? "角色手帳還在整理桌面。" : "The welcome desk is still arranging your book."}</h1><p>{zh ? "稍等一下再打開，剛才的頁面不會走遠。" : "Give it another moment, then open the cover again."}</p><button type="button" onClick={reset}>{zh ? "再打開一次" : "Open again"}</button></div></div>;
}
