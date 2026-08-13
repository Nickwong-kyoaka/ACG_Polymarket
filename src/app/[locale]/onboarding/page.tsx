import Link from "next/link";
import { ArrowRight, Coins, HeartHandshake, LogIn, Sparkles } from "lucide-react";
import { notFound } from "next/navigation";
import { isPublicLocale, localePath, pick } from "@/components/acg-locale";
import { SectionHeading } from "@/components/ui/section-heading";

export default async function OnboardingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  if (!isPublicLocale(rawLocale)) notFound();
  const locale = rawLocale;
  const steps = [
    { icon: LogIn, en: "Sign in and open your room", zh: "登入並打開玩家房間", enBody: "Google sign-in creates your profile, private wallet, and a one-time 300 SUP starter ledger entry.", zhBody: "使用 Google 登入後會建立個人資料、私密錢包與一次性的 300 SUP 起始帳本記錄。" },
    { icon: Coins, en: "Build a gentle daily loop", zh: "建立輕量每日循環", enBody: "Claim 100 SUP each Hong Kong day, complete positive missions, or take one character work shift.", zhBody: "每個香港日簽到領取 100 SUP，完成正向任務，或派遣角色進行一份工作。" },
    { icon: HeartHandshake, en: "Support without choosing an enemy", zh: "不需要樹立敵人也能應援", enBody: "Buy support units from the system pool, watch several favorites, and return units without shorting or P2P bets.", zhBody: "從系統池購入應援份數，同時關注多名本命，也可退回份數；沒有做空或玩家對賭。" },
    { icon: Sparkles, en: "Collect comfort and cosmetics", zh: "收藏安慰與外觀", enBody: "Enter a comfort room, listen to a demo voice, then unlock original frames, themes, and wallpapers.", zhBody: "進入安慰室、聽一段示範語音，再解鎖原創頭像框、主題與壁紙。" },
  ];
  return <div className="exchange-page"><section className="exchange-panel bg-[#111827] p-7 text-white sm:p-10 xl:p-12"><p className="exchange-kicker text-[#ffcc66] before:bg-[#ffcc66]">FIRST SIGNAL / ONBOARDING</p><h1 className="mt-7 exchange-title text-white">{pick(locale, "Your first support signal takes less than a minute.", "不到一分鐘，送出你的第一個應援訊號。")}</h1><p className="mt-6 max-w-2xl text-base leading-8 text-white/62">{pick(locale, "The exchange starts with affection, not financial jargon. Build a room, choose a favorite, and let the rest of the loop unfold gently.", "交易所從喜歡開始，不從金融術語開始。建立房間、選一名本命，其他循環會自然展開。")}</p></section><section className="grid gap-7"><SectionHeading eyebrow="FOUR SMALL STEPS" title={pick(locale, "From sign-in to a room that feels like yours", "從登入到一間真正像你的房間")} description={pick(locale, "Every step produces a visible result and avoids pressure to compete.", "每一步都會留下看得見的結果，也不會催促你與其他粉絲競爭。")}/><div className="grid gap-5 md:grid-cols-2">{steps.map(({ icon: Icon, en, zh, enBody, zhBody }, index) => <article key={en} className="exchange-panel p-6"><div className="flex items-center justify-between"><span className="grid h-12 w-12 place-items-center rounded-[16px_4px_16px_4px] bg-[#ff4e72] text-white"><Icon className="h-6 w-6" /></span><span className="text-5xl font-black text-slate-100">0{index + 1}</span></div><h2 className="mt-6 font-display text-3xl">{pick(locale, en, zh)}</h2><p className="mt-4 text-sm leading-7 text-slate-600">{pick(locale, enBody, zhBody)}</p></article>)}</div><div className="flex flex-wrap gap-3"><Link href="/api/auth/signin" className="exchange-button-primary">{pick(locale, "Open sign in", "前往登入")}<ArrowRight className="h-4 w-4" /></Link><Link href={localePath(locale, "/market")} className="exchange-button-secondary">{pick(locale, "Browse before signing in", "先以訪客瀏覽")}</Link></div></section></div>;
}
