import Link from "next/link";
import { CharacterCard } from "@/components/character-card";
import { SectionHeading } from "@/components/ui/section-heading";
import { Surface } from "@/components/ui/surface";
import { currencyLabel } from "@/lib/utils";
import {
  getCommentCount,
  getCurrentViewer,
  getRecentTrades,
  getShopItems,
  getWatchlistIds,
  listCharacters,
} from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [featuredCharacters, recentTrades, shopItems, watchlistIds, viewer] = await Promise.all([
    listCharacters({ featuredOnly: true }),
    getRecentTrades(),
    getShopItems(),
    getWatchlistIds(),
    getCurrentViewer(),
  ]);
  const { wallet } = viewer;
  const featuredCards = await Promise.all(
    featuredCharacters.map(async (character) => ({
      character,
      commentCount: await getCommentCount(character.id),
    })),
  );

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-16 px-6 py-10 sm:py-16">
      <section className="hero-grid overflow-hidden rounded-[2.5rem] border border-black/10 bg-white/75 px-8 py-12 shadow-[0_30px_120px_-50px_rgba(15,23,42,0.45)] sm:px-12">
        <div className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-8">
            <p className="text-sm font-semibold uppercase tracking-[0.35em] text-[#db5d35]">
              Support, collect, celebrate
            </p>
            <div className="space-y-5">
              <h1 className="max-w-4xl font-display text-5xl leading-none text-slate-950 sm:text-6xl lg:text-7xl">
                Bring new-season characters into a market built for affection, not faction wars.
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-slate-600">
                ACG Support Market turns daily check-ins, positive-only support units, avatar frames,
                and wallpapers into one soft-currency fandom loop. No shorting. No cash-out. No
                rivalry-first copy.
              </p>
            </div>
            <div className="flex flex-wrap gap-4">
              <Link
                href="/market"
                className="rounded-full bg-[#db5d35] px-6 py-4 text-sm font-semibold text-white transition hover:bg-[#c14a24]"
              >
                Enter the market
              </Link>
              <Link
                href="/onboarding"
                className="rounded-full border border-black/10 px-6 py-4 text-sm font-semibold text-slate-700 transition hover:border-[#db5d35] hover:text-[#db5d35]"
              >
                Start onboarding
              </Link>
              <Link
                href="/comfort"
                className="rounded-full border border-black/10 bg-white/60 px-6 py-4 text-sm font-semibold text-slate-700 transition hover:border-[#db5d35] hover:text-[#db5d35]"
              >
                Open comfort room
              </Link>
            </div>
          </div>

          <Surface className="grid gap-4 p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">
              Current demo wallet
            </p>
            <div className="rounded-[2rem] bg-slate-950 p-6 text-white">
              <p className="text-sm uppercase tracking-[0.16em] text-white/60">Soft balance</p>
              <p className="mt-3 font-display text-5xl">{currencyLabel(wallet.softBalance)}</p>
              <p className="mt-4 text-sm leading-7 text-white/75">
                Your economy comes from starter balance, daily check-ins, rewarded ads, and selling
                back support units to the system pool.
              </p>
            </div>
            <div className="grid gap-3 rounded-[1.5rem] bg-[#fff8ef] p-5">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">
                House rules
              </p>
              <ul className="grid gap-2 text-sm leading-7 text-slate-600">
                <li>No short selling or rival leaderboards.</li>
                <li>Licensed entries stay attribution-first unless separately permissioned.</li>
                <li>Cosmetics reward fandom expression instead of conflict.</li>
              </ul>
            </div>
          </Surface>
        </div>
      </section>

      <section className="grid gap-8">
        <SectionHeading
          eyebrow="Featured characters"
          title="Launch faces for the first wave of supporters"
          description="Original characters ship with first-party gradients and cosmetic hooks. Metadata-only licensed entries stay clearly labeled and attribution-first."
        />
        <div className="grid gap-6 lg:grid-cols-2">
          {featuredCards.map(({ character, commentCount }) => (
            <CharacterCard
              key={character.id}
              character={character}
              watching={watchlistIds.includes(character.id)}
              commentCount={commentCount}
            />
          ))}
        </div>
      </section>

      <section className="grid gap-8 lg:grid-cols-[1fr_0.95fr]">
        <Surface className="p-6 sm:p-8">
          <SectionHeading
            eyebrow="How it works"
            title="One soft-currency loop, three friendly returns"
            description="Fans can log in, claim rewards, support multiple favorites, then redeem that energy for profile flair and wallpapers."
          />
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {[
              {
                title: "Check in daily",
                body: "Hong Kong daily reset grants 100 SUP once per day to keep the loop welcoming.",
              },
              {
                title: "Support favorites",
                body: "Buying support units raises a character's quote through a simple system pool, not player-versus-player matching.",
              },
              {
                title: "Express yourself",
                body: "Cosmetics, themes, and profile curation let fans show affection without turning it into a war room.",
              },
            ].map((item) => (
              <div key={item.title} className="rounded-[1.75rem] bg-[#fff8ef] p-5">
                <h3 className="font-display text-2xl text-slate-950">{item.title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">{item.body}</p>
              </div>
            ))}
          </div>
        </Surface>

        <Surface className="p-6 sm:p-8">
          <SectionHeading
            eyebrow="Recent activity"
            title="Support actions are visible. Profit flexing is not."
            description="The feed emphasizes what fans chose to back and why, rather than ranking one character against another."
          />
          <div className="mt-8 grid gap-3">
            {recentTrades.map((trade) => (
              <div
                key={trade.id}
                className="flex items-center justify-between rounded-[1.5rem] border border-black/10 bg-[#fffdf9] px-4 py-3"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-950">
                    {trade.side === "BUY" ? "Supported" : "Sold back"} {trade.character.name}
                  </p>
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-400">
                    {trade.quantity} unit{trade.quantity > 1 ? "s" : ""} at {trade.unitPrice} SUP
                  </p>
                </div>
                <p className="text-sm font-semibold text-slate-600">
                  {trade.side === "BUY" ? "-" : "+"}
                  {trade.totalCost} SUP
                </p>
              </div>
            ))}
          </div>
        </Surface>
      </section>

      <section className="grid gap-8">
        <SectionHeading
          eyebrow="Cosmetics"
          title="Avatar frames and themes are the first monetizable expression layer"
          description="The market stays soft-currency only. Ads and cosmetics create the revenue path while character assets stay rights-aware."
        />
        <div className="grid gap-5 lg:grid-cols-2">
          {shopItems.slice(0, 2).map((item) => (
            <Surface key={item.id} className="p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#db5d35]">
                {item.kind.replaceAll("_", " ")}
              </p>
              <h3 className="mt-3 font-display text-3xl text-slate-950">{item.title}</h3>
              <p className="mt-4 text-sm leading-7 text-slate-600">{item.description}</p>
              <p className="mt-4 text-lg font-semibold text-slate-950">{currencyLabel(item.price)}</p>
            </Surface>
          ))}
        </div>
      </section>
    </div>
  );
}
