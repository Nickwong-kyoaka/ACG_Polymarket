import { BanknoteX, HeartHandshake, ShieldCheck, UsersRound } from "lucide-react";
import { notFound } from "next/navigation";
import { isPublicLocale, pick } from "@/components/acg-locale";
import { SectionHeading } from "@/components/ui/section-heading";

export default async function MarketRulesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  if (!isPublicLocale(rawLocale)) notFound();
  const locale = rawLocale;
  const rules = [
    { icon: HeartHandshake, en: "Positive-only system exchange", zh: "只做正向支持的系統交易", enBody: "Users buy and return support units against the platform pool. There is no shorting, player order book, cash-out, or bet against another character.", zhBody: "用戶只與平台系統池購入或退回應援份數，不設做空、玩家訂單簿、出金或針對其他角色的對賭。" },
    { icon: UsersRound, en: "No faction-war design", zh: "不以黨爭作為產品設計", enBody: "Rankings describe support activity by tag and season. There is no loser board, dislike button, or copy that humiliates another fandom.", zhBody: "榜單只按標籤與季別描述應援活動，不設輸家榜、踩按鈕或羞辱其他粉絲群的文案。" },
    { icon: ShieldCheck, en: "Source-aware character content", zh: "角色內容保留來源意識", enBody: "Original art can be displayed directly. Metadata entries retain attribution and use abstract posters unless separate media permission is recorded.", zhBody: "平台原創立繪可以直接展示；資料型角色保留來源標記，未另行記錄媒體許可時只使用抽象訊號圖。" },
    { icon: BanknoteX, en: "Soft currency, not financial advice", zh: "平台軟幣，不是金融建議", enBody: "SUP is non-transferable, cannot be cashed out, and represents in-platform participation only. This is fandom entertainment, not investing.", zhBody: "SUP 不可轉讓、不可出金，只代表平台內參與。這是粉絲娛樂產品，不是投資服務。" },
  ];
  return <div className="exchange-page"><section className="exchange-panel bg-[#111827] p-7 text-white sm:p-10 xl:p-12"><p className="exchange-kicker text-[#ffcc66] before:bg-[#ffcc66]">MARKET TRUST RULES</p><h1 className="mt-7 exchange-title text-white">{pick(locale, "The market should make affection safer to express.", "市場應該讓喜歡更安心地被說出來。")}</h1><p className="mt-6 max-w-2xl text-base leading-8 text-white/62">{pick(locale, "These constraints are part of the product, not moderation polish added later.", "這些限制是產品本身的一部分，不是之後才補上的審核裝飾。")}</p></section><section className="grid gap-7"><SectionHeading eyebrow="FOUR PRODUCT PROMISES" title={pick(locale, "How ACG Exchange keeps the signal fan-safe", "ACG Exchange 如何讓應援訊號保持友善")} description={pick(locale, "Every public screen and interaction should remain consistent with these promises.", "所有公開畫面與互動都必須與這些承諾一致。")}/><div className="grid gap-5 md:grid-cols-2">{rules.map(({ icon: Icon, en, zh, enBody, zhBody }) => <article key={en} className="exchange-panel p-6"><span className="grid h-12 w-12 place-items-center rounded-[16px_4px_16px_4px] bg-[#111827] text-[#ffcc66]"><Icon className="h-6 w-6" /></span><h2 className="mt-6 font-display text-3xl">{pick(locale, en, zh)}</h2><p className="mt-4 text-sm leading-7 text-slate-600">{pick(locale, enBody, zhBody)}</p></article>)}</div></section></div>;
}
