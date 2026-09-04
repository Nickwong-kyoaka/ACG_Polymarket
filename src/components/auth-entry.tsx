"use client";

import { useState, type FormEvent } from "react";
import { signIn } from "next-auth/react";
import { ArrowRight, CircleUserRound, KeyRound } from "lucide-react";
import type { PublicLocale } from "@/components/acg-locale";

interface AuthEntryProps {
  locale: PublicLocale;
  googleEnabled: boolean;
  demoEnabled: boolean;
  redirectTo: string;
}

export function AuthEntry({ locale, googleEnabled, demoEnabled, redirectTo }: AuthEntryProps) {
  const [pendingProvider, setPendingProvider] = useState<"google" | "credentials" | null>(null);
  const [error, setError] = useState("");
  const [handle, setHandle] = useState("kyoaka");
  const zh = locale === "zh-Hant";

  async function startGoogle() {
    setError("");
    setPendingProvider("google");
    try {
      await signIn("google", { redirectTo });
    } catch {
      setError(zh ? "Google 登入暫時沒有回應，請稍後再試。" : "Google sign-in did not respond. Please try again.");
      setPendingProvider(null);
    }
  }

  async function startDemo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPendingProvider("credentials");
    try {
      await signIn("credentials", { handle: handle.trim() || "kyoaka", redirectTo });
    } catch {
      setError(zh ? "Demo 房間暫時打不開，請再試一次。" : "The demo room could not open. Please try again.");
      setPendingProvider(null);
    }
  }

  return (
    <div className="auth-entry" aria-live="polite">
      {googleEnabled ? (
        <button type="button" className="auth-provider-button" onClick={startGoogle} disabled={pendingProvider !== null}>
          <span className="auth-provider-mark"><CircleUserRound aria-hidden="true" /></span>
          <span>
            <strong>{pendingProvider === "google" ? (zh ? "正在前往 Google…" : "Opening Google…") : (zh ? "使用 Google 繼續" : "Continue with Google")}</strong>
            <small>{zh ? "回來後再挑選喜歡的作品與角色" : "Come back to choose your series and characters"}</small>
          </span>
          <ArrowRight aria-hidden="true" />
        </button>
      ) : (
        <div className="auth-provider-note">
          <KeyRound aria-hidden="true" />
          <p><strong>{zh ? "Google 登入尚未連接" : "Google sign-in is not connected"}</strong><span>{zh ? "在 Render 加入 AUTH_GOOGLE_ID 與 AUTH_GOOGLE_SECRET 後，按鈕就會出現在這裡。" : "Add AUTH_GOOGLE_ID and AUTH_GOOGLE_SECRET on Render and the button will appear here."}</span></p>
        </div>
      )}

      {demoEnabled ? (
        <form className="demo-signin" onSubmit={startDemo}>
          <label htmlFor="demo-handle">{zh ? "本機 Demo 名稱" : "Local demo name"}</label>
          <div>
            <input id="demo-handle" value={handle} onChange={(event) => setHandle(event.target.value)} maxLength={24} autoComplete="nickname" />
            <button disabled={pendingProvider !== null}>{pendingProvider === "credentials" ? (zh ? "開啟中…" : "Opening…") : (zh ? "進入 Demo" : "Enter demo")}</button>
          </div>
          <small>{zh ? "只會在 development + DEMO_MODE=true 顯示。" : "Visible only with development + DEMO_MODE=true."}</small>
        </form>
      ) : null}

      {error ? <p className="auth-entry-error" role="alert">{error}</p> : null}
    </div>
  );
}
