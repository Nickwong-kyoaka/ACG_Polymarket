import Link from "next/link";
import { RewardClaimPanel } from "@/components/reward-claim-panel";
import { ShopPanel } from "@/components/shop-panel";
import { SectionHeading } from "@/components/ui/section-heading";
import { Surface } from "@/components/ui/surface";
import { getCopy, hrefWithLocale } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/request-locale";
import { currencyLabel } from "@/lib/utils";
import { getPortfolioView, getRecentTrades, getShopItems } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function MePage() {
  const locale = await getRequestLocale();
  const copy = getCopy(locale);
  const [portfolio, recentTrades, shopItems] = await Promise.all([
    getPortfolioView(),
    getRecentTrades(5),
    getShopItems(),
  ]);

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-10 px-4 py-10 sm:px-6 sm:py-12">
      <SectionHeading
        eyebrow={copy.me.eyebrow}
        title={copy.me.title}
        description={copy.me.description}
      />

      <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <Surface className="p-6 sm:p-8">
          <h2 className="font-display text-4xl text-[#171126]">{portfolio.profile.displayName}</h2>
          <p className="mt-2 text-sm font-semibold uppercase tracking-[0.22em] text-slate-400">
            @{portfolio.profile.handle}
          </p>
          <div className="mt-6 grid gap-3 rounded-[1.75rem] bg-[#171126] p-5 text-white">
            <p className="text-[11px] uppercase tracking-[0.18em] text-white/60">
              {copy.me.walletBalance}
            </p>
            <p className="font-display text-5xl">{currencyLabel(portfolio.wallet.softBalance)}</p>
          </div>
          <div className="mt-6">
            <RewardClaimPanel locale={locale} />
          </div>

          <div className="mt-6 grid gap-3">
            {portfolio.positions.length > 0 ? (
              portfolio.positions.map((position) => (
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
                        {position.units} {copy.common.units} · avg {position.averageCost} SUP
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-slate-600">
                      {currencyLabel(position.currentValue)}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="rounded-[1.5rem] bg-[#fff2c5] p-4 text-sm leading-7 text-slate-700">
                {copy.me.holdingsEmpty}
              </p>
            )}
          </div>
        </Surface>

        <Surface className="p-6 sm:p-8">
          <h2 className="font-display text-4xl text-[#171126]">{copy.me.recentFeed}</h2>
          <div className="mt-6 grid gap-3">
            {recentTrades.map((trade) => (
              <div
                key={trade.id}
                className="flex items-center justify-between rounded-[1.5rem] border border-black/10 bg-[#fff9f2] px-4 py-3"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-950">
                    {trade.side === "BUY" ? copy.common.supported : copy.common.soldBack}{" "}
                    {trade.character.name}
                  </p>
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-400">
                    {trade.quantity} {copy.common.units}
                  </p>
                </div>
                <p className="text-sm font-semibold text-slate-600">
                  {currencyLabel(trade.totalCost)}
                </p>
              </div>
            ))}
          </div>
          <Link
            href={hrefWithLocale("/u/kyoaka", locale)}
            className="mt-6 inline-flex rounded-full border border-black/10 px-5 py-3 text-sm font-black text-slate-700 transition hover:border-[#ff3d7f] hover:text-[#ff3d7f]"
          >
            {copy.me.publicProfile}
          </Link>
        </Surface>
      </div>

      <section className="grid gap-6">
        <SectionHeading
          eyebrow={copy.me.shopEyebrow}
          title={copy.me.shopTitle}
          description={copy.me.shopDescription}
        />
        <ShopPanel items={shopItems} inventory={portfolio.inventory} locale={locale} />
      </section>
    </div>
  );
}
