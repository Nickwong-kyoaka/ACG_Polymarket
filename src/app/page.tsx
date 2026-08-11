import Link from "next/link";
import { CharacterCard } from "@/components/character-card";
import { SectionHeading } from "@/components/ui/section-heading";
import { Surface } from "@/components/ui/surface";
import { getCopy, hrefWithLocale } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/request-locale";
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
  const locale = await getRequestLocale();
  const copy = getCopy(locale);
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
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-16 px-4 py-8 sm:px-6 sm:py-14">
      <section className="hero-grid manga-panel shine-sweep relative overflow-hidden rounded-[2.8rem] bg-white/78 px-6 py-10 sm:px-10 lg:px-12">
        <div className="halftone pointer-events-none absolute -right-10 top-10 h-56 w-56 rounded-full opacity-50" />
        <div className="pointer-events-none absolute bottom-8 left-[44%] hidden rotate-[-8deg] rounded-full bg-[#ffe56b] px-5 py-2 text-xs font-black uppercase tracking-[0.24em] text-[#171126] shadow-xl lg:block">
          SUP UP!
        </div>
        <div className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-8">
            <p className="inline-flex rounded-full border border-[#171126]/10 bg-[#fff2c5] px-4 py-2 text-xs font-black uppercase tracking-[0.28em] text-[#ff3d7f]">
              {copy.home.eyebrow}
            </p>
            <div className="space-y-5">
              <h1 className="max-w-4xl font-display text-5xl leading-[0.95] text-[#171126] sm:text-6xl lg:text-7xl">
                {copy.home.title}
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-slate-600">
                {copy.home.description}
              </p>
            </div>
            <div className="flex flex-wrap gap-4">
              <Link
                href={hrefWithLocale("/market", locale)}
                className="sticker-shadow rounded-full bg-[#ff3d7f] px-6 py-4 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-[#e32369]"
              >
                {copy.home.marketCta}
              </Link>
              <Link
                href={hrefWithLocale("/onboarding", locale)}
                className="rounded-full border border-[#171126]/10 bg-white/70 px-6 py-4 text-sm font-black text-slate-700 transition hover:border-[#ff3d7f] hover:text-[#ff3d7f]"
              >
                {copy.home.onboardingCta}
              </Link>
              <Link
                href={hrefWithLocale("/comfort", locale)}
                className="rounded-full border border-[#171126]/10 bg-[#e9f7ff] px-6 py-4 text-sm font-black text-[#1659a9] transition hover:border-[#38c7ff] hover:bg-white"
              >
                {copy.home.comfortCta}
              </Link>
            </div>
          </div>

          <Surface className="relative grid gap-4 overflow-hidden bg-white/82 p-5 sm:p-6">
            <div className="anime-portrait-stage rounded-[2rem] bg-[linear-gradient(135deg,#ff8a3d,#ff3d7f_52%,#7c5cff)]">
              <div className="absolute left-5 top-5 rounded-full bg-white/85 px-3 py-1 text-xs font-black uppercase tracking-[0.22em] text-[#171126]">
                ACG Booth
              </div>
              <div className="absolute bottom-5 right-5 rounded-[1.25rem] bg-white/90 px-4 py-3 text-right text-xs font-black uppercase tracking-[0.16em] text-[#171126]">
                Daily SUP
                <br />
                +100
              </div>
            </div>
            <p className="text-xs font-black uppercase tracking-[0.25em] text-slate-400">
              {copy.home.walletEyebrow}
            </p>
            <div className="rounded-[2rem] bg-[#171126] p-6 text-white">
              <p className="text-sm font-black uppercase tracking-[0.16em] text-white/60">
                {copy.home.walletLabel}
              </p>
              <p className="mt-3 font-display text-5xl">{currencyLabel(wallet.softBalance)}</p>
              <p className="mt-4 text-sm leading-7 text-white/75">
                {copy.home.walletBody}
              </p>
            </div>
            <div className="grid gap-3 rounded-[1.5rem] bg-[#fff2c5] p-5">
              <p className="text-sm font-black uppercase tracking-[0.22em] text-[#171126]">
                {copy.home.rulesTitle}
              </p>
              <ul className="grid gap-2 text-sm leading-7 text-slate-600">
                <li className="sr-only">
                  No shorting. No cash-out. No rival-fan humiliation.
                </li>
                {copy.home.rules.map((rule) => (
                  <li key={rule}>{rule}</li>
                ))}
              </ul>
            </div>
          </Surface>
        </div>
      </section>

      <section className="grid gap-8">
        <SectionHeading
          eyebrow={copy.home.featuredEyebrow}
          title={copy.home.featuredTitle}
          description={copy.home.featuredDescription}
        />
        <div className="grid gap-6 lg:grid-cols-2">
          {featuredCards.map(({ character, commentCount }) => (
            <CharacterCard
              key={character.id}
              character={character}
              watching={watchlistIds.includes(character.id)}
              commentCount={commentCount}
              locale={locale}
            />
          ))}
        </div>
      </section>

      <section className="grid gap-8 lg:grid-cols-[1fr_0.95fr]">
        <Surface className="p-6 sm:p-8">
          <SectionHeading
            eyebrow={copy.home.howEyebrow}
            title={copy.home.howTitle}
            description={copy.home.howDescription}
          />
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {copy.home.loopCards.map((item) => (
              <div key={item.title} className="rounded-[1.75rem] bg-[#fff8ed] p-5">
                <h3 className="font-display text-2xl text-[#171126]">{item.title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">{item.body}</p>
              </div>
            ))}
          </div>
        </Surface>

        <Surface className="p-6 sm:p-8">
          <SectionHeading
            eyebrow={copy.home.activityEyebrow}
            title={copy.home.activityTitle}
            description={copy.home.activityDescription}
          />
          <div className="mt-8 grid gap-3">
            {recentTrades.map((trade) => (
              <div
                key={trade.id}
                className="flex items-center justify-between rounded-[1.5rem] border border-black/10 bg-[#fffdf9] px-4 py-3"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-950">
                    {trade.side === "BUY" ? copy.common.supported : copy.common.soldBack}{" "}
                    {trade.character.name}
                  </p>
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-400">
                    {trade.quantity} {copy.common.units} at {trade.unitPrice} SUP
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
          eyebrow={copy.home.cosmeticsEyebrow}
          title={copy.home.cosmeticsTitle}
          description={copy.home.cosmeticsDescription}
        />
        <div className="grid gap-5 lg:grid-cols-2">
          {shopItems.slice(0, 2).map((item) => (
            <Surface key={item.id} className="p-6">
              <p className="text-xs font-black uppercase tracking-[0.25em] text-[#ff3d7f]">
                {item.kind.replaceAll("_", " ")}
              </p>
              <h3 className="mt-3 font-display text-3xl text-[#171126]">{item.title}</h3>
              <p className="mt-4 text-sm leading-7 text-slate-600">{item.description}</p>
              <p className="mt-4 text-lg font-semibold text-slate-950">{currencyLabel(item.price)}</p>
            </Surface>
          ))}
        </div>
      </section>
    </div>
  );
}
