import { Coins, HeartHandshake, ShieldCheck, UsersRound } from "lucide-react";
import { notFound } from "next/navigation";
import { isPublicLocale, pick } from "@/components/acg-locale";
import { SectionHeading } from "@/components/ui/section-heading";

export default async function MarketRulesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  if (!isPublicLocale(rawLocale)) notFound();
  const locale = rawLocale;
  const rules = [
    { icon: HeartHandshake, en: "A quote desk for character support", zh: "替角色應援準備的報價桌", enBody: "Support units come from the platform pool. Every ticket previews its quote, total, and return reference before confirmation.", zhBody: "應援份數由平台池提供，每張票券都會在確認前顯示價格、總額與退回參考價。" },
    { icon: UsersRound, en: "A catalog shaped by shared affection", zh: "由大家的心意整理成場刊", enBody: "Season pages, tags, reactions, and recent support help fans discover characters and move shared milestones together.", zhBody: "季番、標籤、心情反應與近期應援，會幫大家發現角色並一起推進共同里程碑。" },
    { icon: ShieldCheck, en: "Source notes travel with every image", zh: "每張圖片都帶著來源手帳", enBody: "Character media keeps its source page, editorial state, creator link, and contact route close to the gallery.", zhBody: "角色素材會在畫廊旁保留來源頁、整理狀態、創作者連結與聯絡入口。" },
    { icon: Coins, en: "SUP belongs to the room", zh: "SUP 留在角色房間裡", enBody: "Daily SUP is an in-platform currency for support units, comfort keepsakes, frames, themes, and wallpapers.", zhBody: "每日 SUP 是房間內使用的軟幣，可以收藏應援份數、安慰小物、頭像框、主題與壁紙。" },
  ];
  return <div className="exchange-page"><section className="exchange-panel bg-[#283338] p-7 text-white sm:p-10 xl:p-12"><p className="exchange-kicker text-[#f0c884] before:bg-[#f0c884]">HOW THE ROOM WORKS</p><h1 className="mt-7 exchange-title text-white">{pick(locale, "A simple guide to support, SUP, and source notes.", "應援、SUP 與素材來源的簡單說明書。")}</h1><p className="mt-6 max-w-2xl text-base leading-8 text-white/68">{pick(locale, "Keep this page nearby whenever you want to understand a quote, a gallery badge, or what a room collectible does.", "想知道報價怎樣計算、畫廊標籤代表什麼，或收藏能做什麼時，都可以回來翻這一頁。")}</p></section><section className="grid gap-7"><SectionHeading eyebrow="FOUR ROOM NOTES" title={pick(locale, "The small mechanics behind the fandom room", "角色房間背後的四張小紙條")} description={pick(locale, "A quick look at the pieces you will meet while browsing, supporting, and collecting.", "逛角色、送出應援與整理收藏時，會遇見的幾個小機制。")}/><div className="grid gap-5 md:grid-cols-2">{rules.map(({ icon: Icon, en, zh, enBody, zhBody }) => <article key={en} className="exchange-panel p-6"><span className="grid h-12 w-12 place-items-center rounded-full bg-[#283338] text-[#f0c884]"><Icon className="h-6 w-6" /></span><h2 className="mt-6 font-display text-3xl">{pick(locale, en, zh)}</h2><p className="mt-4 text-sm leading-7 text-slate-600">{pick(locale, enBody, zhBody)}</p></article>)}</div></section></div>;
}
