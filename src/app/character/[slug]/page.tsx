import Image from "next/image";
import { CommentPanel } from "@/components/comment-panel";
import { SupportTradePanel } from "@/components/support-trade-panel";
import { Badge } from "@/components/ui/badge";
import { SectionHeading } from "@/components/ui/section-heading";
import { Surface } from "@/components/ui/surface";
import { getSafeCharacterImage } from "@/lib/character-visuals";
import { getCopy } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/request-locale";
import { getCharacterView, getPortfolioView, getReactionSummary } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function CharacterPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const locale = await getRequestLocale();
  const copy = getCopy(locale);
  const { slug } = await params;
  const view = await getCharacterView(slug);
  const portfolio = await getPortfolioView();
  const ownedPosition = portfolio.positions.find(
    (position) => position.character.id === view.character.id,
  );
  const reactions = await getReactionSummary(view.character.id);
  const visualUrl = getSafeCharacterImage(view.character);

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-10 px-4 py-10 sm:px-6 sm:py-12">
      <section
        className="manga-panel shine-sweep overflow-hidden rounded-[2.8rem]"
        style={{
          background: `linear-gradient(135deg, ${view.character.accentFrom}, ${view.character.accentTo})`,
        }}
      >
        <div className="relative grid gap-8 bg-[linear-gradient(180deg,rgba(255,255,255,0.18),rgba(255,255,255,0.05))] px-6 py-10 sm:px-8 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="halftone pointer-events-none absolute inset-0 opacity-25" />
          <div className="space-y-6 text-white">
            <div className="flex flex-wrap gap-3">
              <Badge tone={view.character.rightsType === "ORIGINAL" ? "warm" : "cool"}>
                {view.character.rightsType === "ORIGINAL"
                  ? copy.common.originalIp
                  : copy.common.licensedMetadata}
              </Badge>
              {view.character.metadataOnly ? <Badge>{copy.common.metadataOnly}</Badge> : null}
            </div>
            <div className="space-y-4">
              <h1 className="font-display text-5xl leading-none sm:text-6xl">
                {view.character.name}
              </h1>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-white/80">
                {view.character.title}
              </p>
              <p className="max-w-2xl text-lg leading-8 text-white/90">{view.character.summary}</p>
            </div>
            <p className="max-w-2xl rounded-[1.5rem] bg-black/15 px-5 py-4 text-sm leading-7 text-white/85">
              {view.character.fandomPrompt}
            </p>
            {view.character.favoritePhrase ? (
              <p className="max-w-xl rounded-[1.5rem] border border-white/20 bg-white/18 px-5 py-4 text-base font-semibold leading-8 text-white">
                &ldquo;{view.character.favoritePhrase}&rdquo;
              </p>
            ) : null}
          </div>

          <div className="grid gap-5">
            {visualUrl ? (
              <div className="relative min-h-[360px] overflow-hidden rounded-[2rem] border border-white/20 bg-white/15 shadow-[0_24px_70px_-42px_rgba(23,17,38,0.75)]">
                <Image
                  src={visualUrl}
                  alt={`${view.character.name} original AI-generated key visual`}
                  fill
                  sizes="(min-width: 1024px) 42vw, 100vw"
                  className="object-cover object-top"
                  priority
                />
              </div>
            ) : null}
            <SupportTradePanel
              characterId={view.character.id}
              quote={view.quote}
              sellQuote={view.sellQuote}
              balance={portfolio.wallet.softBalance}
              ownedUnits={ownedPosition?.units ?? 0}
              locale={locale}
            />
          </div>
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
        <Surface className="p-6 sm:p-8">
          <SectionHeading
            eyebrow={copy.character.attributeEyebrow}
            title={copy.character.attributeTitle}
            description={copy.character.attributeDescription}
          />
          <div className="mt-8 grid gap-3">
            {view.attributes.map((attribute) => (
              <div
                key={attribute.id}
                className="grid gap-2 rounded-[1.5rem] border border-black/10 bg-[#fffdf9] p-4"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  {attribute.label}
                </p>
                <p className="text-base leading-7 text-slate-700">{attribute.value}</p>
              </div>
            ))}
          </div>
        </Surface>

        <Surface className="p-6 sm:p-8">
          <SectionHeading
            eyebrow={copy.character.rightsEyebrow}
            title={copy.character.rightsTitle}
            description={copy.character.rightsDescription}
          />
          <div className="mt-8 grid gap-4">
            {view.rightsGrants.map((grant) => (
              <div key={grant.id} className="rounded-[1.5rem] bg-[#fff9f2] p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#db5d35]">
                  {grant.licensor}
                </p>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  {copy.character.contract}: {grant.contractReference}
                  <br />
                  {copy.character.allowedUses}: {grant.allowedUseTypes.join(", ")}
                  <br />
                  {copy.character.commercialUse}:{" "}
                  {grant.commercialUse ? copy.common.yes : copy.common.no}
                </p>
              </div>
            ))}
            {view.sourceAttribution ? (
              <div className="rounded-[1.5rem] border border-dashed border-black/15 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                  {copy.character.sourceAttribution}
                </p>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  {view.sourceAttribution.attributionText}
                  <br />
                  License: {view.sourceAttribution.licenseName}
                  <br />
                  URL: {view.sourceAttribution.sourceUrl}
                </p>
              </div>
            ) : null}
          </div>
        </Surface>
      </div>

      <CommentPanel
        characterId={view.character.id}
        locale={locale}
        comments={view.comments.map((comment) => ({
          ...comment,
          author: comment.author
            ? { displayName: comment.author.displayName, handle: comment.author.handle }
            : undefined,
        }))}
        reactions={reactions}
      />
    </div>
  );
}
