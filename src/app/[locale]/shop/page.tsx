import { Coins, ShoppingBag, Sparkles } from "lucide-react";
import { notFound } from "next/navigation";
import { isPublicLocale, pick } from "@/components/acg-locale";
import { ShopPanel } from "@/components/shop-panel";
import { SectionHeading } from "@/components/ui/section-heading";
import { currencyLabel } from "@/lib/utils";
import { getPortfolioView, getShopItems } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function ShopPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  if (!isPublicLocale(rawLocale)) notFound();
  const locale = rawLocale;
  const [items, portfolio] = await Promise.all([getShopItems(locale), getPortfolioView().catch(() => null)]);
  const copy = locale === "zh-Hant" ? { eyebrow: "ACG CONVENTION BOOTH", title: "把支持穿在自己的房間裡。", body: "用平台軟幣解鎖頭像框、玩家房間主題與 AI 原創壁紙。外觀不增加戰力，只讓喜歡更像你。", wallet: "可用 SUP", original: "原創與 AI 友善素材", noPower: "零市場加成" } : { eyebrow: "ACG CONVENTION BOOTH", title: "Wear support inside your own room.", body: "Use soft currency for avatar frames, player-room themes, and original AI-friendly wallpapers. Cosmetics add no market power; they simply make affection look like you.", wallet: "Available SUP", original: "Original & AI-friendly assets", noPower: "Zero market advantage" };
  return <div className="exchange-page"><section className="exchange-panel overflow-hidden bg-[#111827] text-white"><div className="grid gap-8 p-7 sm:p-10 lg:grid-cols-[1fr_auto] lg:items-end xl:p-12"><div><p className="exchange-kicker text-[#ffcc66] before:bg-[#ffcc66]">{copy.eyebrow}</p><h1 className="mt-7 exchange-title text-white">{copy.title}</h1><p className="mt-6 max-w-2xl text-base leading-8 text-white/62">{copy.body}</p></div><div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1"><div className="rounded-[18px_5px_18px_5px] bg-[#ff4e72] p-5"><Coins className="h-5 w-5" /><p className="mt-4 text-[10px] font-black uppercase tracking-[.18em] text-white/65">{copy.wallet}</p><p className="mt-1 font-display text-3xl">{portfolio ? currencyLabel(portfolio.wallet.softBalance) : "--- SUP"}</p></div><div className="flex items-center gap-3 rounded-[18px_5px_18px_5px] border border-white/10 bg-white/5 p-4 text-sm font-bold text-white/68"><Sparkles className="h-5 w-5 text-[#ffcc66]" />{copy.original}</div><div className="flex items-center gap-3 rounded-[18px_5px_18px_5px] border border-white/10 bg-white/5 p-4 text-sm font-bold text-white/68"><ShoppingBag className="h-5 w-5 text-[#3ed6e0]" />{copy.noPower}</div></div></div></section><section className="grid gap-7"><SectionHeading eyebrow="DROP 001 / LAUNCH SEASON" title={pick(locale, "Collectible looks on the booth table", "攤位桌上的收藏外觀")} description={pick(locale, "Preview the whole item before spending SUP. Owned items remain visible in your player room.", "兌換前先完整預覽；已收藏的物品會一直留在玩家房間。")}/><ShopPanel items={items} inventory={portfolio?.inventory ?? []} locale={locale} /></section></div>;
}
