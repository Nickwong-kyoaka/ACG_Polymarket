import { CommentPanel } from "@/components/comment-panel";
import { SupportTradePanel } from "@/components/support-trade-panel";
import { Badge } from "@/components/ui/badge";
import { SectionHeading } from "@/components/ui/section-heading";
import { Surface } from "@/components/ui/surface";
import { getCharacterView, getPortfolioView, getReactionSummary } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function CharacterPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const view = await getCharacterView(slug);
  const portfolio = await getPortfolioView();
  const ownedPosition = portfolio.positions.find(
    (position) => position.character.id === view.character.id,
  );
  const reactions = await getReactionSummary(view.character.id);

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-10 px-6 py-12">
      <section
        className="overflow-hidden rounded-[2.5rem] border border-black/10"
        style={{
          background: `linear-gradient(135deg, ${view.character.accentFrom}, ${view.character.accentTo})`,
        }}
      >
        <div className="grid gap-8 bg-[linear-gradient(180deg,rgba(255,255,255,0.14),rgba(255,255,255,0.04))] px-8 py-10 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-6 text-white">
            <div className="flex flex-wrap gap-3">
              <Badge tone={view.character.rightsType === "ORIGINAL" ? "warm" : "cool"}>
                {view.character.rightsType}
              </Badge>
              {view.character.metadataOnly ? <Badge>Metadata only</Badge> : null}
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
          </div>

          <SupportTradePanel
            characterId={view.character.id}
            quote={view.quote}
            sellQuote={view.sellQuote}
            balance={portfolio.wallet.softBalance}
            ownedUnits={ownedPosition?.units ?? 0}
          />
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
        <Surface className="p-6 sm:p-8">
          <SectionHeading
            eyebrow="Attribute table"
            title="Roleplay, market context, and source policy in one panel"
            description="This table is intentionally flexible so original characters and licensed metadata entries can share the same layout without hardcoding fields."
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
            eyebrow="Rights and provenance"
            title="Assets and imported text stay traceable"
            description="Published assets must point to a rights grant. Imported Bangumi-compatible text preserves source, license, and attribution markers."
          />
          <div className="mt-8 grid gap-4">
            {view.rightsGrants.map((grant) => (
              <div key={grant.id} className="rounded-[1.5rem] bg-[#fff9f2] p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#db5d35]">
                  {grant.licensor}
                </p>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  Contract: {grant.contractReference}
                  <br />
                  Allowed uses: {grant.allowedUseTypes.join(", ")}
                  <br />
                  Commercial use: {grant.commercialUse ? "Yes" : "No"}
                </p>
              </div>
            ))}
            {view.sourceAttribution ? (
              <div className="rounded-[1.5rem] border border-dashed border-black/15 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                  Source attribution
                </p>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  {view.sourceAttribution.attributionText}
                  <br />
                  License: {view.sourceAttribution.licenseName}
                  <br />
                  Source URL: {view.sourceAttribution.sourceUrl}
                </p>
              </div>
            ) : null}
          </div>
        </Surface>
      </div>

      <CommentPanel
        characterId={view.character.id}
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
