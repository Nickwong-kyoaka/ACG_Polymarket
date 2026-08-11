import Link from "next/link";
import { RewardClaimPanel } from "@/components/reward-claim-panel";
import { ShopPanel } from "@/components/shop-panel";
import { SectionHeading } from "@/components/ui/section-heading";
import { Surface } from "@/components/ui/surface";
import { currencyLabel } from "@/lib/utils";
import { getPortfolioView, getRecentTrades, getShopItems } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function MePage() {
  const [portfolio, recentTrades, shopItems] = await Promise.all([
    getPortfolioView(),
    getRecentTrades(5),
    getShopItems(),
  ]);

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-10 px-6 py-12">
      <SectionHeading
        eyebrow="Me"
        title="Your support desk"
        description="Track support units, reward history, watchlist momentum, and equipped cosmetics from one page."
      />

      <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <Surface className="p-6 sm:p-8">
          <h2 className="font-display text-4xl text-slate-950">{portfolio.profile.displayName}</h2>
          <p className="mt-2 text-sm font-semibold uppercase tracking-[0.22em] text-slate-400">
            @{portfolio.profile.handle}
          </p>
          <div className="mt-6 grid gap-3 rounded-[1.75rem] bg-slate-950 p-5 text-white">
            <p className="text-[11px] uppercase tracking-[0.18em] text-white/60">Wallet balance</p>
            <p className="font-display text-5xl">{currencyLabel(portfolio.wallet.softBalance)}</p>
          </div>
          <div className="mt-6">
            <RewardClaimPanel />
          </div>

          <div className="mt-6 grid gap-3">
            {portfolio.positions.map((position) => (
              <div
                key={position.id}
                className="rounded-[1.5rem] border border-black/10 bg-[#fffdf9] p-4"
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-950">
                      {position.character.name}
                    </p>
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                      {position.units} units - avg {position.averageCost} SUP
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-slate-600">
                    {currencyLabel(position.currentValue)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Surface>

        <Surface className="p-6 sm:p-8">
          <h2 className="font-display text-4xl text-slate-950">Recent trade feed</h2>
          <div className="mt-6 grid gap-3">
            {recentTrades.map((trade) => (
              <div
                key={trade.id}
                className="flex items-center justify-between rounded-[1.5rem] border border-black/10 bg-[#fff9f2] px-4 py-3"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-950">
                    {trade.side === "BUY" ? "Supported" : "Sold"} {trade.character.name}
                  </p>
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                    {trade.quantity} units
                  </p>
                </div>
                <p className="text-sm font-semibold text-slate-600">
                  {currencyLabel(trade.totalCost)}
                </p>
              </div>
            ))}
          </div>
          <Link
            href="/u/kyoaka"
            className="mt-6 inline-flex rounded-full border border-black/10 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-[#db5d35] hover:text-[#db5d35]"
          >
            Open public profile
          </Link>
        </Surface>
      </div>

      <section className="grid gap-6">
        <SectionHeading
          eyebrow="Cosmetic shop"
          title="Equip frames and themes without changing the support rules"
          description="Purchases stay separate from the support ledger logic. Cosmetics are where ad-driven revenue and future premium unlocks can live safely."
        />
        <ShopPanel items={shopItems} inventory={portfolio.inventory} />
      </section>
    </div>
  );
}
