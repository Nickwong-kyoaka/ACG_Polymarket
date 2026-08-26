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
    { icon: HeartHandshake, en: "Send your first support", zh: "送出第一份應援", enBody: "Choose a character, preview the system quote, keep a few support units, and add other favorites whenever they find you.", zhBody: "選一名角色、確認系統報價、收藏幾份應援；遇見新的本命時，也隨時可以加進房間。" },
    { icon: Sparkles, en: "Bring the feeling home", zh: "把喜歡帶回房間", enBody: "Hear a character comfort voice, then open original frames, themes, and wallpapers for your collection shelf.", zhBody: "聽一段角色安慰語音，再為收藏櫃解鎖原創頭像框、主題與壁紙。" },
  ];
  return <div className="exchange-page"><section className="exchange-panel bg-[#283338] p-7 text-white sm:p-10 xl:p-12"><p className="exchange-kicker text-[#f0c884] before:bg-[#f0c884]">YOUR FIRST PAGE</p><h1 className="mt-7 exchange-title text-white">{pick(locale, "Open a room for the characters you keep thinking about.", "替那些總會想起的角色，打開一間自己的房間。")}</h1><p className="mt-6 max-w-2xl text-base leading-8 text-white/68">{pick(locale, "Sign in, pick one favorite, and watch the room become yours through small daily rituals, voices, and keepsakes.", "登入、選一名本命，再用每日小事、角色聲音與收藏，慢慢把這裡變成自己的房間。")}</p></section><section className="grid gap-7"><SectionHeading eyebrow="FOUR SMALL STEPS" title={pick(locale, "From sign-in to a room that feels like yours", "從登入到一間真正像你的房間")} description={pick(locale, "Each small step adds something visible to your shelf, notebook, or daily routine.", "每個小步驟，都會替收藏櫃、應援手帳或每日習慣添上一點東西。")}/><div className="grid gap-5 md:grid-cols-2">{steps.map(({ icon: Icon, en, zh, enBody, zhBody }, index) => <article key={en} className="exchange-panel p-6"><div className="flex items-center justify-between"><span className="grid h-12 w-12 place-items-center rounded-full bg-[#c85d5a] text-white"><Icon className="h-6 w-6" /></span><span className="font-display text-5xl text-[#e8ddd2]">0{index + 1}</span></div><h2 className="mt-6 font-display text-3xl">{pick(locale, en, zh)}</h2><p className="mt-4 text-sm leading-7 text-slate-600">{pick(locale, enBody, zhBody)}</p></article>)}</div><div className="flex flex-wrap gap-3"><Link href="/api/auth/signin" className="exchange-button-primary">{pick(locale, "Open sign in", "打開登入頁")}<ArrowRight className="h-4 w-4" /></Link><Link href={localePath(locale, "/market")} className="exchange-button-secondary">{pick(locale, "Browse as a guest", "先以訪客逛逛")}</Link></div></section></div>;
}
